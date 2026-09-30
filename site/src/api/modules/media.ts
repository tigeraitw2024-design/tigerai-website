import type { Module } from '../schema/types';

/**
 * 檔案庫。所有圖片欄位、檔案欄位指到的都是這裡的一筆。
 *
 * 檔案本體放 R2，這張表只存「它在哪、多大、什麼型別、誰傳的」。
 * 這樣做的理由是：同一張圖被五個地方用到時，換圖只要換一次；
 * 而且刪圖前可以先查出來「還有誰在用」，不會刪掉之後前台破圖。
 */
const mod: Module = {
  id: 'media',
  label: '檔案庫',
  about: '圖片與檔案。上傳一次，站上各處共用。',
  collections: [
    {
      name: 'media',
      label: '檔案庫',
      group: '系統',
      icon: 'image',
      kind: 'runtime',
      intro: '刪除前會先檢查還有沒有地方在用。正在被使用的檔案刪不掉。',
      titleField: 'name',
      canCreate: false,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'name', label: '檔名', type: 'text', required: true, listed: true },
        { name: 'key', label: '儲存路徑', type: 'text', readonly: true, indexed: true, unique: true },
        { name: 'url', label: '網址', type: 'text', readonly: true },
        { name: 'mime', label: '型別', type: 'text', readonly: true, listed: true },
        { name: 'size', label: '大小', type: 'number', readonly: true, listed: true },
        { name: 'width', label: '寬', type: 'number', readonly: true, width: 'half' },
        { name: 'height', label: '高', type: 'number', readonly: true, width: 'half' },
        {
          name: 'alt', label: '圖片說明', type: 'text',
          help: '看不到圖的人會讀到這句。裝飾性的圖片可以留空。',
        },
        { name: 'folder', label: '分類', type: 'text', listed: true, indexed: true },
        { name: 'uploadedBy', label: '上傳者', type: 'relation', relation: 'users', readonly: true },
      ],
    },
  ],
  routes: [
    'POST   /api/media/upload  上傳（multipart）',
    'DELETE /api/media/:id     刪除（會先檢查有沒有人在用）',
    'GET    /api/media/:id/raw 取檔（R2 沒接公開網域時的備援）',
  ],
};
export default mod;
