// 把 src/api 的 schema 轉成一份建表 SQL。
//
// 平常用不到：第一次安裝時 /api/auth/bootstrap 會直接照 schema 建表，
// 不需要人工跑 SQL。這支的用處是：
//   1. 想先看看資料表會長什麼樣
//   2. 要在別的地方（公司自己的資料庫）重建一份
//   3. 對照現有資料庫，確認 schema 有沒有跟資料庫脫節
//
// 用法：node tools/schema-sql.mjs            印出來
//       node tools/schema-sql.mjs --write    寫到 migrations/0001_init.sql
//
// schema 是 TypeScript，Node 不能直接 import（模組路徑沒寫副檔名），
// 所以先用 esbuild 打包成一支暫時的 .mjs 再載入。

import { build } from 'esbuild';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const tmp = path.join(SITE, 'node_modules', '.cache', 'schema-sql.mjs');

await mkdir(path.dirname(tmp), { recursive: true });
await build({
  entryPoints: [path.join(SITE, 'src', 'api', 'db.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: tmp,
  // Worker 的執行環境才有的東西，這裡只是要拿 SQL，塞個空的就好
  define: { 'crypto.randomUUID': 'globalThis.crypto.randomUUID' },
  logLevel: 'error',
});

const { fullSchemaSQL } = await import(pathToFileURL(tmp).href);
await rm(tmp, { force: true });

const sql = fullSchemaSQL()
  .map((s) => s.trim().replace(/;$/, '') + ';')
  .join('\n\n');

const header = `-- TigerAI 官網後台：資料表。
-- 這個檔是 node tools/schema-sql.mjs 從 src/api 的 schema 產生的，不要手改。
-- 要改資料表結構，去改對應的 src/api/modules/*.ts，再重新產生一次。
--
-- 正常安裝流程不需要跑這個檔：/api/auth/bootstrap 會自己照 schema 建表。
-- 產生時間：${new Date().toISOString()}

`;

if (process.argv.includes('--write')) {
  const out = path.join(SITE, 'migrations', '0001_init.sql');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, header + sql + '\n', 'utf8');
  console.log(`寫到 ${path.relative(SITE, out)}　共 ${fullSchemaSQL().length} 道陳述`);
} else {
  console.log(header + sql);
}
