/* @ds-bundle: {"format":4,"namespace":"TigerAIDesignSystem_0a5667","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"ButtonGroup","sourcePath":"components/actions/ButtonGroup.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"Stat","sourcePath":"components/data/Stat.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Icon","sourcePath":"components/icon/Icon.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"e15923eb5258","components/actions/ButtonGroup.jsx":"48ce99a3ce57","components/data/Badge.jsx":"0d83dbc7d30d","components/data/Card.jsx":"f3d5635491b0","components/data/Stat.jsx":"7302c4a004a8","components/feedback/Alert.jsx":"8b7c410652e9","components/forms/Checkbox.jsx":"bae339515349","components/forms/Field.jsx":"b02ff733ec33","components/forms/Input.jsx":"27595a228c90","components/forms/Radio.jsx":"49ecb53e24bb","components/forms/Select.jsx":"617d12ddd410","components/forms/Switch.jsx":"bd0dc8a6c3e5","components/forms/Textarea.jsx":"8f78b067de29","components/icon/Icon.jsx":"bb4499f2b1f6","ui_kits/console/Console.jsx":"5531ca7b841c","ui_kits/console/StationsAsk.jsx":"800170255bf3","ui_kits/console/StationsOps.jsx":"904f39394bf5","ui_kits/website/Header.jsx":"377e29268b52","ui_kits/website/SectionsEnd.jsx":"d3a0edb49d84","ui_kits/website/SectionsTop.jsx":"5bdd5bd72774","ui_kits/website/Site.jsx":"65aaa5bba7ec"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TigerAIDesignSystem_0a5667 = window.TigerAIDesignSystem_0a5667 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANT = {
  primary: 't-btn--primary',
  secondary: 't-btn--secondary',
  outline: 't-btn--outline',
  ghost: 't-btn--ghost',
  danger: 't-btn--danger',
  link: 't-btn--link'
};
const SIZE = {
  sm: 't-btn--sm',
  md: '',
  lg: 't-btn--lg',
  xl: 't-btn--xl'
};
function Button(props) {
  const {
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
  } = props;
  const Tag = as;
  const cls = ['t-btn', VARIANT[variant] || VARIANT.primary, SIZE[size] || '', block ? 't-btn--block' : '', loading ? 't-btn--loading' : '', iconOnly ? 't-btn--icon' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, Tag === 'button' ? {
    type: props.type || 'button'
  } : null, rest), icon, iconOnly ? null : children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/ButtonGroup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ButtonGroup(props) {
  const {
    className = '',
    children,
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['t-btn-group', className].filter(Boolean).join(' '),
    role: "group"
  }, rest), children);
}
Object.assign(__ds_scope, { ButtonGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/ButtonGroup.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANT = {
  default: '',
  brand: 't-badge--brand',
  solid: 't-badge--solid',
  ink: 't-badge--ink',
  success: 't-badge--success',
  warning: 't-badge--warning',
  danger: 't-badge--danger',
  info: 't-badge--info',
  outline: 't-badge--outline'
};
function Badge(props) {
  const {
    variant = 'default',
    dot = false,
    className = '',
    children,
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['t-badge', VARIANT[variant] || '', className].filter(Boolean).join(' ')
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANT = {
  default: '',
  elevated: 't-card--elevated',
  outline: 't-card--outline',
  accent: 't-card--accent',
  inverse: 't-card--inverse',
  feature: 't-card--feature'
};
function Card(props) {
  const {
    variant = 'default',
    eyebrow,
    title,
    footer,
    interactive = false,
    as = 'article',
    className = '',
    children,
    ...rest
  } = props;
  const Tag = as;
  const cls = ['t-card', VARIANT[variant] || '', interactive ? 't-card--interactive' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), eyebrow ? /*#__PURE__*/React.createElement("p", {
    className: "t-card__eyebrow"
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("h4", {
    className: "t-card__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "t-card__body"
  }, children) : null, footer ? /*#__PURE__*/React.createElement("div", {
    className: "t-card__footer"
  }, footer) : null);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Stat(props) {
  const {
    label,
    value,
    unit,
    delta,
    down = false,
    valueColor,
    className = '',
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['t-stat', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "t-stat__label"
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "t-stat__value",
    style: valueColor ? {
      color: valueColor
    } : null
  }, value, unit ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-24)',
      color: 'var(--fg-tertiary)'
    }
  }, unit) : null), delta ? /*#__PURE__*/React.createElement("div", {
    className: ['t-stat__delta', down ? 'is-down' : ''].filter(Boolean).join(' ')
  }, delta) : null);
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Stat.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const GLYPH = {
  info: 'i',
  success: '✓',
  warning: '!',
  danger: '×'
};
function Alert(props) {
  const {
    variant = 'info',
    title,
    glyph,
    className = '',
    children,
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['t-alert', 't-alert--' + variant, className].filter(Boolean).join(' '),
    role: "status"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "ico"
  }, glyph || GLYPH[variant]), /*#__PURE__*/React.createElement("div", null, title ? /*#__PURE__*/React.createElement("p", {
    className: "t-alert__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("p", {
    className: "t-alert__body"
  }, children) : null));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox(props) {
  const {
    label,
    className = '',
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("label", {
    className: ['t-check', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox"
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "box"
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field(props) {
  const {
    label,
    required = false,
    help,
    error,
    htmlFor,
    className = '',
    children,
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['t-field', className].filter(Boolean).join(' ')
  }, rest), label ? /*#__PURE__*/React.createElement("label", {
    className: "t-label",
    htmlFor: htmlFor
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "req"
  }, "*") : null) : null, children, error ? /*#__PURE__*/React.createElement("span", {
    className: "t-error"
  }, error) : help ? /*#__PURE__*/React.createElement("span", {
    className: "t-help"
  }, help) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input(props) {
  const {
    prefix = null,
    suffix = null,
    invalid = false,
    className = '',
    ...rest
  } = props;
  const cls = ['t-input', prefix ? 'has-prefix' : '', suffix ? 'has-suffix' : '', invalid ? 'is-invalid' : '', className].filter(Boolean).join(' ');
  const input = /*#__PURE__*/React.createElement("input", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest));
  if (!prefix && !suffix) return input;
  return /*#__PURE__*/React.createElement("div", {
    className: "t-input-group"
  }, prefix ? /*#__PURE__*/React.createElement("span", {
    className: "prefix"
  }, prefix) : null, input, suffix ? /*#__PURE__*/React.createElement("span", {
    className: "suffix"
  }, suffix) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio(props) {
  const {
    label,
    className = '',
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("label", {
    className: ['t-check', 't-radio', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio"
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "box"
  }), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select(props) {
  const {
    options = null,
    invalid = false,
    className = '',
    children,
    ...rest
  } = props;
  const cls = ['t-select', invalid ? 'is-invalid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("select", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest), options ? options.map(o => /*#__PURE__*/React.createElement("option", {
    key: String(o.value),
    value: o.value
  }, o.label)) : children);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch(props) {
  const {
    label,
    className = '',
    ...rest
  } = props;
  return /*#__PURE__*/React.createElement("label", {
    className: ['t-switch', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch"
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "track"
  }), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea(props) {
  const {
    invalid = false,
    className = '',
    ...rest
  } = props;
  const cls = ['t-textarea', invalid ? 'is-invalid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("textarea", _extends({
    className: cls,
    "aria-invalid": invalid || undefined
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/icon/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = 'https://unpkg.com/lucide-static@latest/icons/';
const cache = new Map();

/* Lucide outline glyph, fetched once per name and inlined so `stroke:
   currentColor` inherits the parent's colour. Substitution: TigerAI's own
   sources ship no icon set — see readme.md → ICONOGRAPHY. */
function Icon(props) {
  const {
    name,
    size = 16,
    className = '',
    style = {},
    ...rest
  } = props;
  const [svg, setSvg] = React.useState(() => cache.get(name) || '');
  React.useEffect(() => {
    if (cache.has(name)) {
      setSvg(cache.get(name));
      return;
    }
    let alive = true;
    fetch(BASE + name + '.svg').then(r => r.ok ? r.text() : '').then(t => {
      const clean = t.replace(/<!--[\s\S]*?-->/g, '').trim().replace('<svg', '<svg style="width:100%;height:100%;display:block"');
      cache.set(name, clean);
      if (alive) setSvg(clean);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name]);
  const s = {
    display: 'inline-flex',
    width: size,
    height: size,
    flexShrink: 0,
    ...style
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true",
    className: className,
    style: s,
    dangerouslySetInnerHTML: {
      __html: svg
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icon/Icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/Console.jsx
try { (() => {
const {
  Button,
  Icon
} = window.TigerAIDesignSystem_0a5667;
const STATIONS = [{
  label: '對話',
  icon: 'message-square',
  guide: '先看員工每天用的——這一站已為你打開',
  anchor: ['13 部門 AI 同事', '員工每天用的那一面：問了就答、答了有出處'],
  xray: 'POST /v1/chat/completions → litellm-gateway → ollama · qwen3:32b（地端）',
  Pane: p => /*#__PURE__*/React.createElement(StationChat, p)
}, {
  label: '知識庫',
  icon: 'database',
  guide: '剛才答案的出處哪來的？點左邊的「知識庫」',
  anchor: ['Advanced RAG', '文件變成問得到答案的知識庫，不出機房'],
  xray: 'pgvector · 合約庫 index=625 chunks · top_k=6 · rerank=bge-m3',
  Pane: p => /*#__PURE__*/React.createElement(StationKnowledge, p)
}, {
  label: 'Workflow',
  icon: 'workflow',
  guide: '答案背後走了什麼流程？點「Workflow」',
  anchor: ['n8n 自動化', '看得見、改得動、過得了稽核的 SOP'],
  xray: 'n8n workflow #142 · trigger=webhook · 5 nodes · 平均 3.2s',
  Pane: p => /*#__PURE__*/React.createElement(StationWorkflow, p)
}, {
  label: '模型',
  icon: 'box',
  guide: '這些回答用哪顆腦？點「模型」',
  anchor: ['Ollama 模型管理', '開源模型隨裝隨換，不被供應商綁定'],
  xray: 'ollama pull qwen3:14b · 2 models resident · VRAM 28/48 GB',
  Pane: p => /*#__PURE__*/React.createElement(StationModels, p)
}, {
  label: '治理',
  icon: 'shield-check',
  guide: '錢會不會失控？點「治理」',
  anchor: ['LiteLLM 治理', '部門額度、即時花費、超標熔斷'],
  xray: 'litellm budgets · 3 teams · hard_limit=$300/mo · on_exceed=block',
  Pane: p => /*#__PURE__*/React.createElement(StationGovernance, p)
}, {
  label: '儀表板',
  icon: 'gauge',
  guide: '最後一站——機器本人。點「儀表板」',
  anchor: ['管理中心', '你的 GPU、你的機房，一頁掌握'],
  xray: 'node-exporter + dcgm · 17 targets up · scrape=15s',
  Pane: p => /*#__PURE__*/React.createElement(StationDashboard, p)
}];
function Console({
  onExpand,
  onComplete
}) {
  const reduced = React.useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [i, setI] = React.useState(0);
  const [seen, setSeen] = React.useState(() => new Set([0]));
  const [xray, setXray] = React.useState(false);
  const st = STATIONS[i];
  const done = seen.size === STATIONS.length;
  React.useEffect(() => {
    if (done && onComplete) onComplete();
  }, [done, onComplete]);
  const go = n => {
    setI(n);
    setSeen(s => new Set(s).add(n));
  };
  const next = STATIONS.findIndex((_, n) => !seen.has(n));
  return /*#__PURE__*/React.createElement("div", {
    className: "og"
  }, /*#__PURE__*/React.createElement("div", {
    className: "og__top"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/color-square-mark.svg",
    alt: "TigerAI"
  }), /*#__PURE__*/React.createElement("span", {
    className: "og__brand"
  }, "OpenGenie \u4E3B\u63A7\u53F0"), /*#__PURE__*/React.createElement("div", {
    className: "sp"
  }, /*#__PURE__*/React.createElement("button", {
    className: "og__kb"
  }, "\u77E5\u8B58\u5EAB\uFF1A\u5408\u7D04\u5EAB ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 12
  })), /*#__PURE__*/React.createElement("button", {
    className: "og__kb",
    onClick: () => setXray(v => !v),
    style: xray ? {
      background: 'var(--tiger-500)',
      color: 'var(--ink-900)',
      borderColor: 'var(--tiger-500)'
    } : null
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "scan-line",
    size: 12
  }), "\u770B\u5E95\u5C64"), onExpand && /*#__PURE__*/React.createElement("button", {
    className: "og__fs",
    onClick: onExpand
  }, "\u2922 \u5168\u87A2\u5E55\u9AD4\u9A57"), /*#__PURE__*/React.createElement("span", {
    className: "og__avatar"
  }, "M"))), /*#__PURE__*/React.createElement("div", {
    className: 'og__guide' + (done ? ' is-done' : '')
  }, done ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u516D\u7AD9\u901B\u5B8C\u4E86\u2014\u2014\u4F60\u5DF2\u7D93\u770B\u904E\u6574\u5957\u7522\u54C1\u3002"), /*#__PURE__*/React.createElement("span", {
    className: "acts"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary",
    style: {
      background: '#fff',
      color: 'var(--ink-900)',
      borderColor: '#fff'
    }
  }, "\u958B 30 \u5206\u9418\u771F\u6C99\u76D2"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline",
    style: {
      color: '#fff',
      borderColor: 'rgba(255,255,255,.7)'
    }
  }, "\u9810\u7D04\u5B8C\u6574 Demo"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, st.guide), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "\u5C0E\u89BD ", seen.size, "\uFF0F6"))), /*#__PURE__*/React.createElement("div", {
    className: "og__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "og__rail"
  }, STATIONS.map((s, n) => /*#__PURE__*/React.createElement("button", {
    key: s.label,
    onClick: () => go(n),
    className: ['og__st', n === i ? 'is-active' : '', seen.has(n) ? 'is-seen' : '', !done && n === next && n !== i ? 'is-next' : ''].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 20
  }), s.label))), /*#__PURE__*/React.createElement("div", {
    className: "og__main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "og__pane"
  }, xray && /*#__PURE__*/React.createElement("div", {
    className: "og-mono",
    style: {
      marginBottom: 'var(--space-4)',
      padding: '6px 10px',
      background: 'var(--ink-900)',
      color: 'var(--tiger-300)'
    }
  }, st.xray), React.createElement(st.Pane, {
    key: i,
    reduced
  })), /*#__PURE__*/React.createElement("div", {
    className: "og__anchor"
  }, "\u9019\u662F\u300C", /*#__PURE__*/React.createElement("b", null, st.anchor[0]), "\u300D\u30FB", st.anchor[1]))), /*#__PURE__*/React.createElement("div", {
    className: "og__foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "warn"
  }, "\u26A0 \u9AD4\u9A57\u74B0\u5883\u30FB\u6A21\u64EC\u8CC7\u6599"), /*#__PURE__*/React.createElement("a", {
    href: "#sandbox"
  }, "\u60F3\u8DD1\u771F\u7684\uFF1F\u7559\u4E0B Email \u958B\u901A 30 \u5206\u9418\u6C99\u76D2 \u2192")));
}
Object.assign(window, {
  Console,
  CONSOLE_STATIONS: STATIONS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/Console.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/StationsAsk.jsx
try { (() => {
const {
  Badge,
  Button,
  Input,
  Icon
} = window.TigerAIDesignSystem_0a5667;
const REPLY = '第 8.2 條付款期 90 天，超過貴司標準的 60 天上限，且未載明逾期利息。建議修訂後再送簽——條文出處在下方。';
function StationChat({
  reduced
}) {
  const [n, setN] = React.useState(reduced ? REPLY.length : 0);
  React.useEffect(() => {
    if (reduced) {
      setN(REPLY.length);
      return;
    }
    setN(0);
    const t = setInterval(() => setN(v => v >= REPLY.length ? (clearInterval(t), v) : v + 1), 28);
    return () => clearInterval(t);
  }, [reduced]);
  const done = n >= REPLY.length;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "og-model"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Qwen3-32B\u30FB\u8DD1\u5728\u4F60\u7684\u6A5F\u623F"), /*#__PURE__*/React.createElement("div", {
    className: "og-mono",
    style: {
      marginTop: 8
    }
  }, "\u56DE\u61C9\u4E0D\u7D93\u4EFB\u4F55\u96F2\u7AEF API"), /*#__PURE__*/React.createElement("div", {
    className: "og-msg me"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bubble"
  }, "\u4F9B\u61C9\u5546\u5408\u7D04\u7684\u4ED8\u6B3E\u689D\u4EF6\u6709\u98A8\u96AA\u55CE\uFF1F"), /*#__PURE__*/React.createElement("div", {
    className: "who me"
  }, "\u4F60")), /*#__PURE__*/React.createElement("div", {
    className: "og-msg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "who ai"
  }, "\u6CD5"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "bubble"
  }, REPLY.slice(0, n), !done && /*#__PURE__*/React.createElement("span", {
    className: "og-caret"
  })), done && /*#__PURE__*/React.createElement("div", {
    className: "og-cite"
  }, "\uD83D\uDCC4 \u4F9B\u61C9\u5546\u5408\u7D04\u8349\u7A3F\u30FB\u7B2C 8.2 \u689D\u300E\u4ED8\u6B3E\u689D\u4EF6\u300F"))), /*#__PURE__*/React.createElement("div", {
    className: "og-composer"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u554F\u554F\u4F60\u7684 AI \u540C\u4E8B\u22EF",
    readOnly: true
  }), /*#__PURE__*/React.createElement(Button, {
    iconOnly: true,
    "aria-label": "\u9001\u51FA",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-up",
      size: 16
    })
  })));
}
const DOCS = [['供應商合約草稿.pdf', '已索引・142 段・3 分鐘前', 'ok'], ['員工手冊 v3.2.docx', '已索引・387 段', 'ok'], ['產品保固政策.pdf', '已索引・96 段', 'ok'], ['2026 採購 SOP.xlsx', '索引中…', 'wip']];
function StationKnowledge({
  reduced
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "og-h"
  }, "\u5408\u7D04\u5EAB ", /*#__PURE__*/React.createElement("span", {
    className: "og-mono"
  }, "4 \u4EFD\u6587\u4EF6\u30FB625 \u6BB5")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 8
    }
  }, DOCS.map(([name, meta, state], i) => /*#__PURE__*/React.createElement("div", {
    className: "og-doc",
    key: name,
    style: {
      animationDelay: (reduced ? 0 : i * 180) + 'ms'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 16,
    style: {
      color: 'var(--fg-tertiary)'
    }
  }), /*#__PURE__*/React.createElement("span", null, name, /*#__PURE__*/React.createElement("span", {
    className: "meta",
    style: {
      marginLeft: 10
    }
  }, meta)), state === 'ok' ? /*#__PURE__*/React.createElement(Badge, {
    variant: "success",
    dot: true
  }, "\u5DF2\u7D22\u5F15") : /*#__PURE__*/React.createElement(Badge, {
    variant: "warning"
  }, "\u7D22\u5F15\u4E2D\u2026")))), /*#__PURE__*/React.createElement("div", {
    className: "og-drop"
  }, "\u62D6\u6A94\u6848\u9032\u4F86\u5C31\u80FD\u52A0\u5165\u2014\u2014\u525B\u624D\u7684\u51FA\u8655\u5C31\u5F9E\u7B2C\u4E00\u4EFD\u6587\u4EF6\u6AA2\u7D22\u800C\u4F86\u3002"));
}
const NODES = [['收到提問', '員工在對話視窗送出問題，n8n webhook 收件並帶上部門與權限。'], ['檢索合約庫', '向量檢索合約庫，取回相關條文段落與頁碼出處。'], ['條款比對', '把條文與貴司標準條件逐項比對，標出差異與風險等級。'], ['附出處回覆', '回覆一併附上出處段落，稽核時可回溯到原始文件。'], ['逾標開單', '超出標準的條款自動開單給法務主管，附比對結果。']];
function StationWorkflow({
  reduced
}) {
  const [lit, setLit] = React.useState(reduced ? NODES.length : 0);
  const [sel, setSel] = React.useState(null);
  React.useEffect(() => {
    if (reduced) {
      setLit(NODES.length);
      return;
    }
    setLit(0);
    const t = setInterval(() => setLit(v => v >= NODES.length ? (clearInterval(t), v) : v + 1), 520);
    return () => clearInterval(t);
  }, [reduced]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "og-h"
  }, "\u5408\u7D04\u98A8\u96AA\u5BE9\u95B1\u30FB\u81EA\u52D5\u5316\u6D41\u7A0B"), /*#__PURE__*/React.createElement("div", {
    className: "og-chain"
  }, NODES.map(([label], i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: label
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "og-arrow"
  }, "\u2192"), /*#__PURE__*/React.createElement("button", {
    className: ['og-node', i < lit ? 'is-lit' : '', sel === i ? 'is-sel' : ''].filter(Boolean).join(' '),
    onClick: () => setSel(sel === i ? null : i)
  }, /*#__PURE__*/React.createElement("span", {
    className: "idx"
  }, String(i + 1).padStart(2, '0')), label)))), /*#__PURE__*/React.createElement("div", {
    className: "og-step"
  }, sel === null ? '點任一節點看這一步做了什麼。' : NODES[sel][1]));
}
Object.assign(window, {
  StationChat,
  StationKnowledge,
  StationWorkflow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/StationsAsk.jsx", error: String((e && e.message) || e) }); }

// ui_kits/console/StationsOps.jsx
try { (() => {
const {
  Badge,
  Card,
  Stat,
  Alert,
  Icon
} = window.TigerAIDesignSystem_0a5667;
function useRamp(target, reduced, ms = 1800) {
  const [v, setV] = React.useState(reduced ? target : 0);
  React.useEffect(() => {
    if (reduced) {
      setV(target);
      return;
    }
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
function StationModels({
  reduced
}) {
  const pct = useRamp(100, reduced, 2600);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "og-h"
  }, "\u5DF2\u88DD\u6A21\u578B"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "success",
    dot: true
  }, "Qwen3-32B \u904B\u884C\u4E2D"), /*#__PURE__*/React.createElement(Badge, {
    variant: "default",
    dot: true
  }, "Llama-3.3-70B \u5F85\u547D")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-5)',
      maxWidth: 460
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "og-row",
    style: {
      gridTemplateColumns: '1fr auto'
    }
  }, /*#__PURE__*/React.createElement("span", null, pct < 100 ? '正在安裝 qwen3:14b' : 'qwen3:14b'), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    className: "og-bar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: pct + '%'
    }
  })), pct >= 100 && /*#__PURE__*/React.createElement("div", {
    className: "og-ok",
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "\u88DD\u597D\u4E86\u2014\u2014\u958B\u6E90\u6A21\u578B\u51FA\u65B0\u7248\u5C31\u63DB\uFF0C\u6388\u6B0A\u4E0D\u7528\u91CD\u7C3D\u3001\u8CC7\u6599\u4E0D\u7528\u642C\u5BB6\u3002")));
}
const QUOTA = [['人資部', 96], ['法務部', 144], ['客服部', 228]];
function StationGovernance({
  reduced
}) {
  const [go, setGo] = React.useState(reduced);
  React.useEffect(() => {
    if (reduced) {
      setGo(true);
      return;
    }
    setGo(false);
    const t = setTimeout(() => setGo(true), 120);
    return () => clearTimeout(t);
  }, [reduced]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "og-h"
  }, "\u90E8\u9580\u984D\u5EA6\u30FB\u672C\u6708"), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 520
    }
  }, QUOTA.map(([dept, used]) => {
    const p = used / 300 * 100;
    return /*#__PURE__*/React.createElement("div", {
      className: "og-row",
      key: dept
    }, /*#__PURE__*/React.createElement("span", null, dept), /*#__PURE__*/React.createElement("span", {
      className: "og-bar"
    }, /*#__PURE__*/React.createElement("i", {
      className: p > 70 ? 'warn' : '',
      style: {
        width: (go ? p : 0) + '%'
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "v"
    }, "$", used, "/$300"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "og-ok",
    style: {
      marginTop: 'var(--space-4)'
    }
  }, "\uD83D\uDEE1 \u6BCF\u500B\u90E8\u9580\u6709\u4E0A\u9650\uFF0C\u8D85\u6A19\u81EA\u52D5\u7194\u65B7\u2014\u2014Shadow AI \u7684\u9322\u5751\u5F9E\u9019\u88E1\u5835\u4F4F\u3002"));
}
function StationDashboard({
  reduced
}) {
  const g0 = useRamp(74, reduced),
    g1 = useRamp(52, reduced),
    cpu = useRamp(33, reduced);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "og-grid2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "og-gpu"
  }, /*#__PURE__*/React.createElement("h5", null, "GPU 0\u30FBRTX 4090"), /*#__PURE__*/React.createElement("div", {
    className: "og-bar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: g0 + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "og-mono",
    style: {
      marginTop: 8
    }
  }, "74%\u30FB66\xB0C\u30FBVRAM 18/24 GB")), /*#__PURE__*/React.createElement("div", {
    className: "og-gpu"
  }, /*#__PURE__*/React.createElement("h5", null, "GPU 1\u30FBRTX 4090"), /*#__PURE__*/React.createElement("div", {
    className: "og-bar"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: g1 + '%'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "og-mono",
    style: {
      marginTop: 8
    }
  }, "52%\u30FB58\xB0C\u30FBVRAM 10/24 GB"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "CPU i9-14900K",
    value: "32.5",
    unit: "%"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "\u8A18\u61B6\u9AD4",
    value: "38",
    unit: "/64 GB"
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "\u670D\u52D9\u76E3\u63A7",
    value: "17",
    unit: " \u9805",
    delta: "\u25B2 \u5168\u6578\u6B63\u5E38"
  })));
}
Object.assign(window, {
  StationModels,
  StationGovernance,
  StationDashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/console/StationsOps.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
const {
  Button,
  Badge,
  Icon
} = window.TigerAIDesignSystem_0a5667;
const NAV = [['產品', '#products'], ['課程', '#courses'], ['方法論', '#methodology'], ['案例', '#cases'], ['資源', '#resources'], ['關於', '#about']];
function SiteHeader() {
  const [fused, setFused] = React.useState(false);
  const [prog, setProg] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setFused(h.scrollTop > 40);
      setProg(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("header", {
    className: 'hdr' + (fused ? ' is-fused' : '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap hdr__in"
  }, /*#__PURE__*/React.createElement("a", {
    className: "hdr__logo",
    href: "#top"
  }, /*#__PURE__*/React.createElement("img", {
    src: '../../assets/logo/' + (fused ? 'color-horizontal-black-text.svg' : 'color-horizontal-white-text.svg'),
    alt: "TigerAI \u864E\u667A\u79D1\u6280"
  })), /*#__PURE__*/React.createElement("nav", null, NAV.map(([label, href]) => /*#__PURE__*/React.createElement("a", {
    key: href,
    href: href
  }, label))), /*#__PURE__*/React.createElement("div", {
    className: "hdr__cta"
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: fused ? 'default' : 'outline',
    style: fused ? null : {
      color: '#fff',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35)'
    },
    dot: true
  }, "\u6C99\u76D2 20 \u7D44\uFF0F\u65E5"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 14
    })
  }, "\u9810\u7D04 30 \u5206\u9418\u8AEE\u8A62"))), /*#__PURE__*/React.createElement("div", {
    className: "hdr__prog",
    style: {
      width: (prog * 100).toFixed(2) + '%'
    }
  }));
}
function HeroLaptop({
  onComplete
}) {
  const reduced = React.useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [open, setOpen] = React.useState(reduced);
  const [booted, setBooted] = React.useState(reduced);
  const [focus, setFocus] = React.useState(false);
  const [full, setFull] = React.useState(false);
  React.useEffect(() => {
    if (reduced) return;
    const a = setTimeout(() => setOpen(true), 600);
    const b = setTimeout(() => setBooted(true), 2300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduced]);
  React.useEffect(() => {
    if (!full) return;
    const esc = e => {
      if (e.key === 'Escape') setFull(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [full]);
  return /*#__PURE__*/React.createElement("section", {
    className: "hero",
    id: "top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero__head"
  }, /*#__PURE__*/React.createElement("h1", null, "\u4F60\u7684\u8CC7\u6599\u4E0D\u51FA\u6A5F\u623F\uFF0C", /*#__PURE__*/React.createElement("b", null, "\u6BCF\u500B\u90E8\u9580\u591A\u4E00\u4F4D AI \u540C\u4E8B\u3002")), /*#__PURE__*/React.createElement("p", {
    className: "hero__sub"
  }, "\u4E0D\u7528\u8A3B\u518A\u2014\u2014\u87A2\u5E55\u88E1\u5C31\u662F\u7522\u54C1\uFF0C\u9EDE\u958B\u770B\u770B\u3002")), /*#__PURE__*/React.createElement("div", {
    className: 'lap' + (open ? ' is-open' : '') + (focus ? ' is-focus' : ''),
    onPointerEnter: () => setFocus(true),
    onPointerLeave: () => setFocus(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "lap__lid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lap__mark"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/color-square-mark.svg",
    alt: "TigerAI",
    width: "72"
  })), /*#__PURE__*/React.createElement("div", {
    className: "lap__screen"
  }, !booted && /*#__PURE__*/React.createElement("div", {
    className: "lap__badge",
    style: {
      opacity: open ? 1 : 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/color-square-mark.svg",
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "lap__boot"
  }, /*#__PURE__*/React.createElement("i", null))), booted && !full && /*#__PURE__*/React.createElement(Console, {
    onExpand: () => setFull(true),
    onComplete: onComplete
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lap__base"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lap__foot"
  })), /*#__PURE__*/React.createElement("p", {
    className: "lap__hint"
  }, "\u87A2\u5E55\u88E1\u662F\u53EF\u4E92\u52D5\u7684\u6A21\u64EC\u4E3B\u63A7\u53F0\u30FB\u516D\u7AD9\u901B\u5B8C\u89E3\u9396\u6C99\u76D2\u5165\u53E3")), full && /*#__PURE__*/React.createElement("div", {
    className: "fs-overlay",
    onClick: e => {
      if (e.target === e.currentTarget) setFull(false);
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Console, {
    onComplete: onComplete
  })), /*#__PURE__*/React.createElement("div", {
    className: "fs-close"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setFull(false),
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 14
    })
  }, "\u95DC\u9589\u5168\u87A2\u5E55"))));
}
Object.assign(window, {
  SiteHeader,
  HeroLaptop
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SectionsEnd.jsx
try { (() => {
const {
  Button,
  Badge,
  Card,
  Stat,
  Icon,
  Field,
  Input
} = window.TigerAIDesignSystem_0a5667;
const COURSES = [['L1', 'AI 素養與 Shadow AI 風險', '半天・3 小時', '陳彥廷 · 臺科大資工所 / 虎智技術總監', '412 人'], ['L2', 'n8n 自動化入門：第一條流程', '2 天・12 小時', '林上恩 · n8n Taiwan Ambassador', '1,180 人'], ['L3', '地端 RAG 知識庫實作', '3 天・18 小時', '黃思穎 · 臺科大教授顧問群', '736 人'], ['L4', 'GPU 資源與模型治理', '2 天・12 小時', '吳定遠 · 虎智 GPU 服務架構師', '284 人']];
function CoursesSection() {
  return /*#__PURE__*/React.createElement("section", {
    className: "sec",
    id: "courses"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "\u8AB2\u7A0B\u30FB\u864E\u667A\u5B78\u7FD2\u4E2D\u5FC3"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "\u8AB2\u7A0B\u7167 L \u7D1A\u6392\uFF0C\u4E0D\u7167\u8B1B\u5E2B\u6392\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "\u6E2C\u8A55\u7D50\u679C\u76F4\u63A5\u5C0D\u61C9\u8AB2\u7A0B\u968E\u68AF\u3002\u591A\u6578\u8AB2\u7A0B\u53EF\u7533\u8ACB\u653F\u5E9C\u88DC\u52A9\uFF0C\u88DC\u52A9\u8CC7\u683C\u8207\u540D\u984D\u4EE5\u4E3B\u8FA6\u55AE\u4F4D\u516C\u544A\u70BA\u6E96\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "g4"
  }, COURSES.map(([lvl, name, hours, teacher, students]) => /*#__PURE__*/React.createElement(Card, {
    key: name,
    variant: "default",
    interactive: true,
    eyebrow: lvl + ' · ' + hours,
    title: name,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Badge, {
      variant: "success"
    }, "\u53EF\u7533\u8ACB\u88DC\u52A9"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--fg-tertiary)'
      }
    }, students, " \u5B8C\u8A13"))
  }, teacher))), /*#__PURE__*/React.createElement("div", {
    className: "ph",
    style: {
      marginTop: 'var(--space-4)'
    }
  }, "\u8AB2\u7A0B\u540D\u7A31\u3001\u6642\u6578\u3001\u8B1B\u5E2B\u8207\u50F9\u683C\u70BA\u7248\u578B\u793A\u610F \u2014 \u6B63\u5F0F\u6E05\u55AE\u5F85\u63D0\u4F9B\uFF08\u4EA4\u4ED8\u7E3D\u7DB1 \xA77-7\uFF09")));
}
const CGRADES = [['C1', '照著做', '能執行既有 SOP 與範本'], ['C2', '拆得開', '能把問題拆成可查證的小題'], ['C3', '接得起', '能把工具接成一條可跑的流程'], ['C4', '看得遠', '能預判風險與稽核缺口'], ['C5', '教得會', '能把方法交給客戶自己跑']];
function Methodology() {
  const [c, setC] = React.useState(2);
  return /*#__PURE__*/React.createElement("section", {
    className: "sec sec--ink",
    id: "methodology"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "\u9867\u554F\u8207\u65B9\u6CD5\u8AD6"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "\u5169\u628A\u5C3A\uFF1A\u5BA2\u6236\u91CF L\uFF0C\u9867\u554F\u91CF C\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "L1\u2013L5 \u662F\u5BA2\u6236\u7684 AI \u6210\u719F\u5EA6\uFF0C\u516C\u958B\u53EF\u6E2C\u3002C1\u2013C5 \u662F\u9867\u554F\u7684\u601D\u8003\u80FD\u529B\uFF0C\u4E0D\u505A\u516C\u958B\u6E2C\u9A57\u2014\u2014\u5B83\u6C7A\u5B9A\u4F60\u9047\u5230\u7684\u662F\u8AB0\u3002\u4E5D\u7DAD\u8207 L.A.O.S. \u662F\u80CC\u5F8C\u7684\u62C6\u984C\u6846\u67B6\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "g2",
    style: {
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 2
    }
  }, CGRADES.map(([g, t, d], i) => /*#__PURE__*/React.createElement("button", {
    key: g,
    onClick: () => setC(i),
    style: {
      display: 'grid',
      gridTemplateColumns: '48px 1fr',
      gap: 'var(--space-4)',
      alignItems: 'baseline',
      textAlign: 'left',
      padding: 'var(--space-4)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      background: c === i ? 'rgba(236,164,43,.12)' : 'transparent',
      border: '1px solid ' + (c === i ? 'var(--tiger-500)' : 'rgba(255,255,255,.12)'),
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-20)',
      fontWeight: 800,
      color: c === i ? 'var(--tiger-500)' : '#fff'
    }
  }, g), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 'var(--fs-16)'
    }
  }, t), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-13)',
      color: 'var(--ink-300)'
    }
  }, d))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Card, {
    variant: "feature",
    eyebrow: "L.A.O.S. \u62C6\u984C\u6846\u67B6",
    title: "Locate \xB7 Assess \xB7 Operate \xB7 Sustain"
  }, "\u5148\u5B9A\u4F4D\u75DB\u9EDE\u843D\u5728\u54EA\u500B\u90E8\u9580\u8207\u6D41\u7A0B\uFF0C\u518D\u8A55\u4F30\u8CC7\u6599\u8207\u8CC7\u5B89\u689D\u4EF6\uFF0C\u63A5\u8457\u628A\u6D41\u7A0B\u771F\u7684\u8DD1\u8D77\u4F86\uFF0C\u6700\u5F8C\u628A\u7DAD\u904B\u4EA4\u56DE\u5BA2\u6236\u624B\u4E0A\u3002\u4E5D\u7DAD\uFF08\u8CC7\u6599\uFF0F\u6D41\u7A0B\uFF0F\u4EBA\uFF0F\u6A21\u578B\uFF0F\u7B97\u529B\uFF0F\u6CBB\u7406\uFF0F\u6210\u672C\uFF0F\u7A3D\u6838\uFF0F\u8B8A\u9769\uFF09\u662F\u6BCF\u4E00\u6B65\u7684\u6AA2\u67E5\u8868\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "avatars"
  }, ['張', '李', '王', '陳', '林', '黃'].map(s => /*#__PURE__*/React.createElement("span", {
    className: "avatar",
    key: s
  }, s))), /*#__PURE__*/React.createElement("div", {
    className: "ph",
    style: {
      marginTop: 'var(--space-4)'
    }
  }, "\u9867\u554F\u982D\u50CF\u8207\u9732\u51FA\u540D\u55AE\u5F85\u63D0\u4F9B\uFF08\u4EA4\u4ED8\u7E3D\u7DB1 \xA77-4\uFF09")))));
}
const CASES = [['製造業・法務', '合約審閱', '96', '小時／月省下'], ['服務業・人資', '履歷初篩', '3', '秒完成（原半天）'], ['醫療周邊・客服', '首回時間', '72', '% 縮短']];
function CasesPartners() {
  return /*#__PURE__*/React.createElement("section", {
    className: "sec",
    id: "cases"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "\u6848\u4F8B\u8207\u5925\u4F34"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "\u53EA\u8B1B\u6A21\u5F0F\uFF0C\u4E0D\u8B1B\u5BA2\u6236\u6A5F\u5BC6\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "\u6BCF\u500B\u6848\u4F8B\u90FD\u5E36\u6578\u5B57\u3002\u5F62\u5BB9\u8A5E\u4E0D\u7B97\u8B49\u64DA\u2014\u2014\u9019\u662F\u864E\u667A\u7684\u8B49\u8A00\u9435\u5F8B\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "g3"
  }, CASES.map(([who, what, num, unit]) => /*#__PURE__*/React.createElement(Card, {
    key: who,
    variant: "elevated",
    eyebrow: who,
    title: what
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--fs-60)',
      fontWeight: 800,
      letterSpacing: 'var(--tracking-tight)',
      lineHeight: 1
    }
  }, num), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-14)',
      color: 'var(--fg-secondary)'
    }
  }, unit))))), /*#__PURE__*/React.createElement("div", {
    className: "g4",
    style: {
      marginTop: 'var(--space-6)'
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    className: "ph",
    key: i
  }, "\u5925\u4F34 logo ", i, /*#__PURE__*/React.createElement("br", null), "\u5F85\u63D0\u4F9B\uFF08\xA77-3\uFF09")))));
}
function ClosingCTA() {
  return /*#__PURE__*/React.createElement("section", {
    className: "cta-band",
    id: "contact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap g2",
    style: {
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", null, "\u9810\u7D04 30 \u5206\u9418\u8AEE\u8A62\u3002"), /*#__PURE__*/React.createElement("p", null, "\u5E36\u8457\u4F60\u6700\u75DB\u7684\u90A3\u500B\u90E8\u9580\u4F86\u3002\u6211\u5011\u6703\u544A\u8A34\u4F60\u9019\u4EF6\u4E8B\u8A72\u7528\u54EA\u4E00\u968E\u3001\u8981\u591A\u5C11\u7B97\u529B\u3001\u8CC7\u6599\u600E\u9EBC\u7559\u5728\u6A5F\u623F\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "xl",
    variant: "secondary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 18
    })
  }, "\u9810\u7D04 30 \u5206\u9418\u8AEE\u8A62"), /*#__PURE__*/React.createElement(Button, {
    size: "xl",
    variant: "outline"
  }, "\u5148\u958B 30 \u5206\u9418\u6C99\u76D2"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-surface)',
      padding: 'var(--space-6)',
      display: 'grid',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u516C\u53F8\u4FE1\u7BB1",
    required: true,
    help: "\u9001\u51FA\u5F8C\u7531\u9867\u554F\u65BC\u4E00\u500B\u5DE5\u4F5C\u65E5\u5167\u56DE\u8986"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "name@company.com"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u6700\u60F3\u89E3\u6C7A\u7684\u90E8\u9580"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u4F8B\u5982\uFF1A\u6CD5\u52D9\u5408\u7D04\u5BE9\u95B1\u4E00\u4EFD\u8981 3 \u5929"
  })), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true
  }, "\u9001\u51FA\u8A55\u4F30\u9700\u6C42"))));
}
const FCOLS = [['站內導覽', ['產品：三個入口', '課程 L1–L5', '顧問與方法論', '案例', '關於虎智']], ['免費資源', ['n8n 中文課程庫', 'Workflow 模板下載', '免費影片牆', 'OpenGenie GitHub']], ['開始體驗', ['5 分鐘 L 級測評', '開 30 分鐘沙盒', '預約 30 分鐘諮詢']]];
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "ftr"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ftr__cols"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/color-horizontal-white-text.svg",
    alt: "TigerAI \u864E\u667A\u79D1\u6280",
    style: {
      height: 34
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: '32ch',
      marginTop: 'var(--space-4)',
      color: 'var(--ink-400)',
      fontSize: 'var(--fs-13)',
      lineHeight: 'var(--lh-relaxed)'
    }
  }, "\u958B\u6E90\u5730\u7AEF AI \xD7 \u53EF\u9A57\u8B49\u7684\u80FD\u529B\u990A\u6210\u3002\u7D93\u6821\u5167\u5275\u696D\u6BD4\u8CFD\u7B2C\u4E00\u540D\uFF0C\u7531\u81FA\u79D1\u5927\u5091\u51FA\u6821\u53CB\u806F\u8ABC\u6703\u651C\u624B\u5275\u65B0\u80B2\u6210\u4E2D\u5FC3\u6295\u8CC7\u6210\u7ACB\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexWrap: 'wrap',
      marginTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "brand"
  }, "n8n Ambassador"), /*#__PURE__*/React.createElement(Badge, {
    variant: "brand"
  }, "AMD"), /*#__PURE__*/React.createElement(Badge, {
    variant: "brand"
  }, "\u81FA\u79D1\u5927\u80B2\u6210"))), FCOLS.map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("h5", null, h), /*#__PURE__*/React.createElement("ul", null, items.map(t => /*#__PURE__*/React.createElement("li", {
    key: t
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top"
  }, t))))))), /*#__PURE__*/React.createElement("div", {
    className: "ftr__bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 \u864E\u667A\u79D1\u6280\u80A1\u4EFD\u6709\u9650\u516C\u53F8 TigerAI \xB7 \u958B\u6E90\u5730\u7AEF AI"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top"
  }, "\u96B1\u79C1\u6B0A\u653F\u7B56"), /*#__PURE__*/React.createElement("a", {
    href: "#top"
  }, "\u670D\u52D9\u689D\u6B3E"), /*#__PURE__*/React.createElement("a", {
    href: "#sandbox"
  }, "\u6C99\u76D2\u5165\u53E3 \u2192")))));
}
Object.assign(window, {
  CoursesSection,
  Methodology,
  CasesPartners,
  ClosingCTA,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SectionsEnd.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SectionsTop.jsx
try { (() => {
const {
  Button,
  Badge,
  Card,
  Stat,
  Icon
} = window.TigerAIDesignSystem_0a5667;
const TRUST = [['166+', '企業導入'], ['4,085+', '學員完訓'], ['13', '部門 AI 同事範本']];
const CREDS = ['n8n Taiwan Ambassador', 'AMD 合作夥伴', '臺科大創新育成中心投資'];
function TrustBand() {
  return /*#__PURE__*/React.createElement("section", {
    className: "trust"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap trust__in"
  }, TRUST.map(([n, l], i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "trust__sep"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trust__item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "trust__num"
  }, n), /*#__PURE__*/React.createElement("span", {
    className: "trust__lbl"
  }, l)))), /*#__PURE__*/React.createElement("span", {
    className: "trust__sep"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, CREDS.map(c => /*#__PURE__*/React.createElement(Badge, {
    key: c,
    variant: "brand"
  }, c)))));
}
const SHADOW = [['01', '業務自己刷卡訂 ChatGPT Plus', '客戶名單、報價單貼進雲端對話框。公司拿不到紀錄，離職了也帶不回來。', '$20 ／人／月'], ['02', '行銷用免費版改標案', '未公開的標案內容離開機房，沒有任何稽核軌跡可以交代。', '$0 · 風險無上限'], ['03', '工程師各自接 API', '金鑰散落在個人專案與筆電，沒人知道哪一把還活著。', '$300+ ／月／人'], ['04', '主管不知道公司到底花多少', '帳單分散在 12 張個人信用卡，報帳名目寫「軟體訂閱」。', '總額不明']];
const CMP = [['資料位置', '雲端供應商機房', '你的機櫃，不出機房'], ['每月成本', '按人頭訂閱、隨用量上漲', '硬體一次投入、用量不加價'], ['稽核紀錄', '散落在個人帳號', '每次問答留出處與紀錄'], ['模型更換', '綁定供應商版本', '開源模型隨裝隨換'], ['離職風險', '對話與知識隨人離開', '知識庫留在公司']];
function StanceSection() {
  const [active, setActive] = React.useState(0);
  const refs = React.useRef([]);
  React.useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(Number(e.target.dataset.i));
      });
    }, {
      rootMargin: '-45% 0px -45% 0px'
    });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return /*#__PURE__*/React.createElement("section", {
    className: "sec sec--ink",
    id: "stance"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap stance"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stance__left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "\u7ACB\u5834\u5BA3\u8A00"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "Shadow AI Spend", /*#__PURE__*/React.createElement("br", null), "\u4E0D\u662F\u5C0E\u5165\u597D\u96E3\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u662F\u9322\u548C\u8CC7\u6599\u4E00\u8D77\u6D41\u51FA\u53BB\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "\u54E1\u5DE5\u5DF2\u7D93\u5728\u7528 AI \u4E86\uFF0C\u53EA\u662F\u5237\u81EA\u5DF1\u7684\u5361\u3001\u7528\u516C\u53F8\u7684\u8CC7\u6599\u3002\u4F60\u4ED8\u4E86\u9322\uFF0C\u537B\u6C92\u6709\u7D00\u9304\u3001\u6C92\u6709\u8CC7\u7522\u3001\u6C92\u6709\u7A3D\u6838\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "stance__count"
  }, String(active + 1).padStart(2, '0'), " \uFF0F 0", SHADOW.length + 1), /*#__PURE__*/React.createElement("div", {
    className: "stance__ticks"
  }, SHADOW.concat([['05']]).map((_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: i <= active ? 'on' : ''
  })))), /*#__PURE__*/React.createElement("div", null, SHADOW.map(([k, h, p, cost], i) => /*#__PURE__*/React.createElement("div", {
    className: "stance__panel",
    key: k,
    "data-i": i,
    ref: el => refs.current[i] = el
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Shadow AI \xB7 ", k), /*#__PURE__*/React.createElement("h4", null, h), /*#__PURE__*/React.createElement("p", null, p), /*#__PURE__*/React.createElement("span", {
    className: "cost"
  }, cost))), /*#__PURE__*/React.createElement("div", {
    className: "stance__panel",
    "data-i": SHADOW.length,
    ref: el => refs.current[SHADOW.length] = el
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "\u5C0D\u7167\u8868 \xB7 05"), /*#__PURE__*/React.createElement("h4", null, "\u96F2\u7AEF\u8A02\u95B1 \u27F7 \u5730\u7AEF\u958B\u6E90"), /*#__PURE__*/React.createElement("table", {
    className: "cmp"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", null, "\u96F2\u7AEF\u8A02\u95B1"), /*#__PURE__*/React.createElement("th", null, "\u5730\u7AEF\u958B\u6E90\uFF08TigerAI\uFF09"))), /*#__PURE__*/React.createElement("tbody", null, CMP.map(([k, a, b]) => /*#__PURE__*/React.createElement("tr", {
    key: k
  }, /*#__PURE__*/React.createElement("th", {
    scope: "row"
  }, k), /*#__PURE__*/React.createElement("td", {
    className: "bad"
  }, a), /*#__PURE__*/React.createElement("td", {
    className: "good"
  }, b)))))))));
}
const DOORS = [['給老闆', '看得到錢與風險', ['每個部門的 AI 花費與上限', '資料留在機房的稽核證據', '導入前後的工時對照'], 'circle-dollar-sign'], ['給主管', '看得到部門產出', ['13 部門 AI 同事範本', '知識庫問答有出處可回溯', '流程改了誰都看得見'], 'users'], ['給工程師', '看得到底層與可改動', ['Ollama 模型隨裝隨換', 'n8n 流程節點自己改', 'LiteLLM 額度與熔斷設定'], 'terminal']];
function ProductEntry() {
  const [on, setOn] = React.useState(0);
  return /*#__PURE__*/React.createElement("section", {
    className: "sec",
    id: "products"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "\u7522\u54C1\u5165\u53E3"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "\u540C\u4E00\u5957\u7CFB\u7D71\uFF0C\u4E09\u500B\u5165\u53E3\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "Local GPT \u786C\u9AD4\u3001AI \u670D\u52D9\u555F\u52D5\u3001GPU \u670D\u52D9\u5668\u8CC7\u6E90\u7BA1\u7406\u662F\u4E00\u5957\u6771\u897F\u7684\u4E09\u500B\u9762\u5411\u3002\u4F60\u5F9E\u54EA\u500B\u89D2\u8272\u9032\u4F86\uFF0C\u770B\u5230\u7684\u5C31\u662F\u4F60\u95DC\u5FC3\u7684\u90A3\u4E00\u9762\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "g3"
  }, DOORS.map(([who, what, items, icon], i) => /*#__PURE__*/React.createElement("div", {
    key: who,
    className: 'door' + (on === i ? ' is-on' : ''),
    onClick: () => setOn(i)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: on === i ? 'var(--tiger-600)' : 'var(--fg-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 24
  })), /*#__PURE__*/React.createElement("span", {
    className: "door__who"
  }, who), /*#__PURE__*/React.createElement("span", {
    className: "door__what"
  }, what), /*#__PURE__*/React.createElement("ul", null, items.map(t => /*#__PURE__*/React.createElement("li", {
    key: t
  }, t))), /*#__PURE__*/React.createElement(Button, {
    variant: on === i ? 'primary' : 'outline',
    size: "sm",
    style: {
      marginTop: 'auto',
      alignSelf: 'flex-start'
    }
  }, "\u9032\u5165 ", who.replace('給', ''), "\u7684\u5165\u53E3 \u2192"))))));
}
const FLOWS = [['合約風險審閱', '法務部', '月省 96 小時', ['收到提問', '檢索合約庫', '條款比對', '附出處回覆', '逾標開單']], ['應徵者履歷初篩', '人資部', '半天 → 3 秒', ['收到履歷', '抽取關鍵資格', '對照職務條件', '產生初篩摘要', '通知用人主管']], ['客服 FAQ 自動回覆', '客服部', '首回時間 −72%', ['收到來信', '分類意圖', '檢索保固政策', '草擬回覆', '轉真人覆核']]];
function WorkflowShowcase() {
  const [openIdx, setOpenIdx] = React.useState(0);
  return /*#__PURE__*/React.createElement("section", {
    className: "sec sec--tight",
    id: "resources",
    style: {
      background: 'var(--bg-sunken)',
      borderBlock: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Workflow \u5C55\u793A\u6AC3"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "\u770B\u5F97\u898B\u3001\u6539\u5F97\u52D5\u3001\u904E\u5F97\u4E86\u7A3D\u6838\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "\u6BCF\u4E00\u689D\u6D41\u7A0B\u90FD\u662F\u771F\u7684\u5728\u5BA2\u6236\u6A5F\u623F\u8DD1\u7684\u7BC0\u9EDE\u93C8\u3002\u9EDE\u958B\u770B\u6BCF\u4E00\u6B65\u505A\u4EC0\u9EBC\uFF0C\u7559 Email \u5C31\u80FD\u4E0B\u8F09\u6A21\u677F JSON\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "g3"
  }, FLOWS.map(([name, dept, gain, nodes], i) => /*#__PURE__*/React.createElement(Card, {
    key: name,
    variant: openIdx === i ? 'elevated' : 'default',
    interactive: true,
    onClick: () => setOpenIdx(i),
    eyebrow: dept,
    title: name,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Badge, {
      variant: "success"
    }, gain), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: openIdx === i ? 'primary' : 'outline'
    }, "\u4E0B\u8F09\u6A21\u677F"))
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      gap: 6
    }
  }, nodes.map((n, k) => /*#__PURE__*/React.createElement("span", {
    key: n,
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      fontSize: 'var(--fs-13)',
      opacity: openIdx === i ? 1 : .6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--fg-tertiary)'
    }
  }, String(k + 1).padStart(2, '0')), n))))))));
}
const LEVELS = [['L1', '認知'], ['L2', '試用'], ['L3', '導入'], ['L4', '規模化'], ['L5', '自主營運']];
function AssessmentEntry() {
  const [pick, setPick] = React.useState(1);
  return /*#__PURE__*/React.createElement("section", {
    className: "sec",
    id: "assessment"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wrap g2",
    style: {
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "\u6210\u719F\u5EA6\u6E2C\u8A55"), /*#__PURE__*/React.createElement("h2", {
    className: "title"
  }, "5 \u5206\u9418\u6E2C\u4F60\u5728 L \u5E7E\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "lede"
  }, "L1\u2013L5 \u662F\u5168\u7AD9\u7684\u810A\u690E\uFF1A\u6E2C\u8A55\u7D50\u679C\u6C7A\u5B9A\u4F60\u8A72\u4E0A\u54EA\u4E00\u968E\u8AB2\u7A0B\u3001\u5148\u5C0E\u5165\u54EA\u4E00\u6BB5\u6D41\u7A0B\u3002\u6E2C\u8A55\u7531\u5354\u6703\u54C1\u724C AX Academy \u63D0\u4F9B\uFF0C\u4E2D\u7ACB\u8A3A\u65B7\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "clipboard-check",
      size: 16
    })
  }, "\u958B\u59CB\u6E2C\u8A55\uFF08\u514D\u8CBB\uFF09"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "outline"
  }, "\u770B\u8001\u95C6\u5100\u8868\u677F\u7BC4\u4F8B"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "ladder"
  }, LEVELS.map(([l, n], i) => /*#__PURE__*/React.createElement("div", {
    key: l,
    className: i <= pick ? 'on' : '',
    onMouseEnter: () => setPick(i)
  }, /*#__PURE__*/React.createElement("b", null, l), /*#__PURE__*/React.createElement("span", null, n)))), /*#__PURE__*/React.createElement(Card, {
    variant: "accent",
    eyebrow: '你選了 ' + LEVELS[pick][0],
    title: '典型狀況：' + LEVELS[pick][1]
  }, ['部門主管聽過 AI，還沒有人負責。先看 13 部門範本，挑一個最痛的開始。', '有人在用免費版，資料已經在往外流。先把 Shadow AI 收攏成一套地端環境。', '第一條流程上線了，但只有一個部門在用。把知識庫與額度治理補齊。', '三個以上部門在跑，開始要管成本與稽核。GPU 排程與 LiteLLM 額度上場。', '公司自己養得起流程與模型更新。TigerAI 退到顧問位，你自己開下一條線。'][pick]))));
}
Object.assign(window, {
  TrustBand,
  StanceSection,
  ProductEntry,
  WorkflowShowcase,
  AssessmentEntry
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SectionsTop.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Site.jsx
try { (() => {
const {
  Button,
  Icon
} = window.TigerAIDesignSystem_0a5667;
const STOPS = [['#top', 'Hero・筆電開機'], ['#trust', '信任帶'], ['#stance', '立場宣言'], ['#products', '產品入口'], ['#resources', 'Workflow 展示櫃'], ['#assessment', '測評入口'], ['#courses', '課程'], ['#methodology', '顧問與方法論'], ['#cases', '案例與夥伴'], ['#contact', '收尾 CTA'], ['#footer', 'Footer']];
function TourFab() {
  const [on, setOn] = React.useState(false);
  const [i, setI] = React.useState(0);
  const go = n => {
    const idx = Math.max(0, Math.min(STOPS.length - 1, n));
    setI(idx);
    const el = document.querySelector(STOPS[idx][0]);
    if (el) window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 70,
      behavior: 'smooth'
    });
  };
  if (!on) {
    return /*#__PURE__*/React.createElement("div", {
      className: "tour-fab"
    }, /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      onClick: () => {
        setOn(true);
        go(0);
      },
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "route",
        size: 16
      })
    }, "\u5E36\u6211\u901B"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "tour-fab",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      background: 'var(--ink-900)',
      color: '#fff',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-xl)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-12)',
      color: 'var(--tiger-500)'
    }
  }, String(i + 1).padStart(2, '0'), "\uFF0F11"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-14)',
      fontWeight: 600
    }
  }, STOPS[i][1]), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    style: {
      color: '#fff'
    },
    onClick: () => go(i - 1),
    iconOnly: true,
    "aria-label": "\u4E0A\u4E00\u7AD9",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-left",
      size: 16
    })
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => go(i + 1)
  }, "\u4E0B\u4E00\u7AD9"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    style: {
      color: 'var(--ink-400)'
    },
    onClick: () => setOn(false),
    iconOnly: true,
    "aria-label": "\u7D50\u675F\u5C0E\u89BD",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 16
    })
  }));
}
function Site() {
  const [consoleDone, setConsoleDone] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SiteHeader, null), /*#__PURE__*/React.createElement(HeroLaptop, {
    onComplete: () => setConsoleDone(true)
  }), /*#__PURE__*/React.createElement("div", {
    id: "trust"
  }, /*#__PURE__*/React.createElement(TrustBand, null)), /*#__PURE__*/React.createElement(StanceSection, null), /*#__PURE__*/React.createElement(ProductEntry, null), /*#__PURE__*/React.createElement(WorkflowShowcase, null), /*#__PURE__*/React.createElement(AssessmentEntry, null), /*#__PURE__*/React.createElement(CoursesSection, null), /*#__PURE__*/React.createElement(Methodology, null), /*#__PURE__*/React.createElement(CasesPartners, null), /*#__PURE__*/React.createElement(ClosingCTA, null), /*#__PURE__*/React.createElement("div", {
    id: "footer"
  }, /*#__PURE__*/React.createElement(SiteFooter, null)), /*#__PURE__*/React.createElement(TourFab, null), consoleDone && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      left: 'var(--space-5)',
      bottom: 'var(--space-5)',
      zIndex: 'var(--z-sticky)',
      background: 'var(--success-500)',
      color: '#fff',
      padding: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--fs-13)',
      fontWeight: 600,
      boxShadow: 'var(--shadow-lg)'
    }
  }, "\u516D\u7AD9\u901B\u5B8C\u4E86 \u2014 \u6C99\u76D2\u5165\u53E3\u5DF2\u89E3\u9396 \u2193"));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Site, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Site.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.ButtonGroup = __ds_scope.ButtonGroup;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Icon = __ds_scope.Icon;

})();
