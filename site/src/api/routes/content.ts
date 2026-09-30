import { Hono } from 'hono';
import type { Ctx } from '../types';
import { getCollection } from '../schema/registry';
import { rowToRecord } from '../db';

/**
 * 給「建置前台」用的內容端點。
 *
 * 前台是靜態的，建置的時候會來這裡把內容抓下來烤進 HTML。
 *
 * ── 為什麼不用驗證 ────────────────────────────────────────────
 * 這裡吐的東西本來就會印在網頁上給全世界看。加一把鑰匙不會讓它更安全，
 * 只會多一個會過期、會忘記、會被寫進設定檔的東西。
 *
 * 但範圍要卡死，而且是卡在後端：
 *   1. 只有 kind 是 content 或 singleton 的集合（預約、名單、會員、訂單
 *      是 runtime，這裡永遠拿不到）
 *   2. 只回 status 是 published 的（草稿不會外流）
 *   3. 標了 pii 的欄位一律不輸出（案例的內部備註就是靠這條擋住的）
 *
 * 第 3 條很重要：案例有一個「內部備註」欄位是拿來記客戶是誰的，
 * 那是刻意設計成永遠不會到前台的。靠「前台記得不要印出來」不夠，
 * 要靠這裡根本不給。
 */
const app = new Hono<Ctx>();

app.get('/:name', async (ctx) => {
  const name = ctx.req.param('name');
  const c = getCollection(name);
  if (!c) return ctx.json({ error: '沒有這個集合' }, 404);
  if (c.kind === 'runtime') return ctx.json({ error: '這個集合不對外' }, 403);

  const order = c.sortable ? 'sort ASC, created_at DESC' : 'created_at DESC';
  const { results } = await ctx.env.DB.prepare(`SELECT * FROM ${name} ORDER BY ${order}`).all<any>();

  const piiFields = c.fields.filter((f) => f.pii).map((f) => f.name);
  const items = (results || [])
    .map(rowToRecord)
    .filter((r: any) => !('status' in r) || r.status === 'published' || r.status === '')
    .map((r: any) => {
      const out = { ...r };
      for (const k of piiFields) delete out[k];
      return out;
    });

  // 內容不常變，讓 Cloudflare 的邊緣快取存五分鐘。
  // 建置是偶爾才跑一次的事，這裡不需要即時。
  ctx.header('cache-control', 'public, max-age=300');
  return ctx.json({ items });
});

/** 一次把所有內容集合拿回去。建置時打一次就好，不用打十幾次。 */
app.get('/', async (ctx) => {
  const out: Record<string, unknown[]> = {};
  const { COLLECTION_LIST } = await import('../schema/registry');
  for (const c of COLLECTION_LIST) {
    if (c.kind === 'runtime') continue;
    try {
      const order = c.sortable ? 'sort ASC, created_at DESC' : 'created_at DESC';
      const { results } = await ctx.env.DB.prepare(`SELECT * FROM ${c.name} ORDER BY ${order}`).all<any>();
      const piiFields = c.fields.filter((f) => f.pii).map((f) => f.name);
      out[c.name] = (results || [])
        .map(rowToRecord)
        .filter((r: any) => !('status' in r) || r.status === 'published' || r.status === '')
        .map((r: any) => {
          const o = { ...r };
          for (const k of piiFields) delete o[k];
          return o;
        });
    } catch {
      // 某張表還沒建就跳過，不要讓整個建置掛掉
      out[c.name] = [];
    }
  }
  ctx.header('cache-control', 'public, max-age=300');
  return ctx.json(out);
});

export default app;
