import { useRef, useState } from 'react';

/**
 * 三步預約卡。移植自 design/首頁.dc.html 的 10 區，邏輯與文案一字不改。
 *
 * 卡片固定高 480px、內層固定 384px，所以換步驟時尺寸不會變、版面不會跳。
 *
 *   步驟 1 對象  四選一（顧問團隊／CEO 直談／業務窗口／技術窗口）
 *   步驟 2 時間  左月曆（過去日與週末不可選，最多往後翻兩個月）
 *                右 96px 可捲動時段欄；下方時區選單，換時區時段跟著換算，
 *                跨日會標 +1／−1
 *   步驟 3 資料  摘要、姓名、Email、備註（textarea 填滿剩餘高度）
 *   完成頁      ✓、摘要、24 小時未回覆自動取消的提示、重新預約
 *
 * 右上角放大鈕是給年長者看的：點開變成置中放大 1.3 倍的彈窗，點外側收回。
 *
 * ⚠ 現在只做到前端。送出之後真正要寄信、排程、24 小時未回覆自動取消，
 *   那些是第 8 階段的事（後端 API ＋ 寄信）。目前按確認只會切到完成頁。
 */

const STAFF = [
  { id: 'advisor', name: '顧問團隊', desc: '依你的部門與痛點指派' },
  { id: 'ceo', name: 'CEO 直談', desc: '導入策略與路線圖' },
  { id: 'sales', name: '業務窗口', desc: '報價、時程與補助' },
  { id: 'tech', name: '技術窗口', desc: '地端環境與系統整合評估' },
];

/** 時區與相對 GMT 的時差。台北 +8 是基準。 */
const TZS: [string, number][] = [
  ['台北', 8], ['東京', 9], ['首爾', 9], ['北京', 8], ['新加坡', 8],
  ['雪梨', 10], ['杜拜', 4], ['倫敦', 1], ['巴黎', 2], ['柏林', 2],
  ['紐約', -4], ['芝加哥', -5], ['丹佛', -6], ['洛杉磯', -7], ['夏威夷', -10],
];

