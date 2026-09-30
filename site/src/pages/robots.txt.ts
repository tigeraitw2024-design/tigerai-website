import { getSettings } from '../content';

/**
 * robots.txt。
 *
 * 後台的「禁止搜尋引擎收錄」打開時，這裡會變成擋全部——上線前用得到，
 * 而且比記得去改一個檔案可靠。上線後記得關掉，不然 Google 永遠找不到這個站。
 *
 * /admin 和 /api 永遠擋掉。這不是安全機制（擋不住惡意的人），
 * 只是不要讓後台登入頁出現在搜尋結果裡。真正的保護是登入與權限。
 */
export async function GET({ site }: { site?: URL }) {
  const settings = await getSettings();
  const base = (site?.origin || 'https://tigerai.com.tw').replace(/\/$/, '');

  const body = settings?.noindex === true
    ? `# 後台設定為「禁止搜尋引擎收錄」。上線後記得到全站設定關掉。
User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`;

  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
