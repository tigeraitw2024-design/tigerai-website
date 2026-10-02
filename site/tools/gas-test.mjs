// Apps Script 的時間運算測試。
//
// integrations/apps-script/Code.gs 跑在 Google 的機器上，沒辦法在這裡對真的
// 行事曆跑。但裡面最容易錯的那一段——算哪些時段還空著——是純粹的時間運算：
// 星期幾、上班時間、提前幾小時、兩場之間空多久、一天最多幾場、活動重疊。
//
// 所以這裡把 Google 的 API 換成假的，只餵時間進去，驗算出來的時段對不對。
// 這些邏輯錯了的下場是「客戶約到你沒空的時間」或「明明有空卻約不到」，
// 兩個都要等真的有人來約才會發現，所以一定要先測。
//
// 用法：node tools/gas-test.mjs
//
// 注意：Apps Script 的「專案設定 → 時區」必須是 Taipei，Code.gs 裡
// new Date(年, 月, 日) 才會算在正確的時區上。這支測試也把時區固定成 Taipei，
// 跟線上環境一致。

process.env.TZ = 'Asia/Taipei';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'integrations', 'apps-script', 'Code.gs');

// 先確認時區真的切過去了，不然底下所有結果都是對的「但對在錯的時區」
{
  const jan = new Date(2026, 0, 15, 12, 0, 0);
  const offset = -jan.getTimezoneOffset() / 60;
  if (offset !== 8) {
    console.error(`時區沒切成 UTC+8（現在是 UTC${offset >= 0 ? '+' : ''}${offset}）。`);
    console.error('請改用 TZ=Asia/Taipei node tools/gas-test.mjs');
    process.exit(1);
  }
}

