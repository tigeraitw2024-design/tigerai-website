# TigerAI 虎智科技 LOGO 全集

**31 組官方 LOGO · SVG + PNG 雙版本**，供所有 EDM、對外文件、第三方合作使用。

這批是品牌 LOGO 的 **source of truth**。設計或程式要用 LOGO，都從這裡抓；原始的中文命名 SVG（`TigerAI虎智科技Logo_All/`）就不要直接用，命名壞 URL。

---

## CDN URL

部署到 Cloudflare 後，透過官網直接 serve：

```
https://tigerai-website.tiger-ai-tw2024.workers.dev/assets/logo/all/svg/<name>.svg
https://tigerai-website.tiger-ai-tw2024.workers.dev/assets/logo/all/png/<name>.png
```

**EDM 一律用 PNG**（Outlook 不支援 SVG `<img>`）；
網頁 / Figma / 印刷用 SVG。

---

## 命名規則

`<色系>-<形狀>[-<字款變體>][-<尺寸變體>]`

- **色系**：`color`（彩色金老虎 + 彩色字）／ `white`（純白）／ `black`（純黑）
- **形狀**：`horizontal`（橫式）／ `vertical`（直式）／ `square-mark`（方塊 · 老虎圖騰）／ `text-only`（純字）
- **字款變體**：
  - 無 → 中英文並列（TIGER AI + 虎智科技股份有限公司）
  - `-en` → 純英文（只有 TIGER AI）
  - `-white-text` / `-black-text` → 彩色老虎 + 指定色字
- **尺寸變體**：`-large` / `-16` / `-25` → 原廠不同解析度的方塊 mark

---

## 32 個檔案清單

### 彩色（13）
| 檔名 | 用途 |
|------|------|
| `color-horizontal.svg/png` | 彩色橫式 · 中英並列 |
| `color-horizontal-en.svg/png` | 彩色橫式 · 純英文 |
| `color-horizontal-white-text.svg/png` | **EDM brand bar / footer 深底用** |
| `color-horizontal-white-text-en.svg/png` | 深底橫式 · 純英 |
| `color-horizontal-black-text.svg/png` | 淺底橫式 · 有中文 |
| `color-horizontal-black-text-en.svg/png` | 淺底橫式 · 純英 |
| `color-square-mark.svg/png` | 彩色方塊 · 老虎圖騰（頭像 / favicon） |
| `color-square-en.svg/png` | 彩色方塊 · 加 TIGER AI 字 |
| `color-square-en-large.svg/png` | 彩色方塊 · 大 Logo（印刷 / 高解） |
| `color-vertical.svg/png` | 彩色直式 · 中英 |
| `color-vertical-en.svg/png` | 彩色直式 · 純英 |
| `color-text-only.svg/png` | 彩色純字（無老虎圖騰） |
| `color-text-only-en.svg/png` | 彩色純英字 |

### 白色（9）
`white-horizontal` / `-en` / `white-square-mark` / `-en` / `-en-large` / `white-vertical` / `-en` / `white-text-only` / `-en`

### 黑色（9）
`black-horizontal` / `-en` / `black-square-mark` / `-en-16` / `-en-25` / `black-vertical` / `-en` / `black-text-only` / `-en`

---

## EDM 的 LOGO 選擇指南

| 版型底色 | 用哪個 |
|---------|--------|
| 近黑底 `#0E0E0D`（brand bar / footer） | `color-horizontal-white-text.png`（金老虎 + 白字） |
| 米白紙底 `#FAFAF8`（內文） | `color-horizontal-black-text.png`（金老虎 + 黑字） |
| 只放老虎 mark（頭像 / 小 icon） | `color-square-mark.png` |

---

## 常用 HTML 範例

```html
<!-- EDM brand bar · 近黑底 -->
<img src="https://tigerai-website.tiger-ai-tw2024.workers.dev/assets/logo/all/png/color-horizontal-white-text.png"
     alt="TigerAI 虎智科技股份有限公司"
     width="206" height="50"
     style="display:block;border:0;outline:none;">
```

---

## 更新流程

要新增或替換 LOGO：

1. 把新 SVG 原檔放進 `TigerAI虎智科技Logo_All/`（原始命名）
2. 跑 `scratchpad/batch-logo.mjs`（Node 腳本 · 自動 rename + 轉 PNG）
3. commit + push 到 main · Cloudflare Workers Builds 自動部署
4. 更新本 README 的檔案清單

---

## 原始來源

- 原始命名 SVG：`E:\Claude code\My Project\TigerAI\TigerAI虎智科技Logo_All\`（Robin 的 LOGO 全集 · 中文命名）
- 本資料夾的英文命名版本是機器批次轉的衍生 · 原始檔不要刪
