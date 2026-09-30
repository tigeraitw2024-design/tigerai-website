import { useCallback, useEffect, useState } from 'react';
import { api, type Collection, type SchemaResponse } from './api';
import Icon from './ui/Icon';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import List from './views/List';
import Edit from './views/Edit';
import Help from './views/Help';
import './admin.css';

/**
 * 後台。
 *
 * ── 路由用 hash（網址裡的 #）──────────────────────────────────
 * 因為前台是靜態站，伺服器上沒有 /admin/courses 這個檔案。用一般的路徑
 * 就得在 Cloudflare 設重寫規則，把所有 /admin/* 指回同一個 index.html；
 * 用 hash 則完全不需要任何伺服器設定——#後面的東西根本不會送到伺服器。
 * 少一個設定，就少一個上線後才會發現壞掉的地方。
 *
 * ── 整個介面是從 schema 畫出來的 ─────────────────────────────
 * 這支只負責「外框」：頂欄、側欄、底部切換、路由。裡面顯示什麼，
 * 是跟 /api/admin/schema 要來的。所以在 src/api/modules/ 加一個功能，
 * 後台側欄會自己多一項，不用改這裡。
 */

type Route =
  | { view: 'dashboard' }
  | { view: 'help' }
  | { view: 'list'; name: string }
  | { view: 'edit'; name: string; id: string };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (!h || h === 'dashboard') return { view: 'dashboard' };
  if (h === 'help') return { view: 'help' };
  const [name, id] = h.split('/');
  if (id) return { view: 'edit', name, id };
  return { view: 'list', name };
}

export default function App() {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [route, setRoute] = useState<Route>(parseHash);
  const [drawer, setDrawer] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      setDrawer(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const loadSchema = useCallback(async () => {
    try {
      setSchema(await api.get<SchemaResponse>('/api/admin/schema'));
    } catch {
      setSchema(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  if (booting) {
    return <div className="a-empty" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>載入中…</div>;
  }
  if (!schema) return <Login onDone={loadSchema} />;

  const col = (name: string) => schema.collections.find((c) => c.name === name);
  const groups: Collection['group'][] = ['內容', '生意', '系統'];

  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    location.hash = '';
    location.reload();
  };

  const navFor = (name: string) => `#/${name}`;
  const active = (r: Route) =>
    route.view === r.view && (route as any).name === (r as any).name;

  return (
    <div className="a-shell">
      <header className="a-top">
        <button className="a-btn a-btn--ghost a-burger" style={{ minHeight: 40, padding: '0 10px', border: 0, color: '#fff' }}
          onClick={() => setDrawer((v) => !v)} aria-label="選單">
          <Icon name={drawer ? 'x' : 'menu'} size={20} />
        </button>
        <a href="#/" className="a-top__brand" style={{ color: '#fff', textDecoration: 'none' }}>
          <img src="/assets/logo/white-square-mark.svg" alt="" />
          <span>虎智後台</span>
        </a>
        <div className="a-top__spacer" />
        <span className="a-top__who a-mono">{schema.role}</span>
        <button className="a-btn a-btn--ghost" style={{ minHeight: 36, padding: '0 10px', border: 0, color: '#fff' }}
          onClick={logout} aria-label="登出">
          <Icon name="log-out" size={17} />
        </button>
      </header>

      <div className="a-body">
        {drawer && <div className="a-scrim" onClick={() => setDrawer(false)} />}
        <nav className={`a-side ${drawer ? 'a-side--open' : ''}`}>
          <a className="a-navlink" href="#/" data-on={route.view === 'dashboard' ? '1' : '0'}>
            <Icon name="house" /> 總覽
          </a>
          <a className="a-navlink" href="#/help" data-on={route.view === 'help' ? '1' : '0'}>
            <Icon name="book-open" /> 操作手冊
          </a>

          {groups.map((g) => {
            const cs = schema.collections.filter((c) => c.group === g);
            if (!cs.length) return null;
            return (
              <div key={g}>
                <div className="a-navgroup a-mono">{g}</div>
                {cs.map((c) => (
                  <a key={c.name} className="a-navlink" href={navFor(c.name)}
                    data-on={active({ view: 'list', name: c.name } as Route) || (route.view === 'edit' && route.name === c.name) ? '1' : '0'}>
                    <Icon name={c.icon} /> {c.label}
                  </a>
                ))}
              </div>
            );
          })}

          <div style={{ padding: '18px 14px', fontSize: 12, color: 'var(--a-fg-3)', lineHeight: 1.7 }}>
            看不到的項目表示你的角色沒有權限。<br />
            需要調整請找 owner。
          </div>
        </nav>

        <main className="a-main">
          {route.view === 'dashboard' && <Dashboard schema={schema} />}
          {route.view === 'help' && <Help schema={schema} />}
          {route.view === 'list' && (col(route.name)
            ? <List key={route.name} collection={col(route.name)!} />
            : <Missing />)}
          {route.view === 'edit' && (col(route.name)
            ? <Edit key={route.name + route.id} collection={col(route.name)!} id={route.id} canSeePII={schema.canSeePII} />
            : <Missing />)}
        </main>
      </div>

      {/* 手機底部：最常用的四個，拇指按得到 */}
      <nav className="a-tabbar">
        <a href="#/" data-on={route.view === 'dashboard' ? '1' : '0'}><Icon name="house" /> 總覽</a>
        <a href="#/bookings" data-on={route.view !== 'dashboard' && (route as any).name === 'bookings' ? '1' : '0'}><Icon name="calendar-check" /> 預約</a>
        <a href="#/courses" data-on={(route as any).name === 'courses' ? '1' : '0'}><Icon name="graduation-cap" /> 課程</a>
        <a href="#/help" data-on={route.view === 'help' ? '1' : '0'}><Icon name="book-open" /> 手冊</a>
      </nav>
    </div>
  );
}

function Missing() {
  return (
    <div className="a-empty">
      <p>找不到這一頁，或是你的角色沒有權限看。</p>
      <a className="a-btn a-btn--ghost" href="#/">回總覽</a>
    </div>
  );
}
