/**
 * 在瀏覽器裡把 .xlsx / .csv 讀成「表頭 + 資料列」，再自動對應到證照欄位。
 *
 * 不裝任何套件：xlsx 其實是一包 ZIP + XML，用瀏覽器內建的 DecompressionStream
 * 解壓、DOMParser 讀 XML 就夠了（跟出圖那邊自寫 ZIP 同一個原則）。
 * 對應只用關鍵字猜，猜完的結果會攤在畫面上給人改，所以猜錯不會造成損失。
 */

export type Grid = { headers: string[]; rows: string[][] };

/** 可對應到的證照欄位。順序＝自動猜的優先序（越特定的放越前面）。 */
export const FIELDS: { key: string; label: string; kw: string[] }[] = [
  { key: 'recipientName', label: '收件人（寄送用中文名）', kw: ['收件人', '寄信', '寄件', '中文名', 'recipient', '收件'] },
  // 證照上印的英文名：優先吃「護照／證件英文名」這種較標準的欄，其次才是表單原本的老師姓名。
  { key: 'studentName', label: '★ 證照姓名（印在證照上）', kw: ['護照', 'passport', '英文全名', 'official', '證件英文', '英文姓名', '羅馬', 'name on', '老師姓名', '證照姓名', '學員', 'student'] },
  { key: 'certUrl', label: 'n8n 證照原檔連結', kw: ['電子檔', '證照電子', '連結', '檔案', 'drive', 'url', 'link', 'pdf'] },
  { key: 'courseName', label: '梯次／班級', kw: ['梯次', '班級'] },
  { key: 'issueDate', label: '發證日期', kw: ['發證', '發證日期', 'issue date', '證照日期'] },
  { key: 'course', label: '證照名稱', kw: ['證照名稱', '課程名稱', '級別', 'level'] },
  { key: 'org', label: '單位／學校', kw: ['單位', '學校', '機構', '公司', '學程', '系所', 'school', 'org'] },
  { key: 'jobTitle', label: '職稱', kw: ['職稱', '職位', 'title', 'position'] },
  { key: 'email', label: 'Email', kw: ['email', 'e-mail', '信箱', '電子郵件'] },
  { key: 'phone', label: '電話', kw: ['電話', '手機', 'phone', 'mobile', 'tel'] },
  { key: 'zip', label: '郵遞區號（會併進地址）', kw: ['郵遞', '郵區', 'zip', 'postal'] },
  { key: 'address', label: '地址', kw: ['地址', 'address', 'addr'] },
  { key: 'note', label: '備註', kw: ['備註', '備注', 'note', 'remark', '說明'] },
  { key: 'fee', label: '費用', kw: ['費用', '金額', 'fee', 'price', 'amount'] },
];

// 這些是表單常見、但不該被當成資料的欄位，排在最後才考慮（避免 Email Address、Timestamp 搶掉）。
const META = ['email address', 'timestamp', '電子郵件地址', 'email 位址', 'email位址'];

/** 依表頭關鍵字猜每一欄對應到哪個證照欄位。回傳長度＝欄數，每格是欄位 key 或 ''（略過）。 */
export function guessMapping(headers: string[]): string[] {
  const norm = headers.map((h) => (h || '').toString().trim().toLowerCase());
  const map = new Array(headers.length).fill('');
  const used = new Set<number>();
  // 照關鍵字的優先序比對：越前面的關鍵字越優先（所以「護照英文名」會贏過「老師姓名」）。
  const pick = (kw: string[], allowMeta: boolean) => {
    for (const k of kw) {
      const kl = k.toLowerCase();
      for (let i = 0; i < norm.length; i++) {
        if (used.has(i) || !norm[i]) continue;
        if (!allowMeta && META.includes(norm[i])) continue;
        if (norm[i].includes(kl)) return i;
      }
    }
    return -1;
  };
  for (const allowMeta of [false, true]) {
    for (const f of FIELDS) {
      if (map.includes(f.key)) continue;
      const i = pick(f.kw, allowMeta);
      if (i >= 0) { map[i] = f.key; used.add(i); }
    }
  }
  return map;
}

/** 把資料列 + 對應表，整理成要送出去的證照紀錄。studentName 是必要的，空的那列會跳過。 */
export function buildRecords(
  rows: string[][], map: string[], defaults: { course?: string; fee?: number },
): Record<string, string | number>[] {
  const out: Record<string, string | number>[] = [];
  for (const r of rows) {
    const o: Record<string, string> = {};
    let zip = '';
    map.forEach((key, i) => {
      if (!key) return;
      const v = (r[i] ?? '').toString().trim();
      if (!v) return;
      if (key === 'zip') { zip = v.replace(/\.0$/, ''); return; }
      o[key] = v;
    });
    if (zip) o.address = (zip + ' ' + (o.address || '')).trim();
    if (!(o.studentName || '').trim()) continue;
    if (defaults.course && !o.course) o.course = defaults.course;
    const rec: Record<string, string | number> = { ...o, fee: defaults.fee ?? 200 };
    out.push(rec);
  }
  return out;
}

