import { Hono } from 'hono';
import type { Ctx } from '../types';
import { readCookie, cookieHeader, clearCookie, rateLimit, clientKey } from '../auth';
import {
  ensureTables, listCerts, createCert, updateCert, markCerts, certReport,
  listInstructors, upsertInstructor, getRow, getSettings, putSettings,
  acceptCerts, requestEdit, clearEditRequest, deleteCert, deleteInstructor,
} from './store';
import { certificatesCollection } from './schema';
import {
  TEACHER_COOKIE, OAUTH_STATE_COOKIE, currentTeacher, createTeacherSession, destroyTeacherSession,
  teacherCookie, clearTeacherCookie, googleConfigured, googleAuthUrl, googleIdentity, resolveInstructor,
} from './auth';

/**
 * 講師區 API，掛在 /api/teacher/*。自己管登入，不靠官網的 /api/admin 中介層。
 *
 * 權限分兩種：
 *   instructor  只看得到、只能動自己的學生（用 instructorId 過濾）
 *   owner       看全部，能標已印/已寄、看對帳報表、管名冊
 */
const app = new Hono<Ctx>();

// 任何請求先確保 cert_* 兩張表在
app.use('*', async (ctx, next) => { await ensureTables(ctx.env.DB); await next(); });

function base(ctx: any) {
  return (ctx.env.SITE_URL ? String(ctx.env.SITE_URL).replace(/\/$/, '') : new URL(ctx.req.url).origin);
}
const REDIRECT_PATH = '/api/teacher/auth/google/callback';

// ── 登入狀態 ──────────────────────────────────────────────────────

app.get('/config', (ctx) => ctx.json({ googleConfigured: googleConfigured(ctx.env) }));

app.get('/me', async (ctx) => {
  const t = await currentTeacher(ctx.env.DB, ctx.req.raw);
  if (!t) return ctx.json({ error: '沒有登入' }, 401);
  return ctx.json({ user: t });
});

app.post('/logout', async (ctx) => {
  await destroyTeacherSession(ctx.env.DB, ctx.req.raw);
  ctx.header('set-cookie', clearTeacherCookie());
  return ctx.json({ ok: true });
});

// ── Google OAuth ──────────────────────────────────────────────────

app.get('/auth/google/start', async (ctx) => {
  if (!googleConfigured(ctx.env)) {
    return ctx.json({ error: '還沒設定 Google 登入（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET）。' }, 503);
  }
  if (!(await rateLimit(ctx.env.DB, clientKey(ctx.req.raw, 'tlogin'), 20, 900))) {
    return ctx.json({ error: '嘗試太多次了，請 15 分鐘後再試。' }, 429);
  }
  const state = crypto.randomUUID().replace(/-/g, '');
  ctx.header('set-cookie', cookieHeader(OAUTH_STATE_COOKIE, state, 600));
  return ctx.redirect(googleAuthUrl(ctx.env, base(ctx) + REDIRECT_PATH, state));
});

