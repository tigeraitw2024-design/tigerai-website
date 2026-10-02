import { useEffect, useRef, useState } from 'react';

export type Banner = { src: string; alt: string };

/** 高度設定。後台「頁面文案 → 課程」可以調，沒填就用這組預設。 */
export type BannerSize = { minH: number; maxH: number; offset: number };
const DEFAULT_SIZE: BannerSize = { minH: 520, maxH: 1100, offset: 76 };

/**
 * 課程頁的滿版 Banner 輪播。移植自 design/課程.dc.html，尺寸依 Robin 指示改成
 * 「一打開就佔滿第一屏」（參考知識衛星的做法）。
 *
 * 高度 ＝ 螢幕高度減掉頂欄的 76px，但夾在 520px 與 1100px 之間：
 * 太矮的筆電螢幕不會只剩一條，大螢幕也不會被拉成一面牆。
 *
 * 用 dvh 不用 vh：手機瀏覽器的網址列會隨捲動收合，vh 是「網址列收起來時」的
 * 高度，所以第一眼會比畫面高一截、底下的點點被切掉。dvh 會跟著實際可視範圍走。
 *
 * 圖片用 cover：原圖是 2.5:1 的寬圖，放進接近直式的視窗一定要裁掉一部分，
 * 這跟知識衛星一樣。之後的 Banner 建議用 1920×1080，重要的東西擺在中央
 * 1400px 寬的範圍內，各種螢幕都不會被裁到。
 *
 * 5 秒自動換，滑鼠移上去暫停，transform 過場 .5s。
 * 點點距底部 32px：白半透明底加深色細框和陰影，作用中那顆拉寬到 28px 並轉虎金。
 *
 * prefers-reduced-motion 下不自動輪播（照原型的 matchMedia 判斷），
 * 使用者還是可以點點點手動切。
 */
export default function BannerCarousel({ banners, size }: { banners: Banner[]; size?: Partial<BannerSize> }) {
  const { minH, maxH, offset } = { ...DEFAULT_SIZE, ...size };
  // clamp 的中間值用 dvh 算，上下界是固定像素
  const height = `clamp(${minH}px, calc(100dvh - ${offset}px), ${maxH}px)`;
  const [i, setI] = useState(0);
  const hold = useRef(false);
  const n = banners.length;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => {
      if (hold.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setI((s) => (s + 1) % n);
    }, 5000);
    return () => clearInterval(t);
  }, [n]);

  const dot = (k: number): React.CSSProperties => ({
    width: k === i ? 28 : 10,
    height: 10,
    background: k === i ? 'var(--tiger-500)' : 'rgba(255,255,255,.65)',
    border: '1px solid rgba(14,14,13,.45)',
    boxShadow: '0 1px 4px rgba(14,14,13,.3)',
    cursor: 'pointer',
    transition: 'width .2s cubic-bezier(.22,.61,.36,1),background .2s cubic-bezier(.22,.61,.36,1)',
  });

  return (
    <div
      onMouseEnter={() => (hold.current = true)}
      onMouseLeave={() => (hold.current = false)}
      style={{ position: 'relative', overflow: 'hidden', background: '#0E0E0D', height }}
    >
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: `${n * 100}%`,
          transform: `translateX(-${((i * 100) / n).toFixed(4)}%)`,
          transition: 'transform .5s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {banners.map((b, k) => (
          <div
            key={k}
            style={{
              width: `calc(100% / ${n})`,
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 圖置中裁切。容器現在是「螢幕高度」而不是固定比例，所以一定要
                object-fit:cover，不然寬圖會被拉長變形。object-position 置中，
                所以裁掉的是左右兩側相等的量。 */}
            <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'rgba(127,127,127,.08)' }}>
              <img
                src={b.src}
                alt={b.alt}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  userSelect: 'none',
                  display: 'block',
                }}
              />
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 32,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {banners.map((_, k) => (
          <span
            key={k}
            onClick={() => setI(k)}
            role="button"
            aria-label={`第 ${k + 1} 張`}
            style={dot(k)}
          />
        ))}
      </div>
    </div>
  );
}
