import React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, GripVertical, Sparkles } from "lucide-react";
import { Glass } from "../../components/Glass";
import { hexToRgb } from "../../lib/utils";
import { clampX, type Widget } from "./dashboardLayout";
import { DashboardActionButton } from "./DashboardActionButton";
import { DashboardWidgetErrorBoundary } from "./DashboardWidgetErrorBoundary";

type PointerDragState = {
  widgetId: string;
  pointerId: number;
  originCell: { x: number; y: number };
  targetCell: { x: number; y: number };
  targetWidgetId: string | null;
  clientX: number;
  clientY: number;
  span: 1 | 2;
};

export type DashboardWidgetGridSectionProps = {
  gridRef: React.RefObject<HTMLDivElement | null>;
  visibleWidgets: Widget[];
  hiddenWidgets: Widget[];
  snapRowHeight: number;
  contentMotion: any;
  contentFramerEase: any;
  widgetEntryDelayMs: number;
  dragState: PointerDragState | null;
  dragWidgetId: string | null;
  dropCell: { x: number; y: number } | null;
  draggedWidget: Widget | null;
  editLayout: boolean;
  hoverWidgetId: string | null;
  setHoverWidgetId: React.Dispatch<React.SetStateAction<string | null>>;
  layoutLocked: boolean;
  beginPointerDrag: (event: React.PointerEvent, widgetId: any) => void;
  setSpan: (widgetId: any, span: 1 | 2) => void;
  toggleWidget: (widgetId: any) => void;
  t: any;
  rgb: string;
  widgetContent: Partial<Record<string, React.ReactNode>>;
  resetLayout: () => void;
};

