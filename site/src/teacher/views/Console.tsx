import { useEffect, useMemo, useState } from 'react';
import { api, type Cert, type TeacherUser } from '../api';
import Icon from '../Icon';
import { parseFile, parseCsvText, guessMapping, buildRecords, FIELDS, validateRecord, isEmail, isPhoneTW, isAddressTW, type Grid } from '../importParse';

/**
 * 證照主控台：講師區的主畫面。
 *
 * 一份資料兩種呈現——手機是卡片、桌機是表格（CSS 切換）。勾選後底部浮出
 * 動作列：誰都能「產生證照」拿去出圖；owner 另外能批次標「已列印／已寄送」。
 * 列表的範圍後端已經依身分切好（instructor 只拿得到自己的），前端只管篩選呈現。
 */

type StatusFilter = 'all' | 'unprinted' | 'printed' | 'unshipped' | 'shipped';

/** 狀態推導：待確認 →（owner 接單）製作中 → 已列印 → 已寄出。 */
function statusOf(r: Cert): { label: string; tone: string } {
  if (r.shipped) return { label: '已寄出', tone: 'ok' };
  if (r.printed) return { label: '已列印', tone: 'warn' };
  if (r.accepted) return { label: '製作中', tone: 'warn' };
  return { label: '待確認', tone: 'off' };
}

