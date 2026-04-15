import React, { useId, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";
import { SurfaceHighlight } from "./SurfaceHighlight";

type InteractiveIconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
> & {
  intent?: "neutral" | "accent" | "danger";
  idleOpacity?: number;
  radius?: number;
  motionId?: string;
};

export function InteractiveIconButton({
  intent = "neutral",
  idleOpacity = 0.4,
  radius = 6,
  motionId,
  style,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  children,
  ...rest
}: InteractiveIconButtonProps) {
  const t = useTheme();
  const generatedId = useId().replace(/:/g, "-");
  const id = motionId || generatedId;
  const tint = intent === "danger" ? "#ff453a" : intent === "accent" ? t.accent : null;
  const tintRgb = hexToRgb(tint || t.accent);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `icon-btn-${id}`,
    hovered,
    focused,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: hovered || focused ? "high" : "normal",
    areaHint: 42,
    family: "micro",
  });

  const events = {
    onMouseEnter: (event: React.MouseEvent<HTMLButtonElement>) => {
      setHovered(true);
      onMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLButtonElement>) => {
      setHovered(false);
      setPressed(false);
      onMouseLeave?.(event);
    },
    onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
      setFocused(true);
      onFocus?.(event);
    },
    onBlur: (event: React.FocusEvent<HTMLButtonElement>) => {
      setFocused(false);
      setPressed(false);
      onBlur?.(event);
    },
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(true);
      onPointerDown?.(event);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(false);
      onPointerUp?.(event);
    },
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(false);
      onPointerCancel?.(event);
    },
  };

  return (
    <motion.button
      {...(rest as any)}
      {...events}
      className={`nx-motion-managed ${rest.className || ""}`.trim()}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px 3px",
        borderRadius: radius,
        color: tint || "inherit",
        opacity: hovered || focused ? 1 : idleOpacity,
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...(style || {}),
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={0} radius={radius}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            border: `1px solid rgba(${tintRgb},0.22)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${tintRgb},0.2), rgba(${tintRgb},0.06) 66%, rgba(${tintRgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <span
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </span>
    </motion.button>
  );
}
