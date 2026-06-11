/* @ds-bundle: {"format":3,"namespace":"McDermottDesignSystem_b80d20","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"9cfd202b6fcf","components/core/Badge.jsx":"b3710b56b045","components/core/Button.jsx":"3efc0403b1a4","components/core/Card.jsx":"c325376ce0e3","components/core/IconButton.jsx":"429bc4732182","components/feedback/Alert.jsx":"44584a1f1133","components/feedback/Modal.jsx":"1de01d74789d","components/feedback/Toast.jsx":"744eeac7f169","components/forms/Checkbox.jsx":"54813b0c429e","components/forms/Input.jsx":"8cf9e5194197","components/forms/Select.jsx":"cefaddb7e953","components/forms/Switch.jsx":"2b9f11b3586a","components/navigation/Breadcrumb.jsx":"6d8388c03530","components/navigation/Tabs.jsx":"8734ae3e46f0","ui_kits/deposition-summarizer/AppShell.jsx":"8bb97c8ea7ba","ui_kits/deposition-summarizer/LoginScreen.jsx":"00bf204b2218","ui_kits/deposition-summarizer/MattersScreen.jsx":"8b6f9631731b","ui_kits/deposition-summarizer/SummaryScreen.jsx":"0f1d18553e8b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.McDermottDesignSystem_b80d20 = window.McDermottDesignSystem_b80d20 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; flex-shrink: 0; overflow: hidden;
  background: var(--color-navy); color: var(--color-white);
  font-family: var(--font-sans); font-weight: 600; line-height: 1;
  user-select: none;
}
[data-theme="dark"] .mws-avatar { background: var(--color-teal); color: var(--color-navy); }
.mws-avatar img { width: 100%; height: 100%; object-fit: cover; }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'avatar');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const SIZES = {
  sm: 28,
  md: 36,
  lg: 48
};
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

/**
 * Avatar — circular user mark; shows an image or falls back to initials.
 */
function Avatar({
  name = '',
  src,
  size = 'md',
  className = '',
  ...rest
}) {
  ensureStyles();
  const px = SIZES[size] || SIZES.md;
  const classes = ['mws-avatar', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes,
    style: {
      width: px,
      height: px,
      fontSize: Math.round(px * 0.4)
    },
    role: "img",
    "aria-label": name
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: ""
  }) : initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-badge {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans); font-size: 12px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.05em;
  white-space: nowrap;
}
.mws-badge__dot { width: 6px; height: 6px; border-radius: 999px; flex-shrink: 0; }
/* Pale fills — text always navy (theme-stable) */
.mws-badge--live { background: var(--color-pale-success); color: var(--color-navy); }
.mws-badge--live .mws-badge__dot { background: var(--color-success); }
.mws-badge--pending { background: var(--color-pale-gold); color: var(--color-navy); }
.mws-badge--failed { background: var(--color-pale-orange); color: var(--color-navy); }
.mws-badge--info { background: var(--color-pale-blue); color: var(--color-navy); }
/* Outline variants — theme-aware */
.mws-badge--draft { background: transparent; border: 1px solid var(--border-light); color: var(--text-primary); }
.mws-badge--archived { background: transparent; border: 1px solid var(--border-light); color: var(--text-secondary); }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'badge');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const DOT_STATUSES = ['live'];

/**
 * Badge — status pill. Pale fills by default, never saturated alert colors.
 */
