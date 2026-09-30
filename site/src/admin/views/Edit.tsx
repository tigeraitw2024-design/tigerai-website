import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type Collection, type Rec } from '../api';
import FieldInput from '../ui/FieldInput';
import Icon from '../ui/Icon';

/**
 * 編輯頁。所有集合共用，表單是照 schema 的 fields 畫出來的。
 *
 * 兩個小地方是刻意的：
 *   1. 有改動又要離開時攔下來問。後台最容易發生的意外就是打了一大段
 *      然後按上一頁。
 *   2. 儲存鈕在手機上固定在畫面底部。表單長的時候（課程有十幾個欄位）
 *      不該為了按儲存而捲到最下面。
 */
export default function Edit({
  collection: c, id, canSeePII,
}: { collection: Collection; id: string; canSeePII: boolean }) {
  const isNew = id === 'new';
  const [rec, setRec] = useState<Rec | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const original = useRef<string>('');

  useEffect(() => {
    if (isNew) {
      const blank: Rec = {};
      for (const f of c.fields) {
        blank[f.name] = f.default !== undefined ? f.default
          : f.type === 'boolean' ? false
          : f.type === 'number' || f.type === 'money' ? 0
          : f.type === 'array' || f.type === 'relations' || f.type === 'multiselect' ? []
          : f.type === 'json' ? null
          : '';
      }
      original.current = JSON.stringify(blank);
      setRec(blank);
      return;
    }
    api
      .get<Rec>(`/api/admin/c/${c.name}/${id}`)
      .then((r) => {
        original.current = JSON.stringify(r);
        setRec(r);
      })
      .catch((e) => setErrors([e.message]));
  }, [c.name, id]);

  // 有未儲存的改動就攔下離開
  useEffect(() => {
    const on = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  const set = (name: string, v: unknown) => {
    setRec((r) => {
      const next = { ...(r || {}), [name]: v };
      setDirty(JSON.stringify(next) !== original.current);
      return next;
    });
  };

  async function save() {
    if (!rec) return;
    setBusy(true);
    setErrors([]);
    setMsg('');
    try {
      if (isNew) {
        const r = await api.post<{ id: string }>(`/api/admin/c/${c.name}`, rec);
        setDirty(false);
        location.hash = `#/${c.name}/${r.id}`;
      } else {
        await api.put(`/api/admin/c/${c.name}/${rec.id}`, rec);
        original.current = JSON.stringify(rec);
        setDirty(false);
        setMsg('存好了。');
        setTimeout(() => setMsg(''), 2600);
      }
    } catch (e: any) {
      if (e instanceof ApiError && e.errors.length) setErrors(e.errors);
      else setErrors([e.message || '存檔失敗']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!rec) return;
    if (!confirm(`確定要刪除「${rec[c.titleField || 'title'] || rec.id}」嗎？這個動作不能復原。`)) return;
    setBusy(true);
    try {
      await api.del(`/api/admin/c/${c.name}/${rec.id}`);
      setDirty(false);
      location.hash = `#/${c.name}`;
    } catch (e: any) {
      setErrors([e.message]);
      setBusy(false);
    }
  }

  const back = (e: React.MouseEvent) => {
    if (dirty && !confirm('有還沒儲存的改動，確定要離開嗎？')) e.preventDefault();
  };

  if (!rec) {
    return errors.length
      ? <div className="a-msg a-msg--err">{errors[0]}</div>
      : <div className="a-empty">載入中…</div>;
  }

  const readonly = !c.canWrite;
  const title = c.kind === 'singleton' ? c.label
    : isNew ? `新增${c.label}`
    : String(rec[c.titleField || 'title'] || `編輯${c.label}`);

  return (
    <>
      <div className="a-row" style={{ marginBottom: 10 }}>
        {c.kind !== 'singleton' && (
          <a className="a-btn a-btn--ghost a-btn--sm" href={`#/${c.name}`} onClick={back}>
            <Icon name="chevron-left" size={15} /> {c.label}
          </a>
        )}
        {dirty && <span className="a-pill" data-tone="warn">尚未儲存</span>}
      </div>

      <h1 className="a-h1">{title}</h1>
      {c.intro && <p className="a-intro">{c.intro}</p>}

      {readonly && <div className="a-msg a-msg--info">你的角色只能看，不能修改這一頁。</div>}
      {errors.length > 0 && (
        <div className="a-msg a-msg--err">
          <b>存不進去，請修正下面幾點：</b>
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {msg && <div className="a-msg a-msg--ok">{msg}</div>}

      <div className="a-panel">
        <div className="a-form">
          {c.fields.map((f) => (
            <FieldInput
              key={f.name} field={f} value={rec[f.name]} disabled={readonly}
              masked={f.pii && !canSeePII}
              onChange={(v) => set(f.name, v)}
            />
          ))}
        </div>
      </div>

      {!readonly && (
        <div
          className="a-row"
          style={{
            position: 'sticky', bottom: 'calc(var(--a-tabbar-h) + 8px)', zIndex: 10,
            background: 'var(--a-bg)', padding: '12px 0', borderTop: '1px solid var(--a-line)',
          }}
        >
          <button className="a-btn a-btn--brand" onClick={save} disabled={busy}>
            <Icon name="check" size={16} /> {busy ? '儲存中…' : isNew ? '建立' : '儲存'}
          </button>
          {!isNew && c.canDelete !== false && (
            <button className="a-btn a-btn--danger a-spacer" onClick={remove} disabled={busy}>
              <Icon name="trash" size={15} /> 刪除
            </button>
          )}
        </div>
      )}

      {!isNew && c.kind === 'content' && (
        <p className="a-f__help" style={{ marginTop: 14 }}>
          這是「內容」類的資料：存檔之後還要到總覽按一次「發布到前台」，前台才會更新。
        </p>
      )}
    </>
  );
}
