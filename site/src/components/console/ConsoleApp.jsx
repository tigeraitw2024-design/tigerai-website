// 主控台 8 站互動 Demo。整站最大的單一元件。
//
// 這支是 design/console/ConsoleAppV2.jsx 原封不動搬過來的，只改了頭尾兩行：
//   原本第 1 行  從 window.TigerAIDesignSystem_0a5667 解構出設計系統元件
//   改成         從 ./ds 匯入（正式站沒有全域 React，不能用 bundle 那套）
//   原本最後一行 Object.assign(window, { TigerConsole: Console, ... })
//   改成         export default Console
// 另外補了 React 的匯入，因為原型靠瀏覽器裡的 Babel 和全域 React。
//
// 中間 1397 行一個字都沒動。要改版面請改原型再重新搬，不要只改這裡，
// 不然下次比對就對不上了。
import React from 'react';
import { Button, ButtonGroup, Field, Input, Select, Textarea, Stat, Badge, Icon } from './ds';
import './console.css';

// 原型用到但主控台沒實際使用的那幾個，用不到就不匯入：
// Checkbox, Radio, Switch, Card, Alert

/* ── 模型 ─────────────────────────────── */
const MODEL_GROUPS = [
  { g: '地端・你的機房', items: ['Qwen3-32B', 'Llama-3.3-70B', 'DeepSeek-R1', 'gemma3:27b'] },
  { g: '雲端輔助・自備 Key', items: ['GPT-5.2', 'Claude 4.5', 'Gemini 3 Pro'] }
];
const KBS = ['合約庫', '履歷庫', '客服知識庫', '產品文件庫'];
const MODEL_LIB = [
  { n: 'qwen3:14b', size: '9.0 GB', d: '中文最強的中型通用模型' },
  { n: 'deepseek-r1:32b', size: '19 GB', d: '長推理・數學與程式' },
  { n: 'llava:13b', size: '8.0 GB', d: '看圖說話・圖表判讀' },
  { n: 'phi4:14b', size: '9.1 GB', d: '小而快・文書摘要' },
  { n: 'mistral-small:24b', size: '14 GB', d: '歐語系・多語客服' }
];
const isCloud = m => MODEL_GROUPS[1].items.includes(m);
const MARKET = [
  { id: 'supplier', n: '供應商管理助手', mono: 'supplier-copilot', ava: '供', icon: 'truck', q: '這家供應商最近交期穩定嗎？', a: '近三個月 12 批有 2 批延遲逾 3 天，建議下單保留緩衝並開啟交期預警。', cite: '交期紀錄 2026 Q2' },
  { id: 'hiring', n: '招募助理', mono: 'hiring-copilot', ava: '招', icon: 'users', q: '後端工程師開缺兩週了，進度怎樣？', a: '收到 47 封履歷，12 封符合必要條件，已排序放進待面試清單，並草擬了兩封邀約信。', cite: '職缺 #BE-03・履歷庫' },
  { id: 'qa', n: '品保稽核助手', mono: 'qa-copilot', ava: '稽', icon: 'clipboard-check', q: '上一批出貨的檢驗紀錄有異常嗎？', a: '檢驗 214 筆，2 筆尺寸超出公差，已標記批號並生成 8D 報告草稿。', cite: '出貨檢驗 2026-08 批次' },
  { id: 'aftersales', n: '售後客服助手', mono: 'aftersales-copilot', ava: '售', icon: 'headphones', q: '這台設備的保固還剩多久？', a: '序號 TG-4482 保固到 2027-03-15，還剩 6 個月，上次保養在 5 月，建議 9 月排定回檢。', cite: '保固合約・設備台帳' },
  { id: 'sales', n: '業務報價助手', mono: 'quote-copilot', ava: '價', icon: 'calculator', q: '這張報價單和上一版差在哪？', a: '三處變動：單價 +4.2%、交期 45→60 天、保固縮成 12 個月，差異已標色供審。', cite: '報價單 v3 對照 v2' },
  { id: 'finance', n: '財務對帳助手', mono: 'ledger-copilot', ava: '帳', icon: 'receipt', q: '這個月的請款單都對上了嗎？', a: '42 張請款單對帳完成，1 張金額與採購單差 $1,200，已退回並通知承辦。', cite: '2026-08 應付帳款' },
  { id: 'hrops', n: '出勤差勤助手', mono: 'attendance-copilot', ava: '勤', icon: 'calendar-days', q: '這週加班申請有超標的嗎？', a: '3 件超過月上限 46 小時，已擋下並通知主管改排補休。', cite: '出勤系統 2026-W35' },
  { id: 'it', n: 'IT 支援助手', mono: 'helpdesk-copilot', ava: '資', icon: 'wrench', q: '同仁反映 VPN 連不上，常見原因是什麼？', a: '近 30 天 17 件 VPN 工單，82% 是憑證過期，已生成自助更新指引。', cite: 'IT 工單庫・近 30 天' },
  { id: 'rd', n: '研發文件助手', mono: 'lab-copilot', ava: '研', icon: 'flask-conical', q: '上一版實驗報告的結論是什麼？', a: '配方 B 良率 94.6%，高於 A 的 91.2%，建議下一輪以 B 為基準微調。', cite: '實驗報告 #R-118' },
  { id: 'mfg', n: '生產排程助手', mono: 'schedule-copilot', ava: '產', icon: 'factory', q: '下週產線排程有衝突嗎？', a: '週三 CNC-02 兩張工單重疊 3 小時，已建議移到夜班，不影響交期。', cite: '排程表 2026-W36' },
  { id: 'logistics', n: '倉儲物流助手', mono: 'warehouse-copilot', ava: '倉', icon: 'package', q: '這批訂單的庫存夠出嗎？', a: '成品庫存 1,860 件，訂單需求 1,500，可出貨，安全庫存仍餘 360。', cite: '庫存台帳 2026-08-27' },
  { id: 'admin', n: '總務行政助手', mono: 'office-copilot', ava: '務', icon: 'building-2', q: '下週三下午還有會議室嗎？', a: 'A 棟 3 間全滿，B2 視訊室 14:00–17:00 可預約，已幫你暫鎖 15 分鐘。', cite: '會議室系統' }
];
const CUSTOM_AGENTS = [];
const DEPTS = ['採購部', '人資部', '法務部', '財務部', '行銷部', '業務部', '客服部', '品保部', '生管部', '資訊部', '研發部', '總務部', '倉儲物流'];
const agentOf = m => MARKET.concat(CUSTOM_AGENTS).find(a => a.n === m);
const DEPT_OF = { supplier: '採購部', hiring: '人資部', qa: '品保部', aftersales: '客服部', sales: '業務部', finance: '財務部', hrops: '人資部', it: '資訊部', rd: '研發部', mfg: '生管部', logistics: '倉儲物流', admin: '總務部' };
const yamlOf = ag => [
  'name: ' + (ag.custom ? 'custom-copilot' : ag.mono),
  'title: ' + ag.n,
  'department: ' + (ag.dept || DEPT_OF[ag.id] || '—'),
  'version: 0.3.1 · license: internal',
  'knowledge: [' + (ag.kb || '合約庫, ' + ag.cite) + ']',
  ...(ag.sys ? ['system_prompt: 「' + ag.sys.slice(0, 22) + (ag.sys.length > 22 ? '…' : '') + '」'] : []),
  ...(ag.skills ? ['skills: [' + ag.skills + ']'] : []),
  ...(ag.feats ? ['features: [' + ag.feats + ']'] : []),
  'workflow: n8n#142 · ' + (ag.flow === false ? '4 nodes' : ag.flow ? '5 nodes（含逾標開單）' : '4 nodes'),
  'model: ' + (ag.model || 'qwen3-32b') + ' · local（不經雲端 API）',
  'budget: ' + (ag.budget || '$300/mo') + ' · on_exceed: ' + (ag.fuse === false ? 'notify' : 'block'),
  'scope: dept-read · cite: ' + (ag.citeReq === false ? 'optional' : 'required')
].join('\n');
const modelMeta = m => agentOf(m) ? m + '・AI 同事・你的機房' : m + (isCloud(m) ? '・雲端輔助・你的 Key' : '・你的機房');
const uid = () => Date.now() + Math.random();

/* Q1 各模型答案 */
const A1_BASE = '第 8.2 條付款期 90 天超過上限，且未載逾期利息，建議修訂後送簽。';
const A1 = {
  'Qwen3-32B': A1_BASE,
  'Llama-3.3-70B': '兩處風險：90 天帳期超出政策；缺逾期利息條款。建議修訂 8.2 條。',
  'DeepSeek-R1': '檢核：帳期 90 天（上限 60，超標）；未載逾期利息。建議退回修訂。',
  'gemma3:27b': A1_BASE,
  'GPT-5.2': '以一般商務慣例看，90 天付款期偏長；但是否超出貴司標準，我讀不到你們的合約庫與內規，以下僅為通用建議：約定 60 天內並補逾期利息條款。',
  'Claude 4.5': '90 天付款期高於常見的 60 天慣例，且未見逾期利息約定。細節需對照貴司內規，我無法存取你們的合約庫，內部比對請用地端模型。',
  'Gemini 3 Pro': '以公開慣例判讀：付款期 90 天偏長、缺逾期利息條款。貴司標準的逐條比對，請交給讀得到合約庫的地端模型。'
};

/* ── / 提示詞庫 ───────────────────────── */
const SLASH = [
  { code: '20101', t: '供應商合約付款條件有風險嗎？', a: '第 8.2 條付款期 90 天超過上限，且未載逾期利息，建議修訂後送簽，條文出處在下方。', cite: '供應商合約草稿・第 8.2 條' },
  { code: '20102', t: '這張報價單和上一版差在哪？', a: '三處變動：單價 +4.2%、交期 45→60 天、保固縮成 12 個月，差異已標色供審。', cite: '報價單 v3 對照 v2' },
  { code: '20201', t: '摘要「供應商合約草稿.pdf」的重點', a: '全文 142 段：付款期 90 天、保固 12 個月、違約金上限 5%，其中 3 處建議修訂，出處在下方。', cite: '供應商合約草稿・§3／§8／§11' },
  { code: '20301', t: '草擬一封客訴回覆信', a: '草稿好了：先致歉、說明原因、附新交期 9/18 與 5% 折讓方案，人審後才寄出。', cite: '客服知識庫・回覆範本 #12' },
  { code: '20401', t: '把這份文件翻成英文', a: '已譯成英文，術語照公司詞彙表（交期 = lead time、採購單 = PO），中英對照在下方。', cite: '公司詞彙表 v2' },
  { code: '20501', t: '彙整本週各部門 AI 用量', a: '本週推論 29,340 次、額度用 62%、熔斷 0 次，報表已存進知識庫。', cite: '治理數據 2026-W36' }
];

