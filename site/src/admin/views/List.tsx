import { useEffect, useRef, useState } from 'react';
import { api, money, type Collection, type Rec } from '../api';
import Icon from '../ui/Icon';

/**
 * 列表頁。所有集合共用這一頁，內容完全由 schema 決定。
 *
 * 手機是卡片、桌機是表格——同一份資料兩種呈現。表格在 390px 寬的螢幕上
 * 只能橫向捲，而橫向捲的表格在手機上很難用。
 *
 * singleton（首頁文案、全站設定）沒有列表，直接跳到那唯一一筆的編輯頁。
 */
export default function List({ collection: c }: { collection: Collection }) {
  const [items, setItems] = useState<Rec[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    if (c.kind === 'singleton') {
      location.hash = `#/${c.name}/_`;
      return;
    }
    setItems(null);
    api
      .get<{ items: Rec[]; total: number }>(
        `/api/admin/c/${c.name}?limit=${LIMIT}&offset=${page * LIMIT}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      )
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => setErr(e.message));
  }, [c.name, q, page]);

  if (c.kind === 'singleton') return null;

  const listed = c.fields.filter((f) => f.listed).slice(0, 5);
  const title = (x: Rec) => String(x[c.titleField || 'title'] || x.name || x.code || x.email || '（未命名）');

  return (
    <>
      <h1 className="a-h1">{c.label}</h1>
      {c.intro && <p className="a-intro">{c.intro}</p>}
      {err && <div className="a-msg a-msg--err">{err}</div>}

      <div className="a-toolbar">
        <input
          className="a-input a-search" placeholder={`搜尋${c.label}`} value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <a className="a-btn a-btn--ghost a-btn--sm" href={`/api/admin/export/${c.name}`} download>匯出 CSV</a>
        {c.canWrite && c.canCreate !== false && (
          <a className="a-btn a-btn--brand" href={`#/${c.name}/new`}>
            <Icon name="plus" size={16} /> 新增
          </a>
        )}
      </div>

      {!items ? (
        <div className="a-empty">載入中…</div>
      ) : !items.length ? (
        <div className="a-empty">
          <p>{q ? '找不到符合的資料。' : `還沒有${c.label}。`}</p>
          {!q && c.canWrite && c.canCreate !== false && (
            <a className="a-btn a-btn--brand" href={`#/${c.name}/new`}>建立第一筆</a>
          )}
        </div>
      ) : (
        <>
          <Sortable
            collection={c}
            items={items}
            onReorder={(next) => {
              setItems(next);
              api.post(`/api/admin/c/${c.name}/reorder`, { ids: next.map((x) => x.id) }).catch((e) => setErr(e.message));
            }}
            render={(x, drag) => (
              <a className="a-card" href={`#/${c.name}/${x.id}`} key={x.id}>
                <div className="a-card__t" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {drag}
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title(x)}</span>
                </div>
                <div className="a-card__meta">
                  {listed.filter((f) => f.name !== (c.titleField || 'title')).map((f) => (
                    <span key={f.name}><b>{f.label}</b> {cell(f, x[f.name])}</span>
                  ))}
                </div>
              </a>
            )}
          />

          <table className="a-table">
            <thead>
              <tr>
                {c.sortable && <th style={{ width: 34 }} />}
                <th>{c.fields.find((f) => f.name === (c.titleField || 'title'))?.label || '名稱'}</th>
                {listed.filter((f) => f.name !== (c.titleField || 'title')).map((f) => <th key={f.name}>{f.label}</th>)}
                <th style={{ width: 90 }}>更新</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} onClick={() => { location.hash = `#/${c.name}/${x.id}`; }}>
                  {c.sortable && <td className="a-mono" style={{ color: 'var(--a-fg-3)', fontSize: 12 }}>{(x.sort ?? 0) + 1}</td>}
                  <td><b>{title(x)}</b></td>
                  {listed.filter((f) => f.name !== (c.titleField || 'title')).map((f) => (
                    <td key={f.name}>{cell(f, x[f.name])}</td>
                  ))}
                  <td className="a-mono" style={{ fontSize: 12, color: 'var(--a-fg-3)' }}>
                    {String(x.updatedAt || '').slice(5, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > LIMIT && (
            <div className="a-row" style={{ marginTop: 14, justifyContent: 'center' }}>
              <button className="a-btn a-btn--ghost a-btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevron-left" size={15} /> 上一頁
              </button>
              <span className="a-mono" style={{ fontSize: 13 }}>{page * LIMIT + 1}–{Math.min(total, (page + 1) * LIMIT)} / {total}</span>
              <button className="a-btn a-btn--ghost a-btn--sm" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>
                下一頁 <Icon name="chevron-right" size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** 列表格裡一格的顯示。型別決定長相，不是每個集合各寫一次。 */
function cell(f: { type: string; options?: { value: string; label: string }[] }, v: any) {
  if (v === null || v === undefined || v === '') return <span style={{ color: 'var(--a-fg-3)' }}>—</span>;
  if (f.type === 'boolean') return <span className="a-pill" data-tone={v ? 'ok' : 'off'}>{v ? '是' : '否'}</span>;
  if (f.type === 'money') return money(v);
  if (f.type === 'select') {
    const o = f.options?.find((x) => x.value === v);
    const tone = /published|active|paid|confirmed|已/.test(String(v)) ? 'ok'
      : /pending|draft|待|草稿/.test(String(v)) ? 'warn' : 'off';
    return <span className="a-pill" data-tone={tone}>{o?.label.split('・')[0] || String(v)}</span>;
  }
  if (f.type === 'date' || f.type === 'datetime') return <span className="a-mono" style={{ fontSize: 13 }}>{String(v).slice(0, 16).replace('T', ' ')}</span>;
  if (Array.isArray(v)) return `${v.length} 筆`;
  if (typeof v === 'object') return '…';
  return String(v);
}

/**
 * 拖曳排序。
 *
 * 用 Pointer 事件而不是 HTML5 的拖放 API，因為後者在手機上根本不會觸發。
 * touch-action:none 在握把上（見 admin.css 的 .a-grab），不然一拖就變成捲頁面。
 */
function Sortable({
  collection: c, items, onReorder, render,
}: {
  collection: Collection;
  items: Rec[];
  onReorder: (next: Rec[]) => void;
  render: (x: Rec, drag: React.ReactNode) => React.ReactNode;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  if (!c.sortable || !c.canWrite) {
    return <div className="a-cards">{items.map((x) => render(x, null))}</div>;
  }

  const onDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging || !boxRef.current) return;
    const cards = [...boxRef.current.querySelectorAll<HTMLElement>('[data-row]')];
    const overEl = cards.find((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY >= r.top && e.clientY <= r.bottom;
    });
    const overId = overEl?.dataset.row;
    if (!overId || overId === dragging) return;
    const from = items.findIndex((x) => x.id === dragging);
    const to = items.findIndex((x) => x.id === overId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
  };

  return (
    <div className="a-cards" ref={boxRef} onPointerMove={onMove} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
      {items.map((x) => (
        <div key={x.id} data-row={x.id} className={dragging === x.id ? 'a-dragging' : ''}>
          {render(
            x,
            <span
              className="a-grab" title="按住拖曳調整順序"
              onPointerDown={onDown(x.id)}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <Icon name="grip" size={16} />
            </span>,
          )}
        </div>
      ))}
    </div>
  );
}
