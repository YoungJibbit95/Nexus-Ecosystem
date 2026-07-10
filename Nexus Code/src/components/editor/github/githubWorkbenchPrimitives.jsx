import React from "react";
import { AlertCircle, Pencil, ShieldAlert, X } from "lucide-react";
import {
  PanelActionButton,
  PanelCard,
  PanelInput,
  PanelNotice,
  PanelSelect,
} from "../panels/PanelChrome.jsx";

const TEXTAREA_CLASS =
  "min-h-[62px] w-full min-w-0 resize-y rounded-md border border-white/[0.06] bg-black/[0.18] px-2.5 py-2 text-[11px] leading-snug text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-cyan-300/[0.24] focus:bg-black/[0.22] focus:ring-2 focus:ring-cyan-300/[0.08] disabled:cursor-not-allowed disabled:opacity-45";

const QUIET_FIELD_CLASS =
  "!min-h-8 !rounded-md !border-white/[0.06] !bg-black/[0.18] !px-2.5 !py-1.5 !text-[11px] focus:!border-cyan-300/[0.24] focus:!bg-black/[0.22] focus:!ring-cyan-300/[0.08] placeholder:!text-gray-600";
const QUIET_CARD_STYLE = {
  background: "linear-gradient(180deg, rgba(15,23,42,0.34), rgba(2,6,23,0.2))",
  borderColor: "rgba(148,163,184,0.075)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.026)",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
};
const SELECTED_CARD_STYLE = {
  borderColor: "rgba(103,232,249,0.18)",
  boxShadow:
    "0 0 0 1px rgba(103,232,249,0.1), inset 0 1px 0 rgba(255,255,255,0.032)",
};
export const NESTED_FORM_CLASS =
  "grid gap-2 rounded-md border border-white/[0.045] bg-black/[0.14] p-2";

const STATE_TONE_STYLES = {
  muted: {
    icon: "#94a3b8",
    title: "#d1d5db",
    detail: "#8b93a7",
    background: "rgba(15,23,42,0.45)",
    border: "rgba(148,163,184,0.1)",
  },
  accent: {
    icon: "#67e8f9",
    title: "#dbeafe",
    detail: "#9ca3af",
    background: "rgba(8,47,73,0.18)",
    border: "rgba(103,232,249,0.16)",
  },
  danger: {
    icon: "#fca5a5",
    title: "#fecaca",
    detail: "#f1b4b4",
    background: "rgba(127,29,29,0.16)",
    border: "rgba(248,113,113,0.16)",
  },
  warning: {
    icon: "#fbbf24",
    title: "#fde68a",
    detail: "#d6a94c",
    background: "rgba(120,53,15,0.14)",
    border: "rgba(251,191,36,0.16)",
  },
};

