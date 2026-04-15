import React from "react";
import { Activity } from "lucide-react";
import { RenderDiagnosticsPanel } from "../components/render/RenderDiagnosticsPanel";
import { ToolbarPreviewMatrix } from "../components/render/ToolbarPreviewMatrix";
import { useTheme } from "../store/themeStore";
import { useMobile } from "../lib/useMobile";

export function RenderDiagnosticsView() {
  const t = useTheme();
  const mob = useMobile();

  return (
    <div
      style={{
        height: "100%",
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 10px",
          borderRadius: 11,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        }}
      >
        <Activity size={15} style={{ color: t.accent }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>Render Diagnostics</div>
          <div style={{ fontSize: 10, opacity: 0.62 }}>
            Dev-only Diagnoseansicht für Rendering und Toolbar-Komposition.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: mob.isMobile ? "1fr" : "1fr 1fr",
          gap: 9,
        }}
      >
        <RenderDiagnosticsPanel />
        <ToolbarPreviewMatrix />
      </div>
    </div>
  );
}
