import type { Collection, Field } from './schema/types';
import { COLLECTION_LIST } from './schema/registry';

/**
 * 資料表怎麼長出來的。
 *
 * 每個集合一張表，欄位是：
 *
 *   id          文字主鍵（不用自動遞增的數字，因為編號會洩漏「你總共有幾筆」）
 *   sort        排序用
 *   data        JSON，所有欄位的值都收在這裡
 *   created_at  建立時間
 *   updated_at  更新時間
 *   <索引欄位>  schema 裡標了 indexed 的欄位會另外開一個真欄位
 *
 * 為什麼用 JSON 而不是每個欄位開一個真欄位：
 *
 * 因為「加一個欄位」是這個站最常發生的事。真欄位的做法每加一次就要寫一份
 * migration，而 D1 的 ALTER TABLE 能做的事很有限（改型別、加唯一鍵都得整張
 * 表重建）。改成 JSON 之後，加欄位就只是在 module 檔裡多一行，舊資料讀出來
 * 那個欄位是 undefined，套預設值就好，不需要碰資料庫。
 *
 * 代價是「沒辦法用 SQL 條件查 JSON 裡的欄位」。所以需要拿來查詢、排序或做
 * 唯一值檢查的欄位（訂單的 member_id、會員的 email、課程的 slug）要在
 * schema 裡標 indexed，那些會鏡射成真欄位並建索引。兩邊都寫，寫入時一起更新。
 */

export type Row = {
  id: string;
  sort: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** 標了 indexed 的欄位會鏡射成真欄位。欄位名轉成 snake_case 避免跟保留字撞。 */
export function indexedFields(c: Collection): Field[] {
  return c.fields.filter((f) => f.indexed || f.unique);
}

export function columnName(f: Field) {
  return 'f_' + f.name.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

function sqlType(f: Field) {
  if (f.type === 'number' || f.type === 'money') return 'INTEGER';
  if (f.type === 'boolean') return 'INTEGER';
  return 'TEXT';
}

/** 產生一個集合的建表與建索引 SQL */
export function createTableSQL(c: Collection): string[] {
  const extra = indexedFields(c).map((f) => `  ${columnName(f)} ${sqlType(f)}`);
  const stmts = [
    `CREATE TABLE IF NOT EXISTS ${c.name} (
  id TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL${extra.length ? ',\n' + extra.join(',\n') : ''}
)`,
    `CREATE INDEX IF NOT EXISTS ix_${c.name}_sort ON ${c.name}(sort)`,
  ];
  for (const f of indexedFields(c)) {
    const col = columnName(f);
    stmts.push(
      f.unique
        ? `CREATE UNIQUE INDEX IF NOT EXISTS ux_${c.name}_${f.name} ON ${c.name}(${col})`
        : `CREATE INDEX IF NOT EXISTS ix_${c.name}_${f.name} ON ${c.name}(${col})`,
    );
  }
  return stmts;
}

/**
 * 不屬於任何集合的系統表。
 *
 * sessions 存後台與會員的登入狀態。這裡刻意不用「只有簽章的 cookie」，
 * 而是在資料庫留一筆，因為只有簽章的話沒辦法登出——簽章在到期前一直有效，
 * 帳號停權了也還能用。有這張表就可以直接刪掉某一個 session。
 */
export const SYSTEM_TABLES = [
  `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- admin | member
  subject_id TEXT NOT NULL,      -- users.id 或 members.id
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ip TEXT,
  agent TEXT
)`,
  `CREATE INDEX IF NOT EXISTS ix_sessions_subject ON sessions(subject_id)`,
  `CREATE INDEX IF NOT EXISTS ix_sessions_expires ON sessions(expires_at)`,

  // 購物車。匿名購物車靠 cookie 裡的 token 認，登入後會併進會員的車。
  `CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS ix_carts_member ON carts(member_id)`,

  // 一次性代幣：Email 驗證、忘記密碼、憑 Email 換下載連結都用這張表。
  // 用完就刪，不是標記成已用——已用的紀錄留著只會變成另一個要清的東西。
  `CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS ix_tokens_expires ON tokens(expires_at)`,

  // 頻率限制。公開端點（預約、留 Email、登入）都要擋，不然一個晚上就能被灌滿。
  `CREATE TABLE IF NOT EXISTS rate_limit (
  k TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  reset_at TEXT NOT NULL
)`,

  // 寄信佇列。寄信失敗不能讓使用者的請求跟著失敗（客戶已經預約成功了，
  // 不該因為信寄不出去就看到錯誤），所以先入列，再由 Cron 重試。
  `CREATE TABLE IF NOT EXISTS mail_queue (
  id TEXT PRIMARY KEY,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  tries INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS ix_mail_state ON mail_queue(state)`,
];

/** 把整個 schema 變成一份建置 SQL。bootstrap 與 migrations 都用這個。 */
export function fullSchemaSQL(): string[] {
  return [...SYSTEM_TABLES, ...COLLECTION_LIST.flatMap(createTableSQL)];
}

// ── 讀寫 ────────────────────────────────────────────────────────────

export function rowToRecord(r: any): Record<string, unknown> {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(r.data || '{}');
  } catch {
    // 資料壞掉時不要整頁爆掉，回一個空的讓人至少進得去後台把它修好
    data = {};
  }
  return { ...data, id: r.id, sort: r.sort, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** id 用時間前綴 + 隨機，這樣按 id 排序大致等於按建立時間排序，翻頁比較穩 */
export function newId() {
  const t = Date.now().toString(36);
  const r = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${t}${r}`;
}

export const nowISO = () => new Date().toISOString();
