import { newId, nowISO, rowToRecord } from '../db';
import { toSheetRow, type LeadRow } from './leads';

/**
 * Google 行事曆。
 *
 * 2026-10-03 Robin 選的做法：
 *   1. 可約時段**從他的行事曆空檔算出來**，他不用再手動開時段
 *   2. 客戶在行事曆邀請上按「是」就算確認，不用回信
 *
 * 全部走官網專用 Google 帳號上的 Apps Script（integrations/apps-script/Code.gs）。
 *
 * ── 為什麼時段要存成快取而不是現場問 ────────────────────────────
 * Apps Script 算一次兩週的空檔要一到三秒。預約卡片一打開就要等三秒不能接受，
 * 而且 Google 偶爾會慢或掛，那時候整個前台就約不到了。
 * 所以 Cron 每小時算一次、寫進 booking_slots，前台讀的是資料庫，瞬間就有。
 *
 * 代價是最久一小時的誤差：這一小時裡 Robin 可能自己排了別的事。
 * 所以**客戶真的送出預約時會再跟行事曆確認一次**（Apps Script 的 handleBooking_
 * 開活動之前會重新檢查），撞期就請他重選。快取可以舊，但不能賣掉已經沒有的時間。
 */

export type Env = {
  DB: D1Database;
  GAS_URL?: string;
  GAS_SECRET?: string;
};

/** 後台「預約時段規則」那一頁的內容。沒設定過就用這些預設值。 */
export type BookingRules = {
  source: 'manual' | 'calendar';
  calendarIds: string;
  weekdays: string[];
  dayStart: string;
  dayEnd: string;
  slotMinutes: number;
  gapMinutes: number;
  leadHours: number;
  daysAhead: number;
  maxPerDay: number;
  ignoreAllDay: boolean;
  channel: string;
  host: string;
};

const DEFAULTS: BookingRules = {
  source: 'manual',
  calendarIds: '',
  weekdays: ['1', '2', '3', '4', '5'],
  dayStart: '10:00',
  dayEnd: '18:00',
  slotMinutes: 30,
  gapMinutes: 15,
  leadHours: 24,
  daysAhead: 14,
  maxPerDay: 3,
  ignoreAllDay: false,
  channel: 'online',
  host: '',
};

export async function getRules(db: D1Database): Promise<BookingRules> {
  const row = await db.prepare('SELECT * FROM booking_rules LIMIT 1').first<any>().catch(() => null);
  if (!row) return { ...DEFAULTS };
  const r = rowToRecord(row) as any;
  return {
    source: r.source === 'calendar' ? 'calendar' : 'manual',
    calendarIds: String(r.calendarIds || ''),
    weekdays: Array.isArray(r.weekdays) && r.weekdays.length ? r.weekdays.map(String) : DEFAULTS.weekdays,
    dayStart: String(r.dayStart || DEFAULTS.dayStart),
    dayEnd: String(r.dayEnd || DEFAULTS.dayEnd),
    // 一律用 num()：`Number(x) || 預設值` 會把合法的 0 換成預設值
    slotMinutes: num(r.slotMinutes, DEFAULTS.slotMinutes),
    gapMinutes: num(r.gapMinutes, DEFAULTS.gapMinutes),
    leadHours: num(r.leadHours, DEFAULTS.leadHours),
    daysAhead: num(r.daysAhead, DEFAULTS.daysAhead),
    maxPerDay: num(r.maxPerDay, DEFAULTS.maxPerDay),
    ignoreAllDay: !!r.ignoreAllDay,
    channel: String(r.channel || DEFAULTS.channel),
    host: String(r.host || ''),
  };
}

