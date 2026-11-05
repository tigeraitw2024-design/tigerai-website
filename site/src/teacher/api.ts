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
};

// ── 型別（跟 src/api/teacher/schema.ts 對應） ──────────────────────

export type Role = 'owner' | 'instructor';

export type TeacherUser = { id: string; email: string; name: string; role: Role };

export type Cert = {
  id: string;
  studentName: string;
  course: string;
  issueDate: string;
  instructorId: string;
  instructorName: string;
  courseName: string;
  email: string;
  phone: string;
  address: string;
  fee: number;
  printed: boolean;
  printedAt: string;
  shipped: boolean;
  shippedAt: string;
  tracking: string;
  note: string;
  createdAt: string;
  updatedAt: string;
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
};