const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30', '16:00'];
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const MONO = "'JetBrains Mono',monospace";

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export default function BookingCard() {
  const [step, setStep] = useState(0);
  const [staff, setStaff] = useState('advisor');
  const [mon, setMon] = useState(0);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [dateObj, setDateObj] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [tzI, setTzI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const mailRef = useRef<HTMLInputElement>(null);

  const tzOff = TZS[tzI][1];
  /** 把台北時間換算成選定時區，跨日標 +1／−1 */
  const cvt = (tm: string) => {
    const h = +tm.slice(0, 2);
    const m = tm.slice(3);
    let h2 = h + tzOff - 8;
    const day = Math.floor(h2 / 24);
    h2 = ((h2 % 24) + 24) % 24;
    return `${String(h2).padStart(2, '0')}:${m}${day > 0 ? ' +1' : day < 0 ? ' -1' : ''}`;
  };

  // 月曆格子。開頭補空格對齊星期，過去日和週末不可選。
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth() + mon, 1);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const cells: { n: string; off: boolean; sel: boolean; dt?: Date }[] = [];
  for (let i = 0; i < monthStart.getDay(); i++) cells.push({ n: '', off: true, sel: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
    const off = dt < today || dt.getDay() === 0 || dt.getDay() === 6;
    cells.push({ n: String(d), off, sel: dateKey === dayKey(dt), dt });
  }

  const staffName = (STAFF.find((s) => s.id === staff) || STAFF[0]).name;
  const dObj = dateObj ? new Date(dateObj) : null;
  const summary =
    staffName +
    (dObj ? `・${dObj.getMonth() + 1}/${dObj.getDate()}（${WEEK[dObj.getDay()]}）` : '') +
    (time ? ` ${cvt(time)}${tzI ? ` ${TZS[tzI][0]}` : ''}` : '');

  const stepColor = (i: number) => (step === i ? 'var(--tiger-700)' : step > i ? 'var(--ink-900)' : 'var(--fg-tertiary)');

  const next = () => {
    if (step === 0) setStep(1);
    else if (step === 1 && dateKey && time) setStep(2);
  };
  const submit = () => {
    const mail = mailRef.current;
    if (mail && !mail.value.includes('@')) {
      mail.style.borderColor = 'var(--danger-500, #C4453B)';
      mail.focus();
      return;
    }
    setStep(3);
  };
  const reset = () => {
    setStep(0);
    setDateKey(null);
    setDateObj(null);
    setTime(null);
    setMon(0);
  };

  const BACK = (
    <span onClick={() => setStep(Math.max(0, step - 1))} style={{ cursor: 'pointer', fontSize: 13, color: 'var(--fg-secondary)', padding: '8px 12px', whiteSpace: 'nowrap' }}>
      ← 上一步
    </span>
  );

  return (
    <>
      {zoom && (
        <div onClick={() => setZoom(false)} style={{ position: 'fixed', inset: 0, zIndex: 390, background: 'rgba(14,14,13,.55)' }} />
      )}

      <div
        style={{
          background: '#fff',
          padding: 32,
          marginLeft: 20,
          display: 'grid',
          gap: 16,
          textAlign: 'left',
          alignContent: 'start',
          height: 480,
          boxSizing: 'border-box',
          position: zoom ? 'fixed' : 'relative',
          ...(zoom
            ? {
                left: '50%',
                top: '50%',
                transform: 'translate(-50%,-50%) scale(1.3)',
                zIndex: 400,
                width: 'min(520px,88vw)',
                boxShadow: 'var(--shadow-xl)',
              }
            : {}),
        }}
      >
        {/* 放大鈕貼齊卡片右上內角，給年長者放大閱讀 */}
        <span
          className="tg-bkzoom"
          onClick={() => setZoom((v) => !v)}
          title="放大顯示"
          style={{ position: 'absolute', top: 0, right: 0, zIndex: 5, width: 28, height: 28, border: '1px solid var(--border-default)', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, userSelect: 'none' }}
        >
          {zoom ? '⤡' : '⤢'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 11, letterSpacing: '.08em', whiteSpace: 'nowrap', paddingRight: 32 }}>
          <span style={{ color: stepColor(0) }}>1 對象</span>
          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ color: stepColor(1) }}>2 時間</span>
          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ color: stepColor(2) }}>3 資料</span>
        </div>

        {step === 0 && (
          <div style={{ display: 'grid', gap: 8, height: 384, gridTemplateRows: 'minmax(0,1fr) auto' }}>
            <div style={{ display: 'grid', gap: 8, alignContent: 'center', minHeight: 0 }}>
              {STAFF.map((s) => {
                const on = s.id === staff;
                return (
                  <div
                    key={s.id}
                    className="tg-bkopt"
                    onClick={() => setStaff(s.id)}
                    style={{
                      border: `1px solid ${on ? 'var(--border-brand)' : 'var(--border-subtle)'}`,
                      background: on ? 'var(--tiger-50)' : '#FFFFFF',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 10,
                    }}
                  >
                    <b style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</b>
                    <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{s.desc}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 12, color: on ? 'var(--tiger-600)' : 'transparent' }}>✓</span>
                  </div>
                );
              })}
            </div>
            <button className="t-btn t-btn--secondary t-btn--block" onClick={next}>選時間 →</button>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gap: 10, height: 384, gridTemplateRows: 'minmax(0,1fr) auto auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 96px', gap: 14, alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="tg-bknav" onClick={() => setMon(Math.max(0, mon - 1))} style={{ cursor: 'pointer', border: '1px solid var(--border-default)', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>‹</span>
                  <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center' }}>
                    {monthStart.getFullYear()} 年 {monthStart.getMonth() + 1} 月
                  </b>
                  <span className="tg-bknav" onClick={() => setMon(Math.min(2, mon + 1))} style={{ cursor: 'pointer', border: '1px solid var(--border-default)', width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}>›</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, fontFamily: MONO, fontSize: 10, color: 'var(--fg-tertiary)', textAlign: 'center' }}>
                  {WEEK.map((w) => <span key={w}>{w}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                  {cells.map((c, k) => (
                    <span
                      key={k}
                      onClick={c.off || !c.dt ? undefined : () => {
                        setDateKey(dayKey(c.dt!));
                        setDateObj(c.dt!.getTime());
                        setTime(null);
                      }}
                      style={{
                        height: 26,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        background: c.sel ? 'var(--tiger-500)' : c.n ? '#FFFFFF' : 'transparent',
                        color: !c.n ? 'transparent' : c.off ? '#C9C7C3' : c.sel ? '#0E0E0D' : 'var(--fg-primary)',
                        cursor: c.off ? 'default' : 'pointer',
                        border: `1px solid ${c.sel ? 'var(--tiger-500)' : c.off ? 'transparent' : 'var(--border-subtle)'}`,
                      }}
                    >
                      {c.n}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 6, alignContent: 'start', paddingRight: 2 }}>
                {SLOTS.map((tm) => {
                  const on = time === tm;
                  return (
                    <span
                      key={tm}
                      className="tg-bkslot"
                      onClick={() => { if (dateKey) setTime(tm); }}
                      style={{
                        padding: '7px 0',
                        textAlign: 'center',
                        fontFamily: MONO,
                        fontSize: 11,
                        border: `1px solid ${on ? 'var(--tiger-500)' : 'var(--border-default)'}`,
                        background: on ? 'var(--tiger-500)' : '#FFFFFF',
                        color: '#0E0E0D',
                        cursor: 'pointer',
                      }}
                    >
                      {cvt(tm)}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <select
                value={String(tzI)}
                onChange={(e) => setTzI(+e.target.value)}
                style={{ border: '1px solid var(--border-default)', background: '#fff', fontFamily: MONO, fontSize: 10, padding: '3px 4px', maxWidth: 180 }}
              >
                {TZS.map((z, i) => (
                  <option key={i} value={String(i)}>{z[0]}（GMT{z[1] >= 0 ? '+' : ''}{z[1]}）</option>
                ))}
              </select>
              <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                時段為示意，由後台管理
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {BACK}
              <button className="t-btn t-btn--secondary t-btn--block" onClick={next}>
                {dateKey && time ? '填資料 →' : '先選日期與時段'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 10, height: 384, gridTemplateRows: 'auto auto auto minmax(0,1fr) auto' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--tiger-700)', border: '1px solid var(--border-brand)', background: 'var(--tiger-50)', padding: '6px 10px' }}>{summary}</span>
            <input placeholder="姓名" style={{ border: '1px solid var(--border-default)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
            <input ref={mailRef} type="email" placeholder="name@company.com" style={{ border: '1px solid var(--border-default)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
            <textarea placeholder="想先解決哪個部門的什麼問題？（選填）" style={{ border: '1px solid var(--border-default)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', width: '100%', height: '100%', boxSizing: 'border-box', minHeight: 0, resize: 'none', overflowY: 'auto' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {BACK}
              <button className="t-btn t-btn--secondary t-btn--block" onClick={submit}>確認預約</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-50)', color: 'var(--success-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</span>
            <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 18, fontWeight: 800 }}>已送出預約</b>
            <span style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-secondary)' }}>{summary}・顧問一個工作天內回信確認時段。</span>
            <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--slate-50)', padding: '10px 12px', display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, lineHeight: 1.6 }}><b>請立刻到信箱收確認信</b>：24 小時內沒收到你的回信，這場會議將自動取消。</span>
              <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-secondary)' }}>會議中我們會評估你的狀況，請帶著現階段實際遇到的問題來，我們才能給出對應的解法。</span>
            </div>
            <span onClick={reset} style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--tiger-700)' }}>重新預約 →</span>
          </div>
        )}
      </div>
    </>
  );
}
