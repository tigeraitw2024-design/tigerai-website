import { useEffect, useState } from 'react';
import { api, deriveKey } from '../api';

/**
 * 登入，以及第一次的安裝。
 *
 * 密碼不會原樣送出去：先在瀏覽器跑 20 萬次 PBKDF2 再送算完的值。
 * 原因寫在 src/api/auth.ts——簡單說是 Cloudflare 免費方案每次請求只有
 * 10 毫秒運算額度，塞不下正常強度的密碼雜湊，所以把慢的那一段
 * 搬到使用者的裝置上。手機上大約一兩秒，所以按鈕要有「計算中」的狀態，
 * 不然會以為當掉了。
 */
export default function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'loading' | 'login' | 'install'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [googleOn, setGoogleOn] = useState(false);

  useEffect(() => {
    api
      .get<{ installed: boolean }>('/api/auth/installed')
      .then((r) => setMode(r.installed ? 'login' : 'install'))
      .catch(() => setMode('login'));
    api
      .get<{ googleConfigured: boolean }>('/api/auth/config')
      .then((r) => setGoogleOn(!!r.googleConfigured))
      .catch(() => {});
    const e = new URLSearchParams(location.search).get('error');
    if (e) {
      const map: Record<string, string> = {
        state: '登入階段過期，請再按一次「使用 Google 登入」。',
        unverified: '這個 Google 帳號的 email 尚未驗證。',
        notlisted: '這個 Google 帳號不在管理員名單內，請用被授權的 Gmail。',
        oauth: 'Google 登入失敗，請再試一次。',
      };
      setErr(map[e] || '登入失敗，請再試一次。');
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const dk = await deriveKey(password, email);
      if (mode === 'install') {
        const r = await api.post<{ note: string }>('/api/auth/bootstrap', { secret, email, name, dk });
        setNote(r.note);
        onDone();
      } else {
        await api.post('/api/auth/login', { email, dk });
        onDone();
      }
    } catch (e: any) {
      setErr(e.message || '出錯了');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'loading') {
    return <div className="a-login"><div className="a-login__box">載入中…</div></div>;
  }

  return (
    <div className="a-login">
      <form className="a-login__box" onSubmit={submit}>
        <div className="a-login__logo">
          <img src="/assets/logo/color-square-mark.svg" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span>虎智後台</span>
        </div>

        {mode === 'install' && (
          <div className="a-msg a-msg--info">
            <b>第一次安裝</b>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              這會建立資料表、匯入現有的顧問與工作流資料，並開出第一個 owner 帳號。
              需要你在 Cloudflare 設定的一次性密語（<code>BOOTSTRAP_SECRET</code>）。
            </p>
          </div>
        )}

        {err && <div className="a-msg a-msg--err">{err}</div>}
        {note && <div className="a-msg a-msg--ok">{note}</div>}

        {googleOn && (
          <>
            <a className="a-google" href="/api/auth/google/start">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              用 Google 登入
            </a>
            <div style={{ textAlign: 'center', color: '#8B867C', fontSize: 12, margin: '12px 0 2px' }}>或用 Email 密碼</div>
          </>
        )}

        <div className="a-form" style={{ display: 'grid', gap: 14 }}>
          {mode === 'install' && (
            <>
              <div className="a-f">
                <label className="a-f__label">安裝密語</label>
                <input className="a-input" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required autoComplete="off" />
                <div className="a-f__help">在 Cloudflare 用 <code>npx wrangler secret put BOOTSTRAP_SECRET</code> 設定的那一串。</div>
              </div>
              <div className="a-f">
                <label className="a-f__label">你的姓名</label>
                <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </>
          )}

          <div className="a-f">
            <label className="a-f__label">Email</label>
            <input className="a-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>

          <div className="a-f">
            <label className="a-f__label">密碼</label>
            <input
              className="a-input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              autoComplete={mode === 'install' ? 'new-password' : 'current-password'}
              minLength={mode === 'install' ? 12 : undefined}
            />
            {mode === 'install' && <div className="a-f__help">至少 12 個字。這是整個站的鑰匙，請用密碼管理器產生一組沒在別處用過的。</div>}
          </div>

          <button className="a-btn a-btn--brand" disabled={busy} style={{ width: '100%' }}>
            {busy ? '計算中，請稍候…' : mode === 'install' ? '安裝並登入' : '登入'}
          </button>
          {busy && <div className="a-f__help">密碼正在你的裝置上做加密運算，手機上大約要一兩秒。</div>}
        </div>
      </form>
    </div>
  );
}
