import { useEffect, useRef, useState } from 'react';
import Console from '../console/ConsoleApp.jsx';

/**
 * Hero：馬賽克掃場標題 ＋ 筆電掀蓋 ＋ 開機畫面 ＋ 主控台。
 * 移植自 design/首頁.dc.html 的 01 區。
 */

const BOOT_ATTR = 'tgBoot';

/** 等身分閘門關掉才開始掀蓋開機。閘門關掉時會掛 data-tg-boot 並發 tg:boot 事件。 */
function useBooted() {
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset[BOOT_ATTR] === '1') {
      setBooted(true);
      return;
    }
    const on = () => setBooted(true);
    window.addEventListener('tg:boot', on);
    return () => window.removeEventListener('tg:boot', on);
  }, []);
  return booted;
}

/**
 * 一行馬賽克掃場文字。
 *
 * 一道波 1 秒從句首掃到句尾。每個字的相位 ph = s − i，依序經過四個狀態：
 *   ph ≥ 3.2   白色正字
 *   ph ≥ 2.6   金色正字（tiger-400）
 *   ph ≥ 1.3   虎金馬賽克格
 *   ph ≥ 0     灰白馬賽克格（rgba(255,255,255,.32)）
 *
 * 馬賽克是 3 欄 × 4 列共 12 格，每格有 78% 機率以 0.4 到 1.0 的隨機透明度出現，
 * 所以每次重繪都在閃。掃完之後 cellColor 是 null，格子全部消失只留正字。
 *
 * reduced-motion 下直接把 s 設成超過結尾，一次跳到白色正字。
 */
