// 重新產生顧問去背人像，解決首頁 hover 那張圖糊掉的問題。
//
// 問題：原型的 design/assets/consultants/cNNp.png 只有 280×394，
// 但版面用 width:390px 顯示，一般螢幕就放大 1.39 倍，高解析螢幕放大 2.8 倍。
//
// 原始檔（講師顧問資料/）本來就是去背過的高解析圖（最大 1535×2048），
// 所以可以重做。裁切規則是從現有的小圖反推出來的，不是我自己決定的：
//
//   1. 取原圖「非透明區域」的外框，和小圖的外框
//   2. 用寬度比算出縮放倍率（量過 Jimmy 的寬高比都是 0.243，是等比縮放）
//   3. 有些人（例如 Nick）高度比小於寬度比，代表下緣被裁掉（收在腰部），
//      這靠「先等比縮放、再裁到畫布高度」自然重現，不用額外規則
//   4. 人像左上角放在小圖外框的同一個相對位置
//
// 產生 1x（390 寬）和 2x（780 寬）兩份，前台用 srcset 讓瀏覽器自己挑。
// 390 是版面實際顯示的寬度，所以 1x 螢幕剛好 1:1、2x 螢幕剛好 2:1。
//
// 驗證：把新的 1x 縮回 280 寬跟原本的小圖比對，差異要夠小才算裁切重現正確。
//
// 用法：node tools/regen-cutouts.mjs
// 產出：site/public/gen/consultants/cNNp.png（390 寬）與 cNNp@2x.png（780 寬）
//       這些檔案要進版控（public/gen/ 沒有被 .gitignore 擋）

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch {
  // sharp 是原生套件，專案沒裝，用全域的那份（robin 機器上有）
  const { execSync } = await import('node:child_process');
  const globalRoot = execSync('npm root -g').toString().trim();
  sharp = require(path.join(globalRoot, 'sharp'));
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const ROOT = path.resolve(SITE, '..');
const ORIGINALS = path.join(ROOT, '講師顧問資料');
const CUTOUTS = path.join(ROOT, 'design', 'assets', 'consultants');
const OUT = path.join(SITE, 'public', 'gen', 'consultants');

/** 版面實際顯示寬度。見 ConsultantStrip.tsx 的 width:390。 */
const DISPLAY_W = 390;

/** consultants.js 的順序就是 c01..c10，對應原始檔的檔名。 */
const PAIRS = [
  ['c01p.png', '張惟荏Nick.png'],
  ['c02p.png', '李其縵Mandy.png'],
  ['c03p.png', '林京賢Aiden.png'],
  ['c04p.png', '林毓晟Stanley.png'],
  ['c05p.png', '紀如鴻Evan.png'],
  ['c06p.png', '盧業興Morris.png'],
  ['c07p.png', '賴志銘Jimmy.png'],
  ['c08p.png', '謝侑霖Leo.png'],
  // 注意：c09 是魏美棻 Nancy、c10 才是顏世倫。consultants.js 的順序是這樣，
  // 照檔名的字母順序會對錯人。
  ['c09p.png', '魏美棻Nancy.png'],
  ['c10p.png', '顏世倫.png'],
];

/**
 * 人像的外框。
 *
 * 不能只用「有沒有非透明像素」的最小最大值：去背檔常留下很淡的陰影殘影或
 * 零星雜點，離人很遠，那樣算出來的外框會被撐大，後面的縮放倍率就全錯。
 * 改成逐列逐欄統計不透明像素的數量，佔比低於千分之三的當雜訊丟掉。
 */
async function alphaBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const cols = new Array(w).fill(0);
  const rows = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * ch + 3] > 128) {
        cols[x]++;
        rows[y]++;
      }
    }
  }
  const firstLast = (arr, limit) => {
    const min = Math.max(1, Math.round(limit * 0.003));
    let a = arr.findIndex((v) => v >= min);
    let b = arr.length - 1 - [...arr].reverse().findIndex((v) => v >= min);
    if (a < 0) { a = 0; b = arr.length - 1; }
    return [a, b];
  };
  const [x0, x1] = firstLast(cols, h);
  const [y0, y1] = firstLast(rows, w);
  return { w, h, bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
}

/**
 * 用現有的小圖當標準答案，反解出「原圖 → 小圖」的縮放與位移。
 *
 * 外框估算在多數人身上準，但有幾張（陰影殘留、原圖是橫幅、人沒被裁到底）
 * 會偏掉。既然小圖就是正確答案，直接拿它的剪影去對，比猜規則可靠。
 *
 * 作法：只比 alpha（剪影），在縮小過的解析度上做網格搜尋，
 * 以外框估算為中心試 ±25% 的縮放和 ±24px 的位移，取剪影吻合度最高的一組。
 */
