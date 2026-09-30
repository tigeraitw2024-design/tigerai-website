import type { Module } from '../schema/types';

/**
 * 下載資源（白皮書、範本、Workflow JSON）。
 *
 * 重點在「要不要留 Email 才能下載」。開著就走名單流程：
 * 訪客填 Email → 存進 leads → 寄出下載連結。關著就是直接給檔。
 *
 * 檔案本身不直接對外開放網址，而是透過 /api/download/<id> 轉出去，
 * 否則設了「要留 Email」也沒用——連結一被轉貼就繞過去了。
 */
const mod: Module = {
  id: 'resources',
  label: '資源',
  about: '可下載的檔案。可以設定要不要留 Email 才給下載。',
  collections: [
    {
      name: 'resources',
      label: '下載資源',
      group: '內容',
      icon: 'download',
      kind: 'content',
      intro: '設定「需要留 Email」之後，下載連結會經過驗證，直接轉貼網址沒有用。',
      titleField: 'title',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'title', label: '名稱', type: 'text', required: true, listed: true, maxLength: 60 },
        { name: 'slug', label: '網址代號', type: 'slug', required: true, unique: true, indexed: true },
        { name: 'summary', label: '說明', type: 'textarea', maxLength: 160 },
        { name: 'cover', label: '封面圖', type: 'image' },
        { name: 'file', label: '檔案', type: 'file', required: true },
        {
          name: 'kind', label: '類型', type: 'select', listed: true, default: 'pdf', options: [
            { value: 'pdf', label: 'PDF 白皮書' },
            { value: 'json', label: 'n8n Workflow JSON' },
            { value: 'sheet', label: '表單／範本' },
            { value: 'other', label: '其他' },
          ],
        },
        {
          name: 'gated', label: '需要留 Email', type: 'boolean', default: true, listed: true,
          help: '打開的話，訪客要先填 Email 才拿得到檔案，Email 會進「名單」。',
        },
        { name: 'downloads', label: '下載次數', type: 'number', readonly: true, listed: true },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'published', options: [
            { value: 'draft', label: '草稿' },
            { value: 'published', label: '已發布' },
          ],
        },
      ],
    },
  ],
};
export default mod;
