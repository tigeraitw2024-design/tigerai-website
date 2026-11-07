import { useEffect, useMemo, useState } from 'react';
import { api, type Cert, type TeacherUser, type Instructor, type BillingConfig } from '../api';
import Icon from '../Icon';
import Name from '../Name';
import { parseFile, parseCsvText, guessMapping, buildRecords, FIELDS, validateRecord, isEmail, isPhoneTW, isAddressTW, type Grid } from '../importParse';
import { downloadBlob } from '../certExport';

/**
 * 證照主控台：講師區的主畫面。
 *
 * 一份資料兩種呈現——手機是卡片、桌機是表格（CSS 切換）。勾選後底部浮出
 * 動作列：誰都能「產生證照」拿去出圖；owner 另外能批次標「已列印／已寄送」。
 * 列表的範圍後端已經依身分切好（instructor 只拿得到自己的），前端只管篩選呈現。
 */

type StatusFilter = 'all' | 'pending' | 'making' | 'printed' | 'shipped' | 'paid' | 'editreq';
const matchFilter = (r: Cert, s: StatusFilter) =>
  s === 'all' ? true
    : s === 'pending' ? !r.accepted
    : s === 'making' ? r.accepted && !r.printed
    : s === 'printed' ? r.printed && !r.shipped
    : s === 'shipped' ? r.shipped
    : s === 'paid' ? !!r.paid
    : s === 'editreq' ? !!r.editRequest
    : true;

/** 狀態推導：待確認 →（owner 接單）製作中 → 已列印 → 已寄出。 */
function statusOf(r: Cert): { label: string; tone: string } {
  if (r.shipped) return { label: '已寄出', tone: 'ok' };
  if (r.printed) return { label: '已列印', tone: 'warn' };
  if (r.accepted) return { label: '製作中', tone: 'warn' };
  return { label: '待確認', tone: 'off' };
}

/** 可排序的時間欄位：拿來回追「什麼時候送出／接單／列印／寄出／匯款／結算」。 */
type SortKey = 'created' | 'accepted' | 'printed' | 'shipped' | 'paid' | 'settled';
const TS: Record<SortKey, (r: Cert) => string> = {
  created: (r) => r.createdAt || '', accepted: (r) => r.acceptedAt || '',
  printed: (r) => r.printedAt || '', shipped: (r) => r.shippedAt || '',
  paid: (r) => r.paidAt || '', settled: (r) => r.settledAt || '',
};
const SORT_OPTS: [SortKey, string][] = [
  ['created', '送出時間'], ['accepted', '接單時間'], ['printed', '列印時間'],
  ['shipped', '寄出時間'], ['paid', '匯款時間'], ['settled', '結算時間'],
];
const SORT_LABEL: Record<SortKey, string> = { created: '送出', accepted: '接單', printed: '列印', shipped: '寄出', paid: '匯款', settled: '結算' };

/** 單號旁的「複製」小鈕：點一下把郵局單號複製到剪貼簿，方便去查件。 */
function CopyNo({ no }: { no: string }) {
  const [done, setDone] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    try { await navigator.clipboard.writeText(no); }
    catch {
      try { const ta = document.createElement('textarea'); ta.value = no; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch { /* 複製不了就算了 */ }
    }
    setDone(true); setTimeout(() => setDone(false), 1500);
  }
  return <button type="button" className="t-copybtn" onClick={copy} title={`複製單號 ${no}`}>{done ? '已複製 ✓' : '複製'}</button>;
}