app.get('/auth/google/callback', async (ctx) => {
  const url = new URL(ctx.req.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const saved = readCookie(ctx.req.raw, OAUTH_STATE_COOKIE);
  ctx.header('set-cookie', clearCookie(OAUTH_STATE_COOKIE));
  if (!code || !state || state !== saved) return ctx.redirect('/teacher?error=state');

  try {
    const id = await googleIdentity(ctx.env, code, base(ctx) + REDIRECT_PATH);
    if (!id.verified) return ctx.redirect('/teacher?error=unverified');
    const inst = await resolveInstructor(ctx.env.DB, ctx.env, id.email, id.name);
    if (!inst) return ctx.redirect('/teacher?error=notlisted');
    const s = await createTeacherSession(ctx.env.DB, inst.id, ctx.req.raw);
    ctx.header('set-cookie', teacherCookie(s.id, s.days * 86400), { append: true });
    return ctx.redirect('/teacher');
  } catch (e) {
    console.error('[teacher oauth]', e);
    return ctx.redirect('/teacher?error=oauth');
  }
});

// ── 以下都要登入 ──────────────────────────────────────────────────

app.use('/certs/*', requireTeacher);
app.use('/certs', requireTeacher);
app.use('/report', requireTeacher);
app.use('/instructors', requireTeacher);
app.use('/instructors/*', requireTeacher);
app.use('/settings', requireTeacher);

async function requireTeacher(ctx: any, next: any) {
  const t = await currentTeacher(ctx.env.DB, ctx.req.raw);
  if (!t) return ctx.json({ error: '請先登入' }, 401);
  ctx.set('teacher', t);
  await next();
}
function owner(ctx: any) { return ctx.get('teacher').role === 'owner'; }

// 證照列表：instructor 只看自己的，owner 看全部（可用 ?mine=1 只看自己）
app.get('/certs', async (ctx) => {
  const t = ctx.get('teacher');
  const url = new URL(ctx.req.url);
  const mine = url.searchParams.get('mine') === '1';
  const scopeId = owner(ctx) && !mine ? undefined : t.id;
  const printed = url.searchParams.get('printed');
  const shipped = url.searchParams.get('shipped');
  const rows = await listCerts(ctx.env.DB, {
    instructorId: scopeId,
    q: url.searchParams.get('q') || undefined,
    printed: printed == null ? undefined : printed === '1',
    shipped: shipped == null ? undefined : shipped === '1',
  });
  return ctx.json({ items: rows, role: t.role });
});

app.post('/certs', async (ctx) => {
  const t = ctx.get('teacher');
  const input = await ctx.req.json<Record<string, unknown>>();
  try {
    const id = await createCert(ctx.env.DB, { id: t.id, name: t.name }, input);
    return ctx.json({ id });
  } catch (e: any) { return ctx.json({ error: e.message || '新增失敗' }, 400); }
});

app.post('/certs/import', async (ctx) => {
  const t = ctx.get('teacher');
  const body = await ctx.req.json<{ csv?: string; rows?: Record<string, unknown>[] }>();
  // 兩種來源：前端已對應好的 rows（Excel 匯入走這條），或舊的 CSV 純文字。
  const rows = Array.isArray(body.rows) ? body.rows : parseCSV(String(body.csv || ''));
  let ok = 0; const errors: string[] = [];
  for (const r of rows) {
    try { await createCert(ctx.env.DB, { id: t.id, name: t.name }, r); ok++; }
    catch (e: any) { errors.push(`${(r as any).studentName || '(無名)'}：${e.message}`); }
  }
  return ctx.json({ ok, errors });
});

app.put('/certs/:id', async (ctx) => {
  const t = ctx.get('teacher');
  const id = ctx.req.param('id');
  const existing = await getRow(ctx.env.DB, certificatesCollection, id);
  if (!existing) return ctx.json({ error: '找不到這一筆' }, 404);
  if (!owner(ctx) && existing.instructorId !== t.id) return ctx.json({ error: '不能改別人的資料' }, 403);
  // 接單後講師不能直接改（資料可能已在印），只能走「申請修改」。owner 不受限。
  if (!owner(ctx) && existing.accepted) return ctx.json({ error: '已接單製作中，不能直接改，請按「申請修改」送給虎智。' }, 403);
  const input = await ctx.req.json<Record<string, unknown>>();
  try {
    await updateCert(ctx.env.DB, id, input);
    if (owner(ctx)) await clearEditRequest(ctx.env.DB, id); // owner 改完就把待處理的申請清掉
    return ctx.json({ id });
  } catch (e: any) { return ctx.json({ error: e.message || '更新失敗' }, 400); }
});

// 刪除：owner 刪任何一筆；講師只能刪自己的、且還沒接單（已接單在製作中，要走申請修改）。
app.delete('/certs/:id', async (ctx) => {
  const t = ctx.get('teacher');
  const id = ctx.req.param('id');
  const existing = await getRow(ctx.env.DB, certificatesCollection, id);
  if (!existing) return ctx.json({ error: '找不到這一筆' }, 404);
  if (!owner(ctx)) {
    if (existing.instructorId !== t.id) return ctx.json({ error: '不能刪別人的資料' }, 403);
    if (existing.accepted) return ctx.json({ error: '已接單製作中，不能刪，請按「申請修改」聯絡虎智。' }, 403);
  }
  await deleteCert(ctx.env.DB, id);
  return ctx.json({ ok: true });
});

// 接單（owner）：鎖定、算預計寄出日。回傳天數與預計日給前台顯示提示。
app.post('/certs/accept', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能接單' }, 403);
  const { ids } = await ctx.req.json<{ ids: string[] }>();
  const s = await getSettings(ctx.env.DB);
  const printDays = Number(s.printDays) || 0;
  const shipDays = Number(s.shipDays) || 0;
  const r = await acceptCerts(ctx.env.DB, Array.isArray(ids) ? ids : [], printDays + shipDays);
  return ctx.json({ ...r, printDays, shipDays, days: printDays + shipDays });
});

