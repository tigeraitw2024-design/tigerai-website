// 把兩張截圖的同一塊區域上下並排存成一張圖，用來肉眼確認差異。
// 用法：node tools/crop.mjs <name> <x> <y> <w> <h> [zoom]
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const [name, X, Y, W, H, Z = 1] = [process.argv[2], ...process.argv.slice(3).map(Number)];
const read = (f) => PNG.sync.read(readFileSync(path.join(OUT, f)));
const a = read(`${name}.proto.png`), b = read(`${name}.built.png`);
const out = new PNG({ width: W * Z, height: H * Z * 2 + 8 });
for (let i = 0; i < out.data.length; i += 4) { out.data[i] = out.data[i+1] = out.data[i+2] = 255; out.data[i+3] = 255; }
const blit = (src, oy) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (Y + y >= src.height || X + x >= src.width) continue;
    const si = ((Y + y) * src.width + (X + x)) << 2;
    for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) {
      const di = ((oy + y * Z + dy) * out.width + (x * Z + dx)) << 2;
      out.data[di] = src.data[si]; out.data[di+1] = src.data[si+1]; out.data[di+2] = src.data[si+2]; out.data[di+3] = 255;
    }
  }
};
blit(a, 0); blit(b, H * Z + 8);
writeFileSync(path.join(OUT, 'crop.png'), PNG.sync.write(out));
console.log(`上=原型 下=重建站　區域 x${X} y${Y} ${W}×${H}　放大 ${Z}×　→ tools/out/crop.png`);
