import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSuggestionLabel(suggestion) {
  return cleanText(
    suggestion?.label ||
      suggestion?.text ||
      suggestion?.insertText ||
      suggestion?.detail ||
      "completion",
  );
}

function getSuggestionType(suggestion) {
  return cleanText(suggestion?.type || suggestion?.kind || "text").toLowerCase();
}

function getSuggestionDetail(suggestion, typeName) {
  return cleanText(suggestion?.detail || suggestion?.section || typeName);
}

function getSuggestionSource(suggestion) {
  if (suggestion?.source) return cleanText(suggestion.source);
  if (suggestion?.section) return cleanText(suggestion.section);
  if (Number.isFinite(Number(suggestion?.boost))) return "LSP";
  return "";
}

function getTypeMeta(type) {
  if (type.includes("keyword")) {
    return {
      label: "K",
      name: "Keyword",
      className: "bg-purple-400/15 text-purple-200 border-purple-300/20",
    };
  }
  if (type.includes("function") || type.includes("method")) {
    return {
      label: "F",
      name: "Function",
      className: "bg-blue-400/15 text-blue-200 border-blue-300/20",
    };
  }
  if (type.includes("class") || type.includes("type") || type.includes("interface")) {
    return {
      label: "T",
      name: "Type",
      className: "bg-cyan-400/15 text-cyan-200 border-cyan-300/20",
    };
  }
  if (type.includes("snippet")) {
    return {
      label: "S",
      name: "Snippet",
      className: "bg-emerald-400/15 text-emerald-200 border-emerald-300/20",
    };
  }
  if (type.includes("property") || type.includes("field")) {
    return {
      label: "P",
      name: "Property",
      className: "bg-amber-400/15 text-amber-200 border-amber-300/20",
    };
  }
  return {
    label: "V",
    name: "Value",
    className: "bg-slate-400/15 text-slate-200 border-slate-300/20",
  };
}

function KeyboardHint({ label }) {
  return (
    <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-gray-400">
      {label}
    </span>
  );
}

export default function AutocompletePopup({
  suggestions = [],
  visible,
  selectedIndex = 0,
  onSelect,
  position = { top: 0, left: 0 },
}) {
  const optionRefs = useRef([]);
  const safeSuggestions = Array.isArray(suggestions)
    ? suggestions.filter(Boolean)
    : [];
  const shouldShow = visible && safeSuggestions.length > 0;
  const safeSelectedIndex = Math.max(
    0,
    Math.min(Number(selectedIndex) || 0, Math.max(0, safeSuggestions.length - 1)),
  );

  useEffect(() => {
    if (!shouldShow) return;
    optionRefs.current[safeSelectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [safeSelectedIndex, shouldShow]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="absolute z-50 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-2xl"
          style={{
            top: position.top,
            left: position.left,
            background: "var(--nexus-panel-surface, #0f1320)",
            borderColor: "var(--nexus-border, rgba(255,255,255,0.12))",
            boxShadow: "0 22px 65px rgba(0,0,0,0.42)",
          }}
          role="listbox"
          aria-label="Autocomplete suggestions"
          aria-activedescendant={`autocomplete-option-${safeSelectedIndex}`}
        >
          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(5rem,8rem)_3.5rem] gap-2 border-b border-white/10 bg-black/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
            <span />
            <span>Symbol</span>
            <span>Detail</span>
            <span className="text-right">Kind</span>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {safeSuggestions.map((suggestion, index) => {
              const label = getSuggestionLabel(suggestion);
              const type = getSuggestionType(suggestion);
              const meta = getTypeMeta(type);
              const detail = getSuggestionDetail(suggestion, meta.name);
              const source = getSuggestionSource(suggestion);
              const selected = index === safeSelectedIndex;

              return (
                <button
                  id={`autocomplete-option-${index}`}
                  key={`${label}-${detail}-${index}`}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect?.(suggestion)}
                  className={`grid min-h-[2.75rem] w-full grid-cols-[2.25rem_minmax(0,1fr)_minmax(5rem,8rem)_3.5rem] items-center gap-2 rounded-lg border px-2 text-left text-sm transition-colors ${
                    selected
                      ? "border-blue-300/20 bg-blue-400/10 text-white shadow-[inset_2px_0_0_rgba(96,165,250,0.85)]"
                      : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-gray-200"
                  }`}
                  role="option"
                  aria-selected={selected}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-md border text-[10px] font-bold ${meta.className}`}
                    title={meta.name}
                  >
                    {meta.label}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[13px] font-semibold">
                      {label}
                    </span>
                    {source && (
                      <span className="mt-0.5 block truncate text-[10px] text-gray-600">
                        {source}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-gray-500">{detail}</span>
                  <span className="truncate text-right text-[10px] text-gray-600">
                    {meta.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-3 py-2 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <KeyboardHint label="Up" />
              <KeyboardHint label="Down" />
              <span>Navigieren</span>
            </div>
            <div className="flex items-center gap-1.5">
              <KeyboardHint label="Enter" />
              <span>Einsetzen</span>
              <KeyboardHint label="Esc" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