export default function Console({ user, onGenerate }: { user: TeacherUser; onGenerate: (certs: Cert[]) => void }) {
  const isOwner = user.role === 'owner';
  const [rows, setRows] = useState<Cert[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState<'' | 'add' | 'import'>('');
  const [edit, setEdit] = useState<Cert | null>(null);   // 正在編輯的那筆
  const [req, setReq] = useState<Cert | null>(null);      // 正在申請修改的那筆（講師）
  const [banner, setBanner] = useState('');               // 接單成功提示（含預計天數）

  async function load() {
    setErr('');
    try { setRows((await api.get<{ items: Cert[] }>('/api/teacher/certs')).items); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = rows || [];
    if (status === 'unprinted') r = r.filter((x) => !x.printed);
    if (status === 'printed') r = r.filter((x) => x.printed);
    if (status === 'unshipped') r = r.filter((x) => !x.shipped);
    if (status === 'shipped') r = r.filter((x) => x.shipped);
    const kw = q.trim().toLowerCase();
    if (kw) r = r.filter((x) =>
      [x.studentName, x.courseName, x.instructorName, x.address, x.email, x.course]
        .some((v) => (v || '').toLowerCase().includes(kw)));
    return r;
  }, [rows, status, q]);

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

  return (
    <div>
      <h1 className="t-h1">證照</h1>
      <p className="t-intro">
        {isOwner
          ? '所有講師的證照都在這裡。勾選後可以「接單」（鎖定並算預計寄出日）、「產生證照」出圖列印，或標記已列印、已寄送。'
          : '把你班上通過的學員用「匯入 Excel」上傳上來就好，列印與寄送由虎智統一處理。狀態（待確認 → 製作中 → 已列印 → 已寄出）你隨時看得到；虎智接單前都還能自己改。'}
      </p>

      {err && <div className="t-msg t-msg--err">{err}</div>}
      {banner && <div className="t-msg t-msg--ok">{banner}</div>}

      <div className="t-toolbar">
        <div className="t-search" style={{ position: 'relative' }}>
          <input className="t-input" placeholder="搜尋姓名、梯次、地址…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="t-btn t-btn--brand t-btn--sm" onClick={() => setModal('add')}><Icon name="plus" size={16} /> 新增</button>
        <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setModal('import')}><Icon name="upload" size={16} /> 匯入 Excel</button>
      </div>

      <div className="t-row" style={{ marginBottom: 14, gap: 6 }}>
        {([['all', '全部'], ['unprinted', '未列印'], ['printed', '已列印'], ['unshipped', '未寄送'], ['shipped', '已寄送']] as [StatusFilter, string][])
          .map(([v, label]) => (
            <button key={v} className="t-pill" data-tone={status === v ? 'warn' : undefined}
              style={{ cursor: 'pointer', minHeight: 32, padding: '4px 12px' }}
              onClick={() => setStatus(v)}>{label}</button>
          ))}
        <span className="t-spacer t-mono" style={{ fontSize: 12, color: 'var(--t-fg-3)' }}>{filtered.length} 筆</span>
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
                  <span className="t-card__t">{r.studentName}</span>
                  <span className="t-spacer" />
                  <span className="t-pill" data-tone={statusOf(r).tone}>{statusOf(r).label}</span>
                </div>
                <div className="t-card__meta">
                  <span><b>證照</b> {r.course}</span>
                  {r.courseName && <span><b>梯次</b> {r.courseName}</span>}
                  {isOwner && <span><b>講師</b> {r.instructorName}</span>}
                  <span><b>費用</b> {r.fee} 元</span>
                  {r.accepted && !r.shipped && r.etaDate && <span><b>預計寄出</b> {r.etaDate}</span>}
                </div>
                {r.address && <div className="t-card__addr">📮 {r.address}</div>}
                {r.editRequest && <div className="t-card__addr" style={{ color: 'var(--t-danger)' }}>✎ 修改申請：{r.editRequest}</div>}
                <div className="t-row" style={{ gap: 8, marginTop: 2 }}>
                  {(isOwner || !r.accepted)
                    ? <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setEdit(r)}><Icon name="file-text" size={14} /> 編輯</button>
                    : <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setReq(r)}>✎ 申請修改</button>}
                  {isOwner && r.editRequest && <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => dismiss(r.id)}>忽略申請</button>}
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
                  <td><b>{r.studentName}</b></td>
                  <td>{r.course}{r.courseName ? <><br /><span style={{ color: 'var(--t-fg-3)', fontSize: 12 }}>{r.courseName}</span></> : null}</td>
                  {isOwner && <td>{r.instructorName}</td>}
                  <td className="addr">{r.address || <span style={{ color: 'var(--t-fg-3)' }}>—</span>}</td>
                  <td>
                    <span className="t-pill" data-tone={statusOf(r).tone}>{statusOf(r).label}</span>
                    {r.accepted && !r.shipped && r.etaDate && <div style={{ fontSize: 11, color: 'var(--t-fg-3)', marginTop: 2 }}>預計 {r.etaDate}</div>}
                    {r.editRequest && <div style={{ fontSize: 11, color: 'var(--t-danger)', marginTop: 2 }}>✎ 修改申請</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.fee}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    {(isOwner || !r.accepted)
                      ? <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setEdit(r)}>編輯</button>
                      : <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setReq(r)}>申請修改</button>}
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
          <button className="t-btn t-btn--ghost t-btn--sm" disabled={!!busy} onClick={() => mark('printed', true)}>
            <Icon name="printer" size={16} /> 標已列印
          </button>
          <button className="t-btn t-btn--ghost t-btn--sm" disabled={!!busy} onClick={() => mark('shipped', true)}>
            <Icon name="truck" size={16} /> 標已寄送
          </button>
          <button className="t-btn t-btn--ghost t-btn--sm t-spacer" onClick={() => setSel(new Set())}>清除</button>
        </div>
      )}

      {modal === 'add' && <AddModal isOwner={isOwner} onClose={() => setModal('')} onDone={() => { setModal(''); load(); }} />}
      {modal === 'import' && <ImportModal isOwner={isOwner} onClose={() => setModal('')} onDone={() => { setModal(''); load(); }} />}
      {edit && <EditModal cert={edit} isOwner={isOwner} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {req && <RequestModal cert={req} onClose={() => setReq(null)} onDone={() => { setReq(null); load(); }} />}
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
        {Field('courseName', '上課梯次／班級', { required: true, ph: '例：11 月週末班' })}
        {Field('email', 'Email', { type: 'email', required: true, ph: 'a@example.com' })}
        {Field('phone', '電話', { type: 'tel', required: true, ph: '0912345678' })}
        {Field('address', '寄送地址（含郵遞區號）', { required: true, ph: '116 臺北市文山區…' })}
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
function ImportModal({ isOwner, onClose, onDone }: { isOwner: boolean; onClose: () => void; onDone: () => void }) {
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
    return bad.length ? `${r.studentName}（${bad.join('、')}）` : '';
  }).filter(Boolean), [records]);

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
    email: cert.email || '', phone: cert.phone || '', address: cert.address || '', note: cert.note || '',
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
        {Field('courseName', '上課梯次／班級', { required: true })}
        {Field('email', 'Email', { type: 'email', required: true })}
        {Field('phone', '電話', { type: 'tel', required: true })}
        {Field('address', '寄送地址（含郵遞區號）', { required: true })}
        {Field('note', '備註（選填）')}
        {isOwner && (
          <>
            <div className="t-f__group">以下由虎智設定（講師看不到）</div>
            {Field('course', '證照名稱')}
            {Field('issueDate', '發證日期')}
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
