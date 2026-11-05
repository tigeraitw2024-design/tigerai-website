import { useEffect, useRef } from 'react';
import { CERT_CSS } from './certStyle';

/**
 * 證照本體（n8n 版式忠實重現 ＋ 虎智紅印 ＋ Morris 簽名）。
 *
 * 這一個元件同時給「畫面預覽」和「存成圖檔」用，所以版式只有這一份，
 * 不會兩邊走樣。寬度由 width（像素）決定，其餘尺寸等比算出來：
 *   預覽 → 量父層寬度自動填滿
 *   匯出 → 固定 1398、canvas 再放大（見 certExport.ts）
 *
 * n8n logo 直接內嵌 path（不用 <symbol>/<use>），因為匯出時整個節點會被
 * 序列化進一張 SVG，<use href="#id"> 在那裡面找不到來源會變空白。
 */

const SIG_SRC: Record<string, string> = {
  black: '/teacher/sig_black.png',
  red: '/teacher/sig_red.png',
  blue: '/teacher/sig_blue.png',
};

export type CertData = { studentName: string; course: string; issueDate: string };

export type CertTune = {
  sigColor?: 'black' | 'red' | 'blue';
  showSig?: boolean;
  showSeal?: boolean;
  sigW?: number; sigX?: number; sigY?: number;
  sealX?: number; sealY?: number; sealSize?: number; sealRot?: number; sealOp?: number;
  endorseCaption?: string;
};

const DEF: Required<CertTune> = {
  sigColor: 'black', showSig: true, showSeal: true,
  sigW: 17, sigX: 63, sigY: 72,
  sealX: 84, sealY: 75, sealSize: 16, sealRot: -5, sealOp: 90,
  endorseCaption: '台灣虎智科技股份有限公司',
};

function N8nLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 576 160" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M272 64C257.089 64 244.561 53.8018 241.008 40H204.331C196.51 40 189.835 45.6546 188.549 53.3696L187.234 61.2608C185.985 68.7531 182.195 75.2738 176.835 80C182.195 84.7262 185.985 91.2469 187.234 98.7392L188.549 106.63C189.835 114.345 196.51 120 204.331 120H209.008C212.561 106.198 225.089 96 240 96C257.673 96 272 110.327 272 128C272 145.673 257.673 160 240 160C225.089 160 212.56 149.802 209.008 136H204.331C188.688 136 175.338 124.691 172.766 109.261L171.451 101.37C170.165 93.6546 163.49 88 155.669 88H142.992C139.44 101.802 126.911 112 112 112C97.0893 112 84.5605 101.802 81.0081 88H62.9919C59.4395 101.802 46.9107 112 32 112C14.3269 112 0 97.6731 0 80C0 62.3269 14.3269 48 32 48C46.9107 48 59.4395 58.1982 62.9919 72H81.0081C84.5605 58.1982 97.0893 48 112 48C126.911 48 139.44 58.1982 142.992 72H155.669C163.49 72 170.165 66.3454 171.451 58.6304L172.766 50.7392C175.338 35.3092 188.688 24 204.331 24L241.008 24C244.56 10.1982 257.089 0 272 0C289.673 0 304 14.3269 304 32C304 49.6731 289.673 64 272 64ZM272 48C280.837 48 288 40.8366 288 32C288 23.1634 280.837 16 272 16C263.163 16 256 23.1634 256 32C256 40.8366 263.163 48 272 48ZM32 96C40.8366 96 48 88.8366 48 80C48 71.1634 40.8366 64 32 64C23.1634 64 16 71.1634 16 80C16 88.8366 23.1634 96 32 96ZM128 80C128 88.8366 120.837 96 112 96C103.163 96 96 88.8366 96 80C96 71.1634 103.163 64 112 64C120.837 64 128 71.1634 128 80ZM256 128C256 136.837 248.837 144 240 144C231.163 144 224 136.837 224 128C224 119.163 231.163 112 240 112C248.837 112 256 119.163 256 128Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M480.023 69.1834V68.421C485.605 65.6252 491.188 60.7962 491.188 51.2651C491.188 37.5405 479.896 29.2803 464.29 29.2803C448.304 29.2803 436.885 38.0488 436.885 51.5193C436.885 60.6691 442.214 65.6252 448.05 68.421V69.1834C441.579 71.4709 433.84 78.3332 433.84 89.7704C433.84 103.622 445.259 113.28 464.163 113.28C483.068 113.28 494.106 103.622 494.106 89.7704C494.106 78.3332 486.494 71.598 480.023 69.1834ZM464.163 40.9717C470.507 40.9717 475.202 45.0382 475.202 51.9005C475.202 58.7629 470.38 62.8294 464.163 62.8294C457.946 62.8294 452.744 58.7629 452.744 51.9005C452.744 44.9111 457.693 40.9717 464.163 40.9717ZM464.163 101.081C456.804 101.081 450.841 96.3786 450.841 88.3726C450.841 81.129 455.789 75.6645 464.036 75.6645C472.156 75.6645 477.105 81.0019 477.105 88.6267C477.105 96.3786 471.395 101.081 464.163 101.081Z" fill="currentColor" />
      <path d="M513.68 112.009H529.92V77.5707C529.92 66.2606 536.771 61.3045 544.511 61.3045C552.123 61.3045 558.087 66.3877 558.087 76.8083V112.009H574.327V73.5042C574.327 56.8567 564.684 47.1986 549.586 47.1986C540.07 47.1986 534.741 51.011 530.935 55.9671H529.92L528.524 48.4694H513.68V112.009Z" fill="currentColor" />
      <path d="M369.92 112.009H353.68V48.4694H368.524L369.92 55.9671H370.935C374.741 51.011 380.07 47.1986 389.586 47.1986C404.684 47.1986 414.327 56.8567 414.327 73.5042V112.009H398.087V76.8083C398.087 66.3877 392.123 61.3045 384.511 61.3045C376.771 61.3045 369.92 66.2606 369.92 77.5707V112.009Z" fill="currentColor" />
    </svg>
  );
}

