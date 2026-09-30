import { Hono } from 'hono';
import type { Collection, Field, Role } from '../schema/types';
import { blankValue, maskPII } from '../schema/types';
import { canRead, canSeePII, canWrite, getCollection, visibleCollections, MODULES } from '../schema/registry';
import { columnName, indexedFields, newId, nowISO, rowToRecord } from '../db';
import { audit, hashPassword } from '../auth';
import type { Ctx } from '../types';

/**
 * 所有集合共用的一套 CRUD。
 *
 * 後台沒有任何一頁是為某個集合手寫的，這裡也沒有任何一段是為某個集合寫的。
 * 課程、訂單、顧問、折扣碼走的是同一條路，差別只在 schema 裡怎麼描述。
 *
 * 這代表新增一個功能不需要寫 API——寫完 module 檔就自動有了
 * 列表、單筆、新增、修改、刪除、排序、匯出。
 */

const app = new Hono<Ctx>();

// ── 驗證與清洗 ───────────────────────────────────────────────────

/**
 * 依 schema 檢查與轉換一筆資料。
 *
 * 這一步不能只在前端做。後台介面會擋，但直接打 API 就繞過去了，
 * 所以真正算數的檢查在這裡。
 */
async function coerce(
  c: Collection,
  input: Record<string, unknown>,
  existing: Record<string, unknown> | null,
): Promise<{ data: Record<string, unknown>; errors: string[] }> {
  const out: Record<string, unknown> = existing ? { ...existing } : {};
  const errors: string[] = [];

  for (const f of c.fields) {
    // 唯讀欄位一律用舊值。系統寫的東西（訂單編號、下載次數）不接受外面送進來的值。
    if (f.readonly) {
      if (existing && f.name in existing) out[f.name] = existing[f.name];
      else if (!(f.name in out)) out[f.name] = blankValue(f);
      continue;
    }

    if (!(f.name in input)) {
      if (!existing) out[f.name] = blankValue(f);
      continue;
    }

    const v = input[f.name];

    // 密碼：空字串代表「不要改」，有值才重新雜湊。
    // 永遠不會把雜湊讀回去再存一次——那樣改了一次密碼之後就再也驗不過。
    if (f.type === 'password') {
      const s = String(v ?? '');
      if (s) {
        if (s.length < 8) {
          errors.push(`${f.label}至少要 8 個字`);
        } else {
          out[f.name] = await hashPassword(s, false);
        }
      }
      continue;
    }

    const r = coerceOne(f, v);
    if (r.error) errors.push(r.error);
    else out[f.name] = r.value;
  }

  // 必填檢查放在最後，因為上面可能才剛套完預設值
  for (const f of c.fields) {
    if (!f.required || f.readonly || f.type === 'password') continue;
    const v = out[f.name];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty) errors.push(`${f.label}是必填的`);
  }

  return { data: out, errors };
}

