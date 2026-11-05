/**
 * 證照本體的樣式，獨立成一個字串常數。
 *
 * 為什麼是字串而不是 .css 檔：預覽（畫面上）跟匯出（存成 PNG/JPG）要用
 * 「同一份」樣式，不能有兩套會走樣。匯出是把證照節點序列化進一張 SVG 的
 * <foreignObject> 再畫到 canvas，那張 SVG 讀不到外部樣式表，只能把 CSS
 * 直接塞進它的 <style>。所以樣式寫成字串，預覽跟匯出都注入同一份。
 *
 * 尺寸的作法：整張證照的寬度由 --cw（像素）決定，單位 --u = 寬/100。
 * 原本 n8n 版式用的是 cqw（容器寬的 1%），這裡換成 calc(var(--u)*N)——
 * 數字完全一樣，但變成「給定寬度就完全確定」，所以：
 *   預覽：量父層寬度，把 --cw 設成那個值 → 任意大小都清晰、版面不變
 *   匯出：--cw 設成 1398（原生寬），canvas 再放大 2 倍 → 列印級解析度
 * 兩邊像素等比，所見即所得。
 */
export const CERT_CSS = `
.tgc{ --cw: 900px; --u: calc(var(--cw) / 100); --pink:#ea4b71; --card:#ebebeb; --ink:#15151c; --ink2:#2b2b33; --sub:#5b5b64;
  position:relative; width:var(--cw); aspect-ratio:1398/965; border-radius:calc(var(--u)*0.72); overflow:hidden;
  background:radial-gradient(125% 95% at 50% 20%,#5c2841 0%,#3d1c30 40%,#26142b 74%,#160e1c 100%);
  padding:calc(var(--u)*2.3); box-sizing:border-box;
  font-family:"Work Sans","Segoe UI",system-ui,sans-serif; line-height:1.5; }
.tgc *{ box-sizing:border-box; }
.tgc__card{ position:relative; height:100%; width:100%; background:var(--card); border:calc(var(--u)*0.26) solid var(--pink);
  border-radius:calc(var(--u)*1.9); display:flex; flex-direction:column; justify-content:space-between; align-items:center;
  padding:calc(var(--u)*4.4) calc(var(--u)*7) calc(var(--u)*3.6); text-align:center; overflow:hidden; }
.tgc__notch{ position:absolute; top:50%; width:calc(var(--u)*3.4); height:calc(var(--u)*3.4); border-radius:50%;
  background:var(--pink); border:calc(var(--u)*0.42) solid #f0d6e0; transform:translate(-50%,-50%); z-index:3; }
.tgc__notch.l{ left:calc(var(--u)*2.3); } .tgc__notch.r{ left:calc(100% - var(--u)*2.3); }
.tgc__stack{ display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*1.3); width:100%; }
.tgc__logo{ display:flex; align-items:center; gap:calc(var(--u)*1.1); color:var(--ink); }
.tgc__logo .tgc__mark{ height:calc(var(--u)*2.9); width:auto; display:block; }
.tgc__logo .tgc__divider{ width:calc(var(--u)*0.14); height:calc(var(--u)*2.6); background:#b4b4bb; }
.tgc__logo .tgc__academy{ font-size:calc(var(--u)*2.35); font-weight:400; color:var(--ink2); letter-spacing:.01em; }
.tgc__title{ font-size:calc(var(--u)*3.75); color:var(--pink); font-weight:500; margin:calc(var(--u)*1.1) 0 0; line-height:1; }
.tgc__presented{ font-size:calc(var(--u)*1.32); color:var(--sub); margin-top:calc(var(--u)*0.3); }
.tgc__name{ font-size:calc(var(--u)*2.7); font-weight:700; color:var(--ink); line-height:1.1; max-width:72%;
  overflow-wrap:anywhere; margin-top:calc(var(--u)*0.5); }
.tgc__namerule{ width:calc(var(--u)*36); max-width:74%; height:calc(var(--u)*0.16); background:var(--pink);
  margin-top:calc(var(--u)*0.6); border-radius:calc(var(--u)*1); }
.tgc__body{ font-size:calc(var(--u)*1.34); color:var(--sub); max-width:60%; line-height:1.6; margin-top:calc(var(--u)*1.2); }
.tgc__course{ font-size:calc(var(--u)*3.15); font-weight:600; color:var(--ink); margin-top:calc(var(--u)*1.1);
  line-height:1.1; max-width:80%; overflow-wrap:anywhere; }
.tgc__footer{ display:flex; justify-content:space-between; align-items:flex-end; width:100%; gap:calc(var(--u)*2); }
.tgc__foot{ display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*0.55); min-width:0; }
.tgc__foot .tgc__val{ font-size:calc(var(--u)*1.42); font-weight:700; color:var(--ink); white-space:nowrap; }
.tgc__foot .tgc__mark{ height:calc(var(--u)*1.9); color:var(--ink); display:block; }
.tgc__foot .tgc__rule{ width:calc(var(--u)*15); height:calc(var(--u)*0.13); background:var(--pink); border-radius:calc(var(--u)*1); }
.tgc__foot .tgc__lbl{ font-size:calc(var(--u)*1.22); color:var(--sub); }
.tgc__bolt{ color:#8a8a94; } .tgc__bolt svg{ height:calc(var(--u)*3.4); display:block; }
.tgc__endorse{ position:absolute; left:var(--sx,63%); top:var(--sy,72%); transform:translate(-50%,-50%);
  display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*0.35); z-index:2; pointer-events:none; }
.tgc__sig{ width:calc(var(--u)*var(--sigw,17)); height:auto; display:block; }
.tgc__sigrule{ width:calc(var(--u)*15); height:calc(var(--u)*0.1); background:var(--ink); opacity:.5; }
.tgc__sigcap{ font-size:calc(var(--u)*1.18); color:var(--ink); font-weight:600; white-space:nowrap; }
.tgc__seal{ position:absolute; left:var(--kx,84%); top:var(--ky,75%); width:var(--ksz,16%);
  transform:translate(-50%,-50%) rotate(var(--krot,-5deg)); opacity:var(--kop,.9); z-index:4; pointer-events:none; }
`.trim();
