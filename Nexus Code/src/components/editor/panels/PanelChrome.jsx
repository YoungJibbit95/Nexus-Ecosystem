import React from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const toneStyles = {
  muted: {
    icon: "#8b93a7",
    title: "#d7dae0",
    detail: "#7b8496",
    background: "rgba(255,255,255,0.018)",
    border: "rgba(156,178,226,0.065)",
  },
  accent: {
    icon: "var(--nexus-primary, #7c8cff)",
    title: "#ede9fe",
    detail: "#9ca3af",
    background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.06)",
    border: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.145)",
  },
  teal: {
    icon: "#93c5fd",
    title: "#dbeafe",
    detail: "#bfdbfe",
    background: "rgba(56,189,248,0.055)",
    border: "rgba(56,189,248,0.14)",
  },
  success: {
    icon: "#a5b4fc",
    title: "#e0e7ff",
    detail: "#c7d2fe",
    background: "rgba(129,140,248,0.056)",
    border: "rgba(129,140,248,0.14)",
  },
  warning: {
    icon: "#fbbf24",
    title: "#fef3c7",
    detail: "#d6a94c",
    background: "rgba(251,191,36,0.072)",
    border: "rgba(251,191,36,0.18)",
  },
  danger: {
    icon: "#f87171",
    title: "#fecaca",
    detail: "#fca5a5",
    background: "rgba(239,68,68,0.072)",
    border: "rgba(239,68,68,0.18)",
  },
};

export const PANEL_INPUT_CLASS =
  "min-h-8 w-full min-w-0 rounded-md border border-white/[0.045] bg-white/[0.018] px-2.5 py-1.5 text-[12px] leading-snug text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-[rgba(var(--nexus-primary-rgb),0.28)] focus:bg-white/[0.034] focus:ring-2 focus:ring-[rgba(var(--nexus-primary-rgb),0.075)]";

