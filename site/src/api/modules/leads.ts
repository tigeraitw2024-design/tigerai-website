import type { Module } from '../schema/types';

/**
 * 名單。站上所有「留下 Email」的入口都匯到這裡：
 *   首頁 Workflow 區的「寄模板給我」
 *   主控台的「留下 Email 開通 30 分鐘沙盒」
 *   資源下載的 Email 門檻
 *
 * 同一個 Email 重複留不會變成兩筆，會累加 touches 並更新 lastSource，
 * 因為要看的是「這個人來過幾次、對什麼有興趣」，不是有幾張表單。
 *
 * consent 欄位是刻意分開存的：收到檔案的同意，不等於同意收行銷信。
 * 這兩件事混在一起，之後真的要發電子報時就沒有乾淨的名單可用。
 */
const mod: Module = {
  id: 'leads',
  label: '名單',
  about: '所有留下 Email 的人。含來源、次數、行銷同意狀態。',
  collections: [
    {
      name: 'leads',
      label: '名單',
      group: '生意',
      icon: 'mail',
      kind: 'runtime',
      intro: '同一個 Email 只會有一筆，重複留會累加次數。匯出 CSV 前請先確認對方同意收信。',
      titleField: 'email',
      canCreate: false,
      canDelete: true,
      read: 'sales',
      write: 'sales',
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true, unique: true, indexed: true, listed: true, pii: true },
        { name: 'name', label: '姓名', type: 'text', listed: true, pii: true },
        { name: 'company', label: '公司', type: 'text', listed: true, pii: true },
        { name: 'phone', label: '電話', type: 'tel', pii: true },
        {
          name: 'firstSource', label: '第一次從哪來', type: 'text', readonly: true,
          help: '例如 workflow-template／sandbox／resource:ai-white-paper',
        },
        { name: 'lastSource', label: '最近一次從哪來', type: 'text', readonly: true, listed: true },
        { name: 'touches', label: '互動次數', type: 'number', readonly: true, listed: true },
        {
          name: 'marketingConsent', label: '同意收行銷信', type: 'boolean', default: false, listed: true,
          help: '沒有打勾就不要寄電子報。收檔案的同意不等於這個。',
        },
        { name: 'consentAt', label: '同意時間', type: 'datetime', readonly: true },
        {
          name: 'stage', label: '跟進階段', type: 'select', listed: true, default: 'new', options: [
            { value: 'new', label: '新名單' },
            { value: 'contacted', label: '已聯絡' },
            { value: 'qualified', label: '有機會' },
            { value: 'customer', label: '已成交' },
            { value: 'dropped', label: '不跟進' },
          ],
        },
        { name: 'internalNote', label: '內部備註', type: 'textarea', pii: true },
      ],
    },
  ],
  routes: [
    'POST /api/lead         留 Email（公開，有頻率限制）',
    'GET  /api/lead/export  匯出 CSV（需要 sales 以上）',
    'GET  /api/download/:id 憑名單換下載連結',
  ],
};
export default mod;
