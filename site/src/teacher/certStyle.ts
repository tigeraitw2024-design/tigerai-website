/**
 * 證照本體的樣式（字串常數，預覽與匯出共用一份）。
 *
 * 單一版型（原 B：亮粉＋外光暈＋大圓角＋三層缺口）。字型微軟正黑體。
 * 版面上的每一塊（logo／標題／presented／姓名／說明／證照名稱／日期／閃電／Education Team）
 * 都包在 .tgc__blk 裡，可各自位移(--bx,--by，證照寬的%)＋縮放(--bsc)＋顯示/隱藏，
 * 由設定頁控制、全站套用。簽名／紅印／藍章是另外的絕對定位覆蓋層。
 * 尺寸由 --cw（像素）決定，--u = 寬/100。
 */
export const CERT_CSS = `
.tgc{ --cw: 900px; --u: calc(var(--cw) / 100); --pink:#ff4b8b; --card:#f3f4f6; --ink:#111827; --ink2:#1f2937; --sub:#6b7280;
  position:relative; width:var(--cw); aspect-ratio:1398/965; border-radius:calc(var(--u)*0.72); overflow:hidden;
  background:linear-gradient(135deg,#2d0a21 0%,#1a0515 100%); padding:calc(var(--u)*2.6); box-sizing:border-box;
  font-family:"Microsoft JhengHei","微軟正黑體","PingFang TC","Noto Sans TC","Segoe UI",sans-serif; font-weight:400; line-height:1.5; }
.tgc *{ box-sizing:border-box; }
.tgc__card{ position:relative; height:100%; width:100%; background:var(--card);
  border:calc(var(--u)*0.3) solid var(--pink); box-shadow:0 0 0 calc(var(--u)*0.5) rgba(255,75,139,.2); border-radius:calc(var(--u)*4);
  display:flex; flex-direction:column; justify-content:space-between; align-items:center;
  padding:calc(var(--u)*6) calc(var(--u)*5); text-align:center; overflow:hidden; }
.tgc__notch{ position:absolute; top:50%; width:calc(var(--u)*3.2); height:calc(var(--u)*3.2); border-radius:50%;
  background:var(--pink); border:calc(var(--u)*0.42) solid #fff; box-shadow:0 0 0 calc(var(--u)*0.32) var(--pink);
  transform:translate(-50%,-50%); z-index:3; }
.tgc__notch.l{ left:calc(var(--u)*2.6); } .tgc__notch.r{ left:calc(100% - var(--u)*2.6); }

/* 每一塊：可位移(--bx,--by，證照寬的%)＋縮放(--bsc)。預設 0,0,1 = 原位原大小 */
.tgc__blk{ display:flex; flex-direction:column; align-items:center; width:auto; max-width:92%;
  transform:translate(calc(var(--u)*var(--bx,0)), calc(var(--u)*var(--by,0))) scale(var(--bsc,1)); transform-origin:center; }

.tgc__stack{ display:flex; flex-direction:column; align-items:center; width:100%; }
.tgc__logo{ display:flex; align-items:center; gap:calc(var(--u)*1.1); color:var(--ink); margin-bottom:calc(var(--u)*4); }
.tgc__logo .tgc__mark{ height:calc(var(--u)*3.6); width:auto; display:block; }
.tgc__logo .tgc__divider{ width:calc(var(--u)*0.14); height:calc(var(--u)*2.6); background:#b4b4bb; }
.tgc__logo .tgc__academy{ font-size:calc(var(--u)*2.35); font-weight:400; color:var(--ink2); letter-spacing:.01em; }
.tgc__title{ font-size:calc(var(--u)*4); color:var(--pink); font-weight:500; margin:0; line-height:1; }
.tgc__presented{ font-size:calc(var(--u)*1.38); color:var(--sub); margin-top:calc(var(--u)*0.5); }
.tgc__name{ font-size:calc(var(--u)*3.5); font-weight:700; color:var(--ink); line-height:1.1; max-width:100%;
  overflow-wrap:anywhere; margin-top:calc(var(--u)*3); }
.tgc__namerule{ width:calc(var(--u)*35); height:calc(var(--u)*0.2); background:var(--pink); margin-top:calc(var(--u)*0.9); border-radius:calc(var(--u)*1); }
.tgc__body{ font-size:calc(var(--u)*1.5); color:var(--sub); max-width:calc(var(--u)*52); line-height:1.6; margin-top:calc(var(--u)*4.6); }
.tgc__course{ font-size:calc(var(--u)*3); font-weight:500; color:var(--ink2); margin-top:calc(var(--u)*1.6);
  line-height:1.1; max-width:100%; overflow-wrap:anywhere; }
.tgc__footer{ display:flex; justify-content:space-between; align-items:flex-end; width:100%; gap:calc(var(--u)*2);
  padding:0 calc(var(--u)*12); margin-top:calc(var(--u)*5); }
.tgc__foot{ display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*0.5); min-width:0; }
.tgc__foot .tgc__val{ font-size:calc(var(--u)*1.4); font-weight:700; color:var(--ink); white-space:nowrap; }
.tgc__foot .tgc__mark{ height:calc(var(--u)*1.9); color:var(--ink); --marknodes:var(--pink); display:block; }
.tgc__foot .tgc__rule{ width:calc(var(--u)*18); height:calc(var(--u)*0.2); background:var(--pink); border-radius:calc(var(--u)*1); }
.tgc__foot .tgc__lbl{ font-size:calc(var(--u)*1.35); color:var(--sub); }
.tgc__bolt img{ height:calc(var(--u)*4.4); width:auto; display:block; opacity:.4; }

.tgc__endorse{ position:absolute; left:var(--sx,63%); top:var(--sy,72%); transform:translate(-50%,-50%);
  display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*0.35); z-index:2; pointer-events:none; }
.tgc__sig{ width:calc(var(--u)*var(--sigw,17)); height:auto; display:block; }
.tgc__sigrule{ width:calc(var(--u)*15); height:calc(var(--u)*0.1); background:var(--ink); opacity:.5; }
.tgc__sigcap{ font-size:calc(var(--u)*1.18); color:var(--ink); font-weight:600; white-space:nowrap; }
.tgc__seal{ position:absolute; left:var(--kx,84%); top:var(--ky,75%); width:var(--ksz,16%);
  transform:translate(-50%,-50%) rotate(var(--krot,-5deg)); opacity:var(--kop,.9); z-index:4; pointer-events:none; }
.tgc__stamp{ position:absolute; left:var(--stx,80%); top:var(--sty,72%); width:var(--stsz,24%);
  transform:translate(-50%,-50%); z-index:4; pointer-events:none; }
.tgc__stamp svg{ width:100%; height:auto; display:block; }
.tgc__serial{ position:absolute; left:calc(var(--u)*2.6); bottom:calc(var(--u)*1.2); z-index:5;
  font-size:calc(var(--u)*0.95); letter-spacing:.03em; color:var(--sub); white-space:nowrap; }
`.trim();
