import type { Module } from '../schema/types';
import { depts as DEPT_SEED } from '../../data/depts';

/**
 * 案例。兩種：
 *   cases      對外的成效卡（案例頁、首頁案例區）
 *   dept_cases 13 部門的痛點／解方／成效（首頁那個可展開的清單）
 *
 * 全站規則：客戶名稱一律不出現。所以這裡刻意沒有「客戶名稱」欄位——
 * 不是忘了加，是加了就會有人填。要記錄是哪一家，寫在只有後台看得到的
 * 「內部備註」。
 */
const mod: Module = {
  id: 'cases',
  label: '案例',
  about: '對外的成效數字與 13 部門案例。客戶名稱一律不出現在前台。',
  collections: [
    {
      name: 'cases',
      label: '案例',
      group: '內容',
      icon: 'trending-up',
      kind: 'content',
      intro: '每張卡就是「產業・痛點・方案・成果數字」。形容詞不算證據，請寫可以驗證的數字。',
      titleField: 'industry',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        {
          name: 'n', label: '成果數字', type: 'text', required: true, listed: true, maxLength: 24,
          help: '卡片上最大的那行字，例如「半天 → 3 秒」「月省 96 小時」',
        },
        {
          name: 'industry', label: '產業・情境', type: 'text', required: true, listed: true, maxLength: 40,
          help: '例如「製造業・報價單比對」',
        },
        {
          name: 'mode', label: '模式', type: 'text', required: true, maxLength: 60,
          help: '用了什麼做法，例如「模式：RAG 檢索＋Workflow 比對」',
        },
        { name: 'detail', label: '詳細說明', type: 'richtext' },
        {
          name: 'internalNote', label: '內部備註', type: 'textarea', pii: true,
          help: '是哪一家客戶、聯絡窗口等。只有後台看得到，永遠不會輸出到前台。',
        },
        {
          name: 'status', label: '狀態', type: 'select', listed: true, default: 'published', options: [
            { value: 'draft', label: '草稿' },
            { value: 'published', label: '已發布' },
          ],
        },
      ],
    },
    {
      name: 'dept_cases',
      label: '部門案例',
      group: '內容',
      icon: 'layout-list',
      kind: 'content',
      intro: '首頁那個可以一列一列展開的清單。順序就是前台的順序。',
      titleField: 'd',
      sortable: true,
      canCreate: true,
      canDelete: true,
      read: 'viewer',
      write: 'editor',
      fields: [
        { name: 'd', label: '部門', type: 'text', required: true, listed: true, width: 'half', maxLength: 12 },
        { name: 's', label: '情境', type: 'text', required: true, listed: true, width: 'half', maxLength: 20 },
        {
          name: 'k', label: '成效數字', type: 'text', required: true, listed: true, maxLength: 20,
          help: '展開前就看得到的那個數字，例如「月省 96 小時」',
        },
        { name: 'p', label: '痛點', type: 'textarea', required: true, maxLength: 60 },
        { name: 'f', label: '解方', type: 'textarea', required: true, maxLength: 60 },
        { name: 'r', label: '成效', type: 'textarea', required: true, maxLength: 60 },
      ],
      seed: () => DEPT_SEED.map((x, i) => ({ ...x, sort: i })),
    },
  ],
};
export default mod;