/* ── 共用輸入框 ─────────────────────────── */
function InputBox({ model, setModel, typed, onTyped, busy, onSend, onAttach, installedAgents = [], pulledModels = [], glow }) {
  const [menu, setMenu] = React.useState(false);
  const boxRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const inRef = React.useRef(null);
  const slashQ = !busy && typed && (typed[0] === '/' || typed[0] === '#') ? typed.slice(1).trim() : null;
  const slashList = slashQ === null ? [] : SLASH.filter(c => !slashQ || c.code.includes(slashQ) || c.t.includes(slashQ));
  const pickSlash = c => { onTyped(c.t); const el = inRef.current; if (el) el.focus(); };
  const openPick = accept => { const el = fileRef.current; if (!el) return; el.accept = accept; el.click(); };
  React.useEffect(() => {
    if (!menu) return;
    const h = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);
  return (
    <div className={'og-inbox' + (glow ? ' og-glow' : '')} ref={boxRef}>
      {menu && (
        <div className="og-menu">
          {MODEL_GROUPS.map((gr, gi) => (
            <div key={gr.g}>
              <h6>{gr.g}</h6>
              {(gi === 0 ? gr.items.concat(pulledModels) : gr.items).map(m => (
                <button key={m} className="item" onClick={() => { setModel(m); setMenu(false); }}>
                  {m}{m === model && <span className="ck"><Icon name="check" size={13} /></span>}
                </button>
              ))}
            </div>
          ))}
          {installedAgents.length > 0 && (
            <div>
              <h6>AI 同事・已安裝</h6>
              {installedAgents.map(a => (
                <button key={a.n} className="item" onClick={() => { setModel(a.n); setMenu(false); }}>
                  {a.n}{a.n === model && <span className="ck"><Icon name="check" size={13} /></span>}
                </button>
              ))}
            </div>
          )}
          <div className="ft">地端為主、雲端備援，Key 在你手上。</div>
        </div>
      )}
      {slashQ !== null && (
        <div className="og-menu og-menu--slash">
          <h6>提示詞</h6>
          {slashList.length === 0 && <div className="ft">沒有符合「{slashQ}」的提示詞</div>}
          {slashList.map(c => (
            <button key={c.code} className="item" onMouseDown={e => { e.preventDefault(); pickSlash(c); }}>
              <span className="code">{c.code}</span><span className="tx">{c.t}</span>
            </button>
          ))}
          <div className="ft">↵ 帶入第一筆・繼續打字可篩選（/20…）</div>
        </div>
      )}
      <input ref={inRef} className="og-in" value={typed} placeholder="訊息… / 指令、~ 檔案、# 提示詞"
        readOnly={busy} onChange={e => onTyped(e.target.value)}
        onKeyDown={e => { if (e.key !== 'Enter') return; if (slashQ !== null && slashList.length) { pickSlash(slashList[0]); return; } onSend(); }} />
      <div className="og-inrow">
        <button className="og-modelbtn" onClick={() => setMenu(v => !v)}>
          <span className="dot" />{model}<Icon name="chevron-down" size={12} />
        </button>
        <span className="og-tools">
          <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { const fs = [...e.target.files]; if (fs.length && onAttach) onAttach(fs); e.target.value = ''; }} />
          <button className="og-toolbtn" title="附件" onClick={() => openPick('')}><Icon name="paperclip" size={15} /></button>
          <button className="og-toolbtn" title="圖片" onClick={() => openPick('image/*')}><Icon name="image" size={15} /></button>
          <button className="og-toolbtn" title="影片" onClick={() => openPick('video/*')}><Icon name="video" size={15} /></button>
          <button className="og-toolbtn" title="文件" onClick={() => openPick('.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx')}><Icon name="file-text" size={15} /></button>
          <button className="og-send" title="送出" onClick={onSend}><Icon name="arrow-up" size={15} /></button>
        </span>
      </div>
    </div>
  );
}

/* ── 逐字打出 ─────────────────────────── */
function TypeText({ text, done, reduced, onDone }) {
  const [n, setN] = React.useState(done || reduced ? text.length : 0);
  const fired = React.useRef(false);
  const fire = () => { if (!fired.current) { fired.current = true; onDone && onDone(); } };
  React.useEffect(() => {
    if (done || reduced) { setN(text.length); fire(); return; }
    setN(0);
    const t = setInterval(() => setN(v => {
      if (v >= text.length) { clearInterval(t); fire(); return v; }
      return v + 1;
    }), 22);
    return () => clearInterval(t);
  }, [text]);
  const fin = n >= text.length;
  return <>{text.slice(0, n)}{!fin && <span className="og-caret" />}</>;
}

/* ── 訊息渲染 ─────────────────────────── */
function Msg({ m, reduced, onDone }) {
  if (m.who === 'sys') return <div className="og-sys">{m.text}</div>;
  if (m.who === 'peer') {
    return (
      <div className="og-msg">
        <div className="who peer">{m.ava}</div>
        <div style={{ minWidth: 0 }}>
          <div className="nm">{m.name}</div>
          <div className="bubble">{m.text}</div>
        </div>
      </div>
    );
  }
  if (m.who === 'me') {
    return (
      <div className="og-msg me">
        {m.kind === 'attach'
          ? <div className="og-file"><Icon name="paperclip" size={14} /><span>{m.text}<span className="meta" style={{ marginLeft: 8 }}>{m.meta}</span></span></div>
          : <div className="bubble">{m.text}</div>}
        <div className="who me">{m.ava || '你'}</div>
      </div>
    );
  }
  return (
    <div className="og-msg">
      <div className={'who ai' + (m.gold ? ' gold' : '')}>{m.ava || 'AI'}</div>
      <div style={{ minWidth: 0 }}>
        {m.name && <div className="nm">{m.name}</div>}
        {m.kind === 'text' && (
          <>
            <div className="bubble"><TypeText text={m.text} done={m.done} reduced={reduced} onDone={onDone} /></div>
            {m.done && m.cite && <div className="og-cite">📄 {m.cite}</div>}
            {m.done && m.meta && <div className="og-mono" style={{ marginTop: 4 }}>{m.meta}</div>}
          </>
        )}
        {m.kind === 'gen' && <div className="bubble"><span className="og-caret" /> 生成中…（地端 ComfyUI）</div>}
        {m.kind === 'img' && (
          <>
            <div className="og-art"><span className="t">秋季發表會<br />AUTUMN LAUNCH</span></div>
            <div className="og-mono" style={{ marginTop: 4 }}>{m.meta}</div>
          </>
        )}
        {m.kind === 'video' && (m.pct < 100
          ? <div className="bubble" style={{ minWidth: 220 }}>影片生成中… {m.pct}%<span className="og-bar" style={{ display: 'block', marginTop: 6 }}><i style={{ width: m.pct + '%' }} /></span></div>
          : <>
              <div className="og-art"><button className="play" title="播放"><Icon name="play" size={18} /></button><span className="t">秋季發表會・開場</span></div>
              <div className="og-mono" style={{ marginTop: 4 }}>0:05・生成於你的 GPU</div>
            </>)}
        {m.kind === 'doc' && (
          <div className="og-file"><Icon name="file-text" size={14} style={{ color: 'var(--tiger-600)' }} /><span>{m.text}<span className="meta" style={{ marginLeft: 8 }}>{m.meta}</span></span></div>
        )}
      </div>
    </div>
  );
}

function useThreadScroll(dep) {
  const ref = React.useRef(null);
  React.useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; });
  return ref;
}

/* ── 站1：對話 ───────────────────────── */
const QUICK = [
  '供應商合約付款條件有風險嗎？',
  '畫秋季發表會主視覺，金黑配色',
  '把主視覺做成 5 秒開場影片',
  '上傳逐字稿，整理成規格書'
];

function StationChat({ reduced, model, setModel, chat, api, installedAgents, models }) {
  const timers = React.useRef([]);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  React.useEffect(() => () => { timers.current.forEach(clearTimeout); api.chatPatch({ busy: false, typed: '' }); }, []);
  const threadRef = useThreadScroll();

  const answerQ1 = m => {
    api.chatPush({ id: uid(), who: 'ai', kind: 'text', ava: '法', text: A1[m] || A1_BASE,
      cite: isCloud(m) ? null : '供應商合約草稿・第 8.2 條', meta: modelMeta(m) });
  };

  const scripts = [
    () => answerQ1(model),
    () => {
      const id = uid();
      api.chatPush({ id, who: 'ai', kind: 'gen', ava: 'AI' });
      later(() => api.chatMsgPatch(id, { kind: 'img', meta: '生成於你的 GPU' }), reduced ? 60 : 1700);
    },
    () => {
      const id = uid();
      api.chatPush({ id, who: 'ai', kind: 'video', ava: 'AI', pct: reduced ? 100 : 0 });
      if (reduced) return;
      const int = setInterval(() => api.chatMsgPatch(id, null, m => ({ pct: Math.min(100, (m.pct || 0) + 4) })), 90);
      timers.current.push(int);
      later(() => clearInterval(int), 2600);
    },
    () => {
      api.chatPush({ id: uid(), who: 'me', kind: 'attach', text: '客戶訪談逐字稿.txt', meta: '已上傳' });
      later(() => api.chatPush({ id: uid(), who: 'ai', kind: 'text', ava: 'AI', text: '整理好了：三項核心需求、兩項限制、建議時程，文件在下方。', meta: modelMeta(model) }), 500);
      later(() => { api.chatPush({ id: uid(), who: 'ai', kind: 'doc', ava: 'AI', text: '需求規格書_v1.docx', meta: '已生成' }); api.addArt('spec'); }, reduced ? 700 : 2400);
    }
  ];

  const run = qi => {
    if (chat.busy) return;
    const q = QUICK[qi];
    api.chatPatch({ busy: true, hint: false });
    const send = () => {
      api.chatPatch({ typed: '' });
      api.chatPush({ id: uid(), who: 'me', kind: 'text', text: q });
      later(() => { scripts[qi](); api.chatPatch({ busy: false, asked1: chat.asked1 || qi === 0 }); }, 350);
    };
    if (reduced) { api.chatPatch({ typed: q }); later(send, 120); return; }
    let k = 0;
    const int = setInterval(() => {
      k++; api.chatPatch({ typed: q.slice(0, k) });
      if (k >= q.length) { clearInterval(int); later(send, 350); }
    }, 26);
    timers.current.push(int);
  };

  /* 換模型 → 第 1 題自動重答 */
  const prevModel = React.useRef(model);
  React.useEffect(() => {
    if (prevModel.current === model) return;
    prevModel.current = model;
    if (chat.busy) return;
    const ag = agentOf(model);
    if (ag) {
      api.chatPush({ id: uid(), who: 'me', kind: 'text', text: ag.q });
      later(() => api.chatPush({ id: uid(), who: 'ai', kind: 'text', ava: ag.ava, name: ag.n, gold: true, text: ag.a, cite: ag.cite, meta: modelMeta(model) }), 350);
      return;
    }
    if (!chat.asked1) return;
    api.chatPush({ id: uid(), who: 'me', kind: 'text', text: QUICK[0] });
    later(() => answerQ1(model), 350);
  }, [model]);

  const onAttach = files => {
    if (chat.busy) return;
    api.chatPatch({ hint: false });
    files.slice(0, 5).forEach(f => api.chatPush({ id: uid(), who: 'me', kind: 'attach', text: f.name, meta: fmtSize(f.size || 0) + '・已上傳' }));
    later(() => api.chatPush({ id: uid(), who: 'ai', kind: 'text', ava: 'AI', text: '收到' + (files.length > 1 ? ' ' + files.length + ' 個檔案' : '「' + files[0].name + '」') + '，已存進這場對話。想讓 AI 引用它回答，到『知識庫』上傳；重新整理就全部消失。', meta: modelMeta(model) }), 500);
  };
  const manualSend = () => {
    const t = chat.typed.trim();
    if (!t || chat.busy) return;
    const sp = SLASH.find(c => c.t === t);
    if (sp) {
      api.chatPatch({ typed: '', hint: false });
      api.chatPush({ id: uid(), who: 'me', kind: 'text', text: t });
      later(() => api.chatPush({ id: uid(), who: 'ai', kind: 'text', ava: 'AI', text: sp.a, cite: sp.cite, meta: modelMeta(model) }), 400);
      return;
    }
    api.chatPatch({ typed: '', hint: false });
    api.chatPush({ id: uid(), who: 'me', kind: 'text', text: t });
    const ag = agentOf(model);
    later(() => api.chatPush({ id: uid(), who: 'ai', kind: 'text', ava: ag ? ag.ava : 'AI', name: ag ? ag.n : undefined, gold: !!ag, text: '這是體驗環境，點下方快選看示範；想跑真的，留 Email 開 30 分鐘沙盒。', meta: modelMeta(model) }), 400);
  };

  return (
    <div className="og-chatcol">
      <div className="og-thread" ref={threadRef}>
        {chat.msgs.length === 0 ? (
          <div className="og-welcome">
            <b>歡迎使用 OpenGenie</b>
            <span>地端 AI，問答、生圖、生影片、生文件，都在這一個框</span>
          </div>
        ) : chat.msgs.map(m => <Msg key={m.id} m={m} reduced={reduced} onDone={m.who === 'ai' && m.kind === 'text' && !m.done ? () => api.chatMsgPatch(m.id, { done: true }) : null} />)}
      </div>
      <InputBox model={model} setModel={setModel} typed={chat.typed} busy={chat.busy} installedAgents={installedAgents} pulledModels={models.done} glow={chat.hint}
        onTyped={v => api.chatPatch({ typed: v })} onSend={manualSend} onAttach={onAttach} />
      <div className="og-quick">
        {QUICK.map((q, qi) => <button key={q} className={'og-chip' + (chat.hint && qi === 0 ? ' og-glow' : '')} disabled={chat.busy} onClick={() => run(qi)}>{q}</button>)}
      </div>
      {chat.hint && <div className="og-hint">↑ 點一個快選，看模擬回覆</div>}
    </div>
  );
}

