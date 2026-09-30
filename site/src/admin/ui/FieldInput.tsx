import { useEffect, useState } from 'react';
import type { Field, Rec } from '../api';
import { api, centsToYuan, yuanToCents } from '../api';
import Icon from './Icon';
import MediaPicker from './MediaPicker';

/**
 * 照欄位型別畫出對應的輸入框。
 *
 * 後台沒有任何一頁手寫過表單——所有表單都是把 schema 的 fields 陣列
 * 丟進這個元件畫出來的。加一個欄位，表單當場就有；改型別，輸入框跟著換。
 */

type Props = {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
  /** 沒有權限看個資時，值是遮罩過的，不給編輯 */
  masked?: boolean;
};

export default function FieldInput({ field: f, value, onChange, disabled, masked }: Props) {
  const ro = disabled || f.readonly || masked;
  const over = !!f.maxLength && String(value ?? '').length > f.maxLength;

  return (
    <div className="a-f" data-w={f.width || 'full'}>
      <label className="a-f__label">
        {f.label}
        {f.required && <span className="a-f__req">必填</span>}
        {f.pii && <span className="a-f__pii">個資</span>}
        {f.readonly && <span className="a-f__pii">系統填寫</span>}
      </label>

      <Control field={f} value={value} onChange={onChange} ro={ro} masked={masked} />

      {f.maxLength && !ro ? (
        <div className="a-f__count" data-over={over ? '1' : '0'}>
          {String(value ?? '').length} / {f.maxLength}
        </div>
      ) : null}
      {f.help && <div className="a-f__help">{f.help}</div>}
      {masked && <div className="a-f__help">你的權限看不到這個欄位的完整內容，所以不能編輯。</div>}
    </div>
  );
}

function Control({ field: f, value, onChange, ro, masked }: Omit<Props, 'disabled'> & { ro?: boolean }) {
  switch (f.type) {
    case 'textarea':
      return <textarea className="a-textarea" value={value ?? ''} readOnly={ro} onChange={(e) => onChange(e.target.value)} />;

    case 'richtext':
      return <RichText value={value ?? ''} onChange={onChange} ro={ro} />;

    case 'boolean':
      return (
        <label className="a-check">
          <input type="checkbox" checked={!!value} disabled={ro} onChange={(e) => onChange(e.target.checked)} />
          <span>{value ? '開' : '關'}</span>
        </label>
      );

    case 'select':
      return (
        <select className="a-select" value={value ?? ''} disabled={ro} onChange={(e) => onChange(e.target.value)}>
          <option value="">（未選）</option>
          {(f.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );

    case 'multiselect':
      return <TagList value={Array.isArray(value) ? value : []} onChange={onChange} ro={ro} options={f.options} />;

    case 'number':
      return (
        <input
          className="a-input" type="number" inputMode="numeric"
          value={value ?? 0} readOnly={ro} min={f.min} max={f.max}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
      );

    case 'money':
      // 資料庫存的是分，畫面上顯示元。換算只在這裡發生。
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--a-fg-3)', fontSize: 13 }}>NT$</span>
          <input
            className="a-input" type="number" inputMode="numeric" min={0}
            value={centsToYuan(value)} readOnly={ro}
            onChange={(e) => onChange(yuanToCents(e.target.value))}
          />
        </div>
      );

    case 'date':
      return <input className="a-input" type="date" value={(value ?? '').slice(0, 10)} readOnly={ro} onChange={(e) => onChange(e.target.value)} />;

    case 'datetime':
      return (
        <input
          className="a-input" type="datetime-local"
          value={toLocalInput(value)} readOnly={ro}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        />
      );

    case 'image':
    case 'file':
      return <MediaPicker value={value} onChange={onChange} ro={ro} imagesOnly={f.type === 'image'} />;

    case 'relation':
      return <RelationPicker relation={f.relation!} value={value} onChange={onChange} ro={ro} />;

    case 'relations':
      return <RelationPicker relation={f.relation!} value={value} onChange={onChange} ro={ro} multi />;

    case 'array':
      return <ArrayField field={f} value={Array.isArray(value) ? value : []} onChange={onChange} ro={ro} />;

    case 'json':
      return <JsonField value={value} onChange={onChange} ro={ro} />;

    case 'password':
      return (
        <input
          className="a-input" type="password" autoComplete="new-password"
          placeholder="留空表示不修改" readOnly={ro}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'color':
      return <input className="a-input" type="color" value={value || '#000000'} disabled={ro} onChange={(e) => onChange(e.target.value)} />;

    default:
      return (
        <input
          className="a-input"
          type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'url' ? 'url' : 'text'}
          inputMode={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : undefined}
          value={value ?? ''} readOnly={ro}
          placeholder={f.type === 'slug' ? '小寫英文、數字、連字號' : f.type === 'url' ? 'https://' : ''}
          onChange={(e) => onChange(f.type === 'slug' ? slugify(e.target.value) : e.target.value)}
        />
      );
  }
}

