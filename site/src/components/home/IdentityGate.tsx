import { useEffect, useRef, useState } from 'react';

/**
 * 身分閘門。移植自 design/首頁.dc.html 的 00 區。
 *
 * 蓋在首頁上的固定覆蓋層（z-index 380），自己是一個可捲動容器，裡面三層：
 *
 *   第一層  sticky 100vh，44px 格線底、右上虎金光暈 14 秒漂移、
 *           滑鼠位置 240px 圓形遮罩內的格線轉虎金發光。
 *           中間是「你是 ＿＿＿」的垂直輪播加同步的主副標。
 *           這一層一開始 opacity .08、往下推 90px，隨著捲動逐漸清楚。
 *   第二層  margin-top:-100vh 蓋在第一層上面，是 H1「把 AI 變成你的員工」，
 *           捲動時往上移開，露出底下的第一層。
 *   第三層  100vh 的空白，讓捲動有足夠行程。
 *
 * 輪播：三種身分各 5 個字，每 3.8 秒換一次。清單放四筆（最後一筆重複第一筆），
 * 換到第 4 筆時等 0.82 秒再把 transition 關掉瞬間跳回第 1 筆，所以看起來是
 * 無縫循環。transition 用 cubic-bezier(.34,1.56,.64,1)，這是全站唯一允許
 * 輕微回彈的地方（使用者指定）。
 *
 * 點任一處或右上「直接進官網」就關閘門，並通知 Hero 開始筆電開機動畫。
 *
 * Robin 要求「看過一次就不再播」：關掉時寫進 localStorage，
 * 下次進站由 <head> 裡的小腳本在繪製前就掛上 data-tg-intro-seen，
 * 這支元件讀到就直接不顯示、立刻發 boot 事件，不會閃一下。
 */

const IDENTITIES = ['企業負責人', '二代接班人', '專業經理人'];
const ROW_HEIGHT = 160;

const HEADS = ['AI 的帳，先算給你看', '接班，從 AI 開始', '讓 AI 變成你的政績'];
const SUBS = [
  '預算先設好、超標自動停；資料在自己公司，誰問過什麼都查得到。',
  '數字會替你說話：花了多少錢、省了多少時間，攤在同一個畫面上，長輩一看就懂。',
  '5 分鐘，測出你公司的 AI 用到什麼程度。第一步是政府補助的 30 小時課程，公司一毛錢都不用出。',
];

const SEEN_KEY = 'tg-intro-seen';
const GRID = `linear-gradient(rgba(14,14,13,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(14,14,13,.05) 1px,transparent 1px)`;
const GRID_GLOW = `linear-gradient(rgba(236,164,43,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(236,164,43,.5) 1px,transparent 1px)`;
const BIG = {
  height: ROW_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  fontFamily: "'Manrope','Noto Sans TC',sans-serif",
  fontSize: 'clamp(52px,8.5vw,120px)',
  fontWeight: 900,
  letterSpacing: '-.02em',
  whiteSpace: 'nowrap' as const,
};

/** 告訴 Hero 可以開始掀蓋開機了。用 DOM 事件，兩個 island 之間不用共用狀態。 */
function fireBoot() {
  document.documentElement.dataset.tgBoot = '1';
  window.dispatchEvent(new CustomEvent('tg:boot'));
}

