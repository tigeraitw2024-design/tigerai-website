import { useEffect, useState } from 'react';
import { api, type SchemaResponse } from '../api';
import Icon from '../ui/Icon';

/**
 * 總覽。
 *
 * 只顯示「現在該做什麼」——待確認的預約、待付款的訂單、寄不出去的信。
 * 不做圖表：後台開起來是為了處理事情，不是看曲線。真要看趨勢，
 * 匯出 CSV 丟進試算表比任何內建圖表都好用。
 */
export default function Dashboard({ schema }: { schema: SchemaResponse }) {
  const [data, setData] = useState<any>(null);
  const [pub, setPub] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/api/admin/ops/dashboard').then(setData).catch(() => setData({}));
  }, []);

  async function publish() {
    setBusy(true);
    setPub(null);
    try {
      const r = await api.post<{ message: string }>('/api/admin/ops/publish');
      setPub({ tone: 'ok', text: r.message });
    } catch (e: any) {
      setPub({ tone: 'err', text: e.message + (e.how ? `\n${e.how}` : '') });
    } finally {
      setBusy(false);
    }
  }

  const b = data?.business;
  const s = data?.system;
  const c = data?.content;

  return (
    <>
      <h1 className="a-h1">總覽</h1>
      <p className="a-intro">
        這裡只放「現在該處理的事」。要找東西請用左邊的選單，第一次用請先看
        <a href="#/help"> 操作手冊</a>。
      </p>

      {pub && (
        <div className={`a-msg a-msg--${pub.tone === 'ok' ? 'ok' : 'err'}`} style={{ whiteSpace: 'pre-line' }}>
          {pub.text}
        </div>
      )}

      {schema.role === 'owner' && (
        <div className="a-panel">
          <div className="a-panel__h">改完內容之後</div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--a-fg-2)' }}>
            前台是靜態網頁，改了資料庫不會自動變。按這個按鈕會重新產生前台，大約 2–3 分鐘。
          </p>
          <button className="a-btn a-btn--brand" onClick={publish} disabled={busy}>
            <Icon name="rocket" size={16} /> {busy ? '送出中…' : '發布到前台'}
          </button>
        </div>
      )}

      {b && (
        <div className="a-panel">
          <div className="a-panel__h">要處理的</div>
          <div className="a-stats">
            <a className="a-stat" href="#/bookings" data-alert={b.bookingsPending ? '1' : '0'} style={{ textDecoration: 'none', color: 'inherit' }}>
              <b>{b.bookingsPending}</b><span>待確認預約</span>
            </a>
            <a className="a-stat" href="#/orders" data-alert={b.ordersPending ? '1' : '0'} style={{ textDecoration: 'none', color: 'inherit' }}>
              <b>{b.ordersPending}</b><span>待付款訂單</span>
            </a>
            <a className="a-stat" href="#/leads" style={{ textDecoration: 'none', color: 'inherit' }}>
              <b>{b.leadsWeek}</b><span>本週新名單</span>
            </a>
            <a className="a-stat" href="#/members" style={{ textDecoration: 'none', color: 'inherit' }}>
              <b>{b.members}</b><span>會員</span>
            </a>
          </div>
          <p className="a-f__help" style={{ marginTop: 10 }}>
            預約送出後 24 小時內沒有人確認，系統會自動取消並把時段放回去。
          </p>
        </div>
      )}

      {c && (
        <div className="a-panel">
          <div className="a-panel__h">網站內容</div>
          <div className="a-stats">
            <a className="a-stat" href="#/courses" style={{ textDecoration: 'none', color: 'inherit' }}><b>{c.courses}</b><span>課程</span></a>
            <a className="a-stat" href="#/products" style={{ textDecoration: 'none', color: 'inherit' }}><b>{c.products}</b><span>產品線</span></a>
            <a className="a-stat" href="#/consultants" style={{ textDecoration: 'none', color: 'inherit' }}><b>{c.consultants}</b><span>顧問</span></a>
            <a className="a-stat" href="#/posts" style={{ textDecoration: 'none', color: 'inherit' }}><b>{c.posts}</b><span>文章</span></a>
            <a className="a-stat" href="#/cases" style={{ textDecoration: 'none', color: 'inherit' }}><b>{c.cases}</b><span>案例</span></a>
          </div>
        </div>
      )}

      {s && (
        <div className="a-panel">
          <div className="a-panel__h">系統</div>
          <div className="a-stats">
            <div className="a-stat"><b>{s.mailQueued}</b><span>待寄出的信</span></div>
            <div className="a-stat" data-alert={s.mailFailed ? '1' : '0'}><b>{s.mailFailed}</b><span>寄不出去的信</span></div>
            <a className="a-stat" href="#/media" style={{ textDecoration: 'none', color: 'inherit' }}><b>{s.media}</b><span>檔案</span></a>
            <a className="a-stat" href="#/users" style={{ textDecoration: 'none', color: 'inherit' }}><b>{s.users}</b><span>後台帳號</span></a>
          </div>
          {s.mailFailed > 0 && (
            <p className="a-f__help" style={{ marginTop: 10, color: 'var(--a-danger)' }}>
              有信寄不出去，通常是寄信設定還沒接上。目前的寄信方式如果是 console，
              那是正常的——信會留在佇列裡不會真的寄出。
            </p>
          )}
        </div>
      )}

      <div className="a-panel">
        <div className="a-panel__h">你的權限</div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--a-fg-2)' }}>
          角色：<b className="a-mono">{schema.role}</b>
          {schema.canSeePII ? '可以看到客戶的完整聯絡方式。' : '客戶的聯絡方式會遮起來，這是設計如此。'}
        </p>
      </div>
    </>
  );
}
