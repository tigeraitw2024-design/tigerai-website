// 企業首選「範例影片」接線檢查。
//
// 後台填了影片網址、程式也建置成功，不代表播得出來。這支跑完整條路：
// 開建好的首頁 → 逐一點六條流程 → 點「範例影片」頁籤 → 確認 iframe 真的
// 指向那條流程該有的 YouTube 代號。
//
// 為什麼值得有一支：這條路上有三個地方會默默斷掉，而且三個都不會報錯，
// 畫面只會一直顯示「錄影準備中」——
//   1. src/content 的載入器沒把 video 欄位帶出來（後台填了也沒用）
//   2. 元件還在讀寫死的清單，不是讀資料
//   3. 網址解析不出代號，送了一個壞代號給 YouTube（畫面是黑的）
//
// 用法：npm run build && node tools/video-check.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DIST = path.join(SITE, 'dist');
const MAP = path.resolve(SITE, '..', '企業首選資料', '影片對照表.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.ico': 'image/x-icon',
};

function serve(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let rel = '/';
      try {
        rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      } catch { /* 網址壞掉就當首頁 */ }
      if (rel.endsWith('/')) rel += 'index.html';
      try {
        const buf = await readFile(path.join(root, rel));
        res.writeHead(200, { 'content-type': TYPES[path.extname(rel)] || 'application/octet-stream' });
        res.end(buf);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

let pass = 0;
let fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label, extra === undefined ? '' : JSON.stringify(extra)); }
};

const expected = JSON.parse(await readFile(MAP, 'utf8')).videos;
const idFor = (name) => expected.find((v) => v.title === name)?.youtubeId;

/**
 * 13 部門該配哪一支影片。Robin 2026-10-17 指定的。
 *
 * 這份刻意寫在測試裡，而不是從 src/data/depts.ts 讀——從程式讀的話，
 * 程式改錯了測試也跟著錯，等於沒驗。這裡是「應該長這樣」的那一份。
 * 左邊是官網上的部門名稱，右邊是影片的部門名稱（有 8 個不同名）。
 */
const DEPT_PAIR = {
  法務: '法務', 客服: '客服', 業務: '業務', 人資: '人資', 財務: '財務',
  行銷: '設計',
  採購: '行政助理',
  生管: '工程',
  品保: '行銷助理',
  資訊: '資料分析助理',
  研發: '產品',
  總務: '知識',
  經營企劃: '營運',
};
const deptIdFor = (deptName) => {
  const v = DEPT_PAIR[deptName];
  return v ? idFor('13部門_' + v) : undefined;
};

/**
 * 預設驗本機建好的 dist。給 BASE 就改驗那個網址，用來確認「部署之後線上真的對」——
 * 本機過了不代表線上過：線上的內容是建置時從後台資料庫抓的，
 * 資料庫沒填的話建出來就是空的，而本機看的是 src/data 的預設值。
 *   BASE=https://... node tools/video-check.mjs
 */
const LIVE = process.env.BASE;
const { server, port } = LIVE ? { server: null, port: 0 } : await serve(DIST);
const ORIGIN = LIVE || `http://127.0.0.1:${port}`;
console.log('驗的目標：' + ORIGIN);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// 開場動畫與身分閘門會蓋在整頁上攔截點擊。?nogate 會讓它們不顯示，
// 但伺服器端產生的那層 HTML 還在，React 接手前照樣吃掉滑鼠事件，
// 所以這裡直接把它們從版面上拿掉。
await page.addInitScript(() => {
  try { localStorage.setItem('tg-intro-seen', '1'); } catch { /* 無痕模式 */ }
});
await page.goto(ORIGIN + '/?nogate', { waitUntil: 'networkidle' });
await page.addStyleTag({
  content: `
    .reveal { opacity: 1 !important; transform: none !important }
    [data-intro-splash], [data-gate] { display: none !important }
    astro-island[opts*="IdentityGate"], astro-island[opts*="IntroSplash"] { display: none !important }
  `,
});
await page.waitForTimeout(900);

console.log('\n── 企業首選・範例影片 ──');

const rows = await page.$$('.tg-echoice-row');
ok('找得到流程列', rows.length >= 6, rows.length);

for (let i = 0; i < Math.min(6, rows.length); i++) {
  // 每次重抓，點過之後 DOM 會重繪
  const row = (await page.$$('.tg-echoice-row'))[i];
  const name = await row.$eval('b', (e) => e.textContent.trim());
  await row.click();
  await page.waitForTimeout(250);

  // 點「範例影片」頁籤（元件刻意等點了才載入 iframe，不然一進首頁就吃流量）
  const tab = await page.$('text=範例影片');
  if (!tab) { ok(`${name}：找得到「範例影片」頁籤`, false); continue; }
  await tab.click();
  await page.waitForTimeout(700);

  const src = await page.$eval('iframe[title="範例影片"]', (e) => e.getAttribute('src') || '').catch(() => '');
  const want = idFor(name);
  if (!want) { ok(`${name}：對照表裡有這支影片`, false, name); continue; }
  ok(`${String(i + 1).padStart(2, '0')} ${name} → ${want}`, src.includes('/embed/' + want), { src: src.slice(0, 90) });
}

// 沒填網址時要顯示「錄影準備中」，而不是一個黑框
{
  const placeholder = await page.$('text=錄影準備中');
  ok('六條都有影片了，沒有一條還在「錄影準備中」', !placeholder || !(await placeholder.isVisible()));
}

console.log('\n── 13 部門・範例影片 ──');

// 展開「13 部門案例」。展開之後右欄從流程案卷換成部門案卷，沒有頁籤，影片就是主角。
await page.click('.tg-echoice-swap');
await page.waitForTimeout(600);

// 流程 6 列在前、部門 13 列在後，用同一個 List 元件畫的
const allRows = await page.$$('.tg-echoice-row');
ok('展開後看得到 13 個部門', allRows.length >= 19, allRows.length);

for (let i = 0; i < 13; i++) {
  const row = (await page.$$('.tg-echoice-row'))[6 + i];
  if (!row) { ok(`第 ${i + 1} 個部門存在`, false); continue; }
  const name = await row.$eval('b', (e) => e.textContent.trim());
  await row.click();
  await page.waitForTimeout(600);

  const want = deptIdFor(name);
  if (!want) { ok(`${name}：對應表裡有這個部門`, false, name); continue; }
  const src = await page.$eval('iframe[title="範例影片"]', (e) => e.getAttribute('src') || '').catch(() => '');
  ok(`${String(i + 1).padStart(2, '0')} ${name} → ${DEPT_PAIR[name]}（${want}）`, src.includes('/embed/' + want), { src: src.slice(0, 90) });
}

// 原本這裡是拖圖框，換成播放器之後那段提示不該還在
{
  const dragHint = await page.$('text=直接把圖拖進上方框');
  ok('拖圖框的提示字已經移除', !dragHint || !(await dragHint.isVisible()));
}

// 兩種模式互斥，同時只能有一個 iframe，不然控制列會操作到錯的那支
{
  const frames = await page.$$('iframe[title="範例影片"]');
  ok('同時只有一個播放器', frames.length === 1, frames.length);
}

await browser.close();
if (server) server.close();

console.log(`\n通過 ${pass}　失敗 ${fail}\n`);
process.exit(fail ? 1 : 0);
