import React, { useState } from "react";
import { useTheme } from "../../../store/themeStore";
import type { CanvasConnection, CanvasNode } from "../../../store/canvasStore";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const COORD_PRECISION = 2;

const clampZoom = (zoom: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
const crispCoord = (value: number) =>
  Math.round(value * COORD_PRECISION) / COORD_PRECISION;

const ConnectionLine = React.memo(function ConnectionLine({
  conn,
  nodeById,
  zoom,
  onDelete,
  reduceEffects,
}: {
  conn: CanvasConnection;
  nodeById: globalThis.Map<string, CanvasNode>;
  zoom: number;
  onDelete: (id: string) => void;
  reduceEffects?: boolean;
}) {
  const t = useTheme();
  const fromNode = nodeById.get(conn.fromId);
  const toNode = nodeById.get(conn.toId);
  if (!fromNode || !toNode) return null;

  const safeZoom = clampZoom(zoom || 1);
  const x1 = crispCoord(fromNode.x + fromNode.width / 2);
  const y1 = crispCoord(fromNode.y + fromNode.height / 2);
  const x2 = crispCoord(toNode.x + toNode.width / 2);
  const y2 = crispCoord(toNode.y + toNode.height / 2);
  const dx = Math.abs(x2 - x1) * 0.5;
  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  const [hovered, setHovered] = useState(false);
  const connColor = conn.color || t.accent;
  const showDetail = !reduceEffects && hovered;
  const lowZoom = safeZoom < 0.7;
  const showGlow = showDetail && !lowZoom;
  const hitStrokeWidth = (reduceEffects ? 1.2 : 18) / safeZoom;
  const lineStrokeWidth = (showDetail ? 2.35 : lowZoom ? 1.25 : 1.45) / safeZoom;
  const glowStrokeWidth = 4.5 / safeZoom;
  const dashSize = `${Math.max(5, 8 / safeZoom)} ${Math.max(3, 4 / safeZoom)}`;

  return (
    <g
      onMouseEnter={() => !reduceEffects && setHovered(true)}
      onMouseLeave={() => !reduceEffects && setHovered(false)}
    >
      <path
        d={path}
        stroke={reduceEffects ? connColor : "transparent"}
        strokeWidth={hitStrokeWidth}
        fill="none"
        strokeLinecap="round"
        style={{ cursor: reduceEffects ? "default" : "pointer", opacity: 0.45 }}
      />
      {showGlow && (
        <path
          d={path}
          stroke={connColor}
          strokeWidth={glowStrokeWidth}
          fill="none"
          opacity={0.16}
          strokeLinecap="round"
          style={{ filter: `blur(${Math.min(2.5, 1.8 / safeZoom)}px)` }}
        />
      )}
      <path
        d={path}
        stroke={connColor}
        strokeWidth={lineStrokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={
          reduceEffects
            ? "none"
            : showDetail
              ? "none"
              : dashSize
        }
        opacity={showDetail ? (lowZoom ? 0.86 : 0.95) : reduceEffects ? 0.58 : 0.5}
        style={{
          transition: reduceEffects ? "none" : "opacity 0.16s, stroke-width 0.16s",
          filter: showGlow
            ? `drop-shadow(0 0 ${Math.min(3, 2.2 / safeZoom)}px ${connColor})`
            : "none",
        }}
      />
      {showDetail &&
        (() => {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const ax = x2 - (8 / safeZoom) * Math.cos(angle);
          const ay = y2 - (8 / safeZoom) * Math.sin(angle);
          return (
            <polygon
              points={`${x2},${y2} ${ax - (5 / safeZoom) * Math.sin(angle)},${ay + (5 / safeZoom) * Math.cos(angle)} ${ax + (5 / safeZoom) * Math.sin(angle)},${ay - (5 / safeZoom) * Math.cos(angle)}`}
              fill={connColor}
              opacity={lowZoom ? 0.72 : 0.86}
            />
          );
        })()}
      {showDetail && (
        <g
          transform={`translate(${(x1 + x2) / 2},${(y1 + y2) / 2})`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conn.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle r={10 / safeZoom} fill="#FF3B30" opacity={0.88} />
          <line
            x1={-4 / safeZoom}
            y1={-4 / safeZoom}
            x2={4 / safeZoom}
            y2={4 / safeZoom}
            stroke="white"
            strokeWidth={1.5 / safeZoom}
            strokeLinecap="round"
          />
          <line
            x1={4 / safeZoom}
            y1={-4 / safeZoom}
            x2={-4 / safeZoom}
            y2={4 / safeZoom}
            stroke="white"
            strokeWidth={1.5 / safeZoom}
            strokeLinecap="round"
          />
        </g>
      )}
      {conn.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 14 / safeZoom}
          textAnchor="middle"
          fill={t.mode === "dark" ? "#fff" : "#000"}
          fontSize={11 / safeZoom}
          opacity={lowZoom ? 0.56 : 0.68}
        >
          {conn.label}
        </text>
      )}
    </g>
  );
});
ConnectionLine.displayName = "ConnectionLine";

// ─── CONNECTION PORT ───

export { ConnectionLine };
