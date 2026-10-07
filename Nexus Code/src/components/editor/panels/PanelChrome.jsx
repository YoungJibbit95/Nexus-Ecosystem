import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
/** @param {string} tone */
const toneName = (tone) => tone === "teal" ? "info" : ["accent", "success", "warning", "danger"].includes(tone) ? tone : "muted";
export const PANEL_INPUT_CLASS = "nx-panel-input";
export const PANEL_SELECT_CLASS = "nx-panel-input nx-panel-select";

function readMotionPreference() {
  return typeof document !== "undefined" && (
    document.documentElement.classList.contains("reduce-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
/** @param {() => void} notify */
function subscribeMotionPreference(notify) {
  const observer = new MutationObserver(notify);
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => {
    observer.disconnect();
    media.removeEventListener("change", notify);
  };
}
export function useNexusReducedMotion() {
  return React.useSyncExternalStore(subscribeMotionPreference, readMotionPreference, () => false);
}

export const PanelInput = React.forwardRef(/**
 * @param {React.InputHTMLAttributes<HTMLInputElement>} props
 * @param {React.ForwardedRef<HTMLInputElement>} ref
 */ function PanelInput({ className = "", style, ...props }, ref) {
  return <input ref={ref} className={`${PANEL_INPUT_CLASS} ${className}`} style={style} {...props} />;
});
export const PanelSelect = React.forwardRef(/**
 * @param {React.SelectHTMLAttributes<HTMLSelectElement>} props
 * @param {React.ForwardedRef<HTMLSelectElement>} ref
 */ function PanelSelect({ children, className = "", style, ...props }, ref) {
  return <select ref={ref} className={`${PANEL_SELECT_CLASS} ${className}`} style={style} {...props}>{children}</select>;
});

/** @param {React.HTMLAttributes<HTMLElement> & {tone?: string, interactive?: boolean, as?: React.ElementType, variants?: import('framer-motion').Variants}} props */
export function PanelCard({ children, tone = "muted", interactive = false, as: Component = "div", className = "", style, ...props }) {
  return <Component className={`nx-editor-panel-card nx-panel-tone ${interactive ? "nx-panel-interactive" : ""} ${className}`} data-tone={toneName(tone)} style={style} {...props}>{children}</Component>;
}

export function PanelShell({ children, ariaLabel, className = "", style }) {
  return <aside className={`nx-editor-panel-shell nx-v2-panel relative isolate flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden ${className}`} style={style} aria-label={ariaLabel}>{children}</aside>;
}

export function PanelHeader({ icon: Icon, title, subtitle, status, actions, children, className = "" }) {
  return (
    <header className={`nx-editor-panel-header ${className}`}>
      <div className="nx-panel-heading-row">
        {Icon ? <span className="nx-panel-heading-icon"><Icon size={14} /></span> : null}
        <div className="min-w-0 flex-1">
          <div className="nx-panel-heading-title"><h2 title={title}>{title}</h2>{status}</div>
          {subtitle ? <p className="nx-panel-subtitle" title={subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className="nx-editor-panel-actions" role="toolbar" aria-label={`${title} actions`}>{actions}</div> : null}
      </div>
      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
    </header>
  );
}

export const PanelBody = React.forwardRef(function PanelBody({ children, className = "", ...props }, ref) {
  return <div ref={ref} className={`nx-editor-panel-body custom-scrollbar min-h-0 flex-1 overflow-y-auto ${className}`} {...props}>{children}</div>;
});
export function PanelFooter({ children, className = "" }) {
  return <footer className={`nx-editor-panel-footer ${className}`}>{children}</footer>;
}

export function PanelIconButton({ children, label, onClick, disabled = false, active = false, type = "button", className = "" }) {
  return <button type={type} onClick={onClick} disabled={disabled} title={label} aria-label={label} data-active={active} className={`nx-panel-button nx-panel-icon-button ${className}`}>{children}</button>;
}
export function PanelActionButton({ children, icon: Icon, onClick, disabled = false, tone = "muted", type = "button", title, className = "" }) {
  return <button type={type} onClick={onClick} disabled={disabled} title={title} data-tone={toneName(tone)} className={`nx-panel-button nx-panel-tone ${className}`}>{Icon ? <Icon size={13} className="shrink-0" /> : null}<span className="min-w-0 break-words">{children}</span></button>;
}
export function PanelBadge({ children, tone = "muted", title }) {
  return <span title={title} data-tone={toneName(tone)} className="nx-panel-badge nx-panel-tone">{children}</span>;
}
export function PanelMetric({ label, value, tone = "muted", title }) {
  return <div title={title} data-tone={toneName(tone)} className="nx-panel-metric nx-panel-tone"><div className="nx-panel-subtitle">{label}</div><div className="font-mono font-semibold">{value}</div></div>;
}
export function PanelNotice({ icon: Icon = AlertCircle, title, detail, tone = "muted", children, actionLabel, onAction, className = "" }) {
  return (
    <div className={`nx-panel-notice nx-panel-tone ${className}`} data-tone={toneName(tone)}>
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        {Icon ? <Icon size={14} className="mt-0.5 shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          {title ? <p className="nx-panel-state-title">{title}</p> : null}
          {detail ? <p className="nx-panel-state-detail">{detail}</p> : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
        {actionLabel && onAction ? <PanelActionButton onClick={onAction} tone={tone} className="shrink-0">{actionLabel}</PanelActionButton> : null}
      </div>
    </div>
  );
}
export function PanelState({ icon: Icon = AlertCircle, title, detail, tone = "muted", actionLabel, onAction, spinning = false, compact = false, children }) {
  return (
    <div className={`nx-editor-panel-state nx-panel-tone ${compact ? "nx-panel-state-compact" : ""}`} data-tone={toneName(tone)} role={tone === "danger" ? "alert" : "status"}>
      {Icon ? <Icon size={compact ? 16 : 22} className={`mx-auto mb-2 ${spinning ? "nx-panel-spinner" : ""}`} /> : null}
      <p className="nx-panel-state-title">{title}</p>
      {detail ? <p className="nx-panel-state-detail">{detail}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {actionLabel && onAction ? <PanelActionButton onClick={onAction} tone={tone} className="mt-3">{actionLabel}</PanelActionButton> : null}
    </div>
  );
}
export function PanelSection({ title, icon: Icon, count, expanded = true, onToggle, action, actionLabel, actionDisabled = false, actionTitle, children }) {
  return (
    <section className="nx-editor-panel-section">
      <div className="flex items-center gap-1 px-2 py-0.5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="nx-panel-section-toggle">
          <ChevronDown size={12} className="shrink-0" style={{ transform: expanded ? undefined : "rotate(-90deg)" }} />
          {Icon ? <Icon size={12} className="shrink-0" /> : null}
          <span className="min-w-0 flex-1">{title}</span>
          {count != null ? <PanelBadge tone={count > 0 ? "accent" : "muted"}>{count}</PanelBadge> : null}
        </button>
        {action && actionLabel ? <PanelActionButton onClick={action} disabled={actionDisabled} title={actionTitle || actionLabel} className="shrink-0">{actionLabel}</PanelActionButton> : null}
      </div>
      {expanded ? <div>{children}</div> : null}
    </section>
  );
}
