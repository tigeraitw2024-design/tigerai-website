import type { Module } from '../schema/types';
import { consultants as SEED } from '../../data/consultants';

/**
 * 顧問。首頁的頭像帶、顧問頁的輪播、課程的授課顧問都指到這裡。
 *
 * 三張圖各有用途，不要互相代替：
 *   avatar 圓形頭像（64px，會被裁圓）
 *   img    去背人像（滑到時從右邊滑進來的那張，必須是去背 PNG）
 *   card   卡片用的直式裁切
 */
const mod: Module = {
  id: 'consultants',
  label: '顧問',
  about: '顧問名單與照片。排序決定首頁頭像帶的順序。',
  collections: [
    {
      name: 'consultants',
      label: '顧問',
      group: '內容',
      icon: 'users',
      kind: 'content',
      intro: '去背人像請用透明背景的 PNG，不然滑過去會出現一個白方塊。',
      titleField: 'zh',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'zh', label: '中文姓名', type: 'text', required: true, listed: true, width: 'half' },
        { name: 'en', label: '英文名', type: 'text', listed: true, width: 'half' },
        { name: 'title', label: '職稱', type: 'text', required: true, listed: true, maxLength: 40 },
        { name: 'course', label: '主授課程', type: 'text', maxLength: 60, help: '頭像帶上顯示的第三行。' },
        { name: 'avatar', label: '圓形頭像', type: 'image', help: '正方形，臉靠上，會被裁成圓形' },
        {
          name: 'img', label: '去背人像', type: 'image', required: true,
          help: '透明背景 PNG，全身或半身。解析度越高越好，前台會用到 780px 寬。',
        },
        { name: 'card', label: '卡片照', type: 'image', help: '直式裁切，顧問頁輪播用' },
        { name: 'bio', label: '簡介', type: 'richtext' },
        { name: 'students', label: '累計學員數', type: 'number', width: 'half' },
        {
          name: 'social', label: '社群', type: 'array', of: [
            {
              name: 'platform', label: '平台', type: 'select', width: 'half', options: [
                { value: 'facebook', label: 'Facebook' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'threads', label: 'Threads' },
              ],
            },
            { name: 'url', label: '連結', type: 'url', width: 'half' },
            {
              name: 'followers', label: '追蹤數', type: 'number', width: 'half',
              help: '前台目前顯示的是示意數字，填了才會用真的。',
            },
          ],
        },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'published', options: [
            { value: 'draft', label: '草稿' },
            { value: 'published', label: '已發布' },
          ],
        },
      ],
      seed: () => SEED.map((c, i) => ({ ...c, sort: i, status: 'published' })),
    },
  ],
};
export default mod;
