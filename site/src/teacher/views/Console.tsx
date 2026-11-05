import { useEffect, useMemo, useState } from 'react';
import { api, type Cert, type TeacherUser } from '../api';
import Icon from '../Icon';

/**
 * 證照主控台：講師區的主畫面。
 *
 * 一份資料兩種呈現——手機是卡片、桌機是表格（CSS 切換）。勾選後底部浮出
 * 動作列：誰都能「產生證照」拿去出圖；owner 另外能批次標「已列印／已寄送」。
 * 列表的範圍後端已經依身分切好（instructor 只拿得到自己的），前端只管篩選呈現。
 */

type StatusFilter = 'all' | 'unprinted' | 'printed' | 'unshipped' | 'shipped';

export default function Console({ user, onGenerate }: { user: TeacherUser; onGenerate: (certs: Cert[]) => void }) {
  const isOwner = user.role === 'owner';
  const [rows, setRows] = useState<Cert[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState<'' | 'add' | 'import'>('');

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

  return (
    <div>
      <h1 className="t-h1">證照</h1>
      <p className="t-intro">
        {isOwner ? '所有講師的證照都在這裡。' : '這裡是你學生的證照。'}
        勾選後可以拿去「產生證照」出圖列印{isOwner ? '，或批次標記已列印、已寄送' : ''}。
      </p>

      {err && <div className="t-msg t-msg--err">{err}</div>}

      <div className="t-toolbar">
        <div className="t-search" style={{ position: 'relative' }}>
          <input className="t-input" placeholder="搜尋姓名、梯次、地址…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="t-btn t-btn--brand t-btn--sm" onClick={() => setModal('add')}><Icon name="plus" size={16} /> 新增</button>
        <button className="t-btn t-btn--ghost t-btn--sm" onClick={() => setModal('import')}><Icon name="upload" size={16} /> 匯入 CSV</button>
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
        <div className="t-empty">沒有符合的證照。{(rows.length === 0) && '先用「新增」或「匯入 CSV」把通過的學員加進來。'}</div>
      ) : (
        <>
          {/* 手機：卡片 */}
          <div className="t-cards">
            <label className="t-check" style={{ marginBottom: 6, fontSize: 13, color: 'var(--t-fg-2)' }}>
              <input type="checkbox" checked={allOn} onChange={toggleAll} /> 全選這一頁（{filtered.length}）
            </label>
            {filtered.map((r) => (
              <div className="t-card" key={r.id} data-sel={sel.has(r.id) ? '1' : '0'}>
                <div className="t-card__top">
                  <input type="checkbox" style={{ width: 20, height: 20, accentColor: 'var(--t-brand)' }}
                    checked={sel.has(r.id)} onChange={() => toggle(r.id)} />
                  <span className="t-card__t">{r.studentName}</span>
                  <span className="t-spacer" />
                  {r.printed && <span className="t-pill" data-tone="ok">已印</span>}
                  {r.shipped && <span className="t-pill" data-tone="ok">已寄</span>}
                </div>
                <div className="t-card__meta">
                  <span><b>證照</b> {r.course}</span>
                  {r.courseName && <span><b>梯次</b> {r.courseName}</span>}
                  {isOwner && <span><b>講師</b> {r.instructorName}</span>}
                  <span><b>費用</b> {r.fee} 元</span>
                </div>
                {r.address && <div className="t-card__addr">📮 {r.address}</div>}
              </div>
            ))}
          </div>

          {/* 桌機：表格 */}
          <table className="t-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /></th>
                <th>學員</th><th>證照／梯次</th>{isOwner && <th>講師</th>}
                <th className="addr">寄送地址</th><th>狀態</th><th style={{ textAlign: 'right' }}>費用</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} data-sel={sel.has(r.id) ? '1' : '0'} onClick={(e) => {
                  if ((e.target as HTMLElement).tagName !== 'INPUT') toggle(r.id);
                }} style={{ cursor: 'pointer' }}>
                  <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td><b>{r.studentName}</b></td>
                  <td>{r.course}{r.courseName ? <><br /><span style={{ color: 'var(--t-fg-3)', fontSize: 12 }}>{r.courseName}</span></> : null}</td>
                  {isOwner && <td>{r.instructorName}</td>}
                  <td className="addr">{r.address || <span style={{ color: 'var(--t-fg-3)' }}>—</span>}</td>
                  <td>
                    <span className="t-pill" data-tone={r.printed ? 'ok' : 'off'}>{r.printed ? '已印' : '未印'}</span>{' '}
                    <span className="t-pill" data-tone={r.shipped ? 'ok' : 'off'}>{r.shipped ? '已寄' : '未寄'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{r.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {sel.size > 0 && (
        <div className="t-actionbar">
          <b>{sel.size} 筆已選</b>
          <button className="t-btn t-btn--brand t-btn--sm" onClick={() => onGenerate(selCerts)}>
            <Icon name="download" size={16} /> 產生證照
          </button>
          {isOwner && <>
            <button className="t-btn t-btn--ghost t-btn--sm" disabled={!!busy} onClick={() => mark('printed', true)}>
              <Icon name="printer" size={16} /> 標已列印
            </button>
            <button className="t-btn t-btn--ghost t-btn--sm" disabled={!!busy} onClick={() => mark('shipped', true)}>
              <Icon name="truck" size={16} /> 標已寄送
            </button>
          </>}
          <button className="t-btn t-btn--ghost t-btn--sm t-spacer" onClick={() => setSel(new Set())}>清除</button>
        </div>
      )}

      {modal === 'add' && <AddModal onClose={() => setModal('')} onDone={() => { setModal(''); load(); }} />}
      {modal === 'import' && <ImportModal onClose={() => setModal('')} onDone={() => { setModal(''); load(); }} />}
    </div>
  );
}

// ── 新增一筆 ──────────────────────────────────────────────────────
function AddModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ studentName: '', course: 'n8n Quickstart', issueDate: '', courseName: '', email: '', phone: '', address: '', fee: '200', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.post('/api/teacher/certs', { ...f, fee: Number(f.fee) || 200 }); onDone(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  const Field = (k: string, label: string, opts: { type?: string; required?: boolean; ph?: string } = {}) => (
    <div className="t-f">
      <label className="t-f__label">{label}{opts.required && <span style={{ color: 'var(--t-danger)' }}> *</span>}</label>
      <input className="t-input" type={opts.type || 'text'} value={(f as any)[k]} placeholder={opts.ph}
        required={opts.required} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>新增一位通過的學員</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        {Field('studentName', '學員姓名', { required: true, ph: '王小明' })}
        {Field('course', '證照名稱', { ph: 'n8n Quickstart' })}
        {Field('issueDate', '發證日期', { ph: 'July 29, 2026（印在證照上的字樣）' })}
        {Field('courseName', '上課梯次／班級')}
        {Field('email', 'Email', { type: 'email' })}
        {Field('phone', '電話', { type: 'tel' })}
        {Field('address', '寄送地址')}
        {Field('fee', '費用（元，含運）', { type: 'number' })}
        <div className="t-row" style={{ marginTop: 6 }}>
          <button className="t-btn t-btn--brand" disabled={busy}>{busy ? '儲存中…' : '新增'}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={onClose}>取消</button>
        </div>
      </form>
    </div>
  );
}

// ── 匯入 CSV ──────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true); setResult(null);
    try { setResult(await api.post<{ ok: number; errors: string[] }>('/api/teacher/certs/import', { csv })); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="t-modal" onClick={onClose}>
      <form className="t-modal__box" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="t-modal__head"><h3>匯入 CSV</h3>
          <button type="button" className="t-iconbtn t-spacer" style={{ color: 'var(--t-fg)' }} onClick={onClose}><Icon name="x" /></button></div>
        <p className="t-f__help" style={{ marginBottom: 8 }}>
          第一列是表頭，欄位名含這些關鍵字就會自動對上：<b>姓名／name</b>、<b>email</b>、<b>電話</b>、
          <b>地址</b>、<b>梯次</b>、<b>日期</b>、<b>費用</b>。從 Excel 或 Google 試算表複製整塊貼進來即可。
        </p>
        {err && <div className="t-msg t-msg--err">{err}</div>}
        {result && (
          <div className={`t-msg ${result.errors.length ? 't-msg--info' : 't-msg--ok'}`}>
            成功匯入 {result.ok} 筆。{result.errors.length > 0 && <>有 {result.errors.length} 筆沒進：
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{result.errors.slice(0, 8).map((x, i) => <li key={i} style={{ fontSize: 12 }}>{x}</li>)}</ul></>}
          </div>
        )}
        <textarea className="t-textarea" value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder={'姓名,email,電話,地址,梯次,日期,費用\n王小明,a@b.com,0912,台北市…,11月班,July 29 2026,200'} />
        <div className="t-row" style={{ marginTop: 10 }}>
          <button className="t-btn t-btn--brand" disabled={busy || !csv.trim()}>{busy ? '匯入中…' : '匯入'}</button>
          <button type="button" className="t-btn t-btn--ghost" onClick={result ? onDone : onClose}>{result ? '完成' : '取消'}</button>
        </div>
      </form>
    </div>
  );
}
