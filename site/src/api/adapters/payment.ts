/**
 * 金流。
 *
 * Robin 的指示：購物車和結帳全部做完，金流先留接口，之後拿到綠界的 API 再接。
 * 所以這個檔案的重點不是「現在能不能收錢」，而是「之後接上的時候，
 * 訂單、購物車、會員、寄信有沒有任何一行要改」。答案是沒有。
 *
 * 接上綠界要做的事只有三件：
 *   1. 把下面 ecpay 的三個 TODO 填掉（官方文件會給參數表與檢查碼算法）
 *   2. 在 Cloudflare 設 ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV
 *   3. 把環境變數 PAYMENT_PROVIDER 改成 ecpay
 */

export type OrderForPayment = {
  code: string;
  total: number;        // 單位是分
  itemsSummary: string;
  buyerEmail: string;
  buyerName: string;
};

export type PaymentStart =
  | { kind: 'none'; message: string }
  | { kind: 'redirect'; url: string }
  | { kind: 'form'; action: string; fields: Record<string, string> };

export type PaymentCallback = {
  ok: boolean;
  orderCode: string;
  providerRef: string;
  raw: unknown;
};

export type PaymentProvider = {
  id: string;
  label: string;
  /** 開始付款。回傳要叫前台做什麼。 */
  start(order: OrderForPayment, env: any): Promise<PaymentStart>;
  /** 金流打回來的通知。要在這裡驗章，確認真的是金流商送的。 */
  handleCallback(req: Request, env: any): Promise<PaymentCallback>;
};

/**
 * 只記單，不收款。
 *
 * 這不是「假的金流」，是一個真的營運模式：客戶下單 → 你收到通知 →
 * 你用匯款或當面收款 → 到後台把訂單標成已付款 → 系統發上課資格。
 * B2B 的課程與硬體本來很多就是這樣收的，所以就算之後接了綠界，
 * 這個選項也應該留著。
 */
const none: PaymentProvider = {
  id: 'none',
  label: '只記單不收款（匯款或當面收）',
  async start(order) {
    return {
      kind: 'none',
      message: `訂單 ${order.code} 已成立。我們會盡快與您聯繫確認付款方式。`,
    };
  },
  async handleCallback() {
    throw new Error('這個金流方式沒有回呼');
  },
};

/**
 * 綠界 ECPay。
 *
 * 目前是還沒填完的骨架：流程、型別、呼叫位置都已經定好，
 * 缺的只是官方的參數表與檢查碼算法。刻意不用猜的——金流參數猜錯的後果是
 * 收不到錢或對不到帳，那種東西要照著文件寫。
 */
const ecpay: PaymentProvider = {
  id: 'ecpay',
  label: '綠界 ECPay',
  async start(order, env) {
    if (!env.ECPAY_MERCHANT_ID) throw new Error('還沒設定綠界的商店代號');
    // TODO 接上綠界時填這裡：
    //   1. 依官方參數表組出 AioCheckOut 的欄位
    //   2. 用 HASH_KEY / HASH_IV 算 CheckMacValue
    //   3. 回傳 { kind:'form', action: 官方付款網址, fields }
    //      前台收到 form 就自己組一個 <form> 送出去
    throw new Error('綠界尚未接上：請先填完 adapters/payment.ts 的 ecpay.start');
  },
  async handleCallback(req, env) {
    // TODO 接上綠界時填這裡：
    //   1. 解析 application/x-www-form-urlencoded
    //   2. 重算 CheckMacValue 並比對——沒驗章的回呼等於任何人都能把訂單標成已付款
    //   3. 回傳 { ok, orderCode: MerchantTradeNo, providerRef: TradeNo, raw }
    throw new Error('綠界尚未接上：請先填完 adapters/payment.ts 的 ecpay.handleCallback');
  },
};

const providers: Record<string, PaymentProvider> = { none, ecpay };

export function getPayment(env: any): PaymentProvider {
  return providers[env.PAYMENT_PROVIDER || 'none'] || none;
}

export function listPayments() {
  return Object.values(providers).map((p) => ({ id: p.id, label: p.label }));
}

/** 金額一律用分存整數。顯示的時候才換算，而且只在這一個地方換算。 */
export const toDisplay = (cents: number) =>
  'NT$ ' + Math.round(cents / 100).toLocaleString('zh-TW');
