// 「跟 Claude Design 一模一樣」的尺。
//
// 同時把原型（../design）和重建站（./dist）跑起來，逐頁在同一尺寸截圖，
// 做像素比對，印出差異比例並輸出三聯圖（原型 / 重建 / 差異）到 tools/out/。
//
// 兩個重點：
//
// 1) 兩邊都用 reducedMotion: 'reduce' 截。夥伴 logo 牆是 42 秒一圈的無限動畫，
//    不凍結的話每次截到的 logo 都不一樣，比對永遠有差。設計系統本來就寫了
//    @media (prefers-reduced-motion:reduce) 讓動畫跳終態，所以這是照它自己的
//    規則走，不是作弊。全站規則第 6 條也要求 reduce 時所有動畫直接跳終態。
//
// 2) 截圖前先慢慢捲到底再回頂端。很多區塊是捲動才進場（tg-in、數字滾動、
//    節點逐個亮起），不捲過去會截到還沒出現的狀態。
//
// 用法：
//   node tools/verify.mjs                 全部頁面
//   node tools/verify.mjs cases courses   只比這幾頁
//   TG_WIDTH=390 node tools/verify.mjs    改視窗寬度（手機版那一輪會用）

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// playwright-core 而不是 playwright：core 版不會在安裝時下載 130MB 的瀏覽器。
// 我們本來就用 channel:'chrome' 開機器上已裝的 Chrome，用不到它自帶的。
// 這樣 Cloudflare 每次 build 也不會卡在下載瀏覽器。
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DESIGN = path.resolve(SITE, '..', 'design');
const DIST = path.join(SITE, 'dist');
const OUT = path.join(HERE, 'out');

const WIDTH = Number(process.env.TG_WIDTH || 1440);
const HEIGHT = Number(process.env.TG_HEIGHT || 900);
// 沒有寫 expect 的頁面，差異要低於這個值才算過。目標是 0。
const THRESHOLD = Number(process.env.TG_THRESHOLD || 0.05);

/**
 * 原型檔名 ↔ 重建站路由。名字是輸出檔名與命令列參數。
 *
 * maskProto / maskBuilt：兩邊都塗成純色再比的區塊，用來排除「原型專用工具」
 * 造成的假差異。只有一種情況該用：原型那裡是 <image-slot> 拖圖框而且沒放圖，
 * 正式站那裡會是後台的圖片欄位。複製拖拉工具的外觀是白做工，但版面尺寸還是
 * 要對得上，所以遮罩只蓋內容、不影響位置與高度的比對。
 *
 * 遮罩不是用來遮掉「我還沒做完」的地方，那樣尺就失效了。
 *
 * expect：已知且刻意不一致的差異上限，一定要寫理由。沒寫 expect 的頁面用
 * THRESHOLD（目標 0）。這是為了讓尺還有用：知道某頁的地板是 0.26%，
 * 超過就是新的走樣，而不是把門檻整體放寬混過去。
 */
