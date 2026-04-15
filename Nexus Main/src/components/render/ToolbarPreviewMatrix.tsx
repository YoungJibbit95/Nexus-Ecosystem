import React from "react";
import { resolveToolbarSceneSpec } from "@nexus/core";

const MODES = ["island", "full-width", "spotlight"] as const;
const WIDTHS = [420, 760, 1080];

export function ToolbarPreviewMatrix() {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700 }}>
        Toolbar Preview Matrix
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {MODES.map((mode) => (
          <div
            key={mode}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
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
                compact: width < 760,
                platform: "desktop",
              });
              const activeSlots = Object.entries(spec.slots)
                .filter(([, slot]) => slot.visible)
                .map(([slot]) => slot.replace("Slot", ""));
              return (
                <div
                  key={`${mode}-${width}`}
                  style={{
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "6px 7px",
                    fontSize: 10,
                  }}
                >
                  <div style={{ opacity: 0.58, marginBottom: 3 }}>{width}px</div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    {activeSlots.join(" · ")}
                  </div>
                  <div style={{ opacity: 0.58 }}>
                    nav {spec.maxVisibleNavActions} · util {spec.maxVisibleUtilityActions}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

