# TigerAI 虎智科技 — Design System

單一真相來源：`styles.css`（token + 組件 CSS 的 @import 清單）。
本 readme 是人類可讀的設計指南與檔案索引，給設計師、工程師與 AI 工具共用。
所有數值禁止硬編碼，一律引用 token。

---

## 1. 公司與產品脈絡

虎智科技（TigerAI）經校內創業比賽第一名，由**臺科大傑出校友聯誼會攜手創新育成中心投資成立**的創業團隊。
三大優勢：博碩士專業團隊、結盟傑出校友資源、臺科大教授顧問研發資源。

一句話定位（全站文案憲法）：**開源地端 AI × 可驗證的能力養成 —— 你的資料不出機房，每個部門多一位 AI 同事。**

### 產品線
| 產品線 | 說明 | 主控台對應站 |
|---|---|---|
| Local GPT | 地端 AI 硬體導入，資料不出企業 | 站 1 對話（13 部門 AI 同事） |
| Advanced RAG | 文件變成問得到答案的知識庫 | 站 2 知識庫 |
| n8n 自動化 | 看得見、改得動、過得了稽核的 SOP | 站 3 Workflow |
| Ollama 模型管理 | 開源模型隨裝隨換，不被供應商綁定 | 站 4 模型 |
| LiteLLM 治理 | 部門額度、即時花費、超標熔斷 | 站 5 治理 |
| GPU 服務器資源管理／管理中心 | 叢集排程、用量監控、成本控管 | 站 6 儀表板 |
| AI 服務啟動（顧問） | 從評估、POC 到正式上線的陪跑 | — |
| 虎智學習中心／AX Academy | L1–L5 課程與成熟度測評 | — |

### 兩把尺
- **L1–L5**：客戶的 AI 成熟度（全站脊椎：測評 → 課程 → 產品對應），公開可測。
- **C1–C5**：顧問的思考能力（方法論權威），**不做公開測驗**。搭配九維與 L.A.O.S. 拆題框架。

### 三大差異化
① 開源＋地端＋資料主權　② 官方認證權威（n8n Taiwan Ambassador、AMD、臺科大）　③ 公開可驗證的方法論（L1–L5、C1–C5）

---

## 2. 我拿到的來源（讀者可能沒有存取權，一併記錄）

| 來源 | 內容 | 在本系統的用途 |
|---|---|---|
| `uploads/TigerAI Design System (standalone).html` | 打包過的 Living Style Guide（內含 tokens.css、components.css、styleguide 頁面、15 個 logo SVG、Inter／Manrope／JetBrains Mono／Noto Sans TC woff2） | **主要真相來源**。已解包：token CSS、組件 CSS、logo、字型全部照抄，未改任何數值 |
| `uploads/TigerAI Design System.md` | 設計系統規格 v1.0（人類可讀對照） | token 表、組件變體清單、開發準則 |
| `uploads/TigerAI官網交付總綱_v2.0.md` | 官網重建交付總綱 v2.0（11 區架構、文案憲法、CMS collections、路線圖） | 官網 UI kit 的結構與文案 |
| `uploads/ClaudeDesign簡報_Hero筆電開場主控台.md` | Design 簡報 01：Hero 筆電開場 + 六站主控台逐字文案與驗收標準 | 主控台 UI kit（文案一字不差） |
| 參考網站 | caldera.xyz（頂欄融合效果）、monologue.to（左固定右滑動）、maiagent.ai（Demo 展示畫面） | 只取互動手法，不取視覺；對應實作見 `ui_kits/website/README.md` |

**沒有拿到的**：Figma 檔／連結、程式碼庫（Wix 主站、workers.dev、tigeraiax.pages.dev、OpenGenie GitHub 皆未提供存取）、
真實照片與夥伴 logo、31 個 logo 檔中的另外 16 個（見 §7 待補）。
本系統中所有 UI 都由上述文件與解包出的 CSS 重建，沒有從截圖猜測。

---

## 3. 檔案索引

```
styles.css                  ← 消費端只 link 這一支（純 @import 清單）
tokens/    colors · typography · spacing · elevation · motion · layout · fonts
styles/    base · buttons · badges · forms · cards · alerts   （.t-* 組件 CSS，只引用 token）
assets/    logo/（15 SVG）· fonts/（20 woff2，latin + latin-ext）
components/ actions · forms · data · feedback · icon          （React primitives + .d.ts + .prompt.md）
guidelines/ 22 張 foundation specimen 卡（Design System 分頁的 Brand／Colors／Type／Spacing／Elevation／Motion）
ui_kits/   website（官網首頁 11 區）· console（OpenGenie 主控台六站）
templates/ landing-page（消費端可直接複製的頁面骨架 DC）
thumbnail.html · SKILL.md · readme.md
```