let pass = 0;
let fail = 0;
function ok(label, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`, extra === undefined ? '' : JSON.stringify(extra));
  }
}

// ── 假的 Google API ─────────────────────────────────────────────

/** 一場行事曆上的活動。 */
function fakeEvent({ start, end, allDay = false, myStatus = null }) {
  return {
    getStartTime: () => start,
    getEndTime: () => end,
    isAllDayEvent: () => allDay,
    getMyStatus: () => myStatus,
    getGuestByEmail: () => null,
  };
}

/** 一個行事曆。events 是這個行事曆上所有的活動。 */
function fakeCalendar(id, events) {
  return {
    getId: () => id,
    // 真的 CalendarApp 回的是「跟這段時間有重疊」的活動，不是「完全落在裡面」的。
    // 這個差別很重要：9:30–10:30 的會議要擋掉 10:00 那一格。
    getEvents: (from, to) =>
      events.filter((ev) => ev.getStartTime() < to && ev.getEndTime() > from),
    createEvent: () => ({ getId: () => 'evt_fake' }),
    getEventById: () => null,
  };
}

/** 載入 Code.gs，Google 的東西全部換成假的。 */
function loadGas({ calendars = {}, defaultCalendar = 'primary' } = {}) {
  const src = readFileSync(SRC, 'utf8');

  const sandbox = {
    Session: { getScriptTimeZone: () => 'Asia/Taipei' },
    CalendarApp: {
      GuestStatus: { YES: 'YES', NO: 'NO', MAYBE: 'MAYBE', INVITED: 'INVITED', OWNER: 'OWNER' },
      getDefaultCalendar: () => calendars[defaultCalendar] || fakeCalendar(defaultCalendar, []),
      getCalendarById: (id) => calendars[id] || null,
    },
    SpreadsheetApp: { openById: () => { throw new Error('測試不碰試算表'); } },
    MailApp: { sendEmail: () => {}, getRemainingDailyQuota: () => 100 },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => t }), MimeType: { JSON: 'json', TEXT: 'text' } },
  };

  // Code.gs 的函式都是頂層宣告，包一層 Function 再把要用的回傳出來。
  // 用 Function 而不是 vm 模組是為了少一個 import，而且這裡沒有不信任的輸入。
  const names = Object.keys(sandbox);
  const factory = new Function(
    ...names,
    src + '\nreturn { freeSlots_, handleBooking_, parseHM_, blocksTime_, busyCalendars_ };',
  );
  return factory(...names.map((n) => sandbox[n]));
}

const BASE_RULES = {
  calendarIds: '',
  weekdays: [1, 2, 3, 4, 5],
  dayStart: '10:00',
  dayEnd: '18:00',
  slotMinutes: 30,
  gapMinutes: 0,
  leadHours: 0,
  daysAhead: 0,     // 只算今天，測試才看得懂
  maxPerDay: 0,
  ignoreAllDay: false,
};

/** 把結果轉成 ['10:00','10:30'] 這種好讀的樣子 */
const hhmm = (slots) =>
  slots.map((s) => {
    const d = new Date(s.startAt);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  });

/** 今天這個日期的某個時間點。daysAhead=0 的測試都用今天。 */
const today = (h, m = 0) => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m, 0, 0);
};

/** 往後找第一個指定星期的日期（1=週一）。跨週的測試用。 */
function nextDow(dow) {
  const n = new Date();
  for (let i = 0; i <= 14; i++) {
    const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + i);
    const w = d.getDay() === 0 ? 7 : d.getDay();
    if (w === dow) return d;
  }
  throw new Error('找不到');
}

const todayDow = (() => {
  const d = new Date();
  return d.getDay() === 0 ? 7 : d.getDay();
})();

// ── 時間字串 ────────────────────────────────────────────────────

console.log('\n── 時間字串 ──');
{
  const gas = loadGas();
  ok("'09:30' 解析對", JSON.stringify(gas.parseHM_('09:30', 0, 0)) === JSON.stringify({ h: 9, m: 30 }));
  ok("'9:5' 解析對（一位數也要吃）", JSON.stringify(gas.parseHM_('9:5', 0, 0)) === JSON.stringify({ h: 9, m: 5 }));
  ok('空字串退回預設值', JSON.stringify(gas.parseHM_('', 10, 15)) === JSON.stringify({ h: 10, m: 15 }));
  ok('亂填退回預設值，不要讓前台整個約不到', JSON.stringify(gas.parseHM_('下午三點', 10, 0)) === JSON.stringify({ h: 10, m: 0 }));
  ok('超過 23 點會被夾住', gas.parseHM_('99:99', 0, 0).h === 23);
}

// ── 基本時段 ────────────────────────────────────────────────────

console.log('\n── 一天切成幾格 ──');
{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow] } });
  const got = hhmm(r.slots);
  ok('10:00–18:00、一場 30 分鐘、沒有間隔 → 16 格', got.length === 16, got);
  ok('第一格是 10:00', got[0] === '10:00', got);
  ok('最後一格是 17:30（18:00 要結束，不是 18:00 開始）', got[got.length - 1] === '17:30', got);
}

{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], gapMinutes: 15 } });
  const got = hhmm(r.slots);
  ok('兩場之間空 15 分鐘 → 10:00、10:45、11:30…', got[0] === '10:00' && got[1] === '10:45' && got[2] === '11:30', got);
}

{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], maxPerDay: 3 } });
  ok('一天最多 3 場就只給 3 格', r.slots.length === 3, hhmm(r.slots));
}

{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], dayEnd: '10:20' } });
  ok('塞不進一整場就不給（10:00–10:20 放不下 30 分鐘）', r.slots.length === 0, hhmm(r.slots));
}

// ── 星期 ────────────────────────────────────────────────────────

console.log('\n── 星期 ──');
{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], daysAhead: 13 } });
  const days = new Set(r.slots.map((s) => new Date(s.startAt).getDay()));
  const want = todayDow === 7 ? 0 : todayDow;
  ok('只開今天這個星期 → 兩週內只出現這一個星期', days.size === 1 && days.has(want), [...days]);
}

{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [7], daysAhead: 13 } });
  const days = new Set(r.slots.map((s) => new Date(s.startAt).getDay()));
  // 7 代表週日，JS 的 getDay() 週日是 0——這個轉換寫錯的話，
  // 「只開週日」會變成「只開週六」，而且沒人會注意到。
  ok('7 是週日，不是週六', r.slots.length > 0 && days.size === 1 && days.has(0), [...days]);
}

{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [1], daysAhead: 13 } });
  const mon = nextDow(1);
  const first = r.slots.length ? new Date(r.slots[0].startAt) : null;
  ok(
    '只開週一 → 第一格落在下一個週一',
    !!first && first.getDate() === mon.getDate() && first.getMonth() === mon.getMonth(),
    first && first.toString(),
  );
}

// ── 要提前多久 ──────────────────────────────────────────────────

console.log('\n── 至少提前幾小時 ──');
{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [1, 2, 3, 4, 5, 6, 7], daysAhead: 7, leadHours: 24 } });
  const earliest = r.slots.length ? Date.parse(r.slots[0].startAt) : Infinity;
  const cutoff = Date.now() + 24 * 3600e3;
  ok('提前 24 小時 → 最早的時段在 24 小時之後', earliest >= cutoff, new Date(earliest).toString());
}

{
  const gas = loadGas({ calendars: { primary: fakeCalendar('primary', []) } });
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [1, 2, 3, 4, 5, 6, 7], daysAhead: 7, leadHours: 0 } });
  const earliest = r.slots.length ? Date.parse(r.slots[0].startAt) : Infinity;
  ok('不限提前 → 最早的時段也不會是過去的時間', earliest >= Date.now() - 60000, new Date(earliest).toString());
}

// ── 行事曆上有事 ────────────────────────────────────────────────

console.log('\n── 撞到行事曆上的事 ──');
{
  // 11:00–11:30 有一場會
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(11, 0), end: today(11, 30) })]);
  const gas = loadGas({ calendars: { primary: cal } });
  const got = hhmm(gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow] } }).slots);
  ok('剛好占滿一格 → 那一格不見了', !got.includes('11:00'), got);
  ok('前後的格子還在', got.includes('10:30') && got.includes('11:30'), got);
}

{
  // 11:15–11:45 的會橫跨兩格的邊界
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(11, 15), end: today(11, 45) })]);
  const gas = loadGas({ calendars: { primary: cal } });
  const got = hhmm(gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow] } }).slots);
  ok('只重疊一部分也要擋掉（11:00 與 11:30 兩格都沒了）', !got.includes('11:00') && !got.includes('11:30'), got);
}

{
  // 會議結束的那一刻就是下一格開始的那一刻，不算重疊
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(10, 0), end: today(10, 30) })]);
  const gas = loadGas({ calendars: { primary: cal } });
  const got = hhmm(gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow] } }).slots);
  ok('接著開始不算撞期（10:30 還在）', !got.includes('10:00') && got.includes('10:30'), got);
}

{
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(0, 0), end: today(23, 59), allDay: true })]);
  const gas = loadGas({ calendars: { primary: cal } });
  const got = hhmm(gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow] } }).slots);
  ok('整天的行程（出差、休假）→ 那天整天約不到', got.length === 0, got);

  const gas2 = loadGas({ calendars: { primary: cal } });
  const got2 = hhmm(gas2.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], ignoreAllDay: true } }).slots);
  ok('勾了「整天的行程不算佔用」就照樣開放', got2.length === 16, got2);
}

{
  const cal = fakeCalendar('primary', [
    fakeEvent({ start: today(11, 0), end: today(11, 30), myStatus: 'NO' }),
  ]);
  const gas = loadGas({ calendars: { primary: cal } });
  const got = hhmm(gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow] } }).slots);
  ok('自己已經回「不參加」的會不算佔用', got.includes('11:00'), got);
}

// ── 多個行事曆 ──────────────────────────────────────────────────

console.log('\n── 避開多個行事曆 ──');
{
  const primary = fakeCalendar('primary', [fakeEvent({ start: today(11, 0), end: today(11, 30) })]);
  const mine = fakeCalendar('robin@example.com', [fakeEvent({ start: today(14, 0), end: today(15, 0) })]);
  const gas = loadGas({ calendars: { primary, 'robin@example.com': mine } });
  const got = hhmm(
    gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], calendarIds: 'robin@example.com' } }).slots,
  );
  ok('兩個行事曆上的事都要避開', !got.includes('11:00') && !got.includes('14:00') && !got.includes('14:30'), got);
  ok('其他時段不受影響', got.includes('10:00') && got.includes('15:00'), got);
}

{
  const primary = fakeCalendar('primary', []);
  const gas = loadGas({ calendars: { primary } });
  // ID 打錯的下場不該是「前台完全約不到」
  const r = gas.freeSlots_({ rules: { ...BASE_RULES, weekdays: [todayDow], calendarIds: '打錯的id, 也打錯' } });
  ok('行事曆 ID 打錯就跳過，不要整支掛掉', r.ok === true && r.slots.length === 16, r.slots.length);
}

{
  const primary = fakeCalendar('primary', []);
  const gas = loadGas({ calendars: { primary } });
  const cals = gas.busyCalendars_('primary, primary');
  ok('同一個行事曆填兩次只算一次', cals.length === 1, cals.length);
}

// ── 送出預約時再檢查一次 ────────────────────────────────────────

console.log('\n── 送出預約時重新檢查 ──');
{
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(11, 0), end: today(11, 30) })]);
  const gas = loadGas({ calendars: { primary: cal } });
  const r = gas.handleBooking_({
    rules: { ...BASE_RULES },
    row: { Email: 'a@b.com' },
    calendar: { startAt: today(11, 0).toISOString(), minutes: 30, guestEmail: 'a@b.com' },
  });
  ok('時間已經被佔走 → 回 taken，而且不碰試算表', r.ok === false && r.error === 'taken', r);
}

{
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(11, 0), end: today(11, 30) })]);
  const gas = loadGas({ calendars: { primary: cal } });
  const r = gas.handleBooking_({
    rules: { ...BASE_RULES },
    row: { Email: 'a@b.com' },
    calendar: { startAt: today(11, 15).toISOString(), minutes: 30, guestEmail: 'a@b.com' },
  });
  ok('只重疊一部分也算被佔走', r.ok === false && r.error === 'taken', r);
}

{
  const cal = fakeCalendar('primary', [fakeEvent({ start: today(11, 0), end: today(11, 30) })]);
  const gas = loadGas({ calendars: { primary: cal } });
  // 時間是空的 → 會去寫試算表，而測試的試算表是會丟錯的，
  // 所以這裡驗的是「它過了時間檢查、走到寫試算表那一步」
  let reached = false;
  try {
    gas.handleBooking_({
      rules: { ...BASE_RULES },
      row: { Email: 'a@b.com' },
      calendar: { startAt: today(15, 0).toISOString(), minutes: 30, guestEmail: 'a@b.com' },
    });
  } catch (e) {
    reached = /測試不碰試算表|SHEET_ID/.test(String(e));
  }
  ok('時間還空著 → 通過檢查，繼續往下做', reached);
}

console.log(`\n通過 ${pass}　失敗 ${fail}\n`);
process.exit(fail ? 1 : 0);
