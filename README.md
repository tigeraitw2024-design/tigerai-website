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

## 部署

推到 `main` → Cloudflare 自動重新部署。兩個專案共用這個 repo：

| Cloudflare 專案 | Build command | Build output |
|---|---|---|
| 原型預覽 | 留空 | `design` |
| 正式站 | `cd site && npm install && npm run build` | `site/dist` |

## 全站文案守則

見 `design/專案守則.md`。重點：禁用「——」破折號、寫「A to A」不寫「A2A」、n8n 永遠小寫、
數字與中英文之間留半形空格、短句帶數字不用行銷腔。
