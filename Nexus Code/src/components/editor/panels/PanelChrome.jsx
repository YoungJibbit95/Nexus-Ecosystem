import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
  teal: {
    icon: "#5eead4",
    title: "#ccfbf1",
    detail: "#99f6e4",
    background: "rgba(45,212,191,0.085)",
    border: "rgba(45,212,191,0.2)",
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
  "min-h-9 w-full min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[12px] leading-snug text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-purple-300/40 focus:bg-white/[0.052] focus:ring-2 focus:ring-purple-400/10";

export const PANEL_SELECT_CLASS =
  "min-h-9 w-full min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[12px] leading-snug text-gray-200 outline-none transition-colors focus:border-purple-300/40 focus:bg-white/[0.052] focus:ring-2 focus:ring-purple-400/10";

export function useNexusReducedMotion() {
  const prefersReducedMotion = useReducedMotion();
  const lowPowerClass =
    typeof document !== "undefined" &&
    document.documentElement?.classList?.contains("reduce-motion");

  return Boolean(prefersReducedMotion || lowPowerClass);
}

export const PanelInput = React.forwardRef(function PanelInput(
  { className = "", style, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`${PANEL_INPUT_CLASS} ${className}`}
      style={{ overflowWrap: "anywhere", ...style }}
      {...props}
    />
  );
});

export const PanelSelect = React.forwardRef(function PanelSelect(
  { children, className = "", style, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`${PANEL_SELECT_CLASS} ${className}`}
      style={{ overflowWrap: "anywhere", ...style }}
      {...props}
    >
      {children}
    </select>
  );
});

