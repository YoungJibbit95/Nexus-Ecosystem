import React, { useEffect, useState } from "react";
import {
  FileCode2,
  Settings,
  Search,
  GitBranch,
  Bug,
  Blocks,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SIDEBAR_ITEMS = [
  { icon: FileCode2, label: "Explorer",   id: "explorer" },
  { icon: Search,    label: "Suche",      id: "search" },
  { icon: AlertCircle, label: "Problems", id: "problems" },
  { icon: GitBranch, label: "Git",        id: "git" },
  { icon: Bug,       label: "Debug",      id: "debug" },
  { icon: Blocks,    label: "Extensions", id: "extensions" },
];

/* ─── Tooltip (desktop only) ──────────────────────────────────────────── */

function Tooltip({ label, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -6, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -6, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-[1200]
                     pointer-events-none whitespace-nowrap"
          style={{ willChange: "transform, opacity" }}
        >
          <div
            className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderRight: "5px solid var(--nexus-surface)",
            }}
          />
          <div
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: "var(--nexus-surface)",
              border: "1px solid var(--nexus-border)",
              color: "var(--nexus-text)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(128,0,255,0.1)",
            }}
          >
            {label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Desktop sidebar button ──────────────────────────────────────────── */

function SidebarButton({ item, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <div className="relative flex items-center justify-center">
      <motion.button
        layout
        whileTap={{ scale: 0.88 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onClick={onClick}
        title={item.label}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        style={{
          background: isActive
            ? "color-mix(in srgb, var(--primary) 15%, transparent)"
            : hovered
              ? "rgba(255,255,255,0.05)"
              : "transparent",
          color: isActive
            ? "var(--primary)"
            : hovered
              ? "var(--nexus-text)"
              : "var(--nexus-muted)",
          boxShadow: isActive
            ? "0 0 20px color-mix(in srgb, var(--primary) 20%, transparent)"
            : "none",
          transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.25s ease",
          willChange: "transform, opacity",
        }}
      >
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="sidebarActiveBar"
              key="active-bar"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="absolute left-[2px] top-[8px] bottom-[8px] w-[2px] rounded-full"
              style={{ background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }}
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            scale: isActive ? 1.02 : 1,
            opacity: isActive ? 1 : hovered ? 0.95 : 0.88,
          }}
          transition={{ duration: 0.16 }}
          style={{ willChange: "transform, opacity" }}
        >
          <Icon size={19} strokeWidth={isActive ? 2 : 1.75} />
        </motion.div>

        <AnimatePresence>
          {hovered && !isActive && (
            <motion.div
              key="ripple"
              initial={{ scale: 0.4, opacity: 0.35 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            />
          )}
        </AnimatePresence>
      </motion.button>
      <Tooltip label={item.label} visible={hovered} />
    </div>
  );
}

/* ─── Mobile bottom nav item ──────────────────────────────────────────── */

function BottomNavItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  const [compact, setCompact] = useState(
    typeof window !== "undefined" ? window.innerWidth < 390 : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateCompact = () => setCompact(window.innerWidth < 390);
    updateCompact();
    window.addEventListener("resize", updateCompact, { passive: true });
    return () => window.removeEventListener("resize", updateCompact);
  }, []);

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative outline-none overflow-hidden"
      style={{ minHeight: compact ? 52 : 56, minWidth: 0 }}
    >
      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="bar"
            layoutId="bottomNavActive"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-b-full"
            style={{
              width: 28,
              background: "var(--primary)",
              boxShadow: "0 0 10px var(--primary)",
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          scale: isActive ? 1.03 : 1,
          opacity: isActive ? 1 : 0.9,
        }}
        transition={{ duration: 0.16 }}
        style={{
          color: isActive ? "var(--primary)" : "var(--nexus-muted)",
          willChange: "transform, opacity",
        }}
      >
        <Icon size={compact ? 18 : 20} strokeWidth={isActive ? 2 : 1.75} />
      </motion.div>

      {!compact && (
        <span
          className="text-[9px] font-semibold tracking-wide leading-none uppercase truncate max-w-full px-1"
          style={{ color: isActive ? "var(--primary)" : "var(--nexus-muted)", opacity: isActive ? 1 : 0.7 }}
        >
          {item.label}
        </span>
      )}
    </motion.button>
  );
}