### 組件清單（14）
| 群組 | 組件 |
|---|---|
| `components/actions/` | **Button**、**ButtonGroup** |
| `components/forms/` | **Field**、**Input**、**Select**、**Textarea**、**Checkbox**、**Radio**、**Switch** |
| `components/data/` | **Card**、**Stat**、**Badge** |
| `components/feedback/` | **Alert** |
| `components/icon/` | **Icon** |

每個組件旁邊都有 `<Name>.d.ts`（props 契約）與 `<Name>.prompt.md`（什麼時候用＋範例）。
組件用的是設計系統原本的 class API（`.t-btn`、`.t-card`…），所以 hover／active／focus-visible／disabled 狀態全部來自 CSS，不是 inline style。

### 這套系統**沒有**的組件
原始資產只定義了上表這些家族。**沒有** Toast、Tooltip、Dialog、Tabs、Avatar、Breadcrumb、Table 組件 —
需要時請先與品牌方確認樣式，不要自行發明。（`Alert` 是 inline 的，不是 toast。）

### Intentional additions
- **Icon** — 原始資產沒有任何 icon 集，但六站主控台與官網一定要圖示。以 Lucide outline（CDN）包一層，`currentColor` 上色。見 §6。

---

## 4. CONTENT FUNDAMENTALS（文案怎麼寫）

**語言與稱謂**
- 繁體中文為主，技術名詞保留英文原文且大小寫照原樣：`n8n`（永遠小寫）、`Ollama`、`LiteLLM`、`RAG`、`Local GPT`、`GPU`、`Qwen3-32B`。
- 對客戶用「**你**」，不用「您」：「你的資料不出機房」「帶著你最痛的那個部門來」。
- 自稱「虎智」或「我們」，不寫「本公司」「敝公司」。

**句法**
- 短句，一句講一件事。長句用破折號「——」收尾補一刀：「裝好了——開源模型出新版就換，授權不用重簽、資料不用搬家。」
- 定錨句式（主控台每站底部固定用）：`這是「某商品」・一句人話`。
- 對照句式：`雲端訂閱 ⟷ 地端開源`，左欄講痛、右欄講解法。
- 標題可以不完整、可以直接下判斷：「同一套系統，三個入口。」「只講模式，不講客戶機密。」

**證言鐵律**
- **一律帶數字**：半天→3秒、月省 96 小時、首回時間 −72%、166+ 企業、4,085+ 學員、$96/$300。
- 形容詞不算證據。禁用「顛覆」「賦能」「一站式」「全方位」「領先業界」這類行銷腔，也不用驚嘆號。

**痛點命名法**
- 用「**Shadow AI Spend**」（員工刷卡訂 ChatGPT／Claude／Gemini，錢和資料一起流出去），不用「導入好難」。

**Emoji 與符號**
- Emoji **極少量、只在產品 UI 文案裡當狀態記號**，照原文使用：`📄` 出處、`🛡` 熔斷、`⚠` 體驗環境、`⤢` 全螢幕。行銷標題與內文不用 emoji。
- 這些是「排版字元」而不是圖示，屬於系統的一部分：`▲ ▼`（Stat 增減）、`→`（節點鏈與 CTA 尾巴）、`・`（並列分隔）、`「」`（強調專有名詞）、`✓ i ! ×`（Alert 圓點字元）。

**Casing**
- 中文不做大小寫；英文 eyebrow／label 全大寫 + `--tracking-caps`（`BUILT · WITH · TOKENS`）。
- 數字與英文、中文之間留一個半形空格：「月省 96 小時」「Qwen3-32B・跑在你的機房」。

**紅線（不可違反）**
- n8n 中文課程庫永遠獨立、非商業，官網只以免費資源連結。
- ClinicOps 相關文案不碰 HIS／病歷。
- 案例只講模式，不講客戶機密；客戶名稱一律不出現。
- AX Academy 測評以「協會品牌＝中立診斷方」呈現，不寫成虎智自家測驗。

---

## 5. VISUAL FOUNDATIONS

### 色彩
- **95 / 5 法則**：95% 中性（Ink／Slate／暖白）建立秩序，5% Tiger Gold 傳遞行動。**一頁只允許一個虎金主要 CTA**。
- `--tiger-500 #ECA42B` 是 Logo 精確色值，**不可變更**；其餘階刻意降飽和，讓大面積使用時沉穩。
- Ink 是暖調近黑（`#0E0E0D`），對齊 logo 的黑輪廓；Slate 是偏暖的 UI 中性灰，不是藍灰。
- 語意色刻意降飽和：`500` 承載語意（圖示、細線、實色填充），`50` 是近中性微染 —— 提示區塊要像「紙上有彩色圖示」，不是彩色塑膠塊。
- 頁面底色 `--bg-canvas #FAFAF8`（微暖白），卡片 `#FFFFFF`；深色區塊一律 `--ink-900`，不用純黑。
- 虎金底上的文字用**黑色**（`--fg-onbrand`），不用白色。

