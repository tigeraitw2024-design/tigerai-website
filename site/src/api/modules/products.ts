import type { Module } from '../schema/types';

/**
 * 產品線。對應主控台六站與 Tiger GPU Pro。
 * 前台的產品頁、首頁產品入口、Tiger GPU Pro 專頁都吃這裡。
 */
const mod: Module = {
  id: 'products',
  label: '產品',
  about: '六條產品線與硬體。每條產品線可以有自己的賣點、功能區塊與常見問題。',
  collections: [
    {
      name: 'products',
      label: '產品線',
      group: '內容',
      icon: 'box',
      kind: 'content',
      intro: '排序會直接影響前台卡片的順序，可以拖曳。',
      titleField: 'title',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        {
          name: 'eyebrow', label: '小標', type: 'text', maxLength: 30, listed: true, width: 'half',
          help: '卡片最上面那行小字，例如「站 1・對話」',
        },
        { name: 'title', label: '產品名稱', type: 'text', required: true, listed: true, width: 'half' },
        { name: 'slug', label: '網址代號', type: 'slug', unique: true, indexed: true },
        { name: 'body', label: '一句話說明', type: 'textarea', maxLength: 120, required: true },
        {
          name: 'audience', label: '這是給誰看的', type: 'select', listed: true, default: 'all', options: [
            { value: 'boss', label: '老闆' },
            { value: 'manager', label: '經理人' },
            { value: 'engineer', label: '工程師' },
            { value: 'all', label: '都適用' },
          ],
        },
        { name: 'cover', label: '主視覺', type: 'image' },
        {
          name: 'highlights', label: '賣點', type: 'array', of: [
            { name: 'title', label: '標題', type: 'text', required: true },
            { name: 'body', label: '說明', type: 'textarea' },
            { name: 'icon', label: '圖示', type: 'text', help: 'lucide 圖示名稱，例如 shield' },
          ],
        },
        {
          name: 'specs', label: '規格', type: 'array', of: [
            { name: 'k', label: '項目', type: 'text', required: true, width: 'half' },
            { name: 'v', label: '內容', type: 'text', required: true, width: 'half' },
          ],
        },
        {
          name: 'faq', label: '常見問題', type: 'array', of: [
            { name: 'q', label: '問題', type: 'text', required: true },
            { name: 'a', label: '回答', type: 'textarea', required: true },
          ],
        },
        {
          name: 'price', label: '參考價格', type: 'money', width: 'half',
          help: '硬體通常是報價制，填 0 前台會顯示「報價後確認」。',
        },
        {
          name: 'buyable', label: '可線上購買', type: 'boolean', width: 'half', default: false,
          help: '打開才會出現在購物車。硬體通常關著，走詢價。',
        },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'published', options: [
            { value: 'draft', label: '草稿' },
            { value: 'published', label: '已發布' },
            { value: 'archived', label: '已下架' },
          ],
        },
      ],
    },
  ],
};
export default mod;
