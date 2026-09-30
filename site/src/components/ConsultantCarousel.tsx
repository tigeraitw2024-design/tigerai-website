import { useState } from 'react';
import { consultants } from '../data/consultants';

/**
 * 顧問群輪播。移植自 design/顧問與方法論.dc.html。
 *
 * 卡片清單接兩份（CS.concat(CS)），配合 cw-mq 這個「移動 -50%」的動畫，
 * 60 秒繞一圈剛好接回起點，看起來是無限左移。滑鼠進到整條就暫停
 * （animation-play-state），滑到哪一張，下方詳情就換成那個人。
 *
 * 示意資料（學員數、簡介、經歷、技能、社群追蹤數）原型寫死在頁面裡，
 * 這裡照搬。接上 Team collection 之後由後台決定。
 */

const STUDENTS = ['1,240+', '680+', '520+', '410+', '320+', '860+', '290+', '450+', '960+', '—'];

const BIO = [
  '從評估、POC 到上線的總負責人，13 部門 AI 同事的規劃者。',
  '把重複的日常變成 workflow，n8n 中文社群的資深回答手。',
  '文件變知識庫的架構師：答了有出處，是他的底線。',
  '機房裡長大的導入顧問，負責硬體選型與算力規劃。',
  '部門額度、熔斷與稽核軌跡的守門人。',
  '資料不乾淨，AI 就不聰明，他管前面那一段。',
  '開源模型隨裝隨換的實作者，版本管理不出事。',
  '幫你決定先做哪個部門，導入路線圖工作坊主講。',
  'L1–L5 內訓課表的設計者，帶過 960+ 位學員。',
  '臺科大教授，C1–C5 方法論的學術把關。',
];

const EXPERIENCE = [
  ['臺科大資工博士', '前系統整合商技術長', '導入 40+ 家企業'],
  ['n8n Taiwan Ambassador', '自動化課程學員 1,240+', '模板下載 8,000+ 次'],
  ['前搜尋引擎團隊工程師', 'Advanced RAG 課程主講', '知識庫上線 30+ 套'],
  ['前伺服器原廠 FAE', 'AMD 合作案技術窗口', '機房建置 20+ 場'],
  ['前金融業資安主管', 'LiteLLM 治理課程主講', '稽核輔導 15+ 家'],
  ['前製造業資料工程師', 'ETL 與資料清理 10 年', '知識庫資料整備 30+ 案'],
  ['開源社群貢獻者', 'Ollama 實戰課程主講', '模型佈署 50+ 次'],
  ['前顧問公司專案總監', '導入路線圖工作坊 40+ 場', '九維拆解共同作者'],
  ['企業內訓 300+ 小時', '政府補助案輔導 20+ 件', 'L1–L5 課綱設計'],
  ['臺科大教授', 'C1–C5 思考力量表作者', '學術合作窗口'],
];

const SKILLS = [
  ['導入策略', 'POC 規劃', '13 部門 AI 同事'],
  ['n8n', 'Workflow 設計', '流程稽核'],
  ['RAG', '向量檢索', '出處回覆'],
  ['Local GPT', '硬體選型', '算力規劃'],
  ['LiteLLM', '額度治理', '熔斷設計'],
  ['資料清理', 'ETL', '文件結構化'],
  ['Ollama', '模型維運', '版本管理'],
  ['L.A.O.S. 拆題', '九維拆解', '路線圖'],
  ['企業內訓', '課綱設計', '補助申請'],
  ['C1–C5', '方法論', '學術合作'],
];

const MONO = "'JetBrains Mono',monospace";
const num = (n: number) => n.toLocaleString('en-US');
const fullName = (c: { zh: string; en: string }) => c.zh + (c.en ? (c.zh ? ' ' : '') + c.en : '');

