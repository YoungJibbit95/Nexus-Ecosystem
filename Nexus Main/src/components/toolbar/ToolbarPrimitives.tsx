import React from "react";
import {
  Command,
  MoreHorizontal,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import { hexToRgb } from "../../lib/utils";
import type { ViewId } from "./constants";

type ToolbarTheme = any;

type Offset = { x?: number; y?: number };

const cx = (offset?: Offset) => offset?.x ?? 0;
const cy = (offset?: Offset) => offset?.y ?? 0;

const pickButtonRenderer = (_theme?: ToolbarTheme) => "button";

export function IslandToolbarBrand({
  t,
  rgb,
  compact,
  offset,
}: {
  t: ToolbarTheme;
  rgb: string;
  compact?: boolean;
  offset?: Offset;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
        minWidth: 0,
        transform: `translate(${cx(offset)}px, ${cy(offset)}px)`,
      }}
    >
      <div
        style={{
          width: compact ? 21 : 24,
          height: compact ? 21 : 24,
          borderRadius: compact ? 8 : 10,
          background: `radial-gradient(circle at 30% 25%, rgba(${rgb},0.34), rgba(${rgb},0.1))`,
          border: `1px solid rgba(${rgb},0.42)`,
          boxShadow: `0 8px 18px rgba(${rgb},0.16)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Sparkles size={compact ? 10 : 11} style={{ color: t.accent }} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          lineHeight: 1.1,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Nexus
        </span>
        {!compact ? (
          <span style={{ fontSize: 9, opacity: 0.5, whiteSpace: "nowrap" }}>
            Command Dock
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function FullWidthToolbarBrand({
  t,
  rgb,
  compact,
  offset,
}: {
  t: ToolbarTheme;
  rgb: string;
  compact?: boolean;
  offset?: Offset;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
        minWidth: 0,
        transform: `translate(${cx(offset)}px, ${cy(offset)}px)`,
      }}
    >
      <div
        style={{
          height: compact ? 22 : 24,
          borderRadius: compact ? 8 : 9,
          border: `1px solid rgba(${rgb},0.38)`,
          background: `linear-gradient(125deg, rgba(${rgb},0.22), rgba(${rgb},0.07))`,
          padding: compact ? "0 7px" : "0 9px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 7px 16px rgba(${rgb},0.14)`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: compact ? 9 : 10,
            fontWeight: 900,
            letterSpacing: "0.1em",
            color: t.accent,
          }}
        >
          NX
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Nexus
        </span>
        {!compact ? (
          <span style={{ fontSize: 9, opacity: 0.5, whiteSpace: "nowrap" }}>
            Workspace
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SpotlightToolbarBrand({
  t,
  rgb,
}: {
  t: ToolbarTheme;
  rgb: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 10,
          border: `1px solid rgba(${rgb},0.5)`,
          background: `linear-gradient(130deg, rgba(${rgb},0.3), rgba(${rgb},0.09))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 10px 24px rgba(${rgb},0.24)`,
          flexShrink: 0,
        }}
      >
        <Search size={12} style={{ color: t.accent }} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.82,
          whiteSpace: "nowrap",
        }}
      >
        Spotlight
      </span>
    </div>
  );
}

export function ToolbarStatusCluster({
  t,
  pendingTasks,
  overdueReminders,
  timeStr,
  compact,
  showTime = true,
  offset,
}: {
  t: ToolbarTheme;
  pendingTasks: number;
  overdueReminders: number;
  timeStr: string;
  compact?: boolean;
  showTime?: boolean;
  offset?: Offset;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 5,
        transform: `translate(${cx(offset)}px, ${cy(offset)}px)`,
      }}
    >
      <ToolbarStatusPill
        label={compact ? "T" : "Tasks"}
        value={pendingTasks}
        color={pendingTasks > 0 ? "#ff9f0a" : undefined}
      />
      <ToolbarStatusPill
        label={compact ? "D" : "Due"}
        value={overdueReminders}
        color={overdueReminders > 0 ? "#ff453a" : undefined}
      />
      {showTime ? (
        <ToolbarStatusPill label="Time" value={timeStr} color={t.accent} mono />
      ) : null}
    </div>
  );
}

