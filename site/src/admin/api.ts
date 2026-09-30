/**
 * 後台跟 API 說話的地方。
 *
 * 全部集中在這一支，其他元件不直接 fetch。這樣改 API 路徑、加共用的
 * 錯誤處理、之後要換成別的後端，都只有一個地方要動。
 */

export class ApiError extends Error {
  status: number;
  errors: string[];
  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await r.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text.slice(0, 200) };
  }
  if (!r.ok) {
    throw new ApiError(r.status, body?.error || `出錯了（${r.status}）`, body?.errors || []);
  }
  return body as T;
}

export const api = {
  get: <T>(p: string) => call<T>(p),
  post: <T>(p: string, body?: unknown) =>
    call<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => call<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(p: string) => call<T>(p, { method: 'DELETE' }),
  upload: <T>(p: string, form: FormData) => call<T>(p, { method: 'POST', body: form }),
};

/**
 * 密碼在瀏覽器先算過一輪才送出去。
 *
 * 伺服器端（Cloudflare Workers 免費方案）每次請求只有 10 毫秒運算額度，
 * 塞不下正常強度的密碼雜湊。所以「算很慢」這一段搬到這裡——
 * 使用者的 CPU 是免費的，20 萬次迭代在手機上也只要一兩秒。
 *
 * 參數要跟 src/api/auth.ts 的 deriveClientKey 完全一致，
 * 改了一邊沒改另一邊，所有人都會登不進去。
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

// ── 型別（跟 src/api/schema/types.ts 對應） ─────────────────────

export type Field = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
  of?: Field[];
  relation?: string;
  default?: unknown;
  listed?: boolean;
  pii?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  width?: 'full' | 'half' | 'third';
  readonly?: boolean;
};

export type Collection = {
  name: string;
  label: string;
  group: '內容' | '生意' | '系統';
  icon: string;
  kind: 'content' | 'runtime' | 'singleton';
  intro?: string;
  fields: Field[];
  titleField?: string;
  sortable?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  canWrite: boolean;
};

export type SchemaResponse = {
  role: 'viewer' | 'editor' | 'sales' | 'owner';
  canSeePII: boolean;
  modules: { id: string; label: string; about: string; collections: string[] }[];
  collections: Collection[];
};

export type Rec = Record<string, any>;

/** 金額在資料庫裡是「分」，畫面上是「元」。換算只在這兩個函式裡發生。 */
export const centsToYuan = (c: number) => Math.round((Number(c) || 0) / 100);
export const yuanToCents = (y: number | string) => Math.round((Number(y) || 0) * 100);
export const money = (c: number) => 'NT$ ' + centsToYuan(c).toLocaleString('zh-TW');