export function DashboardWidgetGridSection({
  gridRef,
  visibleWidgets,
  hiddenWidgets,
  snapRowHeight,
  contentMotion,
  contentFramerEase,
  widgetEntryDelayMs,
  dragState,
  dragWidgetId,
  dropCell,
  draggedWidget,
  editLayout,
  hoverWidgetId,
  setHoverWidgetId,
  layoutLocked,
  beginPointerDrag,
  setSpan,
  toggleWidget,
  t,
  rgb,
  widgetContent,
  resetLayout,
}: DashboardWidgetGridSectionProps) {
  const targetWidgetLabel =
    dragState?.targetWidgetId
      ? visibleWidgets.find((widget) => widget.id === dragState.targetWidgetId)?.label
      : null;

  return (
    <>
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gridAutoRows: `minmax(${snapRowHeight}px, auto)`,
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {visibleWidgets.length === 0 ? (
          <Glass
            style={{
              gridColumn: "1 / span 2",
              minHeight: snapRowHeight,
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              Keine sichtbaren Widgets
            </div>
            <div style={{ fontSize: 11, opacity: 0.65, maxWidth: 420 }}>
              Das gespeicherte Dashboard-Layout hat aktuell alle Widgets
              ausgeblendet. Du kannst das Layout hier direkt zurücksetzen.
            </div>
            <DashboardActionButton
              onClick={resetLayout}
              liquidColor={t.accent}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid rgba(${hexToRgb(t.accent)},0.3)`,
                background: `rgba(${hexToRgb(t.accent)},0.12)`,
                color: t.accent,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Standard-Layout wiederherstellen
            </DashboardActionButton>
          </Glass>
        ) : (
          visibleWidgets.map((w, idx) => (
            <motion.div
              key={w.id}
              layout
              initial={
                contentMotion.allowEntry
                  ? { opacity: 0, y: 7, scale: 0.998 }
                  : false
              }
              animate={{
                opacity: 1,
                y: 0,
                scale:
                  dragState?.widgetId === w.id
                    ? 1.02
                    : dragState?.targetWidgetId === w.id
                      ? 1.01
                      : !editLayout &&
                          contentMotion.allowHover &&
                          hoverWidgetId === w.id
                        ? Math.max(1.002, contentMotion.hoverScale + 0.002)
                        : 1,
              }}
              transition={{
                opacity: {
                  duration: Math.max(
                    0.14,
                    contentMotion.timings.transformMs / 1000,
                  ),
                  ease: contentFramerEase,
                  delay: Math.min(idx, 14) * (widgetEntryDelayMs / 1000),
                },
                y: {
                  duration: Math.max(
                    0.14,
                    contentMotion.timings.transformMs / 1000,
                  ),
                  ease: contentFramerEase,
                  delay: Math.min(idx, 14) * (widgetEntryDelayMs / 1000),
                },
                scale: {
                  type: "spring",
                  stiffness: contentMotion.allowStagger ? 430 : 390,
                  damping: contentMotion.allowStagger ? 26 : 30,
                  mass: 0.68,
                },
              }}
              onHoverStart={() => {
                if (editLayout || !contentMotion.allowHover) return;
                setHoverWidgetId(w.id);
              }}
              onHoverEnd={() => {
                setHoverWidgetId((current) => (current === w.id ? null : current));
              }}
              style={{
                ["--nx-widget-id" as any]: w.id,
                gridColumn: `${w.x} / span ${w.span}`,
                gridRow: `${w.y} / span 1`,
                minHeight: 0,
                position: "relative",
                borderRadius: 12,
                border:
                  editLayout &&
                  dragWidgetId &&
                  dropCell?.x === clampX(w.x, draggedWidget?.span ?? 1) &&
                  dropCell?.y === w.y
                    ? `1px dashed ${t.accent}`
                    : "1px solid transparent",
              }}
              data-dashboard-widget-id={w.id}
            >
              {editLayout && (
                <div
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    right: 7,
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    padding: "4px 6px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 9,
                    fontWeight: 700,
                    opacity: 0.95,
                  }}
                >
                  <button
                    onPointerDown={(event) => beginPointerDrag(event, w.id)}
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "inherit",
                      cursor: layoutLocked ? "not-allowed" : "grab",
                      opacity: layoutLocked ? 0.35 : 0.85,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 4px",
                      borderRadius: 8,
                    }}
                    disabled={layoutLocked}
                    title="Widget ziehen und mit anderem tauschen"
                  >
                    <GripVertical size={10} />
                    {w.label}
                  </button>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <DashboardActionButton
                      onClick={() => setSpan(w.id, 1)}
                      liquidColor={w.span === 1 ? t.accent : t.accent2}
                      style={{
                        borderRadius: 7,
                        border: `1px solid ${w.span === 1 ? t.accent : "rgba(255,255,255,0.16)"}`,
                        background: w.span === 1 ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.05)",
                        color: w.span === 1 ? t.accent : "inherit",
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "2px 6px",
                        cursor: layoutLocked ? "not-allowed" : "pointer",
                      }}
                      disabled={layoutLocked}
                    >
                      1w
                    </DashboardActionButton>
                    <DashboardActionButton
                      onClick={() => setSpan(w.id, 2)}
                      liquidColor={w.span === 2 ? t.accent : t.accent2}
                      style={{
                        borderRadius: 7,
                        border: `1px solid ${w.span === 2 ? t.accent : "rgba(255,255,255,0.16)"}`,
                        background: w.span === 2 ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.05)",
                        color: w.span === 2 ? t.accent : "inherit",
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "2px 6px",
                        cursor: layoutLocked ? "not-allowed" : "pointer",
                      }}
                      disabled={layoutLocked}
                    >
                      2w
                    </DashboardActionButton>
                    <DashboardActionButton
                      onClick={() => toggleWidget(w.id)}
                      liquidColor={w.visible ? t.accent : t.accent2}
                      style={{
                        width: 24,
                        height: 20,
                        borderRadius: 7,
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: "rgba(255,255,255,0.05)",
                        color: w.visible ? t.accent : "rgba(255,255,255,0.68)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        cursor: layoutLocked ? "not-allowed" : "pointer",
                      }}
                      disabled={layoutLocked}
                    >
                      {w.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                    </DashboardActionButton>
                  </div>
                </div>
              )}
              <DashboardWidgetErrorBoundary
                widgetLabel={w.label}
                onResetLayout={resetLayout}
              >
                {widgetContent[w.id] ?? (
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: 14,
                      fontSize: 12,
                      opacity: 0.78,
                    }}
                  >
                    {w.label} konnte nicht geladen werden.
                  </div>
                )}
              </DashboardWidgetErrorBoundary>
            </motion.div>
          ))
        )}
        {editLayout && dragWidgetId && dropCell && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              contentMotion.allowHover
                ? {
                    type: "spring",
                    stiffness: contentMotion.allowStagger ? 360 : 334,
                    damping: contentMotion.allowStagger ? 23 : 26,
                    mass: contentMotion.allowStagger ? 0.72 : 0.78,
                    ease: contentFramerEase,
                  }
                : {
                    type: "tween",
                    duration: Math.max(0.12, contentMotion.timings.transformMs / 1000),
                    ease: contentFramerEase,
                  }
            }
            style={{
              gridColumn: `${dropCell.x} / span ${draggedWidget?.span ?? 1}`,
              gridRow: `${dropCell.y} / span 1`,
              borderRadius: 12,
              border: `1px dashed ${t.accent}`,
              background: `linear-gradient(135deg, rgba(${hexToRgb(t.accent)},0.16), rgba(${hexToRgb(t.accent2)},0.1))`,
              boxShadow: `0 0 20px rgba(${hexToRgb(t.accent)},0.3)`,
              minHeight: snapRowHeight,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: t.accent,
            }}
          >
            {targetWidgetLabel
              ? `Swap mit ${targetWidgetLabel}`
              : "Loslassen zum Platzieren"}
          </motion.div>
        )}
        {editLayout && dragState && draggedWidget && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              contentMotion.allowHover
                ? {
                    type: "spring",
                    duration: Math.max(0.12, contentMotion.timings.transformMs / 1000),
                    stiffness: contentMotion.allowStagger ? 374 : 346,
                    damping: contentMotion.allowStagger ? 24 : 27,
                    mass: contentMotion.allowStagger ? 0.7 : 0.76,
                    ease: contentFramerEase,
                  }
                : {
                    type: "tween",
                    duration: Math.max(0.12, contentMotion.timings.transformMs / 1000),
                    ease: contentFramerEase,
                  }
            }
            style={{
              position: "fixed",
              left: dragState.clientX + 12,
              top: dragState.clientY + 12,
              zIndex: 140,
              pointerEvents: "none",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(17,20,31,0.88)",
              backdropFilter: "blur(10px)",
              padding: "6px 8px",
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
            }}
          >
            {draggedWidget.icon} {draggedWidget.label}
          </motion.div>
        )}
      </div>
      {editLayout && hiddenWidgets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: Math.max(0.14, contentMotion.timings.materialMs / 1000),
            ease: contentFramerEase,
          }}
          style={{ marginTop: 12 }}
        >
          <Glass
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  opacity: 0.62,
                }}
              >
                Hidden Widgets Tray
              </span>
              <span style={{ fontSize: 10, opacity: 0.58 }}>
                {hiddenWidgets.length} versteckt
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hiddenWidgets.map((widget) => (
                <DashboardActionButton
                  key={`hidden-${widget.id}`}
                  onClick={() => toggleWidget(widget.id)}
                  liquidColor={t.accent}
                  style={{
                    borderRadius: 999,
                    border: `1px solid rgba(${rgb},0.28)`,
                    background: `rgba(${rgb},0.13)`,
                    color: t.accent,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "6px 10px",
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
        </motion.div>
      ) : null}
      <div style={{ marginTop: 12, textAlign: "center", fontSize: 10, opacity: 0.32 }}>
        <Sparkles size={10} style={{ display: "inline", marginRight: 5 }} />
        Widget-Swap: Ziehe ein Widget direkt auf ein anderes für einen Platztausch.
      </div>
    </>
  );
}
