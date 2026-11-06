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
    for (const sql of createTableSQL(c)) {
      // 單句容錯：在「已存在的舊表」上建「新索引欄的索引」會噴「no such column」，
      // 絕不能讓這種 schema 演進的錯拖垮整個 /api/teacher（連 /me、登入都會跟著 500）。
      try { await db.prepare(sql).run(); } catch (e) { console.error('[ensureTables]', sql, e); }
    }
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
  style: 'a' as 'a' | 'b', // 證照版型：a=原本經典、b=s2c 圓角亮粉
  sigColor: 'black', showSig: true, showCaption: true, showSeal: true, showStamp: false,
  sigW: 17, sigX: 63, sigY: 72,
  sealX: 84, sealY: 75, sealSize: 16, sealRot: -5, sealOp: 90,
  stampX: 80, stampY: 72, stampSize: 24,
  endorseCaption: 'n8n Taiwan Ambassador',
  defaultCourse: 'n8n Quickstart',
  printDays: 2, shipDays: 2,
  serialNext: 1001, // 下一個流水號序號（從 1001 起，不從 0）
  // 金流／帳務（主帳號可調，全站統一）
  unitPrice: 200,      // 每張未稅單價，主帳號可隨量調降
  taxRate: 5,          // 營業稅率 %
  settleDay: 10,       // 每月結帳日（付款/收款都在這天）
  bankName: '永豐銀行（807）',
  bankBranch: '東湖分行',
  bankAccount: '15401800121317',
  bankHolder: '虎智科技股份有限公司',
  // 寄件人（印在地址標籤上的回郵資訊）
  senderCompany: '虎智科技股份有限公司',
  senderAddr: '106335 國立台灣科技大學國際大樓\n台北市大安區基隆路4段43號1107室',
  senderPerson: 'Robin zhang 張凱榮',
  senderPhone: '886-911436467',
  // 自訂圖層：使用者上傳的 PNG（存 data URL）＋顯示/位置/大小
  overlayImg: '', overlayShow: false, overlayX: 50, overlayY: 50, overlaySize: 25, overlayOpacity: 100,
  // 版面九塊各自的顯示/縮放/位移（x,y 是證照寬的 %，scale 是 %）
  blocks: {
    logo: { show: true, scale: 100, x: 0, y: 0 },
    title: { show: true, scale: 100, x: 0, y: 0 },
    presented: { show: true, scale: 100, x: 0, y: 0 },
    name: { show: true, scale: 100, x: 0, y: 0 },
    body: { show: true, scale: 100, x: 0, y: 0 },
    course: { show: true, scale: 100, x: 0, y: 0 },
    date: { show: true, scale: 100, x: 0, y: 0 },
    bolt: { show: true, scale: 100, x: 0, y: 0 },
    eduteam: { show: true, scale: 100, x: 0, y: 0 },
  } as Record<string, { show: boolean; scale: number; x: number; y: number }>,
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

