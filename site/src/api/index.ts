import { Hono } from 'hono';
import type { Ctx, Env } from './types';
import { currentAdmin } from './auth';
import authRoutes from './routes/auth';
import contentRoutes from './routes/content';
import crudRoutes from './routes/crud';
import mediaRoutes, { rawHandler } from './routes/media';
import opsRoutes, { runCron } from './routes/ops';
import publicRoutes from './routes/public';
import shopRoutes from './routes/shop';

/**
 * Worker 進入點。
 *
 * ── 這支 Worker 什麼時候會被叫到 ────────────────────────────────
 *
 * 只有 /api/* 會進來（wrangler.jsonc 的 run_worker_first 設定的）。
 * 前台那八頁、圖片、字型全部由 Cloudflare 直接發，不經過這裡，
 * 所以不吃免費方案每次請求 10 毫秒的運算額度。
 *
 * 這件事很重要：如果讓每一個請求都經過 Worker，光是載入一頁
 * （HTML ＋ CSS ＋ JS ＋ 十幾張圖）就是十幾次 Worker 呼叫，
 * 免費方案一天 10 萬次請求很快就會用完，而且每一次都在跟 10 毫秒賽跑。
 */

const app = new Hono<Ctx>();

// ── 共用的回應處理 ───────────────────────────────────────────────

app.use('*', async (ctx, next) => {
  await next();
  // API 的回應一律不要被快取。快取一份「誰登入了」的回應是很難查的災難。
  ctx.header('cache-control', 'no-store');
  ctx.header('x-content-type-options', 'nosniff');
  ctx.header('referrer-policy', 'same-origin');
});

app.onError((err, ctx) => {
  // 錯誤訊息不直接回給前端。資料庫的錯誤訊息裡常常有資料表結構甚至資料。
  console.error('[api]', err);
  return ctx.json({ error: '伺服器出錯了，請再試一次。' }, 500);
});

// ── 公開端點 ─────────────────────────────────────────────────────

app.route('/api/auth', authRoutes);
app.route('/api', publicRoutes);
app.route('/api', shopRoutes);
app.route('/api/content', contentRoutes);
app.get('/api/media/raw/*', rawHandler);

// ── 後台：從這裡開始都要登入 ────────────────────────────────────

/**
 * 後台中介層。
 *
 * 放在 /api/admin/* 前面，所以底下所有路由都不用自己檢查登入——
 * 少一個地方檢查，就少一個地方可能忘記檢查。
 */
app.use('/api/admin/*', async (ctx, next) => {
  const user = await currentAdmin(ctx.env.DB, ctx.req.raw);
  if (!user) return ctx.json({ error: '請先登入' }, 401);
  ctx.set('admin', user);
  await next();
});

app.route('/api/admin', crudRoutes);
app.route('/api/admin/media', mediaRoutes);
app.route('/api/admin/ops', opsRoutes);

// ── 其他 ─────────────────────────────────────────────────────────

app.get('/api/health', (ctx) => ctx.json({ ok: true, at: new Date().toISOString() }));

app.all('/api/*', (ctx) => ctx.json({ error: '沒有這個端點' }, 404));

/**
 * 不是 /api 開頭卻進到 Worker 的請求。
 *
 * 正常情況不會發生（靜態檔案在 Worker 之前就被發掉了），
 * 但萬一設定被改動，這裡還是把它交回給靜態檔案處理，
 * 而不是回一個 404——不然一個設定失誤就會讓整站掛掉。
 */
app.all('*', async (ctx) => {
  if (ctx.env.ASSETS) return ctx.env.ASSETS.fetch(ctx.req.raw);
  return ctx.text('Not found', 404);
});

export default {
  fetch: app.fetch,

  /** 排程工作。內容見 routes/ops.ts 的 runCron。 */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCron(env));
  },
};
