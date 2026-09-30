import { useState } from 'react';
import type { Flow } from '../../data/flows';
import type { DeptCase } from '../../data/depts';
import CaseFilePane from './CaseFilePane';

/**
 * 企業首選（首頁 05b）。移植自 design/首頁.dc.html。
 *
 * 左欄是兩層互斥的清單：
 *   預設展開「企業首選工作流」01–06（來自 n8n 原檔）
 *   底下一條「13 部門案例」收合列，點開就換成 01–13，上面那層收起來
 *   兩層都是點一列展開痛點／解方／成效，選中的那列左側有 3px 虎金線、名稱轉金
 *   標題和引言也跟著換（secTitle／secIntro／swapTitle／swapSub）
 *
 * ⚠ 右欄的案卷還沒移植：資料夾式頁籤（範例影片／看底層）、
 *   依 n8n JSON 繪製節點與流動虛線的畫布（滾輪以游標為中心縮放、按住拖曳平移）、
 *   隱藏 YouTube 身份的片段循環播放器。那是下一個增量。
 *   現在右欄是同尺寸的佔位，所以左欄和整段的高度都正確。
 */

const MONO = "'JetBrains Mono',monospace";
const DISPLAY = "'Manrope','Noto Sans TC',sans-serif";

/** 六條流程的情境、成效數字、痛點、解方、成效。順序對應 flows.ts。 */
const FLOW_DEMO = [
  ['文件轉檔歸位', '10 分 → 8 秒', '各部門交來的文件格式五花八門，人工重排排到下班。', '收到檔案自動辨識格式，套公司範本後存回正確位置。', '一份從 10 分鐘縮到 8 秒，格式零出錯。'],
  ['報價自動核對', '2 小時 → 10 分', '供應商報價與歷史採購價，逐筆對 Excel 對到眼花。', '自動抓報價單、比對歷史價，超標自動標紅開單。', '一輪比價從 2 小時縮到 10 分鐘。'],
  ['散會即出紀錄', '40 分 → 3 分', '會後整理錄音與待辦，40 分鐘起跳還常漏。', '錄音自動轉寫，AI 摘要重點，待辦直接派給人。', '紀錄 3 分鐘出稿，待辦零漏派。'],
  ['檔案自動歸位', '找檔 10 秒內', '檔案散在信箱、桌面與共用槽，找比存還久。', 'AI 自動分類、重新命名、歸進對的資料夾。', '歸檔工時 −90%，要什麼 10 秒內找到。'],
  ['信箱自動分流', '每天省 40 分', '信箱爆量，急件被促銷信淹沒。', 'AI 讀信自動分類貼標，急件即時提醒。', '每天省 40 分鐘，急件零漏接。'],
  ['週報自動彙整', '半天 → 5 分', '每週同一套複製貼上，彙整表格做半天。', '定時抓資料、彙整成表、自動寄給該收的人。', '週報從半天縮到 5 分鐘。'],
];

type Row = { no: string; name: string; scene: string; kpi: string; pain: string; fix: string; result: string };

// 資料是頁面傳進來的，所以這兩個表要在元件裡算，不能留在模組層。
const toFlowRows = (flows: Flow[]): Row[] =>
  flows.map((f, i) => {
    const m = FLOW_DEMO[i] ?? ['', '', '', '', ''];
    return { no: `0${i + 1}`, name: f.name, scene: m[0], kpi: m[1], pain: m[2], fix: m[3], result: m[4] };
  });

const toDeptRows = (depts: DeptCase[]): Row[] =>
  depts.map((d, i) => ({
    no: String(i + 1).padStart(2, '0'),
    name: d.d,
    scene: d.s,
    kpi: d.k,
    pain: d.p,
    fix: d.f,
    result: d.r,
  }));

