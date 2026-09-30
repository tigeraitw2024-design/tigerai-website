import { Hono } from 'hono';
import type { Ctx } from '../types';
import {
  MEMBER_COOKIE, clearCookie, clientKey, consumeToken, cookieHeader, createSession,
  destroySession, hashPassword, issueToken, rateLimit, readCookie, readSession, verifyPassword,
} from '../auth';
import { newId, nowISO, rowToRecord } from '../db';
import { queueMail, templates } from '../adapters/mail';
import { getPayment, toDisplay } from '../adapters/payment';
import { stripMeta, upsertLead } from './public';

/**
 * 會員、購物車、結帳。
 *
 * 購物車不放在瀏覽器的 localStorage 裡，而是存在資料庫、用一個 cookie 認。
 * 理由是：在手機上加了東西、回家用電腦結帳，車子要還在。
 * 匿名的車也存，登入之後會併進會員的車。
 */
const app = new Hono<Ctx>();
const CART_COOKIE = 'tg_cart';
const bad = (ctx: any, msg: string, code = 400) => ctx.json({ error: msg }, code);

// ── 會員 ─────────────────────────────────────────────────────────

app.post('/member/register', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'reg'), 5, 3600))) {
    return bad(ctx, '嘗試太多次了，請稍後再試。', 429);
  }
  const { email, name, dk, phone, company, marketingConsent } = await ctx.req.json<any>();
  const mail = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(mail)) return bad(ctx, 'Email 格式不對');
  if (!name) return bad(ctx, '請填姓名');
  if (!dk) return bad(ctx, '請設定密碼');

  const db = ctx.env.DB;
  const dup = await db.prepare('SELECT id FROM members WHERE f_email=?').bind(mail).first<any>();
  // 這裡刻意不說「這個 Email 已經註冊過」——那等於免費幫人查名單。
  // 改成寄一封「你已經有帳號了」的信，真的是本人才收得到。
  if (dup) {
    await queueMail(db, {
      to: mail,
      subject: '[TigerAI] 你已經有帳號了',
      body: `<p>有人用這個 Email 註冊 TigerAI，但你已經有帳號了。</p><p>忘記密碼的話請用登入頁的「忘記密碼」。</p>`,
    });
    return ctx.json({ ok: true, message: '請收信完成註冊。' });
  }

  const at = nowISO();
  const id = newId();
  const data = {
    email: mail, name, phone: phone || '', company: company || '', jobTitle: '',
    password: await hashPassword(String(dk), true),
    verified: false, level: 'L0', state: 'active', lastLoginAt: '', internalNote: '',
  };
  await db
    .prepare('INSERT INTO members (id,sort,data,created_at,updated_at,f_email) VALUES (?,0,?,?,?,?)')
    .bind(id, JSON.stringify(data), at, at, mail)
    .run();
  await upsertLead(db, { email: mail, name, company, phone, source: 'register', marketingConsent: !!marketingConsent });

  const token = await issueToken(db, 'verify', id, 60 * 24);
  const base = ctx.env.SITE_URL || new URL(ctx.req.url).origin;
  await queueMail(db, {
    to: mail,
    subject: '[TigerAI] 請驗證你的 Email',
    body: templates.memberVerify(`${base}/member/verify?t=${token}`),
  });
  return ctx.json({ ok: true, message: '請收信完成註冊。' });
});

app.post('/member/verify', async (ctx) => {
  const { token } = await ctx.req.json<any>();
  const t = await consumeToken(ctx.env.DB, 'verify', String(token || ''));
  if (!t) return bad(ctx, '連結已經失效了，請重新註冊或要求重寄。', 410);
  const row = await ctx.env.DB.prepare('SELECT * FROM members WHERE id=?').bind(t.subject).first<any>();
  if (!row) return bad(ctx, '找不到帳號', 404);
  const rec = rowToRecord(row) as any;
  rec.verified = true;
  await ctx.env.DB.prepare('UPDATE members SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(stripMeta(rec)), nowISO(), row.id).run();
  return ctx.json({ ok: true });
});

app.post('/member/login', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'mlogin'), 10, 900))) {
    return bad(ctx, '嘗試太多次了，請 15 分鐘後再試。', 429);
  }
  const { email, dk } = await ctx.req.json<any>();
  const mail = String(email || '').trim().toLowerCase();
  const db = ctx.env.DB;
  const row = await db.prepare('SELECT id,data FROM members WHERE f_email=?').bind(mail).first<any>();

  const stored = row ? JSON.parse(row.data || '{}').password || '' : await hashPassword('x', true);
  const ok = row ? await verifyPassword(stored, String(dk || ''), true) : false;
  if (!row || !ok) return bad(ctx, 'Email 或密碼不對', 401);

  const d = JSON.parse(row.data || '{}');
  if (d.state === 'suspended') return bad(ctx, '這個帳號已經停權，請與我們聯絡。', 403);

  d.lastLoginAt = nowISO();
  await db.prepare('UPDATE members SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(d), nowISO(), row.id).run();

  const s = await createSession(db, 'member', row.id, ctx.req.raw);
  ctx.header('set-cookie', cookieHeader(MEMBER_COOKIE, s.id, s.days * 86400));
  await mergeCart(ctx, row.id);
  return ctx.json({ ok: true, member: { email: d.email, name: d.name, verified: d.verified, level: d.level } });
});

