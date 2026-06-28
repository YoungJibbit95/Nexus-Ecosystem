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
  const mapWidth = 168;
  const mapHeight = 116;
  const inset = 10;
  const padding = 80;
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
    ) - padding;
  const maxX =
    Math.max(
      viewportWorldRight,
      ...drawableNodes.map((node) => node.x + node.width),
    ) + padding;
  const minY =
    Math.min(
      viewportWorldTop,
      ...drawableNodes.map((node) => node.y),
    ) - padding;
  const maxY =
    Math.max(
      viewportWorldBottom,
      ...drawableNodes.map((node) => node.y + node.height),
    ) + padding;

  const rangeX = Math.max(maxX - minX, 100);
  const rangeY = Math.max(maxY - minY, 100);
  const contentWidth = mapWidth - inset * 2;
  const contentHeight = mapHeight - inset * 2;
  const scale = Math.min(contentWidth / rangeX, contentHeight / rangeY);
  const offsetX = inset + (contentWidth - rangeX * scale) / 2;
  const offsetY = inset + (contentHeight - rangeY * scale) / 2;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const toMapX = (x: number) => (x - minX) * scale + offsetX;
  const toMapY = (y: number) => (y - minY) * scale + offsetY;

  const viewportLeft = toMapX(viewportWorldLeft);
  const viewportTop = toMapY(viewportWorldTop);
  const viewportWidth = viewportWorldWidth * scale;
  const viewportHeight = viewportWorldHeight * scale;
  const clippedViewportLeft = clamp(viewportLeft, inset, mapWidth - inset);
  const clippedViewportTop = clamp(viewportTop, inset, mapHeight - inset);
  const clippedViewportRight = clamp(
    viewportLeft + viewportWidth,
    inset,
    mapWidth - inset,
  );
  const clippedViewportBottom = clamp(
    viewportTop + viewportHeight,
    inset,
    mapHeight - inset,
  );
  const hasVisibleViewport =
    clippedViewportRight > clippedViewportLeft &&
    clippedViewportBottom > clippedViewportTop;

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
        width: mapWidth,
        height: mapHeight,
        borderRadius: 8,
        background:
          t.mode === "dark"
            ? "rgba(10,12,20,0.86)"
            : "rgba(248,250,252,0.9)",
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
        width={mapWidth}
        height={mapHeight}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
      >
        <title>Canvas MiniMap</title>
        <rect
          x={inset}
          y={inset}
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
              x1={inset + 18}
              y1={mapHeight / 2}
              x2={mapWidth - inset - 18}
              y2={mapHeight / 2}
              stroke={frameColor}
              strokeWidth={1}
            />
            <circle
              cx={mapWidth / 2}
              cy={mapHeight / 2}
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
            x={clippedViewportLeft}
            y={clippedViewportTop}
            width={Math.max(clippedViewportRight - clippedViewportLeft, 5)}
            height={Math.max(clippedViewportBottom - clippedViewportTop, 5)}
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
