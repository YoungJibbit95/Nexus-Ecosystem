import React from "react";
import { Activity } from "lucide-react";
import { RenderDiagnosticsPanel } from "../components/render/RenderDiagnosticsPanel";
import { ToolbarPreviewMatrix } from "../components/render/ToolbarPreviewMatrix";
import { useTheme } from "../store/themeStore";

export function RenderDiagnosticsView() {
  const t = useTheme();

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        }}
      >
        <Activity size={16} style={{ color: t.accent }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Render Diagnostics</div>
          <div style={{ fontSize: 11, opacity: 0.62 }}>
            Dev-only Analyseansicht für Pipeline- und Toolbar-Zustand.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <RenderDiagnosticsPanel />
        <ToolbarPreviewMatrix />
      </div>
    </div>
  );
}