### 字體
- Manrope 800／700 做 display、KPI、導覽與卡片標題（`--tracking-tight -0.02em`）；Inter 做內文與 UI；JetBrains Mono 做 token、metadata、eyebrow、機器數據；Noto Sans TC 承載所有中文（x-height 與 Manrope 接近，中英混排不跳行）。
- 1.200 模數（16px 基準）：72／60／48／36／30／24／20／18／16／14／13／12。
- 行高：display 1.1、標題 1.25、內文 1.5、長段 1.7。段落最寬 62ch。
- 下限：簡報 1920×1080 不低於 24px；印刷 12pt；行動點擊目標 ≥ 44px；最小字 12px。

### 間距與版面
- 4px 網格，10 階（4／8／12／16／24／32／48／64／96／128）。禁止魔術數字。
- 節律：段落 16 → 小標上方 32 → 區塊 64 → Hero 96。桌機頁面邊距 64、手機 16。容器最寬 1440。
- 固定元素：頂欄 fixed（76px → 捲動後 58px）；立場宣言左欄 `position: sticky; top: 120px`；右下角常駐「帶我逛」；主控台側欄與底列固定，中間 pane 才滾動。

### 背景
- **沒有照片、沒有插畫、沒有材質貼圖**（來源未提供任何影像資產）。背景只有三種：純色面（暖白／白／墨黑）、
  兩道刻意的漸層、以及 1px 線。
- 允許的漸層只有兩處：深色區塊右上的**虎金放射光暈**（`radial-gradient(closest-side, rgba(236,164,43,.28), transparent 70%)`，見 `.t-card--feature`）、
  以及 accent 卡片的 `linear-gradient(90deg, var(--tiger-50), transparent 60%)`。
- **禁止**：藍紫漸層、彩虹漸層、mesh gradient、noise／grain 疊層、圓角＋左側彩色邊的「AI 感」卡片
  （`.t-card--accent` 是本系統唯一的左側彩邊，而且是直角）。
- 若之後補影像：主題是機房、硬體、GPU、人在工作；色溫偏暖中性，不要冷藍科技風；不要 AI 生成的發光大腦。

### 動態
- `--dur-fast 120ms` hover／focus／顏色｜`--dur-base 200ms` 進出場｜`--dur-slow 320ms` 面板與揭露。
- `--ease-out cubic-bezier(.22,.61,.36,1)` 是預設；`--ease-in-out` 用於來回。**沒有彈跳、沒有 spring、沒有 overshoot。**
- 動畫語彙只有四種：淡入（+4px 位移）、長度生長（進度條／額度條／節點依序亮起）、逐字打出（AI 回覆）、機構式旋轉（筆電上蓋 rotateX 1.2s、按鈕 spinner 700ms linear）。
- `prefers-reduced-motion: reduce` 時所有動畫縮到 0.001ms，狀態直接跳終態（UI kit 已實作）。

### 互動狀態
- **hover**：實色鈕 → 底色加深一階（`--tiger-500` → `--tiger-600`）；outline 鈕 → 反轉成墨黑底白字；ghost → `--slate-100` 淺灰底；卡片 → `translateY(-2px)` + `--shadow-lg`（elevated）或邊框轉 `--ink-600`（interactive）；導覽連結 → 底部 2px 虎金線由左掃到右。
- **press／active**：`translateY(1px)` + 再加深一階（`--tiger-700`）。不縮放、不變形。
- **focus-visible**：一律 `--shadow-focus`（3px 虎金 35%）+ 邊框轉虎金。**任何互動元素都不准移除焦點環。**
- **disabled**：`opacity .45` + `saturate(.5)` + `pointer-events: none`。
- **selected／current**：虎金左側 3px 或底部 3px 實線 + 文字轉虎金（主控台側欄、L1–L5 階梯）。

### 邊框、陰影、圓角
- 邊框一律 1px（checkbox／radio 為 1.5px）：`subtle` 卡片與分隔線、`default` 輸入框、`strong` 強調、`brand` 品牌邊。深色面上用 `rgba(255,255,255,.08–.22)`。
- 陰影是雙層（近距 + 遠距）模擬自然光，不做過度柔焦：`xs` hairline／`sm` 輸入框／`md` 卡片／`lg` popover／`xl` modal 與全螢幕層／`brand` 虎金光暈／`inset` 內凹。預設卡片**沒有陰影**，只有邊框。
- **全系統直角**：所有 `--radius-*` 都是 0。`--radius-full` 只給幾何上必須是圓的東西：radio、狀態點、spinner、使用者頭像。
- 卡片長相：白底 + 1px `--border-subtle` + 直角 + `--space-5` 內距；mono 全大寫 eyebrow → Manrope 700 標題 → 14px／1.7 內文 → footer 上方 1px 分隔線（左 Badge 右 Button）。

