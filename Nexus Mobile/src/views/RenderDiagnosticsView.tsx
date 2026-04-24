import React from "react";
import { Activity, LayoutPanelTop } from "lucide-react";
import { RenderDiagnosticsPanel } from "../components/render/RenderDiagnosticsPanel";
import { ToolbarPreviewMatrix } from "../components/render/ToolbarPreviewMatrix";
import { useTheme } from "../store/themeStore";
import { useMobile } from "../lib/useMobile";
import { MobileSheet } from "../components/mobile/MobileViewContract";

export function RenderDiagnosticsView() {
  const t = useTheme();
  const mob = useMobile();
  const [toolbarPreviewOpen, setToolbarPreviewOpen] = React.useState(false);

  return (
    <div
      className="nx-mobile-view-screen nx-mobile-scroll-root"
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

      {mob.isMobile ? (
        <>
          <RenderDiagnosticsPanel />
          <button
            onClick={() => setToolbarPreviewOpen(true)}
            style={{
              padding: "9px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <LayoutPanelTop size={14} style={{ color: t.accent }} />
            Toolbar Preview öffnen
          </button>
        </>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 9,
          }}
        >
          <RenderDiagnosticsPanel />
          <ToolbarPreviewMatrix />
        </div>
      )}

      <MobileSheet
        open={mob.isMobile && toolbarPreviewOpen}
        onClose={() => setToolbarPreviewOpen(false)}
        title="Toolbar Preview"
        mode="bottom"
      >
        <div style={{ height: "70vh", padding: "10px" }}>
          <ToolbarPreviewMatrix />
        </div>
      </MobileSheet>
    </div>
  );
}
