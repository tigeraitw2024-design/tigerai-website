import { getSettings } from '../content';

/**
 * 網站地圖。
 *
 * 用程式產生而不是手寫一份 XML，是因為手寫的那份一定會過期：
 * 加了一頁忘記加進去，Google 就永遠不知道有那一頁。
 *
 * 目前是把路徑列在下面。之後課程與文章有了自己的內頁，
 * 這裡再從 content 把 slug 撈出來加進去。
 */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/products', priority: '0.9', changefreq: 'monthly' },
  { path: '/products/tiger-gpu-pro', priority: '0.9', changefreq: 'monthly' },
  { path: '/courses', priority: '0.9', changefreq: 'weekly' },
  { path: '/consultants', priority: '0.8', changefreq: 'monthly' },
  { path: '/cases', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog', priority: '0.7', changefreq: 'weekly' },
  { path: '/resources', priority: '0.7', changefreq: 'monthly' },
  { path: '/legal/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/legal/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/legal/refund', priority: '0.3', changefreq: 'yearly' },
];

export async function GET({ site }: { site?: URL }) {
  const settings = await getSettings();
  // 後台設了「禁止搜尋引擎收錄」就給一份空的地圖，不要自打嘴巴：
  // robots.txt 說不要收，sitemap 卻把每一頁都列出來。
  const noindex = settings?.noindex === true;

  const base = (site?.origin || 'https://tigerai.com.tw').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const urls = noindex
    ? ''
    : PAGES.map(
        (p) => `  <url>
    <loc>${base}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
      ).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
    { headers: { 'content-type': 'application/xml; charset=utf-8' } },
  );
}
