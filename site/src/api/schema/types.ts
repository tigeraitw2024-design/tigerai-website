/**
 * 欄位與集合的定義。整個後台就是從這裡長出來的。
 *
 * 加一個欄位 = 在某個 module 的 fields 裡多一行。
 * 資料表、後台表單、列表欄、API 驗證、匯出檔案，全部會自己跟上。
 */

/** 後台帳號角色。排序有意義：越後面權限越大，比大小用 RANK。 */
export type Role = 'viewer' | 'editor' | 'sales' | 'owner';
export const RANK: Record<Role, number> = { viewer: 0, editor: 1, sales: 2, owner: 3 };

export type FieldType =
  | 'text'        // 單行字
  | 'textarea'    // 多行字
  | 'richtext'    // 允許少量 HTML（標題、粗體、連結、清單）
  | 'number'
  | 'money'       // 以「分」為單位存整數，避免浮點數誤差
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'datetime'
  | 'email'
  | 'tel'
  | 'url'
  | 'slug'        // 網址用的代號，只允許小寫英數與連字號
  | 'image'       // 存 media 的 id
  | 'file'
  | 'relation'    // 指向另一個集合的一筆
  | 'relations'   // 指向另一個集合的多筆
  | 'array'       // 重複的一組子欄位（用 of 定義）
  | 'json'        // 自由結構，後台用純文字編輯器
  | 'color'
  | 'password';   // 只寫不讀，存雜湊

export type Field = {
  name: string;
  /** 後台上顯示的中文名 */
  label: string;
  type: FieldType;
  required?: boolean;
  /** 欄位下方的說明，寫給不是工程師的人看 */
  help?: string;
  /** select / multiselect 的選項 */
  options?: { value: string; label: string }[];
  /** array 的子欄位 */
  of?: Field[];
  /** relation / relations 指向哪個集合 */
  relation?: string;
  default?: unknown;
  /** 要不要出現在列表頁的欄位。列表只放認得出是哪一筆的資訊。 */
  listed?: boolean;
  /**
   * 個資。標了之後，權限不足的人透過 API 拿到的是遮罩後的值，
   * 不是前端藏起來——後端根本不給。
   */
  pii?: boolean;
  /**
   * 要不要另外開一個真欄位（預設所有欄位都收在 data 這個 JSON 裡）。
   * 需要用來查詢、排序或做唯一值檢查的欄位才開，例如訂單的 member_id。
   */
  indexed?: boolean;
  unique?: boolean;
  min?: number;
  max?: number;
  /** 文字欄位的長度上限，超過就擋下來 */
  maxLength?: number;
  /** 後台表單的排版寬度，預設整行 */
  width?: 'full' | 'half' | 'third';
  /** 唯讀：系統寫的，人不能改（例如訂單編號、建立時間） */
  readonly?: boolean;
};

export type CollectionKind =
  | 'content'    // 編輯後要重新發布才會上線（build 時烤進靜態頁）
  | 'runtime'    // 隨時在變，前台即時讀寫
  | 'singleton'; // 只有一筆，例如全站設定

export type Collection = {
  /** 資料表名，也是 API 路徑 /api/c/<name> */
  name: string;
  /** 後台側欄顯示的中文名 */
  label: string;
  /** 側欄分組：內容 / 生意 / 系統 */
  group: '內容' | '生意' | '系統';
  /** lucide 圖示名 */
  icon: string;
  kind: CollectionKind;
  /** 一句話說明這個功能是幹嘛的，會直接印在後台該頁最上方 */
  intro?: string;
  fields: Field[];
  /** 列表上用哪個欄位當標題 */
  titleField?: string;
  /** 可不可以拖曳排序（前台的顯示順序） */
  sortable?: boolean;
  /** 能不能新增／刪除。singleton 與系統產生的資料通常不行。 */
  canCreate?: boolean;
  canDelete?: boolean;
  /** 讀寫各需要什麼角色（最低要求） */
  read: Role;
  write: Role;
  /** 第一次建表時塞進去的初始資料 */
  seed?: () => Record<string, unknown>[];
};

/** 每個功能元件就是一個 module，匯出一到多個集合。 */
export type Module = {
  /** 元件代號，跟資料夾／檔名一致 */
  id: string;
  label: string;
  /** 這個元件在做什麼，寫給 Robin 看的 */
  about: string;
  collections: Collection[];
  /** 這個元件要額外掛的 API 路徑（例如結帳、寄預約信） */
  routes?: string[];
};

/** 欄位預設值。新增一筆時用。 */
export function blankValue(f: Field): unknown {
  if (f.default !== undefined) return f.default;
  switch (f.type) {
    case 'boolean': return false;
    case 'number': case 'money': return 0;
    case 'array': case 'relations': case 'multiselect': return [];
    case 'json': return {};
    default: return '';
  }
}

/** 個資遮罩。留頭留尾，中間打掉，讓人還認得出是哪一筆但拿不到完整資料。 */
export function maskPII(v: unknown): string {
  const s = String(v ?? '');
  if (!s) return '';
  if (s.includes('@')) {
    const [u, d] = s.split('@');
    return `${u.slice(0, 1)}${'●'.repeat(Math.max(2, u.length - 1))}@${d}`;
  }
  if (s.length <= 3) return '●'.repeat(s.length);
  return `${s.slice(0, 2)}${'●'.repeat(Math.max(2, s.length - 3))}${s.slice(-1)}`;
}
