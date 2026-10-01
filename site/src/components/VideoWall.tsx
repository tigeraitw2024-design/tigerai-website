import { useEffect, useState } from 'react';

/**
 * 免費影片牆。縮圖網格，點了從中央放大彈出播放（HeroVideoDialog 手法）。
 * 移植自 design/免費資源.dc.html。
 *
 * 兩種來源，由後台的「影片來源」決定：
 *   youtube  貼 YouTube 網址，縮圖自動抓 hqdefault.jpg，播放用 iframe
 *   file     貼可以直接播的檔案網址（.mp4 之類），播放用 <video>，縮圖要自己給
 *
 * 關掉的方式有三種：點遮罩、點右上 ✕、按 Esc。
 */

export type Video = {
  /** YouTube 的影片代號，或是可以直接播的檔案網址 */
  id: string;
  title: string;
  kind?: 'youtube' | 'file';
  /** 自訂縮圖。YouTube 不填就用官方縮圖。 */
  poster?: string;
  note?: string;
};

/**
 * 從各種 YouTube 網址裡抓出影片代號。
 * 後台讓人直接貼網址（而不是叫他自己找「那 11 碼」），所以解析放在這裡。
 * 已經是純代號的話原樣回傳。
 */
export function youtubeId(input: string): string {
  const s = String(input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([\w-]{11})/) ||
    s.match(/youtu\.be\/([\w-]{11})/) ||
    s.match(/\/embed\/([\w-]{11})/) ||
    s.match(/\/shorts\/([\w-]{11})/) ||
    s.match(/\/live\/([\w-]{11})/);
  return m ? m[1] : s;
}

const thumbFor = (v: Video) => {
  if (v.poster) return v.poster;
  if ((v.kind ?? 'youtube') === 'youtube') return `https://img.youtube.com/vi/${youtubeId(v.id)}/hqdefault.jpg`;
  return '';
};

export default function VideoWall({ videos }: { videos: Video[] }) {
  const [playing, setPlaying] = useState<Video | null>(null);

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
        {videos.map((v, i) => {
          const thumb = thumbFor(v);
          return (
            <div key={`${v.id}-${i}`} style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
              <button
                className="tg-vthumb"
                onClick={() => setPlaying(v)}
                title={v.title}
                aria-label={`播放：${v.title}`}
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
                    ...(thumb ? { background: `url(${thumb}) center/cover no-repeat` } : {}),
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
              {v.note && <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-secondary)' }}>{v.note}</span>}
            </div>
          );
        })}
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
            {(playing.kind ?? 'youtube') === 'youtube' ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId(playing.id)}?autoplay=1`}
                title={playing.title}
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={playing.id}
                poster={playing.poster || undefined}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', display: 'block', background: '#0E0E0D' }}
              />
            )}
            <button
              className="tg-vclose"
              onClick={() => setPlaying(null)}
              title="關閉"
              aria-label="關閉影片"
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
