// 把 design/ 裡的素材同步到 site/public/。
// design/ 是 Claude Design 交付的原型，唯一真相，只讀不改。
// public/ 裡這幾層是產物，不進版控（見 .gitignore），每次 build 前重新同步。
//
// 刻意不搬的東西：
//
//   design/assets/fonts/*.otf
//     思源黑體 4 字重共 64 MB。原型自架它，但量過線上版是「一頁下載 54 MB」，
//     四個字重全下載，完全不能上線。正式站改用 Google Fonts 的 Noto Sans TC：
//     跟思源黑體是同一套字的兩個發行名（Adobe 叫 Source Han Sans、Google 叫
//     Noto Sans CJK），Google Fonts 會切成上百個小 woff2 依 unicode-range
//     按需載入。字重對應 400/500/700/900 = Regular/Medium/Bold/Heavy。
//     換完有跑像素比對確認沒走樣，見 README「字型」。
//
//   design/uploads/*.json|md
//     n8n 原始流程與規格文件，屬於資料不是靜態資源。
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 路徑有空格和中文，一定要走 fileURLToPath，不能自己剝 URL。
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DESIGN = path.resolve(SITE, '..', 'design');
const PUBLIC = path.join(SITE, 'public');

const IMAGE = /\.(png|jpe?g|webp|svg|gif|avif)$/i;

async function syncDesignSystem() {
  // _ds/ 底下是一個帶雜湊的資料夾名，抓第一個就是。
  const dir = (await readdir(path.join(DESIGN, '_ds'), { withFileTypes: true })).find((e) => e.isDirectory());
  if (!dir) throw new Error('找不到 design/_ds/ 底下的設計系統資料夾');
  const from = path.join(DESIGN, '_ds', dir.name);
  const to = path.join(PUBLIC, 'ds');
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true });
  return dir.name;
}

async function syncAssets() {
  const from = path.join(DESIGN, 'assets');
  const to = path.join(PUBLIC, 'assets');
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  for (const e of await readdir(from, { withFileTypes: true })) {
    if (e.name === 'fonts') continue; // 見檔頭說明：64 MB 的 OTF 不上線
    await cp(path.join(from, e.name), path.join(to, e.name), { recursive: true });
  }
}

async function syncUploads() {
  const from = path.join(DESIGN, 'uploads');
  const to = path.join(PUBLIC, 'uploads');
  await rm(to, { recursive: true, force: true });
  await mkdir(to, { recursive: true });
  let n = 0;
  for (const e of await readdir(from, { withFileTypes: true })) {
    if (!e.isFile() || !IMAGE.test(e.name)) continue;
    await cp(path.join(from, e.name), path.join(to, e.name));
    n++;
  }
  return n;
}

async function sizeOf(dir) {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) total += (await stat(path.join(e.parentPath ?? e.path, e.name))).size;
  }
  return total;
}

if (!existsSync(DESIGN)) {
  console.error(`找不到原型資料夾：${DESIGN}`);
  process.exit(1);
}

const dsName = await syncDesignSystem();
await syncAssets();
const uploads = await syncUploads();
const mb = (b) => (b / 1024 / 1024).toFixed(1) + ' MB';
console.log(`設計系統  ds/            ← _ds/${dsName}`);
console.log(`圖片素材  assets/        ${mb(await sizeOf(path.join(PUBLIC, 'assets')))}（已跳過 64 MB 的 OTF，中文走 Google Fonts）`);
console.log(`內容圖    uploads/       ${uploads} 檔`);
console.log(`public 總計             ${mb(await sizeOf(PUBLIC))}`);