/* ── 站2：頻道 ───────────────────────── */
const AGENTS = [
  { g: 'AI 同事（自家）', list: [
    { n: '行銷 AI', ava: '行', text: '讀完前面的討論：主視覺定稿、缺 EDM 和 banner、本週交付。我先生成三個尺寸 banner 存進頻道檔案區。', art: 'banners' },
    { n: '財務 AI', ava: '財', text: '補成本視角：檔期預算已用 62%，banner 集中投轉換率最高的兩個版位。' },
    { n: '法務 AI', ava: '法', text: '提醒：主視覺外部字型授權要涵蓋廣告投放，查過合約庫，現有授權 OK。' }
  ] },
  { g: '語言模型（通用）', list: [
    { n: 'Qwen3-32B', ava: 'Q', text: '我讀了以上對話:你們在趕秋季檔期,缺 EDM 和 banner、預算要控。需要我先草擬 EDM 文案,或整理一份本週待辦清單嗎?'.replace(/,/g, '，').replace(/:/g, '：').replace(/\?/g, '？') },
    { n: 'GPT-5.2', ava: 'G', text: '已了解脈絡。我可以協助草擬文案與時程表，不過我讀不到你們的合約庫和報表，公司內部的判斷請交給你們的 AI 同事。' }
  ] }
];
const ALL_AGENTS = AGENTS.flatMap(g => g.list);