export function PanelCard({
  children,
  tone = "muted",
  interactive = false,
  as: Component = "div",
  className = "",
  style,
  ...props
}) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  const reduceMotion = useNexusReducedMotion();

  return (
    <Component
      className={`nx-editor-panel-card min-w-0 rounded-2xl border ${interactive ? "transition-colors hover:bg-white/[0.046]" : ""} ${className}`}
      style={{
        color: toneStyle.detail,
        background:
          "radial-gradient(circle at 12% 0%, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.055), transparent 12rem), linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.015))",
        borderColor:
          tone === "muted" ? "rgba(255,255,255,0.058)" : toneStyle.border,
        borderRadius: "var(--nexus-radius-xl, 22px)",
        boxShadow: reduceMotion
          ? "inset 0 1px 0 rgba(255,255,255,0.04)"
          : "0 18px 38px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.058)",
        backdropFilter: reduceMotion ? "none" : "blur(14px) saturate(112%)",
        WebkitBackdropFilter: reduceMotion
          ? "none"
          : "blur(14px) saturate(112%)",
        overflowWrap: "anywhere",
        transition:
          "background-color var(--nx-motion-quick, 190ms) var(--nx-motion-ease, ease), border-color var(--nx-motion-quick, 190ms) var(--nx-motion-ease, ease), box-shadow var(--nx-motion-quick, 190ms) var(--nx-motion-ease, ease)",
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PanelShell({ children, ariaLabel, className = "", style }) {
  const reduceMotion = useNexusReducedMotion();

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`nx-editor-panel-shell relative isolate flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden text-gray-100 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(10,13,27,0.72) 0%, rgba(6,8,18,0.66) 100%)",
        backdropFilter: reduceMotion ? "none" : "blur(18px) saturate(112%)",
        WebkitBackdropFilter: reduceMotion
          ? "none"
          : "blur(18px) saturate(112%)",
        ...style,
      }}
      aria-label={ariaLabel}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.26), transparent)",
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
      className={`nx-editor-panel-header shrink-0 border-b border-white/[0.045] px-3.5 pb-3 pt-3.5 ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-start gap-2.5">
        {Icon ? (
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
            style={{
              borderRadius: "var(--nexus-radius-lg, 18px)",
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.09)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
              color: "var(--nexus-primary, #7c8cff)",
              boxShadow: "0 0 18px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
            }}
          >
            <Icon size={16} />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2
              className="min-w-0 break-words text-[13px] font-semibold leading-tight text-gray-100"
              style={{ overflowWrap: "anywhere" }}
            >
              {title}
            </h2>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {subtitle ? (
            <p
              className="mt-0.5 min-w-0 break-words text-[10px] leading-snug text-gray-500"
              style={{ overflowWrap: "anywhere" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div
            className="nx-editor-panel-actions flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1"
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
      className={`nx-editor-panel-footer shrink-0 border-t border-white/[0.045] px-3 py-2.5 ${className}`}
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
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-2xl border text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-45 [&>svg]:h-4 [&>svg]:w-4 ${className}`}
      style={{
        borderRadius: "var(--nexus-radius-lg, 18px)",
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15)"
          : "rgba(255,255,255,0.028)",
        borderColor: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)"
          : "rgba(255,255,255,0.065)",
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
      className={`inline-flex min-h-8 max-w-full min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      style={{
        color: toneStyle.icon,
        background: toneStyle.background,
        borderColor: toneStyle.border,
        borderRadius: "var(--nexus-radius-lg, 18px)",
      }}
    >
      {Icon ? <Icon size={13} className="shrink-0" /> : null}
      <span className="min-w-0 break-words text-center" style={{ overflowWrap: "anywhere" }}>
        {children}
      </span>
    </button>
  );
}

export function PanelBadge({ children, tone = "muted", title }) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <span
      title={title}
      className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight"
      style={{
        color: toneStyle.icon,
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
        {children}
      </span>
    </span>
  );
}

export function PanelMetric({ label, value, tone = "muted", title }) {
  const toneStyle = toneStyles[tone] || toneStyles.muted;
  return (
    <div
      title={title}
      className="min-w-0 rounded-xl border px-2.5 py-2"
      style={{
        background: "rgba(0,0,0,0.13)",
        borderColor: "rgba(255,255,255,0.055)",
        borderRadius: "var(--nexus-radius-lg, 18px)",
      }}
    >
      <div
        className="break-words text-[9px] font-semibold uppercase leading-tight text-gray-600"
        style={{ letterSpacing: 0, overflowWrap: "anywhere" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 break-words font-mono text-[11px] font-semibold leading-tight"
        style={{ color: toneStyle.icon, overflowWrap: "anywhere" }}
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
      className={`rounded-2xl border px-3 py-2.5 ${className}`}
      style={{
        color: toneStyle.detail,
        background: toneStyle.background,
        borderColor: toneStyle.border,
        borderRadius: "var(--nexus-radius-xl, 22px)",
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
          <PanelActionButton
            onClick={onAction}
            tone={tone}
            className="shrink-0 text-[10px]"
          >
            {actionLabel}
          </PanelActionButton>
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
      className={`nx-editor-panel-state mx-3 rounded-2xl border px-3 text-center ${
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
        <p
          className="mx-auto mt-1 max-w-[22rem] break-words text-[11px] leading-snug"
          style={{ color: toneStyle.detail, overflowWrap: "anywhere" }}
        >
          {detail}
        </p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
      {actionLabel && onAction ? (
        <PanelActionButton
          onClick={onAction}
          tone={tone}
          className="mt-3"
        >
          {actionLabel}
        </PanelActionButton>
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
  const reduceMotion = useNexusReducedMotion();

  return (
    <section className="nx-editor-panel-section">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={onToggle}
      className="min-w-0 flex flex-1 items-center gap-1.5 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/[0.04]"
        >
          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="shrink-0"
          >
            <ChevronDown size={12} className="text-gray-600" />
          </motion.span>
          {Icon ? <Icon size={12} className="shrink-0 text-purple-300/75" /> : null}
          <span
            className="min-w-0 flex-1 break-words text-[10px] font-semibold uppercase leading-tight text-gray-500"
            style={{ letterSpacing: 0, overflowWrap: "anywhere" }}
          >
            {title}
          </span>
          {count != null ? <PanelBadge tone={count > 0 ? "accent" : "muted"}>{count}</PanelBadge> : null}
        </button>
        {action && actionLabel ? (
          <PanelActionButton
            onClick={action}
            disabled={actionDisabled}
            title={actionTitle || actionLabel}
            className="shrink-0 px-2 py-1 text-[10px]"
          >
            {actionLabel}
          </PanelActionButton>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
