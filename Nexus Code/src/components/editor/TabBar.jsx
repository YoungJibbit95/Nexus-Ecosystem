import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const langColors = {
  js: "#facc15",
  jsx: "#61dafb",
  ts: "#3b82f6",
  tsx: "#3b82f6",
  py: "#22c55e",
  java: "#f97316",
  html: "#f97316",
  css: "#3b82f6",
  json: "#facc15",
  md: "#a855f7",
  cpp: "#3b82f6",
  c: "#6b7280",
  rs: "#f97316",
  go: "#22d3ee",
  rb: "#ef4444",
  php: "#8b5cf6",
};

function getExt(name) {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export default function TabBar({ tabs, activeTabId, onTabSelect, onTabClose }) {
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-center h-9 overflow-x-auto shrink-0"
      style={{
        background: "rgba(0,0,0,0.1)",
        borderBottom: "1px solid var(--nexus-border)",
      }}
    >
      <AnimatePresence mode="popLayout">
        {tabs.map((tab, index) => {
          if (!tab || !tab.name) return null;
          const ext = getExt(tab.name);
          const color = langColors[ext] || "#6b7280";
          const isActive = tab.id === activeTabId;

          return (
            <motion.div
              key={tab.id}
              initial={{ width: 0, opacity: 0, y: -10 }}
              animate={{ width: "auto", opacity: 1, y: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              whileHover={{ y: -2 }}
              onClick={() => onTabSelect(tab.id)}
              className="flex items-center gap-2 px-3 h-full cursor-pointer group relative shrink-0"
              style={{
                background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                borderBottom: isActive
                  ? `2px solid ${color}`
                  : "2px solid transparent",
                boxShadow: isActive
                  ? `0 -2px 10px ${color}33, 0 0 20px ${color}22`
                  : "none",
                transition: "all 0.3s ease",
              }}
            >
              <motion.span
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          `0 0 5px ${color}`,
                          `0 0 10px ${color}`,
                          `0 0 5px ${color}`,
                        ],
                      }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[10px] font-bold px-1 py-0.5 rounded"
                style={{ background: color + "22", color }}
              >
                {ext.toUpperCase() || "TXT"}
              </motion.span>
              <span
                className="text-xs"
                style={{ color: isActive ? "var(--nexus-text)" : "var(--nexus-muted)" }}
              >
                {tab.name}
              </span>
              {tab.modified && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  style={{ boxShadow: "0 0 6px #a855f7" }}
                />
              )}
              <motion.button
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10"
              >
                <X size={12} className="text-gray-500" />
              </motion.button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
