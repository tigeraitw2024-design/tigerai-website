import { useEffect, useMemo, useState } from 'react';
import { api, type Cert, type BillingConfig, type TeacherUser } from '../api';
import Icon from '../Icon';
import Name from '../Name';

/**
 * 結帳／開發票頁，依身分不同：
 *
 * 講師（付款方）＝「結帳」：勾自己名下還沒匯款的證照 → 用「統一發票（三聯式）」樣式
 *   把金額算出來（銷售額／稅／總計／中文大寫）＋匯款帳戶。要不要發票自己選。
 *   按「我已匯款」把這批標記已付，可填匯款帳號後五碼給虎智核對。
 *
 * 主帳號（收款／檢查方）＝「開發票」：這裡不付款。勾「對方已匯款＋要發票＋還沒開」的單，
 *   畫面用同一套統一發票樣式把買受人／統編／金額列清楚，方便照著填紙本三聯單，
 *   按「已開發票」標記完成（可填發票號）。金額用當初結帳鎖定的快照，不受之後改價影響。
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
const rocYear = (d: Date) => d.getFullYear() - 1911;

export default function Checkout({ user }: { user: TeacherUser }) {
  const isOwner = user.role === 'owner';
  const [rows, setRows] = useState<Cert[] | null>(null);
  const [bill, setBill] = useState<BillingConfig | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [needInvoice, setNeedInvoice] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [last5, setLast5] = useState('');
  const [invNo, setInvNo] = useState('');
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

  // 待處理清單：主帳號＝待開發票（已匯款＋要發票＋沒開）；講師＝自己還沒匯款的
  const todo = useMemo(() => (rows || []).filter((r) => isOwner ? (r.paid && r.needInvoice && !r.invoiced) : !r.paid), [rows, isOwner]);
  const done = useMemo(() => (rows || []).filter((r) => isOwner ? r.invoiced : r.paid), [rows, isOwner]);
  const selCerts = useMemo(() => todo.filter((r) => sel.has(r.id)), [todo, sel]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); setMsg(''); return n; });
  const allOn = todo.length > 0 && todo.every((r) => sel.has(r.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allOn) todo.forEach((r) => n.delete(r.id)); else todo.forEach((r) => n.add(r.id)); return n; });

  if (err && !rows) return <div className="t-msg t-msg--err">{err}</div>;
  if (!rows || !bill) return <div className="t-empty">載入中…</div>;

  const price = Number(bill.unitPrice) || 0;
  const qty = selCerts.length;
  const now = new Date();

  // 金額：主帳號用結帳當下鎖定的快照（paidNet/paidTax）；講師用現價＋是否要發票
  const owInvoice = isOwner;                                // 主帳號這頁一定是含稅（都要開發票的）
  const net = isOwner ? selCerts.reduce((s, r) => s + (Number(r.paidNet) || 0), 0) : qty * price;
  const tax = isOwner ? selCerts.reduce((s, r) => s + (Number(r.paidTax) || 0), 0) : (needInvoice ? Math.round(net * (Number(bill.taxRate) || 0) / 100) : 0);
  const total = net + tax;

  // 買受人／統編：主帳號從選到的單讀（同一買受人才能開一張）；講師自己填
  const buyers = [...new Set(selCerts.map((r) => (r.invoiceBuyer || r.recipientName || '').trim()).filter(Boolean))];
  const taxIds = [...new Set(selCerts.map((r) => (r.taxId || '').trim()).filter(Boolean))];
  const mixed = isOwner && (buyers.length > 1 || taxIds.length > 1);
  const buyer = isOwner ? (buyers[0] || '') : (buyerName.trim() || user.name);
  const shownTaxId = isOwner ? (taxIds[0] || '') : taxId;
  const withInvoice = isOwner ? true : needInvoice;

  async function pay() {
    if (!qty) return;
    if (!last5.trim()) { setErr('請填你的匯款帳號後五碼（必填，給虎智核對）。'); return; }
    if (needInvoice && !buyer.trim()) { setErr('要開發票就要填買受人。'); return; }
    if (needInvoice && !taxId.trim()) { setErr('要開發票就要填統一編號。'); return; }
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.post('/api/teacher/certs/pay', { ids: [...sel], value: true, needInvoice, taxId: taxId.trim(), buyer: buyer.trim(), payLast5: last5 });
      setMsg(`已送出！標記為已匯款 ${qty} 筆，總計 NT$ ${total.toLocaleString()}${needInvoice ? '（含稅，會開立發票）' : '（未稅）'}${last5 ? `，後五碼 ${last5}` : ''}。`);
      setSel(new Set()); setNeedInvoice(false); setTaxId(''); setLast5('');
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function issue() {
    if (!qty) return;
    if (mixed) { setErr('選到的買受人／統編不一樣，一張發票只能同一個買受人，請分開開。'); return; }
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.post('/api/teacher/certs/invoice', { ids: [...sel], value: true, invoiceNo: invNo.trim() });
      setMsg(`已標記開立發票 ${qty} 筆，買受人 ${buyer}，總計 NT$ ${total.toLocaleString()}。`);
      setSel(new Set()); setInvNo('');
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="t-h1">{isOwner ? '開發票' : '結帳'}</h1>
      <p className="t-intro">
        {isOwner
          ? '勾選「對方已匯款、要開發票」的證照，右邊會用統一發票（三聯式）的樣子把買受人、統編、金額列清楚，照著填紙本三聯單，開好按「已開發票」。這裡不收款。'
          : <>勾選要結帳的證照，右邊會用「統一發票（三聯式）」的樣子把金額算給你看，並附上匯款帳戶。每月 <b>{bill.settleDay}</b> 號結帳。單價 NT$ {price}（未稅）；要開發票就是含稅 NT$ {price + Math.round(price * (bill.taxRate || 0) / 100)}。</>}
      </p>
      {err && <div className="t-msg t-msg--err">{err}</div>}
      {msg && <div className="t-msg t-msg--ok">{msg}</div>}

      <div className="t-gen">
        {/* 左：待處理清單 */}
        <div className="t-gen__stage" style={{ padding: 0, background: 'transparent', border: 'none' }}>
          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-row" style={{ alignItems: 'center', marginBottom: 8 }}>
              <div className="t-panel__h" style={{ margin: 0 }}>{isOwner ? '待開發票' : '待結帳'}（{todo.length}）</div>
              <span className="t-spacer" />
              {todo.length > 0 && <label className="t-check" style={{ margin: 0, fontSize: 13 }}>
                <input type="checkbox" checked={allOn} onChange={toggleAll} /> 全選
              </label>}
            </div>
            {todo.length === 0 ? (
              <div className="t-empty" style={{ padding: 20 }}>{isOwner ? '沒有待開的發票 🎉' : '沒有待結帳的項目，都付清了 🎉'}</div>
            ) : todo.map((r) => (
              <label key={r.id} className="t-payrow" data-sel={sel.has(r.id) ? '1' : '0'}>
                <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                <span className="t-payrow__name"><Name zh={r.recipientName} en={r.studentName} />{r.serial ? <span className="t-mono" style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>　{r.serial}</span> : null}</span>
                <span className="t-payrow__meta">{isOwner ? `${r.invoiceBuyer || '—'}・統編 ${r.taxId || '—'}` : (r.payReject ? <span style={{ color: 'var(--t-danger)' }}>⚠ 被退回：{r.payReject}（請重新確認後再按已匯款）</span> : r.course)}</span>
                <span className="t-payrow__amt">NT$ {isOwner ? (r.paidAmount || 0).toLocaleString() : price}</span>
              </label>
            ))}
          </div>

          {done.length > 0 && (
            <div className="t-panel" style={{ margin: 0, marginTop: 14 }}>
              <div className="t-panel__h">{isOwner ? '已開發票' : '已匯款'}（{done.length}）</div>
              {done.map((r) => (
                <div key={r.id} className="t-payrow" style={{ cursor: 'default' }}>
                  <Icon name="check" size={16} />
                  <span className="t-payrow__name"><Name zh={r.recipientName} en={r.studentName} /></span>
                  <span className="t-payrow__meta">{isOwner ? `${r.invoiceBuyer || ''}${r.invoiceNo ? `・${r.invoiceNo}` : ''}` : (r.needInvoice ? `含稅·統編 ${r.taxId}` : '未稅')}{!isOwner && r.payLast5 ? `·後五碼 ${r.payLast5}` : ''}</span>
                  <span className="t-payrow__amt">NT$ {(r.paidAmount || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：統一發票（三聯式） */}
        <aside className="t-gen__side">
          <div className="t-inv">
            <div className="t-inv__title">統一發票（三聯式）{isOwner ? '' : '試算'}</div>
            <div className="t-inv__sub">中華民國 {rocYear(now)} 年　{MON3[now.getMonth()]} {now.getDate()}日</div>
            {mixed && <div className="t-msg t-msg--err" style={{ margin: '8px 0' }}>選到的買受人不只一位，一張發票只能同一個買受人，請分開勾。</div>}
            <div className="t-inv__party">
              <div>買受人：<b>{buyer || <span style={{ color: 'var(--t-fg-3)', fontWeight: 400 }}>（{isOwner ? '選了才顯示' : '請填買受人'}）</span>}</b></div>
              <div>統一編號：{withInvoice ? (shownTaxId || <span style={{ color: 'var(--t-danger)' }}>（要填）</span>) : '—（未稅免開）'}</div>
            </div>
            <div className="t-invtbl-scroll">
              <table className="t-invtbl">
                <thead><tr><th>品名</th><th style={{ width: 44 }}>數量</th><th style={{ width: 64 }}>單價</th><th style={{ width: 78 }}>金額</th></tr></thead>
                <tbody>
                  {qty === 0
                    ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t-fg-3)', padding: 16 }}>左邊勾選{isOwner ? '要開發票' : '要結帳'}的證照…</td></tr>
                    : selCerts.map((r) => {
                      const up = isOwner ? (Number(r.paidNet) || 0) : price;
                      return <tr key={r.id}><td><div style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>n8n 證照</div><Name zh={r.recipientName} en={r.studentName} /></td><td style={{ textAlign: 'center' }}>1</td><td style={{ textAlign: 'right' }}>{up}</td><td style={{ textAlign: 'right' }}>{up}</td></tr>;
                    })}
                </tbody>
              </table>
            </div>
            <div className="t-invtot">
              <div className="t-invtot__row"><span>銷售額合計</span><b>{net.toLocaleString()}</b></div>
              <div className="t-invtot__row"><span>營業稅{withInvoice ? `（${bill.taxRate}%）` : '（未稅免開）'}</span><b>{tax.toLocaleString()}</b></div>
              <div className="t-invtot__row t-invtot__row--total"><span>總計</span><b>{total.toLocaleString()}</b></div>
            </div>
            <div className="t-inv__cny">總計新臺幣（中文大寫）：<b>{toCNY(total)}</b></div>

            {isOwner ? (
              <>
                <div className="t-f" style={{ marginTop: 10, marginBottom: 0 }}><label className="t-f__label">發票號碼（可留空）</label>
                  <input className="t-input" value={invNo} onChange={(e) => setInvNo(e.target.value)} placeholder="例：AB-12345678" /></div>
                <button className="t-btn t-btn--brand" style={{ width: '100%', marginTop: 10 }} disabled={busy || qty === 0 || mixed} onClick={issue}>
                  <Icon name="check" size={16} /> {busy ? '處理中…' : `標記已開發票${qty ? `（${qty} 張）` : ''}`}
                </button>
                <p className="t-f__help" style={{ marginTop: 8 }}>照上面的買受人／統編／金額填紙本三聯單，開好按這裡標記完成。</p>
              </>
            ) : (
              <>
                <label className="t-check" style={{ margin: '10px 0 6px' }}>
                  <input type="checkbox" checked={needInvoice} onChange={(e) => { setNeedInvoice(e.target.checked); setMsg(''); }} /> 我要開統一發票（含稅）
                </label>
                {needInvoice && (<>
                  <div className="t-f" style={{ marginBottom: 8 }}><label className="t-f__label">買受人（必填）</label>
                    <input className="t-input" value={buyerName} onChange={(e) => { setBuyerName(e.target.value); setMsg(''); }} placeholder={user.name || '買受人名稱／公司抬頭'} /></div>
                  <div className="t-f" style={{ marginBottom: 8 }}><label className="t-f__label">統一編號（必填）</label>
                    <input className="t-input" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="8 碼統編" inputMode="numeric" /></div>
                </>)}
                <div className="t-inv__bank">
                  <div className="t-inv__bank-h">匯款帳戶</div>
                  <div>{bill.bankName}　{bill.bankBranch}</div>
                  <div className="t-mono" style={{ fontSize: 15, fontWeight: 700 }}>{bill.bankAccount}</div>
                  <div>{bill.bankHolder}</div>
                </div>
                <div className="t-f" style={{ marginTop: 10, marginBottom: 0 }}><label className="t-f__label">你的匯款帳號後五碼（必填，給虎智核對）</label>
                  <input className="t-input" value={last5} onChange={(e) => setLast5(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="例：12345" inputMode="numeric" /></div>
                <button className="t-btn t-btn--brand" style={{ width: '100%', marginTop: 10 }} disabled={busy || qty === 0 || !last5.trim() || (needInvoice && (!buyerName.trim() || !taxId.trim()))} onClick={pay}>
                  <Icon name="check" size={16} /> {busy ? '送出中…' : `我已匯款 ${qty ? `（${qty} 張 · NT$ ${total.toLocaleString()}）` : ''}`}
                </button>
                <p className="t-f__help" style={{ marginTop: 8 }}>按下＝把這幾筆標記為已匯款，金額會鎖定當下的設定。虎智收到款項會再核對。</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
