import { useEffect, useMemo, useState } from 'react';
import { api, type Cert, type BillingConfig, type TeacherUser } from '../api';
import Icon from '../Icon';
import Name from '../Name';

/**
 * 結帳頁（所有人登入都看自己的）。
 *
 * 講師看自己名下、還沒匯款的證照，勾選後按「結帳」，畫面用「統一發票（三聯式）」
 * 的樣子把帳算給他看：品名、數量、單價、金額、銷售額合計、營業稅、總計、中文大寫，
 * 再附上虎智的匯款帳戶。要不要開發票由付款方自己選：要＝含稅、填統編；不要＝未稅直接實收。
 * 按「已匯款」就把這幾筆標成已付（金額用當下設定快照）。
 *
 * owner（虎智＝收款方）也能看，可用上面的「選講師」切換，代對方標記已匯款。
 */

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 金額轉中文大寫（給發票用，處理到億）。 */
function toCNY(n: number): string {
  n = Math.round(n);
  if (n <= 0) return '零元整';
  const D = '零壹貳參肆伍陸柒捌玖';
  const U = ['', '拾', '佰', '仟'];
  const G = ['', '萬', '億', '兆'];
  const groups: string[] = [];
  let str = String(n);
  while (str.length) { groups.unshift(str.slice(-4)); str = str.slice(0, -4); }
  let out = '';
  for (let gi = 0; gi < groups.length; gi++) {
    const grp = groups[gi];
    const gexp = groups.length - 1 - gi;
    let part = ''; let zero = false;
    for (let i = 0; i < grp.length; i++) {
      const d = +grp[i];
      const uexp = grp.length - 1 - i;
      if (d === 0) zero = true;
      else { if (zero && part) part += '零'; zero = false; part += D[d] + U[uexp]; }
    }
    if (part) out += part + G[gexp];
  }
  out = out.replace(/零+$/, '');
  return out + '元整';
}

/** 民國年。 */
const rocYear = (d: Date) => d.getFullYear() - 1911;

