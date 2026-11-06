import { useEffect, useMemo, useState } from 'react';
import { api, type ReportRow, type Cert } from '../api';
import Icon from '../Icon';
import Name from '../Name';
import { downloadBlob } from '../certExport';

/**
 * 對帳／帳務總管。
 *
 * 上半：依「講師 × 月份」加總張數、已印、已寄、金額、結算狀況（講師也看得到自己的）。
 * 下半（只有 owner）：
 *   ① 待開發票——對方已匯款且要發票、還沒開的，列出買受人/統編/含稅金額，填發票號按「已開發票」。
 *   ② 逐筆損益——每一張填信封／卡紙／掛號成本和郵局單號，即時算「實收−成本＝賺／虧」，底部加總。
 */

const money = (n: number) => (n || 0).toLocaleString('zh-TW');
const costOf = (c: Cert) => (Number(c.costEnvelope) || 0) + (Number(c.costCard) || 0) + (Number(c.costPostage) || 0);
const revOf = (c: Cert) => (c.paid ? (Number(c.paidNet) || 0) : 0);          // 實收（未稅，稅是代收代付不算收入）

export default function Report({ isOwner }: { isOwner: boolean }) {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [certs, setCerts] = useState<Cert[] | null>(null);
  const [err, setErr] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);

  async function load() {
    try {
      const r = await api.get<{ rows: ReportRow[] }>('/api/teacher/report');
      setRows(r.rows);
      if (isOwner) setCerts((await api.get<{ items: Cert[] }>('/api/teacher/certs')).items);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const patchCert = (id: string, patch: Partial<Cert>) => setCerts((cs) => (cs || []).map((c) => c.id === id ? { ...c, ...patch } : c));

  const shown = (rows || []).filter((r) => !onlyOpen || r.settled < r.count);
  const total = shown.reduce((a, r) => ({
    count: a.count + r.count, printed: a.printed + r.printed, shipped: a.shipped + r.shipped,
    amount: a.amount + r.amount, settledAmount: a.settledAmount + r.settledAmount,
  }), { count: 0, printed: 0, shipped: 0, amount: 0, settledAmount: 0 });

  function exportCsv() {
    const head = ['講師', '月份', '張數', '已印', '已寄', '已結算', '金額', '已結金額', '未結金額'];
    const lines = [head.join(',')];
    for (const r of shown) lines.push([r.instructor, r.month, r.count, r.printed, r.shipped, r.settled, r.amount, r.settledAmount, r.amount - r.settledAmount].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `對帳_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div>
      <div className="t-row" style={{ alignItems: 'center', marginBottom: 4 }}>
        <h1 className="t-h1" style={{ margin: 0 }}>對帳</h1>
        <span className="t-spacer" />
        {rows && rows.length > 0 && <button className="t-btn t-btn--ghost t-btn--sm" onClick={exportCsv}><Icon name="download" size={14} /> 匯出 CSV</button>}
      </div>
      <p className="t-intro">{isOwner
        ? '上面是講師×月的加總；下面可以每張填成本、看賺多少，還有要開的發票。'
        : '你的證照對帳：張數、該付多少、已結多少、還欠多少。虎智收款後標「已結算」，這裡就更新。'}</p>

      {err && <div className="t-msg t-msg--err">{err}</div>}
      {rows && rows.length > 0 && (
        <label className="t-check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> 只看未結清（把已全部結算的月份收起來）
        </label>
      )}

      {rows === null ? <div className="t-empty">載入中…</div>
        : shown.length === 0 ? <div className="t-empty">{onlyOpen ? '沒有未結清的，全部都對完帳了 🎉' : '還沒有資料。'}</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="t-report">
                <thead><tr>
                  {isOwner && <th>講師</th>}<th>月份</th>
                  <th className="num">張數</th><th className="num">已印</th><th className="num">已寄</th>
                  <th className="num">已結算</th><th className="num">金額</th><th className="num">未結金額</th>
                </tr></thead>
                <tbody>
                  {shown.map((r, i) => {
                    const open = r.amount - r.settledAmount;
                    return (
                      <tr key={i}>
                        {isOwner && <td><b>{r.instructor}</b></td>}
                        <td className="t-mono">{r.month}</td>
                        <td className="num">{r.count}</td><td className="num">{r.printed}</td><td className="num">{r.shipped}</td>
                        <td className="num">{r.settled}/{r.count}{r.settled >= r.count && <span style={{ color: '#2e7d57' }}> ✓</span>}</td>
                        <td className="num">{money(r.amount)}</td>
                        <td className="num" style={{ color: open > 0 ? 'var(--t-danger)' : 'var(--t-fg-3)' }}>{money(open)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr>
                  <td colSpan={isOwner ? 2 : 1}>合計</td>
                  <td className="num">{total.count}</td><td className="num">{total.printed}</td><td className="num">{total.shipped}</td>
                  <td className="num">—</td><td className="num">{money(total.amount)}</td><td className="num">{money(total.amount - total.settledAmount)}</td>
                </tr></tfoot>
              </table>
            </div>
          )}

      {isOwner && certs && <InvoiceQueue certs={certs} onChange={load} />}
      {isOwner && certs && <Pnl certs={certs} onPatch={patchCert} />}
    </div>
  );
}

/** ① 待開發票：對方已匯款、要發票、還沒開的。填發票號 → 標記已開。 */
function InvoiceQueue({ certs, onChange }: { certs: Cert[]; onChange: () => void }) {
  const queue = certs.filter((c) => c.paid && c.needInvoice && !c.invoiced);
  if (!queue.length) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <h2 className="t-h2">待開發票（{queue.length}）</h2>
      <p className="t-intro" style={{ marginBottom: 10 }}>對方已匯款、要開發票的。照著買受人／統編／金額開統一發票，填發票號後按「已開發票」。</p>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {queue.map((c) => <InvoiceCard key={c.id} cert={c} onDone={onChange} />)}
      </div>
    </div>
  );
}
function InvoiceCard({ cert, onDone }: { cert: Cert; onDone: () => void }) {
  const [no, setNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function issue() {
    setErr(''); setBusy(true);
    try { await api.post('/api/teacher/certs/invoice', { ids: [cert.id], value: true, invoiceNo: no.trim() }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="t-panel" style={{ margin: 0 }}>
      <div className="t-row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <b>{cert.invoiceBuyer || cert.instructorName}</b>
        <span className="t-pill" data-tone="warn">含稅</span>
        <span className="t-spacer t-mono" style={{ fontSize: 13 }}>NT$ {money(cert.paidAmount)}</span>
      </div>
      <div className="t-card__meta">
        <span><b>統編</b> {cert.taxId || '—'}</span>
        <span><b>品名</b> n8n 證照　{cert.recipientName ? `${cert.recipientName}／` : ''}{cert.studentName}</span>
        <span><b>銷售額</b> {money(cert.paidNet)}</span>
        <span><b>稅</b> {money(cert.paidTax)}</span>
      </div>
      {err && <div className="t-msg t-msg--err" style={{ marginTop: 6 }}>{err}</div>}
      <div className="t-row" style={{ gap: 8, marginTop: 8 }}>
        <input className="t-input" style={{ maxWidth: 180 }} value={no} onChange={(e) => setNo(e.target.value)} placeholder="發票號碼（可留空）" />
        <button className="t-btn t-btn--brand t-btn--sm" disabled={busy} onClick={issue}>{busy ? '處理中…' : '已開發票'}</button>
      </div>
    </div>
  );
}

/** ② 逐筆損益：每張填信封/卡紙/掛號成本與郵局單號，即時算賺虧，底部加總。 */
function Pnl({ certs, onPatch }: { certs: Cert[]; onPatch: (id: string, patch: Partial<Cert>) => void }) {
  const t = useMemo(() => certs.reduce((a, c) => ({
    rev: a.rev + revOf(c), cost: a.cost + costOf(c), profit: a.profit + (revOf(c) - costOf(c)),
  }), { rev: 0, cost: 0, profit: 0 }), [certs]);
  return (
    <div style={{ marginTop: 28 }}>
      <h2 className="t-h2">逐筆損益（{certs.length}）</h2>
      <p className="t-intro" style={{ marginBottom: 10 }}>每張填寄送成本（信封／卡紙／掛號，掛號逐張可不同）和郵局單號，離開欄位就自動存。賺＝實收−成本（還沒匯款的實收算 0，會顯示為虧，收款後翻正）。</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="t-report t-pnl">
          <thead><tr>
            <th>學員／講師</th><th className="num">實收</th>
            <th className="num">信封</th><th className="num">卡紙</th><th className="num">掛號</th>
            <th className="num">成本</th><th className="num">賺／虧</th><th>郵局單號</th>
          </tr></thead>
          <tbody>
            {certs.map((c) => <PnlRow key={c.id} c={c} onPatch={onPatch} />)}
          </tbody>
          <tfoot><tr>
            <td>合計</td>
            <td className="num">{money(t.rev)}</td>
            <td className="num" colSpan={3}>成本合計 →</td>
            <td className="num">{money(t.cost)}</td>
            <td className="num" style={{ color: t.profit >= 0 ? 'var(--t-ok)' : 'var(--t-danger)' }}>{money(t.profit)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}
function PnlRow({ c, onPatch }: { c: Cert; onPatch: (id: string, patch: Partial<Cert>) => void }) {
  const [env, setEnv] = useState(c.costEnvelope ? String(c.costEnvelope) : '');
  const [card, setCard] = useState(c.costCard ? String(c.costCard) : '');
  const [post, setPost] = useState(c.costPostage ? String(c.costPostage) : '');
  const [trk, setTrk] = useState(c.tracking || '');
  async function save(patch: Partial<Cert>) {
    try { await api.post('/api/teacher/certs/cost', { id: c.id, ...patch }); onPatch(c.id, patch); }
    catch { /* 失敗就下次再存，不打斷輸入 */ }
  }
  const cost = (Number(env) || 0) + (Number(card) || 0) + (Number(post) || 0);
  const rev = revOf(c);
  const profit = rev - cost;
  const numIn = (v: string, set: (s: string) => void, onSave: () => void) => (
    <input className="t-input t-pnl__in" type="number" min={0} value={v} onChange={(e) => set(e.target.value)} onBlur={onSave} />
  );
  return (
    <tr>
      <td><Name zh={c.recipientName} en={c.studentName} /><br /><span style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>{c.instructorName}{c.serial ? `　${c.serial}` : ''}</span></td>
      <td className="num">{c.paid ? money(rev) : <span style={{ color: 'var(--t-fg-3)' }}>未付</span>}</td>
      <td className="num">{numIn(env, setEnv, () => save({ costEnvelope: Number(env) || 0 }))}</td>
      <td className="num">{numIn(card, setCard, () => save({ costCard: Number(card) || 0 }))}</td>
      <td className="num">{numIn(post, setPost, () => save({ costPostage: Number(post) || 0 }))}</td>
      <td className="num">{money(cost)}</td>
      <td className="num" style={{ color: profit >= 0 ? 'var(--t-ok)' : 'var(--t-danger)', fontWeight: 700 }}>{money(profit)}</td>
      <td><input className="t-input t-pnl__trk" value={trk} onChange={(e) => setTrk(e.target.value)} onBlur={() => save({ tracking: trk.trim() })} placeholder="郵局單號" /></td>
    </tr>
  );
}