export default function ConsultantCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // 換人時交替兩組內容相同的 keyframes，讓詳情每次都重新觸發進場動畫
  const [changes, setChanges] = useState(0);

  const cards = [...consultants, ...consultants];
  const a = consultants[i] ?? { zh: '', en: '', title: '', course: '', avatar: '', img: '' };
  const detailAnim = changes
    ? `${changes % 2 ? 'cw-in' : 'cw-in2'} .3s cubic-bezier(.22,.61,.36,1) both`
    : 'none';

  const social = [
    { label: 'Facebook 粉專', n: num(4200 + i * 1730), unit: '追蹤' },
    { label: 'Instagram', n: num(2800 + i * 940), unit: '追蹤' },
    { label: 'YouTube', n: num(6500 + i * 2210), unit: '訂閱' },
  ];

  return (
    <>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{ overflow: 'hidden', marginTop: 40, position: 'relative' }}
      >
        <div
          style={{
            display: 'flex',
            gap: 20,
            width: 'max-content',
            padding: '4px 0',
            animation: 'cw-mq 60s linear infinite',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {cards.map((c, k) => {
            const idx = k % consultants.length;
            return (
              <a
                key={k}
                href="/courses"
                onMouseEnter={() => {
                  setChanges((n) => n + 1);
                  setI(idx);
                }}
                style={{
                  width: 216,
                  flex: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  background: '#FFFFFF',
                  border: `1px solid ${idx === i ? 'var(--tiger-500)' : 'var(--border-subtle)'}`,
                  overflow: 'hidden',
                  transition: 'border-color .12s cubic-bezier(.22,.61,.36,1)',
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                <span
                  style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 2,
                    fontFamily: MONO, fontSize: 10, padding: '3px 8px',
                    background: 'rgba(255,255,255,.88)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-primary)',
                  }}
                >
                  {STUDENTS[idx] || '—'} 位學員
                </span>
                <span
                  style={{
                    position: 'absolute', top: 10, right: 8, zIndex: 2,
                    writingMode: 'vertical-rl', fontFamily: MONO, fontSize: 10,
                    letterSpacing: '.14em', color: 'var(--fg-tertiary)',
                  }}
                >
                  {c.en || 'TIGERAI'}
                </span>
                <div style={{ height: 216, position: 'relative' }}>
                  <img
                    loading="lazy"
                    src={`/${c.card || c.img}`}
                    alt={c.zh}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  />
                  {/* 下緣漸層淡出成白色，讓照片和底下的文字無縫接起來 */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 55%,#FFFFFF 96%)' }} />
                </div>
                <div style={{ padding: '0 14px 14px', marginTop: -8, position: 'relative' }}>
                  <b
                    style={{
                      fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 19, fontWeight: 800,
                      letterSpacing: '-.01em', color: 'var(--fg-primary)', display: 'block',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {c.course}
                  </b>
                  <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{c.zh}</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 40, background: '#FFFFFF' }}>
        <div
          style={{
            maxWidth: 1440, margin: '0 auto', padding: '40px clamp(16px,5vw,64px)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 40,
            animation: detailAnim,
          }}
        >
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'var(--slate-200)', flex: 'none' }}>
                <img loading="lazy" src={`/${a.avatar || a.img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
              </span>
              <span style={{ display: 'grid', gap: 2 }}>
                <b style={{ fontFamily: "'Manrope','Noto Sans TC',sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-.01em' }}>{fullName(a)}</b>
                <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{a.title}</span>
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--fg-secondary)', maxWidth: '48ch' }}>{BIO[i] || ''}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
              {(EXPERIENCE[i] || []).map((t) => (
                <span key={t} style={{ fontFamily: MONO, fontSize: 12, color: 'var(--fg-secondary)' }}>・{t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {(SKILLS[i] || []).map((t) => (
                <span key={t} style={{ fontFamily: MONO, fontSize: 11, border: '1px solid var(--border-default)', padding: '4px 10px' }}>{t}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg-tertiary)' }}>
              社群與內容（示意連結）
            </span>
            {social.map((s) => (
              <a
                key={s.label}
                href="#"
                className="tg-social"
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  border: '1px solid var(--border-subtle)', background: '#fff',
                  padding: '12px 14px', textDecoration: 'none', color: 'var(--fg-primary)',
                }}
              >
                <b style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</b>
                <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--fg-tertiary)' }}>{s.n} {s.unit}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--tiger-600)' }}>→</span>
              </a>
            ))}
            <a href="/courses" style={{ fontSize: 14, fontWeight: 600, color: 'var(--tiger-700)', textDecoration: 'none', marginTop: 8 }}>
              看他開的課：{a.course} →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