/** 把 ISO 時間戳（UTC）顯示成台北時間「YYYY-MM-DD HH:mm」。空字串就回空。 */
function fmtStamp(iso?: string): string {
  const s = (iso || '').trim();
  if (!s) return '';
  const d = new Date(new Date(s).getTime() + 8 * 3600 * 1000);
  if (isNaN(d.getTime())) return s.slice(0, 16).replace('T', ' ');
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default function Console({ user, onGenerate }: { user: TeacherUser; onGenerate: (certs: Cert[]) => void }) {
  const isOwner = user.role === 'owner';
  const [rows, setRows] = useState<Cert[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>(() => {
    // 從儀表板點某一格進來時，帶著那個篩選（用完就清掉）。
    try { const f = sessionStorage.getItem('tg_cert_filter'); if (f) { sessionStorage.removeItem('tg_cert_filter'); return f as StatusFilter; } } catch { /* 無痕視窗 */ }
    return 'all';
  });
  const [sortBy, setSortBy] = useState<SortKey>('created');   // 回追用：照哪個階段的時間排
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState<'' | 'add' | 'import'>('');
  const [edit, setEdit] = useState<Cert | null>(null);   // 正在編輯的那筆
  const [req, setReq] = useState<Cert | null>(null);      // 正在申請修改的那筆（講師）
  const [ret, setRet] = useState<Cert | null>(null);      // 正在退件的那筆（owner）
  const [reassign, setReassign] = useState(false);        // 改派講師對話框（owner）
  const [ship, setShip] = useState<Cert[] | null>(null);  // 寄出對話框（填單號/掛號費＋批次成本）
  const [banner, setBanner] = useState('');               // 接單成功提示（含預計天數）

  const [billing, setBilling] = useState<BillingConfig | null>(null);
  async function load() {
    setErr('');
    try { setRows((await api.get<{ items: Cert[] }>('/api/teacher/certs')).items); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);
  // 寄件人資訊（印地址標籤用）；讀不到就先不印寄件人，不擋功能。
  useEffect(() => { api.get<{ billing: BillingConfig }>('/api/teacher/billing').then((r) => setBilling(r.billing)).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    let r = (rows || []).filter((x) => matchFilter(x, status));
    const kw = q.trim().toLowerCase();
    if (kw) r = r.filter((x) =>
      [x.studentName, x.serial, x.courseName, x.instructorName, x.address, x.email, x.course]
        .some((v) => (v || '').toLowerCase().includes(kw)));
    const get = TS[sortBy]; const dir = sortDir === 'asc' ? 1 : -1;
    r = [...r].sort((a, b) => {
      const ta = get(a), tb = get(b);
      if (!ta && !tb) return 0;
      if (!ta) return 1; if (!tb) return -1;        // 還沒走到這階段的（沒時間）一律排最後
      return ta < tb ? -dir : ta > tb ? dir : 0;
    });
    return r;
  }, [rows, status, q, sortBy, sortDir]);

  const counts = useMemo(() => {
    const r = rows || [];
    const c = (s: StatusFilter) => r.filter((x) => matchFilter(x, s)).length;
    return { all: r.length, pending: c('pending'), making: c('making'), printed: c('printed'), shipped: c('shipped'), paid: c('paid'), editreq: c('editreq') };
  }, [rows]);

  const selCerts = useMemo(() => (rows || []).filter((r) => sel.has(r.id)), [rows, sel]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = filtered.length > 0 && filtered.every((r) => sel.has(r.id));
  const toggleAll = () => setSel((s) => {
    const n = new Set(s);
    if (allOn) filtered.forEach((r) => n.delete(r.id));
    else filtered.forEach((r) => n.add(r.id));
    return n;
  });

  async function mark(field: 'printed' | 'shipped', value: boolean) {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy(field);
    try {
      await api.post('/api/teacher/certs/mark', { ids, field, value });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(''); }
  }

  // 接單：收下選取的單、鎖定、算預計寄出日，並把天數提示顯示出來。
  async function accept() {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy('accept'); setBanner('');
    try {
      const r = await api.post<{ count: number; days: number; printDays: number; shipDays: number; etaDate: string }>(
        '/api/teacher/certs/accept', { ids });
      setBanner(`已接單 ${r.count} 筆。印刷 ${r.printDays} 天＋寄送 ${r.shipDays} 天＝共 ${r.days} 天，預計 ${r.etaDate} 前寄出。`);
      setSel(new Set());
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(''); }
  }

  // owner 忽略某筆的修改申請（不照改、直接清掉標記）。
  async function dismiss(id: string) {
    try { await api.post(`/api/teacher/certs/${id}/dismiss-edit`); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  // 刪除一筆：owner 任何時候；講師只有自己的、且還沒接單（已接單在製作中不給刪）。
  const canDelete = (r: Cert) => isOwner || !r.accepted;
  async function del(c: Cert) {
    if (!canDelete(c)) return;
    if (!window.confirm(`確定刪除「${c.studentName}」這一筆？刪掉就救不回來了。`)) return;
    try { await api.del(`/api/teacher/certs/${c.id}`); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  // 批次標記已結算（owner 對帳收款後封存）。
  async function settle(value: boolean) {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy('settle');
    try { await api.post('/api/teacher/certs/settle', { ids, value }); await load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(''); }
  }

  // 把目前清單（含篩選/搜尋結果）匯出成 CSV，給會計或備份。
  function exportCsv() {
    const cols: [string, (r: Cert) => unknown][] = [
      ['編號', (r) => r.serial], ['學員(英文名)', (r) => r.studentName], ['收件人', (r) => r.recipientName],
      ['證照', (r) => r.course], ['發證日期', (r) => r.issueDate], ['梯次', (r) => r.courseName],
      ['Email', (r) => r.email], ['電話', (r) => r.phone], ['地址', (r) => r.address], ['證明連結', (r) => r.certUrl],
      ['費用', (r) => r.fee], ['狀態', (r) => statusOf(r).label], ['物流單號', (r) => r.tracking],
      ['已匯款', (r) => (r.paid ? '是' : '')], ['匯款後五碼', (r) => r.payLast5], ['已結算', (r) => (r.settled ? '是' : '')], ['結算時間', (r) => (r.settled ? fmtStamp(r.settledAt) : '')],
      ['講師', (r) => r.instructorName], ['建立', (r) => (r.createdAt || '').slice(0, 10)],
    ];
    const lines = [cols.map((c) => c[0]).join(',')];
    for (const r of filtered) lines.push(cols.map((c) => `"${String(c[1](r) ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `證照名單_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // 下載完整備份（owner）：名冊＋全部證照＋設定，存成 JSON 檔放自己電腦，隨時可查。
  async function backup() {
    setErr('');
    try {
      const data = await api.get<unknown>('/api/teacher/export');
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `虎智講師區備份_${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e: any) { setErr(e.message); }
  }

  // 列印寄送地址標籤：開一個乾淨的列印視窗（一頁多張）。每張含寄件人（回郵）＋收件人＋證書編號。
  function printLabels(list: Cert[]) {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] as string));
    const nl = (s: unknown) => esc(s).replace(/\n/g, '<br>');
    const b = billing;
    const senderLines = b ? [b.senderCompany, b.senderAddr, [b.senderPerson, b.senderPhone].filter(Boolean).join('　')].filter(Boolean).map(nl).join('<br>') : '';
    const sender = senderLines ? `<div class="from"><span class="tag">寄件人</span>${senderLines}</div>` : '';
    const labels = list.map((c) => {
      const serial = c.serial ? `<div class="sn">證書編號　${esc(c.serial)}</div>` : '';
      const zh = (c.recipientName || c.studentName || '').trim();
      const en = (c.recipientName && c.studentName && c.recipientName !== c.studentName) ? `<div class="toen">${esc(c.studentName)}</div>` : '';
      return `<div class="lbl">${sender}<div class="toblk"><div class="to">${esc(zh)} 收</div>${en}`
        + `<div class="ad">${esc(c.address) || '（沒有地址）'}</div><div class="ph">${esc(c.phone)}</div>${serial}</div></div>`;
    }).join('');
    const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>寄送地址標籤</title>`
      + `<style>body{font-family:"Microsoft JhengHei","微軟正黑體",sans-serif;margin:0;padding:10mm;color:#111}`
      + `.grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.lbl{border:1px solid #bbb;border-radius:3mm;padding:6mm;min-height:40mm;break-inside:avoid;display:flex;flex-direction:column}`
      + `.from{font-size:9.5pt;color:#555;line-height:1.5;padding-bottom:3mm;margin-bottom:3mm;border-bottom:1px dashed #ccc}`
      + `.from .tag{display:inline-block;background:#eee;color:#333;border-radius:2mm;padding:0 2mm;margin-right:2mm;font-size:8.5pt}`
      + `.toblk{flex:1;display:flex;flex-direction:column;justify-content:center}`
      + `.to{font-size:16pt;font-weight:700}.toen{font-size:11pt;color:#555;margin:1mm 0 3mm}.ad{font-size:13pt;line-height:1.55}.ph{font-size:11pt;color:#555;margin-top:2mm}`
      + `.sn{font-size:10pt;color:#777;margin-top:3mm;font-variant-numeric:tabular-nums}`
      + `.bar{margin-bottom:8mm}@media print{.bar{display:none}}</style></head>`
      + `<body><div class="bar"><button onclick="window.print()" style="padding:8px 16px;font-size:14px">列印 / 存成 PDF</button>　共 ${list.length} 張</div>`
      + `<div class="grid">${labels}</div></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { setErr('瀏覽器擋了彈出視窗，請允許彈出視窗後再試一次。'); return; }
    w.document.write(html); w.document.close();
  }

  return (
    <div>
      <h1 className="t-h1">證照</h1>
      <p className="t-intro">
        {isOwner
          ? '所有講師的證照都在這裡。勾選後可以「接單」（鎖定並算預計寄出日）、「產生證照」出圖列印，或標記已列印、已寄送。'
          : '把你班上通過的學員用「匯入 Excel」上傳上來就好，列印與寄送由虎智統一處理。狀態（待確認 → 製作中 → 已列印 → 已寄出）你隨時看得到；虎智接單前都還能自己改。'}
      </p>

      {!isOwner && <GuideSteps />}

      {err && <div className="t-msg t-msg--err">{err}</div>}
      {banner && <div className="t-msg t-msg--ok">{banner}</div>}

      <div className="t-toolbar">
        <div className="t-search" style={{ position: 'relative' }}>
          <input className="t-input" placeholder="搜尋姓名、編號、梯次、地址…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="t-btn t-btn--brand t-btn--sm" onClick={() => setModal('add')}><Icon name="plus" size={16} /> 新增</button>
        <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setModal('import')}><Icon name="upload" size={16} /> 匯入 Excel</button>
        {isOwner && rows && rows.length > 0 && <button className="t-btn t-btn--ghost t-btn--sm" onClick={exportCsv}><Icon name="download" size={16} /> 匯出 CSV</button>}
        {isOwner && <button className="t-btn t-btn--ghost t-btn--sm" onClick={backup}><Icon name="download" size={16} /> 備份</button>}
      </div>

      <div className="t-row" style={{ marginBottom: 14, gap: 6, flexWrap: 'wrap' }}>
        {([['all', '全部'], ['pending', '待確認'], ['making', '製作中'], ['printed', '已列印'], ['shipped', '已寄出'], ['paid', '已付款'], ['editreq', '修改申請']] as [StatusFilter, string][])
          .map(([v, label]) => (
            <button key={v} className="t-qp" data-tone={status === v ? 'warn' : undefined}
              onClick={() => setStatus(v)}>{label} <span className="t-mono" style={{ opacity: .7 }}>{counts[v]}</span></button>
          ))}
        <span className="t-spacer" />
        <label className="t-sort" title="照哪個階段的時間排，拿來回追">
          排序
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            {SORT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="button" onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}>{sortDir === 'desc' ? '新→舊' : '舊→新'}</button>
        </label>
        <span className="t-mono" style={{ fontSize: 12, color: 'var(--t-fg-3)', marginLeft: 8 }}>{filtered.length} 筆</span>
      </div>

      {rows === null ? (
        <div className="t-empty">載入中…</div>
      ) : filtered.length === 0 ? (
        <div className="t-empty">沒有符合的證照。{(rows.length === 0) && '先用「新增」或「匯入 Excel」把通過的學員加進來。'}</div>
      ) : (
        <>
          {/* 手機：卡片 */}
          <div className="t-cards">
            {isOwner && (
              <label className="t-check" style={{ marginBottom: 6, fontSize: 13, color: 'var(--t-fg-2)' }}>
                <input type="checkbox" checked={allOn} onChange={toggleAll} /> 全選這一頁（{filtered.length}）
              </label>
            )}
            {filtered.map((r) => (
              <div className="t-card" key={r.id} data-sel={sel.has(r.id) ? '1' : '0'}>
                <div className="t-card__top">
                  {isOwner && <input type="checkbox" style={{ width: 20, height: 20, accentColor: 'var(--t-brand)' }}
                    checked={sel.has(r.id)} onChange={() => toggle(r.id)} />}
                  <span className="t-card__t"><Name zh={r.recipientName} en={r.studentName} /></span>
                  <span className="t-spacer" />
                  {r.paid && <span className="t-pill" data-tone="ok">已付款</span>}
                  <span className="t-pill" data-tone={statusOf(r).tone}>{statusOf(r).label}</span>
                </div>
                <div className="t-card__meta">
                  {r.serial && <span><b>編號</b> {r.serial}</span>}
                  <span><b>證照</b> {r.course}</span>
                  {r.courseName && <span><b>梯次</b> {r.courseName}</span>}
                  {isOwner && <span><b>講師</b> {r.instructorName}</span>}
                  <span><b>費用</b> {r.fee} 元</span>
                  {r.accepted && !r.shipped && r.etaDate && <span><b>預計寄出</b> {r.etaDate}</span>}
                  {r.printed && <span><b>列印</b> {fmtStamp(r.printedAt) || '✓'}</span>}
                  {r.shipped && <span><b>寄出</b> {fmtStamp(r.shippedAt) || '✓'}{r.tracking ? <>　單號 {r.tracking} <CopyNo no={r.tracking} /></> : ''}</span>}
                  {r.paid && <span style={{ color: '#2e7d57' }}><b>已匯款</b> {fmtStamp(r.paidAt) || '✓'}{r.payLast5 ? `　後五碼 ${r.payLast5}` : ''}</span>}
                  {r.settled && <span style={{ color: '#2e7d57', fontWeight: 700 }}><b>已結算</b> {fmtStamp(r.settledAt) || '✓'}</span>}
                  {(sortBy === 'created' || sortBy === 'accepted') && TS[sortBy](r) && <span style={{ color: 'var(--t-fg-3)' }}><b>{SORT_LABEL[sortBy]}</b> {fmtStamp(TS[sortBy](r))}</span>}
                </div>
                {r.address && <div className="t-card__addr">📮 {r.address}</div>}
                {r.certUrl && <div className="t-card__meta"><a href={r.certUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--t-brand)', fontWeight: 600 }}>🔗 開啟證照證明</a></div>}
                {r.editRequest && <div className="t-card__addr" style={{ color: 'var(--t-danger)' }}>✎ 修改申請：{r.editRequest}</div>}
                {r.returnReason && <div className="t-card__addr" style={{ color: 'var(--t-danger)' }}>⤺ 已退件：{r.returnReason}</div>}
                <div className="t-row" style={{ gap: 8, marginTop: 2 }}>
                  {(isOwner || !r.accepted)
                    ? <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setEdit(r)}><Icon name="file-text" size={14} /> 編輯</button>
                    : <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setReq(r)}>✎ 申請修改</button>}
                  {isOwner && !r.accepted && <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setRet(r)}>退件</button>}
                  {isOwner && r.editRequest && <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => dismiss(r.id)}>忽略申請</button>}
                  {canDelete(r) && <button className="t-btn t-btn--ghost t-btn--sm" style={{ color: 'var(--t-danger)' }} onClick={() => del(r)}>刪除</button>}
                </div>
              </div>
            ))}
          </div>

          {/* 桌機：表格 */}
          <table className="t-table">
            <thead>
              <tr>
                {isOwner && <th style={{ width: 36 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /></th>}
                <th>學員</th><th>證照／梯次</th>{isOwner && <th>講師</th>}
                <th className="addr">寄送地址</th><th>狀態</th><th style={{ textAlign: 'right' }}>費用</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} data-sel={sel.has(r.id) ? '1' : '0'}
                  onClick={isOwner ? (e) => { if ((e.target as HTMLElement).tagName !== 'INPUT') toggle(r.id); } : undefined}
                  style={{ cursor: isOwner ? 'pointer' : 'default' }}>
                  {isOwner && <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                  <td><Name zh={r.recipientName} en={r.studentName} />{r.serial && <><br /><span className="t-mono" style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>編號 {r.serial}</span></>}</td>
                  <td>{r.course}{r.courseName ? <><br /><span style={{ color: 'var(--t-fg-3)', fontSize: 12 }}>{r.courseName}</span></> : null}</td>
                  {isOwner && <td>{r.instructorName}</td>}
                  <td className="addr">{r.address || <span style={{ color: 'var(--t-fg-3)' }}>—</span>}</td>
                  <td>
                    <span className="t-pill" data-tone={statusOf(r).tone}>{statusOf(r).label}</span>
                    {r.paid && <span className="t-pill" data-tone="ok" style={{ marginLeft: 4 }}>已付款</span>}
                    {r.settled && <span className="t-pill" data-tone="ok" style={{ marginLeft: 4 }}>已結算</span>}
                    {r.paid && <div style={{ fontSize: 11, color: '#2e7d57', marginTop: 2 }}>已匯款{r.payLast5 ? ` · 後五碼 ${r.payLast5}` : ''}</div>}
                    {r.settled && <div style={{ fontSize: 11, color: '#2e7d57', marginTop: 2, fontWeight: 600 }}>結算 {fmtStamp(r.settledAt)}</div>}
                    {r.printed && <div style={{ fontSize: 11, color: 'var(--t-fg-3)', marginTop: 2 }}>印 {fmtStamp(r.printedAt)}</div>}
                    {r.shipped && <div style={{ fontSize: 11, color: 'var(--t-fg-3)', marginTop: 2 }}>寄 {fmtStamp(r.shippedAt)}{r.tracking ? <>　單號 {r.tracking} <CopyNo no={r.tracking} /></> : ''}</div>}
                    {r.accepted && !r.shipped && r.etaDate && <div style={{ fontSize: 11, color: 'var(--t-fg-3)', marginTop: 2 }}>預計 {r.etaDate}</div>}
                    {(sortBy === 'created' || sortBy === 'accepted') && TS[sortBy](r) && <div style={{ fontSize: 11, color: 'var(--t-fg-3)', marginTop: 2 }}>{SORT_LABEL[sortBy]} {fmtStamp(TS[sortBy](r))}</div>}
                    {r.editRequest && <div style={{ fontSize: 11, color: 'var(--t-danger)', marginTop: 2 }}>✎ 修改申請</div>}
                    {r.returnReason && <div style={{ fontSize: 11, color: 'var(--t-danger)', marginTop: 2 }}>⤺ 已退件</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.fee}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    {r.certUrl && <a className="t-btn t-btn--ghost t-btn--sm" href={r.certUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: 4, textDecoration: 'none' }}>證明</a>}
                    {(isOwner || !r.accepted)
                      ? <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setEdit(r)}>編輯</button>
                      : <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setReq(r)}>申請修改</button>}
                    {isOwner && !r.accepted && <button className="t-btn t-btn--ghost t-btn--sm" style={{ marginLeft: 4 }} onClick={() => setRet(r)}>退件</button>}
                    {canDelete(r) && <button className="t-btn t-btn--ghost t-btn--sm" style={{ color: 'var(--t-danger)', marginLeft: 4 }} onClick={() => del(r)}>刪除</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* 批次動作只有 owner 有：出圖列印、標已印/已寄。講師只上傳與看狀態，不經手這些。 */}
      {isOwner && sel.size > 0 && (
        <div className="t-actionbar">
          <b>{sel.size} 筆已選</b>
          <button className="t-btn t-btn--brand t-btn--sm" disabled={!!busy} onClick={accept}>
            <Icon name="check" size={16} /> {busy === 'accept' ? '接單中…' : '接單'}
          </button>
          <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => onGenerate(selCerts)}>
            <Icon name="download" size={16} /> 產生證照
          </button>
          <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => printLabels(selCerts)}>
            <Icon name="mail" size={16} /> 地址標籤
          </button>
          {([
            { key: 'printed', label: '列印', icon: 'printer', on: () => mark('printed', true), off: () => mark('printed', false) },
            { key: 'shipped', label: '寄送', icon: 'truck', on: () => { if (selCerts.length) setShip(selCerts); }, off: () => mark('shipped', false) },
            { key: 'settled', label: '結算', icon: 'check', on: () => settle(true), off: () => settle(false) },
          ] as const).map((g) => (
            <span key={g.key} className="t-markgrp">
              <Icon name={g.icon} size={15} />
              <span className="t-markgrp__lbl">{g.label}</span>
              <button className="t-btn t-btn--ghost t-btn--sm" disabled={!!busy} onClick={g.on}>標記</button>
              <button className="t-btn t-btn--ghost t-btn--sm" disabled={!!busy} onClick={g.off} style={{ color: 'var(--t-fg-3)' }}>取消</button>
            </span>
          ))}
          <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setReassign(true)}>
            <Icon name="users" size={16} /> 改派講師
          </button>
          <button className="t-btn t-btn--ghost t-btn--sm t-spacer" onClick={() => setSel(new Set())}>清除</button>
        </div>
      )}

      {modal === 'add' && <AddModal isOwner={isOwner} onClose={() => setModal('')} onDone={() => { setModal(''); load(); }} />}
      {modal === 'import' && <ImportModal isOwner={isOwner}
        existing={new Set((rows || []).map((r) => `${(r.studentName || '').toLowerCase().trim()}|${(r.email || '').toLowerCase().trim()}`))}
        onClose={() => setModal('')} onDone={() => { setModal(''); load(); }} />}
      {edit && <EditModal cert={edit} isOwner={isOwner} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {req && <RequestModal cert={req} onClose={() => setReq(null)} onDone={() => { setReq(null); load(); }} />}
      {ret && <ReturnModal cert={ret} onClose={() => setRet(null)} onDone={() => { setRet(null); load(); }} />}
      {reassign && <ReassignModal certs={selCerts} onClose={() => setReassign(false)}
        onDone={() => { setReassign(false); setSel(new Set()); load(); }} />}
      {ship && <ShipModal certs={ship} onClose={() => setShip(null)}
        onDone={() => { setShip(null); setSel(new Set()); load(); }} />}
    </div>
  );
}

// 寄出（owner）：按「寄送 標記」跳出來。本批共同成本（輸出/信封/卡紙，每張一樣）填上面，
// 每一張的郵局單號＋掛號費逐筆填（每張寄不同地方，單號、掛號費都不一樣）。已寄過的會帶出現值可改。
function ShipModal({ certs, onClose, onDone }: { certs: Cert[]; onClose: () => void; onDone: () => void }) {
  const [cp, setCp] = useState('');     // 輸出（每張）
  const [ce, setCe] = useState('');     // 信封
  const [cc, setCc] = useState('');     // 卡紙
  const [cpost, setCpost] = useState(''); // 寄件費（每張，掛號費；填了就套到全部，特例逐筆再改）
  const [rows, setRows] = useState(() => certs.map((c) => ({
    id: c.id, zh: c.recipientName, en: c.studentName, serial: c.serial,
    tracking: c.tracking || '', postage: c.costPostage ? String(c.costPostage) : '',
  })));
  // 改批次寄件費＝把每一列都帶成這個值（之後要哪一列不一樣再單獨改）
  const setPostAll = (v: string) => { setCpost(v); setRows((rs) => rs.map((r) => ({ ...r, postage: v }))); };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const setRow = (id: string, k: 'tracking' | 'postage', v: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const items = rows.map((r) => ({ id: r.id, tracking: r.tracking.trim(), costPostage: Number(r.postage) || 0 }));
    const batch: Record<string, number> = {};
    if (cp !== '') batch.costPrint = Number(cp) || 0;
    if (ce !== '') batch.costEnvelope = Number(ce) || 0;
    if (cc !== '') batch.costCard = Number(cc) || 0;
    try { await api.post('/api/teacher/certs/ship', { items, batch }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" style={{ maxWidth: 680, width: '94vw' }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>標記寄出（{certs.length} 張）</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        <p className="t-f__help" style={{ marginBottom: 10 }}>去郵局寄完回來填。<b>本批共同成本</b>（每張一樣，含寄件費）填這排，會自動帶到每一張；<b>每一張的郵局單號</b>逐筆填（各寄不同地方）。哪一張寄件費不一樣，下面那一列再單獨改。空白就不動。</p>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        <div className="t-row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="t-f" style={{ flex: '1 1 130px', margin: 0 }}><label className="t-f__label">輸出（每張）</label>
            <input className="t-input" type="number" min={0} value={cp} onChange={(e) => setCp(e.target.value)} placeholder="印證書費" /></div>
          <div className="t-f" style={{ flex: '1 1 130px', margin: 0 }}><label className="t-f__label">信封（每張）</label>
            <input className="t-input" type="number" min={0} value={ce} onChange={(e) => setCe(e.target.value)} /></div>
          <div className="t-f" style={{ flex: '1 1 130px', margin: 0 }}><label className="t-f__label">卡紙（每張）</label>
            <input className="t-input" type="number" min={0} value={cc} onChange={(e) => setCc(e.target.value)} /></div>
          <div className="t-f" style={{ flex: '1 1 130px', margin: 0 }}><label className="t-f__label">寄件費（每張）</label>
            <input className="t-input" type="number" min={0} value={cpost} onChange={(e) => setPostAll(e.target.value)} placeholder="掛號費" /></div>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '44vh', border: '1px solid var(--t-line)', borderRadius: 6 }}>
          <table className="t-report">
            <thead><tr><th>學員</th><th>郵局單號</th><th className="num" style={{ width: 120 }}>寄件費（可改）</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Name zh={r.zh} en={r.en} />{r.serial ? <><br /><span className="t-mono" style={{ fontSize: 11, color: 'var(--t-fg-3)' }}>{r.serial}</span></> : null}</td>
                  <td><input className="t-input" value={r.tracking} onChange={(e) => setRow(r.id, 'tracking', e.target.value)} placeholder="郵局單號" /></td>
                  <td className="num"><input className="t-input" type="number" min={0} style={{ width: 96, textAlign: 'right' }} value={r.postage} onChange={(e) => setRow(r.id, 'postage', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="t-row" style={{ marginTop: 12 }}>
          <button className="t-btn t-btn--brand" disabled={busy}>{busy ? '處理中…' : `確定寄出 ${certs.length} 張`}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// 改派講師（owner）：把選到的證照整批換到名冊裡另一位講師名下。
function ReassignModal({ certs, onClose, onDone }: { certs: Cert[]; onClose: () => void; onDone: () => void }) {
  const [list, setList] = useState<Instructor[] | null>(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<{ items: Instructor[] }>('/api/teacher/instructors')
      .then((r) => setList(r.items)).catch((e) => setErr(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to) { setErr('請先選要改派給誰。'); return; }
    setErr(''); setBusy(true);
    try { await api.post('/api/teacher/certs/reassign', { ids: certs.map((c) => c.id), instructorId: to }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const fromNames = [...new Set(certs.map((c) => c.instructorName).filter(Boolean))].join('、') || '（未指定）';
  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>改派講師</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        <p className="t-f__help" style={{ marginBottom: 10 }}>
          把選到的 <b>{certs.length}</b> 筆（目前掛在 {fromNames}）整批換到另一位講師名下。對方登入後就會在自己的清單看到這些。
        </p>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        <div className="t-f"><label className="t-f__label">改派給</label>
          {list === null ? <div className="t-f__help">載入名冊中…</div> : (
            <select className="t-input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">— 選一位講師 —</option>
              {list.map((i) => <option key={i.id} value={i.id}>{i.name}（{i.email}）{i.role === 'owner' ? '· owner' : ''}</option>)}
            </select>
          )}
        </div>
        <p className="t-f__help" style={{ marginTop: 6 }}>找不到人？先到「名冊」把他加進來（用他的 Gmail），再回來改派。</p>
        <div className="t-row" style={{ marginTop: 12 }}>
          <button className="t-btn t-btn--brand" disabled={busy || !to}>{busy ? '改派中…' : `改派這 ${certs.length} 筆`}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// ── 講師使用說明（圖解五步，可收起，記在瀏覽器）──────────────────
function GuideSteps() {
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return localStorage.getItem('tg_guide_hidden') === '1'; } catch { return false; }
  });
  const set = (v: boolean) => { setHidden(v); try { localStorage.setItem('tg_guide_hidden', v ? '1' : '0'); } catch { /* 無痕視窗讀不到，略過 */ } };
  const STEPS: [string, string, string][] = [
    ['check', '確認考過', '先確認學員真的考過 n8n——你是第一線把關，沒考過不能發。'],
    ['list', '備齊資料', '英文姓名（護照拼音）、收件中文名、電話、完整地址。'],
    ['award', '附上證明', '貼上他的 n8n 證照連結當證明，沒有證明別送。'],
    ['upload', '送出', '「匯入 Excel」整批上傳，或「新增」一位一位加。'],
    ['truck', '等處理', '虎智接單 → 列印 → 寄送，狀態你在下面清單看得到。'],
  ];
  if (hidden) {
    return (
      <div style={{ marginBottom: 14 }}>
        <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => set(false)}><Icon name="file-text" size={14} /> 看使用說明</button>
      </div>
    );
  }
  return (
    <div className="t-guide">
      <div className="t-guide__head">
        <b>怎麼送證照（5 步）</b>
        <span className="t-spacer" />
        <button type="button" className="t-iconbtn" style={{ color: 'var(--t-fg)' }} onClick={() => set(true)} aria-label="收起">
          <Icon name="x" size={16} />
        </button>
      </div>
      <div className="t-guide__steps">
        {STEPS.map(([icon, title, desc], i) => (
          <div className="t-step" key={i}>
            <div className="t-step__n">{i + 1}</div>
            <div className="t-step__ic"><Icon name={icon} size={22} /></div>
            <div className="t-step__t">{title}</div>
            <div className="t-step__d">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 新增一筆 ──────────────────────────────────────────────────────
// 講師只填「他的資料」（學員、收件、聯絡）。證照名稱／發證日期／費用是 owner 才設的，
// 對講師整段藏起來——他丟上來，這些由虎智決定。
function AddModal({ isOwner, onClose, onDone }: { isOwner: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    studentName: '', course: 'n8n Quickstart', issueDate: '', courseName: '', recipientName: '',
    email: '', phone: '', address: '', certUrl: '', fee: '200', note: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateRecord(f); // 格式防呆：空值＋Email／電話／地址格式＋證照姓名要英文
    if (Object.keys(v).length) { setErrs(v); return; }
    setErr(''); setErrs({}); setBusy(true);
    try { await api.post('/api/teacher/certs', { ...f, fee: Number(f.fee) || 200 }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const Field = (k: string, label: string, opts: { type?: string; required?: boolean; ph?: string } = {}) => (
    <div className="t-f">
      <label className="t-f__label">{label}{opts.required && <span style={{ color: 'var(--t-danger)' }}> *</span>}</label>
      <input className={`t-input${errs[k] ? ' t-input--bad' : ''}`} type={opts.type || 'text'} value={(f as any)[k]} placeholder={opts.ph}
        onChange={(e) => { set(k, e.target.value); if (errs[k]) setErrs((o) => { const n = { ...o }; delete n[k]; return n; }); }} />
      {errs[k] && <div className="t-f__err">{errs[k]}</div>}
    </div>
  );

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" noValidate onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>新增一位通過的學員</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        {Field('studentName', '學員姓名（印在證照上的英文名）', { required: true, ph: 'LIN,YUNG-CHING' })}
        {Field('recipientName', '收件人（寄送用中文名）', { required: true, ph: '林永青' })}
        {Field('courseName', '上課梯次／班級（選填）', { ph: '例：11 月週末班' })}
        {Field('email', 'Email', { type: 'email', required: true, ph: 'a@example.com' })}
        {Field('phone', '電話', { type: 'tel', required: true, ph: '0912345678' })}
        {Field('address', '寄送地址（含郵遞區號）', { required: true, ph: '116 臺北市文山區…' })}
        {Field('certUrl', 'n8n 證照連結（證明他考過）', { required: true, ph: 'https://…（Google Drive 或 n8n 原廠連結）' })}
        {Field('note', '備註（選填）')}
        {isOwner && (
          <>
            <div className="t-f__group">以下由虎智設定（講師看不到）</div>
            {Field('course', '證照名稱', { ph: 'n8n Quickstart' })}
            {Field('issueDate', '發證日期', { ph: 'July 29, 2026（印在證照上的字樣）' })}
            {Field('fee', '費用（元，含運）', { type: 'number' })}
          </>
        )}
        <div className="t-row" style={{ marginTop: 6 }}>
          <button className="t-btn t-btn--brand" disabled={busy}>{busy ? '儲存中…' : '新增'}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// ── 匯入 Excel／CSV ───────────────────────────────────────────────
// 流程：上傳 .xlsx／.csv（或貼 CSV）→ 自動認抬頭、攤出對應表讓人改 → 預覽 → 匯入。
function ImportModal({ isOwner, existing, onClose, onDone }: { isOwner: boolean; existing: Set<string>; onClose: () => void; onDone: () => void }) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [map, setMap] = useState<string[]>([]);
  const [course, setCourse] = useState('n8n Quickstart');
  const [fee, setFee] = useState('200');
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const [err, setErr] = useState('');

  // 證照名稱／發證日期／費用是 owner 才設的；講師版的對應下拉不給這些選項。
  const OWNER_ONLY = ['course', 'issueDate', 'fee'];
  const options = isOwner ? FIELDS : FIELDS.filter((f) => !OWNER_ONLY.includes(f.key));

  function take(g: Grid) {
    if (!g.headers.length) { setErr('讀不到任何欄位，檔案可能是空的。'); return; }
    const m = guessMapping(g.headers).map((k) => (!isOwner && OWNER_ONLY.includes(k) ? '' : k));
    setErr(''); setGrid(g); setMap(m);
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setErr('');
    try { take(await parseFile(f)); }
    catch (e: any) { setErr(e.message || '讀檔失敗'); }
  }

  const records = useMemo(
    () => (grid ? buildRecords(grid.rows, map, isOwner ? { course, fee: Number(fee) || 200 } : { course: '', fee: 200 }) : []),
    [grid, map, course, fee, isOwner],
  );
  const hasName = map.includes('studentName');
  // 匯入是大量資料，格式不對的只警告、不硬擋，匯入後可到清單修正。
  const problems = useMemo(() => records.map((r) => {
    const bad: string[] = [];
    if (!isEmail(String(r.email || ''))) bad.push('Email');
    if (!isPhoneTW(String(r.phone || ''))) bad.push('電話');
    if (!isAddressTW(String(r.address || ''))) bad.push('地址');
    if (!String(r.certUrl || '').trim()) bad.push('證明連結');
    return bad.length ? `${r.studentName}（${bad.join('、')}）` : '';
  }).filter(Boolean), [records]);
  // 去重提醒：同姓名＋Email 已經在清單裡的，標出來（仍可匯入）。
  const dups = useMemo(() => records
    .filter((r) => existing.has(`${String(r.studentName || '').toLowerCase().trim()}|${String(r.email || '').toLowerCase().trim()}`))
    .map((r) => String(r.studentName)), [records, existing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true); setResult(null);
    try { setResult(await api.post<{ ok: number; errors: string[] }>('/api/teacher/certs/import', { rows: records })); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box t-modal__box--wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>匯入學員（Excel／CSV）</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>

        {err && <div className="t-msg t-msg--err">{err}</div>}
        {result ? (
          <>
            <div className={`t-msg ${result.errors.length ? 't-msg--info' : 't-msg--ok'}`}>
              成功匯入 {result.ok} 筆。{result.errors.length > 0 && <>有 {result.errors.length} 筆沒進：
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{result.errors.slice(0, 8).map((x, i) => <li key={i} style={{ fontSize: 12 }}>{x}</li>)}</ul></>}
            </div>
            <div className="t-row" style={{ marginTop: 10 }}>
              <button type="button" className="t-btn t-btn--brand" onClick={onDone}>完成</button>
            </div>
          </>
        ) : !grid ? (
          <>
            <p className="t-f__help" style={{ marginBottom: 10 }}>
              選一個 Google 表單匯出的 <b>.xlsx</b>（或 CSV）。抬頭我會自動對應，下一步你可以逐欄確認、修改。
            </p>
            <label className="t-drop">
              <input type="file" accept=".xlsx,.csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
              <Icon name="upload" size={22} /><span>點這裡選 Excel／CSV 檔</span>
            </label>
            <details style={{ marginTop: 12 }}>
              <summary className="t-f__help" style={{ cursor: 'pointer' }}>或直接貼上 CSV 文字</summary>
              <textarea className="t-textarea" style={{ marginTop: 8 }} value={paste} onChange={(e) => setPaste(e.target.value)}
                placeholder={'姓名,email,電話,地址\n王小明,a@b.com,0912,台北市…'} />
              <button type="button" className="t-btn t-btn--ghost t-btn--sm" style={{ marginTop: 6 }}
                disabled={!paste.trim()} onClick={() => take(parseCsvText(paste))}>解析這段文字</button>
            </details>
          </>
        ) : (
          <>
            <p className="t-f__help" style={{ marginBottom: 8 }}>
              左邊是你檔案的欄位，右邊選它要對到哪個證照欄位。<b>證照姓名</b>一定要指定一欄。
            </p>
            <div className="t-maptable">
              {grid.headers.map((h, i) => (
                <div className="t-maprow" key={i}>
                  <div className="t-mapsrc">
                    <b>{h || <span style={{ color: 'var(--t-fg-3)' }}>（第 {i + 1} 欄）</span>}</b>
                    <span className="t-mapsample">{(grid.rows[0]?.[i] || '').slice(0, 24) || '—'}</span>
                  </div>
                  <select className="t-select" value={map[i] || ''} onChange={(e) => {
                    const v = e.target.value;
                    setMap((m) => m.map((x, j) => (j === i ? v : (v && x === v ? '' : x)))); // 同一目標只留一欄
                  }}>
                    <option value="">略過</option>
                    {options.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {isOwner && (
              <div className="t-row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <div className="t-f" style={{ flex: '1 1 160px', margin: 0 }}>
                  <label className="t-f__label">證照名稱（整批套用）</label>
                  <input className="t-input" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="n8n Quickstart" />
                </div>
                <div className="t-f" style={{ flex: '0 0 120px', margin: 0 }}>
                  <label className="t-f__label">每張費用</label>
                  <input className="t-input" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
                </div>
              </div>
            )}

            {!hasName
              ? <div className="t-msg t-msg--err" style={{ marginTop: 10 }}>請先把其中一欄設成「證照姓名」。</div>
              : <div className="t-msg t-msg--info" style={{ marginTop: 10 }}>
                  將匯入 <b>{records.length}</b> 筆{grid.rows.length > records.length && <>（{grid.rows.length - records.length} 筆因為沒有姓名略過）</>}。
                  {records[0] && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--t-fg-2)' }}>
                    例：{records[0].studentName as string}
                    {records[0].recipientName ? ` → 寄給 ${records[0].recipientName}` : ''}
                    {records[0].address ? `，${records[0].address}` : ''}
                  </div>}
                </div>}
            {hasName && problems.length > 0 && (
              <div className="t-msg t-msg--info" style={{ marginTop: 8, borderColor: 'var(--t-warn, #C08423)' }}>
                ⚠ 有 {problems.length} 筆 Email／電話／地址格式要確認（仍可匯入，之後到清單修正）：
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
                  {problems.slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {hasName && dups.length > 0 && (
              <div className="t-msg t-msg--info" style={{ marginTop: 8, borderColor: 'var(--t-warn, #C08423)' }}>
                ⚠ 有 {dups.length} 筆可能重複（同姓名＋Email 已在清單）：{dups.slice(0, 6).join('、')}{dups.length > 6 ? '…' : ''}。確認不是重送再匯入。
              </div>
            )}

            <div className="t-row" style={{ marginTop: 12 }}>
              <button className="t-btn t-btn--brand" disabled={busy || !hasName || !records.length}>
                {busy ? '匯入中…' : `匯入 ${records.length} 筆`}
              </button>
              <button type="button" className="t-btn t-btn--ghost" onClick={() => { setGrid(null); setErr(''); }}>重選檔案</button>
              <button type="button" className="t-btn t-btn--ghost t-spacer" onClick={onClose}>取消</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

// ── 編輯一筆（owner 任何時候；講師只在接單前，欄位同新增、設定欄位 owner 才有）──
function EditModal({ cert, isOwner, onClose, onDone }: { cert: Cert; isOwner: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    studentName: cert.studentName || '', course: cert.course || 'n8n Quickstart', issueDate: cert.issueDate || '',
    courseName: cert.courseName || '', recipientName: cert.recipientName || '',
    email: cert.email || '', phone: cert.phone || '', address: cert.address || '',
    certUrl: cert.certUrl || '', note: cert.note || '', tracking: cert.tracking || '',
    fee: String(cert.fee ?? 200),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateRecord(f);
    if (Object.keys(v).length) { setErrs(v); return; }
    setErr(''); setErrs({}); setBusy(true);
    try { await api.put(`/api/teacher/certs/${cert.id}`, { ...f, fee: Number(f.fee) || 200 }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const Field = (k: string, label: string, opts: { type?: string; required?: boolean } = {}) => (
    <div className="t-f">
      <label className="t-f__label">{label}{opts.required && <span style={{ color: 'var(--t-danger)' }}> *</span>}</label>
      <input className={`t-input${errs[k] ? ' t-input--bad' : ''}`} type={opts.type || 'text'} value={(f as any)[k]}
        onChange={(e) => { set(k, e.target.value); if (errs[k]) setErrs((o) => { const n = { ...o }; delete n[k]; return n; }); }} />
      {errs[k] && <div className="t-f__err">{errs[k]}</div>}
    </div>
  );

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" noValidate onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>編輯證照資料</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        {isOwner && cert.editRequest && <div className="t-msg t-msg--info">✎ 講師的修改申請：{cert.editRequest}（存檔後這個申請會自動清除）</div>}
        {err && <div className="t-msg t-msg--err">{err}</div>}
        {Field('studentName', '學員姓名（印在證照上的英文名）', { required: true })}
        {Field('recipientName', '收件人（寄送用中文名）', { required: true })}
        {Field('courseName', '上課梯次／班級（選填）')}
        {Field('email', 'Email', { type: 'email', required: true })}
        {Field('phone', '電話', { type: 'tel', required: true })}
        {Field('address', '寄送地址（含郵遞區號）', { required: true })}
        {Field('certUrl', 'n8n 證照連結（證明他考過）', { required: true })}
        {Field('note', '備註（選填）')}
        {isOwner && (
          <>
            <div className="t-f__group">以下由虎智設定（講師看不到）</div>
            {Field('course', '證照名稱')}
            {Field('issueDate', '發證日期')}
            {Field('tracking', '物流單號')}
            {Field('fee', '費用（元，含運）', { type: 'number' })}
          </>
        )}
        <div className="t-row" style={{ marginTop: 6 }}>
          <button className="t-btn t-btn--brand" disabled={busy}>{busy ? '儲存中…' : '儲存'}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// ── 申請修改（講師：接單後不能直接改，寫一句送給 owner）──
function RequestModal({ cert, onClose, onDone }: { cert: Cert; onClose: () => void; onDone: () => void }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!msg.trim()) return;
    setErr(''); setBusy(true);
    try { await api.post(`/api/teacher/certs/${cert.id}/edit-request`, { message: msg }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>申請修改</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        <p className="t-f__help" style={{ marginBottom: 8 }}>
          這筆（{cert.studentName}）虎智已經接單製作中，不能直接改。寫下要改什麼送過去，確認後由虎智更新。
        </p>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        <textarea className="t-textarea" value={msg} onChange={(e) => setMsg(e.target.value)}
          placeholder="例：地址改成…／英文名拼錯，應該是…" />
        <div className="t-row" style={{ marginTop: 10 }}>
          <button className="t-btn t-btn--brand" disabled={busy || !msg.trim()}>{busy ? '送出中…' : '送出申請'}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// ── 退件（owner：把一筆退回講師、附原因；講師改完自動解除）──
function ReturnModal({ cert, onClose, onDone }: { cert: Cert; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!reason.trim()) return;
    setErr(''); setBusy(true);
    try { await api.post(`/api/teacher/certs/${cert.id}/return`, { reason }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>退件</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        <p className="t-f__help" style={{ marginBottom: 8 }}>
          把「{cert.studentName}」退回給講師並附原因。講師會看到原因，改好後退件標記自動解除。
        </p>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        <textarea className="t-textarea" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="例：證明連結打不開，請附可開啟的 n8n 證照連結" />
        <div className="t-row" style={{ marginTop: 10 }}>
          <button className="t-btn t-btn--brand" disabled={busy || !reason.trim()}>{busy ? '退件中…' : '退回給講師'}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}
