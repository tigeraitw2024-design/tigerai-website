import type { Module } from '../schema/types';
import { flows as FLOW_SEED } from '../../data/flows';

/**
 * Workflow 展示櫃 ＋ 企業首選工作流。
 *
 * nodes / conns 是 n8n 畫布的節點與連線座標，前台的 CaseFilePane 拿它畫圖。
 * 這兩個欄位是 JSON，後台用純文字編輯器——因為正確的編法是**從 n8n 直接匯出**
 * 再貼進來，不是在後台一個一個拉節點。真要拉節點，那是重寫一個 n8n，不划算。
 */
const mod: Module = {
  id: 'workflows',
  label: 'Workflow',
  about: '首頁的 Workflow 展示櫃與六條企業首選工作流。節點資料從 n8n 匯出後貼進來。',
  collections: [
    {
      name: 'workflows',
      label: '工作流',
      group: '內容',
      icon: 'workflow',
      kind: 'content',
      intro: '節點與連線請從 n8n 匯出 JSON 再貼進來，不要手打座標。',
      titleField: 'name',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'name', label: '流程名稱', type: 'text', required: true, listed: true, maxLength: 40 },
        { name: 'dept', label: '部門', type: 'text', listed: true, width: 'half', maxLength: 12 },
        {
          name: 'gain', label: '成效', type: 'text', listed: true, width: 'half', maxLength: 24,
          help: '例如「10 分 → 8 秒」',
        },
        { name: 'pain', label: '痛點', type: 'textarea', maxLength: 80 },
        { name: 'fix', label: '解方', type: 'textarea', maxLength: 80 },
        { name: 'result', label: '成效說明', type: 'textarea', maxLength: 80 },
        {
          name: 'video', label: '範例影片', type: 'url',
          help: 'YouTube 網址。前台會只播你指定的片段。',
        },
        { name: 'clipStart', label: '片段起點（秒）', type: 'number', width: 'half' },
        { name: 'clipEnd', label: '片段終點（秒）', type: 'number', width: 'half' },
        {
          name: 'nodes', label: '節點（JSON）', type: 'json',
          help: 'n8n 匯出的節點陣列。每個節點要有 name／t／x／y。',
        },
        { name: 'conns', label: '連線（JSON）', type: 'json' },
        { name: 'notes', label: '便條（JSON）', type: 'json', help: '畫布上的說明框，可以留空。' },
        {
          name: 'downloadable', label: '可下載範本', type: 'boolean', default: true,
          help: '打開的話，前台「寄模板給我」會把這條流程的 JSON 寄出去。',
        },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'published', options: [
            { value: 'draft', label: '草稿' },
            { value: 'published', label: '已發布' },
          ],
        },
      ],
      seed: () => FLOW_SEED.map((f, i) => ({
        name: f.name,
        nodes: f.nodes,
        conns: f.conns,
        notes: f.notes,
        sort: i,
        status: 'published',
        downloadable: true,
      })),
    },
  ],
};
export default mod;
