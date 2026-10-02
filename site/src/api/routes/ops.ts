import { Hono } from 'hono';
import type { Ctx } from '../types';
import type { Env } from '../types';
import { fullSchemaSQL, nowISO, rowToRecord } from '../db';
import { audit } from '../auth';
import { flushMailQueue } from '../adapters/mail';
import { flushLeadQueue } from '../adapters/leads';
import { cancelBookingEvent, gasReady, getRules, pollGuestStatus, refreshSlots } from '../adapters/calendar';
import { stripMeta } from './public';

/**
 * 營運相關：發布、後台首頁的數字、排程工作。
 */
const app = new Hono<Ctx>();

/**
 * 發布到前台。
 *
 * 前台是靜態的，改了資料庫不會自動變。按這個按鈕會去打一個「重新建置」的
 * 網址（Cloudflare 的 Deploy Hook 或 GitHub Actions 的觸發網址），
 * 建置時會把內容從 D1 抓下來烤進 HTML。
 *
 * 沒設定的話就老實說沒設定，不要假裝成功——假裝成功的後果是
 * Robin 改完按了發布、以為上線了，過三天才發現前台還是舊的。
 */
app.post('/publish', async (ctx) => {
  const admin = ctx.get('admin')!;
  if (admin.role !== 'owner') return ctx.json({ error: '只有 owner 可以發布' }, 403);

  if (!ctx.env.DEPLOY_HOOK_URL) {
    return ctx.json({
      error: '還沒設定自動發布。',
      how: '在 Cloudflare 的 Workers Builds 建一個 Deploy Hook，把網址用 wrangler secret put DEPLOY_HOOK_URL 設進來。在那之前，改完內容要自己重新建置一次。',
    }, 400);
  }

  const r = await fetch(ctx.env.DEPLOY_HOOK_URL, { method: 'POST' });
  await audit(ctx.env.DB, admin.email, '發布', '前台', { status: r.status }, ctx.req.raw);
  if (!r.ok) return ctx.json({ error: `發布失敗（${r.status}）。請到 Cloudflare 看建置紀錄。` }, 502);
  return ctx.json({ ok: true, message: '已經送出重新建置。大約 2–3 分鐘後前台會更新。' });
});

/**
 * 後台首頁的數字。
 *
 * 只給這個角色看得到的東西：editor 看不到預約和名單的數字，
 * 因為那本來就不該出現在他的畫面上。
 */
app.get('/dashboard', async (ctx) => {
  const admin = ctx.get('admin')!;
  const db = ctx.env.DB;
  const out: Record<string, unknown> = { role: admin.role };

  const count = async (t: string, where = '', binds: unknown[] = []) => {
    try {
      const r = await db.prepare(`SELECT COUNT(*) AS n FROM ${t} ${where}`).bind(...binds).first<any>();
      return r?.n ?? 0;
    } catch {
      return 0; // 表還沒建就當 0，不要讓首頁整個打不開
    }
  };

  out.content = {
    courses: await count('courses'),
    products: await count('products'),
    consultants: await count('consultants'),
    posts: await count('posts'),
    cases: await count('cases'),
  };

  if (admin.role === 'owner' || admin.role === 'sales') {
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    out.business = {
      bookingsPending: await count('bookings', "WHERE data LIKE '%\"state\":\"pending\"%'"),
      bookingsWeek: await count('bookings', 'WHERE created_at > ?', [since]),
      leads: await count('leads'),
      leadsWeek: await count('leads', 'WHERE created_at > ?', [since]),
      members: await count('members'),
      ordersPending: await count('orders', "WHERE data LIKE '%\"state\":\"pending\"%'"),
      ordersWeek: await count('orders', 'WHERE created_at > ?', [since]),
      slotsOpen: await count('booking_slots', 'WHERE f_start_at > ?', [nowISO()]),
      slotSource: (await getRules(ctx.env.DB)).source,
    };
  }

  if (admin.role === 'owner') {
    out.system = {
      mailQueued: await count('mail_queue', "WHERE state='queued'"),
      mailFailed: await count('mail_queue', "WHERE state='failed'"),
      syncQueued: await count('sync_queue', "WHERE state='queued'"),
      syncFailed: await count('sync_queue', "WHERE state='failed'"),
      mailProvider: ctx.env.MAIL_PROVIDER || 'console',
      leadSync: ctx.env.LEAD_SYNC || 'none',
      gasReady: gasReady(ctx.env as any),
      media: await count('media'),
      users: await count('users'),
    };
  }

  return ctx.json(out);
});

