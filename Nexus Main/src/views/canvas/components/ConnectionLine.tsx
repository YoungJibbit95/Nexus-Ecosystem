import React, { useState } from "react";
import { useTheme } from "../../../store/themeStore";
import type { CanvasConnection, CanvasNode } from "../../../store/canvasStore";

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

  const x1 = fromNode.x + fromNode.width / 2;
  const y1 = fromNode.y + fromNode.height / 2;
  const x2 = toNode.x + toNode.width / 2;
  const y2 = toNode.y + toNode.height / 2;
  const dx = Math.abs(x2 - x1) * 0.5;
  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  const [hovered, setHovered] = useState(false);
  const connColor = conn.color || t.accent;
  const showDetail = !reduceEffects && hovered;

  return (
    <g
      onMouseEnter={() => !reduceEffects && setHovered(true)}
      onMouseLeave={() => !reduceEffects && setHovered(false)}
    >
      <path
        d={path}
        stroke={reduceEffects ? connColor : "transparent"}
        strokeWidth={reduceEffects ? 1.2 / zoom : 18 / zoom}
        fill="none"
        style={{ cursor: reduceEffects ? "default" : "pointer", opacity: 0.5 }}
      />
      {/* Glow layer */}
      {showDetail && (
        <path
          d={path}
          stroke={connColor}
          strokeWidth={6 / zoom}
          fill="none"
          opacity={0.2}
          style={{ filter: `blur(${3 / zoom}px)` }}
        />
      )}
      <path
        d={path}
        stroke={connColor}
        strokeWidth={(showDetail ? 2.5 : 1.5) / zoom}
        fill="none"
        strokeDasharray={
          reduceEffects
            ? "none"
            : showDetail
              ? "none"
              : `${8 / zoom} ${4 / zoom}`
        }
        opacity={showDetail ? 1 : reduceEffects ? 0.62 : 0.55}
        style={{
          transition: reduceEffects ? "none" : "all 0.2s",
          filter: showDetail
            ? `drop-shadow(0 0 ${4 / zoom}px ${connColor})`
            : "none",
        }}
      />
      {/* Arrowhead */}
      {showDetail &&
        (() => {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const ax = x2 - (8 / zoom) * Math.cos(angle);
          const ay = y2 - (8 / zoom) * Math.sin(angle);
          return (
            <polygon
              points={`${x2},${y2} ${ax - (5 / zoom) * Math.sin(angle)},${ay + (5 / zoom) * Math.cos(angle)} ${ax + (5 / zoom) * Math.sin(angle)},${ay - (5 / zoom) * Math.cos(angle)}`}
              fill={connColor}
              opacity={0.9}
            />
          );
        })()}
      {/* Midpoint delete */}
      {showDetail && (
        <g
          transform={`translate(${(x1 + x2) / 2},${(y1 + y2) / 2})`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conn.id);
          }}
          style={{ cursor: "pointer" }}
        >
          <circle r={10 / zoom} fill="#FF3B30" opacity={0.9} />
          <line
            x1={-4 / zoom}
            y1={-4 / zoom}
            x2={4 / zoom}
            y2={4 / zoom}
            stroke="white"
            strokeWidth={1.5 / zoom}
          />
          <line
            x1={4 / zoom}
            y1={-4 / zoom}
            x2={-4 / zoom}
            y2={4 / zoom}
            stroke="white"
            strokeWidth={1.5 / zoom}
          />
        </g>
      )}
      {conn.label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 14 / zoom}
          textAnchor="middle"
          fill={t.mode === "dark" ? "#fff" : "#000"}
          fontSize={11 / zoom}
          opacity={0.7}
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
