import { useEffect, useState } from 'react';
import { api, type CertSettings as TSettings } from '../api';
import Cert, { BLOCKS, type BlockCfg } from '../Cert';
import Icon from '../Icon';

/**
 * 獎狀設定（owner 專用）。
 *
 * 把證照的「格式與內容」一次設好、存進後台，全站（產生器、預覽）都讀這一份：
 *   - 內容：落款公司名、預設證照名稱
 *   - 格式：Morris 簽名顏色／位置／大小、虎智紅印位置／大小／角度／透明度、要不要顯示
 *
 * 左邊即時預覽（用一筆範例資料），右邊調，按「儲存設定」寫回 /api/teacher/settings。
 * 這就是原本在樣本頁（Artifact）用滑桿調的那套，包進系統、存起來。
 */

const SAMPLE = { studentName: 'LIN,YUNG-CHING', issueDate: 'Jul 29, 2026' };

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="t-slider">
      <div className="t-slider__top"><span>{label}</span><span className="t-mono">{value}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function BlockCtl({ label, cfg, onChange }: { label: string; cfg: BlockCfg; onChange: (c: BlockCfg) => void }) {
  const [open, setOpen] = useState(false);
  const c = { show: true, scale: 100, x: 0, y: 0, ...cfg };
  return (
    <div style={{ borderTop: '1px solid var(--t-line)', padding: '8px 0' }}>
      <div className="t-row" style={{ alignItems: 'center' }}>
        <label className="t-check" style={{ margin: 0 }}>
          <input type="checkbox" checked={c.show} onChange={(e) => onChange({ ...c, show: e.target.checked })} /> {label}
        </label>
        <span className="t-spacer" />
        <button type="button" className="t-btn t-btn--ghost t-btn--sm" onClick={() => setOpen((o) => !o)}>{open ? '收起' : '調整'}</button>
      </div>
      {open && c.show && (
        <div style={{ marginTop: 8 }}>
          <Slider label="大小" value={c.scale} min={40} max={200} suffix="%" onChange={(v) => onChange({ ...c, scale: v })} />
          <Slider label="左右" value={c.x} min={-45} max={45} suffix="%" onChange={(v) => onChange({ ...c, x: v })} />
          <Slider label="上下" value={c.y} min={-45} max={45} suffix="%" onChange={(v) => onChange({ ...c, y: v })} />
        </div>
      )}
    </div>
  );
}