### 透明與模糊
- 只有兩種正當用途：① 融合式頂欄 `backdrop-filter: blur(16px) saturate(1.4)` + `rgba(250,250,248,.72)`；② 深色面上的 `rgba(255,255,255,.04–.12)` 細線與淺填充。
- 不用毛玻璃當裝飾、不在內容上蓋半透明色塊、不做 protection gradient（因為沒有影像需要壓字）。捲動時頂欄改用**模糊膠囊**而不是加深色塊。

---

## 6. ICONOGRAPHY

**原始資產裡沒有任何 icon 集**：只有 logo 向量檔。沒有 icon font、沒有 sprite、沒有 png 圖示。

- **替代方案（已標記）**：Lucide outline（stroke 2 @ 24px，直角切線，與方角系統相容），透過 CDN `unpkg.com/lucide-static@latest/icons/<name>.svg` 取回並 inline，由 `Icon` 組件包裝，`currentColor` 上色。
  → **若虎智有自己的圖示集，請提供，我會換掉整個 `components/icon/`。**
- 常用 glyph：`message-square` 對話 · `database` 知識庫 · `workflow` 流程 · `box` 模型 · `shield-check` 治理 · `gauge` 儀表板 · `cpu` GPU · `file-text` 文件 · `download` 下載 · `calendar` 預約 · `route` 帶我逛。
- **不要混第二套圖示家族**；不要用 emoji 當 UI 圖示；不要手繪 SVG 冒充系統圖示。
- 系統原本就用**字元**當記號，這些保留：`▲ ▼`（Stat 增減）、`✓ i ! ×`（Alert 圓點）、`→`（節點鏈、CTA）、`・`、`⤢`。
- Emoji 只在產品 UI 文案裡出現：`📄`（出處）、`🛡`（熔斷）、`⚠`（體驗環境）。

**Logo（`assets/logo/`，15 檔）**
命名規則：`{color|black|white}-{square|stacked|horizontal|wordmark}[-mark][-en].svg`
- 淺底首選 `color-horizontal.svg` 或 `color-horizontal-black-text.svg`；深底一律 `white-*` 或 `color-horizontal-white-text.svg`。
- 徽章（`*-square-mark`）用於 favicon、app icon、頭像、筆電上蓋。
- 淨空區 ≥ Logo 高度 15%；最小尺寸：數位徽章 32px、橫式 96px。
- **禁止**旋轉、傾斜、改變比例、改色、加描邊、在低對比背景使用彩色版。

---

## 7. 替代與缺口（請補）

1. **Logo 只有 15 檔**：規格書說全套 31 檔，打包檔裡只嵌了 15 個（缺 `*-en` 純英文版、部分 stacked／square 組合）。請提供完整 `assets/logo/`。
2. **中文字型走 CDN**：Noto Sans TC 完整 CJK 是 105 個 subset × 4 weight（約 16 MB），沒有 vendor 進來，`tokens/fonts.css` 以 Google Fonts `@import` 載入。Inter／Manrope／JetBrains Mono 的 latin + latin-ext 已自架於 `assets/fonts/`。若官網要在封閉網路內執行，請告知我改成自架 CJK。
3. **圖示是替代品**（見 §6）。
4. **沒有影像資產**：官網 UI kit 的夥伴 logo 牆、顧問頭像都是虛線佔位框（總綱 §7-3、§7-4）。
5. **品牌色定案（總綱 §7-6）**：Design 簡報 01 寫「綠色方塊 logo」「紫色導覽條」，與設計系統的 Tiger Gold／Ink 相衝突。目前一律照設計系統走虎金，完成態才用 `--success-500`。若要改，`ui_kits/console/console.css` 的 `.og__guide` 一處即可。
6. **課程／價格／案例數字**為版型示意（總綱 §7-7）。

---

## 8. 開發準則（照規格書 §10）

1. **絕不硬編碼** —— 顏色、間距、字級、圓角一律引用 token。
2. **95/5 配色** —— 虎金只用於行動與強調，不作大面積背景。
3. **全方角** —— 除 radio、狀態點、spinner、頭像外不使用圓角。
4. **焦點可見** —— 所有互動元素必須有 `:focus-visible` 焦點環。
5. **對齊網格** —— 所有尺寸為 4 的倍數。
6. **語意優先** —— 用 `--fg-secondary` 而非 `--ink-600`，讓深色模式可一次切換。
7. **點擊目標** —— 行動裝置不低於 44×44px。

© 2026 虎智科技股份有限公司 TigerAI · Design System v1.0（本專案為 v1.0 規格的可執行版本）