export default function Checkout({ user }: { user: TeacherUser }) {
  const isOwner = user.role === 'owner';
  const [rows, setRows] = useState<Cert[] | null>(null);
  const [bill, setBill] = useState<BillingConfig | null>(null);
  const [who, setWho] = useState('');                    // owner 篩選的講師名（空＝全部）
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [needInvoice, setNeedInvoice] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const [c, b] = await Promise.all([
        api.get<{ items: Cert[] }>('/api/teacher/certs'),
        api.get<{ billing: BillingConfig }>('/api/teacher/billing'),
      ]);
      setRows(c.items); setBill(b.billing);
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const instructors = useMemo(() => [...new Set((rows || []).map((r) => r.instructorName).filter(Boolean))], [rows]);
  const scoped = useMemo(() => (rows || []).filter((r) => (!isOwner || !who || r.instructorName === who)), [rows, who, isOwner]);
  const unpaid = useMemo(() => scoped.filter((r) => !r.paid), [scoped]);
  const paid = useMemo(() => scoped.filter((r) => r.paid), [scoped]);
  const selCerts = useMemo(() => unpaid.filter((r) => sel.has(r.id)), [unpaid, sel]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); setMsg(''); return n; });
  const allOn = unpaid.length > 0 && unpaid.every((r) => sel.has(r.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allOn) unpaid.forEach((r) => n.delete(r.id)); else unpaid.forEach((r) => n.add(r.id)); return n; });

  if (err && !rows) return <div className="t-msg t-msg--err">{err}</div>;
  if (!rows || !bill) return <div className="t-empty">載入中…</div>;

  const price = Number(bill.unitPrice) || 0;
  const qty = selCerts.length;
  const net = qty * price;
  const tax = needInvoice ? Math.round(net * (Number(bill.taxRate) || 0) / 100) : 0;
  const total = net + tax;
  const now = new Date();
  const defaultBuyer = who || (isOwner ? '' : user.name);
  const buyer = buyerName.trim() || defaultBuyer;

  async function pay() {
    if (!qty) return;
    if (needInvoice && !taxId.trim()) { setErr('要開發票就要填統一編號。'); return; }
    if (needInvoice && !buyer.trim()) { setErr('要開發票就要填買受人。'); return; }
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.post('/api/teacher/certs/pay', { ids: [...sel], value: true, needInvoice, taxId: taxId.trim(), buyer: buyer.trim() });
      setMsg(`已送出！標記為已匯款 ${qty} 筆，總計 NT$ ${total.toLocaleString()}${needInvoice ? '（含稅，會開立發票）' : '（未稅）'}。`);
      setSel(new Set()); setNeedInvoice(false); setTaxId('');
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="t-h1">結帳</h1>
      <p className="t-intro">
        勾選要結帳的證照，右邊會用「統一發票（三聯式）」的樣子把金額算給你看，並附上匯款帳戶。
        每月 <b>{bill.settleDay}</b> 號結帳。單價 NT$ {price}（未稅）；要開發票就是含稅 NT$ {price + Math.round(price * (bill.taxRate || 0) / 100)}。
      </p>
      {err && <div className="t-msg t-msg--err">{err}</div>}
      {msg && <div className="t-msg t-msg--ok">{msg}</div>}

      {isOwner && (
        <div className="t-row" style={{ marginBottom: 12, gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--t-fg-2)' }}>選講師（代結帳）</span>
          <select className="t-input" style={{ maxWidth: 240 }} value={who} onChange={(e) => { setWho(e.target.value); setSel(new Set()); }}>
            <option value="">— 請選一位講師 —</option>
            {instructors.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      <div className="t-gen">
        {/* 左：待結帳清單 */}
        <div className="t-gen__stage" style={{ padding: 0, background: 'transparent', border: 'none' }}>
          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-row" style={{ alignItems: 'center', marginBottom: 8 }}>
              <div className="t-panel__h" style={{ margin: 0 }}>待結帳（{unpaid.length}）</div>
              <span className="t-spacer" />
              {unpaid.length > 0 && <label className="t-check" style={{ margin: 0, fontSize: 13 }}>
                <input type="checkbox" checked={allOn} onChange={toggleAll} /> 全選
              </label>}
            </div>
            {unpaid.length === 0 ? (
              <div className="t-empty" style={{ padding: 20 }}>{isOwner && !who ? '選一位講師來看他要結的帳。' : '沒有待結帳的項目，都付清了 🎉'}</div>
            ) : unpaid.map((r) => (
              <label key={r.id} className="t-payrow" data-sel={sel.has(r.id) ? '1' : '0'}>
                <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                <span className="t-payrow__name"><Name zh={r.recipientName} en={r.studentName} />{r.serial ? <span className="t-mono" style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>　{r.serial}</span> : null}</span>
                <span className="t-payrow__meta">{r.course}{isOwner && !who ? `　·　${r.instructorName}` : ''}</span>
                <span className="t-payrow__amt">NT$ {price}</span>
              </label>
            ))}
          </div>

          {paid.length > 0 && (
            <div className="t-panel" style={{ margin: 0, marginTop: 14 }}>
              <div className="t-panel__h">已匯款（{paid.length}）</div>
              {paid.map((r) => (
                <div key={r.id} className="t-payrow" style={{ cursor: 'default' }}>
                  <Icon name="check" size={16} />
                  <span className="t-payrow__name">{r.studentName}</span>
                  <span className="t-payrow__meta">{r.needInvoice ? `含稅·統編 ${r.taxId}` : '未稅'}{r.invoiced ? '·已開票' : ''}</span>
                  <span className="t-payrow__amt">NT$ {(r.paidAmount || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：統一發票（三聯式）試算 */}
        <aside className="t-gen__side">
          <div className="t-inv">
            <div className="t-inv__title">統一發票（三聯式）試算</div>
            <div className="t-inv__sub">中華民國 {rocYear(now)} 年　{MON3[now.getMonth()]} {now.getDate()}日</div>
            <div className="t-inv__party">
              <div>買受人：<b>{buyer || <span style={{ color: 'var(--t-fg-3)', fontWeight: 400 }}>（請填買受人）</span>}</b></div>
              <div>統一編號：{needInvoice ? (taxId || <span style={{ color: 'var(--t-danger)' }}>（要填）</span>) : '—（未稅免開）'}</div>
            </div>
            <div className="t-invtbl-scroll">
              <table className="t-invtbl">
                <thead><tr><th>品名</th><th style={{ width: 44 }}>數量</th><th style={{ width: 64 }}>單價</th><th style={{ width: 78 }}>金額</th></tr></thead>
                <tbody>
                  {qty === 0
                    ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t-fg-3)', padding: 16 }}>左邊勾選要結帳的證照…</td></tr>
                    : selCerts.map((r) => (
                      <tr key={r.id}><td><div style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>n8n 證照</div><Name zh={r.recipientName} en={r.studentName} /></td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'right' }}>{price}</td><td style={{ textAlign: 'right' }}>{price}</td></tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="t-invtot">
              <div className="t-invtot__row"><span>銷售額合計</span><b>{net.toLocaleString()}</b></div>
              <div className="t-invtot__row"><span>營業稅{needInvoice ? `（${bill.taxRate}%）` : '（未稅免開）'}</span><b>{tax.toLocaleString()}</b></div>
              <div className="t-invtot__row t-invtot__row--total"><span>總計</span><b>{total.toLocaleString()}</b></div>
            </div>
            <div className="t-inv__cny">總計新臺幣（中文大寫）：<b>{toCNY(total)}</b></div>

            <div className="t-f" style={{ margin: '10px 0 6px' }}><label className="t-f__label">買受人</label>
              <input className="t-input" value={buyerName} onChange={(e) => { setBuyerName(e.target.value); setMsg(''); }} placeholder={defaultBuyer || '買受人名稱／公司抬頭'} /></div>
            <label className="t-check" style={{ margin: '6px 0' }}>
              <input type="checkbox" checked={needInvoice} onChange={(e) => { setNeedInvoice(e.target.checked); setMsg(''); }} /> 我要開統一發票（含稅）
            </label>
            {needInvoice && (
              <div className="t-f" style={{ marginBottom: 8 }}><label className="t-f__label">統一編號（公司）</label>
                <input className="t-input" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="8 碼統編" inputMode="numeric" /></div>
            )}

            <div className="t-inv__bank">
              <div className="t-inv__bank-h">匯款帳戶</div>
              <div>{bill.bankName}　{bill.bankBranch}</div>
              <div className="t-mono" style={{ fontSize: 15, fontWeight: 700 }}>{bill.bankAccount}</div>
              <div>{bill.bankHolder}</div>
            </div>

            <button className="t-btn t-btn--brand" style={{ width: '100%', marginTop: 10 }} disabled={busy || qty === 0} onClick={pay}>
              <Icon name="check" size={16} /> {busy ? '送出中…' : `我已匯款 ${qty ? `（${qty} 張 · NT$ ${total.toLocaleString()}）` : ''}`}
            </button>
            <p className="t-f__help" style={{ marginTop: 8 }}>按下＝把這幾筆標記為已匯款，金額會鎖定當下的設定。虎智收到款項會再核對。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