app.post('/member/logout', async (ctx) => {
  const s = await readSession(ctx.env.DB, ctx.req.raw, 'member');
  if (s) await destroySession(ctx.env.DB, s.id);
  ctx.header('set-cookie', clearCookie(MEMBER_COOKIE));
  return ctx.json({ ok: true });
});

app.get('/member/me', async (ctx) => {
  const id = await memberId(ctx);
  if (!id) return bad(ctx, '沒有登入', 401);
  const db = ctx.env.DB;
  const row = await db.prepare('SELECT * FROM members WHERE id=?').bind(id).first<any>();
  if (!row) return bad(ctx, '沒有登入', 401);
  const m = rowToRecord(row) as any;

  const { results } = await db.prepare('SELECT * FROM enrollments WHERE f_member=?').bind(id).all<any>();
  const { results: orders } = await db
    .prepare('SELECT * FROM orders WHERE f_member=? ORDER BY created_at DESC LIMIT 20')
    .bind(id).all<any>();

  return ctx.json({
    member: { email: m.email, name: m.name, phone: m.phone, company: m.company, verified: m.verified, level: m.level },
    enrollments: (results || []).map(rowToRecord),
    orders: (orders || []).map((r: any) => {
      const o = rowToRecord(r) as any;
      // 會員只看得到自己的訂單，而且不含內部備註
      return { id: o.id, code: o.code, total: o.total, state: o.state, items: o.items, createdAt: o.createdAt };
    }),
  });
});

app.post('/member/forgot', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'forgot'), 5, 3600))) {
    return bad(ctx, '要求太多次了，請稍後再試。', 429);
  }
  const { email } = await ctx.req.json<any>();
  const mail = String(email || '').trim().toLowerCase();
  const row = await ctx.env.DB.prepare('SELECT id FROM members WHERE f_email=?').bind(mail).first<any>();
  // 有沒有這個帳號，回應一律相同，不讓人拿來查名單
  if (row) {
    const token = await issueToken(ctx.env.DB, 'reset', row.id, 60);
    const base = ctx.env.SITE_URL || new URL(ctx.req.url).origin;
    await queueMail(ctx.env.DB, {
      to: mail,
      subject: '[TigerAI] 重設密碼',
      body: templates.memberReset(`${base}/member/reset?t=${token}`),
    });
  }
  return ctx.json({ ok: true, message: '如果這個 Email 有註冊過，重設連結已經寄出。' });
});

