// 後台介面截圖。手機與桌機各拍一輪，用來肉眼確認排版。
//
// 用法：先開 npx wrangler dev --port 8802 --local
//       node tools/admin-shots.mjs [port]
//
// 會實際登入（用 smoke.mjs 建立的那個帳號），所以要先跑過 smoke.mjs。

import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out', 'admin');
const PORT = process.argv[2] || 8802;
const BASE = `http://127.0.0.1:${PORT}`;

const EMAIL = 'owner@tigerai.test';
const PASS = 'a-very-long-test-password';

const PAGES = [
  ['dashboard', '#/'],
  ['help', '#/help'],
  ['courses-list', '#/courses'],
  ['consultants-list', '#/consultants'],
  ['bookings-list', '#/bookings'],
  ['home-singleton', '#/home'],
  ['consultant-edit', '#/consultants'],   // 進去後點第一筆
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

for (const [tag, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: tag === 'mobile',
    hasTouch: tag === 'mobile',
    locale: 'zh-TW',
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 160));
  });
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e.message).slice(0, 160)));

  // 登入
  await p.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const needLogin = await p.locator('.a-login').count();
  if (needLogin) {
    await p.fill('input[type=email]', EMAIL);
    await p.fill('input[type=password]', PASS);
    await p.click('button.a-btn--brand');
    // 瀏覽器要跑 20 萬次 PBKDF2，慢的機器要好幾秒
    await p.waitForSelector('.a-shell', { timeout: 30000 });
  }
  await p.waitForTimeout(600);

  for (const [name, hash] of PAGES) {
    await p.goto(`${BASE}/admin${hash}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    if (name === 'consultant-edit') {
      // 手機是卡片、桌機是表格（另一邊會被 CSS 藏起來），所以挑看得見的那個
      const target = p.locator('.a-card, .a-table tbody tr').filter({ visible: true }).first();
      if (await target.count()) {
        await target.click();
        await p.waitForTimeout(900);
      }
    }
    await p.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: true });
  }

  // 手機版再拍一張把側欄打開的
  if (tag === 'mobile') {
    await p.goto(`${BASE}/admin#/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(700);
    await p.click('.a-burger');
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(OUT, 'mobile-drawer.png') });
  }

  // 橫向溢出檢查
  const over = await p.evaluate((w) => document.documentElement.scrollWidth - w, width);
  console.log(`${tag.padEnd(8)} ${width}px　橫向溢出 ${over}px　主控台錯誤 ${errs.length}`);
  for (const e of [...new Set(errs)].slice(0, 6)) console.log('    ! ' + e);

  await ctx.close();
}

await browser.close();
console.log(`\n截圖在 tools/out/admin/`);
