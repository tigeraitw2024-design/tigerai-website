import { newId, nowISO } from '../db';

/**
 * 寄信。
 *
 * 呼叫端只會看到 queueMail()。要換寄信服務，就在下面多一個 sender，
 * 然後改環境變數 MAIL_PROVIDER，其他地方一行都不用動。
 *
 * 為什麼是「排進佇列」而不是「直接寄」：
 * 客戶按下預約送出，預約已經存進資料庫了，這件事成功了。如果這時候
 * 寄信的 API 掛掉，不該讓客戶看到「預約失敗」——他明明約到了。
 * 所以信先入列，回應立刻送出，由 Cron 每分鐘撈出來寄，失敗就重試。
 *
 * Robin 說寄信要走公司的信箱，細節還沒給。所以預設是 console：
 * 信不會真的寄出去，內容會寫進佇列表，可以在後台「寄信佇列」看到，
 * 確認流程對了再接真的。
 */

export type Mail = { to: string; subject: string; body: string };

export type Env = {
  DB: D1Database;
  MAIL_PROVIDER?: string;
  MAIL_FROM?: string;
  RESEND_API_KEY?: string;
  SMTP_RELAY_URL?: string;
  SMTP_RELAY_TOKEN?: string;
};

/** 把信排進佇列。所有想寄信的地方都只呼叫這一個。 */
export async function queueMail(db: D1Database, m: Mail) {
  await db
    .prepare('INSERT INTO mail_queue (id,to_addr,subject,body,state,tries,created_at) VALUES (?,?,?,?,?,0,?)')
    .bind(newId(), m.to, m.subject, m.body, 'queued', nowISO())
    .run();
}

type Sender = (m: Mail, env: Env) => Promise<void>;

