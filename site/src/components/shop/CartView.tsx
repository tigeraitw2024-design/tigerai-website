import { useEffect, useState } from 'react';
import { BOX, INPUT, LABEL, MSG, get, money, post } from './shop';

/**
 * 購物車與結帳。
 *
 * 價格一律由後端重算，前端送上來的金額不採信——不然任何人都能把總價改成 1 元。
 * 所以這一頁顯示的數字全部是 /api/cart 回來的，這裡不做任何加總。
 *
 * 金流目前是「只記單不收款」：送出後你會收到訂單成立的信，我們再聯繫收款。
 * 之後接了綠界，後端會改回傳 { kind:'redirect' } 或 { kind:'form' }，
 * 下面的 handlePayment 已經把那兩種情況都處理好了，到時候不用改這一頁。
 */

type Line = { kind: string; refId: string; sessionId?: string; title: string; unitPrice: number; qty: number };
type Cart = { lines: Line[]; subtotal: number; discount: number; total: number; coupon?: { code: string; label?: string } | null };
type Me = { member: { name: string; email: string; phone?: string } } | null;

export default function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [coupon, setCoupon] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; message: string } | null>(null);

  const [form, setForm] = useState({
    buyerName: '', buyerEmail: '', buyerPhone: '',
    invoiceType: 'personal', invoiceTaxId: '', invoiceTitle: '',
  });

  useEffect(() => {
    get<Cart>('/api/cart').then(setCart).catch((e) => setErr(e.message));
    get<Me>('/api/member/me')
      .then((d) => {
        setMe(d);
        if (d?.member) {
          setForm((f) => ({
            ...f,
            buyerName: f.buyerName || d.member.name || '',
            buyerEmail: f.buyerEmail || d.member.email || '',
            buyerPhone: f.buyerPhone || d.member.phone || '',
          }));
        }
      })
      .catch(() => {
        // 沒登入是正常的，可以用訪客身分結帳
      });
  }, []);

  async function remove(l: Line) {
    setErr('');
    try {
      setCart(await post<Cart>('/api/cart/remove', { kind: l.kind, refId: l.refId, sessionId: l.sessionId }));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function applyCoupon() {
    setErr('');
    try {
      setCart(await post<Cart>('/api/cart/coupon', { code: coupon }));
    } catch (e: any) {
      setErr(e.message);
      // 折扣碼無效時後端仍然會回算好的車，畫面照樣要更新
      get<Cart>('/api/cart').then(setCart).catch(() => {});
    }
  }

  async function checkout() {
    setErr('');
    if (!form.buyerName.trim()) return setErr('請填訂購人姓名。');
    if (!form.buyerEmail.includes('@')) return setErr('請填一個收得到信的 Email。');
    if (form.invoiceType === 'company' && !/^\d{8}$/.test(form.invoiceTaxId)) {
      return setErr('三聯發票的統一編號要 8 位數字。');
    }
    setBusy(true);
    try {
      const r = await post<{ orderCode: string; payment: any }>('/api/checkout', form);
      handlePayment(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  /** 金流轉接器回什麼，就照什麼做。三種情況都先寫好，換金流不用改這一頁。 */
  function handlePayment(r: { orderCode: string; payment: any }) {
    const p = r.payment;
    if (p?.kind === 'redirect') {
      location.href = p.url;
      return;
    }
    if (p?.kind === 'form') {
      // 綠界那類要用表單 POST 過去。組一張看不見的表單送出。
      const f = document.createElement('form');
      f.method = 'POST';
      f.action = p.action;
      for (const [k, v] of Object.entries(p.fields as Record<string, string>)) {
        const i = document.createElement('input');
        i.type = 'hidden';
        i.name = k;
        i.value = v;
        f.appendChild(i);
      }
      document.body.appendChild(f);
      f.submit();
      return;
    }
    setDone({ code: r.orderCode, message: p?.message || '訂單已成立。' });
  }

  if (done) {
    return (
      <div style={{ ...BOX, display: 'grid', gap: 12, maxWidth: 560 }}>
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-50,#F0F8F3)', color: 'var(--success-700,#14532B)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✓</span>
        <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 20, fontWeight: 800 }}>訂單已成立</b>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--fg-secondary)' }}>
          訂單編號 <b style={{ fontFamily: "'JetBrains Mono',monospace" }}>{done.code}</b><br />
          {done.message}
        </p>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-tertiary)' }}>確認信已經寄到你的信箱。沒看到請看一下垃圾郵件匣。</p>
        <a className="t-btn t-btn--primary" href="/courses" style={{ textDecoration: 'none', justifySelf: 'start' }}>繼續看課程 →</a>
      </div>
    );
  }

  if (!cart) return <p style={{ color: 'var(--fg-tertiary)' }}>{err || '載入中…'}</p>;

  if (!cart.lines.length) {
    return (
      <div style={{ ...BOX, maxWidth: 560 }}>
        <p style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--fg-secondary)' }}>購物車是空的。</p>
        <a className="t-btn t-btn--primary" href="/courses" style={{ textDecoration: 'none' }}>去看課程 →</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 32, alignItems: 'start' }}>
      {/* 品項 */}
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={BOX}>
          {cart.lines.map((l, i) => (
            <div
              key={`${l.kind}-${l.refId}-${l.sessionId || ''}`}
              style={{
                display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap',
                padding: '14px 0',
                borderTop: i ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <b style={{ fontSize: 15 }}>{l.title}</b>
                <div style={{ fontSize: 13, color: 'var(--fg-tertiary)' }}>
                  {l.kind === 'course' ? '課程' : '產品'}　數量 {l.qty}
                </div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>{money(l.unitPrice * l.qty)}</span>
              <button className="t-btn t-btn--ghost" style={{ minHeight: 36, padding: '0 10px', fontSize: 13 }} onClick={() => remove(l)}>
                移除
              </button>
            </div>
          ))}
        </div>

        <div style={{ ...BOX, display: 'grid', gap: 10 }}>
          <label style={LABEL}>折扣碼</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              style={{ ...INPUT, flex: 1, minWidth: 140 }}
              value={coupon}
              placeholder={cart.coupon?.code || '有折扣碼就填這裡'}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
            <button className="t-btn t-btn--outline" onClick={applyCoupon}>套用</button>
          </div>
          {cart.coupon && (
            <span style={{ fontSize: 13, color: 'var(--success-700,#14532B)' }}>
              已套用 {cart.coupon.code}{cart.coupon.label ? `（${cart.coupon.label}）` : ''}
            </span>
          )}
        </div>
      </div>

      {/* 結帳 */}
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ ...BOX, display: 'grid', gap: 8 }}>
          <Row k="小計" v={money(cart.subtotal)} />
          {cart.discount > 0 && <Row k="折扣" v={'− ' + money(cart.discount)} />}
          <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: 10, marginTop: 4 }}>
            <Row k="應付總額" v={money(cart.total)} big />
          </div>
        </div>

        <div style={{ ...BOX, display: 'grid', gap: 14 }}>
          {!me && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.7 }}>
              可以直接用訪客身分結帳。<a href="/member/login" style={{ color: 'var(--tiger-700)' }}>登入</a>的話，
              購課紀錄會留在你的帳號裡，之後看得到。
            </p>
          )}

          <Field label="訂購人姓名" required>
            <input style={INPUT} value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
          </Field>
          <Field label="Email" required help="訂單確認信會寄到這裡">
            <input style={INPUT} type="email" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} />
          </Field>
          <Field label="電話">
            <input style={INPUT} type="tel" value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} />
          </Field>
          <Field label="發票">
            <select style={INPUT} value={form.invoiceType} onChange={(e) => setForm({ ...form, invoiceType: e.target.value })}>
              <option value="personal">個人（二聯）</option>
              <option value="company">公司（三聯）</option>
              <option value="donate">捐贈</option>
            </select>
          </Field>
          {form.invoiceType === 'company' && (
            <>
              <Field label="統一編號" required>
                <input style={INPUT} inputMode="numeric" maxLength={8} value={form.invoiceTaxId} onChange={(e) => setForm({ ...form, invoiceTaxId: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="發票抬頭">
                <input style={INPUT} value={form.invoiceTitle} onChange={(e) => setForm({ ...form, invoiceTitle: e.target.value })} />
              </Field>
            </>
          )}

          {err && <div style={MSG('err')}>{err}</div>}

          <button className="t-btn t-btn--primary t-btn--lg" onClick={checkout} disabled={busy}>
            {busy ? '送出中…' : '送出訂單'}
          </button>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-tertiary)', lineHeight: 1.7 }}>
            送出即表示你同意<a href="/legal/terms" style={{ color: 'var(--tiger-700)' }}>服務條款</a>與
            <a href="/legal/refund" style={{ color: 'var(--tiger-700)' }}>退費規則</a>。
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: big ? 15 : 14, color: big ? 'var(--fg-primary)' : 'var(--fg-secondary)', fontWeight: big ? 700 : 400 }}>{k}</span>
      <b style={{ fontFamily: "'Manrope',sans-serif", fontSize: big ? 24 : 15, fontWeight: big ? 800 : 400, letterSpacing: big ? '-.02em' : undefined }}>{v}</b>
    </div>
  );
}

function Field({ label, required, help, children }: { label: string; required?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: 'var(--danger-500,#C4453B)', fontSize: 11, marginLeft: 6 }}>必填</span>}
      </label>
      {children}
      {help && <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>{help}</div>}
    </div>
  );
}
