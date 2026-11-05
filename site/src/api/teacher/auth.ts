import { readCookie, cookieHeader, clearCookie } from '../auth';
import { newId, nowISO } from '../db';
import { findInstructorByEmail } from './store';
import type { Env } from '../types';

/**
 * 講師區登入：用 Google 登入，不走官網那套帳密。
 *
 * 跟官網切開的地方：
 *   - 自己的 cookie（tg_teacher），跟後台的 tg_admin 不衝突
 *   - session 寫在同一張 sessions 表，但 kind='teacher'，彼此看不到對方
 *   - 身分來源是 cert_instructors 名冊，不是 users
 *
 * owner 怎麼產生：環境變數 TEACHER_OWNER_EMAILS 列的 Gmail，第一次登入就自動
 * 建成 owner 並寫進名冊。其他人要先被 owner 加進名冊才進得來。
 */

export const TEACHER_COOKIE = 'tg_teacher';
export const OAUTH_STATE_COOKIE = 'tg_oauth_state';
const TEACHER_DAYS = 30;

export type Teacher = { id: string; email: string; name: string; role: 'owner' | 'instructor' };

// ── session ───────────────────────────────────────────────────────

export async function createTeacherSession(db: D1Database, instructorId: string, req: Request) {
  const id = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
  const expires = new Date(Date.now() + TEACHER_DAYS * 864e5).toISOString();
  await db.prepare('INSERT INTO sessions (id,kind,subject_id,created_at,expires_at,ip,agent) VALUES (?,?,?,?,?,?,?)')
    .bind(id, 'teacher', instructorId, nowISO(), expires,
      req.headers.get('cf-connecting-ip') || '', (req.headers.get('user-agent') || '').slice(0, 200))
    .run();
  return { id, days: TEACHER_DAYS };
}

export async function destroyTeacherSession(db: D1Database, req: Request) {
  const id = readCookie(req, TEACHER_COOKIE);
  if (id) await db.prepare('DELETE FROM sessions WHERE id=? AND kind=?').bind(id, 'teacher').run();
}

export async function currentTeacher(db: D1Database, req: Request): Promise<Teacher | null> {
  const id = readCookie(req, TEACHER_COOKIE);
  if (!id) return null;
  const s = await db.prepare('SELECT subject_id,expires_at FROM sessions WHERE id=? AND kind=?')
    .bind(id, 'teacher').first<any>();
  if (!s) return null;
  if (new Date(s.expires_at).getTime() < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id=?').bind(id).run();
    return null;
  }
  const row = await db.prepare('SELECT id,data FROM cert_instructors WHERE id=?').bind(s.subject_id).first<any>();
  if (!row) return null;
  const d = JSON.parse(row.data || '{}');
  if (d.active === false) return null;
  return { id: row.id, email: d.email, name: d.name, role: d.role === 'owner' ? 'owner' : 'instructor' };
}

export const teacherCookie = (value: string, maxAgeSec: number) => cookieHeader(TEACHER_COOKIE, value, maxAgeSec);
export const clearTeacherCookie = () => clearCookie(TEACHER_COOKIE);

// ── Google OAuth ──────────────────────────────────────────────────

export function googleConfigured(env: Env) {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(env: Env, redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
}

/** 用授權碼換 access token，再拿去問 Google 這個人的 email。 */
export async function googleIdentity(env: Env, code: string, redirectUri: string) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('Google 換 token 失敗');
  const tok = await tokenRes.json<{ access_token?: string }>();
  if (!tok.access_token) throw new Error('Google 沒給 access token');

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: 'Bearer ' + tok.access_token },
  });
  if (!infoRes.ok) throw new Error('讀 Google 使用者資料失敗');
  const info = await infoRes.json<{ email?: string; email_verified?: boolean; name?: string }>();
  const email = String(info.email || '').trim().toLowerCase();
  if (!email) throw new Error('Google 帳號沒有 email');
  return { email, name: info.name || email, verified: info.email_verified !== false };
}

/** 把 email 對到名冊；owner 白名單裡的第一次登入自動入列。回傳 instructor 或 null。 */
export async function resolveInstructor(db: D1Database, env: Env, email: string, name: string) {
  const owners = String(env.TEACHER_OWNER_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  let inst = await findInstructorByEmail(db, email);
  if (!inst && owners.includes(email)) {
    const { upsertInstructor } = await import('./store');
    const id = await upsertInstructor(db, { email, name, role: 'owner', active: true, note: '白名單自動建立' });
    inst = { id, email, name, role: 'owner', active: true };
  } else if (inst && owners.includes(email) && inst.role !== 'owner') {
    const { upsertInstructor } = await import('./store');
    await upsertInstructor(db, { email, name: inst.name as string, role: 'owner', active: true });
    inst = { ...inst, role: 'owner' };
  }
  if (!inst || inst.active === false) return null;
  return inst as { id: string; email: string; name: string; role: string; active: boolean };
}