// 申請修改（講師對自己的、或 owner）：寫一句要改什麼，owner 會看到待處理標記。
app.post('/certs/:id/edit-request', async (ctx) => {
  const t = ctx.get('teacher');
  const id = ctx.req.param('id');
  const existing = await getRow(ctx.env.DB, certificatesCollection, id);
  if (!existing) return ctx.json({ error: '找不到這一筆' }, 404);
  if (!owner(ctx) && existing.instructorId !== t.id) return ctx.json({ error: '不能動別人的資料' }, 403);
  const { message } = await ctx.req.json<{ message: string }>();
  if (!String(message || '').trim()) return ctx.json({ error: '請寫要改什麼' }, 400);
  await requestEdit(ctx.env.DB, id, message);
  return ctx.json({ ok: true });
});

// 忽略修改申請（owner）：不照改、直接清掉標記。
app.post('/certs/:id/dismiss-edit', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能處理' }, 403);
  await clearEditRequest(ctx.env.DB, ctx.req.param('id'));
  return ctx.json({ ok: true });
});

// 批次標記已印／已寄：owner 專用
app.post('/certs/mark', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能標記' }, 403);
  const { ids, field, value } = await ctx.req.json<{ ids: string[]; field: 'printed' | 'shipped'; value: boolean }>();
  if (!Array.isArray(ids) || (field !== 'printed' && field !== 'shipped')) {
    return ctx.json({ error: '參數不對' }, 400);
  }
  const n = await markCerts(ctx.env.DB, ids, field, !!value);
  return ctx.json({ ok: true, count: n });
});

app.get('/report', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能看報表' }, 403);
  return ctx.json({ rows: await certReport(ctx.env.DB) });
});

// 獎狀設定（格式與內容）：只有 owner 能看與改。
app.get('/settings', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能看設定' }, 403);
  return ctx.json({ settings: await getSettings(ctx.env.DB) });
});
app.put('/settings', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能改設定' }, 403);
  const patch = await ctx.req.json<Record<string, unknown>>();
  return ctx.json({ settings: await putSettings(ctx.env.DB, patch) });
});

// 名冊：owner 專用
app.get('/instructors', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能管名冊' }, 403);
  return ctx.json({ items: await listInstructors(ctx.env.DB) });
});
app.post('/instructors', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能管名冊' }, 403);
  const b = await ctx.req.json<{ email: string; name: string; role?: string; active?: boolean; note?: string }>();
  if (!b.email || !b.name) return ctx.json({ error: '請填 Gmail 和姓名' }, 400);
  const id = await upsertInstructor(ctx.env.DB, b);
  return ctx.json({ id });
});
app.delete('/instructors/:id', async (ctx) => {
  if (!owner(ctx)) return ctx.json({ error: '只有 owner 能管名冊' }, 403);
  const t = ctx.get('teacher');
  const id = ctx.req.param('id');
  if (id === t.id) return ctx.json({ error: '不能刪掉你自己正在登入的帳號。' }, 400);
  await deleteInstructor(ctx.env.DB, id);
  return ctx.json({ ok: true });
});

// ── CSV ───────────────────────────────────────────────────────────

/** 很小的 CSV 解析：支援引號、逗號、換行。第一列是表頭，用關鍵字對到欄位。 */
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const data = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (data.length < 2) return [];
  const head = data[0].map((h) => h.trim().toLowerCase());
  const col = (keys: string[]) => head.findIndex((h) => keys.some((k) => h.includes(k)));
  const idx = {
    studentName: col(['student', '姓名', 'name']),
    course: col(['證照', 'cert', '課程名稱']),
    issueDate: col(['日期', 'date']),
    courseName: col(['梯次', '班級', '班']),
    email: col(['email', '信箱', 'mail']),
    phone: col(['電話', 'phone', '手機']),
    address: col(['地址', 'address', 'addr']),
    fee: col(['費用', 'fee', '金額']),
  };
  return data.slice(1).map((r) => {
    const o: Record<string, string> = {};
    for (const [k, i] of Object.entries(idx)) if (i >= 0) o[k] = (r[i] || '').trim();
    return o;
  }).filter((o) => (o.studentName || '').trim() !== '');
}

export default app;