function coerceOne(f: Field, v: unknown): { value?: unknown; error?: string } {
  switch (f.type) {
    case 'number':
    case 'money': {
      if (v === '' || v === null || v === undefined) return { value: 0 };
      const n = Number(v);
      if (!Number.isFinite(n)) return { error: `${f.label}要填數字` };
      if (f.min !== undefined && n < f.min) return { error: `${f.label}不能小於 ${f.min}` };
      if (f.max !== undefined && n > f.max) return { error: `${f.label}不能大於 ${f.max}` };
      return { value: Math.round(n) };
    }
    case 'boolean':
      return { value: v === true || v === 'true' || v === 1 || v === '1' };
    case 'select': {
      const s = String(v ?? '');
      if (s && f.options && !f.options.some((o) => o.value === s)) {
        return { error: `${f.label}不是有效的選項` };
      }
      return { value: s };
    }
    case 'multiselect':
    case 'relations':
      return { value: Array.isArray(v) ? v.map(String) : [] };
    case 'array':
      if (!Array.isArray(v)) return { value: [] };
      return {
        value: v.map((item: any) => {
          const row: Record<string, unknown> = {};
          for (const sub of f.of || []) {
            const r = coerceOne(sub, item?.[sub.name]);
            row[sub.name] = r.error ? blankValue(sub) : r.value;
          }
          return row;
        }),
      };
    case 'json':
      if (typeof v === 'string') {
        if (!v.trim()) return { value: null };
        try {
          return { value: JSON.parse(v) };
        } catch {
          return { error: `${f.label}不是合法的 JSON` };
        }
      }
      return { value: v ?? null };
    case 'email': {
      const s = String(v ?? '').trim().toLowerCase();
      if (s && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(s)) return { error: `${f.label}格式不對` };
      return { value: s };
    }
    case 'url': {
      const s = String(v ?? '').trim();
      if (s && !/^https?:\/\//i.test(s)) return { error: `${f.label}要以 http:// 或 https:// 開頭` };
      return { value: s };
    }
    case 'slug': {
      const s = String(v ?? '').trim().toLowerCase();
      if (s && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
        return { error: `${f.label}只能用小寫英文、數字和連字號` };
      }
      return { value: s };
    }
    default: {
      let s = String(v ?? '');
      if (f.maxLength && s.length > f.maxLength) {
        return { error: `${f.label}不能超過 ${f.maxLength} 個字（目前 ${s.length} 個）` };
      }
      // richtext 允許有限的標籤。允許的那幾個都不能執行程式，
      // 所以就算有人貼了帶 script 的內容進來也不會變成 XSS。
      if (f.type === 'richtext') s = sanitizeHTML(s);
      return { value: s };
    }
  }
}

/**
 * 極保守的 HTML 清洗：白名單以外的標籤整個拿掉，屬性只留 href 和 title，
 * href 只允許 http/https/mailto。
 *
 * 不用現成的清洗套件是因為它們都不小，而 Worker 有 3 MB 的大小限制，
 * 這裡的需求又只是「後台自己人貼的文字」，不是「接受任何人投稿」。
 */
const ALLOWED_TAGS = /^(p|br|strong|b|em|i|u|ul|ol|li|h2|h3|h4|blockquote|a|code|pre|hr)$/i;
function sanitizeHTML(s: string) {
  return s.replace(/<\/?([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (m, tag, attrs) => {
    if (!ALLOWED_TAGS.test(tag)) return '';
    if (m.startsWith('</')) return `</${tag.toLowerCase()}>`;
    if (tag.toLowerCase() === 'a') {
      const href = /href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i.exec(attrs);
      const url = (href?.[1] || href?.[2] || '').trim();
      if (!/^(https?:|mailto:|\/)/i.test(url)) return '<a>';
      return `<a href="${url.replace(/"/g, '&quot;')}" rel="noopener">`;
    }
    return `<${tag.toLowerCase()}>`;
  });
}

// ── 個資遮罩 ─────────────────────────────────────────────────────

/**
 * 角色看不到個資時，把值換成遮罩後的字串**再回傳**。
 * 不是前端不顯示——直接打 API 也拿不到完整值。
 */
function applyPII(c: Collection, rec: Record<string, unknown>, role: Role) {
  if (canSeePII(role)) return rec;
  const out = { ...rec };
  for (const f of c.fields) if (f.pii) out[f.name] = maskPII(out[f.name]);
  return out;
}

// ── 路由 ─────────────────────────────────────────────────────────

/** 後台開起來時先問這一支：我是誰、我看得到哪些功能、每個功能長什麼樣。 */
app.get('/schema', (ctx) => {
  const role = ctx.get('admin')!.role;
  const cols = visibleCollections(role);
  return ctx.json({
    role,
    canSeePII: canSeePII(role),
    modules: MODULES.map((m) => ({
      id: m.id,
      label: m.label,
      about: m.about,
      collections: m.collections.filter((c) => canRead(c, role)).map((c) => c.name),
    })).filter((m) => m.collections.length),
    collections: cols.map((c) => ({
      ...c,
      seed: undefined,
      canWrite: canWrite(c, role),
    })),
  });
});

function guard(ctx: any, name: string, write: boolean) {
  const c = getCollection(name);
  if (!c) return { error: ctx.json({ error: '沒有這個集合' }, 404) };
  const role = ctx.get('admin')!.role as Role;
  if (!canRead(c, role)) return { error: ctx.json({ error: '沒有權限' }, 403) };
  if (write && !canWrite(c, role)) return { error: ctx.json({ error: '沒有修改權限' }, 403) };
  return { c, role };
}

/** 列表。支援搜尋、狀態篩選、分頁。 */
app.get('/c/:name', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), false);
  if (g.error) return g.error;
  const { c, role } = g;

  const url = new URL(ctx.req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const limit = Math.min(200, Number(url.searchParams.get('limit')) || 50);
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

  const db = ctx.env.DB;
  const order = c.sortable ? 'sort ASC, created_at DESC' : 'created_at DESC';

  // 搜尋直接掃 data 這個 JSON 字串。
  // 對幾千筆來說夠快；真的長到幾萬筆再把要搜的欄位標成 indexed 做真欄位。
  const where = q ? "WHERE lower(data) LIKE ?" : '';
  const binds: unknown[] = q ? [`%${q}%`] : [];

  const { results } = await db
    .prepare(`SELECT * FROM ${c.name} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset)
    .all<any>();
  const total = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${c.name} ${where}`)
    .bind(...binds)
    .first<any>();

  return ctx.json({
    total: total?.n ?? 0,
    items: (results || []).map((r: any) => applyPII(c, rowToRecord(r), role)),
  });
});

/** 單筆。singleton 用 id = "_" 取那唯一一筆，沒有就當場建一筆空的。 */
app.get('/c/:name/:id', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), false);
  if (g.error) return g.error;
  const { c, role } = g;
  const db = ctx.env.DB;
  const id = ctx.req.param('id');

  if (c.kind === 'singleton') {
    let row = await db.prepare(`SELECT * FROM ${c.name} LIMIT 1`).first<any>();
    if (!row) {
      const blank: Record<string, unknown> = {};
      for (const f of c.fields) blank[f.name] = blankValue(f);
      const nid = newId();
      const at = nowISO();
      await db
        .prepare(`INSERT INTO ${c.name} (id,sort,data,created_at,updated_at) VALUES (?,0,?,?,?)`)
        .bind(nid, JSON.stringify(blank), at, at)
        .run();
      row = { id: nid, sort: 0, data: JSON.stringify(blank), created_at: at, updated_at: at };
    }
    return ctx.json(applyPII(c, rowToRecord(row), role));
  }

  const row = await db.prepare(`SELECT * FROM ${c.name} WHERE id=?`).bind(id).first<any>();
  if (!row) return ctx.json({ error: '找不到這一筆' }, 404);
  return ctx.json(applyPII(c, rowToRecord(row), role));
});

