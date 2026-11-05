import { useEffect, useState } from 'react';
import { api, type Cert as CertRec, type CertSettings } from '../api';
import Cert, { type CertTune } from '../Cert';
import { certToBlob, certsToPdf, downloadBlob, zipBlobs } from '../certExport';
import Icon from '../Icon';

/**
 * 證照產生器：把選到的學員出成圖檔。
 *
 * 證照本體跟 cert.html 同一份版式（Cert 元件），這裡只加「批次出圖」：
 * 單張直接下載，多張打包成一個 ZIP（出圖、打包全在瀏覽器端，不碰付費 API）。
 * 出圖用 1398 寬 ×2，列印級；版面跟畫面上看到的逐像素一致。
 *
 * 簽名顏色、紅印顯不顯示先留著可調（預設黑、都顯示）；用印的精確位置
 * Robin 說之後再喬，所以位置沿用 cert.html 的預設值，不開滑桿。
 */

const safe = (s: string) => (s || 'cert').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 40);

export default function Generate({ certs, onBack }: { certs: CertRec[]; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [tune, setTune] = useState<CertTune>({ sigColor: 'black', showSig: true, showSeal: true });
  const [defCourse, setDefCourse] = useState('n8n Quickstart');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  // 讀「獎狀設定」當出圖的起點：owner 在設定頁喬好的簽名/用印/落款，這裡直接套用。
  useEffect(() => {
    api.get<{ settings: CertSettings }>('/api/teacher/settings').then((r) => {
      const s = r.settings;
      setTune({
        style: s.style, sigColor: s.sigColor, showSig: s.showSig, showCaption: s.showCaption, showSeal: s.showSeal, showStamp: s.showStamp,
        sigW: s.sigW, sigX: s.sigX, sigY: s.sigY,
        sealX: s.sealX, sealY: s.sealY, sealSize: s.sealSize, sealRot: s.sealRot, sealOp: s.sealOp,
        stampX: s.stampX, stampY: s.stampY, stampSize: s.stampSize,
        endorseCaption: s.endorseCaption, blocks: s.blocks,
        overlayImg: s.overlayImg, overlayShow: s.overlayShow, overlayX: s.overlayX, overlayY: s.overlayY, overlaySize: s.overlaySize, overlayOpacity: s.overlayOpacity,
      });
      if (s.defaultCourse) setDefCourse(s.defaultCourse);
    }).catch(() => { /* 讀不到就用元件預設，不擋出圖 */ });
  }, []);

  if (!certs.length) {
    return (
      <div className="t-empty">
        <p>還沒有選要產生的證照。</p>
        <button className="t-btn t-btn--ghost" onClick={onBack}><Icon name="chevron-left" size={16} /> 回證照清單去勾選</button>
      </div>
    );
  }

  const cur = certs[Math.min(idx, certs.length - 1)];
  const data = { studentName: cur.studentName, course: cur.course || defCourse, issueDate: cur.issueDate, serial: cur.serial };

  async function one() {
    setErr(''); setBusy('one');
    try {
      if (format === 'pdf') {
        downloadBlob(await certsToPdf([{ data, tune }], 2), `${safe(cur.studentName)}-n8n證照.pdf`);
      } else {
        const blob = await certToBlob(data, tune, { format, scale: 2 });
        downloadBlob(blob, `${safe(cur.studentName)}-n8n證照.${format === 'jpeg' ? 'jpg' : 'png'}`);
      }
    } catch (e: any) { setErr(e.message || '出圖失敗'); }
    finally { setBusy(''); }
  }

  async function all() {
    setErr(''); setBusy('all');
    try {
      if (format === 'pdf') {
        // 全部合成一份 PDF（每張一頁）
        const items = certs.map((c) => ({
          data: { studentName: c.studentName, course: c.course || defCourse, issueDate: c.issueDate, serial: c.serial },
          tune,
        }));
        downloadBlob(await certsToPdf(items, 2), `n8n證照_${certs.length}張.pdf`);
      } else {
        const files: { name: string; blob: Blob }[] = [];
        for (let i = 0; i < certs.length; i++) {
          const c = certs[i];
          setBusy(`all:${i + 1}/${certs.length}`);
          const blob = await certToBlob(
            { studentName: c.studentName, course: c.course || defCourse, issueDate: c.issueDate, serial: c.serial },
            tune, { format, scale: 2 });
          files.push({ name: `${safe(c.studentName)}-n8n證照.${format === 'jpeg' ? 'jpg' : 'png'}`, blob });
        }
        if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
        else downloadBlob(await zipBlobs(files), `n8n證照_${files.length}張.zip`);
      }
    } catch (e: any) { setErr(e.message || '批次出圖失敗'); }
    finally { setBusy(''); }
  }

  return (
    <div>
      <div className="t-row" style={{ marginBottom: 12 }}>
        <button className="t-btn t-btn--ghost t-btn--sm" onClick={onBack}><Icon name="chevron-left" size={16} /> 清單</button>
        <h1 className="t-h1" style={{ margin: 0 }}>產生證照</h1>
        <span className="t-spacer t-mono" style={{ fontSize: 12, color: 'var(--t-fg-3)' }}>{certs.length} 張</span>
      </div>

      {err && <div className="t-msg t-msg--err">{err}</div>}

      <div className="t-gen">
        <div className="t-gen__stage">
          <Cert data={data} tune={tune} />
          {certs.length > 1 && (
            <div className="t-row" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="t-btn t-btn--ghost t-btn--sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>上一張</button>
              <span className="t-mono" style={{ fontSize: 13 }}>{Math.min(idx, certs.length - 1) + 1} / {certs.length}　{cur.studentName}</span>
              <button className="t-btn t-btn--ghost t-btn--sm" disabled={idx >= certs.length - 1} onClick={() => setIdx((i) => Math.min(certs.length - 1, i + 1))}>下一張</button>
            </div>
          )}
        </div>

        <aside className="t-gen__side">
          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">檔案格式</div>
            <div className="t-seg">
              <button aria-pressed={format === 'png'} onClick={() => setFormat('png')}>PNG</button>
              <button aria-pressed={format === 'jpeg'} onClick={() => setFormat('jpeg')}>JPG</button>
              <button aria-pressed={format === 'pdf'} onClick={() => setFormat('pdf')}>PDF</button>
            </div>
            <p className="t-f__help" style={{ margin: '8px 0 0' }}>
              {format === 'pdf' ? '多張會合成「一份」PDF（每張一頁）。' : '圖片格式；多張會打包成一個 ZIP。'}
            </p>
          </div>

          <div className="t-panel" style={{ margin: 0 }}>
            <div className="t-panel__h">獎狀格式</div>
            <p className="t-f__help" style={{ margin: 0 }}>
              簽名顏色/位置、公司紅印統一在 <a href="#/settings" style={{ color: 'var(--t-brand)', fontWeight: 600 }}>獎狀設定</a> 調，
              這裡出的圖會套用那份設定。
            </p>
          </div>

          <button className="t-btn t-btn--brand" disabled={!!busy} onClick={one}>
            <Icon name="download" size={16} /> {busy === 'one' ? '出圖中…' : '下載這一張'}
          </button>
          <button className="t-btn" disabled={!!busy} onClick={all}>
            <Icon name="download" size={16} />
            {busy.startsWith('all') ? `出圖中 ${busy.split(':')[1] || ''}…`
              : certs.length > 1 ? (format === 'pdf' ? `全部 ${certs.length} 張合成一份 PDF` : `全部 ${certs.length} 張打包 ZIP`)
              : '下載'}
          </button>
          <p className="t-f__help">出圖為 1398×965 的 2 倍解析度（約 2796px 寬），印 A4／A5 橫式都夠清楚。</p>
        </aside>
      </div>
    </div>
  );
}
