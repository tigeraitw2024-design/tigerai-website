// 全站導覽。原型用中文檔名互連（產品.dc.html），正式站換成乾淨網址。
// 對照表：
//   首頁.dc.html          → /
//   產品.dc.html          → /products
//   Tiger GPU Pro.dc.html → /products/tiger-gpu-pro
//   課程.dc.html          → /courses
//   顧問與方法論.dc.html   → /consultants
//   案例.dc.html          → /cases
//   部落格.dc.html        → /blog
//   免費資源.dc.html      → /resources

export type NavKey = 'products' | 'courses' | 'consultants' | 'cases' | 'blog' | 'resources';

export type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  /** 有 children 的會變成 hover 下拉（目前只有「產品」） */
  children?: { label: string; href: string }[];
};

export const NAV: NavItem[] = [
  {
    key: 'products',
    label: '產品',
    href: '/products',
    children: [
      { label: '全部產品', href: '/products' },
      { label: 'Tiger GPU Pro', href: '/products/tiger-gpu-pro' },
    ],
  },
  { key: 'courses', label: '課程', href: '/courses' },
  { key: 'consultants', label: '顧問與方法論', href: '/consultants' },
  { key: 'cases', label: '案例', href: '/cases' },
  { key: 'blog', label: '部落格', href: '/blog' },
  { key: 'resources', label: '免費資源', href: '/resources' },
];

/** 頂欄主 CTA。全站每一頁都指到首頁的預約區。 */
export const CTA = { label: '預約 30 分鐘諮詢', href: '/#contact' };
