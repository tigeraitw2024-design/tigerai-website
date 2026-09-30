import type { Module } from '../schema/types';

/**
 * 全站設定 ＋ 法遵頁面。
 *
 * 隱私權政策與服務條款做成可編輯的欄位而不是寫死在程式裡，
 * 是因為這兩份東西會改：加了金流要改、開始寄行銷信要改、
 * 個資保存期限變了也要改。寫死在頁面裡就等於每次都要找工程師。
 */
const mod: Module = {
  id: 'settings',
  label: '全站設定',
  about: '公司資訊、SEO、社群連結、隱私權政策與服務條款。',
  collections: [
    {
      name: 'settings',
      label: '全站設定',
      group: '系統',
      icon: 'settings',
      kind: 'singleton',
      intro: '這裡改的東西會出現在每一頁的頁尾與搜尋結果上。',
      canCreate: false,
      canDelete: false,
      read: 'viewer',
      write: 'owner',
      fields: [
        { name: 'siteName', label: '網站名稱', type: 'text', required: true, default: 'TigerAI 虎智科技' },
        {
          name: 'siteDescription', label: '網站簡介', type: 'textarea', maxLength: 160,
          help: '出現在 Google 搜尋結果的那兩行。',
        },
        { name: 'ogImage', label: '分享預覽圖', type: 'image', help: '建議 1200×630。貼連結到 LINE／FB 時顯示的圖。' },

        { name: 'companyName', label: '公司全名', type: 'text', default: '虎智科技股份有限公司' },
        { name: 'taxId', label: '統一編號', type: 'text', maxLength: 8 },
        { name: 'address', label: '地址', type: 'text' },
        { name: 'phone', label: '聯絡電話', type: 'tel' },
        { name: 'email', label: '聯絡信箱', type: 'email' },
        { name: 'hours', label: '服務時間', type: 'text', maxLength: 40 },

        {
          name: 'social', label: '社群連結', type: 'array', of: [
            {
              name: 'platform', label: '平台', type: 'select', width: 'half', options: [
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'line', label: 'LINE 官方帳號' },
                { value: 'threads', label: 'Threads' },
              ],
            },
            { name: 'url', label: '連結', type: 'url', width: 'half' },
          ],
        },

        {
          name: 'analyticsId', label: '網站分析代碼', type: 'text',
          help: 'Google Analytics 的 G-XXXXXXX。留空就不載入任何追蹤程式。',
        },
        {
          name: 'noindex', label: '禁止搜尋引擎收錄', type: 'boolean', default: false,
          help: '正式上線前打開，上線後記得關掉，不然 Google 永遠找不到這個站。',
        },

        { name: 'privacy', label: '隱私權政策', type: 'richtext' },
        { name: 'terms', label: '服務條款', type: 'richtext' },
        { name: 'refund', label: '退費規則', type: 'richtext', help: '課程退費的條件與期限。開賣前一定要寫。' },

        {
          name: 'maintenance', label: '維護模式', type: 'boolean', default: false,
          help: '打開之後前台只會顯示一頁維護公告。後台不受影響。',
        },
        { name: 'maintenanceNote', label: '維護公告文字', type: 'textarea' },
      ],
    },
  ],
};
export default mod;