app.post('/member/reset', async (ctx) => {
  const { token, dk } = await ctx.req.json<any>();
  if (!dk) return bad(ctx, '請設定新密碼');
  const t = await consumeToken(ctx.env.DB, 'reset', String(token || ''));
  if (!t) return bad(ctx, '連結已經失效了，請重新要求。', 410);

  const row = await ctx.env.DB.prepare('SELECT * FROM members WHERE id=?').bind(t.subject).first<any>();
  if (!row) return bad(ctx, '找不到帳號', 404);
  const rec = rowToRecord(row) as any;
  rec.password = await hashPassword(String(dk), true);
  await ctx.env.DB.prepare('UPDATE members SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(stripMeta(rec)), nowISO(), row.id).run();
  // 改完密碼把所有裝置踢掉。密碼被盜用時，改密碼要真的能把對方趕出去。
  await ctx.env.DB.prepare("DELETE FROM sessions WHERE subject_id=? AND kind='member'").bind(row.id).run();
  return ctx.json({ ok: true });
});

// ── 購物車 ───────────────────────────────────────────────────────

type CartItem = { kind: 'course' | 'product'; refId: string; sessionId?: string; qty: number };
type CartData = { items: CartItem[]; coupon?: string };

app.get('/cart', async (ctx) => ctx.json(await priceCart(ctx)));

app.post('/cart/add', async (ctx) => {
  const { kind, refId, sessionId, qty } = await ctx.req.json<any>();
  if (kind !== 'course' && kind !== 'product') return bad(ctx, '不認得的品項類型');
  const cart = await loadCart(ctx);
  const key = (i: CartItem) => `${i.kind}:${i.refId}:${i.sessionId || ''}`;
  const incoming: CartItem = { kind, refId: String(refId), sessionId: sessionId || undefined, qty: Math.max(1, Number(qty) || 1) };
  const hit = cart.data.items.find((i) => key(i) === key(incoming));
  if (hit) hit.qty += incoming.qty;
  else cart.data.items.push(incoming);
  await saveCart(ctx, cart);
  // 算錢時要把剛存好的車傳進去。不傳的話 priceCart 會照 cookie 再讀一次，
  // 而這一次的 cookie 是「這個回應才要設的」，請求上還沒有，
  // 結果就是東西加進去了、回傳的車卻是空的。
  return ctx.json(await priceCart(ctx, cart));
});

app.post('/cart/remove', async (ctx) => {
  const { kind, refId, sessionId } = await ctx.req.json<any>();
  const cart = await loadCart(ctx);
  cart.data.items = cart.data.items.filter(
    (i) => !(i.kind === kind && i.refId === refId && (i.sessionId || '') === (sessionId || '')),
  );
  await saveCart(ctx, cart);
  return ctx.json(await priceCart(ctx, cart));
});

app.post('/cart/coupon', async (ctx) => {
  const { code } = await ctx.req.json<any>();
  const cart = await loadCart(ctx);
  cart.data.coupon = String(code || '').trim().toUpperCase();
  await saveCart(ctx, cart);
  const priced = await priceCart(ctx, cart);
  if (cart.data.coupon && !priced.coupon) return ctx.json({ ...priced, error: '折扣碼無法使用' }, 400);
  return ctx.json(priced);
});

// ── 結帳 ─────────────────────────────────────────────────────────

app.post('/checkout', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'checkout'), 10, 3600))) {
    return bad(ctx, '操作太頻繁，請稍後再試。', 429);
  }
  const body = await ctx.req.json<any>();
  const { buyerName, buyerEmail, buyerPhone, invoiceType, invoiceTaxId, invoiceTitle } = body;
  if (!buyerName || !buyerEmail) return bad(ctx, '請填訂購人姓名和 Email');

  const priced = await priceCart(ctx);
  if (!priced.lines.length) return bad(ctx, '購物車是空的');

  const db = ctx.env.DB;
  const mid = await memberId(ctx);
  const at = nowISO();
  const code = 'T' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + Math.floor(Math.random() * 9000 + 1000);
  const provider = getPayment(ctx.env);

  const data = {
    code, member: mid || '', buyerName, buyerEmail: String(buyerEmail).toLowerCase(), buyerPhone: buyerPhone || '',
    items: priced.lines.map((l) => ({ kind: l.kind, refId: l.refId, title: l.title, unitPrice: l.unitPrice, qty: l.qty })),
    subtotal: priced.subtotal, discount: priced.discount, total: priced.total,
    coupon: priced.coupon?.id || '',
    invoiceType: invoiceType || 'personal', invoiceTaxId: invoiceTaxId || '', invoiceTitle: invoiceTitle || '',
    state: 'pending', paymentProvider: provider.id, paymentRef: '', paidAt: '', internalNote: '',
  };
  const oid = newId();
  await db
    .prepare('INSERT INTO orders (id,sort,data,created_at,updated_at,f_code,f_member,f_buyer_email) VALUES (?,0,?,?,?,?,?,?)')
    .bind(oid, JSON.stringify(data), at, at, code, mid || '', data.buyerEmail)
    .run();

  await upsertLead(db, { email: data.buyerEmail, name: buyerName, phone: buyerPhone, source: 'checkout' });

  const start = await provider.start(
    { code, total: priced.total, itemsSummary: priced.lines.map((l) => l.title).join('、'), buyerEmail: data.buyerEmail, buyerName },
    ctx.env,
  );

  const lines = priced.lines
    .map((l) => `<p>${l.title} × ${l.qty}　${toDisplay(l.unitPrice * l.qty)}</p>`)
    .join('');
  await queueMail(db, {
    to: data.buyerEmail,
    subject: `[TigerAI] 訂單已成立（${code}）`,
    body: templates.orderPlaced(code, toDisplay(priced.total), lines),
  });
  for (const to of (ctx.env.MAIL_INTERNAL_TO || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    await queueMail(db, { to, subject: `[TigerAI] 新訂單 ${code}　${toDisplay(priced.total)}`, body: lines });
  }

  // 車清空。訂單已經建立，車再留著會被重複結帳。
  const cart = await loadCart(ctx);
  cart.data = { items: [] };
  await saveCart(ctx, cart);

  return ctx.json({ ok: true, orderCode: code, payment: start });
});

