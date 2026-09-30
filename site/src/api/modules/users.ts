import type { Module } from '../schema/types';

/**
 * 後台帳號與操作紀錄。
 *
 * 四個角色，分法的重點是 Robin 說的「公司同事也會用，但客戶個資不能隨便看」：
 *
 *   owner   全部，包含開帳號、改全站設定、發布
 *   editor  只有內容。預約、名單、會員、訂單這幾個集合在側欄根本不會出現
 *   sales   內容唯讀 ＋ 預約、名單、訂單（看得到聯絡方式）
 *   viewer  全部唯讀，而且標了個資的欄位一律是遮罩後的值
 *
 * 「看不到」是後端不給，不是前端藏起來。權限檢查在 API 那一層，
 * 直接打 API 也拿不到。
 */
const mod: Module = {
  id: 'users',
  label: '後台帳號',
  about: '誰可以進後台、能做什麼。以及所有人做了什麼的紀錄。',
  collections: [
    {
      name: 'users',
      label: '後台帳號',
      group: '系統',
      icon: 'shield',
      kind: 'runtime',
      intro: '只有你（owner）看得到這一頁。給同事開帳號時請照實際工作給角色，不要一律給 owner。',
      titleField: 'name',
      canCreate: true,
      canDelete: true,
      read: 'owner',
      write: 'owner',
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true, unique: true, indexed: true, listed: true },
        { name: 'name', label: '姓名', type: 'text', required: true, listed: true },
        {
          name: 'role', label: '角色', type: 'select', required: true, listed: true, default: 'editor', options: [
            { value: 'owner', label: 'owner・全部權限，可開帳號與發布' },
            { value: 'sales', label: 'sales・內容唯讀＋預約名單訂單（含聯絡方式）' },
            { value: 'editor', label: 'editor・只能改內容，看不到任何客戶個資' },
            { value: 'viewer', label: 'viewer・全部唯讀，個資一律遮罩' },
          ],
        },
        {
          name: 'password', label: '密碼', type: 'password',
          help: '存的是雜湊，讀不回來。要改就直接輸入新密碼。至少 12 個字。',
        },
        { name: 'active', label: '啟用', type: 'boolean', default: true, listed: true },
        { name: 'lastLoginAt', label: '最後登入', type: 'datetime', readonly: true, listed: true },
        { name: 'note', label: '備註', type: 'text', help: '這個帳號是誰、為什麼開。' },
      ],
    },
    {
      name: 'audit_log',
      label: '操作紀錄',
      group: '系統',
      icon: 'history',
      kind: 'runtime',
      intro: '誰在什麼時候改了什麼。只能看，不能改也不能刪——能刪的紀錄沒有意義。',
      titleField: 'action',
      canCreate: false,
      canDelete: false,
      read: 'owner',
      write: 'owner',
      fields: [
        { name: 'at', label: '時間', type: 'datetime', readonly: true, listed: true, indexed: true },
        { name: 'who', label: '操作者', type: 'text', readonly: true, listed: true },
        { name: 'action', label: '動作', type: 'text', readonly: true, listed: true },
        { name: 'target', label: '對象', type: 'text', readonly: true, listed: true },
        { name: 'detail', label: '細節', type: 'json', readonly: true },
        { name: 'ip', label: 'IP', type: 'text', readonly: true, pii: true },
      ],
    },
  ],
  routes: [
    'POST /api/auth/login   後台登入',
    'POST /api/auth/logout  登出',
    'GET  /api/auth/me      目前身分與權限',
  ],
};
export default mod;
