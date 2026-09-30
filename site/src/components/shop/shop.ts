/**
 * 購物車與會員頁共用的東西。
 *
 * 這幾頁原型沒有設計（Claude Design 只做了八頁行銷頁），所以是照站上的
 * 視覺語言長出來的：同一套色票、同一套 t-btn／t-card、同樣的留白節奏。
 * 不另外發明一套後台風格——那會讓人覺得走到別的網站去了。
 */

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error || `出錯了（${r.status}）`);
  return d as T;
}

export async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { credentials: 'same-origin' });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.error || `出錯了（${r.status}）`);
  return d as T;
}

/** 金額在資料庫是「分」，畫面上是「元」。換算只在這裡發生。 */
export const money = (cents: number) => 'NT$ ' + Math.round((Number(cents) || 0) / 100).toLocaleString('zh-TW');

/**
 * 密碼在瀏覽器先算過一輪才送出去。
 * 參數要跟 src/api/auth.ts 的 deriveClientKey 完全一致，
 * 改了一邊沒改另一邊，所有人都會登不進去。原因見那個檔案開頭。
 */
export async function deriveKey(password: string, email: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('tigerai:' + email.trim().toLowerCase()), iterations: 200_000 },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export const qs = (k: string) => new URLSearchParams(location.search).get(k) || '';

export const BOX: React.CSSProperties = {
  background: '#fff',
  border: '1px solid var(--border-subtle)',
  padding: 24,
};

export const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
};

export const INPUT: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border-default)',
  padding: '11px 12px',
  // 16px 以下 iOS Safari 聚焦時會自動放大整頁，回不去
  fontSize: 16,
  fontFamily: 'inherit',
  minHeight: 44,
};

export const MSG = (tone: 'err' | 'ok'): React.CSSProperties => ({
  fontSize: 14,
  lineHeight: 1.6,
  padding: '10px 14px',
  borderLeft: `3px solid ${tone === 'err' ? 'var(--danger-500,#C4453B)' : 'var(--success-500,#2E7D4F)'}`,
  background: tone === 'err' ? 'var(--danger-50,#FDF2F1)' : 'var(--success-50,#F0F8F3)',
  color: tone === 'err' ? 'var(--danger-700,#8E2F27)' : 'var(--success-700,#14532B)',
});