export const PANEL_SELECT_CLASS =
  "min-h-8 w-full min-w-0 rounded-md border border-white/[0.045] bg-white/[0.018] px-2.5 py-1.5 text-[12px] leading-snug text-gray-200 outline-none transition-colors focus:border-[rgba(var(--nexus-primary-rgb),0.28)] focus:bg-white/[0.034] focus:ring-2 focus:ring-[rgba(var(--nexus-primary-rgb),0.075)]";

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
      className={`nx-editor-panel-card min-w-0 rounded-md border ${interactive ? "transition-colors hover:bg-white/[0.026]" : ""} ${className}`}
      style={{
        color: toneStyle.detail,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.004)), rgba(0,0,0,0.12)",
        borderColor:
          tone === "muted" ? "rgba(156,178,226,0.046)" : toneStyle.border,
        borderRadius: "8px",
        boxShadow: reduceMotion
          ? "inset 0 1px 0 rgba(255,255,255,0.02)"
          : "inset 0 1px 0 rgba(255,255,255,0.026)",
        backdropFilter: reduceMotion ? "none" : "blur(6px) saturate(104%)",
        WebkitBackdropFilter: reduceMotion
          ? "none"
          : "blur(6px) saturate(104%)",
        overflowWrap: "anywhere",
        transition:
          reduceMotion
            ? "none"
            : "background-color var(--nx-motion-quick, 190ms) var(--nx-motion-ease, ease), border-color var(--nx-motion-quick, 190ms) var(--nx-motion-ease, ease), box-shadow var(--nx-motion-quick, 190ms) var(--nx-motion-ease, ease)",
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
          "linear-gradient(180deg, rgba(5,8,15,0.91) 0%, rgba(3,5,10,0.88) 100%)",
        backdropFilter: reduceMotion ? "none" : "blur(7px) saturate(103%)",
        WebkitBackdropFilter: reduceMotion
          ? "none"
          : "blur(7px) saturate(103%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.014)",
        ...style,
      }}
      aria-label={ariaLabel}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18), transparent)",
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
  const reduceMotion = useNexusReducedMotion();

  return (
    <header
      className={`nx-editor-panel-header shrink-0 border-b px-3 py-2 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.002)), rgba(0,0,0,0.07)",
        borderColor: "rgba(154,166,204,0.03)",
        boxShadow: reduceMotion
          ? "inset 0 -1px 0 rgba(255,255,255,0.012)"
          : "inset 0 -1px 0 rgba(255,255,255,0.012)",
        backdropFilter: reduceMotion ? "none" : "blur(6px) saturate(103%)",
        WebkitBackdropFilter: reduceMotion ? "none" : "blur(6px) saturate(103%)",
      }}
    >
      <div className="flex min-w-0 items-start gap-2">
        {Icon ? (
          <div
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md border"
            style={{
              borderRadius: "7px",
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.035)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.07)",
              color: "var(--nexus-primary, #7c8cff)",
              boxShadow: reduceMotion
                ? "inset 0 1px 0 rgba(255,255,255,0.02)"
                : "inset 0 1px 0 rgba(255,255,255,0.024)",
            }}
          >
            <Icon size={12} />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className="min-w-0 truncate text-[12px] font-semibold leading-tight text-gray-100"
              style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
            >
              {title}
            </h2>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {subtitle ? (
            <p
              className="mt-0.5 min-w-0 truncate text-[10px] leading-snug text-gray-500"
              style={{ overflowWrap: "anywhere", wordBreak: "normal" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div
            className="nx-editor-panel-actions ml-auto flex max-w-[42%] shrink-0 flex-wrap items-center justify-end gap-1 overflow-visible rounded-md"
            role="toolbar"
            aria-label={`${title} actions`}
            style={{
              boxShadow: "none",
            }}
          >
            {actions}
          </div>
        ) : null}
      </div>

      {children ? <div className="mt-2 min-w-0">{children}</div> : null}
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
      className={`nx-editor-panel-footer shrink-0 border-t px-3 py-2 ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.003)), rgba(0,0,0,0.09)",
        borderColor: "rgba(154,166,204,0.035)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.012)",
      }}
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
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-gray-500 transition-colors hover:bg-white/[0.036] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-45 [&>svg]:h-3.5 [&>svg]:w-3.5 ${className}`}
      style={{
        borderRadius: "7px",
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.07)"
          : "rgba(255,255,255,0.006)",
        borderColor: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)"
          : "rgba(255,255,255,0.03)",
        color: active ? "var(--nexus-primary, #7c8cff)" : undefined,
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.03)"
          : "inset 0 1px 0 rgba(255,255,255,0.018)",
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
      className={`inline-flex min-h-7 max-w-full min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight transition-colors hover:bg-white/[0.036] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      style={{
        color: toneStyle.icon,
        background: toneStyle.background,
        borderColor: toneStyle.border,
        borderRadius: "7px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      {Icon ? <Icon size={13} className="shrink-0" /> : null}
      <span className="min-w-0 break-words text-center" style={{ overflowWrap: "anywhere", wordBreak: "normal" }}>
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
      className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
      style={{
        color: toneStyle.icon,
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
    >
      <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere", wordBreak: "normal" }}>
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
      className="min-w-0 rounded-md border px-2 py-1.5"
      style={{
        background: "rgba(0,0,0,0.13)",
        borderColor: "rgba(255,255,255,0.055)",
        borderRadius: "7px",
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
      className={`rounded-md border px-2.5 py-2 ${className}`}
      style={{
        color: toneStyle.detail,
        background: toneStyle.background,
        borderColor: toneStyle.border,
        borderRadius: "8px",
      }}
    >
      <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
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
      className={`nx-editor-panel-state mx-3 rounded-md border px-3 text-center ${
        compact ? "py-2.5" : "my-3 py-6"
      }`}
      style={{
        background: toneStyle.background,
        borderColor: toneStyle.border,
      }}
      role={tone === "danger" ? "alert" : "status"}
    >
      {Icon ? (
        <Icon
          size={compact ? 16 : 22}
          className={`mx-auto mb-2 ${spinning ? "animate-spin" : ""}`}
          style={{ color: toneStyle.icon }}
        />
      ) : null}
      <p className="break-words text-xs font-semibold" style={{ color: toneStyle.title, overflowWrap: "anywhere" }}>
        {title}
      </p>
      {detail ? (
        <p
          className="mx-auto mt-1 max-w-[19rem] break-words text-[11px] leading-snug"
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
      <div className="flex items-center gap-1 px-2 py-0.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-white/[0.026]"
        >
          <motion.span
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            className="shrink-0"
          >
            <ChevronDown size={12} className="text-gray-600" />
          </motion.span>
          {Icon ? <Icon size={12} className="shrink-0 text-[var(--nexus-primary)] opacity-75" /> : null}
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
