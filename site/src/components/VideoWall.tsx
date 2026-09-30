import { useEffect, useState } from 'react';

export type Video = { id: string; title: string };

/**
 * 免費影片牆。縮圖網格，點了從中央放大彈出播放（HeroVideoDialog 手法）。
 * 移植自 design/免費資源.dc.html。
 *
 * 關掉的方式有三種：點遮罩、點右上 ✕、按 Esc。
 * 縮圖直接用 YouTube 的 hqdefault.jpg，所以後台只要貼連結就有圖。
 */
export default function VideoWall({ videos }: { videos: Video[] }) {
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlaying(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
        {videos.map((v, i) => (
          <div key={`${v.id}-${i}`} style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <button
              className="tg-vthumb"
              onClick={() => setPlaying(v.id)}
              title={v.title}
              style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                aspectRatio: '16/9',
                padding: 0,
                border: '1px solid var(--border-subtle)',
                background: '#0E0E0D',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'block',
                  opacity: 0.94,
                  background: `url(https://img.youtube.com/vi/${v.id}/hqdefault.jpg) center/cover no-repeat`,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    width: 52,
                    height: 52,
                    background: 'rgba(250,250,248,.94)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {/* 三角形播放鍵用 border 做，不用另外拉圖示 */}
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '16px solid #0E0E0D',
                      borderTop: '10px solid transparent',
                      borderBottom: '10px solid transparent',
                      marginLeft: 4,
                    }}
                  />
                </span>
              </span>
            </button>
            <b style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{v.title}</b>
          </div>
        ))}
      </div>

      {playing && (
        <div
          onClick={() => setPlaying(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: 'rgba(14,14,13,.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6vh 4vw',
            animation: 'tg-fade .2s cubic-bezier(.22,.61,.36,1) both',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(1080px,100%)',
              aspectRatio: '16/9',
              background: '#0E0E0D',
              boxShadow: 'var(--shadow-xl)',
              animation: 'tg-zoom .32s cubic-bezier(.22,.61,.36,1) both',
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${playing}?autoplay=1`}
              title="影片播放"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              className="tg-vclose"
              onClick={() => setPlaying(null)}
              title="關閉"
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                width: 32,
                height: 32,
                border: '1px solid rgba(255,255,255,.45)',
                background: 'transparent',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
