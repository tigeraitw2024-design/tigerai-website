# TigerAI 虎智科技官網

Claude Design 做的原型重建成可上線的站。驗收標準：**跟原型長得一模一樣**。

## 資料夾

| 資料夾 | 是什麼 | 能不能改 |
|---|---|---|
| `design/` | Claude Design 交付的 8 頁原型、設計系統、主控台 JSX、素材 | **唯一真相，不改。** 只加了一支 `index.html` 當部署入口 |
| `design/交付說明.md` | Claude Design 的交付文件：全站規則、token、逐區規格、已知待補 | 開工前必讀 |
| `baseline/` | 原型逐頁截的基準圖，重建後拿來比對 | 重跑 `site/tools/shots.mjs` 產生 |
| `site/` | 正式站的程式 | 這裡才是開發的地方 |
| `講師顧問資料/` | 10 位講師的原始照片（`design/assets/consultants/` 的來源） | 素材 |

## 架構

前台全部靜態產生，不經過 Cloudflare Workers 的運算，所以不吃免費方案每次請求 10 毫秒的額度。
只有後台讀寫資料時才會碰到 Worker，而那是很薄的一層（一次請求做一次資料庫查詢）。

```
訪客 → 靜態 HTML（Cloudflare 直接發）        ← 不算運算時間
你  → /admin 後台（也是靜態檔案）
        └→ /api/*（薄 Worker）→ D1 資料庫 / R2 圖片
```

| 層 | 用什麼 | 為什麼 |
|---|---|---|
| 前台 | Astro + React islands，`output: 'static'` | build 時就把 HTML 畫好（Google 讀得到），互動部分才掛 JS |
| 後台畫面 | React SPA，靜態檔案 | 不吃運算額度 |
| 後台引擎 | 讀設定檔自動生出列表與表單 | 加一個欄位只改設定檔，不動後台程式 |
| 資料 | Cloudflare D1 | 免費額度夠；未來可換成公司的 Postgres |
| 圖片 | Cloudflare R2 | 免費 10 GB |
| 寄信 | 沿用現有的 Google Apps Script + Gmail | 免費，而且已經在運作 |

## 開發

```bash
cd site
npm install
npm run dev      # 會先把 design/ 的素材同步到 public/，再起本機站
```

`npm run sync` 會把 `design/` 的設計系統和圖片複製到 `site/public/`。
那幾層是產物，不進版控（見 `site/.gitignore`），所以 clone 下來第一件事是 `npm run dev` 或 `npm run sync`。

## 字型：正式站不自架思源黑體（已完成）

原型每頁的 inline style 把 `--font-sans` 覆寫成 `'Inter','Source Han Sans TC'`，
中文走 `design/assets/fonts/` 那四個 OTF。量過部署後的實際載入：

```
字型   54.12 MB（解壓後 64.83 MB，四個字重全下載）
圖片    2.94 MB
合計   57.26 MB   ← 一頁
```

所以改用 Google Fonts 的 **Noto Sans TC**。這不是換字型：思源黑體（Adobe 發行名
Source Han Sans）和 Noto Sans CJK（Google 發行名）是同一套字，Google Fonts 會切成
上百個小 woff2 依 unicode-range 按需載入。字重取 400／500／600／700／900。

驗證方式是放大 3 倍並排看（`site/tools/out/font-compare.png`）：字形、筆畫、比例、
字重完全相同，只差次像素的抗鋸齒位置。

`verify.mjs` 因此會在**原型那一邊**也換成 Noto Sans TC 再比對。否則每頁會憑空多出
0.5% 的字型底噪，尺就鈍到抓不出真正的移植錯誤。字型本身的差異不靠那把尺看，
靠並排放大圖判斷。

真有一天要退回自架，作法是把 OTF 用 fonttools 子集化成 woff2（繁中常用字約 13,500
字，每字重會降到 3 MB 左右）。

## 部署

Cloudflare **Workers**（不是 Pages），專案 `tigerai-website`，連這個 repo。
推到 `main` 就自動重新建置部署。

| 設定 | 值 |
|---|---|
| Root directory | `site` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Branch control | `main` |

Root directory 一定要填 `site`，不然 wrangler 在 repo 根目錄找不到 `wrangler.jsonc`
也找不到 `dist/`，建置會顯示成功但其實什麼都沒發。

用 Workers 而不是 Pages 的好處：靜態檔案一樣不吃運算額度，而且之後要加後台 API、
D1 資料庫、R2 圖片儲存，直接在 `site/wrangler.jsonc` 打開註解就行，不用搬家。

## 全站文案守則

見 `design/專案守則.md`。重點：禁用「——」破折號、寫「A to A」不寫「A2A」、n8n 永遠小寫、
數字與中英文之間留半形空格、短句帶數字不用行銷腔。
