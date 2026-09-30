// 從頭到尾走一次「在後台改東西 → 前台真的變了」。
//
// 這是整個後台最重要、也最容易默默壞掉的一條路：後台看起來存好了、
// 前台卻還是舊的。所以要有一支專門測這件事的。
//
// 用法：
//   npm run build && npm run api      （另一個終端機）
//   node tools/smoke.mjs              （先建帳號與資料）
//   node tools/roundtrip.mjs
//
// 會實際改資料庫、實際重建前台，所以只能對本機跑。

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8802';
const enc = new TextEncoder();
let cookie = '';

async function dk(password, email) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('tigerai:' + email.toLowerCase()), iterations: 200_000 },
    key,
    256,
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

async function call(method, p, body) {
  const r = await fetch(BASE + p, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const t = await r.text();
  try {
    return { status: r.status, body: t ? JSON.parse(t) : null };
  } catch {
    return { status: r.status, body: { raw: t.slice(0, 200) } };
  }
}

let pass = 0;
let fail = 0;
const ok = (label, cond, extra) => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${extra !== undefined ? '　' + JSON.stringify(extra).slice(0, 200) : ''}`);
  }
};

const EMAIL = 'owner@tigerai.test';
const PASS = 'a-very-long-test-password';

console.log('\n── 登入後台 ──');
let r = await call('POST', '/api/auth/login', { email: EMAIL, dk: await dk(PASS, EMAIL) });
ok('登入', r.status === 200, r.body);
if (r.status !== 200) {
  console.log('\n先跑 node tools/smoke.mjs 建立帳號。\n');
  process.exit(1);
}

console.log('\n── 在後台改首頁文案 ──');
const MARK = '這一行是後台改的：' + Date.now().toString(36);
r = await call('GET', '/api/admin/c/home/_');
ok('拿到首頁文案那一筆', r.status === 200 && !!r.body?.id, r.body);
const homeId = r.body?.id;
r = await call('PUT', `/api/admin/c/home/${homeId}`, {
  shadowTitle: MARK,
  trustCompanies: 888,
  trustStudents: 7777,
});
ok('存進去', r.status === 200, r.body);

console.log('\n── 公開內容端點 ──');
cookie = '';
r = await call('GET', '/api/content/home');
ok('前台拿得到首頁文案（不用登入）', r.body?.items?.[0]?.shadowTitle === MARK, r.body?.items?.[0]);
r = await call('GET', '/api/content/consultants');
ok(`顧問 ${r.body?.items?.length} 筆`, (r.body?.items?.length || 0) >= 10);
r = await call('GET', '/api/content/bookings');
ok('預約這種即時資料拿不到（403）', r.status === 403, r.body);
r = await call('GET', '/api/content/leads');
ok('名單拿不到（403）', r.status === 403, r.body);
r = await call('GET', '/api/content/cases');
const leaked = JSON.stringify(r.body || {}).includes('internalNote');
ok('案例的內部備註沒有外流', !leaked);

console.log('\n── 重建前台 ──');
try {
  execSync('npm run build', { cwd: SITE, env: { ...process.env, CONTENT_API: BASE }, stdio: 'pipe' });
  console.log('  建置完成');
} catch (e) {
  console.log('  建置失敗：' + String(e.stdout || e).slice(-400));
  fail++;
}

const html = readFileSync(path.join(SITE, 'dist', 'index.html'), 'utf8');
ok('首頁 HTML 裡有後台改的那句話', html.includes(MARK));
ok('信任帶的數字換成 888', html.includes('data-count="888"'), html.match(/data-count="\d+"/g)?.slice(0, 3));
ok('學員數換成 7,777', html.includes('7,777'));
ok('原本寫死的那句已經不在了', !html.includes('錢和資料，正在一起流出去。'));

console.log('\n── 還原 ──');
console.log('  重新建置（不帶 CONTENT_API），讓 dist 回到內建內容');
execSync('npm run build', { cwd: SITE, stdio: 'pipe' });
const back = readFileSync(path.join(SITE, 'dist', 'index.html'), 'utf8');
ok('沒有 CONTENT_API 時退回內建文案', back.includes('錢和資料，正在一起流出去。') && !back.includes(MARK));

console.log(`\n通過 ${pass}　失敗 ${fail}\n`);
process.exit(fail ? 1 : 0);