const PAGES = [
  {
    name: 'home',
    proto: '首頁.dc.html',
    route: '/',
    // 13 部門模式的圖框，原型是拖圖框、正式站是後台圖片欄位，兩邊都遮掉。
    // 預設是流程模式，所以這個遮罩平常不會生效，留著是為了之後測 13 部門。
    maskProto: '#dept-media-host',
    maskBuilt: '[data-cms-image="dept-media"]',
  },
  {
    name: 'products',
    proto: '產品.dc.html',
    route: '/products',
    // P0 的 3D 拆解 Demo 還沒做（Robin 指示先跳過）。原型那裡是 three.js 畫布，
    // 正式站現在是佔位框。整段的高度、標題、兩段文案、底部提示都照原型做了，
    // 所以遮掉畫布之後，這頁其餘部分照樣能嚴格比對。
    // 3D 補上之後要把這兩行遮罩拿掉，重新量。
    maskProto: '#tg-ex-canvas',
    maskBuilt: '[data-todo-3d]',
  },
  { name: 'tiger-gpu-pro', proto: 'Tiger GPU Pro.dc.html', route: '/products/tiger-gpu-pro' },
  {
    name: 'courses',
    proto: '課程.dc.html',
    route: '/courses',
    // 三張「新開班次」圖卡的封面，原型是空的拖圖框
    maskProto: '#course-cover-01, #course-cover-02, #course-cover-03',
    maskBuilt: '[data-cms-image="course-cover"]',
    expect: 0.3,
    why:
      '滿版 Banner。原型的 image-slot 把圖算成 1440.359×575.844（橫向 0.726353、' +
      '縱向 0.726159，兩軸不同比例），也就是被拉寬 0.36px，那是它自己幾何計算的' +
      '四捨五入誤差。我的圖是 1440×575.844 正好貼合外框，比原型更正確，' +
      '所以刻意不複製那個誤差。差異全部落在 Banner 照片的高對比邊緣。',
  },
  {
    name: 'consultants',
    proto: '顧問與方法論.dc.html',
    route: '/consultants',
    // 陪跑四張照片。原型用 image-slot 裝，它會畫一圈虛線的拖曳提示框，
    // 而且用自己的幾何算裁切；正式站是後台的圖片欄位加 object-fit:cover。
    // 外面那層白框和陰影照樣比對，只遮掉裡面的圖。
    maskProto: '#coach-photo-01, #coach-photo-02, #coach-photo-03, #coach-photo-04',
    maskBuilt: '[data-stack-img] > span',
  },
  { name: 'cases', proto: '案例.dc.html', route: '/cases' },
  { name: 'blog', proto: '部落格.dc.html', route: '/blog' },
  { name: 'resources', proto: '免費資源.dc.html', route: '/resources' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf', '.md': 'text/plain; charset=utf-8',
};

/** 夠用的靜態伺服器：支援中文檔名、目錄自動補 index.html。 */
function serve(root) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let rel;
      try {
        rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      } catch {
        res.writeHead(400).end();
        return;
      }
      let file = path.join(root, rel);
      if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!existsSync(file)) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + rel);
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 只對原型那一邊做：把自架的思源黑體換成 Google Fonts 的 Noto Sans TC。
 *
 * 為什麼要動原型：正式站已經決定不自架思源黑體（量過一頁要下載 54 MB）。
 * 兩者是同一套字的兩個發行名，放大 3 倍並排看字形完全相同，只差次像素的
 * 抗鋸齒位置，但那足以讓每頁憑空多出 0.5% 的差異，把尺弄鈍到抓不出真正的
 * 移植錯誤。
 *
 * 所以在這裡把已知且已經單獨驗證過的變因消掉，讓比對專心量一件事：
 * 我的版面有沒有移植錯。字型本身的差異不靠這把尺看，靠 font-compare.png
 * 那張放大並排圖判斷。
 */
async function useSameFontAsSite(page) {
  await page.evaluate(() => {
    // 拿掉自架思源黑體的 @font-face
    document.querySelectorAll('link[href*="source-han-sans-tc"]').forEach((l) => l.remove());
    // 載 Google Fonts 的 Noto Sans TC，字重跟正式站一致
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;900&display=swap';
    document.head.appendChild(l);
    // 原型把字型寫死在 inline style 裡，選擇器蓋不掉，只能逐一改寫
    const swap = (s) => s.replaceAll('Source Han Sans TC', 'Noto Sans TC');
    document.querySelectorAll('[style*="Source Han Sans TC"]').forEach((el) => {
      el.setAttribute('style', swap(el.getAttribute('style')));
    });
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // 跨來源的樣式表讀不到，跳過
      for (const r of rules) {
        if (r.style && r.style.fontFamily && r.style.fontFamily.includes('Source Han Sans TC')) {
          r.style.fontFamily = swap(r.style.fontFamily);
        }
        if (r.style && r.style.getPropertyValue('--font-sans').includes('Source Han Sans TC')) {
          r.style.setProperty('--font-sans', swap(r.style.getPropertyValue('--font-sans')));
          r.style.setProperty('--font-display', swap(r.style.getPropertyValue('--font-display')));
        }
      }
    }
  });
  await page.evaluate(() => document.fonts.ready);
  await sleep(1200);
}

/** 一段一段往下捲讓進場動畫跑完，再回頂端。 */
async function sweep(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  for (let y = 0; y < h; y += Math.floor(vh * 0.6)) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(160);
  }
  await page.evaluate((v) => window.scrollTo(0, v), h);
  await sleep(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
}

