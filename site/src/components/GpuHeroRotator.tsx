import { useEffect, useState } from 'react';

/** 中間輪播的詞，和右側資訊卡同步的「現況 vs 放進 Tiger GPU Pro」。 */
export type Story = {
  word: string;
  /** 卡片標題用不到，但留著對照原型的資料結構 */
  label: string;
  pain: string;
  fix: string;
  mods: string[];
};

/**
 * Tiger GPU Pro 的 Hero：「AI 做出來了 ＿＿＿ 放在哪？」中間詞輪播。
 * 移植自 design/Tiger GPU Pro.dc.html。
 *
 * 每 3.6 秒換一個詞，右側 400×288 的資訊卡同步換「現況 vs 放進 TG」。
 * 滑鼠移到詞或卡片上就停住（hover 期間不換），移開繼續。
 *
 * 兩個版面細節照原型：
 *   詞的容器 min-width 5.2em、height 1.12em，預留最長詞的寬度，
 *   所以換詞時整個版面不會跳動。
 *   進出場動畫在兩組 keyframes 之間交替（tg-wa/tg-wb、tg-fa/tg-fb），
 *   內容一樣，目的是讓同一個元素每次換詞都重新觸發動畫。淡入淡出、無彈跳。
 */
export default function GpuHeroRotator({ stories }: { stories: Story[] }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (hover) return;
    const t = setInterval(() => setI((s) => s + 1), 3600);
    return () => clearInterval(t);
  }, [hover]);

  const a = stories[i % stories.length];
  const wordAnim = `${i % 2 ? 'tg-wa' : 'tg-wb'} .38s cubic-bezier(.22,.61,.36,1) both`;
  const cardAnim = `${i % 2 ? 'tg-fa' : 'tg-fb'} .6s cubic-bezier(.22,.61,.36,1) both`;

  return (
    <div
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 32,
        flexWrap: 'wrap',
        marginBottom: 40,
      }}
    >
      <div style={{ minWidth: 0, flex: '0 1 auto' }}>
        <h1
          style={{
            fontFamily: "'Manrope','Noto Sans TC',sans-serif",
            fontSize: 'clamp(30px,4.6vw,72px)',
            fontWeight: 800,
            letterSpacing: '-.02em',
            lineHeight: 1.1,
            margin: '12px 0 16px',
            whiteSpace: 'nowrap',
            animation: 'tg-in .5s .05s both',
          }}
        >
          AI 做出來了{' '}
          <span
            onMouseEnter={() => setHover(true)}
            style={{
              display: 'inline-block',
              minWidth: '5.2em',
              height: '1.12em',
              lineHeight: 1.12,
              verticalAlign: 'top',
              color: 'var(--tiger-600)',
              cursor: 'default',
              animation: wordAnim,
            }}
          >
            {a.word}
          </span>
          <br />
          放在哪？
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: 'var(--fg-secondary)',
            maxWidth: '56ch',
            margin: 0,
            animation: 'tg-in .5s .1s both',
          }}
        >
          真正的門檻在最後一哩：部署在哪、算力哪來、誰在控管。
          <br />
          Tiger GPU Pro 一次鋪好。
        </p>
      </div>

      <div
        onMouseEnter={() => setHover(true)}
        style={{
          marginTop: 12,
          flex: '0 1 400px',
          minWidth: 230,
          maxWidth: '100%',
          height: 288,
          overflow: 'hidden',
          background: '#fff',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          padding: 20,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 16,
          animation: cardAnim,
        }}
      >
        <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: 12 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-tertiary)',
            }}
          >
            現況
          </span>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)' }}>{a.pain}</p>
        </div>
        <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: 12 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: 'var(--tiger-700)',
            }}
          >
            放進 Tiger GPU Pro
          </span>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)' }}>{a.fix}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {a.mods.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11,
                  color: 'var(--tiger-700)',
                  border: '1px solid var(--border-brand)',
                  background: 'var(--tiger-50)',
                  padding: '4px 10px',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
