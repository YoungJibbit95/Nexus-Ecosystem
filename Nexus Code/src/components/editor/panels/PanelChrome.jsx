import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const toneStyles = {
  muted: {
    icon: "#8b93a7",
    title: "#d7dae0",
    detail: "#7b8496",
    background: "rgba(255,255,255,0.026)",
    border: "rgba(255,255,255,0.06)",
  },
  accent: {
    icon: "var(--nexus-primary, #7c8cff)",
    title: "#ede9fe",
    detail: "#9ca3af",
    background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)",
    border: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.22)",
  },
  success: {
    icon: "#86efac",
    title: "#dcfce7",
    detail: "#86efac",
    background: "rgba(34,197,94,0.085)",
    border: "rgba(34,197,94,0.22)",
  },
  warning: {
    icon: "#fbbf24",
    title: "#fef3c7",
    detail: "#d6a94c",
    background: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.22)",
  },
  danger: {
    icon: "#f87171",
    title: "#fecaca",
    detail: "#fca5a5",
    background: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.22)",
  },
};

export const PANEL_INPUT_CLASS =
  "h-8 w-full min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[12px] text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-purple-400/45 focus:bg-white/[0.055]";

export const PANEL_SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[12px] text-gray-200 outline-none transition-colors focus:border-purple-400/45";

export function PanelShell({ children, ariaLabel, className = "", style }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className={`nx-editor-panel-shell relative isolate flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden text-gray-100 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(8,10,24,0.78) 0%, rgba(5,6,15,0.7) 100%)",
        backdropFilter: "blur(20px)",
        ...style,
      }}
      aria-label={ariaLabel}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.38), transparent)",
        }}
      />
      {children}
    </motion.aside>
  );
}

export function PanelHeader({
  icon: Icon,
  title,
  subtitle,
  status,
  actions,
  children,
  className = "",
}) {
  return (
    <header
      className={`nx-editor-panel-header shrink-0 border-b border-white/[0.06] px-3 pb-2.5 pt-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <div
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border"
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.105)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.22)",
              color: "var(--nexus-primary, #7c8cff)",
              boxShadow: "0 0 18px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)",
            }}
          >
            <Icon size={16} />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[13px] font-semibold text-gray-100">
              {title}
            </h2>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[10px] text-gray-500">{subtitle}</p>
          ) : null}
        </div>

        {actions ? (
          <div
            className="nx-editor-panel-actions flex shrink-0 flex-wrap items-center justify-end gap-1"
            role="toolbar"
            aria-label={`${title} actions`}
          >
            {actions}
          </div>
        ) : null}
      </div>

      {children ? <div className="mt-3 min-w-0">{children}</div> : null}
    </header>
  );
}

export const PanelBody = React.forwardRef(function PanelBody(
  { children, className = "", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`nx-editor-panel-body custom-scrollbar min-h-0 flex-1 overflow-y-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export function PanelFooter({ children, className = "" }) {
  return (
    <footer
      className={`nx-editor-panel-footer shrink-0 border-t border-white/[0.06] px-3 py-2 ${className}`}
    >
      {children}
    </footer>
  );
}

export function PanelIconButton({
  children,
  label,
  onClick,
  disabled = false,
  active = false,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border text-gray-500 transition-colors hover:bg-white/[0.07] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-45 [&>svg]:h-4 [&>svg]:w-4 ${className}`}
      style={{
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15)"
          : "rgba(255,255,255,0.032)",
        borderColor: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)"
          : "rgba(255,255,255,0.08)",
        color: active ? "var(--nexus-primary, #7c8cff)" : undefined,
      }}
    >
      {children}
    </button>
  );
}

export function PanelActionButton({
  children,
  icon: Icon,
  onClick,
  disabled = false,
  tone = "muted",
  type = "button",
  title,
  className = "",
}) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      style={{
        color: toneStyle.icon,
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      {Icon ? <Icon size={13} className="shrink-0" /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

export function PanelBadge({ children, tone = "muted", title }) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        color: toneStyle.icon,
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      {children}
    </span>
  );
}

export function PanelMetric({ label, value, tone = "muted", title }) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <div
      title={title}
      className="min-w-0 rounded-md border px-2 py-1.5"
      style={{
        background: "rgba(0,0,0,0.16)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="truncate text-[9px] font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div
        className="mt-0.5 truncate font-mono text-[11px] font-semibold"
        style={{ color: toneStyle.icon }}
      >
        {value}
      </div>
    </div>
  );
}

export function PanelNotice({
  icon: Icon = AlertCircle,
  title,
  detail,
  tone = "muted",
  children,
  actionLabel,
  onAction,
  className = "",
}) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${className}`}
      style={{
        color: toneStyle.detail,
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      <div className="flex min-w-0 items-start gap-2">
        {Icon ? (
          <Icon size={14} className="mt-0.5 shrink-0" style={{ color: toneStyle.icon }} />
        ) : null}
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="break-words text-[12px] font-semibold" style={{ color: toneStyle.title }}>
              {title}
            </p>
          ) : null}
          {detail ? (
            <p className="mt-0.5 break-words text-[11px] leading-snug" style={{ color: toneStyle.detail }}>
              {detail}
            </p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-gray-200 transition-colors hover:bg-white/[0.09]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PanelState({
  icon: Icon = AlertCircle,
  title,
  detail,
  tone = "muted",
  actionLabel,
  onAction,
  spinning = false,
  compact = false,
  children,
}) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <div
      className={`nx-editor-panel-state mx-3 rounded-lg border px-3 text-center ${
        compact ? "py-3" : "my-3 py-8"
      }`}
      style={{
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      {Icon ? (
        <Icon
          size={compact ? 18 : 26}
          className={`mx-auto mb-2 ${spinning ? "animate-spin" : ""}`}
          style={{ color: toneStyle.icon }}
        />
      ) : null}
      <p className="text-xs font-semibold" style={{ color: toneStyle.title }}>
        {title}
      </p>
      {detail ? (
        <p className="mx-auto mt-1 max-w-[22rem] text-[11px] leading-snug" style={{ color: toneStyle.detail }}>
          {detail}
        </p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-gray-200 transition-colors hover:bg-white/[0.09]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function PanelSection({
  title,
  icon: Icon,
  count,
  expanded = true,
  onToggle,
  action,
  actionLabel,
  actionDisabled = false,
  actionTitle,
  children,
}) {
  return (
    <section className="nx-editor-panel-section">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
        >
          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: 0.16 }}
            className="shrink-0"
          >
            <ChevronDown size={12} className="text-gray-600" />
          </motion.span>
          {Icon ? <Icon size={12} className="shrink-0 text-purple-300/75" /> : null}
          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {title}
          </span>
          {count != null ? <PanelBadge tone={count > 0 ? "accent" : "muted"}>{count}</PanelBadge> : null}
        </button>
        {action && actionLabel ? (
          <button
            type="button"
            onClick={action}
            disabled={actionDisabled}
            title={actionTitle || actionLabel}
            className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-gray-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
