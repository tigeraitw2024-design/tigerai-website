/**
 * 設計系統元件的正式站版本。
 *
 * 原型是靠 _ds_bundle.js 這支 IIFE 掛到 window.TigerAIDesignSystem_0a5667，
 * 而那支需要全域的 React。正式站的 React 是打包在模組裡的，沒有全域 React，
 * 我也不想為了相容而把全域 hack 搬進來。
 *
 * 所以這裡照 bundle 裡的實作逐一重寫成 ES 模組。標記與 class 完全一致
 * （設計系統的說明文件也寫明：元件只是 class API 的薄包裝，hover／active／
 * focus-visible／disabled 全部來自 CSS，不是 inline style），所以外觀一致。
 *
 * 只做主控台實際用到的那幾個。要用到別的再照 bundle 補。
 */
import React, { useEffect, useState } from 'react';
import { ICONS } from './icons';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ── Button ───────────────────────────────────────── */

const BTN_VARIANT: Record<string, string> = {
  primary: 't-btn--primary',
  secondary: 't-btn--secondary',
  outline: 't-btn--outline',
  ghost: 't-btn--ghost',
  danger: 't-btn--danger',
  link: 't-btn--link',
};
const BTN_SIZE: Record<string, string> = { sm: 't-btn--sm', md: '', lg: 't-btn--lg', xl: 't-btn--xl' };

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  iconOnly = false,
  icon = null,
  as = 'button',
  className = '',
  children,
  ...rest
}: any) {
  const Tag: any = as;
  const cls = cx(
    't-btn',
    BTN_VARIANT[variant] || BTN_VARIANT.primary,
    BTN_SIZE[size] || '',
    block && 't-btn--block',
    loading && 't-btn--loading',
    iconOnly && 't-btn--icon',
    className
  );
  // 原生 button 要明確給 type，不然表單裡會變成送出按鈕
  const typeProp = Tag === 'button' ? { type: rest.type || 'button' } : null;
  return (
    <Tag className={cls} {...typeProp} {...rest}>
      {icon}
      {iconOnly ? null : children}
    </Tag>
  );
}

export function ButtonGroup({ className = '', children, ...rest }: any) {
  return (
    <div className={cx('t-btn-group', className)} role="group" {...rest}>
      {children}
    </div>
  );
}

/* ── Badge ────────────────────────────────────────── */

const BADGE_VARIANT: Record<string, string> = {
  default: '',
  brand: 't-badge--brand',
  solid: 't-badge--solid',
  ink: 't-badge--ink',
  success: 't-badge--success',
  warning: 't-badge--warning',
  danger: 't-badge--danger',
  info: 't-badge--info',
  outline: 't-badge--outline',
};

export function Badge({ variant = 'default', dot = false, className = '', children, ...rest }: any) {
  return (
    <span className={cx('t-badge', BADGE_VARIANT[variant] || '', className)} {...rest}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}

/* ── Stat ─────────────────────────────────────────── */

export function Stat({ label, value, unit, delta, down = false, valueColor, className = '', ...rest }: any) {
  return (
    <div className={cx('t-stat', className)} {...rest}>
      <div className="t-stat__label">{label}</div>
      <div className="t-stat__value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
        {unit ? <span style={{ fontSize: 'var(--fs-24)', color: 'var(--fg-tertiary)' }}>{unit}</span> : null}
      </div>
      {delta ? <div className={cx('t-stat__delta', down && 'is-down')}>{delta}</div> : null}
    </div>
  );
}

/* ── 表單 ─────────────────────────────────────────── */

export function Field({ label, required = false, help, error, htmlFor, className = '', children, ...rest }: any) {
  return (
    <div className={cx('t-field', className)} {...rest}>
      {label ? (
        <label className="t-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="req">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <span className="t-error">{error}</span> : help ? <span className="t-help">{help}</span> : null}
    </div>
  );
}

export function Input({ prefix = null, suffix = null, invalid = false, className = '', ...rest }: any) {
  const cls = cx('t-input', prefix && 'has-prefix', suffix && 'has-suffix', invalid && 'is-invalid', className);
  const input = <input className={cls} aria-invalid={invalid || undefined} {...rest} />;
  if (!prefix && !suffix) return input;
  return (
    <div className="t-input-group">
      {prefix ? <span className="prefix">{prefix}</span> : null}
      {input}
      {suffix ? <span className="suffix">{suffix}</span> : null}
    </div>
  );
}

export function Select({ options = null, invalid = false, className = '', children, ...rest }: any) {
  return (
    <select className={cx('t-select', invalid && 'is-invalid', className)} aria-invalid={invalid || undefined} {...rest}>
      {options
        ? options.map((o: any) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}

export function Textarea({ invalid = false, className = '', ...rest }: any) {
  return <textarea className={cx('t-textarea', invalid && 'is-invalid', className)} aria-invalid={invalid || undefined} {...rest} />;
}

/* ── Icon ─────────────────────────────────────────── */

/**
 * Lucide outline 圖示，用 currentColor 上色，所以會跟著父層的文字顏色走。
 *
 * 跟原型的差別：原型是執行時 fetch CDN 的 @latest，這裡是建置時內嵌固定版本
 * （見 tools/gen-icons.mjs）。因此不連外網、版本不會飄、第一次顯示也不會閃。
 * 圖示的 SVG 內容本身一樣。
 */
export function Icon({ name, size = 16, className = '', style = {}, ...rest }: any) {
  const svg = ICONS[name];
  if (!svg && typeof console !== 'undefined') {
    // 名字打錯時不要默默變空白，開發時就要看得到
    console.warn(`[Icon] 找不到圖示「${name}」。用了新圖示要重跑 node tools/gen-icons.mjs`);
  }
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', width: size, height: size, lineHeight: 0, flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: svg || '' }}
      {...rest}
    />
  );
}

export default { Button, ButtonGroup, Badge, Stat, Field, Input, Select, Textarea, Icon };