// ── 檔案解析 ────────────────────────────────────────────────────────

/** 依副檔名／內容判斷是 xlsx 還是 csv，回傳表頭 + 資料列。 */
export async function parseFile(file: File): Promise<Grid> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return parseXlsx(await file.arrayBuffer());
  return parseCsvText(await file.text());
}

/** CSV 純文字 → 表頭 + 資料列。支援引號跳脫、逗號、換行。 */
export function parseCsvText(text: string): Grid {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const all: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); all.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); all.push(row); }
  const data = all.filter((r) => r.some((c) => c.trim() !== ''));
  if (!data.length) return { headers: [], rows: [] };
  return { headers: data[0].map((h) => h.trim()), rows: data.slice(1) };
}

// ── xlsx（ZIP + XML）─────────────────────────────────────────────────

async function parseXlsx(buf: ArrayBuffer): Promise<Grid> {
  const files = await unzip(buf);
  const shared = files.has('xl/sharedStrings.xml')
    ? parseShared(td(files.get('xl/sharedStrings.xml')!)) : [];
  // 取第一張工作表：優先 sheet1.xml，否則第一個 worksheets/*.xml
  let sheetName = 'xl/worksheets/sheet1.xml';
  if (!files.has(sheetName)) {
    sheetName = [...files.keys()].filter((n) => /^xl\/worksheets\/.*\.xml$/.test(n)).sort()[0] || '';
  }
  if (!sheetName || !files.has(sheetName)) throw new Error('這個 xlsx 裡找不到工作表。');
  const grid = parseSheet(td(files.get(sheetName)!), shared);
  if (!grid.length) return { headers: [], rows: [] };
  const headers = (grid[0] || []).map((h) => (h || '').trim());
  return { headers, rows: grid.slice(1).filter((r) => r.some((c) => (c || '').trim() !== '')) };
}

const td = (b: Uint8Array) => new TextDecoder('utf-8').decode(b);

/** 只解出需要的檔案（sharedStrings 與 worksheets），其餘不解壓以免浪費。 */
async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const dv = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('這不是有效的 xlsx 檔（缺 ZIP 結尾）。');
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const want = (n: string) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/.*\.xml$/.test(n);
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const compSize = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    const name = td(bytes.subarray(off + 46, off + 46 + nameLen));
    if (want(name)) {
      const lNameLen = dv.getUint16(lho + 26, true);
      const lExtraLen = dv.getUint16(lho + 28, true);
      const start = lho + 30 + lNameLen + lExtraLen;
      const comp = bytes.subarray(start, start + compSize);
      out.set(name, method === 0 ? comp.slice() : await inflateRaw(comp));
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream;
  if (typeof DS !== 'function') {
    throw new Error('這個瀏覽器不支援解壓 xlsx。請改用 CSV 匯入，或換新版 Chrome／Edge。');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DS('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseShared(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return [...doc.getElementsByTagName('si')].map((si) =>
    [...si.getElementsByTagName('t')].map((t) => t.textContent || '').join(''));
}

function colToIdx(ref: string): number {
  let s = 0;
  for (const ch of ref) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) s = s * 26 + (c - 64);
    else if (c >= 97 && c <= 122) s = s * 26 + (c - 96);
    else break;
  }
  return s - 1;
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const grid: string[][] = [];
  for (const rowEl of [...doc.getElementsByTagName('row')]) {
    const arr: string[] = [];
    let auto = 0;
    for (const c of [...rowEl.getElementsByTagName('c')]) {
      const ref = c.getAttribute('r') || '';
      const idx = ref ? colToIdx(ref) : auto;
      auto = (idx >= 0 ? idx : auto) + 1;
      const t = c.getAttribute('t');
      let val = '';
      if (t === 'inlineStr') {
        val = [...c.getElementsByTagName('t')].map((x) => x.textContent || '').join('');
      } else {
        const v = c.getElementsByTagName('v')[0];
        const raw = v ? (v.textContent || '') : '';
        val = t === 's' ? (shared[parseInt(raw, 10)] || '') : raw;
      }
      if (idx >= 0) arr[idx] = val;
    }
    for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';
    grid.push(arr);
  }
  return grid;
}
