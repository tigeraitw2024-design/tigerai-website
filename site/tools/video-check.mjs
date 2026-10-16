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

const { server, port } = await serve(DIST);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// 開場動畫與身分閘門會蓋在整頁上攔截點擊。?nogate 會讓它們不顯示，
// 但伺服器端產生的那層 HTML 還在，React 接手前照樣吃掉滑鼠事件，
// 所以這裡直接把它們從版面上拿掉。
await page.addInitScript(() => {
  try { localStorage.setItem('tg-intro-seen', '1'); } catch { /* 無痕模式 */ }
});
await page.goto(`http://127.0.0.1:${port}/?nogate`, { waitUntil: 'networkidle' });
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
const placeholder = await page.$('text=錄影準備中');
ok('六條都有影片了，沒有一條還在「錄影準備中」', !placeholder || !(await placeholder.isVisible()));

await browser.close();
server.close();

console.log(`\n通過 ${pass}　失敗 ${fail}\n`);
process.exit(fail ? 1 : 0);
