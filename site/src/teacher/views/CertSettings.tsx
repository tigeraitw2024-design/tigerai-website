import { useEffect, useState } from 'react';
import { api, type CertSettings as TSettings } from '../api';
import Cert from '../Cert';
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

const SAMPLE = { studentName: 'LIN,YUNG-CHING', issueDate: 'July 29, 2026' };

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

  async function save() {
    if (!s) return;
    setErr(''); setMsg(''); setBusy(true);
    try { setS((await api.put<{ settings: TSettings }>('/api/teacher/settings', s)).settings); setMsg('已儲存，之後產生的證照都會套用這份設定。'); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (err && !s) return <div className="t-msg t-msg--err">{err}</div>;
  if (!s) return <div className="t-empty">載入中…</div>;

  const sample = { studentName: SAMPLE.studentName, course: s.defaultCourse || 'n8n Quickstart', issueDate: SAMPLE.issueDate };

  return (
    <div>
      <h1 className="t-h1">獎狀設定</h1>
      <p className="t-intro">設定證照的格式與內容——簽名、公司紅印、落款文字。這裡設好，之後「產生證照」出的每一張都照這份走。</p>
      {err && <div className="t-msg t-msg--err">{err}</div>}
      {msg && <div className="t-msg t-msg--ok">{msg}</div>}

      <div className="t-gen">
        <div className="t-gen__stage">
          <Cert data={sample} tune={s} />
          <p className="t-f__help" style={{ textAlign: 'center', marginTop: 10 }}>預覽（範例姓名）。實際姓名、證照名稱、日期會換成每位學員的資料。</p>
        </div>

        <aside className="t-gen__side">
          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">內容</div>
            <div className="t-f"><label className="t-f__label">落款文字（簽名下方）</label>
              <input className="t-input" value={s.endorseCaption} onChange={(e) => set('endorseCaption', e.target.value)} /></div>
            <div className="t-f" style={{ marginBottom: 0 }}><label className="t-f__label">預設證照名稱</label>
              <input className="t-input" value={s.defaultCourse} onChange={(e) => set('defaultCourse', e.target.value)} placeholder="n8n Quickstart" /></div>
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
