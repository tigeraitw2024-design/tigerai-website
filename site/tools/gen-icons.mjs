// 把用到的 Lucide 圖示打包成一支 TS 模組，取代原型「從 CDN 現抓」的作法。
//
// 原型的 Icon 元件是 fetch('https://unpkg.com/lucide-static@latest/icons/<name>.svg')，
// 有三個問題：要連外網、@latest 不固定版本（哪天圖示改了畫面就變）、
// 每個圖示第一次出現會閃一下空白。
//
// 這裡改成建置時從固定版本的 lucide-static 取出需要的那幾個，內嵌進程式。
// 39 個圖示大約 12 KB，比一次 CDN 往返還小。
//
// 圖示清單是從原始碼掃出來的，不是手寫的，所以不會漏也不會多帶。
//
// 用法：node tools/gen-icons.mjs
// 產出：src/components/console/icons.ts（要進版控）

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const DESIGN = path.resolve(SITE, '..', 'design');
const ICONS_DIR = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');
const OUT = path.join(SITE, 'src', 'components', 'console', 'icons.ts');
const VERSION = require('lucide-static/package.json').version;

// 掃原始碼找圖示名稱：<Icon name="x" /> 和資料裡的 icon: 'x'
const sources = [path.join(DESIGN, 'console', 'ConsoleAppV2.jsx')];
const names = new Set();
for (const f of sources) {
  const src = await readFile(f, 'utf8');
  for (const m of src.matchAll(/name="([a-z0-9-]+)"/g)) names.add(m[1]);
  for (const m of src.matchAll(/icon:\s*'([a-z0-9-]+)'/g)) names.add(m[1]);
}

const available = new Set(await readdir(ICONS_DIR));
const found = [];
const missing = [];
for (const n of [...names].sort()) {
  if (available.has(`${n}.svg`)) found.push(n);
  else missing.push(n);
}

const entries = [];
for (const n of found) {
  let svg = await readFile(path.join(ICONS_DIR, `${n}.svg`), 'utf8');
  // 拿掉註解與換行，並加上讓它填滿容器的樣式（原型也是這樣處理）
  svg = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace('<svg', '<svg style="width:100%;height:100%;display:block"');
  entries.push(`  '${n}': ${JSON.stringify(svg)},`);
}

const ts = `// 自動產生，不要手改。來源：node tools/gen-icons.mjs
//
// Lucide outline 圖示，取自 lucide-static@${VERSION}（固定版本）。
// 原型是執行時從 unpkg 的 @latest 抓，會連外網、版本會飄、第一次顯示會閃。
// 這裡在建置時內嵌，離線可用且畫面穩定。
//
// 要新增圖示：在程式裡用了新的 name 之後重跑 node tools/gen-icons.mjs。

export const ICONS: Record<string, string> = {
${entries.join('\n')}
};

export default ICONS;
`;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, ts, 'utf8');
console.log(`lucide-static@${VERSION}`);
console.log(`內嵌 ${found.length} 個圖示 → ${path.relative(SITE, OUT)}（${(ts.length / 1024).toFixed(1)} KB）`);
if (missing.length) console.log(`⚠ 這幾個在 lucide 裡找不到，要確認名稱：${missing.join(', ')}`);
