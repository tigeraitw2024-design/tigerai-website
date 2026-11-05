/**
 * 證照本體的樣式（字串常數，預覽與匯出共用一份）。
 *
 * 兩種版型，一份結構用 CSS 變數切換：
 *   data-style="a"（預設）＝原本的深框經典版
 *   data-style="b"          ＝Robin 提供的 s2c 版（亮粉＋外光暈＋大圓角＋鏤空圓環把手）
 * 字型兩版都用微軟正黑體。尺寸一樣由 --cw（像素）決定，--u = 寬/100。
 */
export const CERT_CSS = `
.tgc{ --cw: 900px; --u: calc(var(--cw) / 100);
  --pink:#ea4b71; --card:#ebebeb; --ink:#15151c; --ink2:#2b2b33; --sub:#5b5b64;
  --bg:radial-gradient(125% 95% at 50% 20%,#5c2841 0%,#3d1c30 40%,#26142b 74%,#160e1c 100%);
  --framepad:2.3; --cardbd:0.26; --cardrad:1.9; --glow:none; --cardpy:4.4; --cardpx:7; --cardpb:3.6;
  --notchsz:3.4; --notchbg:var(--pink); --notchbw:0.42; --notchbc:#f0d6e0; --notchring:0; --notchshadow:none; --nl:2.3; --nr:2.8;
  --stackgap:1.3; --logomb:0;
  --titlesz:3.75; --titlew:400; --titlemt:1.1;
  --namesz:2.7; --namew:700; --namemt:0.5; --nrulew:36; --nruleh:0.16;
  --bodysz:1.34; --bodymw:60; --bodymt:3.4;
  --coursesz:3.15; --coursew:700; --coursecol:var(--ink); --coursemt:1.1;
  --footpad:7; --footmt:0; --footgap:0.65; --valsz:1.6; --valw:400; --fmark:2.2; --frulew:18; --fruleh:0.15; --flblsz:1.4;
  --boltsz:3.9; --boltop:1;
  position:relative; width:var(--cw); aspect-ratio:1398/965; border-radius:calc(var(--u)*0.72); overflow:hidden;
  background:var(--bg); padding:calc(var(--u)*var(--framepad)); box-sizing:border-box;
  font-family:"Microsoft JhengHei","微軟正黑體","PingFang TC","Noto Sans TC","Segoe UI",sans-serif; font-weight:400; line-height:1.5; }
.tgc[data-style="b"]{ --pink:#ff4b8b; --card:#f3f4f6; --ink:#111827; --ink2:#1f2937; --sub:#6b7280;
  --bg:linear-gradient(135deg,#2d0a21 0%,#1a0515 100%);
  --framepad:2.6; --cardbd:0.3; --cardrad:4; --glow:0 0 0 calc(var(--u)*0.5) rgba(255,75,139,.2); --cardpy:6; --cardpx:5; --cardpb:6;
  --notchsz:3.2; --notchbg:var(--pink); --notchbw:0.42; --notchbc:#ffffff; --notchring:0; --notchshadow:0 0 0 calc(var(--u)*0.32) var(--pink); --nl:2.6; --nr:2.6;
  --stackgap:0; --logomb:4;
  --titlesz:4; --titlew:500; --titlemt:0;
  --namesz:3.5; --namew:700; --namemt:3; --nrulew:35; --nruleh:0.2;
  --bodysz:1.5; --bodymw:52; --bodymt:4.6;
  --coursesz:3; --coursew:500; --coursecol:var(--ink2); --coursemt:1.6;
  --footpad:5; --footmt:5; --footgap:0.5; --valsz:1.4; --valw:700; --fmark:1.9; --frulew:18; --fruleh:0.2; --flblsz:1.35;
  --boltsz:4; --boltop:0.4; }
.tgc *{ box-sizing:border-box; }
.tgc__card{ position:relative; height:100%; width:100%; background:var(--card);
  border:calc(var(--u)*var(--cardbd)) solid var(--pink); box-shadow:var(--glow); border-radius:calc(var(--u)*var(--cardrad));
  display:flex; flex-direction:column; justify-content:space-between; align-items:center;
  padding:calc(var(--u)*var(--cardpy)) calc(var(--u)*var(--cardpx)) calc(var(--u)*var(--cardpb)); text-align:center; overflow:hidden; }
.tgc__notch{ position:absolute; top:50%; width:calc(var(--u)*var(--notchsz)); height:calc(var(--u)*var(--notchsz)); border-radius:50%;
  background:var(--notchbg); border:calc(var(--u)*var(--notchbw)) solid var(--notchbc); box-shadow:var(--notchshadow);
  transform:translate(-50%,-50%); z-index:3; }
.tgc__notch::after{ content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:40%; height:40%; border-radius:50%; border:calc(var(--u)*0.14) solid rgba(255,75,139,.4); opacity:var(--notchring); }
.tgc__notch.l{ left:calc(var(--u)*var(--nl)); } .tgc__notch.r{ left:calc(100% - var(--u)*var(--nr)); }
.tgc__stack{ display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*var(--stackgap)); width:100%; }
.tgc__logo{ display:flex; align-items:center; gap:calc(var(--u)*1.1); color:var(--ink); margin-bottom:calc(var(--u)*var(--logomb)); }
.tgc__logo .tgc__mark{ height:calc(var(--u)*3); width:auto; display:block; }
.tgc__logo .tgc__divider{ width:calc(var(--u)*0.14); height:calc(var(--u)*2.6); background:#b4b4bb; }
.tgc__logo .tgc__academy{ font-size:calc(var(--u)*2.35); font-weight:400; color:var(--ink2); letter-spacing:.01em; }
.tgc__title{ font-size:calc(var(--u)*var(--titlesz)); color:var(--pink); font-weight:var(--titlew); margin:calc(var(--u)*var(--titlemt)) 0 0; line-height:1; }
.tgc__presented{ font-size:calc(var(--u)*1.38); color:var(--sub); margin-top:calc(var(--u)*0.5); }
.tgc__name{ font-size:calc(var(--u)*var(--namesz)); font-weight:var(--namew); color:var(--ink); line-height:1.1; max-width:80%;
  overflow-wrap:anywhere; margin-top:calc(var(--u)*var(--namemt)); }
.tgc__namerule{ width:calc(var(--u)*var(--nrulew)); max-width:76%; height:calc(var(--u)*var(--nruleh)); background:var(--pink);
  margin-top:calc(var(--u)*0.9); border-radius:calc(var(--u)*1); }
.tgc__body{ font-size:calc(var(--u)*var(--bodysz)); color:var(--sub); max-width:calc(var(--bodymw)*1%); line-height:1.6; margin-top:calc(var(--u)*var(--bodymt)); }
.tgc__course{ font-size:calc(var(--u)*var(--coursesz)); font-weight:var(--coursew); color:var(--coursecol); margin-top:calc(var(--u)*var(--coursemt));
  line-height:1.1; max-width:80%; overflow-wrap:anywhere; }
.tgc__footer{ display:flex; justify-content:space-between; align-items:flex-end; width:100%; gap:calc(var(--u)*2);
  padding:0 calc(var(--u)*var(--footpad)); margin-top:calc(var(--u)*var(--footmt)); }
.tgc__foot{ display:flex; flex-direction:column; align-items:center; gap:calc(var(--u)*var(--footgap)); min-width:0; }
.tgc__foot .tgc__val{ font-size:calc(var(--u)*var(--valsz)); font-weight:var(--valw); color:var(--ink); white-space:nowrap; }
.tgc__foot .tgc__mark{ height:calc(var(--u)*var(--fmark)); color:var(--ink); display:block; }
.tgc__foot .tgc__rule{ width:calc(var(--u)*var(--frulew)); height:calc(var(--u)*var(--fruleh)); background:var(--pink); border-radius:calc(var(--u)*1); }
.tgc__foot .tgc__lbl{ font-size:calc(var(--u)*var(--flblsz)); color:var(--sub); }
.tgc__bolt img{ height:calc(var(--u)*var(--boltsz)); width:auto; display:block; opacity:var(--boltop); }
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
