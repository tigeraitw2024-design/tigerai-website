import { useEffect, useState } from 'react';
import { api, type Cert, type TeacherUser, type BillingConfig } from '../api';

/**
 * 儀表板（登入後的第一頁）。
 *
 * 一眼看懂現在證照清單的狀態分布，不用先點進清單慢慢數。
 * owner 另外有「需要你處理」：待接單、修改申請、已印待寄。
 * 點任一格 → 跳到清單並自動套用那個篩選（用 sessionStorage 傳給 Console）。
 */
export default function Dashboard({ user }: { user: TeacherUser }) {
  const isOwner = user.role === 'owner';
  const [rows, setRows] = useState<Cert[] | null>(null);
  const [bill, setBill] = useState<BillingConfig | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<{ items: Cert[] }>('/api/teacher/certs').then((r) => setRows(r.items)).catch((e) => setErr(e.message));
    api.get<{ billing: BillingConfig }>('/api/teacher/billing').then((r) => setBill(r.billing)).catch(() => {});
  }, []);

  const go = (filter: string) => {
    try { sessionStorage.setItem('tg_cert_filter', filter); } catch { /* 無痕視窗讀不到 */ }
    location.hash = '#/certs';
  };

  if (err) return <div className="t-msg t-msg--err">{err}</div>;
  if (!rows) return <div className="t-empty">載入中…</div>;

  const n = {
    all: rows.length,
    pending: rows.filter((r) => !r.accepted).length,
    making: rows.filter((r) => r.accepted && !r.printed).length,
    printedWait: rows.filter((r) => r.printed && !r.shipped).length,
    shipped: rows.filter((r) => r.shipped).length,
    editreq: rows.filter((r) => r.editRequest).length,
  };
  const unit = Number(bill?.unitPrice) || 0;
  const settleDay = Number(bill?.settleDay) || 10;
  const due = rows.filter((r) => r.shipped && !r.paid);          // 已寄出、對方還沒繳款＝未繳
  const paidRows = rows.filter((r) => r.paid);
  const dueCount = due.length;
  const dueAmount = dueCount * unit;                             // 未收款（未稅估）
  const collected = paidRows.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0); // 已收款（實收，含稅如有）
  const money = (x: number) => x.toLocaleString('zh-TW');

  const Card = ({ label, value, filter, tone }: { label: string; value: number; filter: string; tone?: string }) => (
    <button className="t-stat" data-tone={tone} onClick={() => go(filter)}>
      <div className="t-stat__v">{value}</div>
      <div className="t-stat__l">{label}</div>
    </button>
  );

  return (
    <div>
      <h1 className="t-h1">哈囉，{user.name}</h1>
      <p className="t-intro">
        {isOwner ? '全部證照的即時總覽，點任一格進清單看明細。' : '你上傳的證照即時總覽，點任一格看明細。'}
      </p>

      {/* 講師：已寄出但還沒繳款的大提示（寄出後才跳） */}
      {!isOwner && dueCount > 0 && (
        <a className="t-due" href="#/checkout">
          <div className="t-due__label">尚未繳款</div>
          <div className="t-due__amt">NT$ {money(dueAmount)}</div>
          <div className="t-due__sub">{dueCount} 張已寄出、還沒收到你的款項。請於每月 {settleDay} 號前匯款（要發票則含稅）。點這裡去結帳、看匯款帳戶 →</div>
        </a>
      )}

      {/* 主帳號：已繳／未繳、已收／未收 大面板 */}
      {isOwner && (
        <div className="t-money">
          <div className="t-money__cell"><div className="t-money__v">{paidRows.length}</div><div className="t-money__l">已繳款（人／張）</div></div>
          <div className="t-money__cell" data-warn={dueCount > 0 ? '1' : undefined}><div className="t-money__v">{dueCount}</div><div className="t-money__l">未繳款（已出貨待收）</div></div>
          <div className="t-money__cell"><div className="t-money__v">NT$ {money(collected)}</div><div className="t-money__l">已收款（代收）</div></div>
          <div className="t-money__cell" data-warn={dueAmount > 0 ? '1' : undefined}><div className="t-money__v">NT$ {money(dueAmount)}</div><div className="t-money__l">未收款（未代收）</div></div>
        </div>
      )}

      {isOwner && (n.pending > 0 || n.editreq > 0 || n.printedWait > 0) && (
        <div className="t-panel" style={{ borderColor: 'var(--t-brand)' }}>
          <div className="t-panel__h">需要你處理</div>
          <div className="t-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {n.pending > 0 && <button className="t-btn t-btn--brand t-btn--sm" onClick={() => go('pending')}>{n.pending} 筆待接單</button>}
            {n.editreq > 0 && <button className="t-btn t-btn--brand t-btn--sm" onClick={() => go('editreq')}>{n.editreq} 筆修改申請</button>}
            {n.printedWait > 0 && <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => go('printed')}>{n.printedWait} 筆已印待寄</button>}
          </div>
        </div>
      )}

      <div className="t-stats">
        <Card label="待確認" value={n.pending} filter="pending" tone="off" />
        <Card label="製作中" value={n.making} filter="making" tone="warn" />
        <Card label="已列印待寄" value={n.printedWait} filter="printed" tone="warn" />
        <Card label="已寄出" value={n.shipped} filter="shipped" tone="ok" />
        <Card label="全部" value={n.all} filter="all" />
      </div>

      {rows.length === 0 && (
        <div className="t-empty" style={{ marginTop: 16 }}>
          還沒有證照。先到「{isOwner ? '證照' : '證照'}」頁用「新增」或「匯入 Excel」把通過的學員加進來。
        </div>
      )}
    </div>
  );
}
