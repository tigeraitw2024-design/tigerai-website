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

  useEffect(() => {
    api
      .get<{ installed: boolean }>('/api/auth/installed')
      .then((r) => setMode(r.installed ? 'login' : 'install'))
      .catch(() => setMode('login'));
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