/** 空白或壞掉才用預設值。0 是合法的值，不能被 `||` 吃掉。 */
function num(v: unknown, def: number): number {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** 傳給 Apps Script 的規則。欄位名跟 Code.gs 的 freeSlots_ 對應。 */
function rulesPayload(r: BookingRules) {
  return {
    calendarIds: r.calendarIds,
    weekdays: r.weekdays,
    dayStart: r.dayStart,
    dayEnd: r.dayEnd,
    slotMinutes: r.slotMinutes,
    gapMinutes: r.gapMinutes,
    leadHours: r.leadHours,
    daysAhead: r.daysAhead,
    maxPerDay: r.maxPerDay,
    ignoreAllDay: r.ignoreAllDay,
  };
}

/**
 * 打 Apps Script。
 *
 * Apps Script 出錯的時候常常還是回 HTTP 200，錯誤寫在 JSON 的 ok 欄位裡，
 * 所以不能只看 r.ok。回傳不是 JSON 通常代表部署時「具有存取權的使用者」
 * 沒選「任何人」——Google 把登入頁的 HTML 丟回來了。
 */
export async function gas<T = any>(env: Env, body: Record<string, unknown>): Promise<T> {
  if (!env.GAS_URL) throw new Error('沒有設定 GAS_URL');
  const r = await fetch(env.GAS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: env.GAS_SECRET, ...body }),
    redirect: 'follow',
  });
  const txt = await r.text();
  if (!r.ok) throw new Error('Apps Script HTTP ' + r.status);
  let out: any;
  try {
    out = JSON.parse(txt);
  } catch {
    throw new Error('回傳不是 JSON，通常是部署時「具有存取權的使用者」沒選「任何人」');
  }
  return out as T;
}

export const gasReady = (env: Env) => !!env.GAS_URL;

// ── 重算可約時段 ────────────────────────────────────────────────

/**
 * 把行事曆的空檔同步進 booking_slots。由 Cron 每小時呼叫。
 *
 * 用「差集」而不是「全部砍掉重建」：
 *   1. 前台拿到的時段 id 會放在預約表單裡，重建會讓還沒送出的表單指到不存在的 id
 *   2. 每小時重寫幾十列是白花 D1 的寫入額度
 *
 * **已經有人約的時段永遠不刪**。Apps Script 算空檔時會避開自己建的活動，
 * 所以約掉的時段不會再出現在清單裡——如果照「不在清單裡就刪」處理，
 * 會把客戶約的那一筆刪掉，而 bookings.slot 還指著它。
 */
export async function refreshSlots(env: Env) {
  const rules = await getRules(env.DB);
  if (rules.source !== 'calendar') return { skipped: '時段來源設定是手動' };
  if (!gasReady(env)) return { skipped: '還沒設定 GAS_URL' };

  const out = await gas<{ ok: boolean; slots?: { startAt: string; minutes: number }[]; error?: string; tz?: string }>(
    env,
    { action: 'slots', rules: rulesPayload(rules) },
  );
  if (!out.ok) throw new Error(out.error || 'Apps Script 沒有回 ok');

  // Apps Script 回的是 ISO 字串。對齊到整分鐘再比，不然差一秒就當成不同時段。
  const wanted = new Map<string, number>();
  for (const s of out.slots || []) {
    const k = minuteKey(s.startAt);
    if (k) wanted.set(k, Number(s.minutes) || rules.slotMinutes);
  }

  // 只看「這次計算範圍內」的既有時段。範圍外的（過去的、更遠的）不要碰。
  const until = new Date(Date.now() + (Math.max(0, rules.daysAhead) + 1) * 864e5).toISOString();
  const { results } = await env.DB
    .prepare('SELECT * FROM booking_slots WHERE f_start_at >= ? AND f_start_at <= ?')
    .bind(nowISO(), until)
    .all<any>();

  const existing = new Map<string, { row: any; rec: any }>();
  for (const row of results || []) {
    const rec = rowToRecord(row) as any;
    const k = minuteKey(String(rec.startAt));
    if (k) existing.set(k, { row, rec });
  }

  const ops: D1PreparedStatement[] = [];
  let added = 0;
  let removed = 0;
  let kept = 0;

  for (const [k, minutes] of wanted) {
    if (existing.has(k)) { kept++; continue; }
    const at = nowISO();
    const data = {
      startAt: new Date(k).toISOString(),
      minutes,
      capacity: 1,
      booked: 0,
      host: rules.host,
      channel: rules.channel,
      open: true,
      fromCalendar: true,
    };
    ops.push(
      env.DB
        .prepare('INSERT INTO booking_slots (id,sort,data,created_at,updated_at,f_start_at) VALUES (?,0,?,?,?,?)')
        .bind(newId(), JSON.stringify(data), at, at, data.startAt),
    );
    added++;
  }

  for (const [k, { row, rec }] of existing) {
    if (wanted.has(k)) continue;
    // 手動開的時段不是這支管的，不要動
    if (!rec.fromCalendar) continue;
    // 已經有人約了，絕對不刪
    if ((Number(rec.booked) || 0) > 0) continue;
    ops.push(env.DB.prepare('DELETE FROM booking_slots WHERE id=?').bind(row.id));
    removed++;
  }

  // 一次送出去。免費方案的 Cron 有 30 秒 CPU，但一列一個往返還是慢，
  // 而且 batch 是一個交易，不會做一半。
  if (ops.length) await env.DB.batch(ops);

  const note = '新增 ' + added + '　移除 ' + removed + '　沿用 ' + kept + '　（行事曆時區 ' + (out.tz || '未知') + '）';
  await stampSync(env.DB, note);
  return { added, removed, kept, tz: out.tz, note };
}

