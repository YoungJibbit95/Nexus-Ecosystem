import React, { useState } from "react";
import { motion } from "framer-motion";
import { SurfaceHighlight } from "../../../../components/render/SurfaceHighlight";
import { useTheme } from "../../../../store/themeStore";
import { hexToRgb } from "../../../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../../../render/useInteractiveSurfaceMotion";

export function NodeConnectionPort({
  side,
  nodeId,
  onStartConnect,
  onEndConnect,
  connecting,
}: {
  side: "top" | "right" | "bottom" | "left";
  nodeId: string;
  onStartConnect: (id: string) => void;
  onEndConnect: (id: string) => void;
  connecting: boolean;
}) {
  const t = useTheme();
  const motionId = React.useId().replace(/:/g, "-");
  const accentRgb = hexToRgb(t.accent);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `canvas-port-${nodeId}-${side}-${motionId}`,
    hovered,
    focused,
    selected: connecting,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: connecting ? "high" : "normal",
    areaHint: 18,
    family: "micro",
  });
  const isActive = hovered || focused || connecting;
  const posStyle: React.CSSProperties = {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: "50%",
    background: isActive
      ? t.accent
      : t.mode === "dark"
        ? "rgba(255,255,255,0.25)"
        : "rgba(0,0,0,0.18)",
    border: `2px solid ${t.accent}`,
    cursor: "crosshair",
    transition:
      `background-color ${interaction.runtime.timings.quickMs}ms ${interaction.runtime.timings.easing}, box-shadow ${interaction.runtime.timings.quickMs}ms ${interaction.runtime.timings.easing}`,
    transform: "translate(-50%, -50%)",
    zIndex: 10,
    boxShadow: isActive ? `0 0 8px ${t.accent}` : "none",
    ...(side === "top" && { top: 0, left: "50%" }),
    ...(side === "right" && {
      top: "50%",
      right: -7,
      left: "auto",
      transform: "translate(50%, -50%)",
    }),
    ...(side === "bottom" && {
      bottom: -7,
      left: "50%",
      top: "auto",
      transform: "translate(-50%, 50%)",
    }),
    ...(side === "left" && { top: "50%", left: 0 }),
  };
  return (
    <motion.div
      className="nx-motion-managed"
      style={posStyle}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setPressed(false);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setPressed(true);
        onStartConnect(nodeId);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setPressed(false);
        onEndConnect(nodeId);
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={0} radius={999}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px solid rgba(${accentRgb},0.35)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${accentRgb},0.22), rgba(${accentRgb},0.08) 68%, rgba(${accentRgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
    </motion.div>
  );
}
