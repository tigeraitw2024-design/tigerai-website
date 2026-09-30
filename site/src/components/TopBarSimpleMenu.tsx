import { useEffect, useState } from 'react';
import { NAV, CTA } from '../nav';
import { useNarrow } from '../hooks/useNarrow';

/**
 * Tiger GPU Pro 那頁的手機選單。
 *
 * 那一頁的頂欄跟其他 7 頁不同（sticky、58px、不縮），是原型自己的設計，
 * 所以沒有共用 TopBar.tsx。這支只補窄螢幕要用的漢堡選單，桌機時什麼都不畫，
 * 讓原本的靜態導覽維持原樣、像素比對不受影響。
 *
 * 桌機那排導覽和 CTA 在窄螢幕由 .tg-wide-only 這個 class 藏起來（見 site.css）。
 */
export default function TopBarSimpleMenu() {
  const narrow = useNarrow(900);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!narrow) setOpen(false);
  }, [narrow]);

  if (!narrow) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? '關閉選單' : '開啟選單'}
        aria-expanded={open}
        style={{
          width: 44, height: 44, padding: 0,
          border: '1px solid var(--border-default)', background: '#fff',
          display: 'inline-flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 5,
          cursor: 'pointer', borderRadius: 0,
        }}
      >
        <span style={{ display: 'block', width: 18, height: 2, background: '#0E0E0D', transition: 'transform .2s cubic-bezier(.22,.61,.36,1)', transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
        <span style={{ display: 'block', width: 18, height: 2, background: '#0E0E0D', transition: 'opacity .2s', opacity: open ? 0 : 1 }} />
        <span style={{ display: 'block', width: 18, height: 2, background: '#0E0E0D', transition: 'transform .2s cubic-bezier(.22,.61,.36,1)', transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', top: 58, left: 0, right: 0, bottom: 0,
            background: '#FAFAF8', borderTop: '1px solid var(--border-subtle)',
            overflowY: 'auto', zIndex: 200,
            animation: 'tg-in .2s cubic-bezier(.22,.61,.36,1) both',
          }}
        >
          <nav style={{ display: 'grid', padding: '8px 16px 24px' }}>
            {NAV.map((item) => (
              <div key={item.key}>
                <a href={item.href} style={{ display: 'flex', alignItems: 'center', minHeight: 52, fontSize: 17, fontWeight: 500, color: '#0E0E0D', textDecoration: 'none', borderBottom: '1px solid var(--border-subtle)' }}>
                  {item.label}
                </a>
                {item.children?.map((c) => (
                  <a key={c.href} href={c.href} style={{ display: 'flex', alignItems: 'center', minHeight: 46, paddingLeft: 16, fontSize: 15, color: 'var(--fg-secondary)', textDecoration: 'none', borderBottom: '1px solid var(--border-subtle)' }}>
                    ・{c.label}
                  </a>
                ))}
              </div>
            ))}
            <a className="t-btn t-btn--primary t-btn--block" href={CTA.href} style={{ marginTop: 20, textDecoration: 'none', height: 48 }}>
              {CTA.label}
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
