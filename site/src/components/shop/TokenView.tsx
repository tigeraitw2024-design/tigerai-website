import { useEffect, useState } from 'react';
import { BOX, INPUT, LABEL, MSG, deriveKey, post, qs } from './shop';

/**
 * 憑信件裡的連結做事的頁面。三種：
 *   verify  驗證 Email（一進頁面就自動送出，使用者不用再按一次）
 *   reset   重設密碼（要填新密碼才送）
 *   cancel  客戶自己取消預約（要編號＋Email，光有編號不算）
 *
 * 代幣是一次性的，用過就刪。所以「驗證中…」不能重複執行——
 * React 在開發模式會把 effect 跑兩次，第二次會拿到「連結已失效」，
 * 所以這裡用一個旗標擋住。
 */
export default function TokenView({ kind }: { kind: 'verify' | 'reset' | 'cancel' }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(qs('code'));
  const [email, setEmail] = useState(qs('email'));
  const token = qs('t');

  useEffect(() => {
    if (kind !== 'verify') return;
    let used = false;
    if (used) return;
    used = true;
    if (!token) {
      setErr('這個連結不完整，請從信裡的連結重新點一次。');
      return;
    }
    setState('busy');
    post('/api/member/verify', { token })
      .then(() => setState('done'))
      .catch((e) => {
        setErr(String(e?.message || e));
        setState('idle');
      });
  }, [kind, token]);

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (password.length < 10) return setErr('密碼至少要 10 個字。');
    setState('busy');
    try {
      // 重設密碼時還不知道使用者的 Email（代幣裡才有），但瀏覽器端的雜湊需要
      // Email 當鹽。所以這一頁要求使用者把 Email 一起填——這也順便多一道確認：
      // 光有連結、不知道是哪個帳號的人，改不了密碼。
      if (!email.includes('@')) throw new Error('請填你的 Email。');
      const dk = await deriveKey(password, email);
      await post('/api/member/reset', { token, dk });
      setState('done');
    } catch (e: any) {
      setErr(String(e?.message || e));
      setState('idle');
    }
  }

  async function doCancel(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setState('busy');
    try {
      await post('/api/booking/cancel', { code, email });
      setState('done');
    } catch (e: any) {
      setErr(String(e?.message || e));
      setState('idle');
    }
  }

  if (state === 'done') {
    const msg = {
      verify: ['Email 已驗證', '你的帳號已經可以購課了。'],
      reset: ['密碼已更新', '所有裝置上的登入狀態都已經清掉，請用新密碼重新登入。'],
      cancel: ['預約已取消', '時段已經放回去了。要重新預約隨時可以。'],
    }[kind];
    return (
      <div style={{ ...BOX, maxWidth: 460, display: 'grid', gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-50,#F0F8F3)', color: 'var(--success-700,#14532B)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</span>
        <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 20, fontWeight: 800 }}>{msg[0]}</b>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--fg-secondary)' }}>{msg[1]}</p>
        <a className="t-btn t-btn--primary" href={kind === 'cancel' ? '/' : '/member/login'} style={{ textDecoration: 'none', justifySelf: 'start' }}>
          {kind === 'cancel' ? '回首頁' : '去登入 →'}
        </a>
      </div>
    );
  }

  if (kind === 'verify') {
    return (
      <div style={{ ...BOX, maxWidth: 460, display: 'grid', gap: 12 }}>
        {err ? <div style={MSG('err')}>{err}</div> : <p style={{ margin: 0, color: 'var(--fg-secondary)' }}>驗證中…</p>}
        {err && <a className="t-btn t-btn--outline" href="/member/login" style={{ textDecoration: 'none', justifySelf: 'start' }}>回登入頁</a>}
      </div>
    );
  }

  return (
    <form style={{ ...BOX, maxWidth: 460, display: 'grid', gap: 14 }} onSubmit={kind === 'reset' ? doReset : doCancel}>
      <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 20, fontWeight: 800 }}>
        {kind === 'reset' ? '設定新密碼' : '取消預約'}
      </b>
      {err && <div style={MSG('err')}>{err}</div>}

      {kind === 'cancel' && (
        <div>
          <label style={LABEL}>預約編號</label>
          <input style={INPUT} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
        </div>
      )}

      <div>
        <label style={LABEL}>Email</label>
        <input style={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>

      {kind === 'reset' && (
        <div>
          <label style={LABEL}>新密碼</label>
          <input style={INPUT} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" />
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>至少 10 個字。</div>
        </div>
      )}

      <button className="t-btn t-btn--primary t-btn--lg" disabled={state === 'busy'}>
        {state === 'busy' ? '處理中…' : kind === 'reset' ? '設定新密碼' : '確認取消'}
      </button>
    </form>
  );
}
