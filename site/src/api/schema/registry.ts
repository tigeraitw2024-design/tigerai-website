import type { Collection, Module, Role } from './types';
import { RANK } from './types';

import bookings from '../modules/bookings';
import cases from '../modules/cases';
import consultants from '../modules/consultants';
import courses from '../modules/courses';
import home from '../modules/home';
import leads from '../modules/leads';
import media from '../modules/media';
import members from '../modules/members';
import orders from '../modules/orders';
import pages from '../modules/pages';
import partners from '../modules/partners';
import posts from '../modules/posts';
import products from '../modules/products';
import resources from '../modules/resources';
import settings from '../modules/settings';
import users from '../modules/users';
import workflows from '../modules/workflows';

/**
 * 功能元件清單。
 *
 * 新增一個功能 = 在 modules/ 底下寫一個檔，然後在這裡加一行 import。
 * 就這樣。不用改後台介面、不用改 API、不用寫 SQL、不用改側欄。
 *
 * 移除一個功能 = 刪掉那一行和那個檔。資料表會留著（不自動砍資料，
 * 砍錯就沒了），要清掉再自己下 SQL。
 *
 * 順序就是後台側欄的順序，所以是照「平常最常點什麼」排的，
 * 不是照字母。
 */
export const MODULES: Module[] = [
  home,
  pages,
  courses,
  products,
  consultants,
  cases,
  workflows,
  posts,
  resources,
  partners,
  bookings,
  leads,
  members,
  orders,
  media,
  users,
  settings,
];

/** 所有集合，攤平成一個查表用的物件 */
export const COLLECTIONS: Record<string, Collection> = Object.fromEntries(
  MODULES.flatMap((m) => m.collections.map((c) => [c.name, c])),
);

export const COLLECTION_LIST: Collection[] = Object.values(COLLECTIONS);

export function getCollection(name: string): Collection | undefined {
  return COLLECTIONS[name];
}

/** 這個角色夠不夠讀／寫這個集合 */
export function canRead(c: Collection, role: Role) {
  return RANK[role] >= RANK[c.read];
}
export function canWrite(c: Collection, role: Role) {
  return RANK[role] >= RANK[c.write];
}

/**
 * 能不能看到未遮罩的個資。
 *
 * editor 刻意不在名單裡：Robin 的要求是同事能改網站內容，但看不到客戶個資。
 * viewer 也不行，viewer 是「全部唯讀」，唯讀不等於可以看個資。
 */
export function canSeePII(role: Role) {
  return role === 'owner' || role === 'sales';
}

/**
 * 這個角色在後台側欄看得到哪些集合。
 *
 * 看不到的集合不只是側欄不畫，是 API 也會擋——不然打開瀏覽器主控台
 * 直接 fetch 就繞過去了。
 */
export function visibleCollections(role: Role): Collection[] {
  return COLLECTION_LIST.filter((c) => canRead(c, role));
}
