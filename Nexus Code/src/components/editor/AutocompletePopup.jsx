import React from "react";
import { motion, AnimatePresence } from "framer-motion";

function getSuggestionLabel(suggestion) {
  return String(
    suggestion?.label ||
      suggestion?.text ||
      suggestion?.insertText ||
      suggestion?.detail ||
      "completion",
  );
}

function getSuggestionType(suggestion) {
  return String(suggestion?.type || suggestion?.kind || "text").toLowerCase();
}

function getTypeMeta(type) {
  if (type.includes("keyword")) {
    return { label: "K", className: "bg-purple-400/15 text-purple-300" };
  }
  if (type.includes("function") || type.includes("method")) {
    return { label: "F", className: "bg-blue-400/15 text-blue-300" };
  }
  if (type.includes("class") || type.includes("type")) {
    return { label: "T", className: "bg-cyan-400/15 text-cyan-300" };
  }
  return { label: "V", className: "bg-amber-400/15 text-amber-300" };
}

export default function AutocompletePopup({
  suggestions = [],
  visible,
  selectedIndex = 0,
  onSelect,
  position = { top: 0, left: 0 },
}) {
  const safeSuggestions = Array.isArray(suggestions)
    ? suggestions.filter(Boolean)
    : [];

  if (!visible || safeSuggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="absolute z-50 max-h-64 w-72 overflow-hidden rounded-md border shadow-xl"
        style={{
          top: position.top,
          left: position.left,
          background: "var(--nexus-panel-surface, #11141d)",
          borderColor: "var(--nexus-border, rgba(255,255,255,0.12))",
          boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
        }}
        role="listbox"
        aria-label="Autocomplete suggestions"
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {safeSuggestions.map((suggestion, index) => {
            const label = getSuggestionLabel(suggestion);
            const type = getSuggestionType(suggestion);
            const meta = getTypeMeta(type);
            const selected = index === selectedIndex;

            return (
              <button
                key={`${label}-${index}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect?.(suggestion)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                  selected ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
                role="option"
                aria-selected={selected}
              >
                <span
                  className={`shrink-0 rounded px-1 text-[10px] font-bold ${meta.className}`}
                >
                  {meta.label}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{label}</span>
                {suggestion?.detail && (
                  <span className="max-w-24 truncate text-[10px] text-gray-500">
                    {suggestion.detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
