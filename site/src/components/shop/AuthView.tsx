import { useState } from 'react';
import { BOX, INPUT, LABEL, MSG, deriveKey, post } from './shop';

/**
 * 會員登入、註冊、忘記密碼。三種模式共用一張卡。
 *
 * 密碼在瀏覽器先跑 20 萬次 PBKDF2 再送出（原因見 src/api/auth.ts 開頭），
 * 手機上要一兩秒，所以按鈕一定要有「計算中」的狀態，不然會被當成當掉。
 *
 * 註冊時就算 Email 已經存在，回應也是「請收信」——直接說「這個 Email
 * 已經註冊過」等於免費幫人查名單。已經有帳號的人會收到一封提醒信。
 */
type Mode = 'login' | 'register' | 'forgot';

export default function AuthView({ initial = 'login' }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const r = await post<{ message: string }>('/api/member/forgot', { email });
        setOk(r.message);
      } else if (mode === 'register') {
        if (password.length < 10) throw new Error('密碼至少要 10 個字。');
        const dk = await deriveKey(password, email);
        const r = await post<{ message: string }>('/api/member/register', {
          email, name, dk, phone, company, marketingConsent: consent,
        });
        setOk(r.message);
      } else {
        const dk = await deriveKey(password, email);
        await post('/api/member/login', { email, dk });
        // 從購物車過來的就回購物車，否則回會員中心
        const back = new URLSearchParams(location.search).get('back');
        location.href = back && back.startsWith('/') ? back : '/member';
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'login' ? '登入' : mode === 'register' ? '註冊' : '忘記密碼';

  return (
    <form style={{ ...BOX, maxWidth: 460, display: 'grid', gap: 14 }} onSubmit={submit}>
      <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 20, fontWeight: 800 }}>{title}</b>

      {mode === 'forgot' && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)' }}>
          填你註冊時用的 Email，我們會寄一個重設密碼的連結給你。連結一小時後失效。
        </p>
      )}

      {err && <div style={MSG('err')}>{err}</div>}
      {ok && <div style={MSG('ok')}>{ok}</div>}

      {mode === 'register' && (
        <>
          <div>
            <label style={LABEL}>姓名</label>
            <input style={INPUT} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div>
            <label style={LABEL}>公司</label>
            <input style={INPUT} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
          </div>
          <div>
            <label style={LABEL}>電話</label>
            <input style={INPUT} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>
        </>
      )}

      <div>
        <label style={LABEL}>Email</label>
        <input style={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </div>

      {mode !== 'forgot' && (
        <div>
          <label style={LABEL}>密碼</label>
          <input
            style={INPUT} type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 10 : undefined}
          />
          {mode === 'register' && (
            <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>至少 10 個字。建議用密碼管理器產生。</div>
          )}
        </div>
      )}

      {mode === 'register' && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.6, cursor: 'pointer' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, flex: 'none' }} />
          <span style={{ color: 'var(--fg-secondary)' }}>
            我願意收到課程與活動通知。（不勾也能註冊，只是收不到開課消息。隨時可以退訂。）
          </span>
        </label>
      )}

      <button className="t-btn t-btn--primary t-btn--lg" disabled={busy}>
        {busy ? '處理中…' : title}
      </button>
      {busy && mode !== 'forgot' && (
        <div style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>密碼正在你的裝置上做加密運算，手機上大約一兩秒。</div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, paddingTop: 4 }}>
        {mode !== 'login' && <Switch to="login" set={setMode} label="已經有帳號？登入" />}
        {mode !== 'register' && <Switch to="register" set={setMode} label="還沒有帳號？註冊" />}
        {mode !== 'forgot' && <Switch to="forgot" set={setMode} label="忘記密碼" />}
      </div>

      {mode === 'register' && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-tertiary)', lineHeight: 1.7 }}>
          註冊即表示你同意<a href="/legal/terms" style={{ color: 'var(--tiger-700)' }}>服務條款</a>與
          <a href="/legal/privacy" style={{ color: 'var(--tiger-700)' }}>隱私權政策</a>。
        </p>
      )}
    </form>
  );
}

function Switch({ to, set, label }: { to: Mode; set: (m: Mode) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => set(to)}
      style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'var(--tiger-700)', cursor: 'pointer' }}
    >
      {label}
    </button>
  );
}
