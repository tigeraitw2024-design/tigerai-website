import { Hono } from 'hono';
import type { Ctx } from '../types';
import {
  ADMIN_COOKIE, audit, clearCookie, clientKey, cookieHeader, createSession,
  currentAdmin, destroySession, hashPassword, rateLimit, readSession, verifyPassword,
} from '../auth';
import { fullSchemaSQL, newId, nowISO } from '../db';
import { COLLECTION_LIST } from '../schema/registry';

/**
 * 後台登入與第一次安裝。
 *
 * 登入有頻率限制：同一個 IP 15 分鐘內最多 10 次。沒有這個的話，
 * 密碼再強也擋不住慢慢試——而且每次嘗試都是一次資料庫讀取，
 * 免費方案的額度會先被吃完。
 */
const app = new Hono<Ctx>();

app.post('/login', async (ctx) => {
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'login'), 10, 900))) {
    return ctx.json({ error: '嘗試太多次了，請 15 分鐘後再試。' }, 429);
  }

  const { email, dk, password } = await ctx.req.json<{ email: string; dk?: string; password?: string }>();
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || (!dk && !password)) return ctx.json({ error: '請填 Email 和密碼' }, 400);

  const row = await ctx.env.DB
    .prepare('SELECT id,data FROM users WHERE f_email=?')
    .bind(mail)
    .first<any>();

  // 找不到帳號時也要跑一次雜湊再回失敗。
  // 直接回「查無此人」的話，回應時間的差別會讓人試出哪些 Email 有註冊。
  const stored = row ? JSON.parse(row.data || '{}').password || '' : await hashPassword('x', !!dk);
  const ok = row ? await verifyPassword(stored, String(dk || password), !!dk) : false;

  if (!row || !ok) {
    return ctx.json({ error: 'Email 或密碼不對' }, 401);
  }
  const d = JSON.parse(row.data || '{}');
  if (d.active === false) return ctx.json({ error: '這個帳號已經停用' }, 403);

  const s = await createSession(ctx.env.DB, 'admin', row.id, ctx.req.raw);
  d.lastLoginAt = nowISO();
  await ctx.env.DB
    .prepare('UPDATE users SET data=?, updated_at=? WHERE id=?')
    .bind(JSON.stringify(d), nowISO(), row.id)
    .run();
  await audit(ctx.env.DB, mail, '登入', '後台', null, ctx.req.raw);

  ctx.header('set-cookie', cookieHeader(ADMIN_COOKIE, s.id, s.days * 86400));
  return ctx.json({ ok: true, user: { email: d.email, name: d.name, role: d.role } });
});

app.post('/logout', async (ctx) => {
  const s = await readSession(ctx.env.DB, ctx.req.raw, 'admin');
  if (s) await destroySession(ctx.env.DB, s.id);
  ctx.header('set-cookie', clearCookie(ADMIN_COOKIE));
  return ctx.json({ ok: true });
});

app.get('/me', async (ctx) => {
  const u = await currentAdmin(ctx.env.DB, ctx.req.raw);
  if (!u) return ctx.json({ error: '沒有登入' }, 401);
  return ctx.json({ user: { email: u.email, name: u.name, role: u.role } });
});

/**
 * 第一次安裝：建表、塞初始資料、開第一個 owner 帳號。
 *
 * 只有在「一個帳號都還沒有」的時候可以跑，而且要帶對 BOOTSTRAP_SECRET。
 * 兩個條件缺一不可——只靠「還沒有帳號」的話，站一上線到你設定帳號之間
 * 那段空窗，誰先打到這支誰就是站長。
 */
app.post('/bootstrap', async (ctx) => {
  const { secret, email, name, dk } = await ctx.req.json<{
    secret: string; email: string; name: string; dk: string;
  }>();

  if (!ctx.env.BOOTSTRAP_SECRET) {
    return ctx.json({ error: '還沒設定 BOOTSTRAP_SECRET，請先用 wrangler secret put 設定。' }, 400);
  }
  if (secret !== ctx.env.BOOTSTRAP_SECRET) {
    return ctx.json({ error: '密語不對' }, 403);
  }

  const db = ctx.env.DB;

  // 建表。IF NOT EXISTS，重跑不會弄壞既有資料。
  for (const sql of fullSchemaSQL()) {
    await db.prepare(sql).run();
  }

  const existing = await db.prepare('SELECT COUNT(*) AS n FROM users').first<any>();
  if ((existing?.n ?? 0) > 0) {
    return ctx.json({ error: '已經有帳號了，安裝只能跑一次。忘記密碼請用 wrangler d1 直接改。' }, 400);
  }

  const mail = String(email || '').trim().toLowerCase();
  if (!mail || !dk) return ctx.json({ error: '請填 Email 和密碼' }, 400);

  const id = newId();
  const at = nowISO();
  const data = {
    email: mail,
    name: name || 'Owner',
    role: 'owner',
    active: true,
    password: await hashPassword(dk, true),
    note: '安裝時建立的第一個帳號',
  };
  await db
    .prepare('INSERT INTO users (id,sort,data,created_at,updated_at,f_email) VALUES (?,0,?,?,?,?)')
    .bind(id, JSON.stringify(data), at, at, mail)
    .run();

  // 塞初始資料。只塞空表，已經有資料的集合跳過——
  // 不然重跑一次安裝會把現有內容洗掉。
  const seeded: string[] = [];
  for (const c of COLLECTION_LIST) {
    if (!c.seed) continue;
    const n = await db.prepare(`SELECT COUNT(*) AS n FROM ${c.name}`).first<any>();
    if ((n?.n ?? 0) > 0) continue;
    const rows = c.seed();
    if (!rows.length) continue;
    await db.batch(
      rows.map((r: any, i: number) => {
        const { sort, ...rest } = r;
        return db
          .prepare(`INSERT INTO ${c.name} (id,sort,data,created_at,updated_at) VALUES (?,?,?,?,?)`)
          .bind(newId(), sort ?? i, JSON.stringify(rest), at, at);
      }),
    );
    seeded.push(`${c.label} ${rows.length} 筆`);
  }

  const s = await createSession(db, 'admin', id, ctx.req.raw);
  ctx.header('set-cookie', cookieHeader(ADMIN_COOKIE, s.id, s.days * 86400));
  await audit(db, mail, '安裝', '後台', { seeded }, ctx.req.raw);

  return ctx.json({
    ok: true,
    seeded,
    note: '安裝完成。請到 Cloudflare 把 BOOTSTRAP_SECRET 刪掉，那把鑰匙已經用不到了。',
  });
});

/** 安裝過了沒。登入頁開起來要先問這個，才知道要顯示登入還是安裝。 */
app.get('/installed', async (ctx) => {
  try {
    const n = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<any>();
    return ctx.json({ installed: (n?.n ?? 0) > 0 });
  } catch {
    // 連表都還沒有，那就是還沒安裝
    return ctx.json({ installed: false });
  }
});

export default app;
