import React from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical } from "lucide-react";
import { DashboardActionButton } from "./mobileDashboardPrimitives";

export function MobileDashboardWidgetEditChrome({
  w,
  beginPointerDrag,
  cancelLongPress,
  longPressOriginRef,
  dragState,
  setSpan,
  move,
  toggleWidget,
  t,
  rgb,
  layoutLocked,
  mob,
}: any) {
  const dragActive = Boolean(dragState)
  const isDraggingThisWidget = dragState?.widgetId === w.id
  const controlsLocked = layoutLocked || dragActive

  return (
    <div
      style={{
        position: "absolute",
        top: 7,
        left: 7,
        right: 7,
        zIndex: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        padding: "4px 6px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.34)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <button
        type="button"
        onPointerDown={(event) => beginPointerDrag(event, w.id)}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerMove={(event) => {
          const origin = longPressOriginRef.current;
          if (!origin || origin.widgetId !== w.id || dragState) return;
          if (
            Math.abs(event.clientX - origin.x) > 8 ||
            Math.abs(event.clientY - origin.y) > 8
          ) {
            cancelLongPress();
          }
        }}
        disabled={layoutLocked}
        style={{
          border: "none",
          background: "transparent",
          color: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 4px",
          borderRadius: 8,
          fontSize: 9,
          fontWeight: 700,
          cursor: layoutLocked ? "not-allowed" : isDraggingThisWidget ? "grabbing" : "grab",
          opacity: layoutLocked ? 0.35 : isDraggingThisWidget ? 1 : 0.9,
        }}
        title="Long press und ziehen zum Tauschen (Pfeile sind Fallback)"
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
            cursor: controlsLocked ? "not-allowed" : "pointer",
            opacity: controlsLocked ? 0.55 : 1,
          }}
          disabled={controlsLocked}
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
            cursor: mob.isMobile || controlsLocked ? "not-allowed" : "pointer",
            opacity: mob.isMobile || controlsLocked ? 0.55 : 1,
          }}
          disabled={controlsLocked || mob.isMobile}
        >
          2w
        </DashboardActionButton>
        <DashboardActionButton
          onClick={() => move(w.id, -1)}
          liquidColor={t.accent2}
          style={{
            width: 22,
            height: 20,
            borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: controlsLocked ? "not-allowed" : "pointer",
            opacity: controlsLocked ? 0.55 : 1,
          }}
          disabled={controlsLocked}
        >
          <ChevronUp size={10} />
        </DashboardActionButton>
        <DashboardActionButton
          onClick={() => move(w.id, 1)}
          liquidColor={t.accent2}
          style={{
            width: 22,
            height: 20,
            borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: controlsLocked ? "not-allowed" : "pointer",
            opacity: controlsLocked ? 0.55 : 1,
          }}
          disabled={controlsLocked}
        >
          <ChevronDown size={10} />
        </DashboardActionButton>
        <DashboardActionButton
          onClick={() => toggleWidget(w.id)}
          liquidColor={w.visible ? t.accent : t.accent2}
          style={{
            width: 22,
            height: 20,
            borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.05)",
            color: w.visible ? t.accent : "rgba(255,255,255,0.68)",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: controlsLocked ? "not-allowed" : "pointer",
            opacity: controlsLocked ? 0.55 : 1,
          }}
          disabled={controlsLocked}
        >
          {w.visible ? <Eye size={10} /> : <EyeOff size={10} />}
        </DashboardActionButton>
      </div>
    </div>
  );
}
