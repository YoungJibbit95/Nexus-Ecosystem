import React from "react";
import { resolveToolbarSceneSpec } from "@nexus/core";

const MODES = ["island", "full-width", "spotlight"] as const;
const WIDTHS = [320, 440, 620];

export function ToolbarPreviewMatrix() {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        padding: "9px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>
        Toolbar Matrix
      </div>
      {MODES.map((mode) => (
        <div
          key={mode}
          style={{
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            padding: 7,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
            {mode}
          </div>
          {WIDTHS.map((width) => {
            const spec = resolveToolbarSceneSpec({
              mode,
              width,
              expanded: mode === "island",
              compact: width < 480,
              platform: "mobile",
            });
            const visibleCount = Object.values(spec.slots).filter((slot) => slot.visible).length;
            return (
              <div
                key={`${mode}-${width}`}
                style={{
                  borderRadius: 7,
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "5px 6px",
                  fontSize: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span style={{ opacity: 0.6 }}>{width}px</span>
                <span style={{ fontWeight: 700 }}>
                  slots {visibleCount} · nav {spec.maxVisibleNavActions}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

