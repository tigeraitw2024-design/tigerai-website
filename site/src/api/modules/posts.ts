import type { Module } from '../schema/types';

/**
 * 部落格文章。
 *
 * 沒有做留言。留言要擋垃圾訊息、要審核、要處理檢舉，那是另一個工程，
 * 而且目前站上沒有這個需求。之後要加，就是在這裡多一個 collection。
 */
const mod: Module = {
  id: 'posts',
  label: '文章',
  about: '部落格。寫完按發布，前台重新建置後上線。',
  collections: [
    {
      name: 'posts',
      label: '文章',
      group: '內容',
      icon: 'newspaper',
      kind: 'content',
      intro: '網址代號上線後不要再改，改了別人存的連結就失效了。',
      titleField: 'title',
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'title', label: '標題', type: 'text', required: true, listed: true, maxLength: 80 },
        { name: 'slug', label: '網址代號', type: 'slug', required: true, unique: true, indexed: true },
        {
          name: 'excerpt', label: '摘要', type: 'textarea', maxLength: 160,
          help: '文章列表與分享到社群時顯示的那段。留空會自動抓內文開頭。',
        },
        { name: 'cover', label: '封面圖', type: 'image' },
        { name: 'body', label: '內文', type: 'richtext', required: true },
        {
          name: 'category', label: '分類', type: 'select', listed: true, default: 'note', options: [
            { value: 'note', label: '觀點' },
            { value: 'howto', label: '教學' },
            { value: 'case', label: '案例側寫' },
            { value: 'news', label: '公司消息' },
          ],
        },
        { name: 'tags', label: '標籤', type: 'multiselect', options: [], help: '輸入後按 Enter 新增' },
        { name: 'author', label: '作者', type: 'relation', relation: 'consultants' },
        { name: 'publishedAt', label: '發布日期', type: 'date', listed: true, indexed: true },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'draft', options: [
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
