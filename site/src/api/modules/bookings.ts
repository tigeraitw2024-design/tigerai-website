import type { Module } from '../schema/types';

/**
 * 預約 30 分鐘諮詢。
 *
 * Robin 要整套架構做完，所以這裡不只是「存一筆資料」：
 *   1. 可預約時段由 booking_slots 決定，不是讓人隨便填時間
 *   2. 送出後在 Google 行事曆開一格，並寄行事曆邀請給客戶
 *   3. 客戶在邀請上按「是」就算確認（2026-10-03 Robin 選的方式）
 *   4. 24 小時內沒按就自動取消，把時段放回去
 *   5. 客戶的聯絡方式是個資，editor 角色看不到
 *
 * 時段的來源有兩種，由 booking_rules 的「時段怎麼來」決定：
 *   手動——你自己在後台開，就是原本的做法
 *   行事曆——Cron 每小時讀 Google 行事曆的空檔，自動算出可約時段
 *
 * 行事曆模式下，booking_slots 變成「快取」而不是「真相」：真相在行事曆上。
 * 所以客戶真的送出預約時會再跟行事曆確認一次還空著，撞期就請他重選——
 * 快取最久是一小時前算的，這一小時裡你可能自己排了別的事。
 *
 * 第 4 點與時段重算都靠 Cron Trigger 跑（見 routes/ops.ts 的 runCron）。
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
        {
          name: 'fromCalendar', label: '行事曆自動產生', type: 'boolean', readonly: true, listed: true,
          help: '打勾的是程式從 Google 行事曆算出來的，每小時會重算一次，手改了也會被蓋掉。'
            + '要固定開某個時段，請自己新增一筆（這一欄就不會打勾）。',
        },
      ],
    },
    {
      name: 'booking_rules',
      label: '預約時段規則',
      group: '生意',
      icon: 'calendar-clock',
      kind: 'singleton',
      intro:
        '決定可約時段怎麼來。選「從 Google 行事曆算」的話，你只要維護自己的行事曆，'
        + '官網每小時會自己把空檔變成可約時段。',
      canCreate: false,
      canDelete: false,
      read: 'sales',
      write: 'sales',
      fields: [
        {
          name: 'source', label: '時段怎麼來', type: 'select', default: 'manual', options: [
            { value: 'manual', label: '我自己在後台開' },
            { value: 'calendar', label: '從 Google 行事曆的空檔自動算' },
          ],
          help: '選行事曆的話，下面那些規則才有作用，而且「可預約時段」那一頁會被程式接管。',
        },
        {
          name: 'calendarIds', label: '還要避開哪些行事曆', type: 'textarea',
          help: '官網專用帳號自己的行事曆一定會避開，不用填。'
            + '想連你主帳號的私人行程一起避開：先把你的行事曆「與特定使用者共用」給官網專用帳號，'
            + '再把行事曆 ID（Google 日曆設定裡那串 ...@group.calendar.google.com 或你的信箱）填在這裡，'
            + '多個用逗號分隔。',
        },
        {
          name: 'weekdays', label: '哪幾天可以約', type: 'multiselect', default: ['1', '2', '3', '4', '5'], options: [
            { value: '1', label: '週一' },
            { value: '2', label: '週二' },
            { value: '3', label: '週三' },
            { value: '4', label: '週四' },
            { value: '5', label: '週五' },
            { value: '6', label: '週六' },
            { value: '7', label: '週日' },
          ],
        },
        { name: 'dayStart', label: '最早幾點', type: 'text', default: '10:00', width: 'half', help: '填 24 小時制，例如 10:00。' },
        { name: 'dayEnd', label: '最晚到幾點', type: 'text', default: '18:00', width: 'half', help: '這是「會議要結束的時間」，不是最晚開始的時間。' },
        { name: 'slotMinutes', label: '一場多久（分鐘）', type: 'number', default: 30, min: 10, max: 240, width: 'half' },
        {
          name: 'gapMinutes', label: '兩場之間空多久（分鐘）', type: 'number', default: 15, min: 0, max: 120, width: 'half',
          help: '避免一場接一場。填 15 的話，10:00 那場結束後下一個可約時段是 10:45。',
        },
        {
          name: 'leadHours', label: '至少要提前幾小時約', type: 'number', default: 24, min: 0, max: 720, width: 'half',
          help: '填 24 就表示明天這個時間以後才約得到，你不會被突襲。',
        },
        {
          name: 'daysAhead', label: '可以約到幾天後', type: 'number', default: 14, min: 0, max: 90, width: 'half',
          help: '開太長會卡住你之後的行程安排，兩週通常夠。填 0 表示只開今天。',
        },
        {
          name: 'maxPerDay', label: '一天最多幾場', type: 'number', default: 3, min: 0, max: 20, width: 'half',
          help: '填 0 表示不限。從最早的時段開始算。',
        },
        {
          name: 'ignoreAllDay', label: '整天的行程不算佔用', type: 'boolean', default: false, width: 'half',
          help: '預設關：行事曆上有整天的事（出差、休假）那天就整天約不到。'
            + '如果你的行事曆上有很多整天的提醒（生日、節日）害時段全空，再打開這個。',
        },
        {
          name: 'channel', label: '自動產生的時段形式', type: 'select', default: 'online', options: [
            { value: 'online', label: '線上' },
            { value: 'onsite', label: '到府' },
            { value: 'office', label: '來公司' },
          ],
        },
        { name: 'host', label: '自動產生的時段由誰接', type: 'relation', relation: 'consultants' },
        {
          name: 'lastSync', label: '上次重算時間', type: 'text', readonly: true,
          help: '空白表示還沒算過。到「總覽」可以按「現在重算時段」不用等。',
        },
        { name: 'lastSyncNote', label: '上次重算結果', type: 'textarea', readonly: true },
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
            { value: 'declined', label: '客戶婉拒' },
            { value: 'done', label: '已完成' },
            { value: 'cancelled', label: '已取消' },
            { value: 'expired', label: '逾時自動取消' },
            { value: 'noshow', label: '未出席' },
          ],
          help: '客戶在行事曆邀請上按「是」→ 自動變成已確認；按「否」→ 客戶婉拒；'
            + '24 小時都沒按 → 逾時自動取消，時段放回去。你也可以自己改。',
        },
        {
          name: 'guestStatus', label: '客戶對邀請的回應', type: 'select', readonly: true, listed: true,
          default: '', options: [
            { value: '', label: '（沒有行事曆邀請）' },
            { value: 'invited', label: '還沒回應' },
            { value: 'yes', label: '會出席' },
            { value: 'maybe', label: '可能出席' },
            { value: 'no', label: '不出席' },
            { value: 'gone', label: '活動已被刪除' },
          ],
          help: '每小時從 Google 行事曆同步一次。',
        },
        {
          name: 'eventId', label: 'Google 行事曆活動編號', type: 'text', readonly: true,
          help: '系統用來回頭查這場會議的狀態、或取消它。空白表示沒有建立行事曆活動'
            + '（客戶沒選時段，或當時 Google 連不上）。',
        },
        { name: 'internalNote', label: '內部備註', type: 'textarea', pii: true },
      ],
    },
  ],
  routes: [
    'GET  /api/booking/slots  查可約時段（公開，讀 booking_slots 快取）',
    'POST /api/booking        送出預約（公開，有頻率限制）',
    'POST /api/booking/cancel 客戶用編號＋Email 自行取消',
  ],
};
export default mod;
