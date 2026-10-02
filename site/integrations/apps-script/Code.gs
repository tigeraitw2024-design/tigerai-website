/**
 * 官網的 Google 中繼站。
 *
 * Cloudflare Workers 的網路只允許 HTTP，不能開 SMTP 連線，所以沒辦法直接登入
 * Gmail 寄信。這支小程式跑在 Google 自己的機器上，收到官網的 HTTP 請求之後
 * 代為執行三件事：
 *
 *   action: 'mail'     用這個帳號的 Gmail 寄一封信
 *   action: 'lead'     把一列資料寫進 Google 試算表（CRM 每 2 小時來抓）
 *   action: 'booking'  同上，另外在 Google 行事曆開一個時段並邀請對方
 *   action: 'cancelEvent'  取消行事曆上的那一場
 *
 * ── 這支程式用哪個帳號跑很重要 ────────────────────────────────
 * Apps Script 是以「擁有者的身分」執行，所以它有權限讀寫這個帳號的所有信件、
 * 試算表與行事曆。**請用官網專用的 Google 帳號**，不要用你的主帳號——
 * 這個網址萬一外流，波及範圍就只有那個專用帳號。
 *
 * 要讓自己看得到資料，用「分享」而不是「共用帳號」：
 *   試算表 → 分享給你的公司信箱
 *   行事曆 → 設定 → 與特定使用者共用 → 加你的公司信箱
 * 這樣你在自己的 Google 日曆裡就看得到所有預約，但腳本碰不到你的帳號。
 *
 * ── 部署步驟 ──────────────────────────────────────────────────
 * 1. 用官網專用帳號登入 https://script.google.com ，新增專案
 * 2. 把編輯區內容全部刪掉，貼上這整份
 * 3. 改下面三個設定：SECRET、SHEET_ID、CALENDAR_ID
 * 4. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *      執行身分：我自己
 *      具有存取權的使用者：任何人        ← 一定要選這個，Cloudflare 才打得到
 * 5. 第一次會要求授權，按「允許」
 * 6. 複製產生的網址（.../exec 結尾），連同 SECRET 一起給工程端
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

/** 要把預約寫進哪個行事曆。留空就用這個帳號的主行事曆。 */
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
      case 'booking': return json(handleBooking_(body));
      case 'cancelEvent': return json(cancelEvent_(body));
      case 'ping': return json({ ok: true, at: new Date().toISOString() });
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

// ── 預約：寫試算表 ＋ 開行事曆 ──────────────────────────────────

/**
 * body: { row: {...}, calendar: { startAt, minutes, title, description, guestEmail } }
 *
 * 把對方加成與會者，Google 會自動寄一封行事曆邀請給他。
 * 他按「是」就等於確認了這場會議，而且這場會直接進他的手機行事曆。
 *
 * 回傳 eventId，官網存起來，之後要改時間或取消才找得到這場活動。
 */
function handleBooking_(body) {
  const sheetResult = appendLead_(body);

  const c = body.calendar;
  if (!c || !c.startAt) return { ok: true, sheet: sheetResult, calendar: null };

  const cal = CALENDAR_ID ? CalendarApp.getCalendarById(CALENDAR_ID) : CalendarApp.getDefaultCalendar();
  if (!cal) return { ok: true, sheet: sheetResult, calendar: { ok: false, error: '找不到行事曆' } };

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
 * 取消一場預約的行事曆活動。
 * body: { action:'cancelEvent', eventId }
 */
function cancelEvent_(body) {
  const cal = CALENDAR_ID ? CalendarApp.getCalendarById(CALENDAR_ID) : CalendarApp.getDefaultCalendar();
  const ev = cal.getEventById(body.eventId);
  if (!ev) return { ok: false, error: '找不到這場活動' };
  ev.deleteEvent();
  return { ok: true };
}