export function ToolbarStatusPill({
  label,
  value,
  color,
  mono,
}: {
  label: string;
  value: string | number;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 999,
        border: "1px solid var(--nx-v6-line, rgba(255,255,255,0.08))",
        background: "var(--nx-v6-control-bg, rgba(255,255,255,0.035))",
        color: "var(--nx-v6-text, inherit)",
        padding: "3px 7px",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span style={{ fontSize: 9, opacity: 0.46, fontWeight: 700 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color,
          fontFamily: mono ? "monospace" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ToolbarNavChip({
  label,
  color,
  icon: Icon,
  compact,
  dense,
  active,
  onClick,
}: {
  label: string;
  color: string;
  icon: any;
  compact?: boolean;
  dense?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  const rgb = hexToRgb(color);
  return (
    <button
      className="nx-toolbar-navchip"
      onClick={onClick}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0 : dense ? 4 : 5,
        borderRadius: 999,
        border: "1px solid transparent",
        background: active ? `rgba(${rgb},0.16)` : "transparent",
        color: active ? color : "inherit",
        padding: compact ? "5px 7px" : dense ? "4px 7px" : "5px 8px",
        fontSize: dense ? 10 : 10.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <Icon size={dense ? 11 : 12} style={{ opacity: active ? 1 : 0.72 }} />
      {!compact ? label : null}
    </button>
  );
}

export function ToolbarUtilityButton({
  t,
  title,
  active,
  icon,
  onClick,
  offset,
}: {
  t: ToolbarTheme;
  title: string;
  active?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  offset?: Offset;
}) {
  const Comp = pickButtonRenderer(t) as any;
  const commonStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    minHeight: 28,
    padding: 0,
    borderRadius: 999,
    border:
      Comp === "button"
        ? `1px solid ${active ? `rgba(${hexToRgb(t.accent)},0.28)` : "var(--nx-v6-line, rgba(255,255,255,0.08))"}`
        : undefined,
    background:
      Comp === "button"
        ? active
          ? `rgba(${hexToRgb(t.accent)},0.16)`
          : "var(--nx-v6-control-bg, rgba(255,255,255,0.035))"
        : undefined,
    color: active ? t.accent : undefined,
    transform: `translate(${cx(offset)}px, ${cy(offset)}px)`,
  };

  return (
    <Comp
      className="nx-icon-btn"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={commonStyle}
    >
      <span
        style={{
          width: "100%",
          height: "100%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          pointerEvents: "none",
        }}
      >
        {icon}
      </span>
    </Comp>
  );
}

export function ToolbarCommandTrigger({
  t,
  onClick,
  condensed,
}: {
  t: ToolbarTheme;
  onClick: () => void;
  condensed?: boolean;
}) {
  const Comp = pickButtonRenderer(t) as any;
  const content = condensed ? (
    <Command size={13} style={{ opacity: 0.9 }} />
  ) : (
    <>
      <Search size={13} />
      <span style={{ fontSize: 10, fontWeight: 700 }}>Search</span>
    </>
  );

  return (
    <Comp
      className="nx-toolbar-command"
      onClick={onClick}
      title="Open command panel"
      aria-label="Open command panel"
      style={{
        minHeight: 28,
        borderRadius: 999,
        padding: condensed ? 0 : "0 9px",
        width: condensed ? 28 : undefined,
        gap: condensed ? 0 : 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border:
          Comp === "button"
            ? `1px solid rgba(${hexToRgb(t.accent)},0.24)`
            : undefined,
        background:
          Comp === "button"
            ? `linear-gradient(130deg, rgba(${hexToRgb(t.accent)},0.16), rgba(${hexToRgb(t.accent2)},0.07))`
            : undefined,
        color: t.accent,
      }}
    >
      {content}
    </Comp>
  );
}

export function ToolbarOverflowButton({
  t,
  onClick,
}: {
  t: ToolbarTheme;
  onClick: () => void;
}) {
  return (
    <button
      className="nx-icon-btn"
      title="More actions"
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        border: "1px solid var(--nx-v6-line, rgba(255,255,255,0.08))",
        background: "var(--nx-v6-control-bg, rgba(255,255,255,0.035))",
        color: "var(--nx-v6-text, inherit)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MoreHorizontal size={13} style={{ color: t.accent, opacity: 0.86 }} />
    </button>
  );
}

export function ToolbarTerminalButton({
  t,
  active,
  onClick,
  offset,
}: {
  t: ToolbarTheme;
  active: boolean;
  onClick: () => void;
  offset?: Offset;
}) {
  return (
    <ToolbarUtilityButton
      t={t}
      title={active ? "Close terminal" : "Open terminal"}
      active={active}
      onClick={onClick}
      offset={offset}
      icon={<Terminal size={14} style={{ opacity: active ? 1 : 0.65 }} />}
    />
  );
}

export type ToolbarViewItem = {
  id: ViewId;
  label: string;
  color: string;
  icon: any;
};
