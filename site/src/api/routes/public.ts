import { Hono } from 'hono';
import type { Ctx } from '../types';
import { clientKey, consumeToken, issueToken, rateLimit } from '../auth';
import { newId, nowISO, rowToRecord } from '../db';
import { queueMail, templates } from '../adapters/mail';
import { getStorage } from '../adapters/storage';

/**
 * 前台會打的端點。全部是公開的，所以每一支都要有頻率限制，
 * 而且都不能回傳任何別人的資料。
 */
const app = new Hono<Ctx>();

const bad = (ctx: any, msg: string, code = 400) => ctx.json({ error: msg }, code);

/** 簡單的機器人陷阱：表單裡放一個人看不到的欄位，有填就是機器人。 */
const isBot = (body: any) => !!String(body?.website || '').trim();

// ── 預約 ─────────────────────────────────────────────────────────

/** 可約的時段。只回「還有位子而且是未來」的。 */
app.get('/booking/slots', async (ctx) => {
  const { results } = await ctx.env.DB
    .prepare(
      `SELECT * FROM booking_slots
       WHERE f_start_at > ?
       ORDER BY f_start_at ASC LIMIT 60`,
    )
    .bind(nowISO())
    .all<any>();

  const slots = (results || [])
    .map(rowToRecord)
    .filter((s: any) => s.open !== false && (Number(s.booked) || 0) < (Number(s.capacity) || 1))
    // 只給前台需要知道的欄位。主持人是誰、內部備註不對外。
    .map((s: any) => ({ id: s.id, startAt: s.startAt, minutes: s.minutes || 30, channel: s.channel }));

  return ctx.json({ slots });
});

/**
 * 送出預約。
 *
 * 名額用「先加後檢查」的方式搶：先把 booked 加一，如果加完超過上限就退回去。
 * D1 沒有交易鎖，這是在沒有鎖的情況下避免超賣最穩的做法——
 * 先檢查再寫入的話，兩個人同時按送出就會一起通過檢查。
 */
app.post('/booking', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'booking'), 5, 3600))) {
    return bad(ctx, '送出太多次了，請稍後再試，或直接寫信給我們。', 429);
  }
  const body = await ctx.req.json<any>();
  if (isBot(body)) return ctx.json({ ok: true }); // 機器人：裝作成功，不留資料

  const { slotId, name, email, phone, company, jobTitle, headcount, topic, source } = body;
  if (!name || !email) return bad(ctx, '請填姓名和 Email');
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(email))) return bad(ctx, 'Email 格式不對');

  const db = ctx.env.DB;
  const slot = slotId
    ? await db.prepare('SELECT * FROM booking_slots WHERE id=?').bind(slotId).first<any>()
    : null;
  if (slotId && !slot) return bad(ctx, '這個時段已經不在了，請重新選一個');

  let slotRec: any = null;
  if (slot) {
    slotRec = rowToRecord(slot);
    if (slotRec.open === false) return bad(ctx, '這個時段已經關閉了');

    const cap = Number(slotRec.capacity) || 1;
    slotRec.booked = (Number(slotRec.booked) || 0) + 1;
    if (slotRec.booked > cap) return bad(ctx, '這個時段剛剛被約走了，請選別的時間');
    await db
      .prepare('UPDATE booking_slots SET data=?, updated_at=? WHERE id=?')
      .bind(JSON.stringify(stripMeta(slotRec)), nowISO(), slot.id)
      .run();
  }

  const code = 'B' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 900 + 100);
  const at = nowISO();
  const data = {
    code, slot: slotId || '', name, company: company || '', jobTitle: jobTitle || '',
    email: String(email).toLowerCase(), phone: phone || '', headcount: headcount || '',
    topic: topic || '', source: String(source || '').slice(0, 200), state: 'pending', internalNote: '',
  };
  await db
    .prepare('INSERT INTO bookings (id,sort,data,created_at,updated_at,f_code,f_slot,f_email) VALUES (?,0,?,?,?,?,?,?)')
    .bind(newId(), JSON.stringify(data), at, at, code, slotId || '', data.email)
    .run();

  // 名單也留一筆。約過諮詢的人是最值錢的名單，不該只存在預約表裡。
  await upsertLead(db, { email: data.email, name, company, phone, source: 'booking' });

  const when = slotRec ? formatWhen(String(slotRec.startAt)) : '（時間另行約定）';
  const base = ctx.env.SITE_URL || new URL(ctx.req.url).origin;
  const cancelUrl = `${base}/booking/cancel?code=${code}&email=${encodeURIComponent(data.email)}`;

  await queueMail(db, {
    to: data.email,
    subject: `[TigerAI] 預約已收到（${code}）`,
    body: templates.bookingConfirm(name, when, code, cancelUrl),
  });
  for (const to of (ctx.env.MAIL_INTERNAL_TO || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    await queueMail(db, {
      to,
      subject: `[TigerAI] 新預約：${name}${company ? `（${company}）` : ''}`,
      body: templates.bookingInternal(name, company || '', when, topic || '', `${data.email}　${phone || ''}`),
    });
  }

  return ctx.json({ ok: true, code, when });
});