export default function CertSettings() {
  const [s, setS] = useState<TSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<{ settings: TSettings }>('/api/teacher/settings')
      .then((r) => setS(r.settings)).catch((e) => setErr(e.message));
  }, []);

  const set = <K extends keyof TSettings>(k: K, v: TSettings[K]) => { setMsg(''); setS((o) => (o ? { ...o, [k]: v } : o)); };

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 700 * 1024) { setErr('圖片太大（超過 700KB），請先縮小或壓縮再上傳。'); return; }
    const fr = new FileReader();
    fr.onload = () => { setErr(''); setMsg(''); setS((o) => (o ? { ...o, overlayImg: String(fr.result), overlayShow: true } : o)); };
    fr.readAsDataURL(f);
  }

  async function save() {
    if (!s) return;
    setErr(''); setMsg(''); setBusy(true);
    try { setS((await api.put<{ settings: TSettings }>('/api/teacher/settings', s)).settings); setMsg('已儲存，之後產生的證照都會套用這份設定。'); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (err && !s) return <div className="t-msg t-msg--err">{err}</div>;
  if (!s) return <div className="t-empty">載入中…</div>;

  const sample = { studentName: SAMPLE.studentName, course: s.defaultCourse || 'n8n Quickstart', issueDate: SAMPLE.issueDate, serial: '26-1001' };

  return (
    <div>
      <h1 className="t-h1">獎狀設定</h1>
      <p className="t-intro">設定證照的格式與內容——簽名、公司紅印、落款文字。這裡設好，之後「產生證照」出的每一張都照這份走。</p>
      {err && <div className="t-msg t-msg--err">{err}</div>}
      {msg && <div className="t-msg t-msg--ok">{msg}</div>}

      <div className="t-gen">
        <div className="t-gen__stage">
          <Cert data={sample} tune={s}
            editOverlay={!!s.overlayImg && s.overlayShow}
            onOverlayChange={(p) => setS((o) => o ? {
              ...o,
              ...(p.x != null ? { overlayX: p.x } : {}),
              ...(p.y != null ? { overlayY: p.y } : {}),
              ...(p.size != null ? { overlaySize: p.size } : {}),
            } : o)} />
          <p className="t-f__help" style={{ textAlign: 'center', marginTop: 10 }}>
            {(!!s.overlayImg && s.overlayShow)
              ? '自訂圖層已開：直接在證照上拖曳移動、拉右下角藍點縮放；也可用右邊滑桿微調數字。'
              : '預覽（範例姓名）。實際姓名、證照名稱、日期會換成每位學員的資料。'}
          </p>
        </div>

        <aside className="t-gen__side">
          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">內容</div>
            <div className="t-f" style={{ marginBottom: 0 }}><label className="t-f__label">預設證照名稱</label>
              <input className="t-input" value={s.defaultCourse} onChange={(e) => set('defaultCourse', e.target.value)} placeholder="n8n Quickstart" /></div>
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">版面微調</div>
            <p className="t-f__help" style={{ marginTop: 0, marginBottom: 8 }}>每一塊都能開關、移動、縮放。打勾＝顯示，按「調整」拉大小與左右上下位置。</p>
            {BLOCKS.map(([k, label]) => (
              <BlockCtl key={k} label={label} cfg={(s.blocks && s.blocks[k]) || {}}
                onChange={(c) => set('blocks', { ...s.blocks, [k]: c } as TSettings['blocks'])} />
            ))}
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">Morris 簽名</div>
            <div className="t-seg" style={{ marginBottom: 10 }}>
              {(['black', 'red', 'blue'] as const).map((c) => (
                <button key={c} type="button" aria-pressed={s.sigColor === c} onClick={() => set('sigColor', c)}>
                  {c === 'black' ? '黑' : c === 'red' ? '紅' : '藍'}
                </button>
              ))}
            </div>
            <label className="t-check" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={s.showSig} onChange={(e) => set('showSig', e.target.checked)} /> 顯示簽名
            </label>
            {s.showSig && <>
              <Slider label="簽名大小" value={s.sigW} min={8} max={30} onChange={(v) => set('sigW', v)} />
              <Slider label="水平位置" value={s.sigX} min={0} max={100} suffix="%" onChange={(v) => set('sigX', v)} />
              <Slider label="垂直位置" value={s.sigY} min={0} max={100} suffix="%" onChange={(v) => set('sigY', v)} />
            </>}
            <div className="t-f" style={{ marginTop: 10 }}><label className="t-f__label">落款文字（簽名下方）</label>
              <input className="t-input" value={s.endorseCaption} onChange={(e) => set('endorseCaption', e.target.value)} /></div>
            <label className="t-check" style={{ marginBottom: 0 }}>
              <input type="checkbox" checked={s.showCaption} onChange={(e) => set('showCaption', e.target.checked)} /> 顯示落款文字
            </label>
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">公司紅印</div>
            <label className="t-check" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={s.showSeal} onChange={(e) => set('showSeal', e.target.checked)} /> 顯示公司紅印
            </label>
            {s.showSeal && <>
              <Slider label="大小" value={s.sealSize} min={2} max={40} suffix="%" onChange={(v) => set('sealSize', v)} />
              <Slider label="水平位置" value={s.sealX} min={0} max={100} suffix="%" onChange={(v) => set('sealX', v)} />
              <Slider label="垂直位置" value={s.sealY} min={0} max={100} suffix="%" onChange={(v) => set('sealY', v)} />
              <Slider label="角度" value={s.sealRot} min={-30} max={30} suffix="°" onChange={(v) => set('sealRot', v)} />
              <Slider label="透明度" value={s.sealOp} min={30} max={100} suffix="%" onChange={(v) => set('sealOp', v)} />
            </>}
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">藍色大使印章</div>
            <p className="t-f__help" style={{ marginTop: 0, marginBottom: 10 }}>空殼印章（n8n TAIPEI AMBASSADOR），印出來之後請大使在裡面手簽。</p>
            <label className="t-check" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={s.showStamp} onChange={(e) => set('showStamp', e.target.checked)} /> 顯示藍色印章
            </label>
            {s.showStamp && <>
              <Slider label="大小" value={s.stampSize} min={10} max={45} suffix="%" onChange={(v) => set('stampSize', v)} />
              <Slider label="水平位置" value={s.stampX} min={0} max={100} suffix="%" onChange={(v) => set('stampX', v)} />
              <Slider label="垂直位置" value={s.stampY} min={0} max={100} suffix="%" onChange={(v) => set('stampY', v)} />
            </>}
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">自訂圖層（上傳 PNG）</div>
            <p className="t-f__help" style={{ marginTop: 0, marginBottom: 10 }}>上傳一張圖（建議透明底 PNG、檔案小於 700KB）蓋在證照上。上傳後可<b>直接在左邊證照上拖曳</b>移動、<b>拉右下角藍點</b>縮放，或用下面滑桿對數字。大小可拉到 300%（超出滿版）。只放一張。</p>
            <label className="t-drop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 64, border: '1px dashed var(--t-line)', borderRadius: 10, cursor: 'pointer', color: 'var(--t-fg-2)' }}>
              <input type="file" accept="image/png,image/*" onChange={onUpload} style={{ display: 'none' }} />
              <Icon name="upload" size={18} /><span>{s.overlayImg ? '換一張圖' : '選 PNG 圖片'}</span>
            </label>
            {s.overlayImg && <>
              <div style={{ margin: '10px 0', textAlign: 'center' }}>
                <img src={s.overlayImg} alt="" style={{ maxWidth: '100%', maxHeight: 90, borderRadius: 6, background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 14px 14px' }} />
              </div>
              <label className="t-check" style={{ marginBottom: 10 }}>
                <input type="checkbox" checked={s.overlayShow} onChange={(e) => set('overlayShow', e.target.checked)} /> 顯示自訂圖層
              </label>
              {s.overlayShow && <>
                <Slider label="透明度" value={s.overlayOpacity} min={10} max={100} suffix="%" onChange={(v) => set('overlayOpacity', v)} />
                <Slider label="大小" value={s.overlaySize} min={3} max={300} suffix="%" onChange={(v) => set('overlaySize', v)} />
                <Slider label="水平位置" value={s.overlayX} min={0} max={100} suffix="%" onChange={(v) => set('overlayX', v)} />
                <Slider label="垂直位置" value={s.overlayY} min={0} max={100} suffix="%" onChange={(v) => set('overlayY', v)} />
              </>}
              <button type="button" className="t-btn t-btn--ghost t-btn--sm" style={{ marginTop: 6, color: 'var(--t-danger)' }} onClick={() => { set('overlayImg', ''); set('overlayShow', false); }}>移除圖層</button>
            </>}
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">寄送設定</div>
            <p className="t-f__help" style={{ marginTop: 0, marginBottom: 10 }}>按「接單」時用這個算預計寄出日＝接單日＋印刷＋寄送天數。</p>
            <div className="t-row" style={{ gap: 10 }}>
              <div className="t-f" style={{ flex: 1, margin: 0 }}>
                <label className="t-f__label">印刷天數</label>
                <input className="t-input" type="number" min={0} value={s.printDays}
                  onChange={(e) => set('printDays', Number(e.target.value) || 0)} />
              </div>
              <div className="t-f" style={{ flex: 1, margin: 0 }}>
                <label className="t-f__label">寄送天數</label>
                <input className="t-input" type="number" min={0} value={s.shipDays}
                  onChange={(e) => set('shipDays', Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <button className="t-btn t-btn--brand" disabled={busy} onClick={save}>
            <Icon name="check" size={16} /> {busy ? '儲存中…' : '儲存設定'}
          </button>
        </aside>
      </div>
    </div>
  );
}