export function QuietCard({
  children,
  className = "",
  selected = false,
  style,
  ...props
}) {
  return (
    <PanelCard
      className={`nx-code-github-quiet-card ${className}`}
      style={{
        ...QUIET_CARD_STYLE,
        ...(selected ? SELECTED_CARD_STYLE : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </PanelCard>
  );
}

export function QuietInput({ className = "", style, ...props }) {
  return (
    <PanelInput
      className={`${QUIET_FIELD_CLASS} ${className}`}
      style={{ overflowWrap: "anywhere", ...style }}
      {...props}
    />
  );
}

export function QuietSelect({ children, className = "", style, ...props }) {
  return (
    <PanelSelect
      className={`${QUIET_FIELD_CLASS} ${className}`}
      style={{ colorScheme: "dark", overflowWrap: "anywhere", ...style }}
      {...props}
    >
      {children}
    </PanelSelect>
  );
}

export function WorkbenchNotice({ className = "", ...props }) {
  return (
    <PanelNotice
      className={`!rounded-md !px-2.5 !py-2 ${className}`}
      {...props}
    />
  );
}

export function WorkbenchState({
  icon: Icon = AlertCircle,
  title,
  detail,
  tone = "muted",
  actionLabel,
  onAction,
  spinning = false,
}) {
  const toneStyle = STATE_TONE_STYLES[tone] || STATE_TONE_STYLES.muted;

  return (
    <div
      className="mx-3 my-2 rounded-md border px-3 py-2.5"
      style={{
        background: toneStyle.background,
        borderColor: toneStyle.border,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.024)",
      }}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? (
          <Icon
            size={17}
            className={`mt-0.5 shrink-0 ${spinning ? "animate-spin" : ""}`}
            style={{ color: toneStyle.icon }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className="break-words text-[12px] font-semibold leading-snug"
            style={{ color: toneStyle.title, overflowWrap: "anywhere" }}
          >
            {title}
          </p>
          {detail ? (
            <p
              className="mt-0.5 max-w-[24rem] break-words text-[11px] leading-snug"
              style={{ color: toneStyle.detail, overflowWrap: "anywhere" }}
            >
              {detail}
            </p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <PanelActionButton
            onClick={onAction}
            tone={tone === "danger" ? "danger" : "muted"}
            className="shrink-0"
          >
            {actionLabel}
          </PanelActionButton>
        ) : null}
      </div>
    </div>
  );
}

function getStatusDotColor(tone) {
  if (tone === "danger") return "#f87171";
  if (tone === "warning") return "#fbbf24";
  return "#67e8f9";
}

export function RuntimeStatusLine({ status, capability, onOpenAccount }) {
  const missingCount = capability.missingMethods?.length || 0;

  return (
    <div
      className="mx-3 mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2"
      style={{
        background: "rgba(2,6,23,0.24)",
        borderColor: status.tone === "danger"
          ? "rgba(248,113,113,0.16)"
          : status.tone === "warning"
            ? "rgba(251,191,36,0.16)"
            : "rgba(103,232,249,0.13)",
      }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: getStatusDotColor(status.tone) }}
        />
        <div className="min-w-0">
          <p className="break-words text-[11px] font-semibold text-gray-200" style={{ overflowWrap: "anywhere" }}>
            {status.title}
          </p>
          <p className="break-words text-[10px] leading-snug text-gray-500" style={{ overflowWrap: "anywhere" }}>
            {missingCount > 0 ? `${missingCount} missing method${missingCount === 1 ? "" : "s"}. ` : ""}
            {status.detail}
          </p>
        </div>
      </div>
      {status.id !== "ready" ? (
        <PanelActionButton
          type="button"
          tone="muted"
          icon={Pencil}
          onClick={onOpenAccount}
          disabled={!onOpenAccount}
          className="h-7 shrink-0"
        >
          Account
        </PanelActionButton>
      ) : null}
    </div>
  );
}

export function WorkbenchSummaryPill({ label, value, tone = "muted", title }) {
  const color =
    tone === "danger"
      ? "#fca5a5"
      : tone === "warning"
        ? "#fbbf24"
        : tone === "accent"
          ? "#67e8f9"
          : "#94a3b8";

  return (
    <div
      title={title}
      className="min-w-0 rounded-md border px-2 py-1.5"
      style={{
        background: "rgba(2,6,23,0.13)",
        borderColor: "rgba(148,163,184,0.052)",
      }}
    >
      <div
        className="text-[9px] font-semibold uppercase leading-none text-gray-600"
        style={{ letterSpacing: 0 }}
      >
        {label}
      </div>
      <div
        className="mt-1 min-w-0 break-words text-[11px] font-semibold leading-tight"
        style={{ color, overflowWrap: "anywhere" }}
      >
        {value}
      </div>
    </div>
  );
}
export function PanelTextarea({ value, onChange, placeholder, rows = 4, disabled = false }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={TEXTAREA_CLASS}
      style={{ overflowWrap: "anywhere" }}
    />
  );
}

export function ConfirmationNotice({
  active,
  title,
  detail,
  confirmLabel,
  tone = "warning",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!active) return null;

  return (
    <WorkbenchNotice
      className="mt-2"
      tone={tone}
      icon={ShieldAlert}
      title={title}
      detail={detail}
    >
      <div className="flex min-w-0 flex-wrap gap-1.5">
        <PanelActionButton
          type="button"
          tone={tone}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working..." : confirmLabel}
        </PanelActionButton>
        <PanelActionButton
          type="button"
          tone="muted"
          icon={X}
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </PanelActionButton>
      </div>
    </WorkbenchNotice>
  );
}