/** 客戶自己取消。要同時給編號和 Email，光有編號不算。 */
app.post('/booking/cancel', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'bcancel'), 10, 3600))) {
    return bad(ctx, '操作太頻繁', 429);
  }
  const { code, email } = await ctx.req.json<any>();
  const db = ctx.env.DB;
  const row = await db
    .prepare('SELECT * FROM bookings WHERE f_code=? AND f_email=?')
    .bind(String(code || ''), String(email || '').toLowerCase())
    .first<any>();
  if (!row) return bad(ctx, '找不到這筆預約，請確認編號和 Email');

  const rec = rowToRecord(row);
  if (rec.state === 'cancelled') return ctx.json({ ok: true });
  rec.state = 'cancelled';
  await db.prepare('UPDATE bookings SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(stripMeta(rec)), nowISO(), row.id).run();
  await releaseSlot(db, String(rec.slot || ''));
  return ctx.json({ ok: true });
});

// ── 留 Email ─────────────────────────────────────────────────────

/**
 * 站上所有「留下 Email」的入口。
 * source 決定要不要附帶寄東西過去（Workflow 範本、下載檔案）。
 */
app.post('/lead', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'lead'), 10, 3600))) {
    return bad(ctx, '送出太多次了，請稍後再試。', 429);
  }
  const body = await ctx.req.json<any>();
  if (isBot(body)) return ctx.json({ ok: true });

  const { email, name, company, phone, source, resourceId, marketingConsent } = body;
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(email || ''))) return bad(ctx, 'Email 格式不對');

  const db = ctx.env.DB;
  const mail = String(email).toLowerCase();
  await upsertLead(db, { email: mail, name, company, phone, source: String(source || 'unknown'), marketingConsent: !!marketingConsent });

  // 要檔案的話，發一張 7 天的下載券，連結寄過去。
  // 券是一次性的、綁這個 Email，所以轉貼給別人也沒用。
  if (resourceId) {
    const res = await db.prepare('SELECT * FROM resources WHERE id=?').bind(resourceId).first<any>();
    if (res) {
      const rec = rowToRecord(res);
      const token = await issueToken(db, 'download', mail, 60 * 24 * 7, { resourceId });
      const base = ctx.env.SITE_URL || new URL(ctx.req.url).origin;
      await queueMail(db, {
        to: mail,
        subject: `[TigerAI] 您要的「${rec.title}」`,
        body: templates.leadResource(String(rec.title), `${base}/api/download/${token}`),
      });
    }
  }

  return ctx.json({ ok: true, message: '收到了，請收信。' });
});

