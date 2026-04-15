import React from "react";
import type { View } from "./Sidebar";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { NEXUS_VIEW_META } from "@nexus/core";

const VIEW_GLYPH: Record<string, string> = {
  dashboard: "◉",
  notes: "✎",
  code: "</>",
  tasks: "✓",
  reminders: "⏰",
  canvas: "◌",
  files: "▣",
  flux: "⚡",
  devtools: "⌘",
  diagnostics: "◈",
  settings: "⚙",
  info: "i",
};

export function MobileTabsNav({
  view,
  availableViews,
  onChange,
}: {
  view: View;
  availableViews: View[];
  onChange: (next: View) => void;
}) {
  const t = useTheme();
  const accentRgb = hexToRgb(t.accent);

  return (
    <div
      style={{
        position: "relative",
        zIndex: 6,
        padding: "8px 10px 6px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background:
          t.mode === "dark"
            ? "linear-gradient(180deg, rgba(14,16,26,0.7), rgba(10,12,20,0.48))"
            : "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(245,248,255,0.62))",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 7,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {availableViews.map((viewId) => {
          const active = viewId === view;
          const meta = NEXUS_VIEW_META[viewId];
          const title =
            meta?.title ||
            viewId.charAt(0).toUpperCase() + viewId.slice(1).replace(/-/g, " ");
          return (
            <button
              key={viewId}
              onClick={() => onChange(viewId)}
              style={{
                borderRadius: 10,
                border: `1px solid ${active ? `rgba(${accentRgb},0.38)` : "rgba(255,255,255,0.12)"}`,
                background: active
                  ? `linear-gradient(135deg, rgba(${accentRgb},0.24), rgba(${accentRgb},0.12))`
                  : "rgba(255,255,255,0.04)",
                color: active ? t.accent : "inherit",
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>
                {VIEW_GLYPH[viewId] || "•"}
              </span>
              {title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