/**
 * 只對原型那一邊做：把原型執行環境自己弄壞的東西修回來。
 *
 * 原型的 componentDidMount 裡有這一行，掛載 300ms 後跑：
 *
 *   document.querySelectorAll('section,footer')
 *     .forEach(el => { el.style.position = ''; el.style.top = ''; });
 *
 * 它本意應該是清掉 support.js 為了自己的區塊標籤功能加上的 sticky 定位，
 * 但寫得太寬，把作者寫在 HTML 裡的 position:relative 也一起清掉了。
 *
 * 後果：首頁三個區塊（Hero、Tiger GPU Pro 入口帶、顧問與方法論）的虎金光暈
 * 失去定位父層，定位改以視窗為準，被推到頁面頂端之外，原型上完全看不到。
 * 量出來的證據是顧問區光暈的父層高度：原型 900（視窗高），正式站 463（區塊高）。
 *
 * 那是原型執行環境的 bug，不是設計決定，正式站沒有那支清理程式也不該複製它。
 * 所以在這裡把 position:relative 補回去，讓比對量的是我有沒有移植錯，
 * 不是原型有沒有壞。
 */
async function undoPrototypeBugs(page) {
  await page.evaluate(() => {
    document.querySelectorAll('section, footer').forEach((el) => {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    });
  });
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * 兩邊都要做：只凍住「無限循環」的 CSS 動畫。
 *
 * 一度改成一律 animation:none，那是錯的：開場 logo 動畫、身分閘門淡出、
 * 筆電掀蓋、開機畫面淡出全都是一次性動畫，本來會自己跑完、停在正確的終態，
 * 一律關掉反而讓它們永遠停在起始狀態，整個第一屏被覆蓋層蓋住，
 * 比出來的 0.000% 其實是在比兩張開場畫面，完全沒驗到底下的東西。
 *
 * 正確的作法是：等一次性動畫跑完（呼叫前先等夠久），然後只把
 * animation-iteration-count 是 infinite 的那些關掉，因為它們永遠不會停，
 * 兩邊的落點一定不同（顧問輪播 44 秒一圈、夥伴牆 42 秒、虎金光暈 14 秒來回、
 * A to A 訊息 12 秒一輪、n8n 連線虛線持續流動）。
 */
async function freezeLoopingAnimations(page) {
  const frozen = await page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.animationName !== 'none' && cs.animationIterationCount.split(',').some((v) => v.trim() === 'infinite')) {
        el.style.animation = 'none';
        n++;
      }
    }
    return n;
  });
  await new Promise((r) => setTimeout(r, 300));
  return frozen;
}

async function shoot(ctx, url, file, { dismissGate = false, mask = null, normalizeFont = false } = {}) {
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`js 錯誤：${e.message.split('\n')[0]}`));
  page.on('requestfailed', (r) => problems.push(`抓不到：${r.url().slice(0, 120)}`));
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 50, { timeout: 30000 }).catch(() => sleep(3000));
  if (normalizeFont) await useSameFontAsSite(page);
  if (dismissGate) {
    // 首頁：關掉身分閘門，然後等這一串一次性動畫全部跑完才截圖
    //   閘門淡出 .6s → 筆電掀蓋 1.2s → 開機畫面 .4s 延遲 + 2.1s 淡出
    //   → 馬賽克掃場 .56s 延遲 + 1s（reduced-motion 下直接跳終態）
    // 加上主控台掛載的時間，抓 8 秒很寬鬆。
    await page.getByText('直接進官網').first().click({ timeout: 15000 }).catch(() => {});
    await sleep(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(8000);
  }
  // 原型清 position 那一行是掛載後 300ms 跑的，所以要在捲動前、等它跑完才補回來
  if (normalizeFont) await undoPrototypeBugs(page);
  // 一次性動畫此時已經跑完，只凍住永遠不會停的那些
  await freezeLoopingAnimations(page);
  await sweep(page);
  await page.screenshot({
    path: file,
    fullPage: true,
    // 兩邊用同一個遮罩色，所以被遮的區塊一定相等，其餘照舊嚴格比對
    ...(mask ? { mask: [page.locator(mask)], maskColor: '#FF00FF' } : {}),
  });
  await page.close();
  return problems;
}

