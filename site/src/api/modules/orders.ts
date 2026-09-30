import type { Module } from '../schema/types';

/**
 * 購物車與訂單。
 *
 * Robin 的指示：購物車和結帳流程全部做完，金流先留接口，
 * 之後他拿到綠界的 API 再接上。所以這裡的設計是：
 *
 *   下單 → 建立訂單（狀態 pending）→ 交給金流轉接器 → 回來標記付款
 *                                      ↑
 *                          現在是 none：直接標記成「待匯款」
 *                          之後換成 ecpay：導去綠界付款頁
 *
 * 換金流只要換 adapters/payment 底下的實作和一個環境變數，
 * 訂單、購物車、會員、寄信全部不用動。
 *
 * 金額一律用「分」存整數。用浮點數存錢，加總幾次之後就會出現
 * 1499.9999999998 這種數字，對帳時很難解釋。
 */
const mod: Module = {
  id: 'orders',
  label: '訂單',
  about: '購物車、訂單、付款狀態、折扣碼。金流目前是「只記單不收款」。',
  collections: [
    {
      name: 'orders',
      label: '訂單',
      group: '生意',
      icon: 'receipt',
      kind: 'runtime',
      intro: '目前金流是「只記單不收款」：客戶下單後你會收到通知，收款與開課資格由你手動確認。',
      titleField: 'code',
      canCreate: false,
      canDelete: false,
      read: 'sales',
      write: 'sales',
      fields: [
        { name: 'code', label: '訂單編號', type: 'text', readonly: true, unique: true, indexed: true, listed: true },
        { name: 'member', label: '會員', type: 'relation', relation: 'members', indexed: true, listed: true },
        { name: 'buyerName', label: '訂購人', type: 'text', required: true, listed: true, pii: true },
        { name: 'buyerEmail', label: 'Email', type: 'email', required: true, indexed: true, pii: true },
        { name: 'buyerPhone', label: '電話', type: 'tel', pii: true },
        {
          name: 'items', label: '品項', type: 'array', readonly: true, of: [
            { name: 'kind', label: '類型', type: 'text', width: 'third' },
            { name: 'refId', label: '對應 id', type: 'text', width: 'third' },
            { name: 'title', label: '名稱', type: 'text' },
            { name: 'unitPrice', label: '單價', type: 'money', width: 'third' },
            { name: 'qty', label: '數量', type: 'number', width: 'third' },
          ],
        },
        { name: 'subtotal', label: '小計', type: 'money', readonly: true },
        { name: 'discount', label: '折扣', type: 'money', readonly: true },
        { name: 'total', label: '應付總額', type: 'money', readonly: true, listed: true },
        { name: 'coupon', label: '折扣碼', type: 'relation', relation: 'coupons', readonly: true },
        {
          name: 'invoiceType', label: '發票', type: 'select', default: 'personal', options: [
            { value: 'personal', label: '個人（二聯）' },
            { value: 'company', label: '公司（三聯）' },
            { value: 'donate', label: '捐贈' },
          ],
        },
        { name: 'invoiceTaxId', label: '統一編號', type: 'text', maxLength: 8, pii: true },
        { name: 'invoiceTitle', label: '發票抬頭', type: 'text', pii: true },
        {
          name: 'state', label: '訂單狀態', type: 'select', listed: true, default: 'pending', options: [
            { value: 'pending', label: '待付款' },
            { value: 'paid', label: '已付款' },
            { value: 'cancelled', label: '已取消' },
            { value: 'refunded', label: '已退款' },
            { value: 'failed', label: '付款失敗' },
          ],
        },
        {
          name: 'paymentProvider', label: '金流', type: 'text', readonly: true,
          help: '這筆單是用哪一家金流建立的。換金流之後舊單還看得出來。',
        },
        { name: 'paymentRef', label: '金流交易編號', type: 'text', readonly: true },
        { name: 'paidAt', label: '付款時間', type: 'datetime', readonly: true, listed: true },
        { name: 'internalNote', label: '內部備註', type: 'textarea', pii: true },
      ],
    },
    {
      name: 'coupons',
      label: '折扣碼',
      group: '生意',
      icon: 'tag',
      kind: 'runtime',
      intro: '折扣碼不分大小寫。設了使用上限之後，用完會自動失效。',
      titleField: 'code',
      canCreate: true,
      canDelete: true,
      read: 'sales',
      write: 'sales',
      fields: [
        {
          name: 'code', label: '折扣碼', type: 'text', required: true, unique: true, indexed: true, listed: true,
          help: '建議用英數字，不要用容易看錯的 0 和 O、1 和 l。',
        },
        { name: 'label', label: '用途說明', type: 'text', listed: true, help: '這張碼是發給誰的，方便日後對帳。' },
        {
          name: 'kind', label: '折扣方式', type: 'select', required: true, listed: true, default: 'percent', options: [
            { value: 'percent', label: '打折（百分比）' },
            { value: 'fixed', label: '折抵固定金額' },
          ],
        },
        {
          name: 'value', label: '折扣值', type: 'number', required: true, listed: true,
          help: '打折填 10 代表折 10%（付 90%）；折抵固定金額就填金額。',
        },
        { name: 'minTotal', label: '最低消費', type: 'money', help: '訂單沒到這個金額不能用。0 表示不限。' },
        { name: 'startAt', label: '開始時間', type: 'datetime', width: 'half' },
        { name: 'endAt', label: '結束時間', type: 'datetime', width: 'half' },
        { name: 'maxUses', label: '可用次數', type: 'number', width: 'half', help: '0 表示不限次數。' },
        { name: 'used', label: '已使用', type: 'number', readonly: true, width: 'half', listed: true },
        { name: 'active', label: '啟用', type: 'boolean', default: true, listed: true },
      ],
    },
  ],
  routes: [
    'GET  /api/cart            讀購物車（存在 cookie 裡的匿名購物車也讀得到）',
    'POST /api/cart/add        加入購物車',
    'POST /api/cart/remove     移除',
    'POST /api/cart/coupon     套用折扣碼',
    'POST /api/checkout        結帳，建立訂單並交給金流轉接器',
    'POST /api/payment/callback 金流回呼（依轉接器而定）',
  ],
};
export default mod;
