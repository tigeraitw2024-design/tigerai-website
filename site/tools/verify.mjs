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
    // 兩個遮罩：
    //
    // 1. 13 部門模式的圖框。原型是拖圖框、正式站是後台圖片欄位，兩邊都遮掉。
    //    預設是流程模式，所以這個遮罩平常不會生效，留著是為了之後測 13 部門。
    //
    // 2. Tiger GPU Pro 入口帶（#tg-pro）。Robin 另外請 Claude Design 做了一版
    //    新的（TigerGpuPro入口帶.html：背景圖塊牆 ＋ 打字機標題），已經照那份
    //    移植。舊的 首頁.dc.html 還是舊版，所以那一區本來就不會一樣。
    //
    //    遮掉這一區而不是放寬整頁門檻——放寬門檻等於讓首頁其他地方的真錯誤
    //    也躲得過去。等 Claude Design 把新的入口帶併回 首頁.dc.html，
    //    這個遮罩就可以拿掉。
    maskProto: '#dept-media-host, #tg-pro',
    maskBuilt: '[data-cms-image="dept-media"], #tg-pro',
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
    // 三張「新開班次」圖卡的封面，原型是空的拖圖框，兩邊塗成同色。
    //
    // 兩邊要遮到「同一層」。
    //
    // 原型的拖圖框是 <image-slot id="course-cover-01">，外面還包一層 div，
    // 那層 div 有一條 1px 的下邊框。重建站沒有 image-slot，data-cms-image
    // 直接下在那層 div 上。只遮 image-slot 的話，原型那條邊框線露在遮罩外、
    // 重建站的被蓋掉，整條線（1258 個像素）就被算成差異。
    //
    // 用 :has() 讓原型也遮到外面那層 div，兩邊才對得起來。
    maskProto: 'div:has(> #course-cover-01), div:has(> #course-cover-02), div:has(> #course-cover-03)',
    maskBuilt: '[data-cms-image="course-cover"]',
    // Banner 整塊兩邊都藏起來再比。
    //
    // Robin 指定把 Banner 改成「螢幕高度減掉頂欄」（參考知識衛星），
    // 夾在 520–1100px 之間、圖片置中裁切。原型還是固定比例 1983:793，
    // 高度差 248px，下面所有內容跟著位移，整頁 29% 都是紅的。
    //
    // 用遮罩沒用——遮罩不改變高度。兩邊各自藏掉自己的 Banner，剩下的內容
    // 就重新對齊，Banner 以下仍然是嚴格比對。
    //
    // 等 Claude Design 把新的 Banner 規格併回 課程.dc.html，這兩行就可以拿掉。
    hideProto: '[data-screen-label="課程 Banner 輪播"]',
    hideBuilt: '#tg-course-banner',
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