/** 刪除一位講師（名冊）。他名下已建的證照不動，owner 仍看得到。 */
export async function deleteInstructor(db: D1Database, id: string) {
  await db.prepare(`DELETE FROM cert_instructors WHERE id=?`).bind(id).run();
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

const CERT_FIELDS = ['studentName', 'course', 'issueDate', 'courseName', 'recipientName', 'org', 'jobTitle', 'email', 'phone', 'address', 'certUrl', 'tracking', 'fee', 'note'];

/** 建一筆證照，掛在某位講師底下 */
export async function createCert(
  db: D1Database, instructor: { id: string; name: string }, input: Record<string, unknown>,
) {
  const data: Record<string, unknown> = {
    studentName: String(input.studentName || '').trim(),
    serial: '', // 接單時才給號
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
    accepted: false, acceptedAt: '', etaDate: '',
    printed: false, printedAt: '',
    shipped: false, shippedAt: '',
    tracking: '',
    settled: false, settledAt: '',
    returnReason: '', returnedAt: '',
    editRequest: '', editRequestAt: '',
    // 寄送成本（每張各自輸入，owner 填）
    costEnvelope: 0, costCard: 0, costPostage: 0,
    // 付款/發票（付款方自己標已匯款、要不要發票、統編）
    paid: false, paidAt: '', paidNet: 0, paidTax: 0, paidAmount: 0, payLast5: '',
    payReject: '', // owner 對不到帳駁回的原因（講師重新確認後清掉）
    needInvoice: false, taxId: '', invoiceBuyer: '',
    invoiced: false, invoiceNo: '',
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

/** 批次標記已結算／取消結算（owner 收款、對帳後封存用）。 */
export async function markSettled(db: D1Database, ids: string[], value: boolean) {
  for (const id of ids) {
    const existing = await getRow(db, certificatesCollection, id);
    if (!existing) continue;
    const data = { ...existing };
    delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
    data.settled = value; data.settledAt = value ? nowISO() : '';
    await putRow(db, certificatesCollection, id, data);
  }
  return ids.length;
}

/**
 * 付款方標記已匯款／取消（講師可標自己的、owner 可標全部）。
 * 標記時用「當下設定」快照金額：單價、是否含稅（要發票才加稅）、統編。
 * 每張＝一單位，各自快照 unitPrice；要不要發票是整批一起帶進來。
 */
export async function markPaid(
  db: D1Database, ids: string[], value: boolean,
  opts: { needInvoice?: boolean; taxId?: string; buyer?: string; payLast5?: string } = {},
) {
  const s = await getSettings(db);
  const net = Number(s.unitPrice) || 0;
  const needInvoice = !!opts.needInvoice;
  const tax = needInvoice ? Math.round(net * (Number(s.taxRate) || 0) / 100) : 0;
  for (const id of ids) {
    const existing = await getRow(db, certificatesCollection, id);
    if (!existing) continue;
    const data = { ...existing };
    delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
    if (value) {
      data.paid = true; data.paidAt = nowISO();
      data.needInvoice = needInvoice; data.taxId = needInvoice ? String(opts.taxId || '').trim() : '';
      data.invoiceBuyer = String(opts.buyer || '').trim();
      data.payLast5 = String(opts.payLast5 || '').replace(/\D/g, '').slice(-5); // 匯款帳號後五碼，只留數字
      data.payReject = ''; // 重新送出＝清掉上次的駁回
      data.paidNet = net; data.paidTax = tax; data.paidAmount = net + tax;
    } else {
      data.paid = false; data.paidAt = '';
      data.payLast5 = '';
      data.paidNet = 0; data.paidTax = 0; data.paidAmount = 0;
    }
    await putRow(db, certificatesCollection, id, data);
  }
  return ids.length;
}

/**
 * 駁回匯款（owner 對不到帳）：把這筆退回未匯款狀態、附原因，講師會看到要重新確認。
 * 清掉匯款資訊（後五碼、金額、時間），但保留發票意願／統編／買受人，重送時不用再填。
 */
export async function rejectPay(db: D1Database, id: string, reason: string) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) return;
  const data = { ...existing };
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  data.paid = false; data.paidAt = ''; data.payLast5 = '';
  data.paidNet = 0; data.paidTax = 0; data.paidAmount = 0;
  data.payReject = String(reason || '').trim() || '請重新確認匯款';
  return putRow(db, certificatesCollection, id, data);
}

/** 設定一筆的寄送成本（信封／卡紙／掛號）與郵局單號（owner）。只覆蓋有帶的欄位。 */
export async function setCost(
  db: D1Database, id: string,
  patch: { costEnvelope?: number; costCard?: number; costPostage?: number; tracking?: string },
) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) return;
  const data = { ...existing };
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  for (const k of ['costEnvelope', 'costCard', 'costPostage'] as const) if (k in patch) data[k] = Number((patch as any)[k]) || 0;
  if ('tracking' in patch) data.tracking = String(patch.tracking || '').trim();
  return putRow(db, certificatesCollection, id, data);
}

/** 標記已開發票／取消（owner）。value=true 時可帶同一張發票號給整批。 */
export async function setInvoiced(db: D1Database, ids: string[], value: boolean, invoiceNo?: string) {
  for (const id of ids) {
    const existing = await getRow(db, certificatesCollection, id);
    if (!existing) continue;
    const data = { ...existing };
    delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
    data.invoiced = !!value;
    data.invoiceNo = value ? String(invoiceNo || '').trim() : '';
    await putRow(db, certificatesCollection, id, data);
  }
  return ids.length;
}

/** 退件：owner 把一筆退回講師、附原因（講師改完會清掉）。 */
export async function returnCert(db: D1Database, id: string, reason: string) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) throw new Error('找不到這一筆');
  const data = { ...existing };
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  data.returnReason = String(reason || '').trim(); data.returnedAt = nowISO();
  return putRow(db, certificatesCollection, id, data);
}

/** 清掉退件標記（講師改完、或 owner 取消退件）。 */
export async function clearReturn(db: D1Database, id: string) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) return;
  const data = { ...existing };
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  data.returnReason = ''; data.returnedAt = '';
  return putRow(db, certificatesCollection, id, data);
}

