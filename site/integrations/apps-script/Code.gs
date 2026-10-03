/**
 * 官網的 Google 中繼站。
 *
 * Cloudflare Workers 的網路只允許 HTTP，不能開 SMTP 連線，所以沒辦法直接登入
 * Gmail 寄信。這支小程式跑在 Google 自己的機器上，收到官網的 HTTP 請求之後
 * 代為執行這些事：
 *
 *   action: 'mail'         用這個帳號的 Gmail 寄一封信
 *   action: 'lead'         把一列資料寫進 Google 試算表（CRM 每 2 小時來抓）
 *   action: 'slots'        讀行事曆的空檔，算出哪些時段可以約
 *   action: 'booking'      寫試算表 ＋ 在行事曆開一格 ＋ 寄邀請給對方
 *   action: 'eventStatus'  查對方按了「是」還是「否」
 *   action: 'cancelEvent'  取消行事曆上的那一場
 *   action: 'ping'         只確認網址和密語對不對
 *
 * ── 這支程式用哪個帳號跑很重要 ────────────────────────────────
 * Apps Script 是以「擁有者的身分」執行，所以它有權限讀寫這個帳號的所有信件、
 * 試算表與行事曆。**請用官網專用的 Google 帳號**，不要用你的主帳號——
 * 這個網址萬一外流，波及範圍就只有那個專用帳號。
 *
 * 要讓自己看得到資料，用「分享」而不是「共用帳號」：
 *   試算表 → 分享給你的公司信箱
 *   行事曆 → 設定 → 與特定使用者共用 → 加你的公司信箱（權限給「變更活動」）
 * 這樣你在自己的 Google 日曆裡就看得到所有預約，但腳本碰不到你的帳號。
 *
 * ⚠ 可約時段是讀「這個帳號看得到的行事曆」算出來的。別人的行事曆它預設看不到。
 *   要讓官網避開你、CEO、或任何同事的行程：那個人把自己的行事曆分享給這個
 *   專用帳號（權限選「僅顯示空閒／忙碌資訊」就夠，不必讓官網看到會議內容），
 *   再把他的行事曆 ID（通常就是他的信箱）填進後台的「要避開哪些行事曆」。
 *
 * ── 部署步驟 ──────────────────────────────────────────────────
 * 1. 用官網專用帳號登入 https://script.google.com ，新增專案
 * 2. 把編輯區內容全部刪掉，貼上這整份
 * 3. 改下面三個設定：SECRET、SHEET_ID、CALENDAR_ID
 * 4. 左邊齒輪「專案設定」→ 時區改成 (GMT+08:00) Taipei
 *    ← 這一步不做，算出來的可約時段會整個時區歪掉
 * 5. 左邊「服務」按 ＋ → 選「Google Calendar API」→ 新增
 *    ← 算空檔用的 FreeBusy 需要這個，不加會在重算時段時報錯
 * 6. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *      執行身分：我自己
 *      具有存取權的使用者：任何人        ← 一定要選這個，Cloudflare 才打得到
 * 7. 第一次會要求授權，按「允許」
 * 8. 複製產生的網址（.../exec 結尾），連同 SECRET 一起給工程端
 *
 * ⚠ 每次改完程式都要重新「部署 → 管理部署作業 → 編輯 → 版本改成新版本」，
 *   否則線上跑的還是舊版。這是 Apps Script 最常見的坑。
 */

// ── 設定 ────────────────────────────────────────────────────────

/** 共用密語。隨便打一串長一點的亂碼，官網那邊要設一樣的。
 *  沒有這道，任何人撿到網址就能用你的信箱寄信。 */
const SECRET = '請換成一串夠長的亂碼';

/** 「官網名單」試算表的 ID。
 *  從網址中間那段抄過來：docs.google.com/spreadsheets/d/【這一段】/edit */
const SHEET_ID = '';

/** 預約要寫進哪個行事曆。留空就用這個帳號的主行事曆。 */
const CALENDAR_ID = '';

/** 試算表裡的分頁名稱。不存在會自動建立。 */
const TAB_NAME = '官網名單';

/** 欄位順序。改這裡要連同試算表的標題列一起改。
 *  欄位名稱刻意跟 CRM 的進料欄位一致，這樣 CRM 抓進去不用再對應。 */
