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
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "5px 9px",
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
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
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
