import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// 前台全部靜態產生（不吃 Cloudflare Workers 的運算額度）。
// 每頁是一個 React 元件（原型 .dc.html 的 class 直接移植過來），
// 用 client:load 掛上互動，但 HTML 在 build 時就先畫好，所以 Google 讀得到內容。
export default defineConfig({
  output: 'static',
  integrations: [react()],
  build: { format: 'directory', inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
});