function Badge({
  status = 'draft',
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const classes = ['mws-badge', `mws-badge--${status}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), DOT_STATUSES.includes(status) ? /*#__PURE__*/React.createElement("span", {
    className: "mws-badge__dot",
    "aria-hidden": "true"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-btn {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 140px;
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
  user-select: none;
}
.mws-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
.mws-btn i { font-size: 16px; line-height: 1; }
.mws-btn--sm { height: 30px; min-width: 0; font-size: 13px; padding: 0 var(--space-3); }

/* Primary */
.mws-btn--primary { background: var(--accent-interactive); color: var(--color-white); }
[data-theme="dark"] .mws-btn--primary { color: var(--color-navy); }
.mws-btn--primary:hover { background: var(--color-navy); color: var(--color-white); }
[data-theme="dark"] .mws-btn--primary:hover { background: var(--color-white); color: var(--color-navy); }
.mws-btn--primary:active { filter: brightness(0.92); }

/* Secondary */
.mws-btn--secondary { background: var(--bg-surface); border-color: var(--border-button); color: var(--text-primary); }
[data-theme="dark"] .mws-btn--secondary { background: transparent; }
.mws-btn--secondary:hover { background: var(--color-navy); color: var(--color-white); border-color: var(--color-navy); }
[data-theme="dark"] .mws-btn--secondary:hover { background: var(--color-teal); color: var(--color-navy); border-color: var(--color-teal); }

/* Destructive — does NOT hover-flip, just darkens */
.mws-btn--destructive { background: var(--color-error); color: var(--color-navy); }
.mws-btn--destructive:hover { background: #E62929; color: var(--color-navy); }

.mws-btn:disabled, .mws-btn[aria-disabled="true"] { opacity: 0.4; pointer-events: none; cursor: not-allowed; }

.mws-btn__spinner {
  width: 16px; height: 16px; border-radius: 999px;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: mws-btn-spin 0.7s linear infinite;
}
@keyframes mws-btn-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .mws-btn__spinner { animation-duration: 0.01ms; } }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'button');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Button — McDermott primary/secondary/destructive button.
 * ALL CAPS label, 2px radius, never wraps. Hover flips primary & secondary.
 */
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const classes = ['mws-btn', `mws-btn--${variant}`, size === 'sm' ? 'mws-btn--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: classes,
    disabled: disabled || loading
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "mws-btn__spinner",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, icon ? /*#__PURE__*/React.createElement("i", {
    className: `ph ph-${icon}`,
    "aria-hidden": "true"
  }) : null, children));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
  transition: transform var(--transition), box-shadow var(--transition);
  display: flex; flex-direction: column;
}
.mws-card--interactive { cursor: pointer; }
.mws-card--interactive:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.mws-card--interactive:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.mws-card__stroke { height: 30px; width: 100%; flex-shrink: 0; }
.mws-card__body { padding: var(--space-5); }
.mws-card__eyebrow {
  font-family: var(--font-sans); font-weight: 300; font-size: 13px;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-secondary); margin: 0 0 var(--space-2);
}
.mws-card__title {
  font-family: var(--font-mix); font-weight: 400; font-size: 24px; line-height: 1.2;
  color: var(--text-primary); margin: 0 0 var(--space-3);
}
.mws-card__text {
  font-family: var(--font-sans); font-weight: 300; font-size: 16px; line-height: 1.5;
  color: var(--text-secondary); margin: 0;
}
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'card');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const STROKE_COLORS = {
  magenta: 'var(--color-magenta)',
  orange: 'var(--color-orange)',
  gold: 'var(--color-gold)',
  teal: 'var(--color-teal)',
  blue: 'var(--color-blue)'
};

/**
 * Card — surface container with optional top stroke, eyebrow, title and body.
 */
function Card({
  eyebrow,
  title,
  topStroke,
  interactive = false,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const classes = ['mws-card', interactive ? 'mws-card--interactive' : '', className].filter(Boolean).join(' ');
  const interactiveProps = interactive ? {
    tabIndex: 0,
    role: 'button'
  } : {};
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, interactiveProps, rest), topStroke ? /*#__PURE__*/React.createElement("div", {
    className: "mws-card__stroke",
    style: {
      background: STROKE_COLORS[topStroke] || topStroke
    },
    "aria-hidden": "true"
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: "mws-card__body"
  }, eyebrow ? /*#__PURE__*/React.createElement("p", {
    className: "mws-card__eyebrow"
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("h3", {
    className: "mws-card__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "mws-card__text"
  }, children) : null));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: var(--radius);
  border: 1px solid transparent;
  background: transparent;
  color: var(--icon-default);
  cursor: pointer;
  transition: background var(--transition), color var(--transition), border-color var(--transition);
}
.mws-iconbtn:hover { background: var(--color-navy-gray-1); color: var(--color-navy); }
[data-theme="dark"] .mws-iconbtn:hover { background: var(--border-light); color: var(--color-white); }
.mws-iconbtn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.mws-iconbtn:disabled { opacity: 0.4; pointer-events: none; }
.mws-iconbtn i { font-size: 20px; line-height: 1; }
.mws-iconbtn--bordered { border-color: var(--border-button); }
.mws-iconbtn--sm { width: 30px; height: 30px; }
.mws-iconbtn--sm i { font-size: 16px; }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'iconbutton');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * IconButton — square icon-only control. Requires an aria-label.
 */
function IconButton({
  icon,
  size = 'md',
  bordered = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  const classes = ['mws-iconbtn', bordered ? 'mws-iconbtn--bordered' : '', size === 'sm' ? 'mws-iconbtn--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: `ph ph-${icon}`,
    "aria-hidden": "true"
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-alert {
  display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-4);
  border-left: 4px solid; border-radius: var(--radius);
  color: var(--color-navy);
  font-family: var(--font-sans);
}
.mws-alert i.mws-alert__icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; color: var(--color-navy); }
.mws-alert__body { flex: 1; min-width: 0; }
.mws-alert__title { font-weight: 600; font-size: 15px; margin: 0 0 2px; }
.mws-alert__text { font-size: 14px; line-height: 1.5; margin: 0; }
.mws-alert--info { background: var(--color-pale-blue); border-color: var(--color-blue); }
.mws-alert--success { background: var(--color-pale-success); border-color: var(--color-success); }
.mws-alert--warning { background: var(--color-pale-gold); border-color: var(--color-warning); }
.mws-alert--error { background: var(--color-pale-orange); border-color: var(--color-error); }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'alert');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const ICONS = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning-circle',
  error: 'x-circle'
};

/**
 * Alert — inline message. Pale fill + accent left border + navy text + icon.
 */
function Alert({
  severity = 'info',
  title,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['mws-alert', `mws-alert--${severity}`, className].filter(Boolean).join(' '),
    role: "alert"
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: `mws-alert__icon ph ph-${ICONS[severity]}`,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mws-alert__body"
  }, title ? /*#__PURE__*/React.createElement("p", {
    className: "mws-alert__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("p", {
    className: "mws-alert__text"
  }, children) : null));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
const CSS = `
.mws-scrim {
  position: fixed; inset: 0; z-index: 100;
  background: var(--scrim); backdrop-filter: blur(4px);
  opacity: 0; pointer-events: none;
  transition: opacity var(--duration-slow) var(--ease-standard);
}
.mws-scrim.is-open { opacity: 1; pointer-events: auto; }
.mws-modal {
  position: fixed; top: 50%; left: 50%; z-index: 110;
  transform: translate(-50%, -50%) scale(0.96);
  width: min(92vw, 480px); max-height: 86vh; overflow-y: auto;
  background: var(--bg-surface); border-radius: var(--radius);
  padding: var(--space-6); box-shadow: var(--shadow-lg);
  opacity: 0; pointer-events: none;
  transition: opacity var(--duration-slow) var(--ease-emphasis), transform var(--duration-slow) var(--ease-emphasis);
  font-family: var(--font-sans);
}
.mws-modal.is-open { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
.mws-modal__title { font-family: var(--font-mix); font-weight: 400; font-size: 24px; line-height: 1.2; color: var(--text-primary); margin: 0 0 var(--space-3); }
.mws-modal__body { color: var(--text-secondary); font-size: 15px; line-height: 1.5; margin: 0 0 var(--space-5); }
.mws-modal__actions { display: flex; justify-content: flex-end; gap: var(--space-3); flex-wrap: wrap; }
@media (prefers-reduced-motion: reduce) {
  .mws-scrim, .mws-modal { transition-duration: 0.01ms; }
}
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'modal');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Modal — blocking dialog with navy-tinted blurred scrim. Closes on Escape
 * and scrim click. Use only when the user must act before continuing.
 */
function Modal({
  open = false,
  onClose,
  title,
  actions,
  children
}) {
  ensureStyles();
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: ['mws-scrim', open ? 'is-open' : ''].filter(Boolean).join(' '),
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: ['mws-modal', open ? 'is-open' : ''].filter(Boolean).join(' '),
    role: "dialog",
    "aria-modal": "true",
    "aria-hidden": !open
  }, title ? /*#__PURE__*/React.createElement("h2", {
    className: "mws-modal__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "mws-modal__body"
  }, children) : null, actions ? /*#__PURE__*/React.createElement("div", {
    className: "mws-modal__actions"
  }, actions) : null));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-toast {
  display: flex; align-items: center; gap: var(--space-3);
  background: var(--bg-surface); border-left: 4px solid;
  border-radius: var(--radius); padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-lg); font-family: var(--font-sans);
  min-width: 260px; max-width: min(360px, calc(100vw - var(--space-5) * 2));
}
.mws-toast i.mws-toast__icon { font-size: 20px; flex-shrink: 0; }
.mws-toast__text { flex: 1; min-width: 0; font-size: 14px; color: var(--text-primary); }
.mws-toast__close {
  background: none; border: none; cursor: pointer; color: var(--icon-default);
  display: inline-flex; padding: 4px; border-radius: var(--radius); flex-shrink: 0;
}
.mws-toast__close:hover { background: var(--color-navy-gray-1); }
[data-theme="dark"] .mws-toast__close:hover { background: var(--border-light); }
.mws-toast__close i { font-size: 16px; }
.mws-toast--info { border-color: var(--color-blue); }
.mws-toast--info .mws-toast__icon { color: var(--color-blue); }
.mws-toast--success { border-color: var(--color-success); }
.mws-toast--success .mws-toast__icon { color: var(--color-success); }
.mws-toast--warning { border-color: var(--color-warning); }
.mws-toast--warning .mws-toast__icon { color: var(--color-warning); }
.mws-toast--error { border-color: var(--color-error); }
.mws-toast--error .mws-toast__icon { color: var(--color-error); }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'toast');
  s.textContent = CSS;
  document.head.appendChild(s);
}
const ICONS = {
  info: 'info',
  success: 'check-circle',
  warning: 'warning-circle',
  error: 'x-circle'
};

