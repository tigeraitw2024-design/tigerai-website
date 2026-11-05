import type { Collection } from '../schema/types';

/**
 * 講師區（證照系統）的資料表。
 *
 * 刻意跟官網的 modules/ 分開，不進主 registry，所以**不會出現在官網後台 /admin**，
 * 也不會動到現有任何東西。表用的是跟官網一樣的形狀（id/sort/data/created_at/
 * updated_at ＋ 索引欄），所以 db.ts 的 createTableSQL / rowToRecord 都能直接重用。
 *
 * 兩張表：
 *   cert_instructors  講師名冊（誰能用 Google 登入進講師區、是 owner 還是 instructor）
 *   cert_records      每位通過考試的學生一筆＝一張要發的證照
 */

export const instructorsCollection: Collection = {
  name: 'cert_instructors',
  label: '講師名冊',
  group: '系統',
  icon: 'users',
  kind: 'runtime',
  read: 'owner',
  write: 'owner',
  fields: [
    { name: 'email', label: 'Gmail', type: 'email', required: true, unique: true, indexed: true },
    { name: 'name', label: '姓名', type: 'text', required: true },
    {
      name: 'role', label: '角色', type: 'select', default: 'instructor', options: [
        { value: 'owner', label: 'owner・看全部、出證照、寄送、對帳' },
        { value: 'instructor', label: 'instructor・只看自己的學生' },
      ],
    },
    { name: 'active', label: '啟用', type: 'boolean', default: true },
    { name: 'note', label: '備註', type: 'text' },
  ],
};

export const certificatesCollection: Collection = {
  name: 'cert_records',
  label: '證照',
  group: '系統',
  icon: 'award',
  kind: 'runtime',
  read: 'owner',
  write: 'owner',
  fields: [
    { name: 'studentName', label: '學員姓名', type: 'text', required: true, listed: true },
    { name: 'serial', label: '編號', type: 'text', readonly: true, listed: true, help: '接單（出單）時自動給的 Tiger AI 流水號，例如 26-1001。後台可用這個查（搜尋框打編號即可）。' },
    { name: 'course', label: '證照名稱', type: 'text', default: 'n8n Quickstart', listed: true },
    { name: 'issueDate', label: '發證日期', type: 'text', listed: true, help: '證照上印的日期。接單當天自動帶入（例如 November 5, 2026），也可手動改。' },
    // 所屬講師：資料擁有者，列級權限就靠這個欄位過濾
    { name: 'instructorId', label: '所屬講師ID', type: 'text', indexed: true },
    { name: 'instructorName', label: '所屬講師', type: 'text', listed: true },
    { name: 'courseName', label: '上課梯次／班級', type: 'text', help: '這批學生上的是哪一門／哪一梯' },
    // 寄件收件人：證照上印的是英文名，但郵局要的是中文收件人，分開存。
    { name: 'recipientName', label: '收件人（寄送用）', type: 'text', pii: true, help: '郵寄時寫在包裹上的中文姓名，通常就是本人中文名。' },
    { name: 'org', label: '單位／學校', type: 'text', help: '服務單位，匯入自表單用，參考用。' },
    { name: 'jobTitle', label: '職稱', type: 'text', help: '參考用。' },
    { name: 'email', label: 'Email', type: 'email', pii: true, indexed: true },
    { name: 'phone', label: '電話', type: 'tel', pii: true },
    { name: 'address', label: '寄送地址', type: 'text', pii: true, listed: true, help: '含郵遞區號的完整地址。' },
    { name: 'certUrl', label: 'n8n 證照原檔連結', type: 'text', help: '對方上傳的 n8n 電子證照檔（核對姓名／發證日期用）。' },
    { name: 'fee', label: '費用(元)', type: 'number', default: 200, help: '每張含運，預設 200' },
    // 接單流程：講師送出後→owner 按「接單」鎖定並算預計寄出日→已印→已寄
    { name: 'accepted', label: '已接單', type: 'boolean', default: false, listed: true },
    { name: 'acceptedAt', label: '接單時間', type: 'datetime', readonly: true },
    { name: 'etaDate', label: '預計寄出日', type: 'text', readonly: true, help: '接單日＋印刷天數＋寄送天數，接單當下算好。' },
    { name: 'printed', label: '已列印', type: 'boolean', default: false, listed: true },
    { name: 'printedAt', label: '列印時間', type: 'datetime', readonly: true },
    { name: 'shipped', label: '已寄送', type: 'boolean', default: false, listed: true },
    { name: 'shippedAt', label: '寄送時間', type: 'datetime', readonly: true },
    { name: 'tracking', label: '物流單號', type: 'text' },
    // 對帳封存：owner 收款/結算後打勾，封存起來、之後仍可查
    { name: 'settled', label: '已結算', type: 'boolean', default: false, listed: true },
    { name: 'settledAt', label: '結算時間', type: 'datetime', readonly: true },
    // 退件：owner 把不合格的退回講師（附原因）；講師改完會清掉
    { name: 'returnReason', label: '退件原因', type: 'text' },
    { name: 'returnedAt', label: '退件時間', type: 'datetime', readonly: true },
    // 接單後講師不能直接改，只能送「修改申請」給 owner；有值＝有待處理的申請
    { name: 'editRequest', label: '修改申請', type: 'text' },
    { name: 'editRequestAt', label: '修改申請時間', type: 'datetime', readonly: true },
    { name: 'note', label: '備註', type: 'text' },
  ],
};

/**
 * 獎狀設定（單例）：owner 在後台設好的證照格式與內容——簽名顏色/位置、用印位置、
 * 落款文字、預設證照名稱、印刷/寄送天數。全站（預覽、產生器、前台顯示）都讀這一份。
 * 只存一列（id='cert_settings'），值收在 data JSON，用 getSettings/putSettings 讀寫。
 */
export const settingsCollection: Collection = {
  name: 'cert_settings',
  label: '獎狀設定',
  group: '系統',
  icon: 'settings',
  kind: 'singleton',
  read: 'owner',
  write: 'owner',
  canCreate: false,
  canDelete: false,
  fields: [],
};

export const TEACHER_COLLECTIONS: Collection[] = [instructorsCollection, certificatesCollection, settingsCollection];