async function shoot(ctx, url, file, { dismissGate = false, mask = null, hide = null, normalizeFont = false } = {}) {
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
  /**
   * 兩邊都先藏起來再比的區塊。
   *
   * 跟遮罩不一樣：遮罩是「塗成同一個顏色」，元素還在，高度也還在。
   * 有些刻意的改動會改變高度（例如 Banner 從固定比例改成滿版螢幕高），
   * 那下面所有東西都跟著位移，整頁就對不上了——遮罩救不了這種。
   *
   * 藏起來（display:none）會讓兩邊各自少掉自己那一塊的高度，剩下的內容
   * 就重新對齊，可以繼續嚴格比對。代價是那一塊完全不驗，所以只在
   * 「這一塊確定是刻意不同」的時候用，而且一定要寫理由。
   */
  if (hide) {
    await page.evaluate((sel) => {
      document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
    }, hide);
    await sleep(300);
  }

  /**
   * 截圖前把滑鼠移到角落。
   *
   * 點「直接進官網」之後游標會停在右上角（那個連結在 top:20 right:32），
   * 而閘門關掉後「預約 30 分鐘諮詢」按鈕剛好長在同一個位置——於是按鈕被
   * 算成 hover，底色從 #ECA42B 變成 #C08423。
   *
   * 兩邊連結的寬度差個幾像素，就決定了誰被滑到、誰沒有，所以首頁的差異
   * 一整天在 0.00% 與 0.07% 之間跳，而且跳在頂欄那一條。
   *
   * (0,0) 是版面的左上角，兩邊都沒有任何可互動的東西（logo 從 64px 才開始），
   * 所以移到那裡之後兩邊的 hover 狀態一定相同。
   */
  await page.mouse.move(0, 0);
  await sleep(250);

  // 一次性動畫此時已經跑完，只凍住永遠不會停的那些
  await freezeLoopingAnimations(page);
  // 再確認畫面真的不動了才拍。見 settle() 的說明。
  await settle(page);
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

/**
 * 等畫面真的定下來。
 *
 * 只等固定秒數不夠：筆電螢幕裡的主控台會在開機後延遲推一則訊息，
 * 推之前和推之後，整塊聊天區的高度差大約 10 像素。等 8 秒在空機上夠，
 * 機器一忙就可能剛好卡在中間，於是同一份程式碼跑兩次會得到兩個不同的答案
 * （首頁在 0.00% 和 0.07% 之間跳）。那不是版面壞了，是尺在抖。
 *
 * 這裡改成問 DOM：每 250 毫秒量一次整頁的文字長度與高度，連續三次都一樣
 * 才算穩定，最多等 8 秒。原型和重建站都跑同一套，所以兩邊一定是在
 * 「都安定下來」的狀態下比較。
 */
async function settle(page, quietRounds = 3, maxMs = 8000) {
  const t0 = Date.now();
  let last = '';
  let same = 0;
  while (Date.now() - t0 < maxMs) {
    const now = await page.evaluate(() => {
      const d = document.documentElement;
      // 還在跑的 CSS 轉場與一次性動畫也要算進來。
      //
      // 只看 DOM 有沒有變不夠：頂欄有一個跟著捲動變形的膠囊，那是 CSS transition，
      // 跑的時候 DOM 一個字都沒變，但畫面每一幀都不一樣。兩邊剛好停在轉場的不同
      // 進度就會差出 0.07%，同一份程式碼跑兩次得到兩個答案。
      //
      // 無限循環的動畫不算（那些等一輩子也不會停，後面會被 freezeLoopingAnimations
      // 凍住），所以把 iterations 是 Infinity 的排除掉。
      let moving = 0;
      try {
        moving = document.getAnimations()
          .filter((a) => a.playState === 'running' && a.effect
            && (a.effect.getComputedTiming().iterations !== Infinity))
          .length;
      } catch {
        // 舊瀏覽器沒有 getAnimations，就退回只看 DOM
      }
      // 連「有沒有東西在動」都要看，不只是 DOM 有沒有變。
      //
      // 頂欄那個跟著捲動變形的膠囊，還有筆電的傾斜角度，都是 JavaScript 每一幀
      // 直接寫 element.style 算出來的。那種東西不是 CSS 動畫，getAnimations()
      // 抓不到，但畫面每一幀都在變。所以這裡把「所有帶 inline transform 的元素
      // 現在的值」也收進指紋裡——值不再變動，才算真的停了。
      let moving2 = '';
      for (const el of document.querySelectorAll('[style*="transform"],[style*="opacity"]')) {
        const st = el.getAttribute('style') || '';
        const t = /transform:[^;]*/.exec(st)?.[0] || '';
        const o = /opacity:[^;]*/.exec(st)?.[0] || '';
        moving2 += t + o;
      }
      return `${document.body.innerText.length}|${d.scrollHeight}|${document.querySelectorAll('*').length}|${moving}|${moving2.length}|${hash(moving2)}`;

      function hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
        return h;
      }
    });
    const stillMoving = now.endsWith('|0') === false;
    if (now === last && !stillMoving) {
      if (++same >= quietRounds) return true;
    } else {
      same = 0;
      last = now;
    }
    await sleep(250);
  }
  return false;
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

  const protoProblems = await shoot(ctx, `http://127.0.0.1:${proto.port}/${encodeURIComponent(p.proto)}`, aFile, { dismissGate: gate, mask: p.maskProto, hide: p.hideProto, normalizeFont: true });

  let builtProblems = [];
  let r = null;
  try {
    builtProblems = await shoot(ctx, `http://127.0.0.1:${built.port}${p.route}`, bFile, { dismissGate: gate, mask: p.maskBuilt, hide: p.hideBuilt });
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
