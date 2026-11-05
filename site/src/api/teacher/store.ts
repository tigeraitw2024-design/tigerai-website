import type { Collection, Field } from '../schema/types';
import { createTableSQL, indexedFields, columnName, newId, nowISO, rowToRecord } from '../db';
import { instructorsCollection, certificatesCollection, TEACHER_COLLECTIONS } from './schema';

/**
 * 講師區的資料存取。全部建在跟官網同一個 D1，但只碰 cert_* 這兩張表。
 *
 * 表是自己用 CREATE TABLE IF NOT EXISTS 長出來的（ensureTables），不靠官網的
 * bootstrap，所以講師區可以獨立安裝、獨立運作，不跟現有流程纏在一起。
 */

let ensured = false;
export async function ensureTables(db: D1Database) {
  if (ensured) return;
  for (const c of TEACHER_COLLECTIONS) {
    for (const sql of createTableSQL(c)) await db.prepare(sql).run();
  }
  ensured = true;
}

function mirror(f: Field, v: unknown) {
  if (v === undefined || v === null) return null;
  if (f.type === 'boolean') return v ? 1 : 0;
  if (f.type === 'number' || f.type === 'money') return Number(v) || 0;
  return String(v);
}

/** 新增或更新一筆。id 為 null 就新增。回傳 id。 */
export async function putRow(
  db: D1Database, c: Collection, id: string | null, data: Record<string, unknown>,
): Promise<string> {
  const cols = indexedFields(c);
  const at = nowISO();
  if (!id) {
    const nid = newId();
    const names = ['id', 'sort', 'data', 'created_at', 'updated_at', ...cols.map(columnName)];
    const vals = [nid, 0, JSON.stringify(data), at, at, ...cols.map((f) => mirror(f, data[f.name]))];
    await db.prepare(`INSERT INTO ${c.name} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`)
      .bind(...vals).run();
    return nid;
  }
  const sets = ['data=?', 'updated_at=?', ...cols.map((f) => `${columnName(f)}=?`)];
  const vals = [JSON.stringify(data), at, ...cols.map((f) => mirror(f, data[f.name]))];
  await db.prepare(`UPDATE ${c.name} SET ${sets.join(',')} WHERE id=?`).bind(...vals, id).run();
  return id;
}

export async function getRow(db: D1Database, c: Collection, id: string) {
  const row = await db.prepare(`SELECT * FROM ${c.name} WHERE id=?`).bind(id).first<any>();
  return row ? rowToRecord(row) : null;
}

// ── 講師名冊 ──────────────────────────────────────────────────────

export async function findInstructorByEmail(db: D1Database, email: string) {
  const row = await db.prepare(`SELECT * FROM cert_instructors WHERE f_email=?`)
    .bind(email.trim().toLowerCase()).first<any>();
  return row ? rowToRecord(row) : null;
}

export async function listInstructors(db: D1Database) {
  const { results } = await db.prepare(`SELECT * FROM cert_instructors ORDER BY created_at DESC`).all<any>();
  return (results || []).map(rowToRecord);
}

export async function upsertInstructor(
  db: D1Database, data: { email: string; name: string; role?: string; active?: boolean; note?: string },
) {
  const email = String(data.email || '').trim().toLowerCase();
  const existing = await findInstructorByEmail(db, email);
  const merged = {
    email,
    name: data.name ?? (existing?.name as string) ?? email,
    role: data.role ?? (existing?.role as string) ?? 'instructor',
    active: data.active ?? (existing?.active as boolean) ?? true,
    note: data.note ?? (existing?.note as string) ?? '',
  };
  return putRow(db, instructorsCollection, (existing?.id as string) || null, merged);
}

// ── 獎狀設定（單例）──────────────────────────────────────────────

/** 預設值：沒設定過就用這份（跟 Cert.tsx 的 CERT_DEFAULTS 對齊）。 */
export const SETTINGS_DEFAULTS = {
  sigColor: 'black', showSig: true, showSeal: true,
  sigW: 17, sigX: 63, sigY: 72,
  sealX: 84, sealY: 75, sealSize: 16, sealRot: -5, sealOp: 90,
  endorseCaption: '台灣虎智科技股份有限公司',
  defaultCourse: 'n8n Quickstart',
  printDays: 2, shipDays: 2,
};
export type CertSettings = typeof SETTINGS_DEFAULTS;
const SETTINGS_ID = 'cert_settings';

export async function getSettings(db: D1Database): Promise<CertSettings> {
  const row = await db.prepare(`SELECT data FROM cert_settings WHERE id=?`).bind(SETTINGS_ID).first<any>();
  let saved: Record<string, unknown> = {};
  try { saved = row ? JSON.parse(row.data || '{}') : {}; } catch { saved = {}; }
  return { ...SETTINGS_DEFAULTS, ...saved };
}

