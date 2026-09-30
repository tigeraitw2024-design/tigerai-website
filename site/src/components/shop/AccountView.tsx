import { useEffect, useState } from 'react';
import { BOX, MSG, get, money, post } from './shop';

/**
 * 會員中心：我的課程、訂單紀錄。
 *
 * 沒登入就直接導去登入頁——不做「請先登入」的卡片，多一次點擊沒有意義。
 */
type Data = {
  member: { name: string; email: string; company?: string; verified: boolean; level: string };
  enrollments: { id: string; course: string; session: string; state: string }[];
  orders: { id: string; code: string; total: number; state: string; items: any[]; createdAt: string }[];
};

const STATE_LABEL: Record<string, string> = {
  pending: '待付款', paid: '已付款', cancelled: '已取消', refunded: '已退款', failed: '付款失敗',
  active: '有效', completed: '已結訓',
};

export default function AccountView() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    get<Data>('/api/member/me')
      .then(setD)
      .catch(() => {
        location.href = '/member/login?back=' + encodeURIComponent('/member');
      });
  }, []);

  async function logout() {
    await post('/api/member/logout').catch(() => {});
    location.href = '/';
  }

  if (!d) return <p style={{ color: 'var(--fg-tertiary)' }}>{err || '載入中…'}</p>;

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 780 }}>
      <div style={{ ...BOX, display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 20, fontWeight: 800 }}>{d.member.name}</b>
          <div style={{ fontSize: 14, color: 'var(--fg-secondary)', marginTop: 4 }}>
            {d.member.email}{d.member.company ? `・${d.member.company}` : ''}
          </div>
        </div>
        <button className="t-btn t-btn--ghost" onClick={logout}>登出</button>
      </div>

      {!d.member.verified && (
        <div style={MSG('err')}>
          你的 Email 還沒驗證。註冊時我們寄了一封驗證信，點裡面的連結才能購課。
          沒收到的話看一下垃圾郵件匣。
        </div>
      )}

      <section>
        <h2 style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>我的課程</h2>
        {d.enrollments.length ? (
          <div style={{ ...BOX, display: 'grid', gap: 0 }}>
            {d.enrollments.map((e, i) => (
              <div key={e.id} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--border-subtle)' : undefined, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15 }}>{e.course}</span>
                <span className="t-badge">{STATE_LABEL[e.state] || e.state}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={BOX}>
            <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--fg-secondary)' }}>還沒有上過課。</p>
            <a className="t-btn t-btn--primary" href="/courses" style={{ textDecoration: 'none' }}>去看課程 →</a>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>訂單紀錄</h2>
        {d.orders.length ? (
          <div style={{ ...BOX, display: 'grid', gap: 0 }}>
            {d.orders.map((o, i) => (
              <div key={o.id} style={{ padding: '14px 0', borderTop: i ? '1px solid var(--border-subtle)' : undefined, display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <b style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>{o.code}</b>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 800 }}>{money(o.total)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
                  {String(o.createdAt).slice(0, 10)}・{STATE_LABEL[o.state] || o.state}
                  {o.items?.length ? `・${o.items.map((x: any) => x.title).join('、')}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={BOX}>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--fg-secondary)' }}>還沒有訂單。</p>
          </div>
        )}
      </section>
    </div>
  );
}
