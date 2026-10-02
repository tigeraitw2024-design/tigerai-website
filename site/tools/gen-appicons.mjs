// 從 simple-icons 挑一組圖示，產生 src/data/app-icons.ts。
//
// 只取圖形路徑（一條 path），不取顏色——背景是 10% 透明度的單色，用不到品牌色，
// 而且單色比彩色更不像在「展示合作關係」，比較接近純裝飾。
//
// 選的原則：AI 工具 ＋ 企業每天在用的 App。跟虎智的故事對得上
// （「這些工具你都在用，但資料都出去了」）。
//
// 用法：node tools/gen-appicons.mjs
import { writeFile } from 'node:fs/promises';
import * as si from 'simple-icons';

const PICK = [
  // AI
  'siClaude', 'siGooglegemini', 'siPerplexity', 'siOllama', 'siHuggingface',
  // 自動化與開發
  'siN8n', 'siZapier', 'siGithub', 'siDocker', 'siVercel', 'siCloudflare',
  // 協作與文件
  'siNotion', 'siObsidian', 'siMiro', 'siFigma', 'siConfluence', 'siJira',
  'siTrello', 'siAsana', 'siClickup', 'siTodoist', 'siEvernote', 'siAirtable',
  // 溝通
  'siLine', 'siDiscord', 'siTelegram', 'siWhatsapp', 'siZoom', 'siGmail',
  // 生意
  'siShopify', 'siStripe', 'siHubspot', 'siMailchimp', 'siZendesk', 'siIntercom',
  'siCalendly', 'siGoogledrive', 'siDropbox', 'siWordpress', 'siWebflow',
  'siYoutube', 'siInstagram', 'siFacebook', 'siSpotify',
];

const rows = [];
const missing = [];
for (const k of PICK) {
  const ic = si[k];
  if (!ic) { missing.push(k); continue; }
  rows.push({ slug: k.replace(/^si/, '').toLowerCase(), title: ic.title, path: ic.path });
}

const body = `// 這個檔是 node tools/gen-appicons.mjs 從 simple-icons 產生的，不要手改。
//
// 用途：Tiger GPU Pro 那一條黑底後面流動的裝飾圖示。
//
// 只存圖形路徑，不存品牌色——背景是 10% 透明度的單色，用不到顏色，
// 而且單色比彩色更接近純裝飾，不會看起來像在宣稱合作關係。
//
// 授權：圖檔來自 Simple Icons（CC0，可自由使用）。但圖案本身仍是各公司的
// 註冊商標，這裡只當低透明度的背景裝飾，不作為背書或合作關係的宣稱。
// 要換掉哪一個，到後台「首頁文案 → ④b 背景圖示」勾選。
//
// 產生時間：${new Date().toISOString()}
// 共 ${rows.length} 個

export type AppIcon = { slug: string; title: string; path: string };

export const appIcons: AppIcon[] = ${JSON.stringify(rows, null, 2)};

export const appIconBySlug = (slug: string) => appIcons.find((i) => i.slug === slug);
`;

await writeFile('src/data/app-icons.ts', body, 'utf8');
console.log(`產生 ${rows.length} 個圖示 → src/data/app-icons.ts`);
if (missing.length) console.log('找不到（已跳過）：', missing.join('、'));
console.log('清單：', rows.map((r) => r.title).join('、'));