/** 新增 */
app.post('/c/:name', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), true);
  if (g.error) return g.error;
  const { c } = g;
  if (c.canCreate === false) return ctx.json({ error: '這個集合不能新增' }, 400);

  const input = await ctx.req.json<Record<string, unknown>>();
  const { data, errors } = await coerce(c, input, null);
  if (errors.length) return ctx.json({ errors }, 400);

  const db = ctx.env.DB;
  const id = newId();
  const at = nowISO();
  const cols = indexedFields(c);
  const names = ['id', 'sort', 'data', 'created_at', 'updated_at', ...cols.map(columnName)];
  const vals = [id, Number(input.sort) || 0, JSON.stringify(data), at, at, ...cols.map((f) => mirror(f, data[f.name]))];

  try {
    await db
      .prepare(`INSERT INTO ${c.name} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`)
      .bind(...vals)
      .run();
  } catch (e: any) {
    return ctx.json({ errors: [uniqueMessage(c, e)] }, 400);
  }

  const admin = ctx.get('admin')!;
  await audit(db, admin.email, '新增', `${c.label}/${id}`, null, ctx.req.raw);
  return ctx.json({ id });
});

/** 修改 */
app.put('/c/:name/:id', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), true);
  if (g.error) return g.error;
  const { c } = g;
  const db = ctx.env.DB;

  const row =
    c.kind === 'singleton'
      ? await db.prepare(`SELECT * FROM ${c.name} LIMIT 1`).first<any>()
      : await db.prepare(`SELECT * FROM ${c.name} WHERE id=?`).bind(ctx.req.param('id')).first<any>();
  if (!row) return ctx.json({ error: '找不到這一筆' }, 404);

  const existing = JSON.parse(row.data || '{}');
  const input = await ctx.req.json<Record<string, unknown>>();
  const { data, errors } = await coerce(c, input, existing);
  if (errors.length) return ctx.json({ errors }, 400);

  const cols = indexedFields(c);
  const sets = ['data=?', 'updated_at=?', ...(input.sort !== undefined ? ['sort=?'] : []), ...cols.map((f) => `${columnName(f)}=?`)];
  const vals: unknown[] = [JSON.stringify(data), nowISO(), ...(input.sort !== undefined ? [Number(input.sort) || 0] : []), ...cols.map((f) => mirror(f, data[f.name]))];

  try {
    await db.prepare(`UPDATE ${c.name} SET ${sets.join(',')} WHERE id=?`).bind(...vals, row.id).run();
  } catch (e: any) {
    return ctx.json({ errors: [uniqueMessage(c, e)] }, 400);
  }

  const admin = ctx.get('admin')!;
  await audit(db, admin.email, '修改', `${c.label}/${row.id}`, changedFields(existing, data, c), ctx.req.raw);
  return ctx.json({ id: row.id });
});

