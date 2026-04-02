import React, { useState } from "react";
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
  { icon: FileCode2, label: "Explorer", id: "explorer" },
  { icon: Search, label: "Suche", id: "search" },
  { icon: AlertCircle, label: "Problems", id: "problems" },
  { icon: GitBranch, label: "Git", id: "git" },
  { icon: Bug, label: "Debug", id: "debug" },
  { icon: Blocks, label: "Extensions", id: "extensions" },
];

function Tooltip({ label, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -6, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -6, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50
                     pointer-events-none whitespace-nowrap"
        >
          {/* Arrow */}
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
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(128,0,255,0.1)",
            }}
          >
            {label}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
          transition:
            "background 0.2s ease, color 0.2s ease, box-shadow 0.25s ease",
        }}
      >
        {/* Active left-edge indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="sidebarActiveBar"
              key="active-bar"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="absolute left-[2px] top-1/2 -translate-y-1/2 w-[2px] rounded-full"
              style={{
                height: "18px",
                background: "var(--primary)",
                boxShadow: "0 0 6px var(--primary)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Icon with glow when active */}
        <motion.div
          animate={{
            scale: isActive ? 1.02 : 1,
            filter: isActive
              ? "drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 45%, transparent))"
              : "none",
          }}
          transition={{ duration: 0.16 }}
        >
          <Icon size={19} strokeWidth={isActive ? 2 : 1.75} />
        </motion.div>

        {/* Hover ripple */}
        <AnimatePresence>
          {hovered && !isActive && (
            <motion.div
              key="ripple"
              initial={{ scale: 0.4, opacity: 0.35 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Tooltip */}
      <Tooltip label={item.label} visible={hovered} />
    </div>
  );
}

export default function Sidebar({
  activePanel,
  setActivePanel,
  onOpenSettings,
}) {
  const [settingsHovered, setSettingsHovered] = useState(false);

  return (
    <motion.div
      initial={{ x: -56, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-14 flex flex-col items-center py-3 gap-1 shrink-0 relative"
      style={{
        background: "var(--nexus-surface)",
        borderRight: "1px solid var(--nexus-border)",
      }}
    >
      {/* ── Logo mark ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ scale: 0, rotate: -120 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.15,
          type: "spring",
          stiffness: 220,
          damping: 18,
        }}
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
        <span
          className="text-purple-400/60 font-bold tracking-widest"
          style={{ fontSize: 8 }}
        >
          NC
        </span>
      </motion.div>

      {/* ── Thin divider ──────────────────────────────────────────── */}
      <div
        className="w-6 mb-1 shrink-0 rounded-full"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(128,0,255,0.3), transparent)",
        }}
      />

      {/* ── Nav items ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0.5">
        {SIDEBAR_ITEMS.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 0.18 + i * 0.05,
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            <SidebarButton
              item={item}
              isActive={activePanel === item.id}
              onClick={() =>
                setActivePanel(activePanel === item.id ? null : item.id)
              }
            />
          </motion.div>
        ))}
      </div>

      {/* ── Spacer ────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Thin divider ──────────────────────────────────────────── */}
      <div
        className="w-6 mb-1 shrink-0 rounded-full"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(128,0,255,0.2), transparent)",
        }}
      />

      {/* ── Settings button ───────────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onHoverStart={() => setSettingsHovered(true)}
          onHoverEnd={() => setSettingsHovered(false)}
          onClick={onOpenSettings}
          className="w-10 h-10 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          style={{
            background: settingsHovered
              ? "rgba(255,255,255,0.05)"
              : "transparent",
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
