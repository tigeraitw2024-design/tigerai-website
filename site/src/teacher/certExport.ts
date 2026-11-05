import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import Cert, { type CertData, type CertTune } from './Cert';
import { CERT_CSS } from './certStyle';

/**
 * 把證照畫成圖檔（PNG／JPG），純瀏覽器端、不靠任何套件、不碰付費 API。
 *
 * 作法：把證照 DOM 塞進一張 SVG 的 <foreignObject>，再把 SVG 畫到 canvas，
 * canvas 就能 toBlob 存檔。兩個會讓 canvas「被污染」而存不了檔的雷都拆掉：
 *   1. 圖片（紅印、簽名）先抓成 data URL，不留跨來源來源
 *   2. 外部樣式表在 SVG 裡讀不到 → 把 CERT_CSS 直接塞進 SVG 的 <style>
 * 字型 Work Sans 也內嵌（抓 Google 的 woff2 轉 base64），不然存出來會變系統字。
 *
 * 匯出固定用 1398 寬（n8n 原生寬）再乘 scale，所以出圖是列印級解析度，
 * 跟畫面上看到的版面逐像素一致。
 */

const EXPORT_W = 1398; // 證照原生寬（px）

// ── 小工具：抓檔案轉 data URL（同源，存了就不會污染 canvas） ──────
const urlCache = new Map<string, Promise<string>>();
function toDataUrl(url: string): Promise<string> {
  let p = urlCache.get(url);
  if (!p) {
    p = fetch(url, { credentials: 'same-origin' })
      .then((r) => r.blob())
      .then((b) => new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(fr.error);
        fr.readAsDataURL(b);
      }));
    urlCache.set(url, p);
  }
  return p;
}

// 逾時保護：不管抓字型多慢或根本連不到，匯出都不能卡住。到點就回退 fallback。
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);
}

// ── Work Sans 內嵌。失敗或太慢就回空字串，出圖退回系統字，不讓匯出整個掛掉。 ──
let fontCssPromise: Promise<string> | null = null;
function embedFontCss(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = (async () => {
      try {
        const cssUrl = 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800&display=swap';
        const css = await (await fetch(cssUrl)).text();
        // 只留基本拉丁子集（含 U+0000-00FF 的那幾塊），其餘子集證照用不到
        const blocks = css.split('@font-face').filter((b) => /U\+0000/.test(b));
        const out: string[] = [];
        for (const b of blocks) {
          const m = b.match(/url\((https:\/\/[^)]+\.woff2)\)/);
          if (!m) continue;
          const data = await toDataUrl(m[1]);
          out.push('@font-face' + b.replace(m[1], data));
        }
        return out.join('\n');
      } catch {
        return '';
      }
    })();
  }
  return fontCssPromise;
}

/** 把一個已經在畫面上（或離畫面但已 append）的證照節點畫成 Blob。 */
async function nodeToBlob(node: HTMLElement, type: 'image/png' | 'image/jpeg', scale: number): Promise<Blob> {
  const w = node.offsetWidth || EXPORT_W;
  const h = node.offsetHeight || Math.round(EXPORT_W * 965 / 1398);

  // 複製一份，把圖片換成 data URL
  const clone = node.cloneNode(true) as HTMLElement;
  const srcImgs = Array.from(node.querySelectorAll('img'));
  const cloneImgs = Array.from(clone.querySelectorAll('img'));
  await Promise.all(srcImgs.map(async (img, i) => {
    const d = await toDataUrl(img.getAttribute('src') || '');
    cloneImgs[i].setAttribute('src', d);
    cloneImgs[i].removeAttribute('crossorigin');
  }));

  // 字型抓太久就不等了，出圖退回系統字，寧可字稍有差也不要卡住使用者
  const fontCss = await withTimeout(embedFontCss(), 4000, '');
  const xml = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style>${fontCss}\n${CERT_CSS}</style>${xml}</div>` +
    `</foreignObject></svg>`;

  const img = new Image();
  img.decoding = 'sync';
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('證照圖片產生失敗'));
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('存檔失敗'))), type, type === 'image/jpeg' ? 0.95 : undefined));
}

/**
 * 給資料＋微調，離畫面渲染一張證照並存成 Blob。
 * 批次時一張一張呼叫，不會同時掛一堆節點。
 */
export async function certToBlob(
  data: CertData, tune: CertTune | undefined,
  opts: { format?: 'png' | 'jpeg'; scale?: number } = {},
): Promise<Blob> {
  const format = opts.format || 'png';
  const scale = opts.scale || 2;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none;opacity:0';
  document.body.appendChild(holder);
  const root = createRoot(holder);
  try {
    await new Promise<void>((res) => {
      root.render(createElement(Cert, { data, tune, width: EXPORT_W }));
      // 等 React 畫完一輪
      requestAnimationFrame(() => requestAnimationFrame(() => res()));
    });
    const node = holder.querySelector('[data-tgc]') as HTMLElement;
    // 等證照裡的圖片真的載完
    await Promise.all(Array.from(node.querySelectorAll('img')).map((im) =>
      im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); })));
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;
    return await nodeToBlob(node, format === 'jpeg' ? 'image/jpeg' : 'image/png', scale);
  } finally {
    root.unmount();
    holder.remove();
  }
}

// ── 存檔 ──────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── 批次：打包成一個 ZIP（store，不壓縮；PNG 本來就壓過了） ──────
// 自己寫是為了不加任何套件。只做最單純的 store + CRC32。

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

export async function zipBlobs(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255]);
  const u32 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]);
  const cat = (...arrs: Uint8Array[]) => {
    const total = arrs.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
    return out;
  };

  for (const f of files) {
    const name = enc.encode(f.name);
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const crc = crc32(data);
    const local = cat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0),
      name, data,
    );
    chunks.push(local);
    central.push(cat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
      name,
    ));
    offset += local.length;
  }

  const centralBlob = cat(...central);
  const end = cat(
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralBlob.length), u32(offset), u16(0),
  );
  return new Blob([cat(...chunks), centralBlob, end], { type: 'application/zip' });
}
