import { useEffect, useRef, useState } from 'react';

export type Banner = { src: string; alt: string };

/**
 * 課程頁的滿版 Banner 輪播。移植自 design/課程.dc.html。
 *
 * 貼齊瀏覽器兩緣，比例 1983:793（Banner 原圖就是這個尺寸，所以 cover 等於
 * 滿填、不會裁到）。5 秒自動換，滑鼠移上去暫停，transform 過場 .5s。
 * 點點置中：白半透明底加深色細框和陰影，作用中那顆拉寬到 28px 並轉虎金。
 *
 * prefers-reduced-motion 下不自動輪播（照原型的 matchMedia 判斷），
 * 使用者還是可以點點點手動切。
 */
export default function BannerCarousel({ banners }: { banners: Banner[] }) {
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
      style={{ position: 'relative', overflow: 'hidden', background: '#0E0E0D' }}
    >
      <div
        style={{
          display: 'flex',
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
              aspectRatio: '1983/793',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src={b.src}
              alt={b.alt}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 14,
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