async function compare(aFile, bFile, diffFile) {
  const a = PNG.sync.read(await readFile(aFile));
  const b = PNG.sync.read(await readFile(bFile));
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const diff = new PNG({ width: w, height: h });
  // 兩邊尺寸不同的話先裁到共同區域再比，另外把尺寸差報出來。
  const crop = (img) => {
    if (img.width === w && img.height === h) return img.data;
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(img, out, 0, 0, w, h, 0, 0);
    return out.data;
  };
  const changed = pixelmatch(crop(a), crop(b), diff.data, w, h, { threshold: 0.1, includeAA: true });
  await writeFile(diffFile, PNG.sync.write(diff));
  return {
    pct: (changed / (w * h)) * 100,
    changed,
    sizeA: `${a.width}×${a.height}`,
    sizeB: `${b.width}×${b.height}`,
    sizeMatch: a.width === b.width && a.height === b.height,
  };
}

// ── 跑 ────────────────────────────────────────────────
const want = process.argv.slice(2);
const targets = want.length ? PAGES.filter((p) => want.includes(p.name)) : PAGES;
if (!targets.length) {
  console.error(`沒有這些頁：${want.join(', ')}\n可用：${PAGES.map((p) => p.name).join(', ')}`);
  process.exit(1);
}
if (!existsSync(DIST)) {
  console.error('找不到 dist/，先跑 npm run build');
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const proto = await serve(DESIGN);
const built = await serve(DIST);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  locale: 'zh-TW',
  timezoneId: 'Asia/Taipei',
  reducedMotion: 'reduce', // 見檔頭第 1 點
});

// setInterval 跑的輪播（課程頁 Banner、Tiger GPU Pro 換詞、首頁身分閘門）
// 不是 CSS 動畫，凍不到，兩邊載入差零點幾秒就停在不同項目。變成空的讓它們
// 停在初始項目。setTimeout 留著，原型有一次性初始化靠它（夥伴 logo 預先載入），
// 而且 reducedMotion 下馬賽克掃場會直接跳終態、不需要 setInterval。
await ctx.addInitScript(() => {
  window.setInterval = () => 0;
});

const rows = [];
for (const p of targets) {
  const aFile = path.join(OUT, `${p.name}.proto.png`);
  const bFile = path.join(OUT, `${p.name}.built.png`);
  const dFile = path.join(OUT, `${p.name}.diff.png`);
  const gate = p.name === 'home';

  const protoProblems = await shoot(ctx, `http://127.0.0.1:${proto.port}/${encodeURIComponent(p.proto)}`, aFile, { dismissGate: gate, mask: p.maskProto, normalizeFont: true });

  let builtProblems = [];
  let r = null;
  try {
    builtProblems = await shoot(ctx, `http://127.0.0.1:${built.port}${p.route}`, bFile, { dismissGate: gate, mask: p.maskBuilt });
    r = await compare(aFile, bFile, dFile);
  } catch (e) {
    rows.push({ name: p.name, err: e.message.split('\n')[0] });
    continue;
  }
  rows.push({ name: p.name, ...r, protoProblems, builtProblems, expect: p.expect, why: p.why });
}

await browser.close();
proto.server.close();
built.server.close();

console.log(`\n視窗 ${WIDTH}×${HEIGHT}，動畫凍結。沒標「已知」的頁面要低於 ${THRESHOLD}%\n`);
console.log('    頁面            差異    上限    尺寸（原型 → 重建）');
console.log('─'.repeat(70));
let failed = 0;
const notes = [];
for (const r of rows) {
  if (r.err) {
    console.log(`✗   ${r.name.padEnd(15)} 做不出來  ${r.err}`);
    failed++;
    continue;
  }
  const limit = r.expect ?? THRESHOLD;
  const ok = r.pct <= limit;
  if (!ok) failed++;
  const size = r.sizeMatch
    ? r.sizeA
    : `${r.sizeA} → ${r.sizeB}  高度差 ${Math.abs(parseInt(r.sizeA.split('×')[1]) - parseInt(r.sizeB.split('×')[1]))}px`;
  const tag = r.expect ? '已知' : '    ';
  console.log(`${ok ? '✓' : '✗'} ${tag} ${r.name.padEnd(15)} ${r.pct.toFixed(2).padStart(5)}%  ${String(limit).padStart(5)}%  ${size}`);
  for (const s of new Set([...(r.builtProblems || [])])) console.log(`      重建站：${s}`);
  if (r.why) notes.push([r.name, r.why]);
}
for (const [name, why] of notes) {
  console.log(`\n「${name}」的差異是刻意的：\n  ${why.replace(/(.{60})/g, '$1\n  ')}`);
}
console.log(`\n三聯圖在 tools/out/（*.proto.png / *.built.png / *.diff.png）`);
process.exit(failed ? 1 : 0);
