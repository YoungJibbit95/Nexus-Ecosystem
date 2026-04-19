import React, { useState } from "react";
import { motion } from "framer-motion";
import { LiquidGlassButton } from "../../components/LiquidGlassButton";
import { SurfaceHighlight } from "../../components/render/SurfaceHighlight";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";

export type DashboardActionButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    liquidColor?: string;
    liquidSize?: "sm" | "md" | "lg";
  };

export function DashboardActionButton({
  liquidColor,
  liquidSize = "sm",
  style,
  children,
  className,
  id,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...rest
}: DashboardActionButtonProps) {
  const t = useTheme();
  const isLiquidGlass =
    false;
  const accent = liquidColor || t.accent;
  const rgb = hexToRgb(accent);
  const internalId = React.useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `dashboard-action-${id || internalId}`,
    hovered,
    focused,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: isLiquidGlass ? "liquid-interactive" : "status-highlight",
    budgetPriority: "normal",
    areaHint: liquidSize === "lg" ? 108 : liquidSize === "md" ? 86 : 72,
    family: "micro",
  });

  const interactionEvents = {
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

  if (isLiquidGlass) {
    return (
      <motion.div
        style={{ display: "inline-flex", position: "relative" }}
        animate={interaction.content.animate}
        transition={interaction.content.transition}
      >
        <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={11}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 11,
              border: `1px solid rgba(${rgb},0.28)`,
              background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.2), rgba(${rgb},0.07) 66%, rgba(${rgb},0.02) 100%)`,
            }}
          />
        </SurfaceHighlight>
        <LiquidGlassButton
          id={id}
          {...rest}
          {...interactionEvents}
          className={`nx-motion-managed ${className || ""}`.trim()}
          color={accent}
          size={liquidSize}
          style={{
            ...(style || {}),
            background: "transparent",
            border: "1px solid transparent",
            position: "relative",
            zIndex: 1,
          }}
        >
          {children}
        </LiquidGlassButton>
      </motion.div>
    );
  }

  return (
    <motion.button
      id={id}
      {...(rest as any)}
      {...interactionEvents}
      className={`nx-motion-managed ${className || ""}`.trim()}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{
        ...style,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={11}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 11,
            border: `1px solid rgba(${rgb},0.24)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.18), rgba(${rgb},0.06) 70%, rgba(${rgb},0.02) 100%)`,
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
          gap: 6,
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </span>
    </motion.button>
  );
}
