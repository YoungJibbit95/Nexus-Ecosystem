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
  const MAP_W = 168;
  const MAP_H = 116;
  const INSET = 10;
  const PADDING = 80;
  const safeZoom =
    Number.isFinite(viewport.zoom) && viewport.zoom > 0 ? viewport.zoom : 1;
  const safePanX = Number.isFinite(viewport.panX) ? viewport.panX : 0;
  const safePanY = Number.isFinite(viewport.panY) ? viewport.panY : 0;
  const safeCanvasW = Number.isFinite(canvasW) && canvasW > 0 ? canvasW : 1;
  const safeCanvasH = Number.isFinite(canvasH) && canvasH > 0 ? canvasH : 1;
  const nodeColor =
    t.mode === "dark" ? "rgba(255,255,255,0.72)" : "rgba(18,24,38,0.68)";
  const frameColor =
    t.mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(18,24,38,0.14)";
  const viewportFill =
    t.mode === "dark" ? "rgba(99,179,237,0.13)" : "rgba(37,99,235,0.11)";

  const drawableNodes = nodes.filter(
    (node) =>
      Number.isFinite(node.x) &&
      Number.isFinite(node.y) &&
      Number.isFinite(node.width) &&
      Number.isFinite(node.height) &&
      node.width > 0 &&
      node.height > 0,
  );

  const viewportWorldLeft = -safePanX / safeZoom;
  const viewportWorldTop = -safePanY / safeZoom;
  const viewportWorldWidth = safeCanvasW / safeZoom;
  const viewportWorldHeight = safeCanvasH / safeZoom;
  const viewportWorldRight = viewportWorldLeft + viewportWorldWidth;
  const viewportWorldBottom = viewportWorldTop + viewportWorldHeight;

  const minX =
    Math.min(
      viewportWorldLeft,
      ...drawableNodes.map((node) => node.x),
    ) - PADDING;
  const maxX =
    Math.max(
      viewportWorldRight,
      ...drawableNodes.map((node) => node.x + node.width),
    ) + PADDING;
  const minY =
    Math.min(
      viewportWorldTop,
      ...drawableNodes.map((node) => node.y),
    ) - PADDING;
  const maxY =
    Math.max(
      viewportWorldBottom,
      ...drawableNodes.map((node) => node.y + node.height),
    ) + PADDING;

  const rangeX = Math.max(maxX - minX, 100);
  const rangeY = Math.max(maxY - minY, 100);
  const contentWidth = MAP_W - INSET * 2;
  const contentHeight = MAP_H - INSET * 2;
  const scale = Math.min(contentWidth / rangeX, contentHeight / rangeY);
  const offsetX = INSET + (contentWidth - rangeX * scale) / 2;
  const offsetY = INSET + (contentHeight - rangeY * scale) / 2;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const toMapX = (x: number) => (x - minX) * scale + offsetX;
  const toMapY = (y: number) => (y - minY) * scale + offsetY;

  const vpLeft = toMapX(viewportWorldLeft);
  const vpTop = toMapY(viewportWorldTop);
  const vpW = viewportWorldWidth * scale;
  const vpH = viewportWorldHeight * scale;
  const clippedVpLeft = clamp(vpLeft, INSET, MAP_W - INSET);
  const clippedVpTop = clamp(vpTop, INSET, MAP_H - INSET);
  const clippedVpRight = clamp(vpLeft + vpW, INSET, MAP_W - INSET);
  const clippedVpBottom = clamp(vpTop + vpH, INSET, MAP_H - INSET);
  const hasVisibleViewport =
    clippedVpRight > clippedVpLeft && clippedVpBottom > clippedVpTop;

  return (
    <div
      aria-label={
        drawableNodes.length > 0
          ? `Canvas MiniMap mit ${drawableNodes.length} Nodes`
          : "Canvas MiniMap ohne Nodes"
      }
      title="Canvas MiniMap"
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 50,
        width: MAP_W,
        height: MAP_H,
        borderRadius: 8,
        background:
          t.mode === "dark" ? "rgba(10,12,20,0.86)" : "rgba(248,250,252,0.9)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${frameColor}`,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        pointerEvents: "none",
      }}
    >
      <svg
        aria-label="MiniMap Uebersicht des Canvas Viewports"
        role="img"
        width={MAP_W}
        height={MAP_H}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      >
        <title>Canvas MiniMap</title>
        <rect
          x={INSET}
          y={INSET}
          width={contentWidth}
          height={contentHeight}
          rx={6}
          fill="none"
          stroke={frameColor}
          strokeWidth={1}
        />
        {drawableNodes.length === 0 && (
          <>
            <line
              x1={INSET + 18}
              y1={MAP_H / 2}
              x2={MAP_W - INSET - 18}
              y2={MAP_H / 2}
              stroke={frameColor}
              strokeWidth={1}
            />
            <circle
              cx={MAP_W / 2}
              cy={MAP_H / 2}
              r={4}
              fill={t.accent}
              opacity={0.55}
            />
          </>
        )}
        {drawableNodes.map((node) => (
          <rect
            key={node.id}
            x={toMapX(node.x)}
            y={toMapY(node.y)}
            width={Math.max(node.width * scale, 4)}
            height={Math.max(node.height * scale, 3)}
            rx={2}
            fill={node.color || nodeColor}
            stroke={
              t.mode === "dark"
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.75)"
            }
            strokeWidth={0.75}
            opacity={0.88}
          />
        ))}
        {hasVisibleViewport && (
          <rect
            x={clippedVpLeft}
            y={clippedVpTop}
            width={Math.max(clippedVpRight - clippedVpLeft, 5)}
            height={Math.max(clippedVpBottom - clippedVpTop, 5)}
            fill={viewportFill}
            stroke={t.accent}
            strokeWidth={1.5}
            opacity={0.95}
            rx={3}
          />
        )}
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 3,
          right: 5,
          fontSize: 9,
          opacity: 0.5,
          fontFamily: "monospace",
          letterSpacing: 0,
          lineHeight: "12px",
        }}
      >
        {Math.round(safeZoom * 100)}%
      </div>
    </div>
  );
}

// ─── TOOLBAR BUTTON ───

export { MiniMap };