function List({
  rows,
  sel,
  onPick,
}: {
  rows: Row[];
  sel: number;
  onPick: (i: number) => void;
}) {
  return (
    <div style={{ borderTop: '1px solid var(--border-strong)' }}>
      {rows.map((r, i) => {
        const on = i === sel;
        return (
          <div key={r.no} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div
              className="tg-echoice-row"
              onClick={() => onPick(i)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr auto 20px',
                gap: 12,
                alignItems: 'baseline',
                padding: '14px 8px 14px 12px',
                cursor: 'pointer',
                borderLeft: `3px solid ${on ? 'var(--tiger-500)' : 'transparent'}`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--fg-tertiary)' }}>{r.no}</span>
              <span style={{ minWidth: 0 }}>
                <b style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 700, color: on ? 'var(--tiger-600)' : 'var(--fg-primary)' }}>{r.name}</b>
                <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>　{r.scene}</span>
              </span>
              {/* 成效數字常駐，不用點開就看得到 */}
              <b style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>{r.kpi}</b>
              <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{on ? '▲' : '▼'}</span>
            </div>
            <div style={{ display: on ? 'grid' : 'none', padding: '2px 8px 20px 55px', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)' }}><b style={{ color: 'var(--fg-primary)' }}>痛點：</b>{r.pain}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)' }}><b style={{ color: 'var(--fg-primary)' }}>解方：</b>{r.fix}</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)' }}><b style={{ color: 'var(--fg-primary)' }}>成效：</b>{r.result}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 工作流與部門案例由頁面在建置時取得後當 props 傳進來（見 src/content）。
 * 元件自己不 import src/data：那樣資料會被打包進瀏覽器要下載的 JS，
 * 而且接了後台之後前台還是舊的。
 */
export default function EnterpriseChoice({ flows: FLOWS, depts: DEPTS }: { flows: Flow[]; depts: DeptCase[] }) {
  const flowRows = toFlowRows(FLOWS);
  const deptRows = toDeptRows(DEPTS);
  const [deptOpen, setDeptOpen] = useState(false);
  const [flowSel, setFlowSel] = useState(0);
  const [deptSel, setDeptSel] = useState(0);

  const active = deptOpen ? deptRows[deptSel] : flowRows[flowSel];

  return (
    <>
      <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--tiger-700)' }}>企業首選</span>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, margin: '12px 0 16px' }}>
        {deptOpen ? '13 個部門，卡在哪都有解。' : '6 條流程，搬進公司就能跑。'}
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--fg-secondary)', maxWidth: '62ch', margin: '0 0 32px' }}>
        {deptOpen
          ? '每列先看數字，點開看痛點與解方，點列切換右邊案卷。實際畫面與圖表逐部門補上。'
          : '六條都是 n8n 實跑的原檔：點一列看痛點與成效，右邊案卷就是那條流程，虛線是資料在跑。'}
      </p>

      <div data-m="stack" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 48, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: deptOpen ? 'none' : 'block' }}>
            <List rows={flowRows} sel={flowSel} onPick={setFlowSel} />
          </div>

          {/* 兩層互斥的切換列 */}
          <div
            className="tg-echoice-swap"
            onClick={() => setDeptOpen((v) => !v)}
            style={{ marginTop: 32, border: '1px solid var(--border-subtle)', background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'baseline', gap: 16, cursor: 'pointer' }}
          >
            <b style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700 }}>{deptOpen ? '企業首選工作流' : '13 部門案例'}</b>
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
              {deptOpen ? '6 條現成流程，搬回就能跑' : '你的部門卡在哪，這裡都有解'}
            </span>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 12, color: 'var(--tiger-700)' }}>
              {deptOpen ? '▲ 收起' : '▼ 展開'}
            </span>
          </div>

          <div style={{ display: deptOpen ? 'block' : 'none', marginTop: 16 }}>
            <List rows={deptRows} sel={deptSel} onPick={setDeptSel} />
          </div>
        </div>

        {/* 右欄案卷 */}
        <div data-m="unstick" style={{ minWidth: 0, position: 'sticky', top: 120 }}>
          <CaseFilePane
            mode={deptOpen ? 'dept' : 'flow'}
            flow={FLOWS[flowSel]}
            flowIndex={flowSel}
            deptNo={deptRows[deptSel].no}
            deptName={deptRows[deptSel].name}
            deptKpi={deptRows[deptSel].kpi}
          />
        </div>
      </div>
    </>
  );
}