const HEADERS = [
  '姓名', '公司', '職稱', 'Email', '電話',
  '來源', '來源明細', '互動次數', '最後互動時間',
  '想談什麼', '公司人數', '預約編號', '預約時間', '狀態', '備註',
];

// ── 進入點 ──────────────────────────────────────────────────────

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.secret !== SECRET) return json({ ok: false, error: 'bad secret' });

    switch (body.action) {
      case 'mail': return json(sendMail_(body));
      case 'lead': return json(appendLead_(body));
      case 'slots': return json(freeSlots_(body));
      case 'booking': return json(handleBooking_(body));
      case 'eventStatus': return json(eventStatus_(body));
      case 'cancelEvent': return json(cancelEvent_(body));
      case 'ping': return json({ ok: true, at: new Date().toISOString(), tz: Session.getScriptTimeZone() });
      default: return json({ ok: false, error: '不認得的 action：' + body.action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 讓瀏覽器直接開也能看到東西，確認部署成功用的。不吐任何資料。 */
function doGet() {
  return ContentService.createTextOutput('TigerAI 官網中繼站運作中').setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ── 寄信 ────────────────────────────────────────────────────────

/**
 * body: { to, subject, html, fromName?, replyTo? }
 *
 * 免費 Gmail 每天 100 封、Workspace 1,500 封。超過會丟錯，官網那邊收到失敗
 * 會把信留在佇列裡下次再試，不會掉信。
 */
function sendMail_(body) {
  if (!body.to || !body.subject) return { ok: false, error: '缺 to 或 subject' };

  const opts = {
    to: String(body.to),
    subject: String(body.subject),
    htmlBody: String(body.html || ''),
    name: body.fromName || 'TigerAI 虎智科技',
  };
  // 讓客戶按「回覆」時回到真正在看信的人，而不是這個機器帳號
  if (body.replyTo) opts.replyTo = String(body.replyTo);

  MailApp.sendEmail(opts);
  return { ok: true, remainingQuota: MailApp.getRemainingDailyQuota() };
}

// ── 寫進試算表 ──────────────────────────────────────────────────

function sheet_() {
  if (!SHEET_ID) throw new Error('還沒設定 SHEET_ID');
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TAB_NAME);
  if (!sh) {
    sh = ss.insertSheet(TAB_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * body: { row: { 姓名, 公司, Email, ... } }
 *
 * 同一個 Email 已經在表上就更新那一列並把互動次數加一，不新增。
 * CRM 那邊的進料本來就是冪等的，這裡再去重一次是為了讓你打開試算表時，
 * 一個人就是一列，看得懂。
 */
function appendLead_(body) {
  const row = body.row || {};
  const email = String(row['Email'] || '').trim().toLowerCase();
  if (!email) return { ok: false, error: '缺 Email' };

  const sh = sheet_();
  const lock = LockService.getScriptLock();
  // 兩個請求同時進來會寫到同一列，所以要鎖。等最多 20 秒。
  lock.waitLock(20000);
  try {
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const emailCol = head.indexOf('Email');
    const countCol = head.indexOf('互動次數');
    const lastCol = head.indexOf('最後互動時間');

    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][emailCol] || '').trim().toLowerCase() === email) { found = i; break; }
    }

    const now = new Date();
    if (found > 0) {
      // 已經有這個人：只補空的欄位，不覆蓋既有內容（可能是人工修過的）
      const line = data[found];
      head.forEach((h, c) => {
        const incoming = row[h];
        if (incoming !== undefined && incoming !== '' && !line[c]) line[c] = incoming;
      });
      if (countCol >= 0) line[countCol] = (parseInt(line[countCol], 10) || 0) + 1;
      if (lastCol >= 0) line[lastCol] = now;
      sh.getRange(found + 1, 1, 1, head.length).setValues([line]);
      return { ok: true, mode: 'updated', row: found + 1 };
    }

    const line = head.map((h) => {
      if (h === '互動次數') return 1;
      if (h === '最後互動時間') return now;
      return row[h] === undefined ? '' : row[h];
    });
    sh.appendRow(line);
    return { ok: true, mode: 'added', row: sh.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

// ── 行事曆：算出哪些時段可以約 ──────────────────────────────────

/** 寫預約用的行事曆（只有一個）。 */
function writeCalendar_() {
  const cal = CALENDAR_ID ? CalendarApp.getCalendarById(CALENDAR_ID) : CalendarApp.getDefaultCalendar();
  if (!cal) throw new Error('找不到行事曆，請確認 CALENDAR_ID');
  return cal;
}

/**
 * 算空檔時要看哪些行事曆。
 *
 * 一定包含寫入用的那一個，不然已經排好的預約會被當成空檔再賣一次。
 * extra 是後台填的，用逗號分隔：CEO 的、同事的、Robin 自己的主行事曆，
 * 只要那個人把行事曆分享給這個官網專用帳號，填進來就會一起避開。
 */
function calendarIdList_(extra) {
  const ids = [writeCalendar_().getId()];
  const seen = {};
  seen[ids[0]] = true;
  String(extra || '')
    .split(/[,\n]/)
    .map(function (s) { return s.trim(); })
    .filter(Boolean)
    .forEach(function (id) {
      if (seen[id]) return;
      seen[id] = true;
      ids.push(id);
    });
  // FreeBusy 一次最多問 50 個行事曆
  return ids.slice(0, 50);
}

/**
 * 一次問出「這段時間裡，這些行事曆分別在什麼時候是忙的」。
 *
 * 用 FreeBusy，不是一個一個行事曆去讀活動。三個理由：
 *
 * 1. **權限門檻低很多**。FreeBusy 只要對方把行事曆分享成
 *    「僅顯示空閒／忙碌資訊（隱藏詳細資訊）」就能用。CEO 不必讓官網這個
 *    帳號看到他每場會議的標題和與會者，只會知道「這個時段他有事」。
 *    要讀活動內容的話，對方得分享「查看所有活動詳細資訊」——那個比較難要到。
 *
 * 2. **快很多**。一次請求涵蓋所有行事曆、整個日期範圍。
 *    逐一讀活動的話是「人數 × 天數」次呼叫，5 個人 × 14 天 = 70 次，
 *    Apps Script 一支最多跑 6 分鐘，很容易就超時，而超時沒有部分結果。
 *
 * 3. **整天的行程由 Google 自己判斷**。行事曆上每個活動都有「忙碌／空閒」
 *    這個設定，FreeBusy 照那個算。所以「出差整週」要不要擋，是在 Google 日曆
 *    上把那個行程設成「忙碌」就好，不用在官網後台另外開一個開關
 *    （而且可以一個行程一個行程決定，比一個全站開關準）。
 *    提醒：Google 的整天活動預設是「空閒」，要擋就要自己改成「忙碌」。
 *
 * 讀不到的行事曆（ID 打錯、對方還沒分享）不會讓整支掛掉，
 * 而是收進 problems 回傳，後台看得到——前台照樣排得出時段，
 * 只是少避開那個人。
 */
function busyBlocks_(extra, timeMin, timeMax) {
  if (typeof Calendar === 'undefined' || !Calendar.Freebusy) {
    throw new Error(
      '還沒啟用進階 Calendar 服務。到 Apps Script 編輯器左邊「服務」按 ＋，'
      + '選「Google Calendar API」，識別碼保持 Calendar，按新增，再重新部署一次。'
    );
  }

  const ids = calendarIdList_(extra);
  const res = Calendar.Freebusy.query({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    timeZone: Session.getScriptTimeZone(),
    items: ids.map(function (id) { return { id: id }; }),
  });

  const busy = [];
  const problems = [];
  ids.forEach(function (id) {
    const c = res.calendars ? res.calendars[id] : null;
    if (!c) { problems.push(id + '：沒有回應'); return; }
    if (c.errors && c.errors.length) {
      const why = c.errors[0].reason === 'notFound' ? '找不到，或還沒分享給這個帳號'
        : c.errors[0].reason === 'forbidden' ? '沒有權限（請對方把行事曆分享給官網帳號）'
        : c.errors[0].reason;
      problems.push(id + '：' + why);
      return;
    }
    (c.busy || []).forEach(function (b) {
      busy.push({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() });
    });
  });

  return { busy: busy, problems: problems, ids: ids };
}

/**
 * body: { rules: {...} }
 *
 * 規則都從官網後台傳進來，這裡不寫死——Robin 要能自己改上班時間、
 * 一天最多幾場、要提前幾小時，不用找人改程式。
 *
 * 回傳的是 ISO 時間字串，時區換算在這邊做完。所以**專案設定的時區一定要是
 * Taipei**，不然 new Date(年, 月, 日) 這種「當地時間」會算在錯的時區上。
 */
function freeSlots_(body) {
  const r = body.rules || {};
  // 一場至少 5 分鐘：0 或負數會讓下面的 for 迴圈永遠跑不完，
  // 在 Apps Script 上就是整支卡住然後吃掉今天的執行額度。
  const slotMin = clamp_(num_(r.slotMinutes, 30), 5, 480);
  const gapMin = clamp_(num_(r.gapMinutes, 0), 0, 480);
  const daysAhead = clamp_(num_(r.daysAhead, 14), 0, 90);
  const leadMs = clamp_(num_(r.leadHours, 0), 0, 8760) * 3600000;
  const maxPerDay = clamp_(num_(r.maxPerDay, 0), 0, 100);

  // 1=週一 … 7=週日。沒填就週一到週五。
  const weekdays = (r.weekdays && r.weekdays.length ? r.weekdays : [1, 2, 3, 4, 5]).map(Number);

  const from = parseHM_(r.dayStart, 9, 0);
  const to = parseHM_(r.dayEnd, 18, 0);

  const now = new Date();
  const earliest = now.getTime() + leadMs;
  const slots = [];

  // 整個範圍只問一次。以前是「每天 × 每個行事曆」各問一次，
  // 接上全公司的行事曆之後那個數字會爆掉。
  const rangeFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead + 1);
  const fb = busyBlocks_(r.calendarIds, rangeFrom, rangeTo);

  for (let d = 0; d <= daysAhead; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dow = day.getDay() === 0 ? 7 : day.getDay();   // getDay() 是 0=週日
    if (weekdays.indexOf(dow) < 0) continue;

    const dayFrom = new Date(day.getFullYear(), day.getMonth(), day.getDate(), from.h, from.m, 0, 0);
    const dayTo = new Date(day.getFullYear(), day.getMonth(), day.getDate(), to.h, to.m, 0, 0);
    if (dayTo.getTime() <= dayFrom.getTime()) continue;
    if (dayTo.getTime() < earliest) continue;

    // 從整段的忙碌清單裡挑出跟今天有關的那些
    const busy = fb.busy.filter(function (b) {
      return b.s < dayTo.getTime() && b.e > dayFrom.getTime();
    });

    let added = 0;
    const step = Math.max(1, slotMin + gapMin) * 60000;
    for (let t = dayFrom.getTime(); t + slotMin * 60000 <= dayTo.getTime(); t += step) {
      if (maxPerDay && added >= maxPerDay) break;
      const s = t;
      const e = t + slotMin * 60000;
      if (s < earliest) continue;
      let clash = false;
      for (let i = 0; i < busy.length; i++) {
        if (s < busy[i].e && e > busy[i].s) { clash = true; break; }
      }
      if (clash) continue;
      slots.push({ startAt: new Date(s).toISOString(), minutes: slotMin });
      added++;
    }
  }

  return {
    ok: true,
    slots: slots,
    count: slots.length,
    tz: Session.getScriptTimeZone(),
    calendars: fb.ids,
    problems: fb.problems,   // 哪些行事曆讀不到，後台要顯示出來
  };
}

/**
 * 數字參數。
 *
 * 不要用 `parseInt(x) || 預設值`：那樣寫的話，合法的 0 會被當成「沒填」
 * 而換成預設值。「可以約到幾天後 = 0」的意思是「只開今天」，不是「開兩週」。
 */
function num_(v, def) {
  const n = Number(v);
  return isNaN(n) || !isFinite(n) ? def : n;
}

function clamp_(n, lo, hi) {
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

/** 'HH:MM' → {h, m}。壞掉就用預設值，不要讓前台整個約不到。 */
function parseHM_(s, dh, dm) {
  const parts = String(s || '').split(':');
  if (parts.length !== 2) return { h: dh, m: dm };
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return { h: dh, m: dm };
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, m)) };
}

// ── 預約：寫試算表 ＋ 開行事曆 ──────────────────────────────────

/**
 * body: { row: {...}, calendar: { startAt, minutes, title, description, guestEmail }, rules? }
 *
 * 開活動之前會**再檢查一次這個時間還空著**。官網前台看到的可約時段是快取的
 * （最久一小時前算的），這段時間裡 Robin 可能自己在行事曆上排了別的事。
 * 行事曆是真相，所以最後一刻以這裡的檢查為準，撞期就回 taken，
 * 讓官網告訴客戶「這個時間剛剛被佔走了，請選別的」。
 *
 * 把對方加成與會者，Google 會自動寄一封行事曆邀請給他。
 * 他按「是」就等於確認了這場會議，而且這場會直接進他的手機行事曆。
 *
 * 回傳 eventId，官網存起來，之後要查他按了什麼、或要取消才找得到這場活動。
 */
function handleBooking_(body) {
  const c = body.calendar;
  const r = body.rules || {};

  // 先檢查時間，再寫試算表。順序反過來的話，撞期的人也會留在名單上，
  // 而他其實沒約到——那份表就不能直接拿去跟進了。
  if (c && c.startAt) {
    const s0 = new Date(c.startAt);
    const e0 = new Date(s0.getTime() + (parseInt(c.minutes, 10) || 30) * 60000);
    // FreeBusy 回的區段已經裁切到查詢範圍內，所以「有回東西」就等於撞期
    const fb = busyBlocks_(r.calendarIds, s0, e0);
    if (fb.busy.length) return { ok: false, error: 'taken' };
  }

  const sheetResult = appendLead_(body);

  if (!c || !c.startAt) return { ok: true, sheet: sheetResult, calendar: null };

  const cal = writeCalendar_();
  const start = new Date(c.startAt);
  const end = new Date(start.getTime() + (parseInt(c.minutes, 10) || 30) * 60000);

  const ev = cal.createEvent(c.title || '30 分鐘諮詢', start, end, {
    description: c.description || '',
    guests: c.guestEmail || '',
    sendInvites: true,
  });

  return { ok: true, sheet: sheetResult, calendar: { ok: true, eventId: ev.getId() } };
}

/**
 * 查對方按了「是」還是「否」。
 * body: { items: [{ eventId, email }] }
 *
 * 回 yes / no / maybe / invited（還沒按）/ gone（活動被刪了）/ error。
 * 官網的 Cron 每小時來問一次，把 yes 的預約標成已確認、no 的標成已取消。
 *
 * 為什麼是官網來問、不是這邊主動通知官網：主動通知要在官網開一支對外的
 * 寫入端點，又多一把鑰匙要管。官網的 Cron 本來就在跑，順便問一下最省事，
 * 而且逾時自動取消是 24 小時，每小時問一次綽綽有餘。
 */
function eventStatus_(body) {
  const items = body.items || [];
  if (!items.length) return { ok: true, results: [] };

  const cal = writeCalendar_();
  const results = items.map(function (it) {
    try {
      const ev = cal.getEventById(it.eventId);
      if (!ev) return { eventId: it.eventId, status: 'gone' };
      const g = ev.getGuestByEmail(String(it.email || ''));
      if (!g) return { eventId: it.eventId, status: 'invited' };
      const st = g.getGuestStatus();
      if (st === CalendarApp.GuestStatus.YES) return { eventId: it.eventId, status: 'yes' };
      if (st === CalendarApp.GuestStatus.NO) return { eventId: it.eventId, status: 'no' };
      if (st === CalendarApp.GuestStatus.MAYBE) return { eventId: it.eventId, status: 'maybe' };
      return { eventId: it.eventId, status: 'invited' };
    } catch (e) {
      return { eventId: it.eventId, status: 'error', error: String(e).slice(0, 120) };
    }
  });
  return { ok: true, results: results };
}

/**
 * 取消一場預約的行事曆活動。
 * body: { eventId }
 *
 * deleteEvent() 會通知與會者，所以客戶那邊的行事曆也會自己消失。
 */
function cancelEvent_(body) {
  try {
    const ev = writeCalendar_().getEventById(body.eventId);
    if (!ev) return { ok: true, note: '活動已經不在了' };
    ev.deleteEvent();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
