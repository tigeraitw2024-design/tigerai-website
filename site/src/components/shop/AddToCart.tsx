import { useState } from 'react';
import { money, post } from './shop';

/**
 * 課程卡上的「加入購物車」。
 *
 * 只有在後台填了價格的課才會渲染（判斷在 courses.astro），所以沒接後台的時候
 * 一顆都不會出現，跟原型的像素比對不受影響。
 *
 * 價格這裡只是顯示。真正算錢的是後端——前端送上來的金額一律不採信。
 */
export default function AddToCart({ courseId, price }: { courseId: string; price: number }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');

  async function add() {
    setState('busy');
    setErr('');
    try {
      await post('/api/cart/add', { kind: 'course', refId: courseId, qty: 1 });
      setState('done');
    } catch (e: any) {
      setErr(String(e?.message || e));
      setState('idle');
    }
  }

  return (
    <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
      <b style={{ fontFamily: "'Manrope',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>
        {money(price)}
      </b>
      {state === 'done' ? (
        <a className="t-btn t-btn--primary" href="/cart" style={{ textDecoration: 'none' }}>
          已加入，去結帳 →
        </a>
      ) : (
        <button className="t-btn t-btn--outline" onClick={add} disabled={state === 'busy'}>
          {state === 'busy' ? '加入中…' : '加入購物車'}
        </button>
      )}
      {err && <span style={{ fontSize: 12, color: 'var(--danger-700,#8E2F27)' }}>{err}</span>}
    </div>
  );
}
