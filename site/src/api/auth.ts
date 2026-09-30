import type { Role } from './schema/types';
import { newId, nowISO } from './db';

/**
 * 登入、密碼、Session。
 *
 * ── 為什麼密碼要分兩段雜湊 ────────────────────────────────────────
 *
 * Cloudflare Workers 免費方案每次請求只有 10 毫秒 CPU。密碼雜湊之所以安全，
 * 靠的就是「算很慢」——業界建議的 PBKDF2-SHA256 是 60 萬次迭代，在 Workers 上
 * 大概要幾十到上百毫秒，直接超過額度，結果就是誰都登不進來。
 *
 * 把迭代次數調低到塞得進 10 毫秒，等於把防護拿掉；升級到付費方案又不是
 * Robin 想要的。所以這裡把「算很慢」那一段搬到瀏覽器：
 *
 *   瀏覽器：PBKDF2-SHA256(密碼, 鹽 = "tigerai:" + email, 20 萬次) → dk
 *   伺服器：PBKDF2-SHA256(dk, 每人隨機鹽, 1 萬次) → 存起來
 *
 * 使用者的 CPU 是免費的，20 萬次在手機上也只要一兩秒。伺服器那 1 萬次
 * 大概 1 毫秒，塞得進額度。
 *
 * 資料庫如果外洩，攻擊者拿到的是雜湊，要還原成密碼一樣得穿過瀏覽器那 20 萬次，
 * 防護強度跟原本一樣。瀏覽器算出來的 dk 在傳輸中等同密碼——但原本傳的就是
 * 密碼本身，沒有變差，而且全程走 HTTPS。
 *
 * 客戶端不肯算（用 curl 直接打 API）也可以，伺服器會自己補算，
 * 但那條路徑迭代次數低，只適合自動化測試，不適合當正式登入方式。
 */

const CLIENT_ITER = 200_000;
const SERVER_ITER = 10_000;
const enc = new TextEncoder();

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(input: Uint8Array | string, salt: Uint8Array, iterations: number) {
  const raw = typeof input === 'string' ? enc.encode(input) : input;
  const key = await crypto.subtle.importKey('raw', raw as BufferSource, 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
}

/** 瀏覽器端要算的那一段。後台登入頁與會員登入都用同一份，所以匯出。 */
export async function deriveClientKey(password: string, email: string) {
  const salt = enc.encode('tigerai:' + email.trim().toLowerCase());
  return b64(await pbkdf2(password, salt, CLIENT_ITER));
}

/**
 * 存進資料庫的字串長這樣：
 *   pbkdf2$<迭代次數>$<鹽>$<雜湊>$<c 或 s>
 * 最後一段記的是「這個雜湊是從瀏覽器算過的 dk 來的，還是從原始密碼來的」，
 * 驗證時要走一樣的路徑才會對得起來。
 */
export async function hashPassword(value: string, fromClient: boolean) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(value, salt, SERVER_ITER);
  return `pbkdf2$${SERVER_ITER}$${b64(salt.buffer)}$${b64(bits)}$${fromClient ? 'c' : 's'}`;
}

export async function verifyPassword(stored: string, value: string, fromClient: boolean) {
  const parts = (stored || '').split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2') return false;
  const [, iterStr, saltB64, hashB64, origin] = parts;
  // 當初存的是哪一種來源，就得用哪一種來源比對
  if ((origin === 'c') !== fromClient) return false;
  const bits = await pbkdf2(value, unb64(saltB64), Number(iterStr) || SERVER_ITER);
  return timingSafeEqual(b64(bits), hashB64);
}

/** 逐字元比對會在第一個不同的位置就回傳，能被拿來一個字一個字試出答案。 */
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Session ────────────────────────────────────────────────────────

export const ADMIN_COOKIE = 'tg_admin';
export const MEMBER_COOKIE = 'tg_member';
const ADMIN_DAYS = 7;
const MEMBER_DAYS = 30;

export type Session = { id: string; kind: 'admin' | 'member'; subjectId: string };

export async function createSession(
  db: D1Database,
  kind: 'admin' | 'member',
  subjectId: string,
  req: Request,
) {
  const id = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
  const days = kind === 'admin' ? ADMIN_DAYS : MEMBER_DAYS;
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  await db
    .prepare('INSERT INTO sessions (id,kind,subject_id,created_at,expires_at,ip,agent) VALUES (?,?,?,?,?,?,?)')
    .bind(id, kind, subjectId, nowISO(), expires, req.headers.get('cf-connecting-ip') || '', (req.headers.get('user-agent') || '').slice(0, 200))
    .run();
  return { id, expires, days };
}

