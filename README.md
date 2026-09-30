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

## 後台

**上線步驟照 [`後台上線步驟.md`](後台上線步驟.md) 做**，那份是寫給 Robin 的，一步一步。
這一節講的是它為什麼長這樣。

一句話：**後台是一份「欄位定義」，其他東西都是從它長出來的。**

```
site/src/api/modules/courses.ts   ← 只寫這一個檔
        ↓
    自動長出  資料表、列表頁、編輯表單、權限、API、CSV 匯出
```

一個模組檔就是一個功能元件（Robin 要的「每個功能是一個元件」）。
刪掉它，那個功能就整個消失，不會在別處留下殘骸。後台介面**沒有**任何一頁是為
某個功能手寫的：它跟 `/api/admin/schema` 要定義，然後自己畫出來。

目前 16 個模組、23 個集合。細節見 [`site/src/api/ARCHITECTURE.md`](site/src/api/ARCHITECTURE.md)。

### 內容怎麼到前台

前台是靜態的，所以不是「訪客來的時候去查資料庫」，而是：

```
後台編輯 → 存進 D1 → 按「發布」→ 觸發重新建置 → 靜態檔重發
```

建置時 `site/src/content/` 會去 `/api/content` 把內容抓下來烤進 HTML。
**抓不到就用 `src/data/*.ts` 的本地資料**，而且會在建置紀錄大聲說出來。

那條退路很重要：資料庫還沒開、網路不通、在別人的電腦上，站都照樣建得起來，
建出來跟現在一模一樣。也因為這樣，像素驗證不會因為接了後台而失準——
`verify.mjs` 跑的時候沒有 `CONTENT_API`，走的永遠是本地那份。

### 權限

四個角色。重點是**同事看不到客戶個資**：

| 角色 | 能做什麼 |
|---|---|
| `owner` | 全部，包含開帳號與發布 |
| `sales` | 內容唯讀 ＋ 預約、名單、訂單（看得到聯絡方式） |
| `editor` | 只能改內容。預約、名單、會員、訂單在他的側欄根本不會出現 |
| `viewer` | 全部唯讀，個資一律遮罩 |

「看不到」是後端不給，不是前端藏起來。直接打 API 也拿不到——`smoke.mjs` 有測這件事。

### 可抽換的三件事

換供應商只改 `site/src/api/adapters/` 底下一個檔加一個環境變數，呼叫端完全不動。

| | 現在 | 之後 |
|---|---|---|
| 寄信 | `console`（只排進佇列不真的寄） | Resend 或公司信箱中繼 |
| 金流 | `none`（只記單不收款） | 綠界，等 Robin 拿到 API |
| 儲存 | R2（沒綁定時退回記憶體） | 換 S3 就多寫一個實作 |

### 密碼為什麼要在瀏覽器先算一次

Cloudflare Workers 免費方案每次請求只有 10 毫秒 CPU。密碼雜湊之所以安全靠的
就是「算很慢」，業界建議的 60 萬次迭代在 Workers 上要幾十到上百毫秒，直接超過額度，
結果是誰都登不進來。調低迭代次數等於把防護拿掉，升級付費方案又不是我們要的。

所以把慢的那一段搬到瀏覽器：瀏覽器跑 20 萬次 PBKDF2，伺服器再跑 1 萬次。
使用者的 CPU 是免費的，手機上也只要一兩秒；資料庫外洩時攻擊者還是得穿過那 20 萬次。
細節寫在 [`site/src/api/auth.ts`](site/src/api/auth.ts) 開頭。

## 測試

| 指令 | 測什麼 |
|---|---|
| `npm run verify` | 前台八頁跟原型的像素差異。這是驗收標準。 |
| `npm run mobile` | 手機版：橫向溢出、觸控目標、字級 |
| `npm run smoke` | 後台端到端 49 項：安裝、登入、CRUD、權限、前台端點 |
| `node tools/roundtrip.mjs` | 「後台改東西 → 前台真的變了」的完整一圈 |
| `npm run admin-shots` | 後台介面截圖，手機與桌機 |

`smoke` 和 `roundtrip` 要先另開一個終端機跑 `npm run api`。

目前的數字：

```
像素    home 0.00%　products 0.00%　tiger-gpu-pro 0.00%　cases 0.00%
        blog 0.00%　resources 0.00%　consultants 0.05%　courses 0.26%（已知）
手機    八頁橫向溢出 0px
後台    smoke 49/49　roundtrip 13/13
```

courses 那 0.26% 是刻意不複製原型的幾何捨入誤差，verify 會印出理由。

## 全站文案守則

見 `design/專案守則.md`。重點：禁用「——」破折號、寫「A to A」不寫「A2A」、n8n 永遠小寫、
數字與中英文之間留半形空格、短句帶數字不用行銷腔。