async function solveTransform(origFile, cutFile, seed) {
  const SW = 96; // 搜尋用的工作寬度，夠辨識剪影又夠快
  const cutMeta = await sharp(cutFile).metadata();
  const SH = Math.round((cutMeta.height / cutMeta.width) * SW);

  const target = await sharp(cutFile).resize(SW, SH, { fit: 'fill' }).ensureAlpha().extractChannel('alpha').raw().toBuffer();
  const orig = await sharp(origFile).ensureAlpha().metadata();

  const k = SW / cutMeta.width; // 小圖座標 → 搜尋座標
  let best = { score: -1, scale: seed.scale, left: seed.left * k, top: seed.top * k };

  // 掃一輪：給定縮放與位移範圍，回傳最佳解
  const sweep = async (centerScale, centerL, centerT, sSteps, sStep, oRange, oStep) => {
    for (let si = -sSteps; si <= sSteps; si++) {
      const scale = centerScale * (1 + si * sStep);
      const rw = Math.max(1, Math.round(orig.width * scale * k));
      const rh = Math.max(1, Math.round(orig.height * scale * k));
      const mask = await sharp(origFile).ensureAlpha().resize(rw, rh, { fit: 'fill' }).extractChannel('alpha').raw().toBuffer();
      for (let dy = -oRange; dy <= oRange; dy += oStep) {
        for (let dx = -oRange; dx <= oRange; dx += oStep) {
          const L = Math.round(centerL + dx);
          const T = Math.round(centerT + dy);
          let hit = 0;
          for (let y = 0; y < SH; y++) {
            const sy = y - T;
            const rowOk = sy >= 0 && sy < rh;
            for (let x = 0; x < SW; x++) {
              const sx = x - L;
              const a = rowOk && sx >= 0 && sx < rw ? mask[sy * rw + sx] : 0;
              // 剪影一致就算命中（都有東西或都沒東西）
              if ((a > 128) === (target[y * SW + x] > 128)) hit++;
            }
          }
          const score = hit / (SW * SH);
          if (score > best.score) best = { score, scale, left: L, top: T };
        }
      }
    }
  };

  // 粗掃：縮放 ±24%、位移 ±12（搜尋座標），再以贏家為中心細修
  await sweep(seed.scale, seed.left * k, seed.top * k, 12, 0.02, 12, 2);
  await sweep(best.scale, best.left, best.top, 4, 0.005, 3, 1);

  return { score: best.score, scale: best.scale, left: best.left / k, top: best.top / k };
}

await mkdir(OUT, { recursive: true });

const originals = new Set(await readdir(ORIGINALS));
console.log('顧問      縮放     產出                驗證（縮回 280 寬與原檔的平均色差）');
console.log('─'.repeat(78));

for (const [cutName, origName] of PAIRS) {
  if (!originals.has(origName)) {
    console.log(`${cutName}  找不到原始檔 ${origName}，跳過`);
    continue;
  }
  const cutFile = path.join(CUTOUTS, cutName);
  const origFile = path.join(ORIGINALS, origName);
  const cut = await alphaBox(cutFile);
  const orig = await alphaBox(origFile);

  // 先用外框估一組，再用剪影搜尋校正。估算是搜尋的起點，不是最終答案。
  const seedScale = cut.bw / orig.bw;
  const solved = await solveTransform(origFile, cutFile, {
    scale: seedScale,
    left: cut.bx - orig.bx * seedScale,
    top: cut.by - orig.by * seedScale,
  });

  for (const mult of [1, 2]) {
    const canvasW = Math.round(DISPLAY_W * mult);
    const canvasH = Math.round((cut.h / cut.w) * canvasW);
    // 小圖畫布 → 新畫布的倍率
    const k = canvasW / cut.w;
    const scale = solved.scale * k;
    const resizedW = Math.round(orig.w * scale);
    const resizedH = Math.round(orig.h * scale);
    const left = Math.round(solved.left * k);
    const top = Math.round(solved.top * k);

    // 放大後的原圖通常比畫布大（人像下緣本來就會被裁掉），
    // sharp 的 composite 不接受比畫布大的輸入，所以先自己裁出落在畫布內的那一塊。
    const srcLeft = Math.max(0, -left);
    const srcTop = Math.max(0, -top);
    const dstLeft = Math.max(0, left);
    const dstTop = Math.max(0, top);
    const cropW = Math.min(resizedW - srcLeft, canvasW - dstLeft);
    const cropH = Math.min(resizedH - srcTop, canvasH - dstTop);
    if (cropW <= 0 || cropH <= 0) {
      console.log(`${cutName}  ⚠ 算出來的位置完全落在畫布外，跳過`);
      continue;
    }

    const layer = await sharp(origFile)
      .resize(resizedW, resizedH, { fit: 'fill', kernel: 'lanczos3' })
      .extract({ left: srcLeft, top: srcTop, width: cropW, height: cropH })
      .png()
      .toBuffer();

    const out = await sharp({
      create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: layer, left: dstLeft, top: dstTop }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    const name = mult === 1 ? cutName : cutName.replace('.png', '@2x.png');
    await writeFile(path.join(OUT, name), out);

    if (mult === 1) {
      // 驗證：縮回原本的 280 寬，跟原檔比平均色差。裁切對了就會很小。
      const mine = await sharp(out).resize(cut.w, cut.h, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
      const theirs = await sharp(cutFile).resize(cut.w, cut.h, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
      let sum = 0;
      for (let i = 0; i < mine.length; i += 4) {
        sum += Math.abs(mine[i] - theirs[i]) + Math.abs(mine[i + 1] - theirs[i + 1]) + Math.abs(mine[i + 2] - theirs[i + 2]) + Math.abs(mine[i + 3] - theirs[i + 3]);
      }
      const avg = sum / (mine.length / 4) / 4;
      const kb = (out.length / 1024).toFixed(0);
      // 這個平均色差同時吃到「構圖有沒有對」和「原圖與小圖的色調差」，
      // 所以不是越小越好的絕對標準。8 以下可以放心，8 到 15 要抽看一眼，
      // 超過 15 幾乎一定是構圖跑掉。c09 落在 12.7，已人工確認構圖正確，
      // 差值來自原圖與小圖的色調不同。
      const verdict = avg < 8 ? '構圖正確' : avg < 15 ? '構圖正確（色調略有差異）' : '⚠ 構圖跑掉了';
      console.log(
        `${cutName}  ${scale.toFixed(3)}  ${canvasW}×${canvasH} ${kb.padStart(4)}KB   ` +
          `${avg.toFixed(1).padStart(5)}  ${verdict}`
      );
    }
  }
}

console.log(`\n產出在 ${path.relative(SITE, OUT)}/`);