/** 金流回呼。哪一家金流由轉接器決定，這裡只管把訂單標成已付款。 */
app.post('/payment/callback', async (ctx) => {
  const provider = getPayment(ctx.env);
  let cb;
  try {
    cb = await provider.handleCallback(ctx.req.raw, ctx.env);
  } catch (e: any) {
    return ctx.text(String(e?.message || e), 400);
  }
  if (!cb.ok) return ctx.text('0|fail');

  const db = ctx.env.DB;
  const row = await db.prepare('SELECT * FROM orders WHERE f_code=?').bind(cb.orderCode).first<any>();
  if (!row) return ctx.text('0|no order');
  const rec = rowToRecord(row) as any;
  if (rec.state === 'paid') return ctx.text('1|OK'); // 金流會重送，重複收到不能重複發資格

  rec.state = 'paid';
  rec.paymentRef = cb.providerRef;
  rec.paidAt = nowISO();
  await db.prepare('UPDATE orders SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(stripMeta(rec)), nowISO(), row.id).run();
  await grantEnrollments(db, row.id, rec);
  return ctx.text('1|OK');
});

// ── 內部 ─────────────────────────────────────────────────────────

async function memberId(ctx: any): Promise<string | null> {
  const s = await readSession(ctx.env.DB, ctx.req.raw, 'member');
  return s?.subjectId || null;
}

async function loadCart(ctx: any) {
  const db = ctx.env.DB;
  const mid = await memberId(ctx);
  if (mid) {
    const row = await db.prepare('SELECT * FROM carts WHERE member_id=?').bind(mid).first<any>();
    if (row) return { id: row.id, memberId: mid, data: parseCart(row.data) };
  }
  const token = readCookie(ctx.req.raw, CART_COOKIE);
  if (token) {
    const row = await db.prepare('SELECT * FROM carts WHERE id=?').bind(token).first<any>();
    if (row) return { id: row.id, memberId: mid, data: parseCart(row.data) };
  }
  return { id: newId(), memberId: mid, data: { items: [] } as CartData };
}

function parseCart(s: string): CartData {
  try {
    const d = JSON.parse(s || '{}');
    return { items: Array.isArray(d.items) ? d.items : [], coupon: d.coupon };
  } catch {
    return { items: [] };
  }
}

async function saveCart(ctx: any, cart: { id: string; memberId: string | null; data: CartData }) {
  const at = nowISO();
  await ctx.env.DB
    .prepare(
      `INSERT INTO carts (id,member_id,data,created_at,updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET member_id=excluded.member_id, data=excluded.data, updated_at=excluded.updated_at`,
    )
    .bind(cart.id, cart.memberId, JSON.stringify(cart.data), at, at)
    .run();
  ctx.header('set-cookie', cookieHeader(CART_COOKIE, cart.id, 30 * 86400));
}

/** 登入時把匿名車併進會員的車。東西加到一半才登入的情況很常見。 */
async function mergeCart(ctx: any, mid: string) {
  const token = readCookie(ctx.req.raw, CART_COOKIE);
  if (!token) return;
  const db = ctx.env.DB;
  const anon = await db.prepare('SELECT * FROM carts WHERE id=?').bind(token).first<any>();
  if (!anon) return;
  const mine = await db.prepare('SELECT * FROM carts WHERE member_id=?').bind(mid).first<any>();
  if (!mine) {
    await db.prepare('UPDATE carts SET member_id=? WHERE id=?').bind(mid, token).run();
    return;
  }
  const a = parseCart(anon.data);
  const b = parseCart(mine.data);
  const key = (i: CartItem) => `${i.kind}:${i.refId}:${i.sessionId || ''}`;
  const seen = new Set(b.items.map(key));
  for (const i of a.items) if (!seen.has(key(i))) b.items.push(i);
  await db.prepare('UPDATE carts SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(b), nowISO(), mine.id).run();
  await db.prepare('DELETE FROM carts WHERE id=?').bind(token).run();
  ctx.header('set-cookie', cookieHeader(CART_COOKIE, mine.id, 30 * 86400));
}

/**
 * 算錢。
 *
 * 價格一律從資料庫重新查，不採信前端送上來的金額——
 * 不然任何人都能把總價改成 1 元再送出。
 */
async function priceCart(ctx: any, known?: { memberId: string | null; data: CartData }) {
  const db = ctx.env.DB;
  // 剛改過車的呼叫端會直接把車傳進來，因為這次請求的 cookie 還是舊的。
  const cart = known || (await loadCart(ctx));
  const mid = cart.memberId;

  const lines: { kind: string; refId: string; sessionId?: string; title: string; unitPrice: number; qty: number }[] = [];
  for (const i of cart.data.items) {
    if (i.kind === 'course') {
      const row = await db.prepare('SELECT * FROM courses WHERE id=?').bind(i.refId).first<any>();
      if (!row) continue;
      const c = rowToRecord(row) as any;
      if (c.status !== 'published') continue;
      let price = Number(c.price) || 0;
      if (mid && Number(c.memberPrice) > 0) price = Number(c.memberPrice);
      if (i.sessionId) {
        const s = await db.prepare('SELECT * FROM course_sessions WHERE id=?').bind(i.sessionId).first<any>();
        const sess = s ? (rowToRecord(s) as any) : null;
        if (sess && sess.open === false) continue;
        if (sess && Number(sess.priceOverride) > 0) price = Number(sess.priceOverride);
      }
      lines.push({ kind: 'course', refId: i.refId, sessionId: i.sessionId, title: String(c.title), unitPrice: price, qty: i.qty });
    } else {
      const row = await db.prepare('SELECT * FROM products WHERE id=?').bind(i.refId).first<any>();
      if (!row) continue;
      const p = rowToRecord(row) as any;
      if (p.status !== 'published' || !p.buyable) continue;
      lines.push({ kind: 'product', refId: i.refId, title: String(p.title), unitPrice: Number(p.price) || 0, qty: i.qty });
    }
  }

  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
  let discount = 0;
  let coupon: any = null;

  if (cart.data.coupon) {
    const row = await db.prepare('SELECT * FROM coupons WHERE f_code=?').bind(cart.data.coupon).first<any>();
    const c = row ? (rowToRecord(row) as any) : null;
    const now = Date.now();
    const okTime =
      c && (!c.startAt || new Date(c.startAt).getTime() <= now) && (!c.endAt || new Date(c.endAt).getTime() >= now);
    const okUses = c && (!Number(c.maxUses) || Number(c.used) < Number(c.maxUses));
    const okMin = c && subtotal >= (Number(c.minTotal) || 0);
    if (c && c.active && okTime && okUses && okMin) {
      discount = c.kind === 'percent'
        ? Math.round((subtotal * Number(c.value)) / 100)
        : Math.min(subtotal, Number(c.value));
      coupon = { id: c.id, code: c.code, label: c.label };
    }
  }

  return { lines, subtotal, discount, total: Math.max(0, subtotal - discount), coupon };
}

/** 付款完成後發上課資格。重複收到回呼不會重複發，因為上面先擋掉 state==='paid'。 */
async function grantEnrollments(db: D1Database, orderId: string, order: any) {
  const at = nowISO();
  for (const it of order.items || []) {
    if (it.kind !== 'course') continue;
    await db
      .prepare('INSERT INTO enrollments (id,sort,data,created_at,updated_at,f_member,f_course,f_session) VALUES (?,0,?,?,?,?,?,?)')
      .bind(
        newId(),
        JSON.stringify({ member: order.member || '', course: it.refId, session: it.sessionId || '', order: orderId, state: 'active', note: '' }),
        at, at, order.member || '', it.refId, it.sessionId || '',
      )
      .run();
  }
}

export default app;
