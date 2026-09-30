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
            {/* 定位方式照原型的 image-slot 一模一樣：
                外框 position:absolute inset:0 overflow:hidden 加一層淡灰底，
                圖是 left/top 50% 再 translate(-50%,-50%)，不是 inset:0。

                這不是龜毛。容器高度是 1440 ÷ (1983/793) = 575.85px，有小數，
                用 inset:0 和用 50% + translate 會落在不同的次像素位置，
                比對出來整張 Banner 的邊緣都會是紅的（那就是 0.28% 的全部來源）。 */}
            <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'rgba(127,127,127,.08)' }}>
              <img
                src={b.src}
                alt={b.alt}
                style={{
                  position: 'absolute',
                  maxWidth: 'none',
                  transform: 'translate(-50%,-50%)',
                  left: '50%',
                  top: '50%',
                  width: '100%',
                  height: '100%',
                  userSelect: 'none',
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