/** 局部更新：只覆蓋有帶的欄位，其餘保留。 */
export async function putSettings(db: D1Database, patch: Partial<CertSettings>): Promise<CertSettings> {
  const next = { ...(await getSettings(db)), ...patch };
  const at = nowISO();
  await db.prepare(
    `INSERT INTO cert_settings (id,sort,data,created_at,updated_at) VALUES (?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`,
  ).bind(SETTINGS_ID, 0, JSON.stringify(next), at, at).run();
  return next;
}

// ── 證照 ──────────────────────────────────────────────────────────

export type CertFilter = { instructorId?: string; q?: string; printed?: boolean; shipped?: boolean };

export async function listCerts(db: D1Database, f: CertFilter = {}) {
  const where: string[] = [];
  const binds: unknown[] = [];
  if (f.instructorId) { where.push('f_instructor_id=?'); binds.push(f.instructorId); }
  if (f.q) { where.push('lower(data) LIKE ?'); binds.push(`%${f.q.toLowerCase()}%`); }
  const sql = `SELECT * FROM cert_records ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
  const { results } = await db.prepare(sql).bind(...binds).all<any>();
  let rows = (results || []).map(rowToRecord);
  if (f.printed !== undefined) rows = rows.filter((r) => !!r.printed === f.printed);
  if (f.shipped !== undefined) rows = rows.filter((r) => !!r.shipped === f.shipped);
  return rows;
}

const CERT_FIELDS = ['studentName', 'course', 'issueDate', 'courseName', 'recipientName', 'org', 'jobTitle', 'email', 'phone', 'address', 'certUrl', 'fee', 'note'];

/** 建一筆證照，掛在某位講師底下 */
export async function createCert(
  db: D1Database, instructor: { id: string; name: string }, input: Record<string, unknown>,
) {
  const data: Record<string, unknown> = {
    studentName: String(input.studentName || '').trim(),
    course: String(input.course || 'n8n Quickstart').trim() || 'n8n Quickstart',
    issueDate: String(input.issueDate || '').trim(),
    courseName: String(input.courseName || '').trim(),
    recipientName: String(input.recipientName || '').trim(),
    org: String(input.org || '').trim(),
    jobTitle: String(input.jobTitle || '').trim(),
    email: String(input.email || '').trim().toLowerCase(),
    phone: String(input.phone || '').trim(),
    address: String(input.address || '').trim(),
    certUrl: String(input.certUrl || '').trim(),
    fee: Number(input.fee) || 200,
    note: String(input.note || '').trim(),
    instructorId: instructor.id,
    instructorName: instructor.name,
    printed: false, printedAt: '',
    shipped: false, shippedAt: '',
    tracking: '',
  };
  if (!data.studentName) throw new Error('學員姓名是必填的');
  return putRow(db, certificatesCollection, null, data);
}

/** 更新一筆（只允許改內容欄位，不碰 printed/shipped 這些系統狀態） */
export async function updateCert(db: D1Database, id: string, input: Record<string, unknown>) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) throw new Error('找不到這一筆');
  const data = { ...existing };
  for (const k of CERT_FIELDS) if (k in input) data[k] = k === 'fee' ? (Number(input[k]) || 0) : String(input[k] ?? '').trim();
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  return putRow(db, certificatesCollection, id, data);
}

/** 批次標記已列印／已寄送（owner 專用）。field 只接受 printed｜shipped。 */
export async function markCerts(db: D1Database, ids: string[], field: 'printed' | 'shipped', value: boolean) {
  const stampCol = field === 'printed' ? 'printedAt' : 'shippedAt';
  for (const id of ids) {
    const existing = await getRow(db, certificatesCollection, id);
    if (!existing) continue;
    const data = { ...existing };
    delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
    data[field] = value;
    data[stampCol] = value ? nowISO() : '';
    await putRow(db, certificatesCollection, id, data);
  }
  return ids.length;
}

/** 對帳報表：依「講師 × 月份」統計張數、已印、已寄、金額 */
export async function certReport(db: D1Database) {
  const rows = await listCerts(db);
  const map = new Map<string, any>();
  for (const r of rows) {
    const month = String(r.createdAt || '').slice(0, 7) || '未知';
    const who = String(r.instructorName || '未指定');
    const key = who + '｜' + month;
    const g = map.get(key) || { instructor: who, month, count: 0, printed: 0, shipped: 0, amount: 0 };
    g.count += 1;
    if (r.printed) g.printed += 1;
    if (r.shipped) g.shipped += 1;
    g.amount += Number(r.fee) || 0;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => (b.month + b.instructor).localeCompare(a.month + a.instructor));
}
