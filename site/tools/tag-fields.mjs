// 在前台的元素上標記「我對應後台的哪個欄位」。
//
// 後台的即時預覽需要知道「改 shadowTitle 要改畫面上哪一行字」。現在前台的
// <h2> 就只是一個 <h2>，沒有任何線索。這支程式掃過頁面，凡是渲染了
// text(home,'xxx') / num(home,'xxx') 的元素，就幫它加上 data-tg-field="xxx"。
//
// 只加屬性、不動任何樣式或結構，所以像素比對不受影響。
//
// 用法：node tools/tag-fields.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/pages/index.astro',
  'src/pages/courses.astro',
  'src/pages/consultants.astro',
  'src/pages/cases.astro',
  'src/pages/products/index.astro',
  'src/pages/products/tiger-gpu-pro.astro',
  'src/components/home/TgProBand.astro',
];
const dry = process.argv.includes('--dry');
let total = 0;

for (const f of FILES) {
  let s;
  try { s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); } catch { continue; }
  const lines = s.split('\n');
  let n = 0;

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    // 這一行有沒有渲染某個欄位
    const m = /\{(?:text|num)\((?:home|page|settings|coursesPage),\s*'([a-zA-Z0-9_]+)'/.exec(L);
    if (!m) continue;
    const key = m[1];
    if (L.includes('data-tg-field')) continue;

    // 找 { 之前最後一個「開標籤」，把屬性插在標籤名後面
    const braceAt = L.indexOf(m[0]);
    const before = L.slice(0, braceAt);
    const open = /<([a-zA-Z][a-zA-Z0-9]*)(?=[\s>])/g;
    let last = null, mm;
    while ((mm = open.exec(before)) !== null) last = mm;
    if (!last) continue;

    const insertAt = last.index + last[0].length;
    lines[i] = L.slice(0, insertAt) + ` data-tg-field="${key}"` + L.slice(insertAt);
    n++;
  }

  if (n) {
    total += n;
    console.log(`  ${f}　標記 ${n} 個`);
    if (!dry) writeFileSync(f, lines.join('\n'), 'utf8');
  }
}
console.log(dry ? `\n（試跑）共 ${total} 個` : `\n共標記 ${total} 個欄位`);
