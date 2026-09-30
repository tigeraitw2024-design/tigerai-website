// 手機版體檢。原型完全沒有尺寸斷點，所以手機版沒有「跟原型比對」這回事，
// 只能自己定標準、自己量。這支檢查的是「會不會壞」，不是「像不像」：
//
//   1. 橫向溢出：有沒有東西寬過視窗，害整頁可以左右拉（手機上最明顯的破版）
//   2. 溢出的元凶：列出超出右緣最多的前幾個元素，直接告訴你要改哪裡
//   3. 觸控目標：可點的東西有沒有小於 44×44（Apple 與 Google 的無障礙建議值）
//   4. 過小的字：小於 12px 在手機上幾乎讀不了
//
// 同時每頁截一張全頁圖到 tools/out/mobile/，給人眼看排版。
//
// 用法：node tools/mobile.mjs            全部頁面，390px（iPhone 直式）
//       node tools/mobile.mjs 768        改寬度（平板）
//       node tools/mobile.mjs 390 home   只看某幾頁

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DIST = path.join(SITE, 'dist');
const OUT = path.join(HERE, 'out', 'mobile');

const PAGES = [
  ['home', '/'],
  ['products', '/products'],
  ['tiger-gpu-pro', '/products/tiger-gpu-pro'],
  ['courses', '/courses'],
  ['consultants', '/consultants'],
  ['cases', '/cases'],
  ['blog', '/blog'],
  ['resources', '/resources'],
];

const MIME = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.mjs': 'text/javascript;charset=utf-8',
  '.json': 'application/json;charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.otf': 'font/otf',
};

const serve = (root) =>
  new Promise((res) => {
    const s = createServer((q, rs) => {
      let f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname));
      if (existsSync(f) && statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!existsSync(f)) return rs.writeHead(404).end();
      rs.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      createReadStream(f).pipe(rs);
    });
    s.listen(0, '127.0.0.1', () => res({ s, port: s.address().port }));
  });

const WIDTH = Number(process.argv[2]) || 390;
const only = process.argv.slice(3);
const targets = only.length ? PAGES.filter(([n]) => only.includes(n)) : PAGES;

const AUDIT = `(() => {
  const W = document.documentElement.clientWidth;
  const out = { scrollWidth: document.documentElement.scrollWidth, wide: [], small: [], tiny: [] };
  const seen = new Set();
  // 往上找最近一個有 id 或 data-m 的祖先，當作「這東西在哪一區」的標籤。
  // 主控台整段是螢幕裡的模擬畫面，標準跟頁面本文不一樣，要分開看。
  const zone = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.dataset && p.dataset.m) return '[' + p.dataset.m + ']';
      if (p.id) return '#' + p.id;
    }
    return '(root)';
  };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;

    // 溢出：只算「自己」溢出，父層有 overflow 裁切的就不算
    if (r.right > W + 1) {
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'hidden' || o === 'auto' || o === 'scroll') { clipped = true; break; }
      }
      if (!clipped) {
        const key = el.tagName + (el.id || '') + Math.round(r.right);
        if (!seen.has(key)) {
          seen.add(key);
          out.wide.push({
            tag: el.tagName.toLowerCase(), id: el.id || '',
            right: Math.round(r.right), w: Math.round(r.width),
            txt: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 26),
          });
        }
      }
    }

    // 觸控目標太小。
    // cursor:pointer 會繼承，所以一張可點的卡片底下每個 span 都會報一次，
    // 數字會灌水好幾倍。只算「自己是連結或按鈕」，或是「自己讓游標變成手指、
    // 但父層沒有」的元素——也就是真正新增一個可點區域的那一個。
    const parentPointer = el.parentElement ? getComputedStyle(el.parentElement).cursor === 'pointer' : false;
    const isControl = el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT';
    const clickable = isControl || (cs.cursor === 'pointer' && !parentPointer);
    // 連結或按鈕裡面再包一層連結或按鈕的情況不重複算
    const nestedInControl = !isControl && el.closest('a,button') !== null;
    if (nestedInControl) { /* 跳過 */ } else
    if (clickable && (r.width < 44 || r.height < 44) && r.width > 4 && r.height > 4) {
      out.small.push({ zone: zone(el), tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), txt: (el.textContent || '').trim().slice(0, 16) });
    }

    // 字太小
    const fs = parseFloat(cs.fontSize);
    if (fs && fs < 12 && (el.textContent || '').trim().length > 2 && el.children.length === 0) {
      out.tiny.push({ zone: zone(el), size: fs, txt: (el.textContent || '').trim().slice(0, 20) });
    }
  }
  out.wide.sort((a, b) => b.right - a.right);
  return out;
})()`;

