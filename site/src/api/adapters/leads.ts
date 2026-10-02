import { newId, nowISO } from '../db';

/**
 * 把名單送到官網以外的地方。
 *
 * Robin 的 CRM（crm-hub）每兩小時會去抓一次 Google 試算表，所以官網只要
 * 負責「把人寫進那份表」，CRM 會自己來拿。官網不直接打 CRM：
 * CRM 跑在他自己的機器上，不是隨時開著的，也沒有對外的固定網址。
 * 試算表當中間層的好處是兩邊都可以各自掛掉而不掉資料，而且他打開表就看得懂。
 *
 * 跟寄信一樣是「先入列、再由 Cron 送」：
 * Apps Script 一個請求要跑一到三秒。如果當場等它，訪客按下預約之後要盯著
 * 轉圈圈三秒；它掛掉的時候更慘——預約明明已經存進資料庫了，卻回一個錯誤。
 * 所以入列就回應，送不出去就下次再送，資料一筆都不會掉。
 *
 * 要換成別的地方收（CRM 自己開端點、Notion、HubSpot）就在 targets 多一個，
 * 改環境變數 LEAD_SYNC，呼叫端一行都不用動。
 */

export type LeadRow = {
  email: string;
  name?: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  source?: string;
  sourceDetail?: string;
  topic?: string;
  headcount?: string;
  bookingCode?: string;
  bookingAt?: string;
  state?: string;
  note?: string;
};

/** 預約要在對方的行事曆上開一格時才帶這個。 */
export type LeadCalendar = {
  startAt: string;
  minutes?: number;
  title?: string;
  description?: string;
  guestEmail?: string;
};

export type Env = {
  DB: D1Database;
  LEAD_SYNC?: string;
  GAS_URL?: string;
  GAS_SECRET?: string;
};

/**
 * 排進同步佇列。所有想把名單送出去的地方都只呼叫這一個。
 *
 * 刻意吞掉所有錯誤：同步失敗不該讓客戶的預約或訂單跟著失敗。
 * 連「寫不進佇列」都不該——那是官網自己的問題，不是客戶的。
 */
export async function queueLeadSync(
  db: D1Database,
  row: LeadRow,
  calendar?: LeadCalendar,
  /**
   * 這一筆是哪一個預約。帶了的話，送出成功、而且 Apps Script 回了活動編號時，
   * 會把編號寫回那筆預約——沒有編號就查不到客戶在邀請上按了什麼，
   * 「按是就算確認」那條路會整個斷掉。
   */
  bookingId?: string,
) {
  if (!row?.email) return;
  try {
    await db
      .prepare(
        'INSERT INTO sync_queue (id,kind,payload,state,tries,created_at) VALUES (?,?,?,?,0,?)',
      )
      .bind(
        newId(),
        calendar ? 'booking' : 'lead',
        JSON.stringify({ row: toSheetRow(row), calendar: calendar || null, bookingId: bookingId || '' }),
        'queued',
        nowISO(),
      )
      .run();
  } catch (e) {
    console.error('[leads] 入列失敗', e);
  }
}

/**
 * 官網的欄位名換成試算表的中文標題。
 *
 * 為什麼要換：Robin 會自己打開那份表看、自己改。英文欄名他要對照才知道是什麼。
 * 欄名也刻意跟 CRM 的進料欄位一致，CRM 抓進去不用再做對應。
 * 這個對照表改動的時候，Code.gs 的 HEADERS 要一起改。
 *
 * calendar.ts 開行事曆活動時也會順便寫一列進試算表（同一次呼叫做兩件事），
 * 所以這支要開放出去——兩邊各自維護一份對照表，遲早會長得不一樣。
 */
export function toSheetRow(x: LeadRow): Record<string, string> {
  return {
    姓名: x.name || '',
    公司: x.company || '',
    職稱: x.jobTitle || '',
    Email: x.email,
    電話: x.phone || '',
    來源: sourceLabel(x.source),
    來源明細: x.sourceDetail || x.source || '',
    想談什麼: x.topic || '',
    公司人數: x.headcount || '',
    預約編號: x.bookingCode || '',
    預約時間: x.bookingAt || '',
    狀態: x.state || '',
    備註: x.note || '',
  };
}

/** 讓他在表上看到「預約諮詢」而不是「booking」。認不出來的就原樣送出去。 */
function sourceLabel(s?: string) {
  const map: Record<string, string> = {
    booking: '預約諮詢',
    newsletter: '訂閱電子報',
    resource: '索取資源',
    contact: '聯絡表單',
    order: '線上訂單',
    member: '會員註冊',
    unknown: '未標註',
  };
  return map[String(s || 'unknown')] || String(s);
}

