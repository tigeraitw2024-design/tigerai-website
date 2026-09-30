import { useEffect, useRef, useState } from 'react';
import { api, type Rec } from '../api';
import Icon from './Icon';

/**
 * 圖片／檔案欄位。
 *
 * 存的是 media 的 id，不是網址。這樣同一張圖被好幾個地方用到時，
 * 換圖只要換一次；而且刪圖之前查得出來還有誰在用。
 *
 * 手機上可以直接開相機拍——accept 只寫 image/* 時，手機瀏覽器會自己
 * 給「拍照／從相簿選」的選單，不用額外處理。
 */
export default function MediaPicker({
  value, onChange, ro, imagesOnly,
}: { value: string; onChange: (v: string) => void; ro?: boolean; imagesOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [rec, setRec] = useState<Rec | null>(null);

  useEffect(() => {
    if (!value) {
      setRec(null);
      return;
    }
    // 這個欄位吃兩種值：
    //   檔案庫的 id      後台上傳的檔案，要去查才知道網址
    //   直接的檔案路徑    匯入的初始資料與放在 public/ 裡的圖，本來就是路徑
    // 後者是刻意保留的：站上的顧問照片、夥伴 logo 都是隨程式一起發的檔案，
    // 硬要先搬進檔案庫才看得到，只是多一道沒必要的手續。
    if (looksLikePath(value)) {
      setRec({ name: value, url: toUrl(value), mime: guessMime(value), external: true });
      return;
    }
    api
      .get<Rec>(`/api/admin/c/media/${value}`)
      .then(setRec)
      // 查不到就當成路徑，至少畫面上看得到，不會變成一個空框加一堆主控台錯誤
      .catch(() => setRec({ name: value, url: toUrl(value), mime: guessMime(value), external: true }));
  }, [value]);

  return (
    <div className="a-picker">
      <div className="a-picker__prev">
        {rec?.url && /^image\//.test(rec.mime) ? (
          <img src={rec.url} alt="" />
        ) : rec ? (
          <span className="a-thumb__ext a-mono">{(rec.name || '').split('.').pop()}</span>
        ) : (
          <Icon name={imagesOnly ? 'image' : 'download'} size={22} />
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, wordBreak: 'break-all', marginBottom: 6 }}>
          {rec ? rec.name : <span style={{ color: 'var(--a-fg-3)' }}>還沒選檔案</span>}
        </div>
        {rec?.external && (
          <div className="a-f__help" style={{ marginBottom: 6 }}>
            這是隨程式一起發的檔案，不在檔案庫裡。要換成自己上傳的，按下面的「選擇或上傳」。
          </div>
        )}
        {!ro && (
          <div className="a-row">
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setOpen(true)}>選擇或上傳</button>
            {value && <button type="button" className="a-btn a-btn--danger a-btn--sm" onClick={() => onChange('')}>移除</button>}
          </div>
        )}
      </div>

      {open && (
        <Browser
          imagesOnly={imagesOnly}
          current={value}
          onPick={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function Browser({
  onPick, onClose, current, imagesOnly,
}: { onPick: (id: string) => void; onClose: () => void; current: string; imagesOnly?: boolean }) {
  const [items, setItems] = useState<Rec[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api
      .get<{ items: Rec[] }>(`/api/admin/c/media?limit=120${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      .then((r) => setItems(r.items))
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, [q]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr('');
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', imagesOnly ? 'images' : 'files');
        // 圖片的寬高在這裡量好一起送。
        // 在 Worker 裡解圖片要帶一個解碼函式庫，那會把 Worker 撐大又吃運算額度，
        // 而瀏覽器本來就已經把圖載進來了，量一下不用錢。
        if (/^image\//.test(file.type) && file.type !== 'image/svg+xml') {
          const dim = await measure(file);
          form.append('width', String(dim.w));
          form.append('height', String(dim.h));
        }
        await api.upload('/api/admin/media/upload', form);
      }
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const shown = (items || []).filter((m) => (imagesOnly ? /^image\//.test(m.mime) : true));

  return (
    <div className="a-modal" onClick={onClose}>
      <div className="a-modal__box" onClick={(e) => e.stopPropagation()}>
        <div className="a-modal__head">
          <h3>檔案庫</h3>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm a-spacer" onClick={onClose}>
            <Icon name="x" size={15} /> 關閉
          </button>
        </div>

        {err && <div className="a-msg a-msg--err">{err}</div>}

        <div className="a-toolbar">
          <input className="a-input a-search" placeholder="搜尋檔名" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="a-btn a-btn--brand" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} /> {busy ? '上傳中…' : '上傳'}
          </button>
          <input
            ref={fileRef} type="file" hidden multiple
            accept={imagesOnly ? 'image/*' : undefined}
            onChange={(e) => upload(e.target.files)}
          />
        </div>

        {!items ? (
          <div className="a-empty">載入中…</div>
        ) : !shown.length ? (
          <div className="a-empty">還沒有檔案。按上面的「上傳」加第一個。</div>
        ) : (
          <div className="a-grid">
            {shown.map((m) => (
              <button
                key={m.id} type="button" className="a-thumb" data-on={m.id === current ? '1' : '0'}
                title={m.name} onClick={() => onPick(m.id)}
              >
                {/^image\//.test(m.mime) ? (
                  <img src={m.url} alt={m.alt || m.name} loading="lazy" />
                ) : (
                  <span className="a-thumb__ext a-mono">{(m.name || '').split('.').pop()}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 檔案庫的 id 是一串英數字，沒有斜線也沒有副檔名；路徑兩者至少有一個。 */
const looksLikePath = (v: string) => v.includes('/') || /\.[a-z0-9]{2,5}$/i.test(v);

/** 初始資料存的是不帶開頭斜線的相對路徑，補上才變成網址 */
const toUrl = (v: string) => (/^(https?:)?\/\//.test(v) || v.startsWith('/') ? v : '/' + v);

function guessMime(v: string) {
  const ext = (v.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'].includes(ext)) {
    return ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  }
  return 'application/octet-stream';
}

function measure(file: File): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      res({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      res({ w: 0, h: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
