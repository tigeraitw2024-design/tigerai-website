import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { execSync } from 'node:child_process';

// 建置版本號：git 短 SHA ＋ 建置時間（台北）。注入前端讓主帳號一眼確認線上是哪一版。
let sha = '';
try { sha = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* 沒 git 就算了 */ }
const BUILD_ID = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ') + (sha ? ' · ' + sha : '');

// 前台全部靜態產生（不吃 Cloudflare Workers 的運算額度）。
// 每頁是一個 React 元件（原型 .dc.html 的 class 直接移植過來），
// 用 client:load 掛上互動，但 HTML 在 build 時就先畫好，所以 Google 讀得到內容。
export default defineConfig({
  // sitemap 與 robots.txt 要用絕對網址。正式網域還沒定案（Robin 手上有 tigerai.info，
  // 公司另外有一個），所以先吃環境變數，沒設就用這個預設值。
  // 接好自訂網域之後，在 Cloudflare 的建置變數設 SITE_URL 就會自動換掉。
  site: process.env.SITE_URL || 'https://tigerai.com.tw',
  output: 'static',
  integrations: [react()],
  build: { format: 'directory', inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
  vite: { define: { __BUILD_ID__: JSON.stringify(BUILD_ID) } },
});
