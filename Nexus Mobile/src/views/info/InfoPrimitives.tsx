import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTheme } from "../../store/themeStore";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";
import { SurfaceHighlight } from "../../components/render/SurfaceHighlight";

export function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export function Acc({ title, icon: Icon, open, onToggle, children, badge }: any) {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-info-accordion-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    hovered,
    focused,
    selected: Boolean(open),
    pressed,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: open ? "high" : "normal",
    areaHint: 96,
    family: "micro",
  });
  const quickMotion = `var(--nx-motion-quick, ${interaction.runtime.timings.quickMs}ms)`;
  const regularMotion = `var(--nx-motion-regular, ${interaction.runtime.timings.regularMs}ms)`;
  const motionEase = interaction.runtime.timings.easing;
  return (
    <div style={{ marginBottom: 8 }}>
      <motion.button
        type="button"
        onClick={onToggle}
        className="nx-motion-managed"
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
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 18px",
          background: open ? `rgba(${hexRgb(t.accent)},0.1)` : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? `rgba(${hexRgb(t.accent)},0.25)` : "rgba(255,255,255,0.08)"}`,
          borderRadius: open ? "12px 12px 0 0" : 12,
          cursor: "pointer",
          color: "inherit",
          position: "relative",
          overflow: "hidden",
          transition: `background-color ${regularMotion} ${motionEase}, border-color ${quickMotion} ${motionEase}, box-shadow ${regularMotion} ${motionEase}`,
        }}
      >
        <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={12}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              border: `1px solid rgba(${hexRgb(t.accent)},0.26)`,
              background: `radial-gradient(circle at 50% 50%, rgba(${hexRgb(t.accent)},0.18), rgba(${hexRgb(t.accent)},0.06) 68%, rgba(${hexRgb(t.accent)},0.02) 100%)`,
            }}
          />
        </SurfaceHighlight>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {Icon && <Icon size={18} style={{ color: t.accent, opacity: 0.85, flexShrink: 0 }} />}
          <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 700 }}>
            {title}
          </span>
          {badge && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 8,
                background: t.accent,
                color: "#fff",
              }}
            >
              {badge}
            </span>
          )}
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0, opacity: 0.5 }}
            transition={interaction.runtime.transition}
            style={{ display: "inline-flex" }}
          >
            <ChevronDown size={14} />
          </motion.span>
        </div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: Math.max(0.14, interaction.runtime.timings.regularMs / 1000),
              ease: interaction.runtime.timings.framerEase,
            }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "18px 20px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Card({ title, icon, desc, keys }: { title: string; icon?: string; desc: string; keys?: string[] }) {
  const t = useTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-info-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    hovered,
    focused,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    budgetPriority: "normal",
    areaHint: 72,
    family: "micro",
  });
  return (
    <motion.div
      className="nx-motion-managed"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        marginBottom: 8,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={10}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 10,
            border: `1px solid rgba(${hexRgb(t.accent)},0.24)`,
            background: `radial-gradient(circle at 50% 50%, rgba(${hexRgb(t.accent)},0.16), rgba(${hexRgb(t.accent)},0.05) 68%, rgba(${hexRgb(t.accent)},0.02) 100%)`,
          }}
        />
      </SurfaceHighlight>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5, color: t.accent }}>
          {icon} {title}
        </div>
        <div style={{ fontSize: 12, opacity: 0.68, lineHeight: 1.6 }}>{desc}</div>
        {keys && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {keys.map((k) => (
              <kbd
                key={k}
                style={{
                  padding: "2px 8px",
                  borderRadius: 5,
                  fontSize: 10,
                  fontFamily: "monospace",
                  background: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.13)",
                }}
              >
                {k}
              </kbd>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Code({ children }: { children: string }) {
  const t = useTheme();
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.09)",
        marginBottom: 12,
        overflowX: "auto",
      }}
    >
      <pre
        style={{
          margin: 0,
          fontSize: 12,
          fontFamily: "'Fira Code',monospace",
          color: `rgba(${hexRgb(t.accent)},0.9)`,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </pre>
    </div>
  );
}

export function Badge({ label, color = "#007AFF" }: { label: string; color?: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        marginRight: 5,
      }}
    >
      {label}
    </span>
  );
}

export function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

export function H({ children }: { children: string }) {
  const t = useTheme();
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        opacity: 0.4,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div style={{ width: 18, height: 2, background: t.accent, borderRadius: 1 }} />
      {children}
    </div>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.7, marginBottom: 12 }}>
      {children}
    </p>
  );
}

