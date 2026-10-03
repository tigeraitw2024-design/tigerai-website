import { consultants as LOCAL_CONSULTANTS, type Consultant } from '../data/consultants';
import { depts as LOCAL_DEPTS, type DeptCase } from '../data/depts';
import { flows as LOCAL_FLOWS, type Flow } from '../data/flows';
import { partners as LOCAL_PARTNERS, type Partner } from '../data/partners';

/**
 * 建置時的內容來源。
 *
 * 前台是靜態的（output: 'static'），所以內容是在 `npm run build` 的時候
 * 就烤進 HTML 的，不是訪客打開網頁時去資料庫拿的。這是這個站能對上原型
 * 0.00%、又不吃 Cloudflare 免費方案運算額度的原因。
 *
 * ── 兩個來源，一個介面 ────────────────────────────────────────
 *
 *   設了 CONTENT_API  →  去後台的 /api/content 抓，用 Robin 在後台改的內容
 *   沒設              →  用 src/data/*.ts，也就是現在站上跑的那份
 *
 * 那條退路是刻意留的，而且很重要：
 *   資料庫還沒開、網路不通、在別人的電腦上、CI 拿不到 API——
 *   這些情況下站都要建得起來，而且建出來要跟現在一模一樣。
 *   內容系統壞掉的時候，網站不該跟著壞掉。
 *
 * 也因為這樣，像素驗證（tools/verify.mjs）不會因為接了後台而失準：
 * 驗證是在沒有 CONTENT_API 的情況下跑的，走的永遠是本地那份。
 *
 * ── 用法 ──────────────────────────────────────────────────────
 *   CONTENT_API=https://tigerai-website.xxx.workers.dev npm run build
 */

const API = (globalThis as any).process?.env?.CONTENT_API || '';

/** 抓一次，整個建置共用。十幾個頁面各抓一次是白白多十幾個往返。 */
let cache: Record<string, any[]> | null = null;
let announced = false;

