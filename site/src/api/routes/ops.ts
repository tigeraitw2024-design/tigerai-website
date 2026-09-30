import { Hono } from 'hono';
import type { Ctx } from '../types';
import type { Env } from '../types';
import { nowISO, rowToRecord } from '../db';
import { audit } from '../auth';
import { flushMailQueue } from '../adapters/mail';
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
    };
  }

  if (admin.role === 'owner') {
    out.system = {
      mailQueued: await count('mail_queue', "WHERE state='queued'"),
      mailFailed: await count('mail_queue', "WHERE state='failed'"),
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

export default app;

/**
 * 排程工作。由 wrangler.jsonc 的 triggers.crons 每小時叫一次。
 *
 * 三件事：
 *   1. 寄佇列裡的信
 *   2. 把超過 24 小時還沒確認的預約自動取消，時段放回去
 *   3. 清掉過期的 session、代幣、頻率限制紀錄
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