await mkdir(OUT, { recursive: true });
const srv = await serve(DIST);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-TW',
});

console.log(`\n視窗寬 ${WIDTH}px\n`);
// 只拿來拍太高的頁面，理由見下面的說明
const ctx1x = await browser.newContext({
  viewport: { width: WIDTH, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-TW',
});

let broken = 0;
for (const [name, route] of targets) {
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${srv.port}${route}`, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(3000);
  if (name === 'home') {
    await p.getByText('直接進官網').first().click({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(3000);
  }
  // 捲一遍讓進場動畫跑完
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) {
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(120);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(600);

  const a = await p.evaluate(AUDIT);
  const overflow = a.scrollWidth - WIDTH;
  const bad = overflow > 1;
  if (bad) broken++;
  console.log(`${bad ? '✗' : '✓'} ${name.padEnd(15)} 橫向溢出 ${String(overflow).padStart(5)}px   觸控過小 ${String(a.small.length).padStart(3)}   字過小 ${String(a.tiny.length).padStart(3)}`);
  const group = (list) => {
    const m = new Map();
    for (const x of list) m.set(x.zone, (m.get(x.zone) || 0) + 1);
    return [...m].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}×${v}`).join('  ');
  };
  if (a.small.length) console.log(`      觸控過小分佈：${group(a.small)}`);
  if (a.tiny.length) console.log(`      字過小分佈：  ${group(a.tiny)}`);
  for (const w of a.wide.slice(0, 3)) {
    console.log(`      溢出 <${w.tag}${w.id ? '#' + w.id : ''}> 寬 ${w.w} 右緣 ${w.right}　${w.txt}`);
  }
  // 整頁截圖。Chrome 的貼圖上限是 16384 像素，超過就會改走「捲一段拍一段再拼起來」，
  // 而這站到處都是跟著捲動跑的動畫，拼接時會被重新觸發，拼出來的圖會看到同一段內容
  // 出現兩次 — 那是截圖的假象，不是版面壞掉。所以太高的頁面改用 1 倍點陣拍。
  const shooter = h * 2 > 16000 ? await ctx1x.newPage() : p;
  if (shooter !== p) {
    await shooter.goto(`http://127.0.0.1:${srv.port}${route}`, { waitUntil: 'load', timeout: 60000 });
    await shooter.waitForTimeout(3000);
    if (name === 'home') {
      await shooter.getByText('直接進官網').first().click({ timeout: 8000 }).catch(() => {});
      await shooter.waitForTimeout(3000);
    }
    for (let y = 0; y < h; y += 600) {
      await shooter.evaluate((v) => window.scrollTo(0, v), y);
      await shooter.waitForTimeout(120);
    }
    await shooter.evaluate(() => window.scrollTo(0, 0));
    await shooter.waitForTimeout(600);
  }
  await shooter.screenshot({ path: path.join(OUT, `${name}-${WIDTH}.png`), fullPage: true });
  if (shooter !== p) await shooter.close();
  await p.close();
}

await ctx1x.close();
await browser.close();
srv.s.close();
console.log(`\n${broken ? broken + ' 頁有橫向破版' : '沒有橫向破版'}　截圖在 tools/out/mobile/`);