/**
 * 接單：owner 收下這些單、鎖定、算預計寄出日、帶入發證日期、給流水號。已接單的跳過。
 *   - 預計寄出日＝接單日＋印刷＋寄送天數（台北時區）
 *   - 發證日期＝接單當天（空的才帶，手動設過的不蓋），印在證照上的英文日期
 *   - 流水號＝「yy-序號」，序號從設定裡的 serialNext 接續（接單才給，重接不重給）
 */
const TPE_OFFSET = 8 * 3600 * 1000; // 台北 UTC+8
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // 證照上用簡寫月份
function tpe(iso: string) { return new Date(new Date(iso).getTime() + TPE_OFFSET); }
function addDays(iso: string, n: number): string {
  const d = tpe(iso);
  d.setUTCDate(d.getUTCDate() + (Number(n) || 0));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function certDate(iso: string): string {
  const d = tpe(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
export async function acceptCerts(db: D1Database, ids: string[], days: number) {
  const now = nowISO();
  const eta = addDays(now, days);
  const issue = certDate(now);
  const yy = String(tpe(now).getUTCFullYear()).slice(2);
  const settings = await getSettings(db);
  let serialNext = Number(settings.serialNext) || 1001;
  let count = 0, assigned = 0;
  for (const id of ids) {
    const existing = await getRow(db, certificatesCollection, id);
    if (!existing) continue;
    const data = { ...existing };
    delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
    let changed = false;
    if (!existing.accepted) {                               // 還沒接單：接單＋帶日期＋算預計日
      data.accepted = true; data.acceptedAt = now; data.etaDate = eta;
      if (!String(data.issueDate || '').trim()) data.issueDate = issue;
      changed = true;
    }
    if (!String(data.serial || '').trim()) {                // 沒號就補發（涵蓋早期接單但沒號的）
      data.serial = `${yy}-${serialNext}`; serialNext++; assigned++; changed = true;
    }
    if (changed) { await putRow(db, certificatesCollection, id, data); count++; }
  }
  if (assigned) await putSettings(db, { serialNext });
  return { count, etaDate: eta };
}

/** 講師送出修改申請（接單後不能直接改，只能申請）。有值＝owner 待處理。 */
export async function requestEdit(db: D1Database, id: string, message: string) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) throw new Error('找不到這一筆');
  const data = { ...existing };
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  data.editRequest = String(message || '').trim();
  data.editRequestAt = nowISO();
  return putRow(db, certificatesCollection, id, data);
}

/** 刪除一筆證照。 */
export async function deleteCert(db: D1Database, id: string) {
  await db.prepare(`DELETE FROM cert_records WHERE id=?`).bind(id).run();
}

/** 改派：把這幾筆證照換到另一位講師名下（owner 用，搬錯帳號／代上傳時）。 */
export async function reassignCerts(db: D1Database, ids: string[], instructorId: string, instructorName: string) {
  for (const id of ids) {
    const existing = await getRow(db, certificatesCollection, id);
    if (!existing) continue;
    const data = { ...existing };
    delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
    data.instructorId = instructorId;
    data.instructorName = instructorName;
    await putRow(db, certificatesCollection, id, data);
  }
  return ids.length;
}

/** 清掉修改申請（owner 改完或忽略）。 */
export async function clearEditRequest(db: D1Database, id: string) {
  const existing = await getRow(db, certificatesCollection, id);
  if (!existing) return;
  const data = { ...existing };
  delete (data as any).createdAt; delete (data as any).updatedAt; delete (data as any).sort;
  data.editRequest = ''; data.editRequestAt = '';
  return putRow(db, certificatesCollection, id, data);
}

/** 對帳報表：依「講師 × 月份」統計張數、已印、已寄、金額、已結算。instructorId 有給就只算那位（講師看自己的）。 */
export async function certReport(db: D1Database, instructorId?: string) {
  const rows = await listCerts(db, instructorId ? { instructorId } : {});
  const map = new Map<string, any>();
  for (const r of rows) {
    const month = String(r.createdAt || '').slice(0, 7) || '未知';
    const who = String(r.instructorName || '未指定');
    const key = who + '｜' + month;
    const g = map.get(key) || { instructor: who, month, count: 0, printed: 0, shipped: 0, amount: 0, settled: 0, settledAmount: 0 };
    const fee = Number(r.fee) || 0;
    g.count += 1;
    if (r.printed) g.printed += 1;
    if (r.shipped) g.shipped += 1;
    g.amount += fee;
    if (r.settled) { g.settled += 1; g.settledAmount += fee; }
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => (b.month + b.instructor).localeCompare(a.month + a.instructor));
}