export async function readSession(db: D1Database, req: Request, kind: 'admin' | 'member') {
  const id = readCookie(req, kind === 'admin' ? ADMIN_COOKIE : MEMBER_COOKIE);
  if (!id) return null;
  const row = await db
    .prepare('SELECT id,kind,subject_id,expires_at FROM sessions WHERE id=? AND kind=?')
    .bind(id, kind)
    .first<any>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id=?').bind(id).run();
    return null;
  }
  return { id: row.id, kind: row.kind, subjectId: row.subject_id } as Session;
}

export async function destroySession(db: D1Database, id: string) {
  await db.prepare('DELETE FROM sessions WHERE id=?').bind(id).run();
}

export function readCookie(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

/**
 * Cookie 的設定值全部是刻意的：
 *   HttpOnly  JavaScript 讀不到，就算站上有 XSS 也偷不走 session
 *   Secure    只走 HTTPS
 *   SameSite=Lax  擋掉跨站送出的請求（CSRF），但從外部連結點進來仍保持登入
 *   Path=/    後台和 API 都在同一個網域
 */
export function cookieHeader(name: string, value: string, maxAgeSec: number) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  return bits.join('; ');
}

export const clearCookie = (name: string) => cookieHeader(name, '', 0);

// ── 目前登入的後台使用者 ─────────────────────────────────────────

export type AdminUser = { id: string; email: string; name: string; role: Role };

export async function currentAdmin(db: D1Database, req: Request): Promise<AdminUser | null> {
  const s = await readSession(db, req, 'admin');
  if (!s) return null;
  const row = await db.prepare('SELECT id,data FROM users WHERE id=?').bind(s.subjectId).first<any>();
  if (!row) return null;
  const d = JSON.parse(row.data || '{}');
  if (d.active === false) return null;
  return { id: row.id, email: d.email, name: d.name, role: (d.role || 'viewer') as Role };
}

// ── 頻率限制 ─────────────────────────────────────────────────────

/**
 * 公開端點都要套。沒有這個，預約表單一個晚上就會被灌進幾萬筆，
 * D1 免費方案每天 10 萬次寫入也會被吃光。
 *
 * 回傳 true 表示「還可以」，false 表示「擋下來」。
 */
export async function rateLimit(db: D1Database, key: string, limit: number, windowSec: number) {
  const now = Date.now();
  const row = await db.prepare('SELECT hits,reset_at FROM rate_limit WHERE k=?').bind(key).first<any>();
  if (!row || new Date(row.reset_at).getTime() < now) {
    const reset = new Date(now + windowSec * 1000).toISOString();
    await db
      .prepare('INSERT INTO rate_limit (k,hits,reset_at) VALUES (?,1,?) ON CONFLICT(k) DO UPDATE SET hits=1,reset_at=excluded.reset_at')
      .bind(key, reset)
      .run();
    return true;
  }
  if (row.hits >= limit) return false;
  await db.prepare('UPDATE rate_limit SET hits=hits+1 WHERE k=?').bind(key).run();
  return true;
}

export const clientKey = (req: Request, tag: string) =>
  `${tag}:${req.headers.get('cf-connecting-ip') || 'unknown'}`;

// ── 一次性代幣 ───────────────────────────────────────────────────

export async function issueToken(
  db: D1Database,
  purpose: string,
  subject: string,
  minutes: number,
  payload?: unknown,
) {
  const id = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await db
    .prepare('INSERT INTO tokens (id,purpose,subject,payload,expires_at,created_at) VALUES (?,?,?,?,?,?)')
    .bind(id, purpose, subject, payload ? JSON.stringify(payload) : null, new Date(Date.now() + minutes * 60000).toISOString(), nowISO())
    .run();
  return id;
}

/** 用掉就刪。留著「已使用」的紀錄只會變成另一個要清的東西。 */
export async function consumeToken(db: D1Database, purpose: string, id: string) {
  const row = await db.prepare('SELECT * FROM tokens WHERE id=? AND purpose=?').bind(id, purpose).first<any>();
  if (!row) return null;
  await db.prepare('DELETE FROM tokens WHERE id=?').bind(id).run();
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { subject: row.subject as string, payload: row.payload ? JSON.parse(row.payload) : null };
}

// ── 操作紀錄 ─────────────────────────────────────────────────────

export async function audit(
  db: D1Database,
  who: string,
  action: string,
  target: string,
  detail: unknown,
  req: Request,
) {
  const data = {
    at: nowISO(),
    who,
    action,
    target,
    detail,
    ip: req.headers.get('cf-connecting-ip') || '',
  };
  await db
    .prepare('INSERT INTO audit_log (id,sort,data,created_at,updated_at,f_at) VALUES (?,?,?,?,?,?)')
    .bind(newId(), 0, JSON.stringify(data), data.at, data.at, data.at)
    .run()
    .catch(() => {
      // 寫紀錄失敗不能讓本來的操作跟著失敗。紀錄重要，但沒有比「東西存進去了」重要。
    });
}