/**
 * Toast — transient confirmation. Bottom-right; errors never auto-dismiss.
 */
function Toast({
  severity = 'success',
  onDismiss,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['mws-toast', `mws-toast--${severity}`, className].filter(Boolean).join(' '),
    role: "status"
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: `mws-toast__icon ph ph-${ICONS[severity]}`,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mws-toast__text"
  }, children), onDismiss ? /*#__PURE__*/React.createElement("button", {
    className: "mws-toast__close",
    onClick: onDismiss,
    "aria-label": "Dismiss"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-x",
    "aria-hidden": "true"
  })) : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-check-row { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 24px; cursor: pointer; font-family: var(--font-sans); }
.mws-check-row.is-disabled { opacity: 0.4; pointer-events: none; }
.mws-check {
  width: 24px; height: 24px; flex-shrink: 0;
  border: 2px solid var(--text-primary); border-radius: var(--radius);
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  transition: background var(--transition), border-color var(--transition);
}
.mws-check.is-radio { border-radius: 999px; }
.mws-check:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.mws-check.is-checked { background: var(--accent-interactive); border-color: var(--accent-interactive); }
.mws-check__mark { color: var(--color-white); font-size: 16px; line-height: 1; display: none; }
[data-theme="dark"] .mws-check__mark { color: var(--color-navy); }
.mws-check.is-checked .mws-check__mark { display: inline-flex; }
.mws-check__dot { width: 10px; height: 10px; border-radius: 999px; background: var(--color-white); display: none; }
[data-theme="dark"] .mws-check__dot { background: var(--color-navy); }
.mws-check.is-checked .mws-check__dot { display: block; }
.mws-check-row__label { font-size: 15px; color: var(--text-primary); }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'checkbox');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Checkbox — 24×24 control; accent fill when checked. Set `radio` for a radio.
 */
