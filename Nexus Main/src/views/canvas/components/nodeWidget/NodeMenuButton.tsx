import React, { useState } from "react";
import { motion } from "framer-motion";
import { SurfaceHighlight } from "../../../../components/render/SurfaceHighlight";
import { useTheme } from "../../../../store/themeStore";
import { hexToRgb } from "../../../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../../../render/useInteractiveSurfaceMotion";

export function NodeMenuButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const t = useTheme();
  const motionId = React.useId().replace(/:/g, "-");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const tint = danger ? "#FF3B30" : t.accent;
  const tintRgb = hexToRgb(tint);
  const interaction = useInteractiveSurfaceMotion({
    id: `canvas-node-menu-${label}-${motionId}`,
    hovered,
    focused,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: danger ? "high" : "normal",
    areaHint: 74,
    family: "micro",
  });
  return (
    <motion.button
      type="button"
      className="nx-motion-managed nx-bounce-target"
      onClick={onClick}
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
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 10px",
        border: "none",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 12,
        background: "transparent",
        color: danger ? "#FF3B30" : "inherit",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={0} radius={7}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 7,
            border: `1px solid rgba(${tintRgb},0.22)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${tintRgb},0.18), rgba(${tintRgb},0.06) 68%, rgba(${tintRgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <Icon size={13} />
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </motion.button>
  );
}
