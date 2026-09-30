import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flow } from '../../data/flows';

/**
 * 企業首選右欄的案卷。移植自 design/首頁.dc.html 的 05b。
 *
 * 兩個資料夾式頁籤（範例影片／看底層），作用中的頁籤白底並與下方卡片相連，
 * 另一個是灰底。選到 13 部門時頁籤整排隱藏，改顯示該部門的圖框。
 *
 * 看底層：依 n8n 原檔的節點座標畫出畫布，連線是持續流動的虛線。
 *   滾輪以游標為中心縮放（0.4x–2.5x，每格 ×1.12／×0.89）
 *   按住拖曳平移（游標 grab → grabbing）
 *   底部工具列 −／百分比／＋
 *
 * 範例影片：YouTube 嵌入，但只播後台設定的片段並自動循環。
 *   時間軸與秒數以片段為準（例如 70–80 秒就顯示 0:00–0:10）
 *   播到 end − 0.25 秒就 seek 回 start，跳轉時 iframe 淡出 0.8 秒遮住畫面
 *   目前 6 條流程只有第 1 條有影片，其餘顯示「錄影準備中」
 */

const MONO = "'JetBrains Mono',monospace";
const DISPLAY = "'Manrope','Noto Sans TC',sans-serif";

/** 每條流程的影片設定。接後台之後由 Workflows collection 的欄位決定。 */
type VideoConfig = { yt: string; si?: string; start?: number; end?: number; loop?: boolean } | null;
const FLOW_VIDEOS: VideoConfig[] = [
  { yt: 'wkgx94TmFE4', si: '94_1aYG4OYaCLEYb', start: 70, end: 80, loop: true },
  null, null, null, null, null,
];

/* ── n8n 畫布 ─────────────────────────────────────────
   幾何與分類規則照原型的 _renderFlow()，一個數字都沒改。 */

const SX = 1.32;
const SY = 1.18;
const NODE_W = 190;
const NODE_H = 64;

/** 節點分類，決定上方那行小字 */
const category = (n: any) =>
  n.trig ? '觸發'
  : /if$|switch|filter|merge/i.test(n.t) ? '條件'
  : /agent|lmchat|openai|gemini|anthropic|ollama|chain|embed|informationextractor|outputparser/i.test(n.t) ? 'AI'
  : '動作';

/** 節點左上角方塊裡的代碼 */
const code = (n: any) =>
  n.trig ? 'TR'
  : /if$|switch|filter/i.test(n.t) ? 'IF'
  : /agent|lmchat|openai|gemini|anthropic|ollama|chain|informationextractor/i.test(n.t) ? 'AI'
  : /sheet|excel|file|drive|folder|convert/i.test(n.t) ? 'FS'
  : /gmail|email|imap|smtp/i.test(n.t) ? '@'
  : /code|function|set$/i.test(n.t) ? 'FN'
  : /http|webhook/i.test(n.t) ? 'API'
  : 'OP';