/** 把 ISO 時間對齊到整分鐘，當成時段的鍵。 */
function minuteKey(iso: string): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(Math.floor(t / 60000) * 60000).toISOString();
}

/** 把重算結果寫回「預約時段規則」那一頁，讓他在後台看得到上次算得怎樣。 */
async function stampSync(db: D1Database, note: string) {
  const row = await db.prepare('SELECT * FROM booking_rules LIMIT 1').first<any>().catch(() => null);
  if (!row) return;
  const rec = strip(rowToRecord(row));
  rec.lastSync = nowISO();
  rec.lastSyncNote = note;
  await db
    .prepare('UPDATE booking_rules SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(rec), nowISO(), row.id)
    .run();
}

// ── 客戶按了「是」沒有 ──────────────────────────────────────────

/**
 * 查待確認的預約，客戶在行事曆邀請上回應了沒。由 Cron 每小時呼叫。
 *
 *   按「是」   → 已確認
 *   按「否」   → 客戶婉拒，時段放回去
 *   活動被刪   → 已取消，時段放回去
 *   還沒按     → 不動，等 24 小時逾時那段去處理
 *
 * 「可能出席」當成還沒確認：他按了「可能」表示他自己也還不確定，
 * 那就讓逾時機制繼續倒數，到時候真的沒變成「是」就放掉時段。
 */
export async function pollGuestStatus(env: Env, limit = 30) {
  if (!gasReady(env)) return { skipped: '還沒設定 GAS_URL' };

  const { results } = await env.DB
    .prepare(
      "SELECT * FROM bookings WHERE data LIKE '%\"state\":\"pending\"%' ORDER BY created_at DESC LIMIT ?",
    )
    .bind(limit)
    .all<any>();

  const pending = (results || [])
    .map((row: any) => ({ row, rec: rowToRecord(row) as any }))
    .filter((x) => x.rec.state === 'pending' && x.rec.eventId);
  if (!pending.length) return { checked: 0, changed: 0 };

  const out = await gas<{ ok: boolean; results?: { eventId: string; status: string }[]; error?: string }>(env, {
    action: 'eventStatus',
    items: pending.map((x) => ({ eventId: x.rec.eventId, email: x.rec.email })),
  });
  if (!out.ok) throw new Error(out.error || 'Apps Script 沒有回 ok');

  const byId = new Map((out.results || []).map((r) => [r.eventId, r.status]));
  let changed = 0;

  for (const { row, rec } of pending) {
    const status = byId.get(String(rec.eventId));
    if (!status || status === 'error') continue;

    const next =
      status === 'yes' ? 'confirmed'
      : status === 'no' ? 'declined'
      : status === 'gone' ? 'cancelled'
      : 'pending';

    // 狀態沒變就不要白寫一次資料庫
    if (rec.guestStatus === status && rec.state === next) continue;

    rec.guestStatus = status;
    rec.state = next;
    await env.DB
      .prepare('UPDATE bookings SET data=?, updated_at=? WHERE id=?')
      .bind(JSON.stringify(strip(rec)), nowISO(), row.id)
      .run();

    // 不來了就把時段放回去，不然位子被一直佔著
    if ((next === 'declined' || next === 'cancelled') && rec.slot) {
      await releaseSlot(env.DB, String(rec.slot));
    }
    changed++;
  }

  return { checked: pending.length, changed };
}

/** 時段的已約數減一。取消、婉拒、逾時都會用到。 */
export async function releaseSlot(db: D1Database, slotId: string) {
  if (!slotId) return;
  const s = await db.prepare('SELECT * FROM booking_slots WHERE id=?').bind(slotId).first<any>();
  if (!s) return;
  const rec = strip(rowToRecord(s));
  rec.booked = Math.max(0, (Number(rec.booked) || 0) - 1);
  await db
    .prepare('UPDATE booking_slots SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(rec), nowISO(), s.id)
    .run();
}

/** 把 rowToRecord 加上去的欄位拔掉，才不會寫回 data 裡變成重複的一份。 */
function strip(rec: Record<string, unknown>): Record<string, any> {
  const { id, sort, createdAt, updatedAt, ...rest } = rec as any;
  return rest;
}

// ── 開一場會 ────────────────────────────────────────────────────

export type BookingEventInput = {
  startAt: string;
  minutes: number;
  title: string;
  description: string;
  guestEmail: string;
  /** 同一次呼叫會順便寫一列進「官網名單」試算表，不用再排一次佇列 */
  lead: LeadRow;
};

export type BookingEventResult =
  | { ok: true; eventId: string }
  | { ok: false; taken: true }
  | { ok: false; taken: false; error: string };

/**
 * 當場開活動並寄邀請。客戶按送出的時候呼叫，**不排佇列**。
 *
 * 這裡刻意同步等 Apps Script 回來（一到三秒），因為要在回應客戶之前知道
 * 「這個時間還在不在」。排佇列的話，客戶已經看到「預約成功」了，一小時後
 * 才發現撞期——那時候要嘛寄一封「其實沒約到」的信，要嘛就是同一個時間
 * 你有兩件事。兩個都很糟，所以寧可讓他多等三秒。
 *
 * 等不到或 Google 掛了不算失敗：預約照樣存下來（呼叫端會改走佇列），
 * 客戶至少約到了，確認信晚點寄。
 */
export async function createBookingEvent(env: Env, x: BookingEventInput): Promise<BookingEventResult> {
  if (!gasReady(env)) return { ok: false, taken: false, error: '還沒設定 GAS_URL' };

  const rules = await getRules(env.DB);
  try {
    const out = await gas<any>(env, {
      action: 'booking',
      row: toSheetRow(x.lead),
      rules: rulesPayload(rules),
      calendar: {
        startAt: x.startAt,
        minutes: x.minutes,
        title: x.title,
        description: x.description,
        guestEmail: x.guestEmail,
      },
    });
    if (out?.error === 'taken') return { ok: false, taken: true };
    if (!out?.ok) return { ok: false, taken: false, error: String(out?.error || '未知錯誤') };
    const eventId = String(out?.calendar?.eventId || '');
    if (!eventId) return { ok: false, taken: false, error: '沒有拿到活動編號' };
    return { ok: true, eventId };
  } catch (e: any) {
    return { ok: false, taken: false, error: String(e?.message || e) };
  }
}

/** 取消行事曆上的活動。Google 會通知與會者，客戶那邊也會自己消失。 */
export async function cancelBookingEvent(env: Env, eventId: string) {
  if (!gasReady(env) || !eventId) return;
  try {
    await gas(env, { action: 'cancelEvent', eventId });
  } catch (e) {
    // 取消失敗不該讓客戶的「取消預約」失敗——他按了取消就是取消了。
    // 行事曆上多一場空會議，你自己看到可以刪。
    console.error('[calendar] 取消活動失敗', e);
  }
}