let styleInjected = false;

/**
 * width 不給就自動量父層寬度（預覽）。給了就固定（匯出）。
 */
export default function Cert({ data, tune, width }: { data: CertData; tune?: CertTune; width?: number }) {
  const t = { ...DEF, ...tune };
  const ref = useRef<HTMLDivElement>(null);

  // 樣式只注入一次（給預覽用；匯出時另外把同一份 CSS 塞進 SVG）
  useEffect(() => {
    if (styleInjected || typeof document === 'undefined') return;
    const el = document.createElement('style');
    el.id = 'tgc-style';
    el.textContent = CERT_CSS;
    document.head.appendChild(el);
    styleInjected = true;
  }, []);

  // 沒給固定寬度時，跟著父層寬度走
  useEffect(() => {
    if (width || !ref.current) return;
    const node = ref.current;
    const parent = node.parentElement;
    if (!parent) return;
    const apply = () => node.style.setProperty('--cw', parent.clientWidth + 'px');
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [width]);

  const vars: Record<string, string> = {
    '--sigw': String(t.sigW), '--sx': t.sigX + '%', '--sy': t.sigY + '%',
    '--kx': t.sealX + '%', '--ky': t.sealY + '%', '--ksz': t.sealSize + '%',
    '--krot': t.sealRot + 'deg', '--kop': (t.sealOp / 100).toFixed(2),
  };
  if (width) vars['--cw'] = width + 'px';

  return (
    <div className="tgc" ref={ref} style={vars as any} data-tgc>
      <span className="tgc__notch l" />
      <span className="tgc__notch r" />
      <div className="tgc__card">
        <div className="tgc__stack">
          <div className="tgc__logo">
            <N8nLogo className="tgc__mark" />
            <span className="tgc__divider" />
            <span className="tgc__academy">academy</span>
          </div>
          <h2 className="tgc__title">Certificate</h2>
          <div className="tgc__presented">This certificate is proudly presented to</div>
          <div className="tgc__name">{data.studentName || '學員姓名'}</div>
          <div className="tgc__namerule" />
          <div className="tgc__body">successfully completed, received a passing grade<br />and was awarded this certificate of completion</div>
          <div className="tgc__course">{data.course || 'n8n Quickstart'}</div>
        </div>
        <div className="tgc__footer">
          <div className="tgc__foot">
            <div className="tgc__val">{data.issueDate || '—'}</div>
            <div className="tgc__rule" />
            <div className="tgc__lbl">Date</div>
          </div>
          <div className="tgc__bolt"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2 4 14h6l-1.5 8L20 9h-6.5z" /></svg></div>
          <div className="tgc__foot">
            <N8nLogo className="tgc__mark" />
            <div className="tgc__rule" />
            <div className="tgc__lbl">Education Team</div>
          </div>
        </div>

        {t.showSig && (
          <div className="tgc__endorse">
            <img className="tgc__sig" src={SIG_SRC[t.sigColor]} alt="Morris 簽名" crossOrigin="anonymous" />
            <div className="tgc__sigrule" />
            <div className="tgc__sigcap">{t.endorseCaption}</div>
          </div>
        )}
        {t.showSeal && <img className="tgc__seal" src="/teacher/seal.png" alt="虎智科技公司印章" crossOrigin="anonymous" />}
      </div>
    </div>
  );
}

export { SIG_SRC, DEF as CERT_DEFAULTS };