export default function IdentityGate() {
  // 看過就不顯示。這個判斷在 <head> 的小腳本就做過一次，這裡只是讀結果。
  const seen = typeof document !== 'undefined' && document.documentElement.dataset.tgIntroSeen === '1';
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(seen);
  const [idx, setIdx] = useState(0);
  const [snap, setSnap] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const reveal = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const glows = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (gone) {
      fireBoot();
      return;
    }
  }, [gone]);

  // 輪播。第 4 筆（重複的第 1 筆）停 0.82 秒後關掉 transition 瞬間跳回開頭
  useEffect(() => {
    if (gone || leaving) return;
    const t = setInterval(() => {
      setIdx((n) => {
        const next = n + 1;
        if (next === 3) {
          setTimeout(() => {
            setIdx(0);
            setSnap(true);
          }, 820);
        }
        setSnap(false);
        return next;
      });
    }, 3800);
    return () => clearInterval(t);
  }, [gone, leaving]);

  // 滑鼠：格線發光的圓心，以及大字的 3D 傾斜跟隨
  useEffect(() => {
    if (gone) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        for (const el of glows.current) {
          if (!el) continue;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', `${e.clientX - r.left}px`);
          el.style.setProperty('--my', `${e.clientY - r.top}px`);
          el.style.opacity = '1';
        }
        const t2 = tilt.current;
        if (!t2) return;
        const r2 = t2.getBoundingClientRect();
        const near =
          r2.width &&
          e.clientX > r2.left - 80 && e.clientX < r2.right + 80 &&
          e.clientY > r2.top - 80 && e.clientY < r2.bottom + 80;
        if (near) {
          const dx = Math.max(-1, Math.min(1, (e.clientX - (r2.left + r2.width / 2)) / (r2.width / 2)));
          const dy = Math.max(-1, Math.min(1, (e.clientY - (r2.top + r2.height / 2)) / (r2.height / 2)));
          t2.style.transform =
            `perspective(900px) rotateX(${(-dy * 9).toFixed(2)}deg) rotateY(${(dx * 12).toFixed(2)}deg)` +
            ` translateX(${(dx * 12).toFixed(1)}px) translateY(${(dy * 8).toFixed(1)}px)`;
        } else if (t2.style.transform) {
          t2.style.transform = '';
        }
      });
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [gone]);

  // 捲動揭露：第一層隨著閘門自己的 scrollTop 從 .08 變清楚、從下方升上來
  useEffect(() => {
    if (gone) return;
    const sync = () => {
      const g = scroller.current;
      const t = reveal.current;
      if (!g || !t) return;
      const p = Math.min(1, Math.max(0, g.scrollTop / (window.innerHeight * 0.92)));
      t.style.opacity = String(Math.round((0.08 + 0.92 * p) * 100) / 100);
      t.style.transform = `translateY(${Math.round((1 - p) * 90)}px)`;
    };
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    const t = setTimeout(sync, 400);
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [gone]);

  const close = () => {
    if (leaving) return;
    setLeaving(true);
    fireBoot();
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // 無痕視窗或封鎖網站資料時會丟錯，不影響本次瀏覽
    }
  };

  if (gone) return null;

  const i = idx % 3;
  const subLines = SUBS[i].split('。').filter((s) => s.trim()).map((s) => `${s}。`);

  const glowLayer = (k: number) => (
    <div
      ref={(el) => (glows.current[k] = el)}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity .3s cubic-bezier(.22,.61,.36,1)',
        backgroundImage: GRID_GLOW,
        backgroundSize: '44px 44px',
        backgroundPosition: 'calc(50% - 22px) 0',
        WebkitMaskImage: 'radial-gradient(240px circle at var(--mx,50%) var(--my,50%),#000 0%,transparent 72%)',
        maskImage: 'radial-gradient(240px circle at var(--mx,50%) var(--my,50%),#000 0%,transparent 72%)',
      }}
    />
  );

  return (
    <div
      ref={scroller}
      data-gate="1"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 380,
        background: '#FAFAF8',
        color: '#0E0E0D',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...(leaving
          ? { animation: 'tg-sp-out .6s cubic-bezier(.22,.61,.36,1) both', pointerEvents: 'none' as const }
          : {}),
      }}
    >
      {/* 第一層：sticky，格線底加光暈，中間是身分輪播 */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundImage: GRID,
          backgroundSize: '44px 44px',
          backgroundPosition: 'calc(50% - 22px) 0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-32%',
            right: '-10%',
            width: 620,
            height: 620,
            background: 'radial-gradient(closest-side,rgba(236,164,43,.14),transparent 70%)',
            pointerEvents: 'none',
            animation: 'tg-drift 14s ease-in-out infinite alternate',
          }}
        />
        {glowLayer(0)}

        <div
          ref={reveal}
          onClick={close}
          style={{
            opacity: 0.08,
            transform: 'translateY(90px)',
            position: 'relative',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 16,
            padding: 24,
            cursor: 'pointer',
          }}
        >
          <h2 style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 400, letterSpacing: '.12em', color: 'var(--fg-tertiary)', margin: 0 }}>
            你是誰？
          </h2>

          <div
            ref={tilt}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              transition: 'transform .25s cubic-bezier(.22,.61,.36,1)',
            }}
          >
            {/* 「你是」固定靠左不動 */}
            <span style={BIG}>你是</span>
            {/* 右側垂直輪播，上下用漸層遮罩淡出 */}
            <div
              style={{
                height: ROW_HEIGHT,
                overflow: 'hidden',
                WebkitMaskImage: 'linear-gradient(to bottom,transparent 0,#000 26%,#000 74%,transparent 100%)',
                maskImage: 'linear-gradient(to bottom,transparent 0,#000 26%,#000 74%,transparent 100%)',
              }}
            >
              <div
                style={{
                  transform: `translateY(-${idx * ROW_HEIGHT}px)`,
                  transition: snap ? 'none' : 'transform .7s cubic-bezier(.34,1.56,.64,1)',
                }}
              >
                {/* 最後一筆重複第一筆，跳回開頭時看不出接縫 */}
                {[...IDENTITIES, IDENTITIES[0]].map((name, k) => (
                  <div key={k} style={{ ...BIG, justifyContent: 'flex-start' }}>{name}</div>
                ))}
              </div>
            </div>
          </div>

          <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 'clamp(28px,2.6vw,36px)', fontWeight: 900, letterSpacing: '-.02em', color: 'var(--tiger-700)' }}>
            {HEADS[i]}
          </b>
          {/* min-height 固定住，換身分時副標行數不同也不會跳版 */}
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: 1.7, color: 'var(--fg-secondary)', minHeight: 55 }}>
            {subLines.map((ln, k) => <span key={k} style={{ display: 'block' }}>{ln}</span>)}
          </p>
        </div>
      </div>

      {/* 第二層：蓋在第一層上面的 H1，捲動時往上移開 */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: '-100vh',
          height: '100vh',
          background: '#FAFAF8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          borderBottom: '1px solid rgba(14,14,13,.1)',
          boxShadow: '0 12px 32px rgba(14,14,13,.05),0 56px 120px rgba(14,14,13,.09)',
          backgroundImage: GRID,
          backgroundSize: '44px 44px',
          backgroundPosition: 'calc(50% - 22px) 0',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center,rgba(250,250,248,0) 30%,rgba(250,250,248,.92) 80%)', pointerEvents: 'none' }} />
        {glowLayer(1)}

        <a
          href="#top"
          className="tg-skipgate"
          onClick={(e) => {
            e.preventDefault();
            close();
          }}
          style={{
            position: 'absolute', top: 20, right: 32,
            fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '.08em',
            color: 'var(--fg-tertiary)', textDecoration: 'none',
            animation: 'tg-in .5s 3.6s both',
          }}
        >
          直接進官網 →
        </a>
        {/* 主標沒有句號，照全站規則 */}
        <h1 style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 'clamp(44px,6.2vw,88px)', fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.1, margin: '0 0 14px', textAlign: 'center', animation: 'tg-in .5s 3.35s both' }}>
          把 AI 變成你的員工
        </h1>
        <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.7, color: 'var(--fg-secondary)', margin: '0 0 40px', textAlign: 'center', animation: 'tg-in .5s 3.45s both' }}>
          資料不出公司，每個部門多一位 AI 同事。
        </p>
        <span style={{ width: 1, height: 112, background: 'linear-gradient(to bottom,rgba(14,14,13,.4),transparent)', animation: 'tg-in .5s 3.55s both' }} />
      </div>

      {/* 第三層：空白，給捲動足夠行程 */}
      <div style={{ height: '100vh', pointerEvents: 'none' }} />
    </div>
  );
}
