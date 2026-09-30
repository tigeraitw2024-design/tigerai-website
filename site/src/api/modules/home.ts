import type { Module } from '../schema/types';

/**
 * 首頁文案。
 *
 * Robin 說過首頁那些數字不是假資料，是真的，所以要能從後台改。
 * 這裡一個欄位對應首頁上的一個位置，欄位名稱刻意用區塊編號開頭
 * （hero / trust / shadow / …），跟 src/pages/index.astro 的區塊註解對得起來，
 * 之後有人要對照「後台這欄是改到哪裡」才找得到。
 *
 * 是 singleton：永遠只有一筆，後台不給新增也不給刪除。
 */
const mod: Module = {
  id: 'home',
  label: '首頁文案',
  about: '首頁每一區的標題與說明。數字（企業導入、學員結業）也在這裡改。',
  collections: [
    {
      name: 'home',
      label: '首頁文案',
      group: '內容',
      icon: 'house',
      kind: 'singleton',
      intro:
        '欄位留空＝維持現在站上那句話，不會變成空白。要改才填。' +
        '欄位名稱前面的編號對應首頁由上往下的區塊，照編號找就對了。' +
        '改完要按總覽的「發布到前台」，前台是靜態頁，不重新建置不會變。',
      canCreate: false,
      canDelete: false,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'heroEyebrow', label: '① 主視覺 - 小標', type: 'text', maxLength: 40, default: '開源地端 AI × 可驗證的能力養成' },
        {
          name: 'heroLine1', label: '① 主視覺 - 標題第一行', type: 'text', maxLength: 24,
          help: '這兩行會做馬賽克掃場動畫，一行不要超過 12 個字，超過會換行破版。',
        },
        { name: 'heroLine2', label: '① 主視覺 - 標題第二行', type: 'text', maxLength: 24 },

        { name: 'trustCompanies', label: '② 信任帶 - 企業導入數', type: 'number', width: 'half' },
        { name: 'trustStudents', label: '② 信任帶 - 學員結業數', type: 'number', width: 'half' },
        {
          name: 'trustTags', label: '② 信任帶 - 標籤', type: 'array', of: [
            { name: 'text', label: '標籤文字', type: 'text', required: true, maxLength: 24 },
          ],
        },

        { name: 'shadowEyebrow', label: '③ 立場宣言 - 小標', type: 'text', maxLength: 30, default: 'Shadow AI Spend' },
        { name: 'shadowTitle', label: '③ 立場宣言 - 標題', type: 'text', maxLength: 30 },
        { name: 'shadowBody', label: '③ 立場宣言 - 內文', type: 'textarea', maxLength: 200 },
        {
          name: 'shadowCards', label: '③ 立場宣言 - 四張卡', type: 'array', of: [
            { name: 'title', label: '標題', type: 'text', required: true, maxLength: 12 },
            { name: 'body', label: '說明', type: 'textarea', required: true, maxLength: 50 },
          ],
        },
        {
          name: 'compare', label: '③ 雲端訂閱 vs 地端開源 對照表', type: 'array', of: [
            { name: 'cloud', label: '雲端訂閱', type: 'text', required: true, width: 'half' },
            { name: 'local', label: '地端開源', type: 'text', required: true, width: 'half' },
          ],
        },

        { name: 'productsTitle', label: '④ 產品入口 - 標題', type: 'text', maxLength: 30 },
        { name: 'productsBody', label: '④ 產品入口 - 內文', type: 'textarea', maxLength: 160 },

        { name: 'gpuTitle', label: '④b Tiger GPU Pro - 標題', type: 'text', maxLength: 30 },
        { name: 'gpuBody', label: '④b Tiger GPU Pro - 內文', type: 'textarea', maxLength: 160 },
        { name: 'gpuCta', label: '④b Tiger GPU Pro - 按鈕文字', type: 'text', maxLength: 20 },

        { name: 'workflowTitle', label: '⑤ Workflow 展示櫃 - 標題', type: 'text', maxLength: 40 },
        { name: 'deptTitle', label: '⑤b 企業首選 - 標題', type: 'text', maxLength: 30 },
        { name: 'deptBody', label: '⑤b 企業首選 - 內文', type: 'textarea', maxLength: 160 },

        { name: 'assessTitle', label: '⑥ 測評入口 - 標題', type: 'text', maxLength: 30 },
        { name: 'assessBody', label: '⑥ 測評入口 - 內文', type: 'textarea', maxLength: 200 },
        {
          name: 'assessUrl', label: '⑥ 測評入口 - 外連網址', type: 'url',
          help: 'AX Academy 的測評頁。這是中立第三方，文案上不要寫成虎智自家測驗。',
        },

        { name: 'coursesTitle', label: '⑦ 課程區 - 標題', type: 'text', maxLength: 30 },
        { name: 'methodTitle', label: '⑧ 顧問與方法論 - 標題', type: 'text', maxLength: 30 },
        { name: 'methodBody', label: '⑧ 顧問與方法論 - 內文', type: 'textarea', maxLength: 200 },
        { name: 'casesTitle', label: '⑨ 案例 - 標題', type: 'text', maxLength: 30 },

        { name: 'ctaTitle', label: '⑩ 預約區 - 標題', type: 'text', maxLength: 30 },
        { name: 'ctaBody', label: '⑩ 預約區 - 內文', type: 'textarea', maxLength: 200 },

        {
          name: 'gateEnabled', label: '⓪ 開場身分選擇', type: 'boolean', default: true,
          help: '進站時先問「你是老闆／經理人／工程師」的那一頁。看過一次的人不會再看到。',
        },
        {
          name: 'gateOptions', label: '⓪ 開場身分選項', type: 'array', of: [
            { name: 'key', label: '代號', type: 'text', required: true, width: 'third' },
            { name: 'label', label: '顯示文字', type: 'text', required: true, width: 'third' },
            { name: 'sub', label: '副標', type: 'text', width: 'third' },
          ],
        },
      ],
    },
  ],
};
export default mod;
