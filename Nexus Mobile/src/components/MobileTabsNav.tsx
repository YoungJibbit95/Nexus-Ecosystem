import React from "react";
import type { View } from "./Sidebar";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { useMobile } from "../lib/useMobile";
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
  const mob = useMobile();
  const isTiny = mob.isMobile && Math.min(mob.screenW, mob.screenH) <= 430;
  const isTight = mob.isMobile && mob.screenH <= 900;
  const isLandscape = mob.isMobile && mob.isLandscape;

  return (
    <div
      className="nx-mobile-tabs-nav"
      style={{
        position: "relative",
        zIndex: 6,
        padding: isLandscape
          ? (isTiny ? "1px 4px 1px" : "2px 5px 2px")
          : isTight
          ? (isTiny ? "2px 5px 2px" : "3px 6px 2px")
          : (isTiny ? "3px 6px 2px" : "5px 8px 3px"),
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
          gap: isLandscape ? (isTiny ? 2 : 3) : (isTight ? (isTiny ? 3 : 4) : (isTiny ? 4 : 6)),
          overflowX: "auto",
          paddingBottom: isLandscape ? 0 : (isTight ? 0 : (isTiny ? 0 : 1)),
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
              className="nx-mobile-touch-button nx-mobile-tab-chip"
              key={viewId}
              onClick={() => onChange(viewId)}
              style={{
                borderRadius: isLandscape ? (isTiny ? 6 : 7) : (isTight ? (isTiny ? 7 : 8) : (isTiny ? 8 : 9)),
                border: `1px solid ${active ? `rgba(${accentRgb},0.38)` : "rgba(255,255,255,0.12)"}`,
                background: active
                  ? `linear-gradient(135deg, rgba(${accentRgb},0.24), rgba(${accentRgb},0.12))`
                  : "rgba(255,255,255,0.04)",
                color: active ? t.accent : "inherit",
              padding: isLandscape
                  ? (isTiny ? "2px 5px" : "3px 6px")
                  : isTight
                  ? (isTiny ? "3px 6px" : "4px 7px")
                  : (isTiny ? "4px 7px" : "5px 8px"),
                fontSize: isLandscape ? (isTiny ? 8 : 9) : (isTight ? (isTiny ? 8 : 9) : (isTiny ? 9 : 10)),
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>
                {VIEW_GLYPH[viewId] || "•"}
              </span>
              {!isLandscape ? title : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
