import { useEffect, useState } from 'react';
import { api } from '../api';

/**
 * 講師區登入。只有一條路：Google 登入。
 *
 * 流程是整頁導轉（不是 fetch）：按鈕其實是一個連結，點了就跳去
 * /api/teacher/auth/google/start，後端再把人帶去 Google，回來落在 /teacher。
 * 所以這一頁要做的只有：問後端 Google 設好了沒、把 ?error= 翻成人話。
 */

const ERRORS: Record<string, string> = {
  state: '登入逾時或被中斷了，請再按一次。',
  unverified: '這個 Google 帳號的信箱尚未驗證，請改用已驗證的帳號。',
  notlisted: '這個 Google 帳號不在講師名冊裡。請先請管理者把你的 Gmail 加進名冊，再登入。',
  oauth: 'Google 登入沒走完，請再試一次；若一直失敗，可能是設定還沒好。',
};

export default function Login() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const err = new URLSearchParams(location.search).get('error') || '';

  useEffect(() => {
    api.get<{ googleConfigured: boolean }>('/api/teacher/config')
      .then((r) => setConfigured(r.googleConfigured))
      .catch(() => setConfigured(false));
  }, []);

  return (
    <div className="t-login">
      <div className="t-login__box">
        <div className="t-login__logo">
          <img src="/assets/logo/color-square-mark.svg" alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span>虎智講師區</span>
        </div>
        <p className="t-login__sub">n8n 證照發放與寄送管理</p>

        {err && <div className="t-msg t-msg--err" style={{ textAlign: 'left' }}>{ERRORS[err] || '登入失敗，請再試一次。'}</div>}

        {configured === null && <div className="t-empty">載入中…</div>}

        {configured === true && (
          <a className="t-google" href="/api/teacher/auth/google/start">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            用 Google 登入
          </a>
        )}

        {configured === false && (
          <div className="t-msg t-msg--info" style={{ textAlign: 'left', marginBottom: 0 }}>
            <b>Google 登入還沒設定好。</b>
            <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.7 }}>
              需要在 Cloudflare 設 <code>GOOGLE_CLIENT_ID</code>、<code>GOOGLE_CLIENT_SECRET</code>、
              <code>TEACHER_OWNER_EMAILS</code> 三個值。設好重新部署，這裡就會出現登入按鈕。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
