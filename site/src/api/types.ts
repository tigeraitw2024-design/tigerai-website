import type { AdminUser } from './auth';

/**
 * Worker 的環境。
 *
 * 有問號的都是選用的：沒設定的話對應的功能會用預設實作（寄信只印出來、
 * 金流只記單、檔案存記憶體）。這是刻意的——少設一個變數應該是「那個功能
 * 退回陽春版」，不該是「整個站掛掉」。
 *
 * 秘密（金鑰、密碼）一律用 `npx wrangler secret put`，不要寫進 wrangler.jsonc。
 * wrangler.jsonc 會進 git，而這個 repo 是公開的。
 */
export type Env = {
  DB: D1Database;
  MEDIA?: R2Bucket;

  /** 靜態檔案。正常情況 Worker 不會用到它（靜態檔在 Worker 之前就發掉了），
   *  留著是為了設定被改動時還有一條退路。 */
  ASSETS?: Fetcher;

  /** R2 接了自訂網域就填，沒填就由 Worker 轉檔出去 */
  MEDIA_PUBLIC_BASE?: string;

  /** console | resend | smtp-relay */
  MAIL_PROVIDER?: string;
  MAIL_FROM?: string;
  /** 內部通知信要寄給誰，逗號分隔 */
  MAIL_INTERNAL_TO?: string;
  RESEND_API_KEY?: string;
  SMTP_RELAY_URL?: string;
  SMTP_RELAY_TOKEN?: string;

  /** none | ecpay */
  PAYMENT_PROVIDER?: string;
  ECPAY_MERCHANT_ID?: string;
  ECPAY_HASH_KEY?: string;
  ECPAY_HASH_IV?: string;

  /** 站台網址，信件裡的連結要用 */
  SITE_URL?: string;

  /**
   * 第一次建立 owner 帳號用的一次性密語。
   * 用過就該從 Cloudflare 上刪掉——留著等於多一把備用鑰匙。
   */
  BOOTSTRAP_SECRET?: string;

  /**
   * 按「發布到前台」時要打的網址。
   * Cloudflare 的 Deploy Hook 或 GitHub Actions 的觸發網址都可以。
   * 沒設定的話後台會告訴你「還沒設定自動發布」，而不是假裝成功。
   */
  DEPLOY_HOOK_URL?: string;
};

export type Ctx = {
  Bindings: Env;
  Variables: {
    admin?: AdminUser;
    memberId?: string;
  };
};
