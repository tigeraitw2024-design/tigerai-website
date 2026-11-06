import { useEffect, useState } from 'react';
import { api, type ReportRow, type Cert } from '../api';
import Icon from '../Icon';
import Name from '../Name';
import { downloadBlob } from '../certExport';

/**
 * 對帳／帳務總管。
 *
 * 上半：依「講師 × 月份」加總張數、已印、已寄、金額、結算狀況（講師也看得到自己的）。
 * 下半（只有 owner）：
 *   ① 收款核對——講師已匯款未結算的，對後五碼→確認收款或駁回。
 *   ② 損益總計——成本在「寄出」時填（輸出／信封／卡紙整批一價、掛號逐張），這裡只看總計統計。
 */

const money = (n: number) => (n || 0).toLocaleString('zh-TW');
const costOf = (c: Cert) => (Number(c.costPrint) || 0) + (Number(c.costEnvelope) || 0) + (Number(c.costCard) || 0) + (Number(c.costPostage) || 0);
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
        ? '上面是講師×月的加總；成本在「寄出」時填，下面只看收款核對與損益總計。發票到「開發票」頁開。'
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

      {isOwner && certs && <Reconcile certs={certs} onChange={load} />}
      {isOwner && certs && <Summary certs={certs} />}
    </div>
  );
}

/** 收款核對（owner）：講師已標已匯款、還沒結算的。對後五碼→確認收款（結算）或駁回退回。 */
function Reconcile({ certs, onChange }: { certs: Cert[]; onChange: () => void }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const queue = certs.filter((c) => c.paid && !c.settled);
  if (!queue.length) return null;
  async function confirm(id: string) {
    setBusy(id); setErr('');
    try { await api.post('/api/teacher/certs/settle', { ids: [id], value: true }); onChange(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }
  async function reject(c: Cert) {
    const reason = window.prompt(`駁回「${c.recipientName || c.studentName}」的匯款，請講師重新確認。原因：`, '對不到這筆款，請確認金額／後五碼或重新匯款');
    if (reason === null) return;
    setBusy(c.id); setErr('');
    try { await api.post('/api/teacher/certs/reject-pay', { id: c.id, reason }); onChange(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(''); }
  }
  return (
    <div style={{ marginTop: 28 }}>
      <h2 className="t-h2">收款核對（{queue.length}）</h2>
      <p className="t-intro" style={{ marginBottom: 10 }}>講師已標「已匯款」、還沒結算的。對一下金額和<b>後五碼</b>跟銀行帳單：對到按「確認收款」封存；對不到按「駁回」退回請他重新確認。</p>
      {err && <div className="t-msg t-msg--err">{err}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className="t-report">
          <thead><tr><th>學員</th><th>買受人</th><th className="num">金額</th><th>後五碼</th><th></th></tr></thead>
          <tbody>
            {queue.map((c) => (
              <tr key={c.id}>
                <td><Name zh={c.recipientName} en={c.studentName} />{c.serial ? <><br /><span style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>{c.serial}</span></> : null}</td>
                <td>{c.needInvoice ? `${c.invoiceBuyer || '—'}（統編 ${c.taxId || '—'}）` : <span style={{ color: 'var(--t-fg-3)' }}>未稅</span>}</td>
                <td className="num">{money(c.paidAmount)}</td>
                <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.payLast5 || <span style={{ color: 'var(--t-danger)', fontWeight: 400 }}>未填</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="t-btn t-btn--brand t-btn--sm" disabled={busy === c.id} onClick={() => confirm(c.id)}>確認收款</button>
                  <button className="t-btn t-btn--ghost t-btn--sm" style={{ marginLeft: 6, color: 'var(--t-danger)' }} disabled={busy === c.id} onClick={() => reject(c)}>駁回</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 損益總計：成本在「寄出」時填，這裡只看統計（總實收／總成本／總賺虧＋成本明細），可匯出逐筆明細。 */
function Summary({ certs }: { certs: Cert[] }) {
  const s = certs.reduce((a, c) => ({
    rev: a.rev + revOf(c),
    print: a.print + (Number(c.costPrint) || 0), env: a.env + (Number(c.costEnvelope) || 0),
    card: a.card + (Number(c.costCard) || 0), post: a.post + (Number(c.costPostage) || 0),
    paid: a.paid + (c.paid ? 1 : 0),
  }), { rev: 0, print: 0, env: 0, card: 0, post: 0, paid: 0 });
  const cost = s.print + s.env + s.card + s.post;
  const profit = s.rev - cost;

  function exportCsv() {
    const cols: [string, (c: Cert) => unknown][] = [
      ['編號', (c) => c.serial], ['收件中文名', (c) => c.recipientName], ['英文名', (c) => c.studentName], ['講師', (c) => c.instructorName],
      ['實收', (c) => revOf(c)], ['輸出', (c) => Number(c.costPrint) || 0], ['信封', (c) => Number(c.costEnvelope) || 0], ['卡紙', (c) => Number(c.costCard) || 0], ['寄件費', (c) => Number(c.costPostage) || 0],
      ['成本', (c) => costOf(c)], ['賺虧', (c) => revOf(c) - costOf(c)], ['郵局單號', (c) => c.tracking],
      ['已匯款', (c) => (c.paid ? '是' : '')], ['後五碼', (c) => c.payLast5], ['已結算', (c) => (c.settled ? '是' : '')],
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.map((x) => x[0]).join(',')];
    for (const c of certs) lines.push(cols.map((x) => esc(x[1](c))).join(','));
    lines.push(['合計', '', '', '', s.rev, s.print, s.env, s.card, s.post, cost, profit, '', '', '', ''].map(esc).join(','));
    downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `證書損益_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div className="t-row" style={{ alignItems: 'center', marginBottom: 2 }}>
        <h2 className="t-h2" style={{ margin: 0 }}>損益總計</h2>
        <span className="t-spacer" />
        {certs.length > 0 && <button className="t-btn t-btn--ghost t-btn--sm" onClick={exportCsv}><Icon name="download" size={14} /> 匯出逐筆明細 CSV</button>}
      </div>
      <p className="t-intro" style={{ marginBottom: 10 }}>成本在「寄出」時填（輸出／信封／卡紙／寄件費每張一價，特例逐筆改），這裡只看總計、不用逐筆對。賺＝實收−成本。</p>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="t-money__cell"><div className="t-money__v">NT$ {money(s.rev)}</div><div className="t-money__l">總實收（已匯款 {s.paid} 張）</div></div>
        <div className="t-money__cell" data-warn="1"><div className="t-money__v">NT$ {money(cost)}</div><div className="t-money__l">總成本</div></div>
        <div className="t-money__cell" style={profit < 0 ? { borderLeftColor: 'var(--t-danger)' } : undefined}><div className="t-money__v" style={{ color: profit >= 0 ? 'var(--t-ok)' : 'var(--t-danger)' }}>NT$ {money(profit)}</div><div className="t-money__l">總賺虧（實收−成本）</div></div>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="t-report" style={{ maxWidth: 560 }}>
          <thead><tr><th>成本項目</th><th className="num">輸出</th><th className="num">信封</th><th className="num">卡紙</th><th className="num">寄件費</th><th className="num">合計</th></tr></thead>
          <tbody><tr><td>全部加總</td><td className="num">{money(s.print)}</td><td className="num">{money(s.env)}</td><td className="num">{money(s.card)}</td><td className="num">{money(s.post)}</td><td className="num"><b>{money(cost)}</b></td></tr></tbody>
        </table>
      </div>
    </div>
  );
}
