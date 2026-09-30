import type { Module } from '../schema/types';

/**
 * 課程。站上最重要、也最常改的一塊：要能開班、改價、改補助說明、關報名。
 *
 * 拆成兩個集合是刻意的：
 *   courses   一門課的內容（介紹、大綱、講師、定價）——很少改
 *   sessions  一個班次（開課日期、期數、名額、報名開關）——常常改
 * 合在一起的話，每次開新班都要複製整份課程介紹，改錯一個字兩邊就不一樣了。
 */
const LEVELS = [
  { value: 'L1', label: 'L1・認識' },
  { value: 'L2', label: 'L2・會用' },
  { value: 'L3', label: 'L3・做得出來' },
  { value: 'L4', label: 'L4・導得動' },
  { value: 'L5', label: 'L5・治理得了' },
];

const mod: Module = {
  id: 'courses',
  label: '課程',
  about: '課程內容與開班班次。前台的課程頁、首頁課程區、購物車賣的東西都來自這裡。',
  collections: [
    {
      name: 'courses',
      label: '課程',
      group: '內容',
      icon: 'graduation-cap',
      kind: 'content',
      intro: '一門課寫一次。開新班請去「開班班次」，不要複製課程。',
      titleField: 'title',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'title', label: '課程名稱', type: 'text', required: true, listed: true, maxLength: 60 },
        {
          name: 'slug', label: '網址代號', type: 'slug', required: true, unique: true, indexed: true,
          help: '課程頁網址會長成 /courses/<代號>。上線後不要再改，改了舊連結會失效。',
        },
        { name: 'level', label: '等級', type: 'select', options: LEVELS, required: true, listed: true, width: 'half' },
        { name: 'hours', label: '時數', type: 'number', min: 0, max: 400, listed: true, width: 'half', help: '單位是小時' },
        {
          name: 'summary', label: '一句話簡介', type: 'textarea', maxLength: 120,
          help: '課程卡上顯示的那一行。寫具體的結果，不要寫形容詞。',
        },
        { name: 'cover', label: '課程主視覺', type: 'image', help: '建議 1440×576，跟課程頁 Banner 同比例' },
        { name: 'body', label: '課程介紹', type: 'richtext' },
        {
          name: 'outline', label: '課程大綱', type: 'array', of: [
            { name: 'title', label: '單元名稱', type: 'text', required: true },
            { name: 'detail', label: '單元說明', type: 'textarea' },
            { name: 'hours', label: '時數', type: 'number', width: 'third' },
          ],
        },
        { name: 'teachers', label: '授課顧問', type: 'relations', relation: 'consultants' },
        { name: 'price', label: '定價', type: 'money', listed: true, width: 'half', help: '新台幣。填 0 代表免費或另議。' },
        { name: 'memberPrice', label: '會員價', type: 'money', width: 'half', help: '留 0 表示沒有會員價' },
        { name: 'subsidy', label: '政府補助適用', type: 'boolean', width: 'half' },
        {
          name: 'subsidyNote', label: '補助說明', type: 'text', maxLength: 80,
          help: '寫方案名稱與比例。沒確定的數字不要寫上去。',
        },
        {
          name: 'students', label: '累計學員數', type: 'number', width: 'half',
          help: '前台會顯示成「學員 1,240+」。沒把握就留 0，前台會整個不顯示。',
        },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'published', options: [
            { value: 'draft', label: '草稿（前台看不到）' },
            { value: 'published', label: '已發布' },
            { value: 'archived', label: '已下架' },
          ],
        },
      ],
    },
    {
      name: 'course_sessions',
      label: '開班班次',
      group: '內容',
      icon: 'calendar-days',
      kind: 'content',
      intro: '每開一個班新增一筆。關掉「開放報名」，前台就買不到這個班。',
      titleField: 'label',
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'course', label: '課程', type: 'relation', relation: 'courses', required: true, listed: true, indexed: true },
        { name: 'label', label: '期數', type: 'text', listed: true, width: 'half', help: '例如「第 12 期」' },
        { name: 'startDate', label: '開課日', type: 'date', required: true, listed: true, width: 'half' },
        { name: 'endDate', label: '結訓日', type: 'date', width: 'half' },
        { name: 'weekdays', label: '上課時段', type: 'text', maxLength: 60, help: '例如「週六 09:30–17:30，共 2 天」' },
        { name: 'place', label: '上課地點', type: 'text', maxLength: 80 },
        { name: 'online', label: '線上課', type: 'boolean', width: 'half' },
        { name: 'seats', label: '名額', type: 'number', width: 'half', min: 0 },
        {
          name: 'sold', label: '已報名', type: 'number', width: 'half', readonly: true,
          help: '由訂單自動累加，不要手動改。',
        },
        { name: 'priceOverride', label: '本班特價', type: 'money', width: 'half', help: '留 0 就用課程定價。' },
        { name: 'open', label: '開放報名', type: 'boolean', default: true, listed: true },
        { name: 'note', label: '備註', type: 'textarea', help: '只有後台看得到，不會出現在前台。' },
      ],
    },
  ],
};
export default mod;
