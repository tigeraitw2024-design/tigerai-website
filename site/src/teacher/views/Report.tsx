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
        ? '上面是講師×月的加總；下面可以每張填成本、看賺多少。發票到「開發票」頁開。'
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
      {isOwner && certs && <Pnl certs={certs} onPatch={patchCert} />}
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

/** 逐筆損益：填信封/卡紙/掛號成本與郵局單號，按該列「存」才寫入（不自動存、不亂跳）。
 * 上面「統一套用」可把信封/卡紙/掛號一次帶到全部，再逐張改掛號。單號存了講師也看得到。 */
function Pnl({ certs, onPatch }: { certs: Cert[]; onPatch: (id: string, patch: Partial<Cert>) => void }) {
  type E = { env?: string; card?: string; post?: string; trk?: string };
  const [edits, setEdits] = useState<Record<string, E>>({});
  const [savedId, setSavedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [envAll, setEnvAll] = useState('');
  const [cardAll, setCardAll] = useState('');
  const [postAll, setPostAll] = useState('');
  const [applying, setApplying] = useState(false);

  const g = (c: Cert, k: keyof E, fb: string) => { const e = edits[c.id]; return e && e[k] !== undefined ? (e[k] as string) : fb; };
  const setField = (id: string, k: keyof E, v: string) => { setEdits((m) => ({ ...m, [id]: { ...m[id], [k]: v } })); setSavedId(''); };
  const nEnv = (c: Cert) => Number(g(c, 'env', c.costEnvelope ? String(c.costEnvelope) : '')) || 0;
  const nCard = (c: Cert) => Number(g(c, 'card', c.costCard ? String(c.costCard) : '')) || 0;
  const nPost = (c: Cert) => Number(g(c, 'post', c.costPostage ? String(c.costPostage) : '')) || 0;
  const costEff = (c: Cert) => nEnv(c) + nCard(c) + nPost(c);
  const dirty = (c: Cert) => {
    const e = edits[c.id]; if (!e) return false;
    return (e.env !== undefined && (Number(e.env) || 0) !== (c.costEnvelope || 0))
      || (e.card !== undefined && (Number(e.card) || 0) !== (c.costCard || 0))
      || (e.post !== undefined && (Number(e.post) || 0) !== (c.costPostage || 0))
      || (e.trk !== undefined && e.trk.trim() !== (c.tracking || ''));
  };
  async function saveRow(c: Cert) {
    setBusyId(c.id);
    const patch: Partial<Cert> = { costEnvelope: nEnv(c), costCard: nCard(c), costPostage: nPost(c), tracking: g(c, 'trk', c.tracking || '').trim() };
    try {
      await api.post('/api/teacher/certs/cost', { id: c.id, ...patch });
      onPatch(c.id, patch);
      setEdits((m) => { const n = { ...m }; delete n[c.id]; return n; });
      setSavedId(c.id);
    } catch { /* 下次再存 */ } finally { setBusyId(''); }
  }
  async function applyAll() {
    if (envAll === '' && cardAll === '' && postAll === '') return;
    setApplying(true);
    try {
      for (const c of certs) {
        const patch: Partial<Cert> = {};
        if (envAll !== '') patch.costEnvelope = Number(envAll) || 0;
        if (cardAll !== '') patch.costCard = Number(cardAll) || 0;
        if (postAll !== '') patch.costPostage = Number(postAll) || 0;
        await api.post('/api/teacher/certs/cost', { id: c.id, ...patch });
        onPatch(c.id, patch);
      }
      setEdits({}); setEnvAll(''); setCardAll(''); setPostAll(''); setSavedId('*');
    } catch { /* ignore */ } finally { setApplying(false); }
  }
  const t = certs.reduce((a, c) => ({ rev: a.rev + revOf(c), cost: a.cost + costEff(c), profit: a.profit + (revOf(c) - costEff(c)) }), { rev: 0, cost: 0, profit: 0 });
  const numIn = (v: string, on: (s: string) => void) => <input className="t-input t-pnl__in" type="number" min={0} value={v} onChange={(e) => on(e.target.value)} />;

  function exportCsv() {
    const cols: [string, (c: Cert) => unknown][] = [
      ['編號', (c) => c.serial], ['收件中文名', (c) => c.recipientName], ['英文名', (c) => c.studentName], ['講師', (c) => c.instructorName],
      ['實收', (c) => revOf(c)], ['信封', (c) => nEnv(c)], ['卡紙', (c) => nCard(c)], ['掛號', (c) => nPost(c)],
      ['成本', (c) => costEff(c)], ['賺虧', (c) => revOf(c) - costEff(c)], ['郵局單號', (c) => c.tracking],
      ['已匯款', (c) => (c.paid ? '是' : '')], ['後五碼', (c) => c.payLast5], ['已結算', (c) => (c.settled ? '是' : '')],
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [cols.map((x) => x[0]).join(',')];
    for (const c of certs) lines.push(cols.map((x) => esc(x[1](c))).join(','));
    lines.push(['合計', '', '', '', t.rev, '', '', '', t.cost, t.profit, '', '', '', ''].map(esc).join(','));
    downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `證書費用損益_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div className="t-row" style={{ alignItems: 'center', marginBottom: 2 }}>
        <h2 className="t-h2" style={{ margin: 0 }}>逐筆損益（{certs.length}）</h2>
        <span className="t-spacer" />
        {certs.length > 0 && <button className="t-btn t-btn--ghost t-btn--sm" onClick={exportCsv}><Icon name="download" size={14} /> 匯出證書費用 CSV</button>}
      </div>
      <p className="t-intro" style={{ marginBottom: 10 }}>填信封／卡紙／掛號成本和郵局單號，<b>按該列的「存」才會寫入</b>（不會自己亂跳）。信封／卡紙每張多半一樣，用下面「統一套用」一次帶到全部，再逐張改掛號。賺＝實收−成本。單號存了講師在自己的清單也看得到，能自己查件。</p>
      <div className="t-applybar">
        <span style={{ fontWeight: 700, fontSize: 13 }}>統一套用</span>
        <label>信封 {numIn(envAll, setEnvAll)}</label>
        <label>卡紙 {numIn(cardAll, setCardAll)}</label>
        <label>掛號 {numIn(postAll, setPostAll)}</label>
        <button className="t-btn t-btn--brand t-btn--sm" disabled={applying || (envAll === '' && cardAll === '' && postAll === '')} onClick={applyAll}>{applying ? '套用中…' : `套用到全部 ${certs.length} 筆`}</button>
        <span className="t-f__help" style={{ margin: 0 }}>只套有填的欄位，空白不動。</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="t-report t-pnl">
          <thead><tr>
            <th>學員／講師</th><th className="num">實收</th>
            <th className="num">信封</th><th className="num">卡紙</th><th className="num">掛號</th>
            <th className="num">成本</th><th className="num">賺／虧</th><th>郵局單號</th><th></th>
          </tr></thead>
          <tbody>
            {certs.map((c) => {
              const rev = revOf(c); const cost = costEff(c); const profit = rev - cost;
              const d = dirty(c); const saved = (savedId === c.id || savedId === '*') && !d;
              return (
                <tr key={c.id}>
                  <td><Name zh={c.recipientName} en={c.studentName} /><br /><span style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>{c.instructorName}{c.serial ? `　${c.serial}` : ''}</span></td>
                  <td className="num">{c.paid ? money(rev) : <span style={{ color: 'var(--t-fg-3)' }}>未付</span>}</td>
                  <td className="num">{numIn(g(c, 'env', c.costEnvelope ? String(c.costEnvelope) : ''), (v) => setField(c.id, 'env', v))}</td>
                  <td className="num">{numIn(g(c, 'card', c.costCard ? String(c.costCard) : ''), (v) => setField(c.id, 'card', v))}</td>
                  <td className="num">{numIn(g(c, 'post', c.costPostage ? String(c.costPostage) : ''), (v) => setField(c.id, 'post', v))}</td>
                  <td className="num">{money(cost)}</td>
                  <td className="num" style={{ color: profit >= 0 ? 'var(--t-ok)' : 'var(--t-danger)', fontWeight: 700 }}>{money(profit)}</td>
                  <td><input className="t-input t-pnl__trk" value={g(c, 'trk', c.tracking || '')} onChange={(e) => setField(c.id, 'trk', e.target.value)} placeholder="郵局單號" /></td>
                  <td>{saved ? <span style={{ color: 'var(--t-ok)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>已存 ✓</span>
                    : <button className="t-btn t-btn--brand t-btn--sm" disabled={!d || busyId === c.id} onClick={() => saveRow(c)}>{busyId === c.id ? '存…' : '存'}</button>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr>
            <td>合計</td><td className="num">{money(t.rev)}</td>
            <td className="num" colSpan={3}>成本合計 →</td>
            <td className="num">{money(t.cost)}</td>
            <td className="num" style={{ color: t.profit >= 0 ? 'var(--t-ok)' : 'var(--t-danger)' }}>{money(t.profit)}</td>
            <td></td><td></td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}
