import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AutocompletePopup({
  suggestions,
  visible,
  selectedIndex,
  onSelect,
  position,
}) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="absolute z-50 rounded-lg border shadow-xl overflow-hidden max-h-48 w-64"
        style={{
          top: position.top,
          left: position.left,
          background: "#12122a",
          borderColor: "rgba(128,0,255,0.2)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(128,0,255,0.1)",
        }}
      >
        <div className="overflow-y-auto max-h-48">
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => onSelect(s)}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all text-sm"
              style={{
                background:
                  i === selectedIndex ? "rgba(128,0,255,0.15)" : "transparent",
                color: i === selectedIndex ? "#e5e7eb" : "#9ca3af",
              }}
            >
              <span
                className="text-[10px] font-bold px-1 rounded shrink-0"
                style={{
                  background:
                    s.type === "keyword"
                      ? "#c084fc22"
                      : s.type === "function"
                        ? "#60a5fa22"
                        : "#fbbf2422",
                  color:
                    s.type === "keyword"
                      ? "#c084fc"
                      : s.type === "function"
                        ? "#60a5fa"
                        : "#fbbf24",
                }}
              >
                {s.type === "keyword" ? "K" : s.type === "function" ? "F" : "V"}
              </span>
              <span className="font-mono truncate">{s.text}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