/* ─── Mobile bottom navigation bar ───────────────────────────────────── */

export function MobileBottomNav({ activePanel, setActivePanel, onOpenSettings }) {
  const [compact, setCompact] = useState(
    typeof window !== "undefined" ? window.innerWidth < 390 : false,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateCompact = () => setCompact(window.innerWidth < 390);
    updateCompact();
    window.addEventListener("resize", updateCompact, { passive: true });
    return () => window.removeEventListener("resize", updateCompact);
  }, []);

  // Show first 5 items in bottom nav, Settings as last tab
  const navItems = SIDEBAR_ITEMS.slice(0, 5);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      className="shrink-0 flex items-center border-t border-white/5 relative z-40"
      style={{
        background: "var(--nexus-surface)",
        backdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        borderTop: "1px solid var(--nexus-border)",
      }}
    >
      {navItems.map((item) => (
        <BottomNavItem
          key={item.id}
          item={item}
          isActive={activePanel === item.id}
          onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}
        />
      ))}

      {/* Settings as last slot */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onOpenSettings}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 outline-none overflow-hidden"
        style={{ minHeight: compact ? 52 : 56, minWidth: 0 }}
      >
        <motion.div
          style={{ color: "var(--nexus-muted)" }}
          whileTap={{ rotate: 90 }}
        >
          <Settings size={compact ? 18 : 20} strokeWidth={1.75} />
        </motion.div>
        {!compact && (
          <span
            className="text-[9px] font-semibold tracking-wide leading-none uppercase truncate max-w-full px-1"
            style={{ color: "var(--nexus-muted)", opacity: 0.7 }}
          >
            Settings
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}

/* ─── Desktop sidebar (original) ─────────────────────────────────────── */

export default function Sidebar({ activePanel, setActivePanel, onOpenSettings }) {
  const [settingsHovered, setSettingsHovered] = useState(false);

  return (
    <motion.div
      initial={{ x: -56, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-14 h-full min-h-0 flex flex-col items-center pt-3 pb-1 gap-1 shrink-0 relative"
      style={{
        background: "var(--nexus-surface)",
        borderRight: "1px solid var(--nexus-border)",
        zIndex: 40,
        overflow: "visible",
        willChange: "transform, opacity",
      }}
    >
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0, rotate: -120 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 18 }}
        className="mb-3 flex flex-col items-center gap-0.5 select-none"
      >
        <span
          className="text-purple-400 font-bold leading-none"
          style={{
            fontSize: 18,
            textShadow: "0 0 10px rgba(168,85,247,0.55)",
          }}
        >
          ✦
        </span>
        <span className="text-purple-400/60 font-bold tracking-widest" style={{ fontSize: 8 }}>
          NC
        </span>
      </motion.div>

      {/* Divider */}
      <div className="w-6 mb-1 shrink-0 rounded-full"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(128,0,255,0.3), transparent)" }}
      />

      {/* Nav items */}
      <div className="flex flex-col items-center gap-0.5">
        {SIDEBAR_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.18 + i * 0.05, type: "spring", stiffness: 300, damping: 30 }}
          >
            <SidebarButton
              item={item}
              isActive={activePanel === item.id}
              onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Divider */}
      <div className="w-6 mb-1 shrink-0 rounded-full"
        style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(128,0,255,0.2), transparent)" }}
      />

      {/* Settings */}
      <div className="relative flex items-center justify-center">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onHoverStart={() => setSettingsHovered(true)}
          onHoverEnd={() => setSettingsHovered(false)}
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          style={{
            background: settingsHovered ? "rgba(255,255,255,0.05)" : "transparent",
            color: settingsHovered ? "var(--nexus-text)" : "var(--nexus-muted)",
            transition: "background 0.2s ease, color 0.2s ease",
          }}
          title="Einstellungen"
        >
          <motion.div
            animate={settingsHovered ? { rotate: 90 } : { rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Settings size={19} strokeWidth={1.75} />
          </motion.div>
        </motion.button>
        <Tooltip label="Einstellungen" visible={settingsHovered} />
      </div>
    </motion.div>
  );
}
