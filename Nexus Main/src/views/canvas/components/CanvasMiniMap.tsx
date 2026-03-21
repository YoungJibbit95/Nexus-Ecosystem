import React from "react";
import { useTheme } from "../../../store/themeStore";
import type { CanvasNode, Viewport } from "../../../store/canvasStore";

export function CanvasMiniMap({
  nodes,
  viewport,
  canvasW,
  canvasH,
}: {
  nodes: CanvasNode[];
  viewport: Viewport;
  canvasW: number;
  canvasH: number;
}) {
  const t = useTheme();
  const mapWidth = 160;
  const mapHeight = 110;
  const padding = 40;

  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((node) => node.x)) - padding;
  const maxX = Math.max(...nodes.map((node) => node.x + node.width)) + padding;
  const minY = Math.min(...nodes.map((node) => node.y)) - padding;
  const maxY = Math.max(...nodes.map((node) => node.y + node.height)) + padding;

  const rangeX = Math.max(maxX - minX, 100);
  const rangeY = Math.max(maxY - minY, 100);
  const scale = Math.min(mapWidth / rangeX, mapHeight / rangeY) * 0.85;

  const toMapX = (x: number) =>
    (x - minX) * scale + (mapWidth - rangeX * scale) / 2;
  const toMapY = (y: number) =>
    (y - minY) * scale + (mapHeight - rangeY * scale) / 2;

  const viewportLeft =
    (-viewport.panX / viewport.zoom - minX) * scale +
    (mapWidth - rangeX * scale) / 2;
  const viewportTop =
    (-viewport.panY / viewport.zoom - minY) * scale +
    (mapHeight - rangeY * scale) / 2;
  const viewportWidth = (canvasW / viewport.zoom) * scale;
  const viewportHeight = (canvasH / viewport.zoom) * scale;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 50,
        width: mapWidth,
        height: mapHeight,
        borderRadius: 10,
        background:
          t.mode === "dark"
            ? "rgba(10,10,20,0.8)"
            : "rgba(240,240,255,0.85)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${t.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <svg width={mapWidth} height={mapHeight}>
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
        <rect
          x={viewportLeft}
          y={viewportTop}
          width={Math.min(viewportWidth, mapWidth)}
          height={Math.min(viewportHeight, mapHeight)}
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
