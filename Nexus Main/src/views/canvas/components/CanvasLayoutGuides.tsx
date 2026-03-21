import React from "react";
import { hexToRgb } from "../../../lib/utils";
import { useTheme } from "../../../store/themeStore";
import type { CanvasLayoutGuides as CanvasLayoutGuidesShape } from "../hooks/useCanvasDerivedState";

export function CanvasLayoutGuides({
  layoutGuides,
  reduceEffects,
}: {
  layoutGuides: CanvasLayoutGuidesShape | null;
  reduceEffects: boolean;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);

  if (!layoutGuides || reduceEffects) return null;

  if (layoutGuides.type === "board") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {layoutGuides.lanes.map((lane) => (
          <div
            key={lane.id}
            style={{
              position: "absolute",
              left: lane.x,
              top: lane.y,
              width: lane.width,
              height: lane.height,
              borderRadius: 14,
              border: `1px solid ${lane.color}40`,
              background: `${lane.color}10`,
              boxShadow: `inset 0 0 0 1px ${lane.color}14`,
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                margin: 10,
                padding: "4px 9px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: `${lane.color}24`,
                border: `1px solid ${lane.color}55`,
                color: lane.color,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: lane.color,
                  boxShadow: `0 0 10px ${lane.color}`,
                }}
              />
              {lane.label}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: layoutGuides.points[0]?.x ?? 0,
          top: layoutGuides.axisY,
          width: Math.max(0, layoutGuides.points.length - 1) * 320 + 120,
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`,
          opacity: 0.5,
        }}
      />
      {layoutGuides.points.map((point) => (
        <div
          key={point.id}
          style={{
            position: "absolute",
            left: point.x - 8,
            top: point.y - 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            width: 220,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              border: "1px solid rgba(255,255,255,0.48)",
              boxShadow: `0 0 14px rgba(${rgb},0.45)`,
            }}
          />
          <div
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              maxWidth: 220,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
            title={point.label}
          >
            {point.label}
          </div>
        </div>
      ))}
    </div>
  );
}
