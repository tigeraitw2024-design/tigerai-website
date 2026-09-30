/**
 * 檔案儲存。
 *
 * 預設是 Cloudflare R2。換成別家（S3、公司自己的 NAS）就在下面多一個實作，
 * 呼叫端只認得 put / get / del 三個方法。
 *
 * R2 免費方案：10 GB 空間、每月 100 萬次寫、1000 萬次讀，而且**不收流量費**。
 * 對一個官網來說綽綽有餘，圖片放這裡比放在 git 裡好——git 裡的圖每次
 * clone 都要整份下載，而且改一次圖就多一份歷史。
 */

export type StoredFile = {
  key: string;
  url: string;
  size: number;
  mime: string;
};

export type Storage = {
  id: string;
  put(key: string, body: ArrayBuffer, mime: string): Promise<StoredFile>;
  get(key: string): Promise<{ body: ReadableStream; mime: string } | null>;
  del(key: string): Promise<void>;
};

/**
 * 檔名處理。
 *
 * 直接用使用者上傳的檔名會出三種問題：中文檔名在網址上要編碼很醜、
 * 同名檔案會互相覆蓋、以及「../」這種東西可以跳出目錄。
 * 所以路徑是我們自己組的，原始檔名另外存在 media 表的 name 欄位。
 */
export function makeKey(folder: string, filename: string) {
  const ext = (filename.match(/\.[a-zA-Z0-9]{1,8}$/)?.[0] || '').toLowerCase();
  const safeFolder = (folder || 'misc').replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'misc';
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${safeFolder}/${ym}/${id}${ext}`;
}

/** 只收得住的型別。副檔名不算數，看的是實際的 MIME。 */
export const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml',
  'application/pdf', 'application/json', 'text/plain', 'text/csv',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export const MAX_UPLOAD = 20 * 1024 * 1024; // 20 MB

export function r2Storage(bucket: R2Bucket, publicBase?: string): Storage {
  return {
    id: 'r2',
    async put(key, body, mime) {
      await bucket.put(key, body, { httpMetadata: { contentType: mime } });
      return {
        key,
        // 接了自訂網域就直接給公開網址，沒接就走 Worker 轉出去
        url: publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : `/api/media/raw/${key}`,
        size: body.byteLength,
        mime,
      };
    },
    async get(key) {
      const o = await bucket.get(key);
      if (!o) return null;
      return { body: o.body as ReadableStream, mime: o.httpMetadata?.contentType || 'application/octet-stream' };
    },
    async del(key) {
      await bucket.delete(key);
    },
  };
}

/**
 * 記憶體版。只給本機測試用——Worker 一重啟就全沒了。
 * 有這個的用處是：還沒開 R2 之前，後台的上傳流程照樣可以點得通、驗得完。
 */
const mem = new Map<string, { body: ArrayBuffer; mime: string }>();
export const memoryStorage: Storage = {
  id: 'memory',
  async put(key, body, mime) {
    mem.set(key, { body, mime });
    return { key, url: `/api/media/raw/${key}`, size: body.byteLength, mime };
  },
  async get(key) {
    const o = mem.get(key);
    if (!o) return null;
    return { body: new Blob([o.body]).stream(), mime: o.mime };
  },
  async del(key) {
    mem.delete(key);
  },
};

export function getStorage(env: any): Storage {
  if (env.MEDIA) return r2Storage(env.MEDIA, env.MEDIA_PUBLIC_BASE);
  return memoryStorage;
}
