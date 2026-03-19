import React from "react";
import { Zap } from "lucide-react";

export function StatusPill({
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
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.45, fontWeight: 700 }}>
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

export function DockLogo({
  t,
  rgb,
  compact,
}: {
  t: any;
  rgb: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        width: compact ? 24 : 30,
        height: compact ? 24 : 30,
        borderRadius: compact ? 8 : 10,
        background: `linear-gradient(135deg, rgba(${rgb},0.34), rgba(${rgb},0.1))`,
        border: `1px solid rgba(${rgb},0.48)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 14px rgba(${rgb},0.3)`,
        flexShrink: 0,
      }}
    >
      <Zap size={compact ? 11 : 14} style={{ color: t.accent }} />
    </div>
  );
}
