import React from "react";
import { motion } from "framer-motion";
import { Glass } from "../../components/Glass";
import { hexToRgb } from "../../lib/utils";

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
  const rgb = hexToRgb(color);
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ filter: "brightness(1.06)" }}
      whileTap={{ filter: "brightness(0.97)" }}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
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
        transition: "background-color 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = `rgba(${rgb},0.2)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = `rgba(${rgb},0.1)`;
      }}
    >
      <Icon size={13} /> {label}
    </motion.button>
  );
}