/** 刪除 */
app.delete('/c/:name/:id', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), true);
  if (g.error) return g.error;
  const { c } = g;
  if (c.canDelete === false) return ctx.json({ error: '這個集合不能刪除' }, 400);

  const db = ctx.env.DB;
  const id = ctx.req.param('id');
  const row = await db.prepare(`SELECT * FROM ${c.name} WHERE id=?`).bind(id).first<any>();
  if (!row) return ctx.json({ error: '找不到這一筆' }, 404);

  await db.prepare(`DELETE FROM ${c.name} WHERE id=?`).bind(id).run();
  const admin = ctx.get('admin')!;
  // 刪掉的內容整份留在操作紀錄裡。刪錯的時候，這是唯一救得回來的東西。
  await audit(db, admin.email, '刪除', `${c.label}/${id}`, rowToRecord(row), ctx.req.raw);
  return ctx.json({ ok: true });
});

/** 拖曳排序：一次送一整串 id，照順序寫回 sort */
app.post('/c/:name/reorder', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), true);
  if (g.error) return g.error;
  const { c } = g;
  const { ids } = await ctx.req.json<{ ids: string[] }>();
  if (!Array.isArray(ids)) return ctx.json({ error: '要給一組 id' }, 400);

  const db = ctx.env.DB;
  await db.batch(
    ids.map((id, i) => db.prepare(`UPDATE ${c.name} SET sort=? WHERE id=?`).bind(i, id)),
  );
  return ctx.json({ ok: true });
});

/** 匯出 CSV。個資照樣受權限控制，沒權限匯出來的也是遮罩過的。 */
app.get('/export/:name', async (ctx) => {
  const g = guard(ctx, ctx.req.param('name'), false);
  if (g.error) return g.error;
  const { c, role } = g;

  const { results } = await ctx.env.DB.prepare(`SELECT * FROM ${c.name} ORDER BY created_at DESC`).all<any>();
  const fields = c.fields.filter((f) => f.type !== 'password');
  const head = ['id', ...fields.map((f) => f.label), '建立時間'];
  const lines = [head.map(csvCell).join(',')];
  for (const r of results || []) {
    const rec = applyPII(c, rowToRecord(r), role);
    lines.push([rec.id, ...fields.map((f) => flatten(rec[f.name])), rec.createdAt].map(csvCell).join(','));
  }

  const admin = ctx.get('admin')!;
  await audit(ctx.env.DB, admin.email, '匯出', c.label, { count: results?.length || 0 }, ctx.req.raw);

  // BOM 是給 Excel 的：沒有它，中文在 Excel 開起來會是亂碼
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'content-type': 'text/csv;charset=utf-8',
      'content-disposition': `attachment; filename="${c.name}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

// ── 小工具 ───────────────────────────────────────────────────────

/** 鏡射到真欄位的值。布林存 0/1，其他存字串或數字。 */
function mirror(f: Field, v: unknown) {
  if (v === undefined || v === null) return null;
  if (f.type === 'boolean') return v ? 1 : 0;
  if (f.type === 'number' || f.type === 'money') return Number(v) || 0;
  return String(v);
}

function uniqueMessage(c: Collection, e: any) {
  const msg = String(e?.message || e);
  if (/UNIQUE/i.test(msg)) {
    const f = c.fields.find((x) => x.unique && msg.includes(columnName(x)));
    return f ? `已經有一筆的${f.label}是一樣的，請換一個` : '有欄位重複了';
  }
  return msg.slice(0, 200);
}

/** 操作紀錄只記「哪些欄位變了」，不記全文——記全文會把個資抄一份到紀錄表。 */
function changedFields(before: Record<string, unknown>, after: Record<string, unknown>, c: Collection) {
  const changed: string[] = [];
  for (const f of c.fields) {
    if (f.type === 'password') continue;
    if (JSON.stringify(before[f.name]) !== JSON.stringify(after[f.name])) changed.push(f.label);
  }
  return { changed };
}

function flatten(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(flatten).join(' / ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function csvCell(v: unknown) {
  const s = String(v ?? '');
  // 以 = + - @ 開頭的字串在 Excel 裡會被當成公式執行。前面補一個單引號擋掉。
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default app;
