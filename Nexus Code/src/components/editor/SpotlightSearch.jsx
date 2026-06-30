import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createSpotlightResults,
  groupCommandPaletteItems,
  normalizeSearchValue,
} from "../../pages/editor/commandPaletteModel.js";

const EMPTY_FILES = Object.freeze([]);
const EMPTY_EXTENSION_COMMANDS = Object.freeze([]);
const PAGE_STEP = 6;

function KeyboardHint({ label }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
      {label}
    </span>
  );
}

function MetaChip({ className = "", children }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 text-[10px] ${className}`}
    >
      {children}
    </span>
  );
}

function getResultChipLabel(result) {
  if (result.resultKind === "file") return "DATEI";
  if (result.resultKind === "symbol") return "SYMBOL";
  return result.categoryMeta?.label || "COMMAND";
}

export default function SpotlightSearch({
  isOpen,
  onClose,
  onAction,
  files = EMPTY_FILES,
  extensionCommands = EMPTY_EXTENSION_COMMANDS,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultRefs = useRef([]);

  const results = useMemo(
    () =>
      createSpotlightResults({
        files,
        query,
        extensionCommands,
      }),
    [extensionCommands, files, query],
  );
  const groups = useMemo(() => groupCommandPaletteItems(results), [results]);
  const normalizedQuery = normalizeSearchValue(query);
  const selectedResult = results[selectedIndex] || null;

  useEffect(() => {
    if (!isOpen) return undefined;
    setQuery("");
    setSelectedIndex(0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, selectedIndex]);

  useEffect(() => {
    resultRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [results.length, selectedIndex]);

  useEffect(() => {
    resultRefs.current.length = results.length;
  }, [results.length]);

  const moveSelection = (delta) => {
    if (results.length === 0) return;
    setSelectedIndex((prev) => (prev + delta + results.length) % results.length);
  };

  const runResult = (selected) => {
    if (!selected) return;
    if (selected.resultKind === "file" || selected.resultKind === "symbol") {
      onAction?.("open-file", selected.payload || selected.id);
    } else {
      onAction?.(selected.actionId || selected.id, selected.payload);
    }
    onClose?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      moveSelection(PAGE_STEP);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      moveSelection(-PAGE_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(Math.max(0, results.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runResult(results[selectedIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
    }
  };

  let visibleIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[2000] bg-black/45 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: -28, scale: 0.98, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.98, x: "-50%" }}
            transition={{ type: "spring", stiffness: 390, damping: 32 }}
            className="fixed left-1/2 top-[10%] z-[2001] w-[min(52rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#080b14]/95 shadow-[0_32px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Spotlight Search"
            style={{ borderColor: "var(--nexus-border, rgba(255,255,255,0.12))" }}
          >
            <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-cyan-200">
                <Search size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Dateien, Actions oder Workbench-Kommandos suchen..."
                  className="w-full bg-transparent text-lg font-semibold text-gray-100 outline-none placeholder:text-gray-600"
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                  aria-controls="nexus-spotlight-results"
                  aria-activedescendant={
                    results[selectedIndex] ? `spotlight-option-${selectedIndex}` : undefined
                  }
                />
                <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                  <span>{results.length} Treffer</span>
                  {normalizedQuery && selectedResult?.matchReason ? (
                    <span>{selectedResult.matchReason} match</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              id="nexus-spotlight-results"
              className="max-h-[480px] overflow-y-auto p-3"
              role="listbox"
              aria-label="Spotlight results"
            >
              {groups.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {groups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <section key={group.id} className="space-y-1.5">
                        <div className="flex items-center gap-2 px-2 py-1">
                          <span className={`size-1.5 rounded-full ${group.tone.dot}`} />
                          <GroupIcon size={13} className={group.tone.text} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
                            {group.label}
                          </span>
                          <span className="truncate text-[11px] text-gray-600">
                            {group.description}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          {group.items.map((result) => {
                            const Icon = result.icon;
                            const index = visibleIndex;
                            const active = index === selectedIndex;
                            const detail = result.description || result.fsPath || result.categoryMeta?.description;
                            const visibleDetail =
                              result.resultKind === "symbol" && result.symbol?.kind
                                ? `${result.symbol.kind} / ${detail}`
                                : detail;
                            const showMatchReason = Boolean(
                              normalizedQuery && result.matchReason,
                            );
                            visibleIndex += 1;

                            return (
                              <motion.button
                                id={`spotlight-option-${index}`}
                                key={`${result.resultKind}-${result.id}-${index}`}
                                ref={(node) => {
                                  resultRefs.current[index] = node;
                                }}
                                type="button"
                                title={detail || result.label || result.name}
                                data-result-kind={result.resultKind}
                                data-action-id={result.actionId || result.id}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => runResult(result)}
                                className={`grid min-h-[60px] w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 text-left transition-all ${
                                  active
                                    ? `${result.tone.active} border-white/15 text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)]`
                                    : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.045] hover:text-gray-200"
                                }`}
                                role="option"
                                aria-selected={active}
                                aria-posinset={index + 1}
                                aria-setsize={results.length}
                              >
                                <span
                                  className={`flex size-9 items-center justify-center rounded-lg border ${
                                    active
                                      ? result.tone.icon
                                      : "border-white/10 bg-white/[0.035] text-gray-500"
                                  }`}
                                >
                                  <Icon size={17} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold">
                                    {result.label || result.name}
                                  </span>
                                  <span className="mt-0.5 block truncate font-mono text-xs text-gray-500">
                                    {visibleDetail}
                                  </span>
                                </span>
                                <span className="flex min-w-[6.5rem] justify-end gap-1">
                                  {showMatchReason ? (
                                    <MetaChip className="border-white/10 bg-white/[0.035] text-gray-400">
                                      {result.matchReason}
                                    </MetaChip>
                                  ) : null}
                                  {result.shortcut ? (
                                    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-gray-400">
                                      {result.shortcut}
                                    </span>
                                  ) : (
                                    <MetaChip className={result.tone.chip}>
                                      {getResultChipLabel(result)}
                                    </MetaChip>
                                  )}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-500">
                    <Search size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-300">
                      Keine Treffer
                    </div>
                    <div className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
                      Suche nach Dateiname, Pfad, Command, Kategorie oder Shortcut.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <KeyboardHint label="Up" />
                <KeyboardHint label="Down" />
                <span>Navigieren</span>
                <KeyboardHint label="Enter" />
                <span>Oeffnen</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                {selectedResult ? (
                  <span className="max-w-[20rem] truncate text-gray-400">
                    {selectedResult.resultKind === "file"
                      ? selectedResult.description
                      : selectedResult.resultKind === "symbol"
                        ? `${selectedResult.symbol?.kind || "symbol"} / ${selectedResult.description}`
                        : selectedResult.categoryMeta?.label}
                    {selectedResult.matchReason ? ` / ${selectedResult.matchReason}` : ""}
                  </span>
                ) : (
                  <span className="text-gray-600">No selection</span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
