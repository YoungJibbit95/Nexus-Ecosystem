import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Eye } from "lucide-react";
import { Glass } from "../../components/Glass";
import { EmptyState } from "../../components/ViewHeader";
import { DashboardActionButton } from "./mobileDashboardPrimitives";

export function MobileDashboardHiddenTray({
  editLayout,
  heroMotion,
  heroFramerEase,
  hidden,
  toggleWidget,
  t,
  rgb,
  layoutLocked,
}: any) {
  return (
    <AnimatePresence>
      {editLayout && (
        <motion.div
          initial={heroMotion.allowEntry ? { opacity: 0, y: -10 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: Math.max(0.16, heroMotion.timings.transformMs / 1000),
            ease: heroFramerEase,
          }}
        >
          {hidden.length > 0 ? (
            <Glass style={{ padding: "10px 11px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.68, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Hidden Widgets Tray
                </span>
                <span style={{ fontSize: 10, opacity: 0.58 }}>{hidden.length} versteckt</span>
              </div>
              <div className="nx-mobile-row-scroll" style={{ gap: 6 }}>
                {hidden.map((widget: any) => (
                  <DashboardActionButton
                    key={`hidden-${widget.id}`}
                    onClick={() => toggleWidget(widget.id)}
                    liquidColor={t.accent}
                    style={{
                      borderRadius: 999,
                      border: `1px solid rgba(${rgb},0.28)`,
                      background: `rgba(${rgb},0.14)`,
                      color: t.accent,
                      fontSize: 10.5,
                      fontWeight: 700,
                      minHeight: 34,
                      padding: "7px 10px",
                      cursor: layoutLocked ? "not-allowed" : "pointer",
                      opacity: layoutLocked ? 0.5 : 1,
                    }}
                    disabled={layoutLocked}
                  >
                    <Eye size={11} />
                    {widget.icon} {widget.label}
                  </DashboardActionButton>
                ))}
              </div>
            </Glass>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MobileDashboardEmptyWidgetsState({
  visible,
  setEditLayout,
  t,
  rgb,
}: any) {
  if (visible.length !== 0) return null;
  return (
    <Glass>
      <EmptyState
        icon={<AlertCircle size={28} style={{ opacity: 0.6 }} />}
        title="Keine Widgets sichtbar"
        description="Aktiviere mindestens ein Widget im Layout-Editor."
        action={
          <DashboardActionButton
            onClick={() => setEditLayout(true)}
            liquidColor={t.accent}
            style={{
              border: `1px solid rgba(${rgb},0.25)`,
              background: `rgba(${rgb},0.12)`,
              color: t.accent,
              borderRadius: 9,
              minHeight: 36,
              padding: "9px 12px",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            Layout öffnen
          </DashboardActionButton>
        }
      />
    </Glass>
  );
}

export function MobileDashboardWidgetSafeModeNotice({
  error,
  resetLayout,
  t,
  rgb,
}: {
  error: string | null;
  resetLayout: () => void;
  t: any;
  rgb: string;
}) {
  if (!error) return null;
  return (
    <Glass
      style={{
        padding: "10px 11px",
        marginBottom: 12,
        border: "1px solid rgba(255,69,58,0.4)",
        background: "rgba(255,69,58,0.12)",
      }}
    >
      <div className="nx-mobile-row-scroll" style={{ gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#ffd6d1" }}>
          Dashboard läuft im Safe Mode (Widget-Build-Fehler erkannt)
        </span>
        <DashboardActionButton
          onClick={resetLayout}
          liquidColor={t.accent}
          style={{
            borderRadius: 8,
            border: `1px solid rgba(${rgb},0.3)`,
            background: `rgba(${rgb},0.12)`,
            color: t.accent,
            fontSize: 10.5,
            fontWeight: 700,
            minHeight: 34,
            padding: "7px 10px",
            cursor: "pointer",
          }}
        >
          Layout resetten
        </DashboardActionButton>
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          opacity: 0.72,
          wordBreak: "break-word",
        }}
      >
        Fehler: {error}
      </div>
    </Glass>
  );
}
