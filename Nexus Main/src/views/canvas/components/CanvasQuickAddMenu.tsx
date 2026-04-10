import React from "react";
import type { NodeType } from "../../../store/canvasStore";
import type { CanvasWidgetPreset } from "../constants";

export function CanvasQuickAddMenu({
  quickAddPos,
  canvasSize,
  viewport,
  widgets,
  rgb,
  accent,
  mode,
  addWidgetNode,
  setQuickAddPos,
  createStarterPack,
  createMagicTemplate,
}: {
  quickAddPos: { x: number; y: number } | null;
  canvasSize: { w: number; h: number };
  viewport: { panX: number; panY: number; zoom: number };
  widgets: CanvasWidgetPreset[];
  rgb: string;
  accent: string;
  mode: "dark" | "light";
  addWidgetNode: (type: NodeType | "sticky", x?: number, y?: number) => void;
  setQuickAddPos: (next: { x: number; y: number } | null) => void;
  createStarterPack: (origin?: { x: number; y: number }) => void;
  createMagicTemplate: (payload: any) => void;
}) {
  if (!quickAddPos) return null;

  const menuW = 316;
  const menuH = Math.min(640, 228 + widgets.length * 56);
  const clampedX = Math.max(8, Math.min(quickAddPos.x, canvasSize.w - menuW - 8));
  const clampedY = Math.max(8, Math.min(quickAddPos.y, canvasSize.h - menuH - 8));

  const getCanvasPoint = () => ({
    x: (-viewport.panX + quickAddPos.x) / viewport.zoom,
    y: (-viewport.panY + quickAddPos.y) / viewport.zoom,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: clampedY,
        left: clampedX,
        zIndex: 300,
        background: mode === "dark" ? "#1a1a2e" : "#fff",
        border: `1px solid ${
          mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
        }`,
        borderRadius: 12,
        padding: 6,
        width: menuW - 12,
        maxHeight: menuH,
        overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        animation: "nexus-scale-in 0.15s cubic-bezier(0.4,0,0.2,1) both",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          opacity: 0.5,
          padding: "4px 8px",
          textTransform: "uppercase",
        }}
      >
        Add Element
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          opacity: 0.45,
          padding: "2px 8px 6px",
          textTransform: "uppercase",
        }}
      >
        Quick Packs
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "0 6px 8px" }}>
        <button
          onClick={() => {
            createStarterPack(getCanvasPoint());
            setQuickAddPos(null);
          }}
          style={{
            border: `1px solid rgba(${rgb},0.3)`,
            borderRadius: 8,
            background: `rgba(${rgb},0.12)`,
            color: accent,
            fontSize: 11,
            fontWeight: 700,
            padding: "8px 6px",
            cursor: "pointer",
          }}
        >
          Starter Pack
        </button>
        <button
          onClick={() => {
            createMagicTemplate({
              template: "mindmap",
              title: "Mindmap Pack",
              includeNotes: true,
              includeTasks: true,
            });
            setQuickAddPos(null);
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            color: "inherit",
            fontSize: 11,
            fontWeight: 700,
            padding: "8px 6px",
            cursor: "pointer",
          }}
        >
          Mindmap
        </button>
        <button
          onClick={() => {
            createMagicTemplate({
              template: "roadmap",
              title: "Roadmap Pack",
              includeNotes: true,
              includeTasks: true,
            });
            setQuickAddPos(null);
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            color: "inherit",
            fontSize: 11,
            fontWeight: 700,
            padding: "8px 6px",
            cursor: "pointer",
          }}
        >
          Roadmap
        </button>
        <button
          onClick={() => {
            createMagicTemplate({
              template: "risk-matrix",
              title: "Risk Pack",
              includeNotes: true,
              includeTasks: true,
            });
            setQuickAddPos(null);
          }}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            color: "inherit",
            fontSize: 11,
            fontWeight: 700,
            padding: "8px 6px",
            cursor: "pointer",
          }}
        >
          Risk Matrix
        </button>
      </div>
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.1)",
          margin: "0 8px 6px",
        }}
      />
      {widgets.map(({ type, icon: WIcon, label, description, category, accent: widgetAccent }) => (
        <button
          key={type}
          onClick={() => {
            const point = getCanvasPoint();
            addWidgetNode(type, point.x, point.y);
            setQuickAddPos(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "8px 10px",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 12,
            background: "transparent",
            color: mode === "dark" ? "#fff" : "#000",
            textAlign: "left",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(128,128,128,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              background: `${widgetAccent}22`,
              color: widgetAccent,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WIcon size={14} />
          </span>
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              minWidth: 0,
              flex: 1,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{label}</span>
            <span
              style={{
                fontSize: 10,
                opacity: 0.64,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {description}
            </span>
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 999,
              border: `1px solid ${widgetAccent}55`,
              color: widgetAccent,
              background: `${widgetAccent}1a`,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              flexShrink: 0,
            }}
          >
            {category}
          </span>
        </button>
      ))}
    </div>
  );
}
