// 後台的端到端煙霧測試。
//
// 跑一次就知道整條路通不通：安裝 → 登入 → 讀 schema → 建改刪 →
// 前台送預約、留 Email、加購物車、結帳 → 回後台確認資料進去了 →
// 換一個低權限帳號確認他真的看不到客戶個資。
//
// 用法：
//   npx wrangler dev --port 8799 --local      （另一個視窗）
//   node tools/smoke.mjs
//
// 這支會把本機資料庫寫得亂七八糟，只能對本機跑。
// 要重跑請先砍掉 .wrangler/state。

const BASE = process.env.BASE || 'http://127.0.0.1:8799';
const enc = new TextEncoder();
let cookie = '';

/** 跟瀏覽器端與伺服器端同一套參數，改了任何一邊三邊都要一起改 */
async function dk(password, email) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('tigerai:' + email.toLowerCase()), iterations: 200_000 },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function call(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const t = await r.text();
  let j = null;
  try {
    j = t ? JSON.parse(t) : null;
  } catch {
    j = { raw: t.slice(0, 200) };
  }
  return { status: r.status, body: j };
}

let pass = 0;
let fail = 0;
const ok = (label, cond, extra) => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${extra !== undefined ? '　' + JSON.stringify(extra).slice(0, 220) : ''}`);
  }
};

const EMAIL = 'owner@tigerai.test';
const PASS = 'a-very-long-test-password';
let r;

console.log('\n── 安裝 ──');
const key = await dk(PASS, EMAIL);
r = await call('POST', '/api/auth/bootstrap', { secret: 'wrong', email: EMAIL, name: 'Owner', dk: key });
ok('密語錯誤會被擋下來', r.status === 403, r.body);
r = await call('POST', '/api/auth/bootstrap', { secret: 'local-test-secret', email: EMAIL, name: 'Robin', dk: key });
ok('安裝成功', r.status === 200, r.body);
ok('有塞初始資料', Array.isArray(r.body?.seeded) && r.body.seeded.length > 0, r.body?.seeded);
if (r.body?.seeded) console.log('      ' + r.body.seeded.join('、'));
r = await call('POST', '/api/auth/bootstrap', { secret: 'local-test-secret', email: 'x@y.tw', name: 'X', dk: key });
ok('安裝不能跑第二次', r.status === 400, r.body);

console.log('\n── 登入 ──');
cookie = '';
r = await call('POST', '/api/auth/login', { email: EMAIL, dk: 'bad-key' });
ok('密碼錯誤擋下來', r.status === 401, r.body);
r = await call('POST', '/api/auth/login', { email: EMAIL, dk: key });
ok('登入成功', r.status === 200 && r.body?.user?.role === 'owner', r.body);

console.log('\n── Schema ──');
r = await call('GET', '/api/admin/schema');
ok('拿得到 schema', r.status === 200, r.body?.error);
const cols = r.body?.collections || [];
ok(`集合數量 ${cols.length}`, cols.length >= 23);
ok('owner 看得到後台帳號', cols.some((c) => c.name === 'users'));

console.log('\n── 初始資料 ──');
r = await call('GET', '/api/admin/c/consultants');
ok(`顧問已匯入 ${r.body?.total} 筆`, r.body?.total >= 10, r.body?.error);
r = await call('GET', '/api/admin/c/workflows');
ok(`工作流已匯入 ${r.body?.total} 筆`, r.body?.total >= 6);
r = await call('GET', '/api/admin/c/dept_cases');
ok(`部門案例已匯入 ${r.body?.total} 筆`, r.body?.total >= 13);
r = await call('GET', '/api/admin/c/partners');
ok(`合作夥伴已匯入 ${r.body?.total} 筆`, r.body?.total >= 10);

console.log('\n── 內容 CRUD ──');
r = await call('POST', '/api/admin/c/courses', { title: '', slug: 'x', level: 'L2' });
ok('必填沒填會被擋', r.status === 400 && r.body?.errors?.length, r.body);
r = await call('POST', '/api/admin/c/courses', { title: 'n8n 自動化實戰', slug: 'N8N Auto!', level: 'L2' });
ok('網址代號格式錯誤會被擋', r.status === 400, r.body);
r = await call('POST', '/api/admin/c/courses', { title: 'n8n 自動化實戰', slug: 'n8n-auto', level: 'L2', hours: 16, price: 1800000, status: 'published' });
ok('建立課程', r.status === 200 && !!r.body?.id, r.body);
const courseId = r.body?.id;
r = await call('POST', '/api/admin/c/courses', { title: '重複代號', slug: 'n8n-auto', level: 'L3' });
ok('重複的網址代號會被擋', r.status === 400, r.body);
r = await call('PUT', `/api/admin/c/courses/${courseId}`, { title: 'n8n 自動化實戰（改）', slug: 'n8n-auto', level: 'L2', hours: 20, price: 1800000, status: 'published' });
ok('修改課程', r.status === 200, r.body);
r = await call('GET', `/api/admin/c/courses/${courseId}`);
ok('改的有存進去', r.body?.hours === 20 && String(r.body?.title).includes('（改）'), r.body);
r = await call('PUT', `/api/admin/c/courses/${courseId}`, { title: 'x'.repeat(80), slug: 'n8n-auto', level: 'L2' });
ok('字數超過上限會被擋', r.status === 400, r.body);
r = await call('PUT', `/api/admin/c/courses/${courseId}`, { title: 'n8n', slug: 'n8n-auto', level: 'L2', body: '<p>好</p><script>alert(1)</script><b>粗</b>' });
r = await call('GET', `/api/admin/c/courses/${courseId}`);
ok('內文裡的 script 被洗掉', !String(r.body?.body).includes('<script'), r.body?.body);

console.log('\n── singleton ──');
r = await call('GET', '/api/admin/c/settings/_');
ok('全站設定會自動建一筆', r.status === 200 && !!r.body?.id, r.body);
r = await call('PUT', `/api/admin/c/settings/${r.body.id}`, { siteName: 'TigerAI 虎智科技', email: 'hi@tigerai.com.tw' });
ok('存全站設定', r.status === 200, r.body);

console.log('\n── 前台公開端點 ──');
const ownerCookie = cookie;
cookie = '';
r = await call('POST', '/api/booking', { name: '測試', email: 'bad-email', topic: 't' });
ok('Email 格式錯誤會被擋', r.status === 400, r.body);
r = await call('POST', '/api/booking', { name: '王小明', email: 'ming@example.com', company: '某公司', topic: '想談報價單比對', phone: '0912345678' });
ok('送出預約', r.status === 200 && !!r.body?.code, r.body);
r = await call('POST', '/api/booking', { name: '機器人', email: 'bot@example.com', website: 'http://spam' });
ok('機器人陷阱：假裝成功但不留資料', r.status === 200 && !r.body?.code, r.body);
r = await call('POST', '/api/lead', { email: 'ming@example.com', name: '王小明', source: 'workflow-template' });
ok('留 Email', r.status === 200, r.body);
r = await call('POST', '/api/cart/add', { kind: 'course', refId: courseId, qty: 1 });
ok('加入購物車', r.status === 200 && r.body?.lines?.length === 1, r.body);
ok('車裡的價格是從資料庫查的', r.body?.total === 1800000, { total: r.body?.total });
r = await call('POST', '/api/checkout', { buyerName: '王小明', buyerEmail: 'ming@example.com' });
ok('結帳建立訂單', r.status === 200 && !!r.body?.orderCode, r.body);
ok('金流回「只記單不收款」', r.body?.payment?.kind === 'none', r.body?.payment);

console.log('\n── 回後台確認 ──');
cookie = ownerCookie;
r = await call('GET', '/api/admin/c/bookings');
ok(`預約 1 筆（機器人那筆沒進來）`, r.body?.total === 1, r.body);
r = await call('GET', '/api/admin/c/leads');
ok(`名單去重成 1 筆`, r.body?.total === 1, r.body?.items?.map((x) => x.email));
ok('互動次數有累加', (r.body?.items?.[0]?.touches || 0) >= 2, r.body?.items?.[0]);
r = await call('GET', '/api/admin/c/orders');
ok('訂單進來了', r.body?.total === 1, r.body);
r = await call('GET', '/api/admin/c/mail_queue').catch(() => ({ body: {} }));
r = await call('GET', '/api/admin/ops/dashboard');
ok('總覽拿得到數字', r.status === 200 && !!r.body?.content, r.body);

console.log('\n── 權限 ──');
r = await call('POST', '/api/admin/c/users', { email: 'editor@tigerai.test', name: '小編', role: 'editor', password: 'editor-password-123', active: true });
ok('開一個 editor 帳號', r.status === 200, r.body);
cookie = '';
r = await call('POST', '/api/auth/login', { email: 'editor@tigerai.test', password: 'editor-password-123' });
ok('editor 登入', r.status === 200, r.body);
r = await call('GET', '/api/admin/schema');
const enames = (r.body?.collections || []).map((c) => c.name);
ok('editor 看不到預約', !enames.includes('bookings'), enames);
ok('editor 看不到名單', !enames.includes('leads'));
ok('editor 看不到會員與訂單', !enames.includes('members') && !enames.includes('orders'));
ok('editor 看不到後台帳號', !enames.includes('users'));
ok('editor 看得到課程', enames.includes('courses'));
r = await call('GET', '/api/admin/c/bookings');
ok('editor 直接打 API 也拿不到預約', r.status === 403, r.body);
r = await call('GET', '/api/admin/c/leads');
ok('editor 直接打 API 也拿不到名單', r.status === 403, r.body);
r = await call('POST', '/api/admin/ops/publish');
ok('editor 不能發布', r.status === 403, r.body);

console.log('\n── 未登入 ──');
cookie = '';
r = await call('GET', '/api/admin/c/courses');
ok('沒登入拿不到任何後台資料', r.status === 401, r.body);
r = await call('GET', '/api/admin/schema');
ok('沒登入拿不到 schema', r.status === 401);
r = await call('GET', '/api/admin/c/leads');
ok('沒登入拿不到名單', r.status === 401);

console.log(`\n通過 ${pass}　失敗 ${fail}\n`);
process.exit(fail ? 1 : 0);
