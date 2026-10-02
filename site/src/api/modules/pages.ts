import type { Module } from '../schema/types';

/**
 * 各頁面的固定文案。
 *
 * 跟「首頁文案」分開，因為首頁的區塊多到自成一頁，混在一起會變成一張
 * 捲不完的表單。這裡放其他頁面上那些「不是一筆一筆資料、但也會想改」的東西：
 * 顧問頁的三把尺與四個數字、Tiger GPU Pro 的規格表等等。
 *
 * 每個頁面一筆，用 page 欄位分。不做成 singleton 是因為以後加頁面只要多一筆，
 * 不用再開一個集合。
 */
const mod: Module = {
  id: 'pages',
  label: '頁面文案',
  about: '首頁以外各頁的固定文案與數字。每個頁面一筆。',
  collections: [
    {
      name: 'page_blocks',
      label: '頁面文案',
      group: '內容',
      icon: 'layout-list',
      kind: 'content',
      intro: '欄位留空＝維持現在站上的內容，不會變成空白。要改才填。',
      titleField: 'label',
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        {
          name: 'page', label: '哪一頁', type: 'select', required: true, listed: true, indexed: true, unique: true,
          options: [
            { value: 'consultants', label: '顧問與方法論' },
            { value: 'courses', label: '課程' },
            { value: 'tiger-gpu-pro', label: 'Tiger GPU Pro' },
            { value: 'resources', label: '免費資源' },
            { value: 'blog', label: '部落格' },
          ],
        },
        { name: 'label', label: '備註', type: 'text', listed: true, help: '只有後台看得到，方便你在列表上認出是哪一筆。' },

        { name: 'heading', label: '頁面主標', type: 'text', maxLength: 30 },
        { name: 'intro', label: '頁面引言', type: 'textarea', maxLength: 200 },

        {
          name: 'rulers', label: '顧問頁 - 三把尺', type: 'array',
          help: '「尺 1 C1–C5 思考力」那三張卡。',
          of: [
            { name: 'n', label: '編號', type: 'text', required: true, maxLength: 8, width: 'third' },
            { name: 'title', label: '名稱', type: 'text', required: true, maxLength: 20 },
            { name: 'body', label: '說明', type: 'textarea', required: true, maxLength: 80 },
          ],
        },
        {
          name: 'stats', label: '顧問頁 - 四個數字', type: 'array',
          of: [
            { name: 'n', label: '數字', type: 'text', required: true, maxLength: 12, width: 'half' },
            { name: 'label', label: '說明', type: 'text', required: true, maxLength: 20, width: 'half' },
          ],
        },
        {
          name: 'stages', label: '顧問頁 - 陪跑 01–04', type: 'array',
          help: '四個階段的標題、標籤與說明。順序就是畫面上由上到下的順序。',
          of: [
            { name: 'n', label: '編號', type: 'text', required: true, maxLength: 4, width: 'third' },
            { name: 'title', label: '階段名稱', type: 'text', required: true, maxLength: 12, width: 'third' },
            { name: 'tag', label: '右側標籤', type: 'text', required: true, maxLength: 24 },
            { name: 'text', label: '說明', type: 'textarea', required: true, maxLength: 80 },
          ],
        },
        {
          name: 'stagePhotos', label: '顧問頁 - 陪跑照片', type: 'array',
          help: '四張照片，對應上面四個階段。',
          of: [
            { name: 'src', label: '照片', type: 'image', required: true },
            { name: 'alt', label: '照片說明', type: 'text', required: true },
          ],
        },
        {
          name: 'transfer', label: '顧問頁 - 三張能力移轉卡', type: 'array',
          of: [
            { name: 'n', label: '數字', type: 'text', required: true, maxLength: 10, width: 'third' },
            { name: 'unit', label: '單位', type: 'text', maxLength: 20, width: 'third' },
            { name: 'title', label: '標題', type: 'text', required: true, maxLength: 20 },
            { name: 'body', label: '說明', type: 'textarea', required: true, maxLength: 120 },
          ],
        },

        {
          name: 'modules', label: 'GPU Pro - 平台三件套', type: 'array',
          of: [
            { name: 'n', label: '編號', type: 'text', required: true, maxLength: 10, width: 'third' },
            { name: 'title', label: '模組名稱', type: 'text', required: true, maxLength: 20, width: 'third' },
            { name: 'tag', label: '標籤', type: 'text', required: true, maxLength: 30 },
            { name: 'body', label: '說明', type: 'textarea', required: true, maxLength: 120 },
          ],
        },
        {
          name: 'usage', label: 'GPU Pro - 本月用量條', type: 'array',
          help: '示意用的四條用量。接上真的管理中心之前，這裡填什麼畫面就顯示什麼。',
          of: [
            { name: 'who', label: '部門・姓', type: 'text', required: true, maxLength: 12, width: 'third' },
            { name: 'pct', label: '百分比', type: 'number', required: true, min: 0, max: 100, width: 'third' },
            { name: 'n', label: '用量數字', type: 'text', required: true, maxLength: 10, width: 'third' },
            { name: 'warn', label: '標成警示', type: 'boolean' },
          ],
        },
        {
          name: 'bannerMinH', label: '課程頁 - Banner 最矮', type: 'number', default: 520, min: 200, max: 1200, width: 'half',
          help: '單位是像素。Banner 高度是「螢幕高度減掉頂欄」，但不會低於這個值。螢幕很扁的筆電用得到。',
        },
        {
          name: 'bannerMaxH', label: '課程頁 - Banner 最高', type: 'number', default: 1100, min: 400, max: 2000, width: 'half',
          help: '不會超過這個值。大螢幕上不會被拉成一面牆。',
        },
        {
          name: 'blocks', label: '其他文字區塊', type: 'array',
          help: '這一頁上其他想改的小段文字。鍵名要跟程式裡用的對上，不確定就問。',
          of: [
            { name: 'k', label: '鍵名', type: 'text', required: true, width: 'third' },
            { name: 'v', label: '內容', type: 'textarea', required: true },
          ],
        },
      ],
    },
  ],
};
export default mod;
