import { useCallback, useEffect, useState } from 'react';
import { api, type Cert, type TeacherUser } from './api';
import Icon from './Icon';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Console from './views/Console';
import Generate from './views/Generate';
import Checkout from './views/Checkout';
import Report from './views/Report';
import Roster from './views/Roster';
import CertSettings from './views/CertSettings';
import './teacher.css';

/**
 * 講師區（證照系統）的前端殼。
 *
 * 跟官網後台（admin/App.tsx）同一套做法：整塊是一支 React 應用，路由走網址
 * 的 # 部分，所以伺服器上只要 /teacher 這一頁、不用任何重寫規則。登入用
 * Google（見 Login），身分跟官網後台完全切開。
 *
 * 分頁：證照清單｜產生證照｜對帳｜名冊。後兩者只有 owner 看得到。
 */

type View = 'dashboard' | 'certs' | 'checkout' | 'generate' | 'settings' | 'report' | 'roster';
const viewOf = (): View => {
  const h = location.hash.replace(/^#\/?/, '');
  return (['dashboard', 'certs', 'checkout', 'generate', 'settings', 'report', 'roster'].includes(h) ? h : 'dashboard') as View;
};

export default function App() {
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<View>(viewOf);
  const [genCerts, setGenCerts] = useState<Cert[]>([]);

  const boot = useCallback(async () => {
    try { setUser((await api.get<{ user: TeacherUser }>('/api/teacher/me')).user); }
    catch { setUser(null); }
    finally { setBooting(false); }
  }, []);
  useEffect(() => { boot(); }, [boot]);

  useEffect(() => {
    const on = () => { setView(viewOf()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (booting) return <div className="t-empty" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>載入中…</div>;
  if (!user) return <Login />;

  const isOwner = user.role === 'owner';
  const go = (v: View) => { location.hash = '#/' + v; };
  const toGenerate = (certs: Cert[]) => { setGenCerts(certs); go('generate'); };

  const logout = async () => { await api.post('/api/teacher/logout').catch(() => {}); location.hash = ''; location.reload(); };

  // 講師只有「證照」一頁：上傳資料、看自己的印/寄狀態。
  // 出圖列印（產生證照）、對帳、名冊都是 owner 專用——講師不經手印什麼。
  const NAV: [View, string, string][] = [
    ['dashboard', 'grid', '總覽'],
    ['certs', 'list', '證照'],
    ['checkout', 'receipt', '結帳'],
    ['report', 'chart', '對帳'],
    ...(isOwner ? [
      ['generate', 'award', '產生證照'],
      ['settings', 'settings', '獎狀設定'],
      ['roster', 'users', '名冊'],
    ] as [View, string, string][] : []),
  ];

  return (
    <div className="t-shell">
      <header className="t-top">
        <a href="#/certs" className="t-top__brand">
          <img src="/assets/logo/white-square-mark.svg" alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span>虎智講師區</span>
        </a>
        <nav className="t-nav">
          {NAV.map(([v, icon, label]) => (
            <a key={v} href={'#/' + v} data-on={view === v ? '1' : '0'}><Icon name={icon} size={16} /> {label}</a>
          ))}
        </nav>
        <span className="t-top__spacer" />
        <span className="t-top__who">{user.name}・{user.role}</span>
        <button className="t-iconbtn" onClick={logout} aria-label="登出"><Icon name="log-out" size={17} /></button>
      </header>

      <main className="t-body">
        {view === 'dashboard' && <Dashboard user={user} />}
        {view === 'certs' && <Console user={user} onGenerate={toGenerate} />}
        {view === 'checkout' && <Checkout user={user} />}
        {view === 'generate' && (isOwner ? <Generate certs={genCerts} onBack={() => go('certs')} /> : <Denied />)}
        {view === 'settings' && (isOwner ? <CertSettings /> : <Denied />)}
        {view === 'report' && <Report isOwner={isOwner} />}
        {view === 'roster' && (isOwner ? <Roster meId={user.id} /> : <Denied />)}
      </main>

      <nav className="t-tabbar" style={{ gridTemplateColumns: `repeat(${NAV.length}, 1fr)` }}>
        {NAV.map(([v, icon, label]) => (
          <a key={v} href={'#/' + v} data-on={view === v ? '1' : '0'}><Icon name={icon} size={20} /> {label}</a>
        ))}
      </nav>
    </div>
  );
}

function Denied() {
  return <div className="t-empty"><p>這一頁只有 owner 看得到。</p><a className="t-btn t-btn--ghost" href="#/certs">回證照清單</a></div>;
}
