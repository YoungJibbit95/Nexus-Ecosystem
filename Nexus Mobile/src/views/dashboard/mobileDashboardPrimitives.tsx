import React from "react";
import { motion } from "framer-motion";
import { Glass } from "../../components/Glass";
import { LiquidGlassButton } from "../../components/LiquidGlassButton";
import { SurfaceHighlight } from "../../components/render/SurfaceHighlight";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  const t = useTheme();
  const rgb = hexToRgb(color);
  const cardId = React.useId();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-dashboard-stat-card-${cardId}`,
    hovered,
    focused,
    selected: false,
    pressed,
    surfaceClass: "utility-surface",
    effectClass:
      ((t.glassmorphism as any)?.panelRenderer ?? "blur") === "liquid-glass"
        ? "liquid-interactive"
        : "status-highlight",
    budgetPriority: "normal",
    areaHint: 82,
    family: "micro",
  });
  return (
    <motion.button
      onClick={onClick}
      className="nx-motion-managed"
      initial={{ opacity: 0, y: 6 }}
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
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "12px 13px",
        textAlign: "left",
        background: `rgba(${rgb},0.1)`,
        cursor: onClick ? "pointer" : "default",
        color: "inherit",
        position: "relative",
        overflow: "hidden",
      }}
      animate={{
        opacity: 1,
        y: 0,
        x: interaction.content.animate.x,
        scale: interaction.content.animate.scale,
      }}
      transition={{
        opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        x: interaction.content.transition,
        scale: interaction.content.transition,
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={12}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            border: `1px solid rgba(${rgb},0.26)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.2), rgba(${rgb},0.07) 68%, rgba(${rgb},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `rgba(${rgb},0.15)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} style={{ color }} />
          </div>
        </div>
        <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 800 }}>{value}</div>
        <div style={{ marginTop: 3, fontSize: 11, opacity: 0.6 }}>{label}</div>
        {sub && <div style={{ marginTop: 3, fontSize: 10, opacity: 0.5 }}>{sub}</div>}
      </div>
    </motion.button>
  );
}

export function SmallCard({
  title,
  icon: Icon,
  color,
  children,
  action,
}: {
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const cardId = React.useId();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-dashboard-small-card-${cardId}`,
    hovered,
    focused,
    selected: false,
    surfaceClass: "panel-surface",
    effectClass: "status-highlight",
    budgetPriority: "normal",
    areaHint: 160,
    family: "content",
  });
  return (
    <motion.div
      layout
      className="nx-motion-managed"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={12}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            border: `1px solid rgba(${hexToRgb(color)},0.24)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${hexToRgb(color)},0.18), rgba(${hexToRgb(color)},0.06) 68%, rgba(${hexToRgb(color)},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <Glass
        gradient
        style={{
          padding: "14px 14px",
          height: "100%",
          background: `linear-gradient(145deg, ${color}55, ${color}2e 52%, rgba(255,255,255,0.03) 88%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon size={14} style={{ color }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
          </div>
          {action}
        </div>
        {children}
      </Glass>
    </motion.div>
  );
}

type DashboardActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
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
    ((t.glassmorphism as any)?.panelRenderer ?? "blur") === "liquid-glass";
  const accent = liquidColor || t.accent;
  const rgb = hexToRgb(accent);
  const internalId = React.useId();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-dashboard-action-${id || internalId}`,
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