// ── 各型別的細節 ────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

function toLocalInput(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 有限的格式工具列。
 *
 * 不做所見即所得編輯器：那種東西要嘛帶一個大套件，要嘛自己維護一堆
 * contentEditable 的怪脾氣。這裡的做法是在游標處包標籤，能用的標籤
 * 跟後端白名單一致，貼上去的髒 HTML 後端也會洗掉。
 */
function RichText({ value, onChange, ro }: { value: string; onChange: (v: string) => void; ro?: boolean }) {
  const [el, setEl] = useState<HTMLTextAreaElement | null>(null);
  const wrap = (tag: string) => {
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = value.slice(s, e) || '文字';
    const next = `${value.slice(0, s)}<${tag}>${sel}</${tag}>${value.slice(e)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + tag.length + 2, s + tag.length + 2 + sel.length);
    });
  };
  return (
    <div>
      {!ro && (
        <div className="a-row" style={{ marginBottom: 6 }}>
          {[['strong', '粗體'], ['em', '斜體'], ['h3', '小標'], ['p', '段落'], ['ul', '清單'], ['li', '項目'], ['a', '連結']].map(([t, label]) => (
            <button key={t} type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => wrap(t)}>{label}</button>
          ))}
        </div>
      )}
      <textarea
        ref={setEl} className="a-textarea" style={{ minHeight: 180, fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}
        value={value} readOnly={ro} onChange={(e) => onChange(e.target.value)}
      />
      <div className="a-f__help">可以用的標籤：段落、粗體、斜體、小標、清單、連結、引用。其他的會在存檔時被拿掉。</div>
    </div>
  );
}

function TagList({ value, onChange, ro, options }: { value: string[]; onChange: (v: string[]) => void; ro?: boolean; options?: { value: string; label: string }[] }) {
  const [draft, setDraft] = useState('');
  if (options?.length) {
    return (
      <div className="a-row">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value} type="button" disabled={ro}
              className={`a-btn a-btn--sm ${on ? 'a-btn--brand' : 'a-btn--ghost'}`}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            >{o.label}</button>
          );
        })}
      </div>
    );
  }
  return (
    <div>
      <div className="a-row" style={{ marginBottom: 6 }}>
        {value.map((v) => (
          <span key={v} className="a-pill">
            {v}
            {!ro && <button type="button" className="a-grab" style={{ padding: '0 0 0 6px', margin: 0 }} onClick={() => onChange(value.filter((x) => x !== v))}>×</button>}
          </span>
        ))}
        {!value.length && <span style={{ color: 'var(--a-fg-3)', fontSize: 13 }}>（沒有）</span>}
      </div>
      {!ro && (
        <input
          className="a-input" value={draft} placeholder="輸入後按 Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const v = draft.trim();
            if (v && !value.includes(v)) onChange([...value, v]);
            setDraft('');
          }}
        />
      )}
    </div>
  );
}

function ArrayField({ field: f, value, onChange, ro }: { field: Field; value: Rec[]; onChange: (v: Rec[]) => void; ro?: boolean }) {
  const blank = () => Object.fromEntries((f.of || []).map((s) => [s.name, s.type === 'number' || s.type === 'money' ? 0 : s.type === 'boolean' ? false : '']));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="a-arr">
      {value.map((item, i) => (
        <div className="a-arr__item" key={i}>
          <div className="a-arr__head">
            <span className="a-arr__n">第 {i + 1} 筆</span>
            {!ro && (
              <>
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => move(i, 1)} disabled={i === value.length - 1}>↓</button>
                <button type="button" className="a-btn a-btn--danger a-btn--sm a-spacer" onClick={() => onChange(value.filter((_, k) => k !== i))}>刪除</button>
              </>
            )}
          </div>
          <div className="a-form">
            {(f.of || []).map((sub) => (
              <FieldInput
                key={sub.name} field={sub} value={item[sub.name]} disabled={ro}
                onChange={(v) => onChange(value.map((x, k) => (k === i ? { ...x, [sub.name]: v } : x)))}
              />
            ))}
          </div>
        </div>
      ))}
      {!ro && (
        <div className="a-arr__add">
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => onChange([...value, blank()])}>
            <Icon name="plus" size={15} /> 新增一筆
          </button>
        </div>
      )}
      {!value.length && <div style={{ padding: 14, color: 'var(--a-fg-3)', fontSize: 13 }}>還沒有內容。</div>}
    </div>
  );
}

function JsonField({ value, onChange, ro }: { value: any; onChange: (v: any) => void; ro?: boolean }) {
  const [text, setText] = useState(() => (value == null ? '' : JSON.stringify(value, null, 2)));
  const [err, setErr] = useState('');
  useEffect(() => {
    setText(value == null ? '' : JSON.stringify(value, null, 2));
  }, [/* 只在外部換了一整筆資料時重設 */ JSON.stringify(value)?.slice(0, 64)]);
  return (
    <div>
      <textarea
        className="a-textarea" style={{ minHeight: 200, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
        value={text} readOnly={ro}
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value.trim()) {
            setErr('');
            onChange(null);
            return;
          }
          try {
            onChange(JSON.parse(e.target.value));
            setErr('');
          } catch (x: any) {
            // 打到一半本來就會是壞的，所以只提示不阻擋。存檔時後端會再擋一次。
            setErr(String(x.message).slice(0, 120));
          }
        }}
      />
      {err && <div className="a-f__help" style={{ color: 'var(--a-danger)' }}>還不是合法的 JSON：{err}</div>}
    </div>
  );
}

function RelationPicker({ relation, value, onChange, ro, multi }: { relation: string; value: any; onChange: (v: any) => void; ro?: boolean; multi?: boolean }) {
  const [items, setItems] = useState<Rec[] | null>(null);
  useEffect(() => {
    api
      .get<{ items: Rec[] }>(`/api/admin/c/${relation}?limit=200`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [relation]);

  if (!items) return <div style={{ color: 'var(--a-fg-3)', fontSize: 13 }}>載入中…</div>;
  if (!items.length) return <div style={{ color: 'var(--a-fg-3)', fontSize: 13 }}>「{relation}」還沒有資料，要先去建立。</div>;

  const label = (x: Rec) => x.title || x.zh || x.name || x.label || x.code || x.email || x.id;

  if (multi) {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="a-row">
        {items.map((x) => {
          const on = arr.includes(x.id);
          return (
            <button
              key={x.id} type="button" disabled={ro}
              className={`a-btn a-btn--sm ${on ? 'a-btn--brand' : 'a-btn--ghost'}`}
              onClick={() => onChange(on ? arr.filter((v) => v !== x.id) : [...arr, x.id])}
            >{label(x)}</button>
          );
        })}
      </div>
    );
  }

  return (
    <select className="a-select" value={value ?? ''} disabled={ro} onChange={(e) => onChange(e.target.value)}>
      <option value="">（未選）</option>
      {items.map((x) => (
        <option key={x.id} value={x.id}>{label(x)}</option>
      ))}
    </select>
  );
}
