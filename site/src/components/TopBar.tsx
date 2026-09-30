import { useEffect, useRef, useState } from 'react';
import { NAV, CTA, type NavKey } from '../nav';

/**
 * 頂欄。初始滿版高 76px，捲動時連續縮成懸浮膠囊。
 *
 * 進度 p = clamp((scrollY − start) / 160, 0, 1)，所有數值在 p 上線性插值，
 * 不是切段。插值的起訖值照 design/*.dc.html 的 renderVals() 一字不改：
 *
 *   高      76 → 56px          margin-top  0 → 12px
 *   寬      min(4000→960px, 100% − 0→32px)
 *   底色    rgba(250,250,248, 1 → .94)
 *   四邊框  rgba(14,14,13, 0 → .14)   底邊框 rgba(14,14,13, .08 → .14)
 *   陰影    0 0→12px 0→28px rgba(14,14,13, 0 → .14)
 *   內距    64 → 24px          logo 高   26 → 21px
 *
 * start：子頁是 0（一捲就開始縮）。首頁要等信任帶捲過去才縮，
 * 所以首頁會傳「信任帶底部 − 76px」進來。
 */
export default function TopBar({
  current,
  start = 0,
  startFrom,
  variant = 'default',
}: {
  current?: NavKey;
  start?: number;
  /**
   * 首頁用：縮放的起點要等某個區塊捲過去才算，所以是「那個元素的底部 − 76px」，
   * 得從 DOM 量。傳選擇器進來（首頁傳信任帶）。量不到就退回 start。
   * 原型寫死在 _onScroll 裡：this._bandEl.offsetTop + offsetHeight - 76。
   */
  startFrom?: string;
  /**
   * 課程頁的頂欄跟其他頁不一樣：底色偏灰一階（#F2F2F1 而非 #FAFAF8），
   * 而且多一條 2px 的深色上邊框。因為那頁的滿版深色 Banner 緊貼在頂欄下方，
   * 需要更強的分隔，不然兩塊會黏成一片。數值照 design/課程.dc.html。
   */
  variant?: 'default' | 'onBanner';
}) {
  const [p, setP] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    // 每次捲動都重新找元素：原型也是這樣（isConnected 檢查），因為 island
    // 掛載的時間點不保證那個區塊已經在 DOM 裡。
    let band: HTMLElement | null = null;
    const startAt = () => {
      if (!startFrom) return start;
      if (!band || !band.isConnected) band = document.querySelector<HTMLElement>(startFrom);
      return band ? band.offsetTop + band.offsetHeight - 76 : start;
    };
    const onScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const next = Math.min(1, Math.max(0, ((window.scrollY || 0) - startAt()) / 160));
        setP((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [start, startFrom]);

  // 線性插值，跟原型一樣取到小數第二位，避免每一幀都產生新字串。
  const l = (a: number, b: number) => Math.round((a + (b - a) * p) * 100) / 100;

  const onBanner = variant === 'onBanner';
  const bar = onBanner
    ? {
        background: `rgba(242,242,241,${l(1, 0.94)})`,
        border: `1px solid rgba(14,14,13,${l(0, 0.14)})`,
        borderTop: `2px solid rgba(14,14,13,${l(0.82, 0.14)})`,
        borderBottom: `1px solid rgba(14,14,13,${l(0.12, 0.14)})`,
      }
    : {
        background: `rgba(250,250,248,${l(1, 0.94)})`,
        border: `1px solid rgba(14,14,13,${l(0, 0.14)})`,
        borderBottom: `1px solid rgba(14,14,13,${l(0.08, 0.14)})`,
      };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'center',
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          height: `${l(76, 56)}px`,
          marginTop: `${l(0, 12)}px`,
          width: `min(${l(4000, 960)}px, calc(100% - ${l(0, 32)}px))`,
          ...bar,
          boxShadow: `0 ${l(0, 12)}px ${l(0, 28)}px rgba(14,14,13,${l(0, 0.14)})`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            width: '100%',
            maxWidth: 1440,
            // 原型這裡先寫 clamp(16px,5vw,64px) 再被 innerStyle 覆寫成固定值，
            // 所以 clamp 實際上沒作用。照原型走，手機版那一輪再處理。
            padding: `0 ${l(64, 24)}px`,
          }}
        >
          <a href="/" style={{ display: 'flex' }}>
            <img
              src="/assets/logo/color-horizontal-black-text.svg"
              alt="TigerAI 虎智科技"
              style={{ height: `${l(26, 21)}px`, display: 'block' }}
            />
          </a>

          <nav style={{ display: 'flex', gap: 24, marginLeft: 24 }}>
            {NAV.map((item) => {
              const on = item.key === current;
              const link = (
                <a href={item.href} className={on ? 'tg-nav--on' : 'tg-nav'}>
                  {item.label}
                  {item.children ? ' ▾' : ''}
                </a>
              );
              // 沒有下拉的直接當 flex 子項，不要多包一層。原型就是裸的 <a>，
              // 包了 <span> 會改變盒模型，導覽文字會橫向位移。
              if (!item.children) return <a key={item.key} href={item.href} className={on ? 'tg-nav--on' : 'tg-nav'}>{item.label}</a>;
              return (
                <span className="tg-dd" key={item.key}>
                  {link}
                  <div>
                    <div className="tg-dd-in">
                      {item.children.map((c) => (
                        <a href={c.href} key={c.href}>
                          {c.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </span>
              );
            })}
          </nav>

          <div style={{ marginLeft: 'auto' }}>
            {/* 原型是設計系統的 Button（size sm）。那個元件只是掛 class，
                所以這裡用同樣的 class 做成 <a>，這樣按了真的會跳到預約區。 */}
            <a
              className="t-btn t-btn--primary t-btn--sm"
              href={CTA.href}
              style={{ textDecoration: 'none' }}
            >
              {CTA.label}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