/** 手動催一次寄信佇列。信卡住時不用等 Cron。 */
app.post('/flush-mail', async (ctx) => {
  const r = await flushMailQueue(ctx.env as any, 20);
  return ctx.json(r);
});

/**
 * 更新資料表結構。
 *
 * 後台長出新功能時常常要多一張表或多一個欄位。以前這件事只有「重跑一次安裝」
 * 能做，但安裝要帶 BOOTSTRAP_SECRET，而那個密語用完就該從 Cloudflare 刪掉。
 * 所以這裡給 owner 一個按鈕。
 *
 * 全部都是 CREATE TABLE / CREATE INDEX IF NOT EXISTS，重跑不會動到既有資料。
 * 它只會「補上缺的」，不會刪東西，也不會改既有欄位的型別——
 * 真要改既有欄位，還是得自己寫一支 ALTER，那種事不該讓按鈕來做。
 */
app.post('/migrate', async (ctx) => {
  const admin = ctx.get('admin')!;
  if (admin.role !== 'owner') return ctx.json({ error: '只有 owner 可以更新資料表' }, 403);

  const before = await tableNames(ctx.env.DB);
  const stmts = fullSchemaSQL();
  let fail = 0;
  const errors: string[] = [];
  for (const sql of stmts) {
    try {
      await ctx.env.DB.prepare(sql).run();
    } catch (e: any) {
      fail++;
      if (errors.length < 5) errors.push(String(e?.message || e).slice(0, 200));
    }
  }
  const after = await tableNames(ctx.env.DB);
  const added = after.filter((t) => !before.includes(t));

  await audit(ctx.env.DB, admin.email, '更新資料表', '系統', { added, fail }, ctx.req.raw);

  return ctx.json({
    ok: fail === 0,
    added,
    total: stmts.length,
    fail,
    errors,
    message: added.length
      ? `新增了 ${added.length} 張表：${added.join('、')}`
      : '資料表已經是最新的，沒有需要新增的東西。',
  });
});

async function tableNames(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'")
    .all<any>();
  return (results || []).map((r: any) => String(r.name)).sort();
}

/**
 * 手動重算可約時段。
 *
 * 他在行事曆上挪了行程、想馬上讓前台反映，不用等下一個整點。
 * 也是剛設定好規則時用來驗「算出來的時段對不對」的那顆按鈕。
 */
app.post('/refresh-slots', async (ctx) => {
  const admin = ctx.get('admin')!;
  if (admin.role !== 'owner' && admin.role !== 'sales') return ctx.json({ error: '權限不足' }, 403);
  try {
    const r = await refreshSlots(ctx.env as any);
    if ('skipped' in r) return ctx.json({ ok: false, error: r.skipped });
    return ctx.json({ ok: true, ...r });
  } catch (e: any) {
    return ctx.json({ ok: false, error: String(e?.message || e) });
  }
});

/** 手動催一次名單同步。剛設定好 Apps Script 時用這個驗，不用等一小時。 */
app.post('/flush-sync', async (ctx) => {
  const r = await flushLeadQueue(ctx.env as any, 8);
  return ctx.json(r);
});

/**
 * 測試 Apps Script 有沒有接通。
 * 只打 ping，不寄信也不寫試算表——驗網址和密語對不對就好。
 */
app.post('/test-gas', async (ctx) => {
  if (!ctx.env.GAS_URL) return ctx.json({ ok: false, error: '還沒設定 GAS_URL' });
  try {
    const r = await fetch(ctx.env.GAS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: ctx.env.GAS_SECRET, action: 'ping' }),
      redirect: 'follow',
    });
    const txt = await r.text();
    if (!r.ok) return ctx.json({ ok: false, error: `HTTP ${r.status}` });
    let out: any = null;
    try { out = JSON.parse(txt); } catch {
      return ctx.json({ ok: false, error: '回傳不是 JSON，通常是部署時「具有存取權的使用者」沒選「任何人」' });
    }
    if (!out?.ok) return ctx.json({ ok: false, error: out?.error === 'bad secret' ? '密語不對' : String(out?.error || '未知錯誤') });
    return ctx.json({ ok: true, at: out.at });
  } catch (e: any) {
    return ctx.json({ ok: false, error: String(e?.message || e) });
  }
});

export default app;