function Checkbox({
  checked = false,
  onChange,
  label,
  radio = false,
  disabled = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  const rowClasses = ['mws-check-row', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  const boxClasses = ['mws-check', radio ? 'is-radio' : '', checked ? 'is-checked' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: rowClasses
  }, /*#__PURE__*/React.createElement("span", _extends({
    className: boxClasses,
    role: radio ? 'radio' : 'checkbox',
    "aria-checked": checked,
    tabIndex: disabled ? -1 : 0,
    onClick: () => !disabled && onChange && onChange(!checked),
    onKeyDown: e => {
      if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
        e.preventDefault();
        onChange && onChange(!checked);
      }
    }
  }, rest), radio ? /*#__PURE__*/React.createElement("span", {
    className: "mws-check__dot",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement("i", {
    className: "mws-check__mark ph ph-check",
    "aria-hidden": "true"
  })), label ? /*#__PURE__*/React.createElement("span", {
    className: "mws-check-row__label"
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-field { display: flex; flex-direction: column; gap: var(--space-2); font-family: var(--font-sans); }
.mws-field__label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.mws-field__optional { color: var(--text-secondary); font-weight: 400; }
.mws-field__hint { font-size: 13px; color: var(--text-secondary); }
.mws-field__control {
  height: var(--control-h); padding: 0 var(--space-3);
  background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border-light); border-radius: var(--radius);
  font-family: var(--font-sans); font-size: 15px;
  transition: border-color var(--transition);
  width: 100%;
}
textarea.mws-field__control { height: auto; min-height: 88px; padding: var(--space-3); resize: vertical; line-height: 1.5; }
.mws-field__control::placeholder { color: var(--text-secondary); }
.mws-field__control:hover { border-color: var(--border-button); }
.mws-field__control:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 1px; border-color: var(--accent-interactive); }
.mws-field--error .mws-field__control { border-color: var(--color-error); }
/* Error message — navy on pale-orange, left border. Never red text. */
.mws-field__error {
  font-size: 13px; color: var(--color-navy);
  background: var(--color-pale-orange);
  border-left: 4px solid var(--color-error);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
}
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'input');
  s.textContent = CSS;
  document.head.appendChild(s);
}
let _uid = 0;

/**
 * Input — labelled text field with hint and error (navy on pale-orange) states.
 */
function Input({
  label,
  hint,
  error,
  optional = false,
  multiline = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const fieldId = id || `mws-input-${++_uid}`;
  const Control = multiline ? 'textarea' : 'input';
  const classes = ['mws-field', error ? 'mws-field--error' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: classes
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "mws-field__label",
    htmlFor: fieldId
  }, label, optional ? /*#__PURE__*/React.createElement("span", {
    className: "mws-field__optional"
  }, " (optional)") : null) : null, /*#__PURE__*/React.createElement(Control, _extends({
    id: fieldId,
    className: "mws-field__control",
    "aria-invalid": error ? 'true' : undefined
  }, rest)), hint && !error ? /*#__PURE__*/React.createElement("span", {
    className: "mws-field__hint"
  }, hint) : null, error ? /*#__PURE__*/React.createElement("span", {
    className: "mws-field__error",
    role: "alert"
  }, error) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-select-field { display: flex; flex-direction: column; gap: var(--space-2); font-family: var(--font-sans); }
.mws-select-field__label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.mws-select-wrap { position: relative; }
.mws-select {
  appearance: none; -webkit-appearance: none;
  width: 100%; height: var(--control-h);
  padding: 0 var(--space-7) 0 var(--space-3);
  background: var(--bg-surface); color: var(--text-primary);
  border: 1px solid var(--border-light); border-radius: var(--radius);
  font-family: var(--font-sans); font-size: 15px; cursor: pointer;
  transition: border-color var(--transition);
}
.mws-select:hover { border-color: var(--border-button); }
.mws-select:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 1px; border-color: var(--accent-interactive); }
.mws-select-wrap__caret {
  position: absolute; right: var(--space-3); top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--icon-default); font-size: 16px; line-height: 1;
}
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'select');
  s.textContent = CSS;
  document.head.appendChild(s);
}
let _uid = 0;

/**
 * Select — native styled dropdown with a Phosphor caret.
 */
function Select({
  label,
  options = [],
  placeholder,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const fieldId = id || `mws-select-${++_uid}`;
  return /*#__PURE__*/React.createElement("div", {
    className: ['mws-select-field', className].filter(Boolean).join(' ')
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "mws-select-field__label",
    htmlFor: fieldId
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    className: "mws-select-wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: "mws-select"
  }, rest), placeholder ? /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder) : null, options.map(opt => {
    const value = typeof opt === 'string' ? opt : opt.value;
    const text = typeof opt === 'string' ? opt : opt.label;
    return /*#__PURE__*/React.createElement("option", {
      key: value,
      value: value
    }, text);
  })), /*#__PURE__*/React.createElement("i", {
    className: "mws-select-wrap__caret ph ph-caret-down",
    "aria-hidden": "true"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.mws-switch-row { display: inline-flex; align-items: center; gap: var(--space-3); font-family: var(--font-sans); cursor: pointer; }
.mws-switch-row.is-disabled { opacity: 0.4; pointer-events: none; }
.mws-switch {
  position: relative; width: 44px; height: 24px; flex-shrink: 0;
  background: var(--color-navy-gray-2); border-radius: 999px;
  border: none; padding: 0; cursor: pointer;
  transition: background var(--transition);
}
[data-theme="dark"] .mws-switch { background: var(--border-light); }
.mws-switch:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.mws-switch::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; background: var(--color-white);
  border-radius: 999px; box-shadow: var(--shadow-sm);
  transition: transform var(--transition);
}
.mws-switch.is-on { background: var(--accent-interactive); }
.mws-switch.is-on::after { transform: translateX(20px); }
.mws-switch-row__label { font-size: 15px; color: var(--text-primary); }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'switch');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Switch — 44×24 toggle for immediate on/off settings. Accent on-state.
 */
