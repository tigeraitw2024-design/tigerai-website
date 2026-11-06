/**
 * 講師區跟後端說話的地方。
 *
 * 跟後台 src/admin/api.ts 刻意分開：講師區是獨立的一塊，自己管登入、
 * 自己的錯誤處理，之後要連欄位都改也只動這裡，不會波及官網後台。
 * 全部打到 /api/teacher/*（見 src/api/teacher/routes.ts）。
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: text.slice(0, 200) }; }
  if (!r.ok) throw new ApiError(r.status, body?.error || `出錯了（${r.status}）`);
  return body as T;
}

export const api = {
  get: <T>(p: string) => call<T>(p),
  post: <T>(p: string, body?: unknown) =>
    call<T>(p, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => call<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(p: string) => call<T>(p, { method: 'DELETE' }),
};

// ── 型別（跟 src/api/teacher/schema.ts 對應） ──────────────────────

export type Role = 'owner' | 'instructor';

export type TeacherUser = { id: string; email: string; name: string; role: Role };

export type Cert = {
  id: string;
  studentName: string;
  serial: string;
  course: string;
  issueDate: string;
  instructorId: string;
  instructorName: string;
  courseName: string;
  recipientName: string;
  org: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  certUrl: string;
  fee: number;
  accepted: boolean;
  acceptedAt: string;
  etaDate: string;
  printed: boolean;
  printedAt: string;
  shipped: boolean;
  shippedAt: string;
  tracking: string;
  settled: boolean;
  settledAt: string;
  returnReason: string;
  returnedAt: string;
  editRequest: string;
  editRequestAt: string;
  note: string;
  // 寄送成本（每張，owner 填）
  costEnvelope: number;
  costCard: number;
  costPostage: number;
  // 付款／發票
  paid: boolean;
  paidAt: string;
  paidNet: number;
  paidTax: number;
  paidAmount: number;
  needInvoice: boolean;
  taxId: string;
  invoiceBuyer: string;
  invoiced: boolean;
  invoiceNo: string;
  createdAt: string;
  updatedAt: string;
};

/** 金流設定（結帳頁用，任何登入者都讀得到）。對應 /api/teacher/billing。 */
export type BillingConfig = {
  unitPrice: number; taxRate: number; settleDay: number;
  bankName: string; bankBranch: string; bankAccount: string; bankHolder: string;
};

/** 獎狀設定（owner 在「獎狀設定」頁設好、全站套用）。對應 src/api/teacher/store.ts 的 SETTINGS_DEFAULTS。 */
export type CertSettings = {
  style: 'a' | 'b';
  sigColor: 'black' | 'red' | 'blue'; showSig: boolean; showCaption: boolean; showSeal: boolean; showStamp: boolean;
  sigW: number; sigX: number; sigY: number;
  sealX: number; sealY: number; sealSize: number; sealRot: number; sealOp: number;
  stampX: number; stampY: number; stampSize: number;
  endorseCaption: string; defaultCourse: string;
  printDays: number; shipDays: number; serialNext: number;
  unitPrice: number; taxRate: number; settleDay: number;
  bankName: string; bankBranch: string; bankAccount: string; bankHolder: string;
  blocks: Record<string, { show: boolean; scale: number; x: number; y: number }>;
  overlayImg: string; overlayShow: boolean; overlayX: number; overlayY: number; overlaySize: number; overlayOpacity: number;
};

export type Instructor = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  note: string;
};

export type ReportRow = {
  instructor: string;
  month: string;
  count: number;
  printed: number;
  shipped: number;
  amount: number;
  settled: number;
  settledAmount: number;
};