function FlowCanvas({ flow }: { flow: Flow }) {
  const nodes = flow.nodes as any[];
  const byName: Record<string, any> = {};
  nodes.forEach((n) => (byName[n.name] = n));

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  const px = (x: number) => (x - minX) * SX + 56;
  const py = (y: number) => (y - minY) * SY + 56;
  const W = px(maxX) + NODE_W + 90;
  const H = Math.max(py(maxY) + NODE_H + 80, 420);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {(flow.conns as any[]).map((c, k) => {
        const a = byName[c[0]];
        const b = byName[c[1]];
        if (!a || !b) return null;
        let d: string;
        if (c[2]) {
          // 第二個輸入（例如掛在 agent 下方的模型），從上方接進來
          const sx = px(a.x) + NODE_W / 2;
          const sy = py(a.y);
          const tx = px(b.x) + NODE_W / 2;
          const ty = py(b.y) + NODE_H;
          d = `M${sx} ${sy} C ${sx} ${sy - 46}, ${tx} ${ty + 46}, ${tx} ${ty}`;
        } else {
          const sx = px(a.x) + NODE_W + 5;
          const sy = py(a.y) + NODE_H / 2;
          const tx = px(b.x) - 5;
          const ty = py(b.y) + NODE_H / 2;
          const kk = Math.max(46, (tx - sx) / 2);
          d = `M${sx} ${sy} C ${sx + kk} ${sy}, ${tx - kk} ${ty}, ${tx} ${ty}`;
        }
        // 虛線持續流動，代表資料正在跑
        return <path key={k} d={d} fill="none" stroke="var(--tiger-500)" strokeWidth={2} strokeDasharray="7 5" style={{ animation: 'tg-dash .8s linear infinite' }} />;
      })}
      {nodes.map((n, k) => {
        const x = px(n.x);
        const y = py(n.y);
        const label = n.name.length > 9 ? `${n.name.slice(0, 9)}…` : n.name;
        return (
          <g key={k}>
            <rect x={x} y={y} width={NODE_W} height={NODE_H} fill="#FFFFFF" stroke="var(--border-strong)" />
            <rect x={x + 12} y={y + 16} width={32} height={32} fill="var(--tiger-50)" stroke="var(--border-brand)" />
            <text x={x + 28} y={y + 36} textAnchor="middle" style={{ font: `700 10px ${MONO}`, fill: 'var(--tiger-700)' }}>{code(n)}</text>
            <text x={x + 56} y={y + 27} style={{ font: `10px ${MONO}`, fill: 'var(--fg-tertiary)' }}>{category(n)}</text>
            <text x={x + 56} y={y + 46} style={{ font: '700 13px Inter,Noto Sans TC,sans-serif', fill: 'var(--fg-primary)' }}>{label}</text>
            {/* 左右兩個接點 */}
            <rect x={x - 5} y={y + NODE_H / 2 - 5} width={10} height={10} fill="#FFFFFF" stroke="var(--tiger-500)" />
            <rect x={x + NODE_W - 5} y={y + NODE_H / 2 - 5} width={10} height={10} fill="#FFFFFF" stroke="var(--tiger-500)" />
          </g>
        );
      })}
    </svg>
  );
}

/* ── 案卷 ─────────────────────────────────────────── */