const senders: Record<string, Sender> = {
  /** 什麼都不做，只把信留在佇列表裡標成 sent。用來在還沒接信箱時驗流程。 */
  async console(m) {
    console.log(`[mail] → ${m.to}　${m.subject}`);
  },

  /**
   * Resend。設定 RESEND_API_KEY 就能用，不用自己架 SMTP。
   * 免費方案每天 100 封，對預約確認信夠用。
   */
  async resend(m, env) {
    if (!env.RESEND_API_KEY) throw new Error('沒有設定 RESEND_API_KEY');
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM || 'TigerAI <noreply@tigerai.com.tw>',
        to: [m.to],
        subject: m.subject,
        html: m.body,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status} ${await r.text()}`);
  },

  /**
   * 公司自己的 SMTP。
   *
   * Workers 不能直接開 TCP 連線寄 SMTP，所以這裡打的是一支「中繼 HTTP 端點」
   * ——公司那邊架一支小程式收 JSON 再用 SMTP 寄出。等 Robin 給信箱設定時，
   * 要嘛架這支中繼，要嘛改用 Resend 之類的 HTTP 寄信服務。
   */
  async 'smtp-relay'(m, env) {
    if (!env.SMTP_RELAY_URL) throw new Error('沒有設定 SMTP_RELAY_URL');
    const r = await fetch(env.SMTP_RELAY_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.SMTP_RELAY_TOKEN ? { authorization: `Bearer ${env.SMTP_RELAY_TOKEN}` } : {}),
      },
      body: JSON.stringify({ from: env.MAIL_FROM, to: m.to, subject: m.subject, html: m.body }),
    });
    if (!r.ok) throw new Error(`SMTP relay ${r.status}`);
  },
};

/**
 * 把佇列裡的信寄出去。由 Cron 呼叫。
 *
 * 一次只處理少量，因為免費方案每次請求 10 毫秒 CPU，
 * 一口氣寄 100 封會超時，而且超時的那一批會不知道寄到哪裡為止。
 */
export async function flushMailQueue(env: Env, batch = 10) {
  const provider = env.MAIL_PROVIDER || 'console';
  const send = senders[provider];
  if (!send) throw new Error(`不認得的寄信方式：${provider}`);

  const { results } = await env.DB
    .prepare("SELECT * FROM mail_queue WHERE state='queued' AND tries < 5 ORDER BY created_at LIMIT ?")
    .bind(batch)
    .all<any>();

  let ok = 0;
  let fail = 0;
  for (const row of results || []) {
    try {
      await send({ to: row.to_addr, subject: row.subject, body: row.body }, env);
      await env.DB
        .prepare("UPDATE mail_queue SET state='sent', sent_at=? WHERE id=?")
        .bind(nowISO(), row.id)
        .run();
      ok++;
    } catch (e: any) {
      // 試滿 5 次就不再試，留在表裡等人處理。
      // 無限重試會在信箱設定錯的時候把寫入額度吃光。
      const tries = (row.tries || 0) + 1;
      await env.DB
        .prepare("UPDATE mail_queue SET tries=?, last_error=?, state=? WHERE id=?")
        .bind(tries, String(e?.message || e).slice(0, 300), tries >= 5 ? 'failed' : 'queued', row.id)
        .run();
      fail++;
    }
  }
  return { ok, fail };
}

// ── 信件範本 ─────────────────────────────────────────────────────
// 純文字加最少量的 HTML。信件客戶端對 CSS 的支援很不一致，
// 花時間做漂亮的信不如確保每一家都讀得到。

const wrap = (title: string, body: string) => `<!doctype html><html lang="zh-Hant"><body style="font-family:system-ui,-apple-system,'Noto Sans TC',sans-serif;line-height:1.7;color:#0E0E0D;max-width:560px;margin:0 auto;padding:24px">
<h2 style="font-size:20px;margin:0 0 16px">${title}</h2>
${body}
<hr style="border:none;border-top:1px solid #E5E3DF;margin:24px 0">
<p style="font-size:12px;color:#6B6862;margin:0">TigerAI 虎智科技<br>這封信是系統自動發送的，請不要直接回覆。</p>
</body></html>`;

export const templates = {
  bookingConfirm: (name: string, when: string, code: string, cancelUrl: string) =>
    wrap('預約已收到', `
<p>${name} 您好，</p>
<p>我們收到您的 30 分鐘諮詢預約了。</p>
<p style="background:#FAF7F0;border-left:3px solid #ECA42B;padding:12px 16px;margin:16px 0">
  <b>時間：</b>${when}<br>
  <b>預約編號：</b>${code}
</p>
<p>確認信會在專人確認後再寄一次給您。如果時間有變，可以用這個連結取消：<br>
<a href="${cancelUrl}">${cancelUrl}</a></p>
<p>請帶著您最痛的那個部門來。</p>`),

  bookingInternal: (name: string, company: string, when: string, topic: string, contact: string) =>
    wrap('有新的預約', `
<p><b>${name}</b>（${company || '未填公司'}）約了 ${when}</p>
<p><b>想談：</b>${topic || '（未填）'}</p>
<p><b>聯絡方式：</b>${contact}</p>
<p>請在 24 小時內到後台確認，逾時系統會自動取消並把時段放回去。</p>`),

  leadResource: (title: string, url: string) =>
    wrap('您要的檔案', `
<p>這是您索取的「${title}」：</p>
<p><a href="${url}" style="display:inline-block;background:#ECA42B;color:#0E0E0D;padding:12px 20px;text-decoration:none;font-weight:700">下載檔案</a></p>
<p style="font-size:13px;color:#6B6862">連結 7 天後失效。</p>`),

  memberVerify: (url: string) =>
    wrap('請驗證你的 Email', `
<p>點下面的連結完成註冊：</p>
<p><a href="${url}">${url}</a></p>
<p style="font-size:13px;color:#6B6862">連結 24 小時後失效。如果這不是你本人操作，請忽略這封信。</p>`),

  memberReset: (url: string) =>
    wrap('重設密碼', `
<p>點下面的連結設定新密碼：</p>
<p><a href="${url}">${url}</a></p>
<p style="font-size:13px;color:#6B6862">連結 1 小時後失效。如果這不是你本人操作，請忽略這封信，你的密碼不會被更改。</p>`),

  orderPlaced: (code: string, total: string, lines: string) =>
    wrap('訂單已成立', `
<p>訂單編號 <b>${code}</b></p>
${lines}
<p style="font-size:18px"><b>應付總額：${total}</b></p>
<p>我們會盡快與您聯繫確認付款方式。</p>`),
};