function StationChannel({ reduced, model, setModel, chan, api, installedAgents, models }) {
  const timers = React.useRef([]);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  React.useEffect(() => () => { timers.current.forEach(clearTimeout); api.chanPatch({ typed: '' }); }, []);
  React.useEffect(() => {
    if (chan.peersIn) return;
    api.chanPatch({ peersIn: true });
    CHAN_PEERS.forEach((p, k) => {
      later(() => {
        api.chanPatch2(c => ({ ...c, peers: [...(c.peers || []), p.ava], msgs: [...c.msgs, { id: uid(), who: 'sys', text: '── ' + p.name + ' 已加入頻道 ──' }] }));
        later(() => api.chanPush({ id: uid(), who: 'peer', ava: p.ava, name: p.name, text: p.text }), reduced ? 60 : 700);
      }, reduced ? 60 * (k + 1) : 1200 + k * 2600);
    });
  }, []);
  const threadRef = useThreadScroll();

  const join = a => {
    if (chan.joined.includes(a.n)) return;
    api.chanPatch({ joined: [...chan.joined, a.n] });
    api.chanPush({ id: uid(), who: 'sys', text: '── ' + a.n + ' 已加入頻道，正在閱讀前面的對話… ──' });
    later(() => {
      api.chanPush({ id: uid(), who: 'ai', kind: 'text', ava: a.ava, name: a.n, gold: true, text: a.text });
      if (a.art) api.addArt(a.art);
    }, reduced ? 150 : 1000);
  };

  const [roster, setRoster] = React.useState(false);
  const onAttach = files => {
    files.slice(0, 5).forEach(f => api.chanPush({ id: uid(), who: 'me', kind: 'attach', ava: '你', text: f.name, meta: fmtSize(f.size || 0) + '・已分享到頻道' }));
  };
  const manualSend = () => {
    const t = (chan.typed || '').trim();
    if (!t) return;
    api.chanPatch({ typed: '' });
    api.chanPush({ id: uid(), who: 'me', kind: 'text', ava: '你', text: t });
  };

  return (
    <div className="og-chatcol">
      <div className="og-chanhead">
        <b># 秋季新品上市</b>
        <span className="og-mono">成員 {2 + (chan.peers || []).length + chan.joined.length}</span>
        <span className="og-avas">
          <span className="a">陳</span><span className="a">M</span>
          {(chan.peers || []).map(v => <span key={v} className="a">{v}</span>)}
          {chan.joined.map(n => { const a = ALL_AGENTS.find(x => x.n === n); return <span key={n} className="a ai">{a.ava}</span>; })}
        </span>
        <button className="og__kb" style={{ flex: 'none' }} onClick={() => setRoster(true)}><Icon name="users" size={12} />成員</button>
      </div>
      <div className="og-thread" ref={threadRef}>
        {chan.msgs.map(m => <Msg key={m.id} m={m} reduced={reduced} onDone={m.who === 'ai' && m.kind === 'text' && !m.done ? () => api.chanMsgPatch(m.id, { done: true }) : null} />)}
      </div>
      {roster && (
        <div className="og-modal" onClick={e => { if (e.target === e.currentTarget) setRoster(false); }}>
          <div className="og-modal__panel">
            <div className="og-modal__head">
              <b># 秋季新品上市・成員 {2 + (chan.peers || []).length + chan.joined.length}</b>
              <button className="x" title="關閉" onClick={() => setRoster(false)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 6, maxHeight: 300, overflow: 'auto' }}>
              <div className="og-mono" style={{ fontSize: 'var(--fs-12)', color: 'var(--fg-tertiary)' }}>真人・{2 + (chan.peers || []).length}</div>
              {[{ ava: '陳', name: '陳雅婷・行銷' }, { ava: 'M', name: 'Mark・行銷主管' }, ...CHAN_PEERS.filter(p => (chan.peers || []).includes(p.ava))].map(p => (
                <div key={p.ava} className="og-doc" style={{ animation: 'none', opacity: 1, transform: 'none' }}>
                  <span className="a" style={{ width: 22, height: 22, borderRadius: 'var(--radius-full)', background: 'var(--slate-200)', color: 'var(--fg-primary)', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{p.ava}</span>
                  <span style={{ minWidth: 0 }}>{p.name}</span>
                  <Badge variant="success" dot>在線</Badge>
                </div>
              ))}
              <div className="og-mono" style={{ fontSize: 'var(--fs-12)', color: 'var(--fg-tertiary)', marginTop: 6 }}>AI・{chan.joined.length}</div>
              {chan.joined.length === 0 && <div className="og-mono" style={{ fontSize: 'var(--fs-12)', color: 'var(--fg-tertiary)' }}>還沒有 AI 加入，從下方把 AI 加進頻道</div>}
              {chan.joined.map(n => { const a = ALL_AGENTS.find(x => x.n === n); return (
                <div key={n} className="og-doc" style={{ animation: 'none', opacity: 1, transform: 'none' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-full)', background: 'var(--tiger-500)', color: 'var(--ink-900)', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{a.ava}</span>
                  <span style={{ minWidth: 0 }}>{a.n}<span className="meta" style={{ marginLeft: 8 }}>讀得到頻道脈絡・部門權限</span></span>
                  <Badge variant="brand" dot>AI</Badge>
                </div>
              ); })}
            </div>
            <div className="og-modal__note">成員只看得到自己權限內的內容，AI 也一樣。</div>
          </div>
        </div>
      )}
      <InputBox model={model} setModel={setModel} typed={chan.typed || ''} busy={false} installedAgents={installedAgents} pulledModels={models.done}
        onTyped={v => api.chanPatch({ typed: v })} onSend={manualSend} onAttach={onAttach} />
      <div className="og-joinrow">
        <span>把 AI 加進頻道：</span>
        {AGENTS.map(gr => (
          <span key={gr.g} className="grp">
            <span className="og-mono" style={{ marginRight: 4 }}>{gr.g}</span>
            {gr.list.map(a => (
              <button key={a.n} className={'og-chip' + (chan.joined.length === 0 && a.n === '行銷 AI' ? ' og-glow' : '')} disabled={chan.joined.includes(a.n)} onClick={() => join(a)}>
                {chan.joined.includes(a.n) ? '✓ ' + a.n : '＋' + a.n}
              </button>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── 站3：知識庫 ─────────────────────── */
const DOCS = [
  ['供應商合約草稿.pdf', '已索引・142 段', 'ok'],
  ['員工手冊 v3.2.docx', '已索引・387 段', 'ok']
];
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const fakeSeg = b => Math.max(3, Math.min(999, Math.round(b / 2048)));

function StationKnowledge({ reduced, arts, uploads, api, kb }) {
  const [open, setOpen] = React.useState(false);
  const pick = files => { if (files.length) api.upAdd(files); };
  const extra = [];
  if (arts.spec) extra.push(['需求規格書_v1.docx', '來自對話・你剛生成的', 'new']);
  if (arts.banners) extra.push(['秋季新品 banner ×3', '來自頻道・行銷 AI 生成', 'new']);
  const upRows = uploads.map(u => [u.name, (u.state === 'ok' ? '已索引・' + fakeSeg(u.size) + ' 段・' : '') + fmtSize(u.size) + '・你上傳的', u.state === 'ok' ? 'up' : 'wip']);
  const list = [...DOCS, ...extra, ...upRows];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <h4 className="og-h" style={{ margin: 0 }}>{kb} <span className="og-mono">{list.length} 份文件</span></h4>
        <span className={uploads.length === 0 ? 'og-glow' : ''} style={{ marginLeft: 'auto', display: 'inline-flex' }}><Button size="sm" variant="outline" onClick={() => setOpen(true)}>＋ 上傳文件</Button></span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map(([name, meta, state], i) => (
          <div className="og-doc" key={name + i} style={{ animationDelay: (reduced ? 0 : Math.min(i, 6) * 120) + 'ms' }}>
            <Icon name="file-text" size={16} style={{ color: state === 'new' || state === 'up' ? 'var(--tiger-600)' : 'var(--fg-tertiary)' }} />
            <span>{name}<span className="meta" style={{ marginLeft: 10 }}>{meta}</span></span>
            {state === 'ok' && <Badge variant="success" dot>已索引</Badge>}
            {state === 'up' && <Badge variant="success" dot>已索引</Badge>}
            {state === 'new' && <Badge variant="brand" dot>剛加入</Badge>}
            {state === 'wip' && <Badge variant="warning">索引中…</Badge>}
          </div>
        ))}
      </div>
      {extra.length === 0 && uploads.length === 0 && <div className="og-drop">回對話生一份規格書、或到頻道叫行銷 AI 做 banner，產出會出現在這，也可以直接上傳。</div>}
      <div className="og-ok" style={{ marginTop: 'var(--space-4)' }}>AI 只讀這裡的內容回答，答案指得回原文。</div>
      {open && (
        <div className="og-modal" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="og-modal__panel">
            <div className="og-modal__head">
              <b>上傳到{kb}</b>
              <button className="x" title="關閉" onClick={() => setOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <label className="og-modal__drop"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); pick([...e.dataTransfer.files]); }}>
              <input type="file" multiple style={{ display: 'none' }} onChange={e => { pick([...e.target.files]); e.target.value = ''; }} />
              <Icon name="upload" size={22} style={{ color: 'var(--tiger-600)' }} />
              <span>點這裡選檔案，或把檔案拖進來，什麼格式都收</span>
            </label>
            {uploads.length > 0 && (
              <div style={{ padding: '0 var(--space-4)', display: 'grid', gap: 6, maxHeight: 180, overflow: 'auto' }}>
                {uploads.map(u => (
                  <div className="og-doc" key={u.id} style={{ animation: 'none', opacity: 1, transform: 'none' }}>
                    <Icon name="file-text" size={16} style={{ color: 'var(--tiger-600)' }} />
                    <span>{u.name}<span className="meta" style={{ marginLeft: 10 }}>{fmtSize(u.size)}</span></span>
                    {u.state === 'ok' ? <Badge variant="success" dot>已索引</Badge> : <Badge variant="warning">索引中…</Badge>}
                  </div>
                ))}
              </div>
            )}
            <div className="og-modal__note">⚠ 體驗環境，檔案不會真的上傳、不會離開你的電腦，重新整理就全部消失。</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 站4：Workflow（n8n 畫布） ───────────── */
const WF_W = 168, WF_H = 64;
const WF_TYPES = { trigger: '觸發', action: '動作', condition: '條件' };
const WF_INIT = [
  { id: 'w1', type: 'trigger', icon: 'webhook', title: '收到訊息', d: '員工在對話送出問題，webhook 收件並帶上部門與權限。', x: 24, y: 24 },
  { id: 'w2', type: 'action', icon: 'database', title: '檢索／生成', d: '向量檢索知識庫、或呼叫地端模型生成，取回附出處的內容。', x: 240, y: 112 },
  { id: 'w3', type: 'condition', icon: 'shield-check', title: '權限與額度檢查', d: 'LiteLLM 檢查部門額度與資料權限，超標熔斷、越權擋下。', x: 456, y: 24 },
  { id: 'w4', type: 'action', icon: 'archive', title: '回覆＋歸檔', d: '回覆附出處，紀錄留在你的機房，稽核可回溯。', x: 672, y: 112 }
];
const WF_LINKS = [['w1', 'w2'], ['w2', 'w3'], ['w3', 'w4']];
const WF_MORE = [
  { type: 'action', icon: 'mail', title: '寄通知信', d: '重要結果自動寄給負責人，不用有人盯著。' },
  { type: 'condition', icon: 'scale', title: '條款比對', d: '與貴司標準逐項比對，標出差異與風險等級。' },
  { type: 'action', icon: 'ticket', title: '開單派工', d: '超標自動開單給主管，附比對結果。' },
  { type: 'action', icon: 'file-text', title: '生成報告', d: '彙整成報告存進知識庫，下次問得到。' }
];

function StationWorkflow({ reduced, onBridge }) {
  const [nodes, setNodes] = React.useState(WF_INIT);
  const [links, setLinks] = React.useState(WF_LINKS);
  const [lit, setLit] = React.useState(reduced ? 99 : 0);
  const [sel, setSel] = React.useState(null);
  const [dragId, setDragId] = React.useState(null);
  const canvasRef = React.useRef(null);
  const dragRef = React.useRef(null);
  const addIdx = React.useRef(0);
  React.useEffect(() => {
    if (reduced) { setLit(99); return; }
    setLit(0);
    const t = setInterval(() => setLit(v => { if (v >= WF_INIT.length) { clearInterval(t); return v; } return v + 1; }), 480);
    return () => clearInterval(t);
  }, [reduced]);
  const isLit = k => k < lit;
  const byId = id => nodes.find(n => n.id === id);
  const idx = id => nodes.findIndex(n => n.id === id);
  const size = nodes.reduce((m, n) => ({ w: Math.max(m.w, n.x + WF_W + 24), h: 224 }), { w: 0, h: 224 });
  const onDown = (id, e) => {
    const n = byId(id);
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
    setDragId(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 3) d.moved = true;
    const nx = Math.max(0, d.ox + e.clientX - d.sx);
    const ny = Math.max(0, Math.min(224 - WF_H - 8, d.oy + e.clientY - d.sy));
    setNodes(list => list.map(n => n.id === d.id ? { ...n, x: nx, y: ny } : n));
  };
  const onUp = () => {
    const d = dragRef.current;
    if (d && !d.moved) setSel(s2 => s2 === d.id ? null : d.id);
    dragRef.current = null;
    setDragId(null);
  };
  const addNode = () => {
    const t = WF_MORE[addIdx.current % WF_MORE.length]; addIdx.current++;
    const last = nodes[nodes.length - 1];
    const nn = { id: 'w' + uid(), ...t, x: last.x + WF_W + 48, y: last.y > 64 ? 24 : 112 };
    setNodes(l => [...l, nn]);
    setLinks(l => [...l, [last.id, nn.id]]);
    setLit(v => Math.max(v, nodes.length + 1));
    const cv = canvasRef.current;
    if (cv) setTimeout(() => cv.scrollTo({ left: nn.x + WF_W - cv.clientWidth + 40, behavior: reduced ? 'auto' : 'smooth' }), 30);
  };
  const path = l => {
    const f = byId(l[0]), g = byId(l[1]);
    if (!f || !g) return '';
    const x1 = f.x + WF_W, y1 = f.y + WF_H / 2, x2 = g.x, y2 = g.y + WF_H / 2;
    const c = Math.max(28, (x2 - x1) / 2);
    return 'M' + x1 + ',' + y1 + ' C' + (x1 + c) + ',' + y1 + ' ' + (x2 - c) + ',' + y2 + ' ' + x2 + ',' + y2;
  };
  const selNode = sel ? byId(sel) : null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <h4 className="og-h" style={{ margin: 0 }}>你剛剛的每一步，背後都是流程</h4>
        <span style={{ marginLeft: 'auto', display: 'inline-flex' }}><Button size="sm" variant="outline" onClick={addNode}>＋ 加節點</Button></span>
      </div>
      <div className="og-wf" ref={canvasRef}>
        <div className="og-wf__content" style={{ minWidth: size.w }}>
          <svg width={size.w} height={224} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {links.map(l => {
              const live = isLit(idx(l[0])) && isLit(idx(l[1]));
              return <path key={l[0] + '-' + l[1]} d={path(l)} fill="none" strokeWidth="1.5" strokeDasharray="6 5" strokeLinecap="square"
                stroke={live ? 'var(--tiger-500)' : 'var(--border-strong)'} opacity={live ? 1 : .45} className={live && !reduced ? 'og-wire--live' : ''} />;
            })}
          </svg>
          {nodes.map((n, k) => (
            <div key={n.id}
              className={['og-wfnode', isLit(k) ? 'is-on' : 'is-dim', dragId === n.id ? 'is-drag' : '', sel === n.id ? 'is-sel' : ''].filter(Boolean).join(' ')}
              style={{ left: n.x, top: n.y }}
              onPointerDown={e => onDown(n.id, e)} onPointerMove={onMove} onPointerUp={onUp}>
              <span className="p in"></span><span className="p out"></span>
              <div className="hd">
                <span className="ic"><Icon name={n.icon} size={14} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="ty">{WF_TYPES[n.type]}</span>
                  <b>{n.title}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="og-step">{selNode ? selNode.d : '節點拖得動、點得開，「＋ 加節點」接下一步，你的 SOP 長在畫布上，看得見、改得動。'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
        <span className="og-mono" style={{ color: 'var(--fg-tertiary)' }}>{nodes.length} 節點・{links.length} 連線・#142 今日跑 63 次</span>
        <span className="og-glow" style={{ display: 'inline-flex', marginLeft: 'auto' }}>
          <Button onClick={onBridge}>這一切怎麼做到的？掀開，看 AI Stack ▼</Button>
        </span>
      </div>
    </div>
  );
}

/* ── 站5-7 ──────────────────────────── */
function useRamp(target, reduced, ms = 1800) {
  const [v, setV] = React.useState(reduced ? target : 0);
  React.useEffect(() => {
    if (reduced) { setV(target); return; }
    setV(0);
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [target, reduced, ms]);
  return v;
}

function StationModels({ reduced, models, api }) {
  const running = ['Qwen3-32B 運行中', 'Llama-3.3-70B 待命'];
  return (
    <div>
      <h4 className="og-h">已裝模型</h4>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Badge variant="success" dot>Qwen3-32B 運行中</Badge>
        <Badge variant="default" dot>Llama-3.3-70B 待命</Badge>
        {models.done.map(n => <Badge key={n} variant="success" dot>{n} 運行中</Badge>)}
      </div>
      <h4 className="og-h" style={{ marginTop: 'var(--space-5)' }}>模型庫 <span className="og-mono">ollama pull・裝在你的機房</span></h4>
      <div style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
        {MODEL_LIB.map(m => {
          const st = models.pulls[m.n];
          return (
            <div className="og-doc" key={m.n} style={{ animation: 'none', opacity: 1, transform: 'none' }}>
              <Icon name="box" size={16} style={{ color: st === undefined ? 'var(--fg-tertiary)' : 'var(--tiger-600)' }} />
              <span style={{ minWidth: 0 }}>
                <span className="og-mono">{m.n}</span>
                <span className="meta" style={{ marginLeft: 10 }}>{m.size}・{m.d}</span>
              </span>
              {st === undefined && <span className={models.done.length === 0 && Object.keys(models.pulls).length === 0 && m.n === MODEL_LIB[0].n ? 'og-glow' : ''} style={{ display: 'inline-flex' }}><Button size="sm" variant="outline" onClick={() => api.pullModel(m.n, reduced)}>安裝</Button></span>}
              {typeof st === 'number' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                  <span className="og-bar" style={{ flex: 1 }}><i style={{ width: st + '%' }} /></span>
                  <span className="og-mono">{st}%</span>
                </span>
              )}
              {st === 'ok' && <Badge variant="success" dot>已安裝</Badge>}
            </div>
          );
        })}
      </div>
      <div className="og-ok" style={{ marginTop: 'var(--space-4)' }}>{models.done.length
        ? '裝好了，回第一幕，對話框的模型選單就多了' + (models.done.length > 1 ? '這幾顆' : '這顆') + '。開源模型隨裝隨換，授權不用重簽。'
        : '點「安裝」拉一顆下來，裝好會直接進對話框的模型選單。⚠ 體驗環境，重新整理就消失。'}</div>
    </div>
  );
}

const QUOTA = [
  { dept: '人資部', used: 96, seats: 12, msgs: 4180, top: '招募 JD 草擬' },
  { dept: '法務部', used: 144, seats: 8, msgs: 6920, top: '合約風險比對' },
  { dept: '客服部', used: 228, seats: 24, msgs: 18400, top: '首回草擬' }
];
const GOV_TABS = ['額度', '花費趨勢', '稽核軌跡'];
const TREND = [38, 52, 47, 66, 71, 58, 82, 90, 76, 88, 96, 84];
const AUDIT = [
  ['14:32', '法務・陳', '查詢合約庫「付款條件」', '已回覆・附出處'],
  ['14:28', '客服・林', '生成首回草稿 #4821', '已送審'],
  ['14:21', '人資・張', '上傳「面試逐字稿.txt」', '已索引'],
  ['14:07', '客服部', '本月花費達 76%', '通知主管'],
  ['13:55', '行銷・王', '生成 banner ×3', '已歸檔'],
  ['13:40', 'admin', '調整客服部上限 $260→$300', '已生效']
];

function StationGovernance({ reduced }) {
  const [go, setGo] = React.useState(reduced);
  const [tab, setTab] = React.useState(0);
  React.useEffect(() => {
    if (reduced) { setGo(true); return; }
    setGo(false);
    const t = setTimeout(() => setGo(true), 120);
    return () => clearTimeout(t);
  }, [reduced, tab]);
  const total = QUOTA.reduce((n, q) => n + q.used, 0);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <h4 className="og-h" style={{ margin: 0 }}>治理・本月</h4>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          {GOV_TABS.map((t2, k) => (
            <button key={t2} className="og-chip" onClick={() => setTab(k)}
              style={k === tab ? { background: 'var(--ink-900)', color: 'var(--bg-surface)', borderColor: 'var(--ink-900)' } : null}>{t2}</button>
          ))}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-3)', maxWidth: 560, marginBottom: 'var(--space-4)' }}>
        <Stat label="全公司花費" value={'$' + total} unit="/$900" />
        <Stat label="啟用座席" value="44" unit=" 人" delta="▲ 本週 +6" />
        <Stat label="超標熔斷" value="0" unit=" 次" delta="▲ 30 天" />
      </div>
      {tab === 0 && (
        <div style={{ maxWidth: 560 }}>
          {QUOTA.map(q => {
            const p = (q.used / 300) * 100;
            return (
              <div className="og-row" key={q.dept} title={q.seats + ' 座席・' + q.msgs.toLocaleString() + ' 則・最常用：' + q.top}>
                <span>{q.dept}<span className="og-mono" style={{ marginLeft: 8, color: 'var(--fg-tertiary)' }}>{q.seats} 席</span></span>
                <span className="og-bar"><i className={p > 70 ? 'warn' : ''} style={{ width: (go ? p : 0) + '%' }} /></span>
                <span className="v">${q.used}/$300</span>
              </div>
            );
          })}
          <div className="og-mono" style={{ marginTop: 8, color: 'var(--fg-tertiary)' }}>滑鼠移到列上看座席、用量與最常用場景</div>
        </div>
      )}
      {tab === 1 && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96, borderBottom: '1px solid var(--border-default)', paddingBottom: 1 }}>
            {TREND.map((v, k) => (
              <span key={k} title={'第 ' + (k + 1) + ' 週・$' + v} style={{ flex: 1, background: k === TREND.length - 1 ? 'var(--tiger-500)' : 'var(--slate-200)', height: (go ? v : 0) + '%', transition: 'height .5s cubic-bezier(.22,.61,.36,1) ' + k * 40 + 'ms' }} />
            ))}
          </div>
          <div className="og-mono" style={{ marginTop: 8, color: 'var(--fg-tertiary)' }}>近 12 週・全公司週花費（$），雲端訂閱是每人每月固定燒，這條線你踩得住</div>
        </div>
      )}
      {tab === 2 && (
        <div style={{ maxWidth: 560, display: 'grid', gap: 6 }}>
          {AUDIT.map((r, k) => (
            <div className="og-doc" key={k} style={{ animationDelay: (reduced ? 0 : k * 90) + 'ms', gridTemplateColumns: 'auto' }}>
              <span className="og-mono" style={{ color: 'var(--fg-tertiary)', flex: 'none' }}>{r[0]}</span>
              <span style={{ minWidth: 0 }}>{r[1]}<span className="meta" style={{ marginLeft: 8 }}>{r[2]}</span></span>
              <span className="og-mono" style={{ marginLeft: 'auto', flex: 'none', color: 'var(--fg-secondary)' }}>{r[3]}</span>
            </div>
          ))}
          <div className="og-mono" style={{ color: 'var(--fg-tertiary)' }}>誰、什麼時候、問了什麼、動了什麼，每一筆都留在你的機房，稽核直接調</div>
        </div>
      )}
      <div className="og-ok" style={{ marginTop: 'var(--space-4)' }}>🛡 超標自動熔斷，Shadow AI 的錢坑從這裡堵住。</div>
    </div>
  );
}

const DASH_TABS = ['GPU 叢集', '服務', '排程佇列'];
const SVC = [
  ['ollama', '模型服務・2 顆常駐', 'ok'],
  ['litellm-gateway', '額度與熔斷・全流量經此', 'ok'],
  ['n8n', '流程引擎・#142 今日跑 63 次', 'ok'],
  ['pgvector', '向量庫・625 段索引', 'ok'],
  ['comfyui', '生圖生影片・GPU 0', 'ok'],
  ['bge-m3', '重排序・檢索品質', 'ok'],
  ['prometheus + dcgm', '監控採樣・每 15s', 'ok'],
  ['nightly-backup', '知識庫備份・昨夜 03:00', 'ok']
];
const JOBS = [
  ['#J-2841', '影片生成・秋季發表會開場', 'GPU 0', '執行中・68%', 'run'],
  ['#J-2842', '合約庫增量索引・14 段', 'CPU', '排隊 1', 'wait'],
  ['#J-2843', '批次比對・報價單 ×36', 'GPU 1', '排隊 2', 'wait'],
  ['#J-2836', '模型拉取 gemma3:27b', '—', '已完成 14:02', 'done'],
  ['#J-2830', '週報彙整・治理數據', 'CPU', '已完成 13:10', 'done']
];

function StationDashboard({ reduced }) {
  const g0 = useRamp(74, reduced), g1 = useRamp(52, reduced);
  const [tab, setTab] = React.useState(0);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <h4 className="og-h" style={{ margin: 0 }}>管理中心・你的機房</h4>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          {DASH_TABS.map((t2, k) => (
            <button key={t2} className="og-chip" onClick={() => setTab(k)}
              style={k === tab ? { background: 'var(--ink-900)', color: 'var(--bg-surface)', borderColor: 'var(--ink-900)' } : null}>{t2}</button>
          ))}
        </span>
      </div>
      {tab === 0 && (
        <div>
          <div className="og-grid2">
            <div className="og-gpu">
              <h5>GPU 0・RTX 4090 <span className="og-mono" style={{ color: 'var(--fg-tertiary)' }}>Qwen3-32B・ComfyUI</span></h5>
              <div className="og-bar"><i style={{ width: g0 + '%' }} /></div>
              <div className="og-mono" style={{ marginTop: 8 }}>{g0}%・66°C・VRAM 18/24 GB・功耗 312W</div>
            </div>
            <div className="og-gpu">
              <h5>GPU 1・RTX 4090 <span className="og-mono" style={{ color: 'var(--fg-tertiary)' }}>Llama-3.3-70B（分層）</span></h5>
              <div className="og-bar"><i style={{ width: g1 + '%' }} /></div>
              <div className="og-mono" style={{ marginTop: 8 }}>{g1}%・58°C・VRAM 10/24 GB・功耗 226W</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <Stat label="CPU i9-14900K" value="32.5" unit="%" />
            <Stat label="記憶體" value="38" unit="/64 GB" />
            <Stat label="今日推論" value="29,340" unit=" 次" delta="▲ 平均 1.8s" />
            <Stat label="本月電費估" value="$187" unit="" delta="▲ 比雲端省 $2,113" />
          </div>
        </div>
      )}
      {tab === 1 && (
        <div style={{ maxWidth: 620, display: 'grid', gap: 6 }}>
          {SVC.map(([n, d], k) => (
            <div className="og-doc" key={n} style={{ animationDelay: (reduced ? 0 : k * 80) + 'ms' }}>
              <span className="og-mono" style={{ flex: 'none', minWidth: 150 }}>{n}</span>
              <span style={{ minWidth: 0 }} className="meta">{d}</span>
              <Badge variant="success" dot>正常</Badge>
            </div>
          ))}
          <div className="og-mono" style={{ color: 'var(--fg-tertiary)' }}>17 項服務全數正常・監控每 15 秒採樣一次</div>
        </div>
      )}
      {tab === 2 && (
        <div style={{ maxWidth: 620, display: 'grid', gap: 6 }}>
          {JOBS.map(([id, d, res, st, k2], k) => (
            <div className="og-doc" key={id} style={{ animationDelay: (reduced ? 0 : k * 80) + 'ms' }}>
              <span className="og-mono" style={{ flex: 'none', color: 'var(--fg-tertiary)' }}>{id}</span>
              <span style={{ minWidth: 0 }}>{d}<span className="meta" style={{ marginLeft: 8 }}>{res}</span></span>
              {k2 === 'run' && <Badge variant="brand" dot>{st}</Badge>}
              {k2 === 'wait' && <Badge variant="warning">{st}</Badge>}
              {k2 === 'done' && <Badge variant="success" dot>{st}</Badge>}
            </div>
          ))}
          <div className="og-mono" style={{ color: 'var(--fg-tertiary)' }}>叢集排程自動分派 GPU，白天讓路給對話，吃重的任務排夜間</div>
        </div>
      )}
      <div className="og-ok" style={{ marginTop: 'var(--space-4)' }}>你剛剛的每一次對話、生圖、生文件，全發生在這兩張卡上，沒出過這台機器。</div>
    </div>
  );
}

/* ── 站8：建立 ───────────────────────── */
const ASSEMBLE = ['建同事', '掛知識庫「合約庫」', '接流程（n8n）', '綁模型額度（Qwen3-32B・$300/月）'];
const WIZ_TITLES = ['選部門範本', '基本資料', '掛知識庫', '技能與功能', '接流程（n8n）', '模型與治理', '審閱與部署'];
const WIZ_TPLS = [
  { m: MARKET[0], role: '盯交期、比條款、開預警', kbs: ['合約庫・142 段', '交期紀錄 2026 Q2・38 段'], sk: [0, 1, 3], sys: '你是採購部的供應商管理助手。只讀掛載的知識庫回答、一律附出處；交期異常主動預警，超標自動開單。' },
  { m: MARKET[1], role: '篩履歷、排面試、擬邀約', kbs: ['履歷庫・487 份', '職缺需求 #BE-03・12 段'], sk: [5, 3, 4], sys: '你是人資部的招募助理。從履歷庫篩出符合必要條件的人選、排序並草擬邀約信；個資只在權限內使用。' },
  { m: MARKET[2], role: '盯檢驗、標異常、寫 8D', kbs: ['出貨檢驗 2026-08・214 筆', '公差標準書・56 段'], sk: [6, 1, 3], sys: '你是品保部的稽核助手。盯檢驗紀錄、標記超出公差的批號、生成 8D 報告草稿；結論必附批號出處。' },
  { m: MARKET[3], role: '查保固、排回檢、草擬回覆', kbs: ['保固合約・96 段', '設備台帳・1,204 筆'], sk: [2, 3, 4], sys: '你是客服部的售後助手。查保固、排回檢、草擬客訴回覆；答案一律附合約與台帳出處。' }
];
const WIZ_SKILLS = ['Quotation-Generation-Expert', 'N8n-Workflow-Architect', 'Market-Intelligence-Report', 'Super-Summarizer-Expert', 'AI-Consultant-Report', 'Project-Planning-Expert', 'Security-Code-Reviewer', 'Tigerai-Comprehensive-Expert'];
const WIZ_FEATS = ['視覺', '檔案上傳', '網頁搜尋', '圖片生成', '程式碼直譯器', '引用', '即時回應狀態'];
const WIZ_KB_EXTRA = ['員工手冊 v3.2・387 段', '產品文件庫・1,032 段'];
const DEPLOY_STEPS = ['建立同事容器', '寫入系統提示詞', '掛載知識庫與權限', '載入技能與功能', '部署 n8n 流程 #142', '綁定模型', '設定額度與熔斷', '啟動並自我檢測'];

function StationBuild({ reduced, s8, api, customs, goChatWith }) {
  const timers = React.useRef([]);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const threadRef = useThreadScroll();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [dept, setDept] = React.useState(DEPTS[0]);
  const IDEAS = [
    ['碳盤查助手', '總務部'], ['ESG 報告助手', '總務部'], ['專利檢索助手', '研發部'],
    ['客訴預警助手', '客服部'], ['標案審閱助手', '法務部'], ['競品追蹤助手', '行銷部'],
    ['催收提醒助手', '財務部'], ['新人訓練助手', '人資部'], ['設備保養助手', '生管部']
  ];
  const roll = () => { const [n2, d2] = IDEAS[Math.floor(Math.random() * IDEAS.length)]; setName(n2); setDept(d2); };
  const [step, setStep] = React.useState(-1);
  const [sel, setSel] = React.useState(null);
  const [wiz, setWiz] = React.useState(null);
  const wp = p => setWiz(w => (w ? { ...w, ...p } : w));
  const openWiz = () => setWiz({ step: 0, tpl: 0, name: WIZ_TPLS[0].m.n, dept: DEPT_OF[WIZ_TPLS[0].m.id], role: WIZ_TPLS[0].role, sys: WIZ_TPLS[0].sys, skills: WIZ_SKILLS.map((_, i) => WIZ_TPLS[0].sk.includes(i)), feats: WIZ_FEATS.map(() => true), kbs: [true, true, false, false], flow: true, model: 'Qwen3-32B', budget: '$300/月', fuse: true, cite: true, audit: true, dep: -1 });
  const pickTpl = k => wp({ tpl: k, name: WIZ_TPLS[k].m.n, dept: DEPT_OF[WIZ_TPLS[k].m.id], role: WIZ_TPLS[k].role, sys: WIZ_TPLS[k].sys, skills: WIZ_SKILLS.map((_, i) => WIZ_TPLS[k].sk.includes(i)), kbs: [true, true, false, false] });
  const wizDeploy = () => {
    const w = wiz;
    if (!w || w.dep >= 0) return;
    const go = () => {
      const base = WIZ_TPLS[w.tpl].m;
      const nm = (w.name || '').trim() || base.n;
      api.createAgent({ id: 'c' + uid(), n: nm, mono: 'custom-copilot', ava: nm[0], icon: base.icon, custom: true, dept: w.dept, q: base.q, a: base.a, cite: base.cite });
      setWiz(null);
    };
    if (reduced) { go(); return; }
    wp({ dep: 0 });
    DEPLOY_STEPS.forEach((_, k) => later(() => wp({ dep: k + 1 }), (k + 1) * 520));
    later(go, DEPLOY_STEPS.length * 520 + 400);
  };
  const phase = id => s8.phases[id] || 'idle';
  const install = ag => {
    if (phase(ag.id) !== 'idle') return;
    api.s8SetPhase(ag.id, 'installing');
    later(() => {
      api.s8SetPhase(ag.id, 'online');
      api.addInstalled(ag.id);
      api.s8Patch({ lastId: ag.id });
      api.s8Push({ id: uid(), who: 'sys', text: '── ' + ag.n + ' 已上線，對話框的模型選單裡多了這位同事 ──' });
      later(() => api.s8Push({ id: uid(), who: 'me', kind: 'text', text: ag.q }), reduced ? 80 : 600);
      later(() => api.s8Push({ id: uid(), who: 'ai', kind: 'text', ava: ag.ava, name: ag.n, gold: true, text: ag.a, cite: ag.cite }), reduced ? 160 : 1400);
    }, reduced ? 120 : 1300);
  };
  const create = () => {
    const n = name.trim();
    if (!n || step >= 0) return;
    if (reduced) { finishCreate(n); return; }
    setStep(0);
    ASSEMBLE.forEach((_, k) => later(() => setStep(k + 1), (k + 1) * 620));
    later(() => finishCreate(n), ASSEMBLE.length * 620 + 350);
  };
  const finishCreate = n => {
    api.createAgent({
      id: 'c' + uid(), n, mono: 'custom-copilot', ava: n[0], icon: 'bot', custom: true, dept,
      q: '自我介紹一下？',
      a: '我是' + dept + '的「' + n + '」。我只讀掛給我的知識庫回答、答案附出處；流程走 n8n、額度由 LiteLLM 管，超標熔斷。',
      cite: '組裝設定・' + dept
    });
    setOpen(false); setStep(-1); setName('');
  };
  const all = [...MARKET, ...customs];
  const live = s8.lastId ? all.find(a => a.id === s8.lastId) : null;
  return (
    <div className="og-chatcol og-chatcol--grow">
      <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--fs-13)', color: 'var(--fg-secondary)', flex: 'none' }}>13 個部門的同事都在這，點安裝；也能取個名字，馬上生一位：</p>
      <div className="og-market">
        <button className={'og-shop og-shop--new' + (customs.length === 0 && Object.keys(s8.phases).length === 0 ? ' og-glow' : '')} onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />自己建一位
        </button>
        <button className="og-shop og-shop--new" onClick={openWiz}>
          <Icon name="list-checks" size={18} />完整建立流程
        </button>
        {all.map(ag => (
          <div className={'og-shop og-shop--click' + (live && ag.id === s8.lastId ? ' is-live' : '')} key={ag.id} onClick={() => setSel(ag)} title="點開看設定">
            <Icon name={ag.icon} size={16} style={{ color: 'var(--tiger-600)', flex: 'none' }} />
            <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
              <b>{ag.n}</b>
              <span className="og-mono">{ag.custom ? '自建' : ag.mono}</span>
            </span>
            <span style={{ marginLeft: 'auto', flex: 'none' }}>
              {phase(ag.id) === 'idle' && !ag.custom && <Button size="sm" onClick={e => { e.stopPropagation(); install(ag); }}>安裝</Button>}
              {phase(ag.id) === 'installing' && <Button size="sm" disabled>安裝中…</Button>}
              {(phase(ag.id) === 'online' || ag.custom) && <Badge variant="success" dot>已上線</Badge>}
            </span>
          </div>
        ))}
      </div>
      {live && (
        <div style={{ marginTop: 'var(--space-3)', flex: 'none' }}>
          <span className="og-glow" style={{ display: 'inline-flex' }}>
            <Button onClick={() => goChatWith(live)}>{live.n} 已上線：去「對話」跟它說話 →</Button>
          </span>
        </div>
      )}
      <div className="og-thread" ref={threadRef} style={{ marginTop: 'var(--space-3)', minHeight: 220 }}>
        {s8.msgs.map(m => <Msg key={m.id} m={m} reduced={reduced}
          onDone={m.who === 'ai' && !m.done ? () => { api.s8MsgPatch(m.id, { done: true }); api.s8Patch({ done: true }); } : null} />)}
      </div>
      {sel && (
        <div className="og-modal" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="og-modal__panel">
            <div className="og-modal__head">
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Icon name={sel.icon} size={18} style={{ color: 'var(--tiger-600)' }} />
                <b>{sel.n}</b>
                <span className="og-mono">{sel.custom ? 'custom-copilot' : sel.mono}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(phase(sel.id) === 'online' || sel.custom) ? <Badge variant="success" dot>已上線</Badge>
                  : phase(sel.id) === 'installing' ? <Badge variant="warning">安裝中…</Badge>
                  : <Button size="sm" onClick={() => install(sel)}>安裝</Button>}
                <button className="x" title="關閉" onClick={() => setSel(null)}><Icon name="x" size={16} /></button>
              </span>
            </div>
            <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)', overflow: 'auto' }}>
              <pre className="og-code">{yamlOf(sel)}</pre>
              <div style={{ display: 'grid', gap: 6, fontSize: 'var(--fs-13)', lineHeight: 'var(--lh-relaxed)' }}>
                <span className="og-mono">示範問答</span>
                <span><b>你：</b>{sel.q}</span>
                <span><b>{sel.ava}：</b>{sel.a}</span>
                <span className="og-cite" style={{ marginTop: 0 }}>📄 {sel.cite}</span>
              </div>
            </div>
            <div className="og-modal__note">⚠ 體驗環境・模擬設定，重新整理就消失。</div>
          </div>
        </div>
      )}
      {wiz && (
        <div className="og-modal" onClick={e => { if (e.target === e.currentTarget && wiz.dep < 0) setWiz(null); }}>
          <div className="og-modal__panel og-modal__panel--wide">
            <div className="og-modal__head">
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                <b>完整建立流程</b>
                <span className="og-mono">步驟 {wiz.step + 1}／7・{WIZ_TITLES[wiz.step]}</span>
              </span>
              {wiz.dep < 0 && <button className="x" title="關閉" onClick={() => setWiz(null)}><Icon name="x" size={16} /></button>}
            </div>
            <div className="og-wizbar">{WIZ_TITLES.map((t, k) => <i key={t} className={k <= wiz.step ? 'on' : ''} />)}</div>
            <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)', overflow: 'auto', maxHeight: 340 }}>
              {wiz.step === 0 && (
                <>
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--fg-secondary)' }}>選一個部門範本，後面每一步都會照範本預填，全部可改：</span>
                  <div className="og-tplgrid">
                    {WIZ_TPLS.map((t, k) => (
                      <button key={t.m.id} className={'og-tpl' + (wiz.tpl === k ? ' is-on' : '')} onClick={() => pickTpl(k)}>
                        <Icon name={t.m.icon} size={18} style={{ color: 'var(--tiger-600)', flex: 'none' }} />
                        <span style={{ minWidth: 0 }}><b>{t.m.n}</b><span className="og-mono">{t.role}</span></span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {wiz.step === 1 && (
                <>
                  <Field label="同事名稱" required><Input value={wiz.name} onChange={e => wp({ name: e.target.value })} /></Field>
                  <Field label="所屬部門"><Select value={wiz.dept} onChange={e => wp({ dept: e.target.value })}>{DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</Select></Field>
                  <Field label="職掌（一句話）"><Input value={wiz.role} onChange={e => wp({ role: e.target.value })} /></Field>
                  <Field label="系統提示詞" help="定義角色與紅線，範本已寫好，可直接用"><Textarea rows={3} value={wiz.sys} onChange={e => wp({ sys: e.target.value })} /></Field>
                </>
              )}
              {wiz.step === 2 && (
                <>
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--fg-secondary)' }}>勾選這位同事讀得到的庫，答案只會從這裡來、一律附出處：</span>
                  {[...WIZ_TPLS[wiz.tpl].kbs, ...WIZ_KB_EXTRA].map((kb, k) => (
                    <button key={kb} className={'og-kbrow' + (wiz.kbs[k] ? ' is-on' : '')} onClick={() => { const kbs = [...wiz.kbs]; kbs[k] = !kbs[k]; wp({ kbs }); }}>
                      <span className="bx">{wiz.kbs[k] ? '✓' : ''}</span><span className="lb">{kb}</span>
                      <span className="meta">{k < 2 ? '範本建議' : '選配'}</span>
                    </button>
                  ))}
                </>
              )}
              {wiz.step === 3 && (
                <>
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--fg-secondary)' }}>技能是掛在同事身上的專家提示詞包，功能決定它能動用的能力：</span>
                  <span className="og-mono" style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>技能・範本已勾 {wiz.skills.filter(Boolean).length} 項</span>
                  <div className="og-chips">
                    {WIZ_SKILLS.map((sk, k) => (
                      <button key={sk} className={'og-chip' + (wiz.skills[k] ? ' is-on' : '')} onClick={() => { const a2 = [...wiz.skills]; a2[k] = !a2[k]; wp({ skills: a2 }); }}>{wiz.skills[k] ? '✓ ' : ''}{sk}</button>
                    ))}
                  </div>
                  <span className="og-mono" style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>功能</span>
                  <div className="og-chips">
                    {WIZ_FEATS.map((f, k) => (
                      <button key={f} className={'og-chip' + (wiz.feats[k] ? ' is-on' : '')} onClick={() => { const a2 = [...wiz.feats]; a2[k] = !a2[k]; wp({ feats: a2 }); }}>{wiz.feats[k] ? '✓ ' : ''}{f}</button>
                    ))}
                  </div>
                </>
              )}
              {wiz.step === 4 && (
                <>
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--fg-secondary)' }}>這位同事每次回覆都走這條流程，看得見、改得動、過得了稽核：</span>
                  <div className="og-chain" style={{ marginBottom: 0 }}>
                    {['收到訊息', '檢索／生成', '權限與額度檢查', '回覆＋歸檔'].map((label, i) => (
                      <React.Fragment key={label}>
                        {i > 0 && <span className="og-arrow">→</span>}
                        <span className="og-node is-lit"><span className="idx">{String(i + 1).padStart(2, '0')}</span>{label}</span>
                      </React.Fragment>
                    ))}
                  </div>
                  <button className={'og-kbrow' + (wiz.flow ? ' is-on' : '')} onClick={() => wp({ flow: !wiz.flow })}>
                    <span className="bx">{wiz.flow ? '✓' : ''}</span><span className="lb">逾標自動開單給主管</span><span className="meta">n8n 節點・建議開啟</span>
                  </button>
                </>
              )}
              {wiz.step === 5 && (
                <>
                  <Field label="模型" help="跑在你的機房，回應不經雲端 API"><Select value={wiz.model} onChange={e => wp({ model: e.target.value })}>{MODEL_GROUPS[0].items.map(m => <option key={m} value={m}>{m}</option>)}</Select></Field>
                  <Field label="每月額度"><Select value={wiz.budget} onChange={e => wp({ budget: e.target.value })}>{['$300/月', '$150/月', '$600/月'].map(b => <option key={b} value={b}>{b}</option>)}</Select></Field>
                  {[['fuse', '超標自動熔斷'], ['cite', '回答必附出處'], ['audit', '留稽核紀錄']].map(([k2, label]) => (
                    <button key={k2} className={'og-kbrow' + (wiz[k2] ? ' is-on' : '')} onClick={() => wp({ [k2]: !wiz[k2] })}>
                      <span className="bx">{wiz[k2] ? '✓' : ''}</span><span className="lb">{label}</span><span className="meta">治理・建議開啟</span>
                    </button>
                  ))}
                </>
              )}
              {wiz.step === 6 && wiz.dep < 0 && (
                <>
                  <span style={{ fontSize: 'var(--fs-13)', color: 'var(--fg-secondary)' }}>最後看一眼設定檔，按「部署上線」就完成：</span>
                  <pre className="og-code">{yamlOf({ custom: true, n: (wiz.name || '').trim() || WIZ_TPLS[wiz.tpl].m.n, dept: wiz.dept, cite: WIZ_TPLS[wiz.tpl].m.cite, sys: wiz.sys, skills: WIZ_SKILLS.filter((_, k) => wiz.skills[k]).join(', '), feats: WIZ_FEATS.filter((_, k) => wiz.feats[k]).join(', '), kb: [...WIZ_TPLS[wiz.tpl].kbs, ...WIZ_KB_EXTRA].filter((_, k) => wiz.kbs[k]).map(x => x.split('・')[0]).join(', '), flow: wiz.flow, model: wiz.model, budget: wiz.budget.replace('/月', '/mo'), fuse: wiz.fuse, citeReq: wiz.cite })}</pre>
                </>
              )}
              {wiz.step === 6 && wiz.dep >= 0 && (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {DEPLOY_STEPS.map((t, k) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--fs-13)', opacity: k <= wiz.dep ? 1 : .35, transition: 'opacity 120ms' }}>
                      <span style={{ width: 20, height: 20, display: 'grid', placeContent: 'center', background: k < wiz.dep ? 'var(--success-500)' : 'var(--slate-200)', color: k < wiz.dep ? '#fff' : 'var(--fg-tertiary)', fontSize: 11 }}>{k < wiz.dep ? '✓' : k + 1}</span>
                      {t}{k === wiz.dep && <span className="og-caret" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {wiz.dep < 0 && (
              <div className="og-wiznav">
                <Button size="sm" variant="outline" disabled={wiz.step === 0} onClick={() => wp({ step: wiz.step - 1 })}>← 上一步</Button>
                <span className="og-mono">全部都預設好了，一路「下一步」就能上線</span>
                {wiz.step < 6
                  ? <Button size="sm" onClick={() => wp({ step: wiz.step + 1 })}>下一步 →</Button>
                  : <Button size="sm" onClick={wizDeploy}>部署上線</Button>}
              </div>
            )}
            <div className="og-modal__note">⚠ 體驗環境・模擬流程，重新整理就消失。</div>
          </div>
        </div>
      )}
      {open && (
        <div className="og-modal" onClick={e => { if (e.target === e.currentTarget && step < 0) setOpen(false); }}>
          <div className="og-modal__panel">
            <div className="og-modal__head">
              <b>建一位新同事</b>
              {step < 0 && <button className="x" title="關閉" onClick={() => setOpen(false)}><Icon name="x" size={16} /></button>}
            </div>
            {step < 0 ? (
              <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }}>
                <Field label="同事名稱" required>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input placeholder="例如：供應商 AI" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
                    <Button size="sm" variant="outline" onClick={roll} style={{ flex: 'none', alignSelf: 'center' }}>🎲 給我靈感</Button>
                  </div>
                </Field>
                <Field label="所屬部門" help="知識庫、流程與額度會照部門範本掛好，之後都能改">
                  <Select value={dept} onChange={e => setDept(e.target.value)}>
                    {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </Field>
                <Button block onClick={create} disabled={!name.trim()}>建立並上線</Button>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
                {ASSEMBLE.map((t, k) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--fs-13)', opacity: k <= step ? 1 : .35, transition: 'opacity 120ms' }}>
                    <span style={{ width: 20, height: 20, display: 'grid', placeContent: 'center', background: k < step ? 'var(--success-500)' : 'var(--slate-200)', color: k < step ? '#fff' : 'var(--fg-tertiary)', fontSize: 11 }}>{k < step ? '✓' : k + 1}</span>
                    {t}{k === step && <span className="og-caret" />}
                  </div>
                ))}
              </div>
            )}
            <div className="og-modal__note">⚠ 體驗環境，輸入名稱馬上生成，重新整理就消失。</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 原型這裡是 Object.assign(window, { StationChat, ... })，把八站掛到全域讓
// 預覽環境可以個別叫用。正式站用不到，而且建置時會在 Node 裡先渲染一次，
// 那時候沒有 window 會直接爆掉。八站本來就只有下面的 STATIONS 在用。

/* ── 八站定義 ───────────────────────── */
const STATIONS = [
  { label: '對話', icon: 'message-square', guide: '點下面的快選，它會自己打進輸入框。框裡還能換模型',
    anchor: 'OpenGenie・問答、生圖、生影片、生文件，同一個對話框',
    xray: 'POST /v1/chat/completions → litellm-gateway → ollama（地端）', Pane: p => <StationChat {...p} /> },
  { label: '頻道', icon: 'hash', guide: '一群人怎麼用？點『頻道』，再從輸入框下方把 AI 加進來',
    anchor: '這是「AI 同事協作」・語言模型懂語言，AI 同事懂你的公司',
    xray: 'channel #秋季新品上市 · agent join → 讀取頻道脈絡 · scope=部門權限', Pane: p => <StationChannel {...p} /> },
  { label: '知識庫', icon: 'database', guide: '你剛做出來的東西去哪了？點『知識庫』，也能自己上傳',
    anchor: 'OpenGenie・Advanced RAG：答案指得回原文，不出機房',
    xray: 'pgvector · 合約庫 index · top_k=6 · rerank=bge-m3', Pane: p => <StationKnowledge {...p} /> },
  { label: 'Workflow', icon: 'workflow', guide: 'n8n 畫布，節點拖得動、接得上，點『Workflow』玩玩',
    anchor: '轉場・第一幕觸發的流程，第二幕掀開來看',
    xray: 'n8n workflow #142 · trigger=webhook · 4 nodes · 平均 3.2s', Pane: p => <StationWorkflow {...p} /> },
  { label: '模型', icon: 'box', guide: '第二幕・AI Stack｜先看它的腦，點『模型』，自己拉一顆下來',
    anchor: 'AI Stack・Ollama：模型隨裝隨換',
    xray: 'ollama pull gemma3:27b · 2 models resident · VRAM 28/48 GB', Pane: p => <StationModels {...p} /> },
  { label: '治理', icon: 'shield-check', guide: '老闆視角，額度、趨勢、稽核軌跡，點『治理』切著看',
    anchor: 'AI Stack・LiteLLM：額度熔斷，全公司用也不失控',
    xray: 'litellm budgets · 3 teams · hard_limit=$300/mo · on_exceed=block', Pane: p => <StationGovernance {...p} /> },
  { label: '儀表板', icon: 'gauge', guide: '機器本人，GPU、服務、排程佇列，點『儀表板』切著看',
    anchor: 'AI Stack・管理中心：資料主權是物理事實',
    xray: 'node-exporter + dcgm · 17 targets up · scrape=15s', Pane: p => <StationDashboard {...p} /> },
  { label: '建立', icon: 'package-plus', guide: '收尾｜挑幾位新同事裝上線，點『建立』',
    anchor: '兩幕合一・廚房蓋好了，菜一直出',
    xray: 'POST /v1/agents/install · id=supplier-copilot · source=local-registry', Pane: p => <StationBuild {...p} /> }
];
const GROUPS = [
  { label: '產品', idx: [0, 1, 2, 3] },
  { label: '架構', idx: [4, 5, 6] },
  { label: '收尾', idx: [7] }
];
const actOf = i => i <= 3
  ? { name: 'OpenGenie', badge: '第一幕・產品' }
  : i <= 6
    ? { name: 'OpenGenie AI Stack', badge: '第二幕・架構' }
    : { name: 'OpenGenie ＋ AI Stack', badge: '收尾・換你' };

const CHAN_PRE = [
  { id: 1, who: 'peer', ava: '陳', name: '陳雅婷・行銷', text: '秋季檔期的 EDM 和 banner 還缺，主視覺已定稿' },
  { id: 2, who: 'peer', ava: 'M', name: 'Mark・行銷主管', text: '這週要全部出來，預算也要控好' }
];
const CHAN_PEERS = [
  { ava: '林', name: '林士鈞・業務', text: '通路那邊在催素材了，banner 好了先丟給我' },
  { ava: '吳', name: '吳佩珊・財務', text: '這檔預算我盯著，投放前先給我看一眼分配' },
  { ava: '周', name: '周暐・設計', text: '主視覺原始檔我放進頻道檔案區了，要改跟我說' }
];

function Console({ onExpand, onComplete, expanded, startStation }) {
  const reduced = React.useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [i, setI] = React.useState(0);
  const [seen, setSeen] = React.useState(() => new Set([0]));
  React.useEffect(() => {
    const n = Number(startStation);
    if (n > 0 && n < STATIONS.length) { setI(n); setSeen(s2 => new Set(s2).add(n)); }
  }, [startStation]);
  const [xray, setXray] = React.useState(false);
  const [trans, setTrans] = React.useState(false);
  const [model, setModel] = React.useState('Qwen3-32B');
  const [chat, setChat] = React.useState({ msgs: [], typed: '', busy: false, hint: true, asked1: false });
  const [chan, setChan] = React.useState({ msgs: CHAN_PRE, typed: '', joined: [] });
  const [arts, setArts] = React.useState({ spec: false, banners: false });
  const [s8, setS8] = React.useState({ phases: {}, msgs: [], done: false, lastId: null });
  const [installed, setInstalled] = React.useState([]);
  const [uploads, setUploads] = React.useState([]);
  const [customs, setCustoms] = React.useState([]);
  const [models, setModels] = React.useState({ pulls: {}, done: [] });
  const [kb, setKb] = React.useState('合約庫');
  const [kbOpen, setKbOpen] = React.useState(false);
  const api = React.useMemo(() => ({
    chatPatch: p => setChat(c => ({ ...c, ...p })),
    chatPush: m => setChat(c => ({ ...c, msgs: [...c.msgs, m] })),
    chatMsgPatch: (id, p, fn) => setChat(c => ({ ...c, msgs: c.msgs.map(m => m.id === id ? { ...m, ...(p || fn(m)) } : m) })),
    chanPatch: p => setChan(c => ({ ...c, ...p })),
    chanPatch2: fn => setChan(fn),
    chanPush: m => setChan(c => ({ ...c, msgs: [...c.msgs, m] })),
    chanMsgPatch: (id, p) => setChan(c => ({ ...c, msgs: c.msgs.map(m => m.id === id ? { ...m, ...p } : m) })),
    addArt: k => setArts(a => (a[k] ? a : { ...a, [k]: true })),
    s8Patch: p => setS8(c => ({ ...c, ...p })),
    s8Push: m => setS8(c => ({ ...c, msgs: [...c.msgs, m] })),
    s8MsgPatch: (id, p) => setS8(c => ({ ...c, msgs: c.msgs.map(m => m.id === id ? { ...m, ...p } : m) })),
    s8SetPhase: (id, ph) => setS8(c => ({ ...c, phases: { ...c.phases, [id]: ph } })),
    addInstalled: id => setInstalled(l => (l.includes(id) ? l : [...l, id])),
    pullModel: (n, red) => {
      if (red) { setModels(m => ({ pulls: { ...m.pulls, [n]: 'ok' }, done: [...m.done, n] })); return; }
      setModels(m => ({ ...m, pulls: { ...m.pulls, [n]: 0 } }));
      const int = setInterval(() => setModels(m => {
        const v = m.pulls[n];
        if (typeof v !== 'number') { clearInterval(int); return m; }
        const nv = Math.min(100, v + Math.ceil(Math.random() * 9));
        if (nv >= 100) { clearInterval(int); return { pulls: { ...m.pulls, [n]: 'ok' }, done: [...m.done, n] }; }
        return { ...m, pulls: { ...m.pulls, [n]: nv } };
      }), 160);
    },
    createAgent: ag => {
      CUSTOM_AGENTS.push(ag);
      setCustoms(c => [...c, ag]);
      setInstalled(l => [...l, ag.id]);
      setS8(c => ({ ...c, phases: { ...c.phases, [ag.id]: 'online' }, lastId: ag.id }));
      setS8(c => ({ ...c, msgs: [...c.msgs, { id: uid(), who: 'sys', text: '── ' + ag.n + ' 組裝完成、已上線，對話框的模型選單裡多了這位同事 ──' }] }));
      setTimeout(() => setS8(c => ({ ...c, msgs: [...c.msgs, { id: uid(), who: 'me', kind: 'text', text: ag.q }] })), 500);
      setTimeout(() => setS8(c => ({ ...c, msgs: [...c.msgs, { id: uid(), who: 'ai', kind: 'text', ava: ag.ava, name: ag.n, gold: true, text: ag.a, cite: ag.cite }] })), 1200);
    },
    upAdd: files => {
      const red = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const items = files.map(f => ({ id: uid(), name: f.name, size: f.size || 0, state: red ? 'ok' : 'wip' }));
      setUploads(u => [...u, ...items]);
      if (!red) items.forEach((it, k) => setTimeout(() => setUploads(u => u.map(x => x.id === it.id ? { ...x, state: 'ok' } : x)), 1400 + k * 700));
    }
  }), []);
  const st = STATIONS[i];
  const act = actOf(i);
  const done = seen.size === STATIONS.length && s8.done;
  React.useEffect(() => { if (done && onComplete) onComplete(); }, [done, onComplete]);
  const go = n => { setI(n); setSeen(s => new Set(s).add(n)); };
  const onBridge = () => {
    if (reduced) { go(4); return; }
    setTrans(true);
    setTimeout(() => { go(4); setTrans(false); }, 900);
  };
  const goChatWith = ag => {
    setS8(c => ({ ...c, lastId: null }));
    setModel(ag.n);
    setChat(c => ({ ...c, hint: false, busy: false, msgs: [{ id: uid(), who: 'sys', text: '── 新的對話・' + ag.n + '（' + (ag.custom ? '自建' : ag.mono) + '） ──' }, { id: uid(), who: 'me', kind: 'text', text: ag.q }] }));
    setTimeout(() => setChat(c => ({ ...c, msgs: [...c.msgs, { id: uid(), who: 'ai', kind: 'text', ava: ag.ava, name: ag.n, gold: true, text: ag.a, cite: ag.cite }] })), 700);
    setI(0); setSeen(s2 => new Set(s2).add(0));
  };
  const next = STATIONS.findIndex((_, n) => !seen.has(n));
  const installedAgents = MARKET.concat(customs).filter(a => installed.includes(a.id));
  const shared = { reduced, model, setModel, chat, chan, arts, s8, api, onBridge, installedAgents, uploads, customs, models, kb, goChatWith };

  return (
    <div className="og">
      <div className="og__top">
        <img src="assets/logo/color-square-mark.svg" alt="TigerAI" />
        <span className="og__brand">{act.name}</span>
        <span className="og__act">{act.badge}</span>
        <div className="sp">
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button className="og__kb" onClick={() => setKbOpen(v => !v)}>知識庫：{kb} <Icon name="chevron-down" size={12} /></button>
            {kbOpen && (
              <div className="og-menu og-menu--down">
                <h6>切換知識庫</h6>
                {KBS.map(k => (
                  <button key={k} className="item" onClick={() => { setKb(k); setKbOpen(false); }}>
                    {k}{k === kb && <span className="ck"><Icon name="check" size={13} /></span>}
                  </button>
                ))}
                <div className="ft">每個庫各自權限，AI 只讀你有權限的庫。</div>
              </div>
            )}
          </span>
          <button className="og__kb" onClick={() => setXray(v => !v)} style={xray ? { background: 'var(--tiger-500)', color: 'var(--ink-900)', borderColor: 'var(--tiger-500)' } : null}>
            <Icon name="scan-line" size={12} />看底層
          </button>
          {onExpand && <button className="og__fs" onClick={onExpand}>{expanded ? '✕ 縮小回頁面' : '⤢ 全螢幕體驗'}</button>}
          <span className="og__avatar">M</span>
        </div>
      </div>

      <div className={'og__guide' + (done ? ' is-done' : '')}>
        {done ? (
          <>
            <span>兩幕走完，OpenGenie 是端上桌的菜，AI Stack 是整座中央廚房。</span>
            <span className="acts">
              <Button size="sm" variant="secondary" style={{ background: '#fff', color: 'var(--ink-900)', borderColor: '#fff' }}>開 30 分鐘真沙盒</Button>
              <Button size="sm" variant="outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.7)' }}>預約完整 Demo</Button>
            </span>
          </>
        ) : (
          <>
            <span>{st.guide}</span>
            <span className="n">導覽 {seen.size}／8</span>
          </>
        )}
      </div>

      <div className="og__body">
        <div className="og__rail">
          {GROUPS.map(gr => (
            <React.Fragment key={gr.label}>
              <span className="og__grp">{gr.label}</span>
              {gr.idx.map(n => {
                const s = STATIONS[n];
                return (
                  <button key={s.label} onClick={() => go(n)}
                    className={['og__st', n === i ? 'is-active' : '', seen.has(n) ? 'is-seen' : '', !done && n === next && n !== i ? 'is-next' : ''].filter(Boolean).join(' ')}>
                    <Icon name={s.icon} size={20} />{s.label}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className="og__main">
          <div className="og__pane">
            {xray && <div className="og-mono" style={{ marginBottom: 'var(--space-4)', padding: '6px 10px', background: 'var(--ink-900)', color: 'var(--tiger-300)' }}>{st.xray}</div>}
            {React.createElement(st.Pane, { key: i, ...shared })}
          </div>
          <div className="og__anchor">{st.anchor}</div>
        </div>
      </div>

      <div className="og__foot">
        <span className="warn">⚠ 體驗環境・模擬資料</span>
        <a href="#sandbox">想跑真的？留下 Email 開通 30 分鐘沙盒 →</a>
      </div>

      {trans && (
        <div className="og__trans">
          <span className="og-mono" style={{ color: 'var(--tiger-300)' }}>進入第二幕</span>
          <b>OpenGenie AI Stack</b>
        </div>
      )}
    </div>
  );
}

export default Console;
export { STATIONS as CONSOLE_STATIONS };
