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
  const [gas, setGas] = useState<{ ok: boolean; text: string } | null>(null);
  const [gasBusy, setGasBusy] = useState(false);
  const [mig, setMig] = useState<{ ok: boolean; text: string } | null>(null);
  const [migBusy, setMigBusy] = useState(false);

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

  /** 測 Apps Script 通不通。只打 ping，不會寄信也不會寫試算表。 */
  async function testGas() {
    setGasBusy(true);
    setGas(null);
    try {
      const r = await api.post<{ ok: boolean; error?: string }>('/api/admin/ops/test-gas');
      setGas(r.ok ? { ok: true, text: 'Google 那邊接通了。' } : { ok: false, text: r.error || '連不上' });
    } catch (e: any) {
      setGas({ ok: false, text: e.message });
    } finally {
      setGasBusy(false);
    }
  }

  /** 不等 Cron，現在就把卡住的名單送出去。 */
  async function flushSync() {
    setGasBusy(true);
    setGas(null);
    try {
      const r = await api.post<{ ok: number; fail: number }>('/api/admin/ops/flush-sync');
      setGas({ ok: r.fail === 0, text: `送出 ${r.ok} 筆，失敗 ${r.fail} 筆。` });
      api.get('/api/admin/ops/dashboard').then(setData).catch(() => {});
    } catch (e: any) {
      setGas({ ok: false, text: e.message });
    } finally {
      setGasBusy(false);
    }
  }

  /** 補上新版本多出來的資料表。只會新增，不會刪或改既有資料。 */
  async function migrate() {
    setMigBusy(true);
    setMig(null);
    try {
      const r = await api.post<{ ok: boolean; message: string; fail: number; errors: string[] }>(
        '/api/admin/ops/migrate',
      );
      setMig({
        ok: r.ok,
        text: r.ok ? r.message : `${r.message}\n有 ${r.fail} 條沒跑過：${(r.errors || []).join('；')}`,
      });
      api.get('/api/admin/ops/dashboard').then(setData).catch(() => {});
    } catch (e: any) {
      setMig({ ok: false, text: e.message });
    } finally {
      setMigBusy(false);
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
            <div className="a-stat"><b>{s.syncQueued}</b><span>待送出的名單</span></div>
            <div className="a-stat" data-alert={s.syncFailed ? '1' : '0'}><b>{s.syncFailed}</b><span>送不出去的名單</span></div>
            <a className="a-stat" href="#/media" style={{ textDecoration: 'none', color: 'inherit' }}><b>{s.media}</b><span>檔案</span></a>
            <a className="a-stat" href="#/users" style={{ textDecoration: 'none', color: 'inherit' }}><b>{s.users}</b><span>後台帳號</span></a>
          </div>
          {s.mailFailed > 0 && (
            <p className="a-f__help" style={{ marginTop: 10, color: 'var(--a-danger)' }}>
              有信寄不出去，通常是寄信設定還沒接上。目前的寄信方式如果是 console，
              那是正常的——信會留在佇列裡不會真的寄出。
            </p>
          )}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--a-line)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--a-fg-2)', lineHeight: 1.7 }}>
              後台長出新功能時，有時候要多一張資料表。按這個會把缺的補上，
              既有的資料一筆都不會動。平常不用按，叫你按的時候再按。
            </p>
            <button className="a-btn" onClick={migrate} disabled={migBusy}>
              <Icon name="history" size={16} /> {migBusy ? '更新中…' : '更新資料表'}
            </button>
            {mig && (
              <div
                className={`a-msg a-msg--${mig.ok ? 'ok' : 'err'}`}
                style={{ marginTop: 12, marginBottom: 0, whiteSpace: 'pre-line' }}
              >
                {mig.text}
              </div>
            )}
          </div>
        </div>
      )}

      {s && (
        <div className="a-panel">
          <div className="a-panel__h">Google 中繼站</div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--a-fg-2)', lineHeight: 1.7 }}>
            官網的信是透過官網專用 Google 帳號上的一支小程式寄出去的，名單也是由它寫進
            「官網名單」試算表，CRM 每兩小時會去那份表抓一次。
            <br />
            寄信方式：<b className="a-mono">{s.mailProvider}</b>
            　名單同步：<b className="a-mono">{s.leadSync}</b>
            {s.mailProvider === 'console' && (
              <>
                <br />
                <span style={{ color: 'var(--a-warn, #B8860B)' }}>
                  現在是 console：信只會留在佇列裡，不會真的寄出去。接好 Google 之後要改成 gas。
                </span>
              </>
            )}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="a-btn" onClick={testGas} disabled={gasBusy}>
              <Icon name="plug" size={16} /> {gasBusy ? '測試中…' : '測試連線'}
            </button>
            <button className="a-btn" onClick={flushSync} disabled={gasBusy || !s.syncQueued}>
              <Icon name="send" size={16} /> 現在送出名單（{s.syncQueued}）
            </button>
          </div>
          {gas && (
            <div className={`a-msg a-msg--${gas.ok ? 'ok' : 'err'}`} style={{ marginTop: 12, marginBottom: 0 }}>
              {gas.text}
            </div>
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
