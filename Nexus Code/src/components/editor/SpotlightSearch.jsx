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
const EMPTY_STATE_SUGGESTIONS = Object.freeze([
  "git",
  "problems",
  "terminal",
  "extensions",
  "settings",
  "search",
]);

function getResultCountLabel(count) {
  return count === 1 ? "1 Treffer" : `${count} Treffer`;
}

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
      className={`rounded-md border px-2 py-1 text-[10px] leading-none ${className}`}
    >
      {children}
    </span>
  );
}

function SuggestionButton({ label, onPick }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPick(label)}
      className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-gray-300 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
    >
      {label}
    </button>
  );
}

function EmptyState({ query, onPickSuggestion }) {
  const normalizedQuery = normalizeSearchValue(query);
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-500">
        <Search size={22} />
      </div>
      <div className="max-w-md">
        <div className="text-sm font-semibold text-gray-200">
          {normalizedQuery
            ? `Keine Treffer fuer "${query.trim()}"`
            : "Keine Spotlight-Quellen geladen"}
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-500">
          {normalizedQuery
            ? "Suche nach Datei, Symbol, Command, Kategorie oder Shortcut."
            : "Dateien, Symbole und Commands erscheinen hier, sobald der Workspace bereit ist."}
        </div>
      </div>
      {normalizedQuery ? (
        <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
          {EMPTY_STATE_SUGGESTIONS.map((suggestion) => (
            <SuggestionButton
              key={suggestion}
              label={suggestion}
              onPick={onPickSuggestion}
            />
          ))}
        </div>
      ) : null}
    </div>
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

  const pickSuggestion = (value) => {
    setQuery(value);
    setSelectedIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());
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
            className="fixed left-1/2 top-[10%] z-[2001] w-[min(52rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-white/10 bg-[#080b14]/95 shadow-[0_32px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl"
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
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
                  <span>{getResultCountLabel(results.length)}</span>
                  {normalizedQuery && selectedResult?.matchReason ? (
                    <span>Treffer ueber {selectedResult.matchReason}</span>
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
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1">
                          <span className={`size-1.5 rounded-full ${group.tone.dot}`} />
                          <GroupIcon size={13} className={group.tone.text} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
                            {group.label}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] leading-none text-gray-500">
                            {group.items.length}
                          </span>
                          <span className="min-w-[12rem] flex-1 text-[11px] leading-4 text-gray-600">
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
                            const showFrequent = Boolean(
                              !normalizedQuery && result.isFrequent,
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
                                className={`grid min-h-[66px] w-full grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 text-left transition-all sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(7rem,auto)] ${
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
                                  <span className="block break-words text-sm font-semibold leading-5">
                                    {result.label || result.name}
                                  </span>
                                  <span className="mt-1 block break-all font-mono text-xs leading-5 text-gray-500">
                                    {visibleDetail}
                                  </span>
                                </span>
                                <span className="col-start-2 flex min-w-0 flex-wrap items-center justify-start gap-1 sm:col-start-auto sm:justify-end">
                                  {showFrequent ? (
                                    <MetaChip className="border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
                                      Haeufig
                                    </MetaChip>
                                  ) : null}
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
                <EmptyState query={query} onPickSuggestion={pickSuggestion} />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-5 py-3 text-[11px] text-gray-500">
              <div className="flex flex-wrap items-center gap-2">
                <KeyboardHint label="Up" />
                <KeyboardHint label="Down" />
                <span>Navigieren</span>
                <KeyboardHint label="Enter" />
                <span>Oeffnen</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                {selectedResult ? (
                  <span className="max-w-full break-words text-right text-gray-400">
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
