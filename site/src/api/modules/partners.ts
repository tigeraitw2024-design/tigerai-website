import type { Module } from '../schema/types';
import { partners as SEED } from '../../data/partners';

/**
 * 合作夥伴 logo 牆。
 *
 * 「不進翻牌牆」這個欄位是原型就有的（d=1）：有些夥伴要計入「合作 N 家」
 * 的家數，但不方便把 logo 秀出來。所以家數跟露出是兩件事。
 */
const mod: Module = {
  id: 'partners',
  label: '合作夥伴',
  about: '夥伴 logo 牆。可以只計入家數而不露出 logo。',
  collections: [
    {
      name: 'partners',
      label: '合作夥伴',
      group: '內容',
      icon: 'handshake',
      kind: 'content',
      intro: '有些夥伴不方便露出 logo，把「不露出 logo」打開，家數還是會算進去。',
      titleField: 'a',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'a', label: '名稱', type: 'text', required: true, listed: true },
        { name: 's', label: 'Logo', type: 'image', required: true, help: '去背或白底 PNG／WebP，寬度至少 400px' },
        { name: 'url', label: '官網連結', type: 'url' },
        {
          name: 'd', label: '不露出 logo', type: 'boolean', listed: true, default: false,
          help: '打開的話 logo 不會出現在牆上，但仍然計入「合作 N 家」。',
        },
      ],
      seed: () => SEED.map((p, i) => ({ ...p, d: !!p.d, sort: i })),
    },
    {
      name: 'banners',
      label: 'Banner',
      group: '內容',
      icon: 'image',
      kind: 'content',
      intro: '課程頁最上方的滿版輪播。沒有任何一張啟用時，前台那一區會整個收起來。',
      titleField: 'alt',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'src', label: '圖片', type: 'image', required: true, help: '建議 2880×1152（前台顯示 1440×576 的兩倍）' },
        { name: 'alt', label: '圖片說明', type: 'text', required: true, listed: true, help: '看不到圖的人會讀到這句，也給搜尋引擎看。' },
        { name: 'href', label: '點擊連結', type: 'url', help: '留空就不可點。' },
        {
          name: 'page', label: '放在哪一頁', type: 'select', listed: true, default: 'courses', options: [
            { value: 'courses', label: '課程頁' },
            { value: 'home', label: '首頁' },
          ],
        },
        { name: 'active', label: '啟用', type: 'boolean', default: true, listed: true },
      ],
    },
  ],
};
export default mod;
