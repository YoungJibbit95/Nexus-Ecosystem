import React, { useId, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";
import { SurfaceHighlight } from "./SurfaceHighlight";

type InteractiveActionButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
> & {
  motionId?: string;
  selected?: boolean;
  radius?: number;
  areaHint?: number;
  accentColor?: string;
  surfaceClass?: "utility-surface" | "panel-surface";
  effectClass?: "status-highlight" | "liquid-interactive";
};

export function InteractiveActionButton({
  motionId,
  selected = false,
  radius = 10,
  areaHint = 84,
  accentColor,
  surfaceClass = "utility-surface",
  effectClass = "status-highlight",
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
}: InteractiveActionButtonProps) {
  const t = useTheme();
  const generatedId = useId().replace(/:/g, "-");
  const id = motionId || generatedId;
  const tint = accentColor || t.accent;
  const tintRgb = hexToRgb(tint);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `action-btn-${id}`,
    hovered,
    focused,
    selected,
    pressed,
    surfaceClass,
    effectClass,
    budgetPriority: selected || hovered || focused ? "high" : "normal",
    areaHint,
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
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is best-effort; the stable hit target still protects clicks.
      }
      onPointerDown?.(event);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
      onPointerUp?.(event);
    },
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
      onPointerCancel?.(event);
    },
  };

  return (
    <motion.button
      {...(rest as any)}
      {...events}
      className={`nx-motion-managed ${rest.className || ""}`.trim()}
      style={{
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        transformOrigin: "50% 50%",
        ...style,
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={radius}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            border: `1px solid rgba(${tintRgb},0.22)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${tintRgb},0.2), rgba(${tintRgb},0.06) 68%, rgba(${tintRgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <motion.span
        animate={interaction.content.animate}
        transition={interaction.content.transition}
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}

