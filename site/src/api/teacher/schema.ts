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
    { name: 'course', label: '證照名稱', type: 'text', default: 'n8n Quickstart', listed: true },
    { name: 'issueDate', label: '發證日期', type: 'text', listed: true, help: '證照上印的日期，例如 July 29, 2026' },
    // 所屬講師：資料擁有者，列級權限就靠這個欄位過濾
    { name: 'instructorId', label: '所屬講師ID', type: 'text', indexed: true },
    { name: 'instructorName', label: '所屬講師', type: 'text', listed: true },
    { name: 'courseName', label: '上課梯次／班級', type: 'text', help: '這批學生上的是哪一門／哪一梯' },
    { name: 'email', label: 'Email', type: 'email', pii: true, indexed: true },
    { name: 'phone', label: '電話', type: 'tel', pii: true },
    { name: 'address', label: '寄送地址', type: 'text', pii: true, listed: true },
    { name: 'fee', label: '費用(元)', type: 'number', default: 200, help: '每張含運，預設 200' },
    { name: 'printed', label: '已列印', type: 'boolean', default: false, listed: true },
    { name: 'printedAt', label: '列印時間', type: 'datetime', readonly: true },
    { name: 'shipped', label: '已寄送', type: 'boolean', default: false, listed: true },
    { name: 'shippedAt', label: '寄送時間', type: 'datetime', readonly: true },
    { name: 'tracking', label: '物流單號', type: 'text' },
    { name: 'note', label: '備註', type: 'text' },
  ],
};

export const TEACHER_COLLECTIONS: Collection[] = [instructorsCollection, certificatesCollection];
