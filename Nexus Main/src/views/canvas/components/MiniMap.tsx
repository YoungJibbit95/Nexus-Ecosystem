import React from "react";
import { useTheme } from "../../../store/themeStore";
import type { CanvasNode } from "../../../store/canvasStore";

function MiniMap({
  nodes,
  viewport,
  canvasW,
  canvasH,
}: {
  nodes: CanvasNode[];
  viewport: { panX: number; panY: number; zoom: number };
  canvasW: number;
  canvasH: number;
}) {
  const t = useTheme();
  const MAP_W = 160;
  const MAP_H = 110;
  const PADDING = 40;

  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.x)) - PADDING;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + PADDING;
  const minY = Math.min(...nodes.map((n) => n.y)) - PADDING;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + PADDING;

  const rangeX = Math.max(maxX - minX, 100);
  const rangeY = Math.max(maxY - minY, 100);
  const scale = Math.min(MAP_W / rangeX, MAP_H / rangeY) * 0.85;

  const toMapX = (x: number) =>
    (x - minX) * scale + (MAP_W - rangeX * scale) / 2;
  const toMapY = (y: number) =>
    (y - minY) * scale + (MAP_H - rangeY * scale) / 2;

  // Viewport rect
  const vpLeft =
    (-viewport.panX / viewport.zoom - minX) * scale +
    (MAP_W - rangeX * scale) / 2;
  const vpTop =
    (-viewport.panY / viewport.zoom - minY) * scale +
    (MAP_H - rangeY * scale) / 2;
  const vpW = (canvasW / viewport.zoom) * scale;
  const vpH = (canvasH / viewport.zoom) * scale;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 50,
        width: MAP_W,
        height: MAP_H,
        borderRadius: 10,
        background:
          t.mode === "dark" ? "rgba(10,10,20,0.8)" : "rgba(240,240,255,0.85)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <svg width={MAP_W} height={MAP_H}>
        {nodes.map((node) => (
          <rect
            key={node.id}
            x={toMapX(node.x)}
            y={toMapY(node.y)}
            width={Math.max(node.width * scale, 4)}
            height={Math.max(node.height * scale, 3)}
            rx={2}
            fill={node.color || t.accent}
            opacity={0.7}
          />
        ))}
        {/* Viewport indicator */}
        <rect
          x={vpLeft}
          y={vpTop}
          width={Math.min(vpW, MAP_W)}
          height={Math.min(vpH, MAP_H)}
          fill="none"
          stroke={t.accent}
          strokeWidth={1}
          opacity={0.8}
          rx={2}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 5,
          fontSize: 9,
          opacity: 0.4,
          fontFamily: "monospace",
          letterSpacing: 0.5,
        }}
      >
        MINIMAP
      </div>
    </div>
  );
}

// ─── TOOLBAR BUTTON ───

export { MiniMap };
