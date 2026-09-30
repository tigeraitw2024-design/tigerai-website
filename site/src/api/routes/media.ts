import { Hono } from 'hono';
import type { Ctx } from '../types';
import { ALLOWED_MIME, MAX_UPLOAD, getStorage, makeKey } from '../adapters/storage';
import { newId, nowISO, rowToRecord } from '../db';
import { COLLECTION_LIST } from '../schema/registry';
import { audit } from '../auth';

/**
 * 上傳與取檔。
 *
 * 上傳要登入（後台中介層已經擋掉未登入），取檔不用——圖片本來就是公開的。
 * 真正要保護的檔案走 /api/download/<券>，那條路在 public.ts。
 */
const app = new Hono<Ctx>();

app.post('/upload', async (ctx) => {
  const admin = ctx.get('admin')!;
  const form = await ctx.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return ctx.json({ error: '沒有收到檔案' }, 400);

  if (file.size > MAX_UPLOAD) {
    return ctx.json({ error: `檔案太大了（${(file.size / 1048576).toFixed(1)} MB），上限是 20 MB。` }, 400);
  }
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mime)) {
    return ctx.json({ error: `不接受這種檔案（${mime}）。` }, 400);
  }

  const folder = String(form.get('folder') || 'misc');
  const key = makeKey(folder, file.name);
  const buf = await file.arrayBuffer();
  const stored = await getStorage(ctx.env).put(key, buf, mime);

  // 圖片的寬高由前端量好一起送上來。
  // 在 Worker 裡解圖片要帶一個解碼函式庫，那會把 Worker 撐大又吃 CPU，
  // 而瀏覽器本來就已經把圖片載進來了，量一下是免費的。
  const width = Number(form.get('width')) || 0;
  const height = Number(form.get('height')) || 0;

  const id = newId();
  const at = nowISO();
  const data = {
    name: file.name, key: stored.key, url: stored.url, mime, size: stored.size,
    width, height, alt: String(form.get('alt') || ''), folder, uploadedBy: admin.id,
  };
  await ctx.env.DB
    .prepare('INSERT INTO media (id,sort,data,created_at,updated_at,f_key) VALUES (?,0,?,?,?,?)')
    .bind(id, JSON.stringify(data), at, at, stored.key)
    .run();
  await audit(ctx.env.DB, admin.email, '上傳', `檔案/${file.name}`, { size: stored.size }, ctx.req.raw);

  return ctx.json({ id, ...data });
});

/**
 * 刪除前先查還有沒有人在用。
 *
 * 直接刪掉的話前台會破圖，而且破在哪裡要一頁一頁翻才找得到。
 * 這裡掃一遍所有集合的 data 有沒有提到這個 id——對幾千筆來說夠快。
 */
app.delete('/:id', async (ctx) => {
  const admin = ctx.get('admin')!;
  const db = ctx.env.DB;
  const id = ctx.req.param('id');
  const row = await db.prepare('SELECT * FROM media WHERE id=?').bind(id).first<any>();
  if (!row) return ctx.json({ error: '找不到這個檔案' }, 404);

  const used: string[] = [];
  for (const c of COLLECTION_LIST) {
    if (c.name === 'media') continue;
    const hasFileField = c.fields.some((f) => f.type === 'image' || f.type === 'file');
    if (!hasFileField) continue;
    const hit = await db
      .prepare(`SELECT COUNT(*) AS n FROM ${c.name} WHERE data LIKE ?`)
      .bind(`%${id}%`)
      .first<any>();
    if ((hit?.n ?? 0) > 0) used.push(`${c.label}（${hit.n} 筆）`);
  }
  if (used.length) {
    return ctx.json({ error: `這個檔案還在用：${used.join('、')}。請先換掉再刪。` }, 400);
  }

  const m = rowToRecord(row) as any;
  await getStorage(ctx.env).del(String(m.key));
  await db.prepare('DELETE FROM media WHERE id=?').bind(id).run();
  await audit(db, admin.email, '刪除', `檔案/${m.name}`, null, ctx.req.raw);
  return ctx.json({ ok: true });
});

export default app;

/**
 * R2 還沒接自訂網域時，靠這支把檔案轉出去。
 * 接了網域之後圖片會直接走 R2，不經過 Worker，也就不吃運算額度。
 */
export const rawHandler = async (ctx: any) => {
  const key = ctx.req.path.replace(/^\/api\/media\/raw\//, '');
  const file = await getStorage(ctx.env).get(decodeURIComponent(key));
  if (!file) return ctx.text('找不到', 404);
  return new Response(file.body, {
    headers: {
      'content-type': file.mime,
      // 路徑裡有隨機 id，同一個路徑的內容永遠不會變，可以讓瀏覽器放心存一年
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
