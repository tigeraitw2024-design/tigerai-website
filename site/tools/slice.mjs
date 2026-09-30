// 把手機版那種超長的全頁截圖切成一段一段，方便一段一段看。
// 原圖是 2 倍點陣（390px 視窗 → 780px 寬），這裡預設縮回 1 倍，
// 因為看排版看的是版面，不是像素。
//
// 用法：node tools/slice.mjs <檔名不含.png> [每段高度] [從第幾段開始] [切幾段]
//       node tools/slice.mjs home-390 1400 0 4
import sharp from 'sharp';
import { readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'out', 'mobile');
const [name, STEP = 1400, FROM = 0, COUNT = 99] = [process.argv[2], ...process.argv.slice(3).map(Number)];

// 先把上次切的清掉，免得看到舊的
for (const f of readdirSync(DIR)) if (f.startsWith(`slice-`)) unlinkSync(path.join(DIR, f));

const src = path.join(DIR, `${name}.png`);
const meta = await sharp(src).metadata();
const scale = meta.width > 420 ? 0.5 : 1;          // 2 倍點陣縮回去
const stepPx = Math.round(STEP / scale);            // 換算回原圖座標

const total = Math.ceil(meta.height / stepPx);
console.log(`${name}.png　${meta.width}×${meta.height}　縮 ${scale}×　共 ${total} 段，每段 ${STEP}px`);

for (let i = FROM; i < Math.min(total, FROM + COUNT); i++) {
  const top = i * stepPx;
  const h = Math.min(stepPx, meta.height - top);
  const out = path.join(DIR, `slice-${String(i).padStart(2, '0')}.png`);
  await sharp(src).extract({ left: 0, top, width: meta.width, height: h })
    .resize({ width: Math.round(meta.width * scale) }).toFile(out);
  console.log(`  段 ${i}：y ${Math.round(top * scale)}–${Math.round((top + h) * scale)}　→ ${path.basename(out)}`);
}
