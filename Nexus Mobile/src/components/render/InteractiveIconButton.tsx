import React, { useEffect, useId, useState } from "react";
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
  const [coarsePointer, setCoarsePointer] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarsePointer(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);
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
      if (coarsePointer) {
        onMouseEnter?.(event);
        return;
      }
      setHovered(true);
      onMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (coarsePointer) {
        setHovered(false);
        setPressed(false);
        onMouseLeave?.(event);
        return;
      }
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
        // Pointer capture is best-effort; the stable hit target still protects taps.
      }
      if (event.pointerType && event.pointerType !== "mouse") {
        setHovered(false);
      }
      onPointerDown?.(event);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
      if (event.pointerType && event.pointerType !== "mouse") {
        setHovered(false);
      }
      onPointerUp?.(event);
    },
    onPointerCancel: (event: React.PointerEvent<HTMLButtonElement>) => {
      setPressed(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
      if (event.pointerType && event.pointerType !== "mouse") {
        setHovered(false);
      }
      onPointerCancel?.(event);
    },
  };

  return (
    <motion.button
      {...(rest as any)}
      {...events}
      className={`nx-motion-managed nx-mobile-touch-button ${rest.className || ""}`.trim()}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        minWidth: "max(36px, calc(var(--nx-touch-target, 40px) - 2px))",
        minHeight: "max(36px, calc(var(--nx-touch-target, 40px) - 2px))",
        padding: "4px",
        borderRadius: radius,
        color: tint || "inherit",
        opacity: hovered || focused ? 1 : idleOpacity,
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
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
      <motion.span
        animate={interaction.content.animate}
        transition={interaction.content.transition}
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}