/** 憑下載券取檔。券用掉就沒了。 */
app.get('/download/:token', async (ctx) => {
  const db = ctx.env.DB;
  const t = await consumeToken(db, 'download', ctx.req.param('token'));
  if (!t) return ctx.text('這個下載連結已經失效了，請重新索取。', 410);

  const res = await db.prepare('SELECT * FROM resources WHERE id=?').bind(t.payload?.resourceId).first<any>();
  if (!res) return ctx.text('找不到檔案', 404);
  const rec: any = rowToRecord(res);

  const media = await db.prepare('SELECT * FROM media WHERE id=?').bind(rec.file).first<any>();
  if (!media) return ctx.text('檔案不存在', 404);
  const m: any = rowToRecord(media);

  rec.downloads = (Number(rec.downloads) || 0) + 1;
  await db.prepare('UPDATE resources SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(stripMeta(rec)), nowISO(), res.id).run();

  const file = await getStorage(ctx.env).get(String(m.key));
  if (!file) return ctx.text('檔案不存在', 404);
  return new Response(file.body, {
    headers: {
      'content-type': file.mime,
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(String(m.name))}`,
    },
  });
});

// ── 共用 ─────────────────────────────────────────────────────────

/** 存進 data 之前把讀出來時加上的欄位拿掉，不然會愈存愈多層 */
function stripMeta(rec: Record<string, unknown>) {
  const { id, createdAt, updatedAt, sort, ...rest } = rec as any;
  return rest;
}

async function releaseSlot(db: D1Database, slotId: string) {
  if (!slotId) return;
  const row = await db.prepare('SELECT * FROM booking_slots WHERE id=?').bind(slotId).first<any>();
  if (!row) return;
  const rec = rowToRecord(row) as any;
  rec.booked = Math.max(0, (Number(rec.booked) || 0) - 1);
  await db.prepare('UPDATE booking_slots SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(stripMeta(rec)), nowISO(), slotId).run();
}

/**
 * 名單去重。同一個 Email 只有一筆，重複留會累加次數並更新最近來源。
 * 行銷同意只會從「沒同意」變成「同意」，不會因為後來一次沒勾就被取消——
 * 要取消同意得走退訂，不是靠某一次表單沒勾。
 */
async function upsertLead(
  db: D1Database,
  x: { email: string; name?: string; company?: string; phone?: string; source: string; marketingConsent?: boolean },
) {
  const at = nowISO();
  const row = await db.prepare('SELECT * FROM leads WHERE f_email=?').bind(x.email).first<any>();

  if (row) {
    const rec = rowToRecord(row) as any;
    rec.touches = (Number(rec.touches) || 0) + 1;
    rec.lastSource = x.source;
    if (x.name && !rec.name) rec.name = x.name;
    if (x.company && !rec.company) rec.company = x.company;
    if (x.phone && !rec.phone) rec.phone = x.phone;
    if (x.marketingConsent && !rec.marketingConsent) {
      rec.marketingConsent = true;
      rec.consentAt = at;
    }
    await db.prepare('UPDATE leads SET data=?, updated_at=? WHERE id=?')
      .bind(JSON.stringify(stripMeta(rec)), at, row.id).run();
    return;
  }

  const data = {
    email: x.email, name: x.name || '', company: x.company || '', phone: x.phone || '',
    firstSource: x.source, lastSource: x.source, touches: 1,
    marketingConsent: !!x.marketingConsent, consentAt: x.marketingConsent ? at : '',
    stage: 'new', internalNote: '',
  };
  await db
    .prepare('INSERT INTO leads (id,sort,data,created_at,updated_at,f_email) VALUES (?,0,?,?,?,?)')
    .bind(newId(), JSON.stringify(data), at, at, x.email)
    .run();
}

function formatWhen(iso: string) {
  if (!iso) return '（時間另行約定）';
  const d = new Date(iso);
  const wd = '日一二三四五六'[d.getDay()];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${wd}）${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default app;
export { stripMeta, upsertLead };
