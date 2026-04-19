import React from "react";
import { motion } from "framer-motion";
import { Glass } from "../../components/Glass";
import { LiquidGlassButton } from "../../components/LiquidGlassButton";
import { SurfaceHighlight } from "../../components/render/SurfaceHighlight";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";

export function Sparkline({
  data,
  color,
  height = 32,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const maxIndex = Math.max(data.length - 1, 1);
  const toX = (i: number) => (data.length === 1 ? w / 2 : (i / maxIndex) * w);
  const pts = data.map((v, i) => `${toX(i)},${height - (v / max) * height}`).join(" ");
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`${pts} ${w},${height} 0,${height}`}
        fill={`url(#sg-${color.replace("#", "")})`}
        stroke="none"
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <circle
          cx={toX(data.length - 1)}
          cy={height - (data[data.length - 1] / max) * height}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
  delay = 0,
  onClick,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  trend?: number[];
  delay?: number;
  onClick?: () => void;
}) {
  const rgb = hexToRgb(color);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <Glass hover={!!onClick} glow style={{ padding: "16px 18px", height: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `rgba(${rgb}, 0.15)`,
              border: `1px solid rgba(${rgb}, 0.25)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          {trend ? <Sparkline data={trend} color={color} /> : null}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, marginTop: 4 }}>{label}</div>
        {sub ? <div style={{ fontSize: 10, opacity: 0.35, marginTop: 2 }}>{sub}</div> : null}
      </Glass>
    </motion.div>
  );
}

export function QuickChip({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  color: string;
  onClick: () => void;
}) {
  const t = useTheme();
  const isLiquidGlass =
    false;
  const rgb = hexToRgb(color);
  const chipId = React.useId();
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `dashboard-quick-chip-${chipId}`,
    hovered,
    focused,
    pressed,
    surfaceClass: "utility-surface",
    effectClass: isLiquidGlass ? "liquid-interactive" : "status-highlight",
    budgetPriority: "normal",
    areaHint: 62,
    family: "micro",
  });

  const interactiveEvents = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setPressed(false);
    },
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setPressed(false);
    },
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  };

  if (isLiquidGlass) {
    return (
      <motion.div
        style={{ display: "inline-flex", position: "relative" }}
        animate={interaction.content.animate}
        transition={interaction.content.transition}
      >
        <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={20}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              border: `1px solid rgba(${rgb},0.3)`,
              background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.19), rgba(${rgb},0.07) 68%, rgba(${rgb},0.02) 100%)`,
            }}
          />
        </SurfaceHighlight>
        <LiquidGlassButton
          onClick={onClick}
          color={color}
          borderRadius={20}
          size="sm"
          className="nx-motion-managed"
          {...interactiveEvents}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 14px",
            color,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Icon size={13} /> {label}
        </LiquidGlassButton>
      </motion.div>
    );
  }
  return (
    <motion.button
      onClick={onClick}
      className="nx-motion-managed"
      {...interactiveEvents}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 14px",
        borderRadius: 20,
        background: `rgba(${rgb}, 0.1)`,
        border: `1px solid rgba(${rgb}, 0.2)`,
        color,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        transition:
          "background-color var(--nx-motion-regular, 210ms) var(--nx-motion-settle-ease, cubic-bezier(0.22, 1, 0.36, 1)), color var(--nx-motion-regular, 210ms) var(--nx-motion-settle-ease, cubic-bezier(0.22, 1, 0.36, 1)), border-color var(--nx-motion-quick, 170ms) var(--nx-motion-settle-ease, cubic-bezier(0.22, 1, 0.36, 1))",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={20}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 20,
            border: `1px solid rgba(${rgb},0.26)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.22), rgba(${rgb},0.09) 70%, rgba(${rgb},0.03) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
        <Icon size={13} /> {label}
      </span>
    </motion.button>
  );
}
