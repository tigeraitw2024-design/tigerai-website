import type { Module } from '../schema/types';

/**
 * 會員。
 *
 * 舊的學習中心會員不搬過來（Robin 決定的），新站從零開始。
 *
 * 密碼欄位的型別是 password：API 永遠不會把它讀出來，只能寫入，
 * 寫入時會做雜湊。後台看到的是一個「重設密碼」按鈕，不是一個輸入框裡的舊密碼。
 *
 * 會員資料全部是個資，editor 角色整個集合都看不到。
 */
const mod: Module = {
  id: 'members',
  label: '會員',
  about: '前台會員帳號、已購課程、上課紀錄。',
  collections: [
    {
      name: 'members',
      label: '會員',
      group: '生意',
      icon: 'user-round',
      kind: 'runtime',
      intro: '會員資料是個資。這一頁只有你和業務角色進得來。',
      titleField: 'name',
      canCreate: true,
      canDelete: true,
      read: 'sales',
      write: 'sales',
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true, unique: true, indexed: true, listed: true, pii: true },
        { name: 'name', label: '姓名', type: 'text', required: true, listed: true, pii: true },
        { name: 'phone', label: '電話', type: 'tel', pii: true },
        { name: 'company', label: '公司', type: 'text', listed: true, pii: true },
        { name: 'jobTitle', label: '職稱', type: 'text', pii: true },
        {
          name: 'password', label: '密碼', type: 'password',
          help: '這裡看不到現有密碼（存的是雜湊，本來就讀不回來）。要幫會員重設就直接輸入新密碼。',
        },
        {
          name: 'verified', label: 'Email 已驗證', type: 'boolean', default: false, listed: true,
          help: '沒驗證的帳號可以登入，但買不了東西。',
        },
        {
          name: 'level', label: '等級', type: 'select', listed: true, default: 'L0', options: [
            { value: 'L0', label: '未測評' },
            { value: 'L1', label: 'L1' },
            { value: 'L2', label: 'L2' },
            { value: 'L3', label: 'L3' },
            { value: 'L4', label: 'L4' },
            { value: 'L5', label: 'L5' },
          ],
          help: 'AX Academy 測評結果。之後對接測評 API 會自動更新。',
        },
        {
          name: 'state', label: '狀態', type: 'select', listed: true, default: 'active', options: [
            { value: 'active', label: '正常' },
            { value: 'suspended', label: '停權' },
          ],
        },
        { name: 'lastLoginAt', label: '最後登入', type: 'datetime', readonly: true, listed: true },
        { name: 'internalNote', label: '內部備註', type: 'textarea', pii: true },
      ],
    },
    {
      name: 'enrollments',
      label: '上課資格',
      group: '生意',
      icon: 'ticket',
      kind: 'runtime',
      intro: '訂單付款完成後自動產生。手動新增是給補單或贈課用的。',
      titleField: 'id',
      canCreate: true,
      canDelete: true,
      read: 'sales',
      write: 'sales',
      fields: [
        { name: 'member', label: '會員', type: 'relation', relation: 'members', required: true, listed: true, indexed: true },
        { name: 'course', label: '課程', type: 'relation', relation: 'courses', required: true, listed: true, indexed: true },
        { name: 'session', label: '班次', type: 'relation', relation: 'course_sessions', listed: true, indexed: true },
        { name: 'order', label: '來源訂單', type: 'relation', relation: 'orders', readonly: true },
        {
          name: 'state', label: '狀態', type: 'select', listed: true, default: 'active', options: [
            { value: 'active', label: '有效' },
            { value: 'completed', label: '已結訓' },
            { value: 'refunded', label: '已退費' },
            { value: 'cancelled', label: '已取消' },
          ],
        },
        { name: 'note', label: '備註', type: 'textarea' },
      ],
    },
  ],
  routes: [
    'POST /api/member/register  註冊',
    'POST /api/member/login     登入',
    'POST /api/member/logout    登出',
    'GET  /api/member/me        目前登入的會員與已購課程',
    'POST /api/member/forgot    忘記密碼（寄重設連結）',
    'POST /api/member/reset     用重設連結設定新密碼',
  ],
};
export default mod;
