// 逐一比對原型和重建站每個 <section> 的 offsetTop 與高度。
//
// 像素比對只告訴你「哪一段有差」，這支告訴你「哪一區高了幾 px」，
// 那才是能直接動手修的資訊。高度差會往下累積，所以要看第一個對不上的區塊。
//
// 用法：node tools/sections.mjs

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DESIGN = path.resolve(SITE, '..', 'design');
const DIST = path.join(SITE, 'dist');

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

const PROBE = `(() => [...document.querySelectorAll('section, footer')].map((el) => {
  const r = el.getBoundingClientRect();
  return {
    id: el.id || '',
    top: Math.round(r.top + window.scrollY),
    h: Math.round(r.height),
    txt: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 22),
  };
}))()`;

const proto = await serve(DESIGN);
const built = await serve(DIST);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });

const grab = async (url) => {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(6000);
  // 關掉身分閘門才量得到底下的區塊
  await p.getByText('直接進官網').first().click({ timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(5000);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  const r = await p.evaluate(PROBE);
  await p.close();
  return r;
};

const A = await grab(`http://127.0.0.1:${proto.port}/${encodeURIComponent('首頁.dc.html')}`);
const B = await grab(`http://127.0.0.1:${built.port}/`);

await browser.close();
proto.s.close();
built.s.close();

console.log(`\n原型 ${A.length} 區　重建 ${B.length} 區\n`);
console.log('  #   原型 top/高       重建 top/高       高度差  區塊');
console.log('  ' + '─'.repeat(72));
const n = Math.max(A.length, B.length);
for (let i = 0; i < n; i++) {
  const a = A[i];
  const b = B[i];
  if (!a || !b) {
    console.log(`  ${String(i).padStart(2)}  ${a ? `${a.top}/${a.h}` : '（沒有）'.padEnd(14)}  ${b ? `${b.top}/${b.h}` : '（沒有）'}  ← 區塊數不同`);
    continue;
  }
  const dh = b.h - a.h;
  const dt = b.top - a.top;
  const mark = dh !== 0 || dt !== 0 ? '←' : ' ';
  console.log(
    `  ${String(i).padStart(2)}  ${String(a.top).padStart(5)}/${String(a.h).padEnd(5)}     ${String(b.top).padStart(5)}/${String(b.h).padEnd(5)}     ${String(dh).padStart(5)}  ${mark} ${b.id || a.id || a.txt}`
  );
}
