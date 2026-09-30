// 把 verify 產生的差異圖按垂直區段拆開報告。
//
// 首頁高 7654px，整頁只給一個「0.70%」的數字沒辦法動手修。這支把差異拆到
// 每個區塊，直接告訴你問題在 05b 還是在 Footer，並且只把有問題的區段輸出成
// 單獨的圖（tools/out/band-*.png），不用去翻那張 7654px 高的全圖。
//
// 用法：先跑 node tools/verify.mjs home，再跑 node tools/bands.mjs home
//
// 區段邊界是手寫的，改版面之後高度會跑掉，那就更新 SECTIONS。
// 邊界只影響「差異被歸到哪一段」的可讀性，不影響總差異數字。

import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pixelmatch from 'pixelmatch';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');

/** 每頁的區塊邊界（y 起、y 訖、名稱）。沒列的頁面就整頁一段。 */
const SECTIONS = {
  home: [
    [0, 900, '01 Hero 筆電'],
    [900, 1100, '02 信任帶'],
    [1100, 2000, '03 立場宣言'],
    [2000, 2600, '04 產品入口 ／ 04b Tiger GPU Pro'],
    [2600, 3400, '05 Workflow 展示櫃'],
    [3400, 4700, '05b 企業首選'],
    [4700, 5200, '06 測評入口'],
    [5200, 5800, '07 課程區'],
    [5800, 6400, '08 顧問與方法論'],
    [6400, 7100, '09 案例與夥伴'],
    [7100, 99999, '10 預約 ／ 11 Footer'],
  ],
};

const name = process.argv[2] || 'home';
const protoFile = path.join(OUT, `${name}.proto.png`);
const builtFile = path.join(OUT, `${name}.built.png`);
if (!existsSync(protoFile) || !existsSync(builtFile)) {
  console.error(`找不到 ${name} 的截圖，先跑：node tools/verify.mjs ${name}`);
  process.exit(1);
}

const a = PNG.sync.read(readFileSync(protoFile));
const b = PNG.sync.read(readFileSync(builtFile));
const W = Math.min(a.width, b.width);
const H = Math.min(a.height, b.height);

// 兩邊尺寸不同就裁到共同區域再比
const fit = (img) => {
  if (img.width === W && img.height === H) return img;
  const o = new PNG({ width: W, height: H });
  PNG.bitblt(img, o, 0, 0, W, H, 0, 0);
  return o;
};
const A = fit(a);
const B = fit(b);

const bands = SECTIONS[name] || [[0, 99999, '整頁']];
console.log(`\n${name}：原型 ${a.width}×${a.height}　重建 ${b.width}×${b.height}　比對區域 ${W}×${H}\n`);
console.log('  區段          差異      區塊');
console.log('  ' + '─'.repeat(58));

let worstBand = null;
for (const [y0, y1raw, label] of bands) {
  const y1 = Math.min(y1raw, H);
  const h = y1 - y0;
  if (h <= 0) continue;
  const sa = new PNG({ width: W, height: h });
  const sb = new PNG({ width: W, height: h });
  const sd = new PNG({ width: W, height: h });
  PNG.bitblt(A, sa, 0, y0, W, h, 0, 0);
  PNG.bitblt(B, sb, 0, y0, W, h, 0, 0);
  const changed = pixelmatch(sa.data, sb.data, sd.data, W, h, { threshold: 0.1, includeAA: true });
  const pct = (changed / (W * h)) * 100;
  const bad = pct >= 0.05;
  console.log(`  ${String(y0).padStart(5)}–${String(y1).padEnd(5)} ${pct.toFixed(3).padStart(8)}%  ${bad ? '←' : ' '} ${label}`);
  if (bad) {
    writeFileSync(path.join(OUT, `band-${name}-${y0}.png`), PNG.sync.write(sd));
    if (!worstBand || pct > worstBand.pct) worstBand = { pct, y0, label };
  }
}

if (worstBand) {
  console.log(`\n  最大的一段是「${worstBand.label}」${worstBand.pct.toFixed(3)}%`);
  console.log(`  單獨的差異圖：tools/out/band-${name}-*.png`);
} else {
  console.log('\n  每一段都在 0.05% 以下。');
}