function MosaicLine({ text, go, delay }: { text: string; go: boolean; delay: number }) {
  const COLS = 3;
  const ROWS = 4;
  const CELLS = COLS * ROWS;
  const [s, setS] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!go || started.current) return;
    started.current = true;
    const len = [...text].length;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setS(len + 9);
      return;
    }
    let timer: ReturnType<typeof setInterval>;
    const kickoff = setTimeout(() => {
      const t0 = performance.now();
      const total = 1000;
      const span = len + 3.8;
      timer = setInterval(() => {
        const next = ((performance.now() - t0) / total) * span;
        setS(next);
        if (next > span) clearInterval(timer);
      }, 40);
    }, delay);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [go, text, delay]);

  const cur = s == null ? -1 : s;

  return (
    <span style={{ display: 'inline-block' }}>
      {[...text].map((ch, i) => {
        const ph = cur - i;
        let glyphOp = 0;
        let glyphColor: string | undefined;
        let cellColor: string | null = null;
        if (ph >= 3.2) glyphOp = 1;
        else if (ph >= 2.6) { glyphOp = 1; glyphColor = 'var(--tiger-400)'; }
        else if (ph >= 1.3) cellColor = 'var(--tiger-500)';
        else if (ph >= 0) cellColor = 'rgba(255,255,255,.32)';

        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
            <span style={{ opacity: glyphOp, color: glyphColor }}>{ch === ' ' ? ' ' : ch}</span>
            {cellColor && (
              <span style={{ position: 'absolute', inset: '6% 2%', pointerEvents: 'none' }}>
                {Array.from({ length: CELLS }, (_, k) => (
                  <span
                    key={k}
                    style={{
                      position: 'absolute',
                      left: `${(k % COLS) * (100 / COLS)}%`,
                      top: `${Math.floor(k / COLS) * (100 / ROWS)}%`,
                      width: `${100 / COLS}%`,
                      height: `${100 / ROWS}%`,
                      background: cellColor,
                      opacity: Math.random() < 0.78 ? 0.4 + 0.6 * Math.random() : 0,
                    }}
                  />
                ))}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export default function HeroLaptop() {
  const booted = useBooted();
  const [t, setT] = useState(0);
  const [fs, setFs] = useState(false);
  const usedFs = useRef(false);
  const raf = useRef(0);

  /**
   * 主控台要等掛載到瀏覽器之後才渲染。
   *
   * 它在元件本體第一行就呼叫 window.matchMedia，而 Astro 會在建置時先把
   * island 在 Node 裡渲染一次（為了讓 HTML 有內容、Google 讀得到），
   * 那時候沒有 window，會直接爆掉。
   *
   * 與其去改那支 1397 行的原始檔（改了下次跟原型對就對不上），不如讓它
   * 只在瀏覽器端出現。反正螢幕前兩秒半都被開機畫面蓋著，看不出差別，
   * 而且 Hero 的標題文字照樣有預先產生，SEO 不受影響。
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 捲動傾斜：t = clamp(scrollY / 200)，上蓋從 rotateX(28deg) 回正、同時放大
  useEffect(() => {
    const onScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        setT(Math.min(1, Math.max(0, (window.scrollY || 0) / 200)));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  // 全螢幕時 Esc 退出
  useEffect(() => {
    if (!fs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFs(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fs]);

  const toggleFs = () => {
    usedFs.current = true;
    setFs((v) => !v);
  };

  return (
    <>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#ECA42B', marginBottom: 12, animation: 'tg-in .5s 3.15s both' }}>
        開源地端 AI × 可驗證的能力養成
      </span>

      {/* min-height 2.4em 卡住兩行的高度，掃場期間字還沒出現也不會跳版 */}
      <h1 style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 'clamp(34px,5vw,60px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15, margin: '0 0 40px', maxWidth: '24ch', textWrap: 'pretty', minHeight: '2.4em' }}>
        <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          <MosaicLine text="你的資料不出機房，" go={booted} delay={200} />
        </span>
        <br />
        <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          <MosaicLine text="每個部門多一位 AI 同事。" go={booted} delay={560} />
        </span>
      </h1>

      <div
        style={{
          width: 'min(1240px,100%)',
          ...(fs
            ? { perspective: 'none', animation: 'none' }
            : usedFs.current
              ? { perspective: '2000px', animation: 'none' }
              : { perspective: '2000px', animation: 'tg-in .6s 3.3s both' }),
        }}
      >
        <div
          style={{
            transformOrigin: '50% 20%',
            ...(fs
              ? {}
              : {
                  willChange: 'transform',
                  transform: `rotateX(${(28 * (1 - t)).toFixed(2)}deg) scale(${(0.9 + 0.1 * t).toFixed(3)})`,
                }),
          }}
        >
          {/* 筆電外框：銀色漸層機身 */}
          <div
            style={{
              border: '1px solid #C7C5C1',
              background: 'linear-gradient(180deg,#F4F3F1,#D9D7D3)',
              padding: 14,
              boxShadow: '0 32px 64px rgba(14,14,13,.35),inset 0 2px 0 rgba(255,255,255,.7)',
              ...(fs ? { position: 'fixed' as const, inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column' as const } : {}),
            }}
          >
            {/* 螢幕 */}
            <div
              style={{
                position: 'relative',
                background: '#FFFFFF',
                color: '#0E0E0D',
                textAlign: 'left',
                border: '2px solid #0E0E0D',
                height: fs ? 'auto' : 'clamp(460px,62vw,800px)',
                overflow: 'hidden',
                ...(fs ? { flex: 1 } : {}),
              }}
            >
              {/* 主控台 8 站。原型是 <x-import style="height:100%;display:block">，
                  那個 style 掛在掛載容器上，所以這裡包一層而不是傳給元件。
                  onExpand 讓主控台自己切全螢幕，Esc 的處理在上面。 */}
              <div style={{ height: '100%', display: 'block' }}>
                {mounted && <Console onExpand={toggleFs} expanded={fs} startStation={0} />}
              </div>

              {/* 開機畫面：墨黑底、白虎頭、虎金進度線，2.1 秒後淡出 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#0E0E0D',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  pointerEvents: 'none',
                  animation: booted ? 'tg-boot 2.1s .4s both' : 'none',
                }}
              >
                <img src="/assets/logo/white-square-mark.svg" alt="" style={{ width: 56, height: 56 }} />
                <span style={{ display: 'block', width: 160, height: 2, background: 'rgba(255,255,255,.15)', overflow: 'hidden' }}>
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      width: '100%',
                      background: '#ECA42B',
                      transformOrigin: '0 50%',
                      ...(booted ? { animation: 'tg-bootbar .9s 1.1s both' } : { animation: 'none', transform: 'scaleX(0)' }),
                    }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* 轉軸與底座，全螢幕時隱藏 */}
          <div style={{ display: fs ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 96, height: 36, background: 'linear-gradient(180deg,#D9D7D3,#BEBCB8)' }} />
            <div style={{ width: 240, height: 10, background: 'linear-gradient(180deg,#CFCDC9,#AFADA9)' }} />
          </div>
        </div>
      </div>
    </>
  );
}
