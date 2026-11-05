import { useEffect, useState } from 'react';
import { api, type Instructor } from '../api';
import Icon from '../Icon';

/**
 * 講師名冊（owner 專用）。
 *
 * 誰能用 Google 登入進講師區，就看這張名冊——不在名冊裡的 Google 帳號會被擋下。
 * owner 看全部、能出證照與對帳；instructor 只看得到自己的學生。
 * owner 白名單（環境變數 TEACHER_OWNER_EMAILS）裡的人第一次登入會自動入列，
 * 其他講師要 owner 在這裡先加好 Gmail。
 */
export default function Roster({ meId }: { meId: string }) {
  const [rows, setRows] = useState<Instructor[] | null>(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ email: '', name: '', role: 'instructor', active: true });
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setRows((await api.get<{ items: Instructor[] }>('/api/teacher/instructors')).items); }
    catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function del(r: Instructor) {
    if (!window.confirm(`把「${r.name}」從名冊刪掉？他之後就不能登入講師區了（已建的證照不會消失）。`)) return;
    setErr('');
    try { await api.del(`/api/teacher/instructors/${r.id}`); await load(); }
    catch (e: any) { setErr(e.message); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api.post('/api/teacher/instructors', f);
      setF({ email: '', name: '', role: 'instructor', active: true });
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="t-h1">講師名冊</h1>
      <p className="t-intro">只有名冊裡的 Google 帳號進得來。加一位講師＝允許那個 Gmail 登入，並決定他看得到多少。</p>
      {err && <div className="t-msg t-msg--err">{err}</div>}

      <form className="t-panel" onSubmit={add}>
        <div className="t-panel__h">加一位講師</div>
        <div className="t-f"><label className="t-f__label">Gmail <span style={{ color: 'var(--t-danger)' }}>*</span></label>
          <input className="t-input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="teacher@gmail.com" /></div>
        <div className="t-f"><label className="t-f__label">姓名 <span style={{ color: 'var(--t-danger)' }}>*</span></label>
          <input className="t-input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="講師姓名" /></div>
        <div className="t-f"><label className="t-f__label">角色</label>
          <select className="t-select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="instructor">instructor・只看自己的學生</option>
            <option value="owner">owner・看全部、出證照、寄送、對帳</option>
          </select></div>
        <button className="t-btn t-btn--brand" disabled={busy}><Icon name="plus" size={16} /> {busy ? '儲存中…' : '加入名冊'}</button>
      </form>

      {rows === null ? <div className="t-empty">載入中…</div>
        : rows.length === 0 ? <div className="t-empty">名冊是空的。</div>
        : (
          <div className="t-list">
            {rows.map((r) => (
              <div className="t-card" key={r.id}>
                <div className="t-card__top">
                  <span className="t-card__t">{r.name}</span>
                  <span className="t-spacer" />
                  <span className="t-pill" data-tone={r.role === 'owner' ? 'warn' : undefined}>{r.role}</span>
                  {!r.active && <span className="t-pill" data-tone="off">停用</span>}
                </div>
                <div className="t-card__meta"><span className="t-mono">{r.email}</span></div>
                {r.note && <div className="t-card__meta"><span>{r.note}</span></div>}
                <div className="t-row" style={{ marginTop: 4 }}>
                  {r.id === meId
                    ? <span className="t-pill" data-tone="off">你自己（登入中）</span>
                    : <button className="t-btn t-btn--ghost t-btn--sm" style={{ color: 'var(--t-danger)' }} onClick={() => del(r)}>刪除</button>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
