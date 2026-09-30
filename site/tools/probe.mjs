// 在原型和重建站上跑同一段 JS，並排印出結果。
//
// 像素比對說「這裡有差」，這支回答「差在哪個屬性」。不要靠看圖猜。
//
// 用法：
//   node tools/probe.mjs home "document.querySelectorAll('section').length"
//   node tools/probe.mjs home --file tools/snippets/glow.js
//
// 第一個參數是頁面名稱（對應 verify.mjs 的 PAGES）。首頁會自動關掉身分閘門。

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DESIGN = path.resolve(SITE, '..', 'design');
const DIST = path.join(SITE, 'dist');

const ROUTES = {
  home: ['首頁.dc.html', '/'],
  products: ['產品.dc.html', '/products'],
  'tiger-gpu-pro': ['Tiger GPU Pro.dc.html', '/products/tiger-gpu-pro'],
  courses: ['課程.dc.html', '/courses'],
  consultants: ['顧問與方法論.dc.html', '/consultants'],
  cases: ['案例.dc.html', '/cases'],
  blog: ['部落格.dc.html', '/blog'],
  resources: ['免費資源.dc.html', '/resources'],
};

const MIME = {
  '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.mjs': 'text/javascript;charset=utf-8',
  '.jsx': 'text/javascript;charset=utf-8', '.json': 'application/json;charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf',
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

const name = process.argv[2];
if (!ROUTES[name]) {
  console.error(`用法：node tools/probe.mjs <${Object.keys(ROUTES).join('|')}> "<js>"`);
  process.exit(1);
}
const expr =
  process.argv[3] === '--file'
    ? readFileSync(path.resolve(SITE, process.argv[4]), 'utf8')
    : process.argv.slice(3).join(' ');

const [protoFile, route] = ROUTES[name];
const proto = await serve(DESIGN);
const built = await serve(DIST);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
// 跟 verify 一樣凍住動畫與輪播，才比得出同一個狀態
await ctx.addInitScript(() => {
  window.setInterval = () => 0;
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation:none!important}';
    document.head.appendChild(s);
  });
});

const run = async (url, label) => {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(5000);
  if (name === 'home') {
    await p.getByText('直接進官網').first().click({ timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(4000);
  }
  let out;
  try {
    // async 包起來，這樣片段裡可以用 await（例如先觸發 hover 再等它出現）
    out = await p.evaluate(`(async () => { ${expr.includes('return') ? expr : `return ${expr}`} })()`);
  } catch (e) {
    out = `錯誤：${e.message.split('\n')[0]}`;
  }
  console.log(`\n── ${label} ──`);
  console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
  await p.close();
};

await run(`http://127.0.0.1:${proto.port}/${encodeURIComponent(protoFile)}`, '原型');
await run(`http://127.0.0.1:${built.port}${route}`, '重建站');

await browser.close();
proto.s.close();
built.s.close();