/**
 * 排程工作。由 wrangler.jsonc 的 triggers.crons 每小時叫一次。
 *
 * 六件事：
 *   1. 寄佇列裡的信
 *   2. 把名單送到 Google 試算表（CRM 再從那裡抓）
 *   3. 重算可約時段（時段來源設成行事曆時才做）
 *   4. 問客戶在行事曆邀請上按了是還是否
 *   5. 把超過 24 小時還沒按的預約自動取消，時段放回去
 *   6. 清掉過期的 session、代幣、頻率限制紀錄
 *
 * 第 3 點不做的話，這三張表會一直長大。D1 免費方案有 5 GB，
 * 撐得很久，但「撐得很久」不等於「不用清」。
 */
export async function runCron(env: Env) {
  const log: string[] = [];

  try {
    const m = await flushMailQueue(env as any, 20);
    log.push(`寄信 成功 ${m.ok} 失敗 ${m.fail}`);
  } catch (e: any) {
    log.push(`寄信 出錯：${e?.message || e}`);
  }

  try {
    const l = await flushLeadQueue(env as any, 8);
    if (l.ok || l.fail) log.push(`名單同步 成功 ${l.ok} 失敗 ${l.fail}`);
  } catch (e: any) {
    log.push(`名單同步 出錯：${e?.message || e}`);
  }

  // 可約時段重算。放在問狀態之前：剛放回去的時段這一輪就能重新開放。
  try {
    const r = await refreshSlots(env as any);
    if ('skipped' in r) { if (gasReady(env as any)) log.push(`時段重算 跳過（${r.skipped}）`); }
    else log.push(`時段重算 ${r.note}`);
  } catch (e: any) {
    log.push(`時段重算 出錯：${e?.message || e}`);
  }

  // 客戶在行事曆邀請上回應了沒
  try {
    const r = await pollGuestStatus(env as any);
    if (!('skipped' in r) && r.checked) log.push(`邀請狀態 查 ${r.checked} 筆 改 ${r.changed} 筆`);
  } catch (e: any) {
    log.push(`邀請狀態 出錯：${e?.message || e}`);
  }

  // 逾時預約
  try {
    const cutoff = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { results } = await env.DB
      .prepare("SELECT * FROM bookings WHERE created_at < ? AND data LIKE '%\"state\":\"pending\"%' LIMIT 50")
      .bind(cutoff)
      .all<any>();
    let n = 0;
    for (const row of results || []) {
      const rec = rowToRecord(row) as any;
      if (rec.state !== 'pending') continue;
      rec.state = 'expired';
      await env.DB.prepare('UPDATE bookings SET data=?, updated_at=? WHERE id=?')
        .bind(JSON.stringify(stripMeta(rec)), nowISO(), row.id).run();
      // 客戶一直沒按「是」，行事曆上那一場也要撤掉，不然你會照著去開一個
      // 客戶根本沒確認的會。刪除會通知與會者，等於再提醒他一次。
      await cancelBookingEvent(env as any, String(rec.eventId || ''));
      // 時段放回去，不然位子會被一直佔著
      if (rec.slot) {
        const s = await env.DB.prepare('SELECT * FROM booking_slots WHERE id=?').bind(rec.slot).first<any>();
        if (s) {
          const sr = rowToRecord(s) as any;
          sr.booked = Math.max(0, (Number(sr.booked) || 0) - 1);
          await env.DB.prepare('UPDATE booking_slots SET data=?, updated_at=? WHERE id=?')
            .bind(JSON.stringify(stripMeta(sr)), nowISO(), s.id).run();
        }
      }
      n++;
    }
    if (n) log.push(`逾時取消 ${n} 筆預約`);
  } catch (e: any) {
    log.push(`逾時處理出錯：${e?.message || e}`);
  }

  // 清過期資料
  try {
    const now = nowISO();
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
    await env.DB.prepare('DELETE FROM tokens WHERE expires_at < ?').bind(now).run();
    await env.DB.prepare('DELETE FROM rate_limit WHERE reset_at < ?').bind(now).run();
    // 三個月沒動過的匿名購物車也清掉
    await env.DB
      .prepare('DELETE FROM carts WHERE member_id IS NULL AND updated_at < ?')
      .bind(new Date(Date.now() - 90 * 864e5).toISOString())
      .run();
  } catch (e: any) {
    log.push(`清理出錯：${e?.message || e}`);
  }

  console.log('[cron] ' + log.join('　'));
  return log;
}