// ── 送出去 ──────────────────────────────────────────────────────

/** 回傳 Apps Script 給的活動編號（有開行事曆活動的話），沒有就回空字串。 */
type Target = (payload: any, env: Env) => Promise<string>;

const targets: Record<string, Target> = {
  /** 不往外送，只把佇列清掉。還沒設定 Google 帳號前的預設值。 */
  async none(payload) {
    console.log(`[leads] （未設定同步）${payload?.row?.Email}`);
    return '';
  },

  /**
   * Google 試算表，透過官網專用帳號上的 Apps Script。
   * 程式碼在 site/integrations/apps-script/Code.gs。
   *
   * Apps Script 出錯的時候常常還是回 200，錯誤寫在 JSON 的 ok 欄位裡，
   * 所以不能只看 r.ok。
   */
  async gsheet(payload, env) {
    if (!env.GAS_URL) throw new Error('沒有設定 GAS_URL');
    const r = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: env.GAS_SECRET,
        action: payload.calendar ? 'booking' : 'lead',
        row: payload.row,
        calendar: payload.calendar || undefined,
      }),
      redirect: 'follow',
    });
    const txt = await r.text();
    if (!r.ok) throw new Error(`Apps Script HTTP ${r.status}`);
    let out: any = null;
    try { out = JSON.parse(txt); } catch { throw new Error(`回傳不是 JSON：${txt.slice(0, 120)}`); }
    if (out?.error === 'taken') {
      // 時段在排隊這段時間裡被佔走了。再試也不會成功，所以不要重試——
      // 試算表那一列已經有了，預約也存著，你在後台看得到，自己跟客戶改時間。
      throw new Error('時段已被佔用，沒有建立行事曆活動（請在後台跟客戶改時間）');
    }
    if (!out?.ok) throw new Error(`Apps Script：${out?.error || '未知錯誤'}`);
    return String(out?.calendar?.eventId || '');
  },
};

/**
 * 把佇列裡的名單送出去。由 Cron 呼叫。
 *
 * 一次只做少量：Apps Script 一筆要一到三秒，免費方案一次請求最多跑 30 秒，
 * 一口氣送 50 筆會中途被砍，而且不知道砍在哪一筆。
 */
export async function flushLeadQueue(env: Env, batch = 8) {
  const target = targets[env.LEAD_SYNC || 'none'];
  if (!target) throw new Error(`不認得的名單同步方式：${env.LEAD_SYNC}`);

  const { results } = await env.DB
    .prepare("SELECT * FROM sync_queue WHERE state='queued' AND tries < 5 ORDER BY created_at LIMIT ?")
    .bind(batch)
    .all<any>();

  let ok = 0;
  let fail = 0;
  for (const row of results || []) {
    try {
      const payload = JSON.parse(row.payload || '{}');
      const eventId = await target(payload, env);
      await env.DB
        .prepare("UPDATE sync_queue SET state='sent', sent_at=? WHERE id=?")
        .bind(nowISO(), row.id)
        .run();
      if (eventId && payload.bookingId) await writeBackEventId(env.DB, payload.bookingId, eventId);
      ok++;
    } catch (e: any) {
      // 試滿 5 次就停，留在表裡等人看。無限重試會在設定錯的時候吃光寫入額度。
      const tries = (row.tries || 0) + 1;
      await env.DB
        .prepare('UPDATE sync_queue SET tries=?, last_error=?, state=? WHERE id=?')
        .bind(tries, String(e?.message || e).slice(0, 300), tries >= 5 ? 'failed' : 'queued', row.id)
        .run();
      fail++;
    }
  }
  return { ok, fail };
}

/**
 * 把行事曆活動編號寫回那筆預約。
 *
 * 走到這裡表示當初送出預約的時候 Google 連不上（當場開活動失敗），
 * 改由佇列補開。補開成功才有編號，有編號之後「客戶按了是沒有」才查得到。
 *
 * 寫回失敗只記 log：佇列那一列已經標成送出了，重試只會重複寄一次邀請。
 */
async function writeBackEventId(db: D1Database, bookingId: string, eventId: string) {
  try {
    const row = await db.prepare('SELECT * FROM bookings WHERE id=?').bind(bookingId).first<any>();
    if (!row) return;
    const data = JSON.parse(row.data || '{}');
    if (data.eventId) return;
    data.eventId = eventId;
    await db
      .prepare('UPDATE bookings SET data=?, updated_at=? WHERE id=?')
      .bind(JSON.stringify(data), nowISO(), bookingId)
      .run();
  } catch (e) {
    console.error('[leads] 寫回活動編號失敗', e);
  }
}