function Switch({
  on = false,
  onChange,
  label,
  disabled = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  const rowClasses = ['mws-switch-row', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: rowClasses
  }, /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: ['mws-switch', on ? 'is-on' : ''].filter(Boolean).join(' '),
    role: "switch",
    "aria-checked": on,
    disabled: disabled,
    onClick: () => onChange && onChange(!on)
  }, rest)), label ? /*#__PURE__*/React.createElement("span", {
    className: "mws-switch-row__label"
  }, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
const CSS = `
.mws-breadcrumb { display: flex; align-items: center; gap: var(--space-2); min-width: 0; font-family: var(--font-sans); }
.mws-breadcrumb__item {
  font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-secondary); text-decoration: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;
  background: none; border: none; padding: 0; cursor: pointer;
  transition: color var(--transition);
}
.mws-breadcrumb__item:hover { color: var(--accent-interactive); }
.mws-breadcrumb__item[aria-current="page"] { color: var(--text-primary); cursor: default; }
.mws-breadcrumb__item[aria-current="page"]:hover { color: var(--text-primary); }
.mws-breadcrumb__sep { color: var(--text-secondary); font-size: 14px; flex-shrink: 0; display: inline-flex; }
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'breadcrumb');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Breadcrumb — caps-tracked hierarchy with Phosphor caret separators.
 * Last item is the current page (not a link). Use for 3+ level hierarchies.
 */
function Breadcrumb({
  items = [],
  onNavigate,
  className = ''
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("nav", {
    className: ['mws-breadcrumb', className].filter(Boolean).join(' '),
    "aria-label": "Breadcrumb"
  }, items.map((item, i) => {
    const label = typeof item === 'string' ? item : item.label;
    const isLast = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, /*#__PURE__*/React.createElement("button", {
      className: "mws-breadcrumb__item",
      "aria-current": isLast ? 'page' : undefined,
      onClick: () => !isLast && onNavigate && onNavigate(item, i)
    }, label), isLast ? null : /*#__PURE__*/React.createElement("span", {
      className: "mws-breadcrumb__sep",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("i", {
      className: "ph ph-caret-right"
    })));
  }));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const CSS = `
.mws-tabs {
  display: flex; gap: var(--space-5);
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: thin; -webkit-overflow-scrolling: touch;
}
.mws-tabs::-webkit-scrollbar { height: 4px; }
.mws-tabs::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: var(--radius-pill); }
.mws-tab {
  background: none; border: none; flex-shrink: 0;
  padding: var(--space-3) 0;
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  color: var(--text-secondary); cursor: pointer; position: relative;
  white-space: nowrap;
  transition: color var(--transition);
}
.mws-tab:hover { color: var(--text-primary); }
.mws-tab:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.mws-tab.is-active { color: var(--text-primary); }
.mws-tab.is-active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
  height: 2px; background: var(--accent-interactive);
}
`;
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-mws', 'tabs');
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Tabs — sibling content switcher. Active tab uses a 2px accent underline.
 * Arrow-key navigable; scrolls horizontally on narrow viewports (never wraps).
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  className = ''
}) {
  ensureStyles();
  const refs = React.useRef([]);
  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;else if (e.key === 'Home') next = 0;else if (e.key === 'End') next = tabs.length - 1;
    if (next !== null) {
      e.preventDefault();
      const t = tabs[next];
      onChange && onChange(typeof t === 'string' ? t : t.value);
      refs.current[next] && refs.current[next].focus();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: ['mws-tabs', className].filter(Boolean).join(' '),
    role: "tablist"
  }, tabs.map((t, i) => {
    const val = typeof t === 'string' ? t : t.value;
    const label = typeof t === 'string' ? t : t.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      ref: el => refs.current[i] = el,
      className: ['mws-tab', active ? 'is-active' : ''].filter(Boolean).join(' '),
      role: "tab",
      "aria-selected": active,
      tabIndex: active ? 0 : -1,
      onClick: () => onChange && onChange(val),
      onKeyDown: e => onKeyDown(e, i)
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/deposition-summarizer/AppShell.jsx
try { (() => {
// AppShell — McDermott app frame: navy sidebar + lockup + top bar + content.
// Composes the lockup, sidebar nav (active = color + left rail), pinned user
// card, and a minimal top bar (breadcrumb + autosave icon + theme + avatar).
const {
  useState,
  useEffect
} = React;
const {
  IconButton,
  Avatar,
  Breadcrumb
} = window.McDermottDesignSystem_b80d20;
const SYMBOL = /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 171.84 171.84",
  fill: "currentColor",
  "aria-label": "McDermott",
  style: {
    width: '100%',
    height: '100%'
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M43,85.12l22.6,36.87h-22.6v-36.87ZM113.34,121.9h16.81V47.95h-16.81v73.95ZM42.17,47.95l47.09,76.79,8.38-20.04-34.79-56.75h-20.67ZM171.84,85.92c0,47.37-38.55,85.92-85.92,85.92S0,133.29,0,85.92,38.55,0,85.92,0s85.92,38.55,85.92,85.92ZM162.77,85.92c0-42.37-34.47-76.85-76.85-76.85S9.07,43.55,9.07,85.92s34.47,76.85,76.85,76.85,76.85-34.47,76.85-76.85Z"
}));
function Lockup({
  appName,
  large
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `lockup${large ? ' lockup--lg' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "lockup__symbol"
  }, SYMBOL), /*#__PURE__*/React.createElement("span", {
    className: "lockup__divider",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "lockup__name"
  }, appName));
}
const NAV = [{
  id: 'matters',
  label: 'Matters',
  icon: 'folders'
}, {
  id: 'summary',
  label: 'Summary',
  icon: 'sparkle'
}, {
  id: 'reference',
  label: 'Reference',
  icon: 'book-open'
}, {
  id: 'admin',
  label: 'Admin',
  icon: 'gear'
}];
function AppShell({
  appName = 'Deposition Summarizer',
  section,
  onNavigate,
  breadcrumb = [],
  actions,
  theme,
  onToggleTheme,
  children
}) {
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const sidebar = /*#__PURE__*/React.createElement("nav", {
    className: "shell-sidebar",
    "aria-label": "Primary"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shell-sidebar__head"
  }, /*#__PURE__*/React.createElement(Lockup, {
    appName: appName
  })), /*#__PURE__*/React.createElement("div", {
    className: "shell-sidebar__matter"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shell-eyebrow"
  }, "Active matter"), /*#__PURE__*/React.createElement("span", {
    className: "shell-matter__name"
  }, "Acme v. Reedwell"), /*#__PURE__*/React.createElement("span", {
    className: "shell-matter__id"
  }, "CLIENT-4471 \xB7 142,800 docs")), /*#__PURE__*/React.createElement("ul", {
    className: "shell-nav"
  }, NAV.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.id
  }, /*#__PURE__*/React.createElement("button", {
    className: `shell-nav__item${section === item.id ? ' is-active' : ''}`,
    "aria-current": section === item.id ? 'page' : undefined,
    onClick: () => {
      onNavigate && onNavigate(item.id);
      setDrawer(false);
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: `ph ph-${item.icon}`,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, item.label))))), /*#__PURE__*/React.createElement("div", {
    className: "shell-sidebar__pinned"
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Jordan Mills",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    className: "shell-user"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shell-user__name"
  }, "Jordan Mills"), /*#__PURE__*/React.createElement("span", {
    className: "shell-user__role"
  }, "Litigation \xB7 Partner")), /*#__PURE__*/React.createElement("button", {
    className: "shell-user__menu",
    "aria-label": "Account menu"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-caret-up-down",
    "aria-hidden": "true"
  }))));
  return /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "shell-sidebar-slot"
  }, sidebar), drawer ? /*#__PURE__*/React.createElement("div", {
    className: "shell-scrim",
    onClick: () => setDrawer(false)
  }) : null, /*#__PURE__*/React.createElement("aside", {
    className: `shell-drawer${drawer ? ' is-open' : ''}`
  }, sidebar), /*#__PURE__*/React.createElement("div", {
    className: "shell-body"
  }, /*#__PURE__*/React.createElement("header", {
    className: "shell-topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shell-topbar__left"
  }, /*#__PURE__*/React.createElement("button", {
    className: "shell-hamburger",
    "aria-label": "Open navigation",
    onClick: () => setDrawer(true)
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-list",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement(Breadcrumb, {
    items: breadcrumb
  })), /*#__PURE__*/React.createElement("div", {
    className: "shell-topbar__right"
  }, /*#__PURE__*/React.createElement("span", {
    className: "shell-autosave",
    title: "Autosaved 12 minutes ago"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-cloud-check",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "shell-autosave__text"
  }, "Saved 12m ago")), actions, /*#__PURE__*/React.createElement(IconButton, {
    icon: theme === 'dark' ? 'sun' : 'moon',
    "aria-label": "Toggle theme",
    onClick: onToggleTheme
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Jordan Mills",
    size: "sm"
  }))), /*#__PURE__*/React.createElement("main", {
    className: "shell-main"
  }, children)));
}
window.AppShell = AppShell;
window.AppLockup = Lockup;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/deposition-summarizer/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/deposition-summarizer/LoginScreen.jsx
try { (() => {
// LoginScreen — centered lockup + sign-in. Composes Input + Button primitives.
const {
  Input,
  Button
} = window.McDermottDesignSystem_b80d20;
function LoginScreen({
  appName = 'Deposition Summarizer',
  onSignIn
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login__card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "login__lockup"
  }, /*#__PURE__*/React.createElement(window.AppLockup, {
    appName: appName,
    large: true
  })), /*#__PURE__*/React.createElement("h1", {
    className: "login__title"
  }, "Sign in"), /*#__PURE__*/React.createElement("p", {
    className: "login__sub"
  }, "Use your firm credentials to continue."), /*#__PURE__*/React.createElement("form", {
    className: "login__fields",
    onSubmit: e => {
      e.preventDefault();
      onSignIn && onSignIn();
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    type: "email",
    autoComplete: "email",
    placeholder: "jordan.mills@firm.example",
    defaultValue: "jordan.mills@firm.example"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Password",
    type: "password",
    autoComplete: "current-password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    defaultValue: "depo-summary"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    style: {
      width: '100%'
    }
  }, "Sign in")), /*#__PURE__*/React.createElement("p", {
    className: "login__foot"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "Use single sign-on"), " \xB7 ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, "Need access?"))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/deposition-summarizer/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/deposition-summarizer/MattersScreen.jsx
try { (() => {
// MattersScreen — matter list as the workhorse data table.
const {
  useState
} = React;
const {
  Badge,
  Button,
  IconButton
} = window.McDermottDesignSystem_b80d20;
const MATTERS = [{
  name: 'Acme v. Reedwell',
  id: 'CLIENT-4471',
  depos: 18,
  docs: '142,800',
  status: 'live',
  updated: '12m ago'
}, {
  name: 'Harbor Logistics arbitration',
  id: 'CLIENT-3920',
  depos: 7,
  docs: '38,210',
  status: 'pending',
  updated: '2h ago'
}, {
  name: 'Vance Holdings merger review',
  id: 'CLIENT-4102',
  depos: 24,
  docs: '291,540',
  status: 'live',
  updated: '1d ago'
}, {
  name: 'Pellman estate dispute',
  id: 'CLIENT-3771',
  depos: 4,
  docs: '9,640',
  status: 'failed',
  updated: '3d ago'
}, {
  name: 'Northbridge IP claim',
  id: 'CLIENT-4488',
  depos: 11,
  docs: '64,005',
  status: 'draft',
  updated: '5d ago'
}, {
  name: 'Calder Pharma compliance',
  id: 'CLIENT-3650',
  depos: 31,
  docs: '410,120',
  status: 'archived',
  updated: '2w ago'
}];
const STATUS_LABEL = {
  live: 'Live',
  pending: 'Processing',
  failed: 'Failed',
  draft: 'Draft',
  archived: 'Archived'
};
function SortHead({
  label,
  active,
  dir,
  onClick,
  numeric
}) {
  return /*#__PURE__*/React.createElement("th", {
    className: "sortable",
    "aria-sort": active ? dir === 'asc' ? 'ascending' : 'descending' : 'none',
    onClick: onClick,
    style: numeric ? {
      textAlign: 'right'
    } : null
  }, /*#__PURE__*/React.createElement("span", {
    className: "th-inner"
  }, label, /*#__PURE__*/React.createElement("i", {
    className: `ph ph-${active ? dir === 'asc' ? 'caret-up' : 'caret-down' : 'caret-up-down'}`,
    "aria-hidden": "true"
  })));
}
function MattersScreen({
  onOpenMatter
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({
    key: 'updated',
    dir: 'desc'
  });
  const rows = MATTERS.filter(m => (m.name + m.id).toLowerCase().includes(query.toLowerCase()));
  const toggleSort = key => setSort(s => ({
    key,
    dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc'
  }));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "page-head__title"
  }, "Matters"), /*#__PURE__*/React.createElement("p", {
    className: "page-head__sub"
  }, "Open a matter to review its deposition summaries.")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "plus"
  }, "New matter")), /*#__PURE__*/React.createElement("div", {
    className: "table-toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "table-search"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-magnifying-glass",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    placeholder: "Search matters",
    "aria-label": "Search matters",
    value: query,
    onChange: e => setQuery(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: "funnel"
  }, "Filter"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    icon: "export"
  }, "Export"))), /*#__PURE__*/React.createElement("div", {
    className: "table-shell"
  }, /*#__PURE__*/React.createElement("table", {
    className: "data-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(SortHead, {
    label: "Matter",
    active: sort.key === 'name',
    dir: sort.dir,
    onClick: () => toggleSort('name')
  }), /*#__PURE__*/React.createElement("th", null, "Code"), /*#__PURE__*/React.createElement(SortHead, {
    label: "Depositions",
    active: sort.key === 'depos',
    dir: sort.dir,
    onClick: () => toggleSort('depos'),
    numeric: true
  }), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Documents"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Updated"), /*#__PURE__*/React.createElement("th", {
    style: {
      width: 44
    }
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map(m => /*#__PURE__*/React.createElement("tr", {
    key: m.id,
    onClick: () => onOpenMatter && onOpenMatter(m)
  }, /*#__PURE__*/React.createElement("td", {
    className: "cell-name"
  }, m.name), /*#__PURE__*/React.createElement("td", {
    className: "cell-mono"
  }, m.id), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right'
    },
    className: "cell-mono"
  }, m.depos), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right'
    },
    className: "cell-mono"
  }, m.docs), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Badge, {
    status: m.status
  }, STATUS_LABEL[m.status])), /*#__PURE__*/React.createElement("td", {
    className: "cell-mono"
  }, m.updated), /*#__PURE__*/React.createElement("td", {
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "dots-three-vertical",
    size: "sm",
    "aria-label": `Actions for ${m.name}`
  }))))))));
}
window.MattersScreen = MattersScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/deposition-summarizer/MattersScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/deposition-summarizer/SummaryScreen.jsx
try { (() => {
// SummaryScreen — the AI surface: generated deposition summary with citations,
// streaming cursor / thinking dots, and a mandatory source list.
const {
  useState,
  useEffect,
  useRef
} = React;
const {
  Tabs,
  Button,
  Badge
} = window.McDermottDesignSystem_b80d20;
const SOURCES = [{
  n: 1,
  t: 'Mills deposition, 14:2–18:9',
  m: 'Apr 18, 2026 · 312 pp'
}, {
  n: 2,
  t: 'Reedwell production R-0042',
  m: 'Email thread · 6 pp'
}, {
  n: 3,
  t: 'Calder expert report §4.2',
  m: 'Filed Mar 2, 2026'
}];
function SummaryBody() {
  return /*#__PURE__*/React.createElement("div", {
    className: "ai-body"
  }, /*#__PURE__*/React.createElement("p", null, "The witness confirmed that the disputed shipment left the Reedwell facility on March 3", /*#__PURE__*/React.createElement("span", {
    className: "ai-cite",
    title: "Mills deposition, 14:2\u201318:9"
  }, "1"), ", two days after the contractual cutoff. Internal email indicates the delay was known to operations management before dispatch", /*#__PURE__*/React.createElement("span", {
    className: "ai-cite",
    title: "Reedwell production R-0042"
  }, "2"), "."), /*#__PURE__*/React.createElement("p", null, "Testimony on the inspection process was less consistent. The witness first stated inspections were logged digitally, then acknowledged paper records were also kept and may not have been produced. This", /*#__PURE__*/React.createElement("em", null, " likely"), " bears on the completeness of the document set", /*#__PURE__*/React.createElement("span", {
    className: "ai-cite",
    title: "Calder expert report \xA74.2"
  }, "3"), "."), /*#__PURE__*/React.createElement("p", null, "No admission of liability was made. The summary above reflects statements on the record and", /*#__PURE__*/React.createElement("em", null, " may"), " require corroboration against the underlying exhibits."));
}
function SummaryScreen({
  matter
}) {
  const [tab, setTab] = useState('summary');
  const [state, setState] = useState('done'); // 'thinking' | 'streaming' | 'done'
  const timers = useRef([]);
  const regenerate = () => {
    timers.current.forEach(clearTimeout);
    setState('thinking');
    timers.current = [setTimeout(() => setState('streaming'), 1400), setTimeout(() => setState('done'), 3200)];
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const name = matter && matter.name || 'Acme v. Reedwell';
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "page-head__title"
  }, "Summary"), /*#__PURE__*/React.createElement("p", {
    className: "page-head__sub"
  }, name, " \xB7 18 depositions indexed")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: state === 'done' ? 'sparkle' : 'stop',
    onClick: state === 'done' ? regenerate : undefined,
    loading: state === 'thinking'
  }, state === 'streaming' ? 'Stop' : 'Regenerate')), /*#__PURE__*/React.createElement("div", {
    className: "kpi-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi__label"
  }, "Depositions"), /*#__PURE__*/React.createElement("div", {
    className: "kpi__value"
  }, "18"), /*#__PURE__*/React.createElement("div", {
    className: "kpi__delta"
  }, "3 added this week")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi__label"
  }, "Pages reviewed"), /*#__PURE__*/React.createElement("div", {
    className: "kpi__value"
  }, "5,604"), /*#__PURE__*/React.createElement("div", {
    className: "kpi__delta"
  }, "AI-assisted")), /*#__PURE__*/React.createElement("div", {
    className: "kpi"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi__label"
  }, "Open questions"), /*#__PURE__*/React.createElement("div", {
    className: "kpi__value"
  }, "7"), /*#__PURE__*/React.createElement("div", {
    className: "kpi__delta"
  }, "flagged for counsel"))), /*#__PURE__*/React.createElement("div", {
    className: "summary-tabs-wrap"
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: [{
      value: 'summary',
      label: 'Summary'
    }, {
      value: 'timeline',
      label: 'Timeline'
    }, {
      value: 'exhibits',
      label: 'Exhibits'
    }]
  })), /*#__PURE__*/React.createElement("div", {
    className: "summary-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ai-card"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ai-label"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ph ph-sparkle",
    "aria-hidden": "true"
  }), " Generated \xB7 review before relying on it"), state === 'thinking' ? /*#__PURE__*/React.createElement("div", {
    className: "thinking",
    "aria-label": "Generating summary"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(SummaryBody, null), state === 'streaming' ? /*#__PURE__*/React.createElement("span", {
    className: "ai-cursor",
    "aria-hidden": "true"
  }) : null)), /*#__PURE__*/React.createElement("aside", null, /*#__PURE__*/React.createElement("span", {
    className: "ai-label",
    style: {
      color: 'var(--text-secondary)'
    }
  }, "Sources"), /*#__PURE__*/React.createElement("div", {
    className: "sources"
  }, SOURCES.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    className: "source-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "source-card__n"
  }, "[", s.n, "]"), /*#__PURE__*/React.createElement("div", {
    className: "source-card__t"
  }, s.t), /*#__PURE__*/React.createElement("div", {
    className: "source-card__m"
  }, s.m)))))));
}
window.SummaryScreen = SummaryScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/deposition-summarizer/SummaryScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
