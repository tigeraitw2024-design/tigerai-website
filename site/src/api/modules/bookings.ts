import type { Module } from '../schema/types';

/**
 * 預約 30 分鐘諮詢。
 *
 * Robin 要整套架構做完，所以這裡不只是「存一筆資料」：
 *   1. 可預約時段由 booking_slots 決定，不是讓人隨便填時間
 *   2. 送出後立刻寄確認信給客戶、通知信給內部
 *   3. 24 小時內沒有人確認就自動取消，把時段放回去
 *   4. 客戶的聯絡方式是個資，editor 角色看不到
 *
 * 第 3 點靠 Cron Trigger 跑（見 src/api/routes/cron.ts）。
 * 免費方案的 Cron 最密是每分鐘一次，這裡設每小時一次就夠了。
 */
const mod: Module = {
  id: 'bookings',
  label: '預約諮詢',
  about: '30 分鐘諮詢預約。時段、名單、確認信、逾時自動取消。',
  collections: [
    {
      name: 'booking_slots',
      label: '可預約時段',
      group: '生意',
      icon: 'calendar-clock',
      kind: 'runtime',
      intro: '沒有開時段，前台就約不到。建議一次開兩週，每週補一次。',
      titleField: 'startAt',
      canCreate: true,
      canDelete: true,
      read: 'sales',
      write: 'sales',
      fields: [
        { name: 'startAt', label: '開始時間', type: 'datetime', required: true, listed: true, indexed: true },
        { name: 'minutes', label: '長度（分鐘）', type: 'number', default: 30, width: 'half' },
        {
          name: 'capacity', label: '可約人數', type: 'number', default: 1, width: 'half',
          help: '同一個時段可以接幾組。一對一就填 1。',
        },
        { name: 'booked', label: '已約', type: 'number', readonly: true, listed: true },
        { name: 'host', label: '由誰接', type: 'relation', relation: 'consultants', listed: true },
        {
          name: 'channel', label: '形式', type: 'select', listed: true, default: 'online', options: [
            { value: 'online', label: '線上' },
            { value: 'onsite', label: '到府' },
            { value: 'office', label: '來公司' },
          ],
        },
        { name: 'open', label: '開放預約', type: 'boolean', default: true, listed: true },
      ],
    },
    {
      name: 'bookings',
      label: '預約名單',
      group: '生意',
      icon: 'calendar-check',
      kind: 'runtime',
      intro: '客戶送出的預約。聯絡方式是個資，只有你和業務角色看得到完整內容。',
      titleField: 'name',
      canCreate: false,
      canDelete: true,
      read: 'sales',
      write: 'sales',
      fields: [
        { name: 'code', label: '預約編號', type: 'text', readonly: true, listed: true, indexed: true, unique: true },
        { name: 'slot', label: '時段', type: 'relation', relation: 'booking_slots', listed: true, indexed: true },
        { name: 'name', label: '姓名', type: 'text', required: true, listed: true, pii: true },
        { name: 'company', label: '公司', type: 'text', listed: true, pii: true },
        { name: 'jobTitle', label: '職稱', type: 'text', pii: true },
        { name: 'email', label: 'Email', type: 'email', required: true, pii: true, indexed: true },
        { name: 'phone', label: '電話', type: 'tel', pii: true },
        {
          name: 'headcount', label: '公司人數', type: 'select', options: [
            { value: '1-10', label: '10 人以下' },
            { value: '11-50', label: '11–50 人' },
            { value: '51-200', label: '51–200 人' },
            { value: '200+', label: '200 人以上' },
          ],
        },
        {
          name: 'topic', label: '想談什麼', type: 'textarea', listed: true,
          help: '客戶自己填的。「帶著你最痛的那個部門來」問到的就是這一欄。',
        },
        {
          name: 'source', label: '從哪裡來', type: 'text', readonly: true,
          help: '記錄是從哪一頁送出的，以及 UTM 參數。',
        },
        {
          name: 'state', label: '狀態', type: 'select', listed: true, default: 'pending', options: [
            { value: 'pending', label: '待確認' },
            { value: 'confirmed', label: '已確認' },
            { value: 'done', label: '已完成' },
            { value: 'cancelled', label: '已取消' },
            { value: 'expired', label: '逾時自動取消' },
            { value: 'noshow', label: '未出席' },
          ],
        },
        { name: 'internalNote', label: '內部備註', type: 'textarea', pii: true },
      ],
    },
  ],
  routes: [
    'POST /api/booking/slots  查可約時段（公開）',
    'POST /api/booking        送出預約（公開，有頻率限制）',
    'POST /api/booking/cancel 客戶用編號＋Email 自行取消',
  ],
};
export default mod;
