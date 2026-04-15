import React from "react";
import {
  Command,
  MoreHorizontal,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import { hexToRgb } from "../../lib/utils";
import { LiquidGlassButton } from "../LiquidGlassButton";
import type { ViewId } from "./constants";

type ToolbarTheme = any;

type Offset = { x?: number; y?: number };

const cx = (offset?: Offset) => offset?.x ?? 0;
const cy = (offset?: Offset) => offset?.y ?? 0;

const pickButtonRenderer = (theme: ToolbarTheme) =>
  (theme?.glassmorphism as any)?.panelRenderer === "liquid-glass"
    ? LiquidGlassButton
    : "button";

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
        gap: compact ? 8 : 10,
        minWidth: 0,
        transform: `translate(${cx(offset)}px, ${cy(offset)}px)`,
      }}
    >
      <div
        style={{
          width: compact ? 24 : 28,
          height: compact ? 24 : 28,
          borderRadius: compact ? 9 : 11,
          background: `radial-gradient(circle at 30% 25%, rgba(${rgb},0.42), rgba(${rgb},0.12))`,
          border: `1px solid rgba(${rgb},0.52)`,
          boxShadow: `0 10px 24px rgba(${rgb},0.22)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Sparkles size={compact ? 11 : 12} style={{ color: t.accent }} />
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
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Nexus Dock
        </span>
        {!compact ? (
          <span style={{ fontSize: 9, opacity: 0.5, whiteSpace: "nowrap" }}>
            Island Scene
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
        gap: compact ? 8 : 10,
        minWidth: 0,
        transform: `translate(${cx(offset)}px, ${cy(offset)}px)`,
      }}
    >
      <div
        style={{
          height: compact ? 24 : 28,
          borderRadius: compact ? 8 : 10,
          border: `1px solid rgba(${rgb},0.46)`,
          background: `linear-gradient(125deg, rgba(${rgb},0.28), rgba(${rgb},0.08))`,
          padding: compact ? "0 8px" : "0 10px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 8px 22px rgba(${rgb},0.2)`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: compact ? 10 : 11,
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
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Nexus Dock
        </span>
        {!compact ? (
          <span style={{ fontSize: 9, opacity: 0.5, whiteSpace: "nowrap" }}>
            Full Width Rail
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
        gap: compact ? 5 : 7,
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
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.05)",
        padding: "4px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.46, fontWeight: 700 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
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
        gap: compact ? 0 : dense ? 4 : 6,
        borderRadius: 10,
        border: "1px solid transparent",
        background: active ? `rgba(${rgb},0.22)` : "transparent",
        color: active ? color : "inherit",
        padding: compact ? "6px 8px" : dense ? "5px 7px" : "6px 9px",
        fontSize: dense ? 10 : 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      <Icon size={dense ? 12 : 13} style={{ opacity: active ? 1 : 0.72 }} />
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
    width: 32,
    height: 32,
    minHeight: 32,
    padding: 0,
    borderRadius: 10,
    border:
      Comp === "button"
        ? `1px solid ${active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}`
        : undefined,
    background:
      Comp === "button"
        ? active
          ? `rgba(${hexToRgb(t.accent)},0.2)`
          : "rgba(255,255,255,0.04)"
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
    <Command size={14} style={{ opacity: 0.9 }} />
  ) : (
    <>
      <Search size={14} />
      <span style={{ fontSize: 11, fontWeight: 700 }}>Search</span>
    </>
  );

  return (
    <Comp
      className="nx-toolbar-command"
      onClick={onClick}
      title="Open command panel"
      aria-label="Open command panel"
      style={{
        minHeight: 32,
        borderRadius: 10,
        padding: condensed ? 0 : "0 10px",
        width: condensed ? 32 : undefined,
        gap: condensed ? 0 : 7,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border:
          Comp === "button"
            ? `1px solid rgba(${hexToRgb(t.accent)},0.3)`
            : undefined,
        background:
          Comp === "button"
            ? `linear-gradient(130deg, rgba(${hexToRgb(t.accent)},0.22), rgba(${hexToRgb(t.accent2)},0.08))`
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
        width: 32,
        height: 32,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MoreHorizontal size={14} style={{ color: t.accent, opacity: 0.86 }} />
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
      icon={<Terminal size={15} style={{ opacity: active ? 1 : 0.65 }} />}
    />
  );
}

export type ToolbarViewItem = {
  id: ViewId;
  label: string;
  color: string;
  icon: any;
};