export default function CaseFilePane({
  mode,
  flow,
  flowIndex,
  deptNo,
  deptName,
  deptKpi,
}: {
  mode: 'flow' | 'dept';
  flow: Flow;
  flowIndex: number;
  deptNo: string;
  deptName: string;
  deptKpi: string;
}) {
  const [tab, setTab] = useState<'flow' | 'video'>('flow');
  /**
   * 影片要等使用者真的點了「範例影片」才載入。
   *
   * 原型用 vidLoadedFor 做同一件事。不這樣做的話，每個訪客一進首頁就會
   * 載入並自動播放 YouTube iframe，白白吃流量，而且還沒看影片就先被種 cookie。
   * 點過之後就留著，切回「看底層」只靜音不卸載，這樣切回來能續播。
   */
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [unmuted, setUnmuted] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const zoomBox = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null);
  const maskTimer = useRef<ReturnType<typeof setTimeout>>();
  const justLooped = useRef(false);

  const cfg = FLOW_VIDEOS[flowIndex] ?? null;
  // 換流程時把影片收回未載入狀態，免得還在播上一條的片段
  useEffect(() => { setVideoLoaded(false); }, [flowIndex]);
  // 換流程時重置，免得播到上一條的片段
  useEffect(() => { setVideoLoaded(false); }, [flowIndex]);
  const clipLen = cfg?.end && cfg?.start != null && cfg.end > cfg.start ? cfg.end - cfg.start : 0;

  /** 以某個點為中心縮放，那個點在畫面上的位置維持不變 */
  const zoomAt = useCallback((factor: number, mx?: number, my?: number) => {
    const sc = scroller.current;
    if (!sc) return;
    setZoom((z0) => {
      const z = Math.min(2.5, Math.max(0.4, z0 * factor));
      if (z === z0) return z0;
      const ax = mx ?? sc.clientWidth / 2;
      const ay = my ?? sc.clientHeight / 2;
      const cx = (sc.scrollLeft + ax) / z0;
      const cy = (sc.scrollTop + ay) / z0;
      // 縮放後再校正捲動位置，所以游標下的節點不會跑掉
      requestAnimationFrame(() => {
        sc.scrollLeft = cx * z - ax;
        sc.scrollTop = cy * z - ay;
      });
      return z;
    });
  }, []);

  // 滾輪縮放。要 passive:false 才能擋掉頁面捲動。
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = sc.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top);
    };
    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => sc.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // 按住拖曳平移
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      const sc = scroller.current;
      if (!d || !sc) return;
      sc.scrollLeft = d.l - (e.clientX - d.x);
      sc.scrollTop = d.t - (e.clientY - d.y);
      e.preventDefault();
    };
    const onUp = () => {
      if (drag.current && scroller.current) scroller.current.style.cursor = 'grab';
      drag.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // 全螢幕時 Esc 退出
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  const cmd = useCallback((func: string, args: any[] = []) => {
    iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  }, []);

  /**
   * 訂閱 YouTube 的播放進度。
   *
   * 這一步不能少：YouTube 的 iframe 預設不會主動回報播放時間，要先送一個
   * listening 訊息它才開始發 infoDelivery。沒訂閱的話下面那個「播到片段結尾
   * 就跳回開頭」的判斷永遠收不到時間，影片會一路往下播出片段範圍。
   * （實測過：沒有這行時播到 92 秒還在跑，片段設定是 70–80。）
   */
  const listen = useCallback(() => {
    iframe.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 'tgflow', channel: 'widget' }),
      '*'
    );
  }, []);

  /** 跳轉時把 iframe 淡出，遮住 YouTube 自己的暫停圖示 */
  const maskedSeek = useCallback((target: number) => {
    const f = iframe.current;
    if (f) {
      f.style.transition = 'opacity .12s linear';
      f.style.opacity = '0';
    }
    cmd('seekTo', [target, true]);
    clearTimeout(maskTimer.current);
    maskTimer.current = setTimeout(() => { if (f) f.style.opacity = '1'; }, 800);
  }, [cmd]);

  // 聽 YouTube 回報的播放進度，用來顯示秒數並在片段結尾跳回開頭
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string' || e.data.indexOf('infoDelivery') < 0) return;
      let d: any;
      try { d = JSON.parse(e.data); } catch { return; }
      const t = d?.info?.currentTime;
      if (t == null || !cfg?.loop || !clipLen) return;
      const s0 = cfg.start ?? 0;
      if (t >= s0 + clipLen - 0.25 && !justLooped.current) {
        justLooped.current = true;
        setTimeout(() => { justLooped.current = false; }, 900);
        maskedSeek(s0);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [cfg, clipLen, maskedSeek]);

  // 切到「看底層」時把影片靜音但不暫停，避免 YouTube 的暫停鈕卡在畫面上；
  // 切回影片時重新訂閱一次，確保進度回報沒有中斷。
  useEffect(() => {
    if (tab === 'flow') {
      cmd('mute');
      return;
    }
    const t = setTimeout(() => {
      listen();
      if (unmuted) {
        cmd('unMute');
        cmd('setVolume', [80]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [tab, unmuted, cmd, listen]);

  const canvasSize = full
    ? { flex: '1 1 auto', height: 'auto', minHeight: 0 }
    : { height: 320 };

  const tabStyle = (on: boolean) =>
    on
      ? { background: '#FFFFFF', color: 'var(--fg-primary)', border: '1px solid var(--border-subtle)', borderBottom: '1px solid #FFFFFF', marginBottom: -1, zIndex: 1 }
      : { background: 'var(--slate-100)', color: 'var(--fg-secondary)', border: '1px solid var(--border-subtle)', borderBottom: 'none' };

  const vidSrc = cfg && videoLoaded
    ? `https://www.youtube.com/embed/${cfg.yt}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1&controls=0&iv_load_policy=3&disablekb=1&fs=0&vq=hd1080` +
      (cfg.si ? `&si=${cfg.si}` : '') +
      (cfg.start ? `&start=${cfg.start}` : '')
    : 'about:blank';

  return (
    <>
      {/* 資料夾式頁籤。選 13 部門時整排隱藏。 */}
      <div style={{ display: mode === 'dept' ? 'none' : 'flex', gap: 4 }}>
        <span onClick={() => { setTab('video'); setVideoLoaded(true); }} style={{ padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, position: 'relative', ...tabStyle(tab === 'video') }}>範例影片</span>
        <span onClick={() => setTab('flow')} style={{ padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, position: 'relative', ...tabStyle(tab === 'flow') }}>看底層</span>
      </div>

      <div
        style={{
          border: '1px solid var(--border-subtle)',
          background: '#fff',
          ...(full
            ? {
                position: 'fixed' as const, left: '50%', top: '50%',
                transform: 'translate(-50%,-50%)',
                width: 'min(84vw,1400px)', height: '82vh', zIndex: 400,
                display: 'flex', flexDirection: 'column' as const,
                boxShadow: 'var(--shadow-xl)',
              }
            : {}),
        }}
      >
        {/* 流程模式 */}
        <div style={{ display: mode === 'dept' ? 'none' : full ? 'flex' : 'block', ...(full ? { flexDirection: 'column' as const, flex: 1, minHeight: 0 } : {}) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-tertiary)' }}>
              企業首選工作流・卷 {String(flowIndex + 1).padStart(2, '0')}／06
            </span>
            <b style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700 }}>{flow.name}</b>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--fg-tertiary)' }}>{(flow.nodes as any[]).length} 節點</span>
            <span
              className="tg-case-fs"
              onClick={() => setFull((v) => !v)}
              title="全螢幕"
              style={{ cursor: 'pointer', width: 28, height: 28, border: '1px solid var(--border-default)', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, userSelect: 'none', flex: 'none' }}
            >
              {full ? '✕' : '⤢'}
            </span>
          </div>

          {/* 看底層 */}
          <div style={{ display: tab === 'flow' ? (full ? 'flex' : 'block') : 'none', ...(full ? { flexDirection: 'column' as const, flex: 1, minHeight: 0 } : {}) }}>
            <div
              ref={scroller}
              id="tg-flow-scroll"
              onPointerDown={(e) => {
                const sc = scroller.current;
                if (!sc) return;
                drag.current = { x: e.clientX, y: e.clientY, l: sc.scrollLeft, t: sc.scrollTop };
                sc.style.cursor = 'grabbing';
              }}
              style={{
                ...canvasSize,
                overflow: 'auto',
                cursor: 'grab',
                userSelect: 'none',
                scrollbarWidth: 'none',
                backgroundColor: '#FAFAF8',
                backgroundImage: 'radial-gradient(var(--border-default) 1px,transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              <div ref={zoomBox} style={{ transformOrigin: '0 0', transform: `scale(${zoom})` }}>
                <FlowCanvas flow={flow} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', background: '#fff', minHeight: 42 }}>
              <span className="tg-case-zoom" onClick={() => zoomAt(0.8)} style={{ cursor: 'pointer', flex: 'none', border: '1px solid var(--border-default)', padding: '4px 10px', fontFamily: MONO, fontSize: 11, userSelect: 'none' }}>−</span>
              <span style={{ flex: 'none', fontFamily: MONO, fontSize: 11, color: 'var(--fg-secondary)', minWidth: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <span className="tg-case-zoom" onClick={() => zoomAt(1.25)} style={{ cursor: 'pointer', flex: 'none', border: '1px solid var(--border-default)', padding: '4px 10px', fontFamily: MONO, fontSize: 11, userSelect: 'none' }}>＋</span>
              <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--fg-tertiary)' }}>滾輪縮放・按住拖曳</span>
            </div>
            <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, color: 'var(--fg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
              看底層：n8n 原檔繪製，虛線是資料在跑，⤢ 放大看。
            </p>
          </div>

          {/* 範例影片 */}
          <div style={{ display: tab === 'video' ? 'block' : 'none' }}>
            <div style={{ position: 'relative', background: '#0E0E0D', overflow: 'hidden', ...canvasSize }}>
              {/* 上下各裁 64px，藏掉 YouTube 的標題列與浮水印 */}
              <iframe
                ref={iframe}
                src={vidSrc}
                title="範例影片"
                onLoad={() => {
                  // 等一下再訂閱，iframe 剛載入時還沒準備好接訊息
                  setTimeout(() => {
                    listen();
                    cmd('setPlaybackQuality', ['hd1080']);
                  }, 300);
                }}
                style={{ position: 'absolute', left: 0, top: -64, width: '100%', height: 'calc(100% + 128px)', border: 0, display: cfg ? 'block' : 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <div style={{ position: 'absolute', inset: 0, display: cfg ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#B5B2AC', textAlign: 'center', padding: 24 }}>
                <span style={{ width: 56, height: 56, border: '1px solid rgba(255,255,255,.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: MONO, color: '#ECA42B' }}>播放</span>
                <b style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{flow.name}・範例影片</b>
                <span style={{ fontSize: 12, lineHeight: 1.7 }}>
                  這條的錄影準備中，影片連結給我就接上。<br />先點「看底層」看流程怎麼跑。
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--border-subtle)', background: '#fff', minHeight: 42 }}>
              <span style={{ flex: 'none', fontFamily: MONO, fontSize: 11, color: 'var(--fg-secondary)' }}>
                0:00 <span style={{ color: 'var(--fg-tertiary)' }}>／ {clipLen ? `0:${String(clipLen).padStart(2, '0')}` : '0:00'}</span>
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--fg-tertiary)' }}>點影片可播放或暫停</span>
              <span
                className="tg-case-zoom"
                onClick={() => {
                  setUnmuted((v) => {
                    cmd(v ? 'mute' : 'unMute');
                    if (!v) cmd('setVolume', [80]);
                    return !v;
                  });
                }}
                title={unmuted ? '點擊靜音' : '點擊開聲音'}
                style={{ cursor: 'pointer', flex: 'none', border: '1px solid var(--border-default)', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', userSelect: 'none', color: unmuted ? 'var(--fg-primary)' : 'var(--fg-tertiary)' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} style={{ display: unmuted ? 'block' : 'none' }}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M19 5a10 10 0 0 1 0 14" />
                </svg>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} style={{ display: unmuted ? 'none' : 'block' }}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              </span>
              <div style={{ flex: 'none', width: 64, height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ position: 'relative', flex: 1, height: 4, background: 'var(--slate-200)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: unmuted ? '80%' : '0%', background: 'var(--ink-900)' }} />
                </div>
              </div>
            </div>
            <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, color: 'var(--fg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
              範例影片：點影片即可播放或暫停；只播後台設定的重點片段並自動循環（此片示範 1:10 起 10 秒）。
            </p>
          </div>
        </div>

        {/* 13 部門模式 */}
        <div style={{ display: mode === 'dept' ? 'block' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-tertiary)' }}>13 部門・案卷 {deptNo}／13</span>
            <b style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700 }}>{deptName}</b>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--fg-tertiary)' }}>{deptKpi}</span>
          </div>
          {/* 原型這裡是拖圖框，正式站會是 DeptCases collection 的圖片欄位 */}
          <div data-cms-image="dept-media" style={{ aspectRatio: '4/3', position: 'relative', background: 'var(--slate-50)' }} />
          <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, color: 'var(--fg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
            直接把圖拖進上方框即可，重新整理仍保留。
          </p>
        </div>
      </div>
    </>
  );
}
