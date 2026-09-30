import { useState } from 'react';
import { consultants as DATA } from '../../data/consultants';

/**
 * 首頁 08 區的顧問頭像帶。移植自 design/首頁.dc.html。
 *
 * 頭像圈圈往左循環跑（清單接兩份配合 tg-cmq 的 translateX(-50%)，44 秒一圈），
 * 兩側用遮罩漸層淡出。hover 某人時：
 *   輪播停住（animation-play-state:paused）
 *   該人的去背人像從右側滑入 90px，站在區塊底線上（bottom 是負的，刻意溢出）
 *   名字／職稱／課程無框直接大字壓陰影，三行由上到下依序淡入（差 0.15 秒）
 *   人像後方蓋一層黑色霧面漸層，把其他頭像壓暗
 *
 * 進出場動畫在兩組內容相同的 keyframes 間交替（tg-csin/tg-csin2、
 * tg-line/tg-line2），這樣換人時同一個元素會重新觸發動畫。
 */

const fullName = (c: { zh: string; en: string }) => c.zh + (c.en ? (c.zh ? ' ' : '') + c.en : '');
const EASE = 'cubic-bezier(.22,.61,.36,1)';

export default function ConsultantStrip() {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  // 換人次數，用來交替兩組 keyframes
  const [n, setN] = useState(0);

  const sel = DATA[i] ?? { img: '', zh: '', en: '', title: '', course: '', avatar: '', card: '' };
  const cards = [...DATA, ...DATA];

  const anim = (base: string, dur: string, delay = '') =>
    n ? `${n % 2 ? base : `${base}2`} ${dur} ${EASE}${delay} both` : 'none';

  const personAnim = anim('tg-csin', '.45s');
  const lineAnim = (delay: string) => anim('tg-line', '.4s', ` ${delay}`);

  const shade = open ? {} : { display: 'none' };

  return (
    <div style={{ minWidth: 0 }}>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
          maskImage: 'linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)',
          WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)',
        }}
      >
        {/* hover 時蓋在頭像上的黑色霧面，讓右側滑入的人像突出。不是灰階，是遮罩。 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background: 'linear-gradient(90deg,transparent 32%,rgba(14,14,13,.55) 62%,rgba(14,14,13,.92) 96%)',
            ...shade,
          }}
        />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', right: 0, zIndex: 3, ...shade }} />

        <div
          style={{
            display: 'flex',
            gap: 16,
            width: 'max-content',
            padding: '4px 0',
            animation: 'tg-cmq 44s linear infinite',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {cards.map((c, k) => {
            const idx = k % DATA.length;
            const on = idx === i;
            return (
              <a
                key={k}
                href="/courses"
                onMouseEnter={() => {
                  setN((v) => v + 1);
                  setI(idx);
                  setOpen(true);
                }}
                style={{ cursor: 'pointer', display: 'grid', justifyItems: 'center', gap: 6, width: 72, textDecoration: 'none' }}
              >
                <span
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `2px solid ${on ? '#ECA42B' : 'rgba(255,255,255,.25)'}`,
                    background: 'var(--slate-200)',
                    display: 'block',
                    transition: `border-color .12s ${EASE}`,
                  }}
                >
                  <img
                    loading="lazy"
                    src={`/${c.avatar || c.img}`}
                    alt={fullName(c)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                  />
                </span>
                <span style={{ fontSize: 11, color: on ? '#ECA42B' : '#D7D5D1', whiteSpace: 'nowrap' }}>{fullName(c)}</span>
              </a>
            );
          })}
        </div>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 'calc(clamp(56px,9vw,96px) * -1)',
            zIndex: 5,
            animation: personAnim,
            pointerEvents: 'none',
          }}
        >
          <a href="/courses" style={{ display: 'block', pointerEvents: 'auto' }}>
            <img
              loading="lazy"
              src={`/${sel.img}`}
              alt={fullName(sel)}
              style={{
                width: 390,
                height: 'auto',
                display: 'block',
                cursor: 'pointer',
                filter: 'drop-shadow(0 -2px 6px rgba(0,0,0,.32))',
                // 上方和兩側留白給陰影，下緣切齊區塊底線
                clipPath: 'inset(-200px -200px 0 -200px)',
              }}
            />
          </a>
          <div style={{ position: 'absolute', left: 0, bottom: 72, zIndex: 2, display: 'grid', gap: 2, justifyItems: 'start', pointerEvents: 'auto' }}>
            <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 23, fontWeight: 800, letterSpacing: '-.01em', textShadow: '0 1px 3px rgba(0,0,0,.9),0 2px 14px rgba(0,0,0,.85)', animation: lineAnim('.25s') }}>
              {fullName(sel)}
            </b>
            <span style={{ fontSize: 12, color: '#EDEBE8', textShadow: '0 1px 3px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.85)', animation: lineAnim('.4s') }}>
              {sel.title}
            </span>
            <span style={{ fontSize: 12, color: '#EDEBE8', textShadow: '0 1px 3px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.85)', animation: lineAnim('.55s') }}>
              {sel.course}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
