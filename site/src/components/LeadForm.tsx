import { useRef, useState } from 'react';

/**
 * 留 Email 的小表單。站上所有「留下信箱換東西」的地方都用這一個。
 *
 * 送到 /api/lead，後端會：
 *   同一個 Email 只留一筆，重複留累加次數並更新最近來源
 *   帶了 resourceId 的話，發一張 7 天的一次性下載券，把連結寄過去
 *
 * 外觀刻意跟原型那兩個裸元素一模一樣（同樣的 class、同樣的寬度），
 * 因為這個站的驗收標準是跟原型長得一樣。成功與失敗的訊息是額外長出來的，
 * 沒有發生時完全不渲染，所以預設狀態下版面一個像素都沒變。
 *
 * website 那個欄位是給機器人填的陷阱：人看不到（絕對定位移出畫面），
 * 自動填表的程式會填。後端收到有值的就當作機器人，回成功但不留資料。
 */
export default function LeadForm({
  source,
  resourceId,
  cta = '寄模板給我',
  width = 260,
  placeholder = 'name@company.com',
}: {
  source: string;
  resourceId?: string;
  cta?: string;
  width?: number | string;
  placeholder?: string;
}) {
  const mail = useRef<HTMLInputElement>(null);
  const trap = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');

  async function send() {
    const email = mail.current?.value.trim() || '';
    if (!email.includes('@')) {
      setErr('請填一個收得到信的 Email。');
      mail.current?.focus();
      return;
    }
    setState('busy');
    setErr('');
    try {
      const r = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source, resourceId, website: trap.current?.value || '' }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || '送出失敗，請稍後再試。');
      setState('done');
    } catch (e: any) {
      setErr(String(e?.message || e));
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <span style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.7 }}>
        收到了，請到信箱收信。沒看到的話看一下垃圾郵件匣。
      </span>
    );
  }

  return (
    <>
      <input
        ref={mail}
        className="t-input"
        type="email"
        placeholder={placeholder}
        style={{ width }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
      />
      {/* 機器人陷阱。tabIndex -1 與 aria-hidden 讓鍵盤與螢幕閱讀器都跳過它。 */}
      <input
        ref={trap}
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
      />
      <button className="t-btn t-btn--outline" onClick={send} disabled={state === 'busy'}>
        {state === 'busy' ? '送出中…' : cta}
      </button>
      {err && (
        <span role="alert" style={{ fontSize: 13, color: 'var(--danger-700, #8E2F27)', width: '100%' }}>
          {err}
        </span>
      )}
    </>
  );
}