async function fetchAll(): Promise<Record<string, any[]>> {
  if (cache) return cache;
  if (!API) {
    if (!announced) {
      console.log('[content] 沒有設定 CONTENT_API，使用 src/data 的本地內容。');
      announced = true;
    }
    cache = {};
    return cache;
  }
  try {
    const r = await fetch(`${API.replace(/\/$/, '')}/api/content`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    cache = (await r.json()) as Record<string, any[]>;
    const counts = Object.entries(cache)
      .filter(([, v]) => v.length)
      .map(([k, v]) => `${k} ${v.length}`)
      .join('　');
    console.log(`[content] 從 ${API} 取得內容：${counts || '（都是空的）'}`);
  } catch (e: any) {
    // 抓不到就退回本地，但要大聲說出來。
    // 靜靜地退回去的話，Robin 會以為改的東西發布了，其實前台還是舊的。
    console.warn(`[content] ⚠ 連不上 ${API}（${e?.message || e}），這次建置用的是 src/data 的本地內容。`);
    cache = {};
  }
  return cache;
}

/** 後台有資料就用後台的，沒有就用本地那份 */
async function pick<T>(name: string, local: T[], map: (row: any) => T): Promise<T[]> {
  const all = await fetchAll();
  const rows = all[name];
  if (!rows?.length) return local;
  return rows.map(map);
}

// ── 各集合 ──────────────────────────────────────────────────────
//
// map 的工作是把後台那筆（欄位名跟 schema 一致）轉成前台元件本來吃的形狀。
// 兩邊欄位名刻意取成一樣，所以多數情況就是原樣傳過去，
// 但還是留著這一層——之後改了 schema，要改的是這裡，不是十幾個頁面。

export const getConsultants = () =>
  pick<Consultant>('consultants', LOCAL_CONSULTANTS, (r) => ({
    img: r.img || '',
    zh: r.zh || '',
    en: r.en || '',
    title: r.title || '',
    course: r.course || '',
    avatar: r.avatar || '',
    card: r.card || '',
  }));

export const getPartners = () =>
  pick<Partner>('partners', LOCAL_PARTNERS, (r) => ({
    s: r.s || '',
    a: r.a || '',
    // 後台存的是布林，原型的資料是 0/1，前台判斷用的是真假值，兩種都通
    d: r.d ? 1 : 0,
  }));

export const getDepts = () =>
  pick<DeptCase>('dept_cases', LOCAL_DEPTS, (r) => ({
    d: r.d || '',
    s: r.s || '',
    k: r.k || '',
    p: r.p || '',
    f: r.f || '',
    r: r.r || '',
  }));

export const getFlows = () =>
  pick<Flow>('workflows', LOCAL_FLOWS, (r) => ({
    name: r.name || '',
    nodes: Array.isArray(r.nodes) ? r.nodes : [],
    notes: Array.isArray(r.notes) ? r.notes : [],
    conns: Array.isArray(r.conns) ? r.conns : [],
  }));

/**
 * 只有一筆的集合（首頁文案、全站設定）。
 * 後台沒有資料時回 null，呼叫端就用自己寫死的預設值——
 * 也就是現在站上那份文案。
 */
async function single(name: string): Promise<Record<string, any> | null> {
  const all = await fetchAll();
  return all[name]?.[0] ?? null;
}

export const getHome = () => single('home');
export const getSettings = () => single('settings');

/**
 * 取一個欄位，後台沒填就用原本寫死的那個值。
 *
 * 這是把「後台可以改」接到現有頁面上最不傷的方式：
 *   <h2>{pickText(home, 'shadowTitle', '錢和資料，正在一起流出去。')}</h2>
 * 沒有後台的時候，渲染結果跟原本一字不差，像素驗證照樣是 0.00%。
 */
export function text(rec: Record<string, any> | null, key: string, fallback: string): string {
  const v = rec?.[key];
  return v === undefined || v === null || v === '' ? fallback : String(v);
}

export function num(rec: Record<string, any> | null, key: string, fallback: number): number {
  const v = Number(rec?.[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function list<T>(rec: Record<string, any> | null, key: string, fallback: T[]): T[] {
  const v = rec?.[key];
  return Array.isArray(v) && v.length ? (v as T[]) : fallback;
}

/**
 * 課程。跟其他集合不一樣：這裡**沒有本地備援**，後台沒課就是空陣列。
 *
 * 因為課程頁的示意卡是寫死在頁面裡的（原型那三張），
 * 有後台資料就用後台的、沒有就用頁面自己那份，判斷在 courses.astro。
 * 在這裡硬塞一份假課程進去，反而會讓「有沒有真的接上後台」看不出來。
 */
export type CourseCard = {
  id: string;
  title: string;
  slug: string;
  level: string;
  hours: number;
  summary: string;
  price: number;
  memberPrice: number;
  subsidy: boolean;
  subsidyNote: string;
  students: number;
};

export async function getCourses(): Promise<CourseCard[]> {
  const all = await fetchAll();
  return (all.courses || []).map((r: any) => ({
    id: String(r.id),
    title: r.title || '',
    slug: r.slug || '',
    level: r.level || '',
    hours: Number(r.hours) || 0,
    summary: r.summary || '',
    price: Number(r.price) || 0,
    memberPrice: Number(r.memberPrice) || 0,
    subsidy: !!r.subsidy,
    subsidyNote: r.subsidyNote || '',
    students: Number(r.students) || 0,
  }));
}

/** 產品線。後台沒資料就回空陣列，由頁面決定要不要用自己寫死的那份。 */
export type ProductCard = {
  id: string; eyebrow: string; title: string; slug: string; body: string;
  audience: string; price: number; buyable: boolean;
};
export async function getProducts(): Promise<ProductCard[]> {
  const all = await fetchAll();
  return (all.products || []).map((r: any) => ({
    id: String(r.id), eyebrow: r.eyebrow || '', title: r.title || '', slug: r.slug || '',
    body: r.body || '', audience: r.audience || 'all',
    price: Number(r.price) || 0, buyable: !!r.buyable,
  }));
}

/** 案例成效卡。內部備註在 /api/content 那一層就被濾掉了，拿不到。 */
export type CaseCard = { id: string; n: string; industry: string; mode: string; detail: string };
export async function getCases(): Promise<CaseCard[]> {
  const all = await fetchAll();
  return (all.cases || []).map((r: any) => ({
    id: String(r.id), n: r.n || '', industry: r.industry || '', mode: r.mode || '', detail: r.detail || '',
  }));
}

/** 課程頁最上面的滿版 Banner。只回啟用中、而且是放這一頁的。 */
export type BannerItem = { id: string; src: string; alt: string; href: string };
export async function getBanners(page: 'courses' | 'home' = 'courses'): Promise<BannerItem[]> {
  const all = await fetchAll();
  return (all.banners || [])
    .filter((r: any) => r.active !== false && (r.page || 'courses') === page)
    .map((r: any) => ({ id: String(r.id), src: r.src || '', alt: r.alt || '', href: r.href || '' }));
}

/** 文章。 */
export type PostCard = {
  id: string; title: string; slug: string; excerpt: string; cover: string;
  category: string; publishedAt: string;
};
export async function getPosts(): Promise<PostCard[]> {
  const all = await fetchAll();
  return (all.posts || [])
    .map((r: any) => ({
      id: String(r.id), title: r.title || '', slug: r.slug || '', excerpt: r.excerpt || '',
      cover: r.cover || '', category: r.category || 'note', publishedAt: r.publishedAt || '',
    }))
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

/** 下載資源。 */
export type ResourceCard = {
  id: string; title: string; slug: string; summary: string; cover: string;
  kind: string; gated: boolean;
};
export async function getResources(): Promise<ResourceCard[]> {
  const all = await fetchAll();
  return (all.resources || []).map((r: any) => ({
    id: String(r.id), title: r.title || '', slug: r.slug || '', summary: r.summary || '',
    cover: r.cover || '', kind: r.kind || 'other', gated: r.gated !== false,
  }));
}

/**
 * 純文字的清單。
 *
 * 後台的陣列欄位每一列都是物件（例如 {text:'收到提問'}），但前台這幾個地方
 * 要的是單純的字串陣列。這個函式負責轉換，順便處理「後台沒填就用原本那份」。
 */
export function strings(rec: Record<string, any> | null, key: string, fallback: string[]): string[] {
  const v = rec?.[key];
  if (!Array.isArray(v) || !v.length) return fallback;
  const out = v.map((x) => (typeof x === 'string' ? x : String(x?.text ?? ''))).filter(Boolean);
  return out.length ? out : fallback;
}

/**
 * 某一頁的文案那一筆。
 *
 * 後台的「頁面文案」是一個集合、每頁一筆，所以這裡要先依 page 挑出來。
 * 找不到就回 null，呼叫端的 text()／list() 會自動退回寫死的預設值。
 */
export async function getPage(page: string): Promise<Record<string, any> | null> {
  const all = await fetchAll();
  return (all.page_blocks || []).find((r: any) => r.page === page) ?? null;
}

/**
 * 免費資源頁的影片牆。
 *
 * id 這個欄位對兩種來源的意思不一樣：YouTube 是影片代號（由 VideoWall 從
 * 後台貼的網址解析出來），檔案則直接就是那個網址。這樣前台只要看 kind
 * 決定用 iframe 還是 video，不用再分兩套資料結構。
 */
export type VideoItem = {
  id: string; title: string; kind: 'youtube' | 'file'; poster: string; note: string;
};
export async function getVideos(): Promise<VideoItem[]> {
  const all = await fetchAll();
  return (all.videos || []).map((r: any) => ({
    id: String(r.url || ''),
    title: r.title || '',
    kind: r.kind === 'file' ? 'file' : 'youtube',
    poster: r.poster || '',
    note: r.note || '',
  }));
}
