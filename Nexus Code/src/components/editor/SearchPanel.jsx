import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CaseSensitive,
  ChevronDown,
  Copy,
  FileSearch,
  FolderOpen,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DEFAULT_SEARCH_OPTIONS,
  SEARCH_DEBOUNCE_MS,
  createEmptySearchResult,
  getExtColor,
  getExtLabel,
  normalizeSearchOptions,
  searchFiles,
} from "../../pages/editor/searchPanelModel.js";
import {
  PanelActionButton,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

function HighlightedLine({ match }) {
  const excerpt = match?.excerpt || "";
  const start = Math.max(0, match?.matchStart || 0);
  const end = Math.min(excerpt.length, start + Math.max(0, match?.matchLength || 0));
  const before = excerpt.slice(0, start);
  const highlighted = excerpt.slice(start, end);
  const after = excerpt.slice(end);

  return (
    <span className="text-gray-400">
      {before}
      {highlighted && (
        <mark
          style={{
            background: "rgba(168,85,247,0.35)",
            color: "#f3e8ff",
            borderRadius: "2px",
            padding: "0 1px",
          }}
        >
          {highlighted}
        </mark>
      )}
      {after}
    </span>
  );
}

function OptionButton({ active, onClick, title, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-8 min-w-0 items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold leading-tight transition-all"
      style={{
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)"
          : "rgba(255,255,255,0.032)",
        color: active ? "var(--nexus-primary, #7c8cff)" : "#8b93a7",
        border: active
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.3)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
      title={title}
      aria-pressed={active}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      <span className="min-w-0 break-words text-center" style={{ overflowWrap: "anywhere" }}>
        {label}
      </span>
    </button>
  );
}

function ScopeInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-semibold uppercase text-gray-600">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-8 w-full rounded-xl border border-white/[0.075] bg-white/[0.035] px-2.5 py-1.5 text-[11px] leading-snug text-gray-300 outline-none placeholder:text-gray-700 focus:border-purple-400/45"
      />
    </label>
  );
}

function SearchState({ state, result, query, fileCount, hasScopeFilters, onResetScopes }) {
  if (fileCount === 0) {
    return (
      <PanelState
        icon={FolderOpen}
        tone="warning"
        title="Kein Workspace indexiert"
        detail="Oeffne einen Ordner oder lade Dateien, damit die Suche echte Workspace-Ergebnisse liefern kann."
      />
    );
  }

  if (state === "loading") {
    return (
      <PanelState
        icon={Loader2}
        spinning
        tone="accent"
        title="Suche laeuft"
        detail={`${fileCount} Dateien im aktuellen Workspace`}
      />
    );
  }

  if (state === "error") {
    return (
      <PanelState
        icon={AlertTriangle}
        tone="danger"
        title="Suche konnte nicht starten"
        detail={result.error}
      />
    );
  }

  if (!query) {
    return (
      <PanelState
        icon={Search}
        title="Bereit fuer Workspace-Suche"
        detail={`${fileCount} Dateien verfuegbar. Nutze Include/Exclude, wenn du den Scan eingrenzen willst.`}
        actionLabel={hasScopeFilters ? "Scopes zuruecksetzen" : undefined}
        onAction={hasScopeFilters ? onResetScopes : undefined}
        compact
      >
        <div className="grid grid-cols-3 gap-1.5 text-left">
          <div className="rounded-xl border border-white/[0.06] bg-black/15 px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase text-gray-600">Regex</p>
            <p className="text-[10px] text-gray-400">Pattern-Suche</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/15 px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase text-gray-600">Include</p>
            <p className="text-[10px] text-gray-400">src/*.jsx</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/15 px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase text-gray-600">Exclude</p>
            <p className="text-[10px] text-gray-400">dist,node</p>
          </div>
        </div>
      </PanelState>
    );
  }

  return (
    <PanelState
      icon={Search}
      title="Keine Treffer"
      detail={`"${query}" in ${result.scannedFiles || 0} Dateien durchsucht. ${result.skippedFiles || 0} Dateien wurden durch Scopes uebersprungen.`}
      actionLabel={hasScopeFilters ? "Scopes lockern" : undefined}
      onAction={hasScopeFilters ? onResetScopes : undefined}
    />
  );
}

export default function SearchPanel({ files = [], onFileSelect }) {
  const [draft, setDraft] = useState(DEFAULT_SEARCH_OPTIONS);
  const [appliedOptions, setAppliedOptions] = useState(DEFAULT_SEARCH_OPTIONS);
  const [searchState, setSearchState] = useState({
    status: "idle",
    result: createEmptySearchResult(),
  });
  const [collapsed, setCollapsed] = useState({});
  const [isDebouncing, setIsDebouncing] = useState(false);
  const inputRef = useRef(null);
  const runIdRef = useRef(0);

  const searchableFileCount = useMemo(
    () => files.filter((file) => file?.type !== "folder").length,
    [files],
  );

  const appliedQuery = appliedOptions.query.trim();
  const result = searchState.result || createEmptySearchResult();
  const groups = result.groups || [];
  const isLoading = searchState.status === "loading" || isDebouncing;
  const showResults =
    appliedQuery && searchState.status === "ready" && groups.length > 0 && !isDebouncing;
  const hasWorkspace = searchableFileCount > 0;
  const hasScopeFilters = Boolean(draft.include.trim() || draft.exclude.trim());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const nextOptions = normalizeSearchOptions(draft);
    if (!nextOptions.query.trim()) {
      setIsDebouncing(false);
      setAppliedOptions(nextOptions);
      return undefined;
    }

    setIsDebouncing(true);
    const timerId = window.setTimeout(() => {
      setAppliedOptions(nextOptions);
      setIsDebouncing(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [draft]);

  useEffect(() => {
    setCollapsed({});
  }, [
    appliedOptions.query,
    appliedOptions.include,
    appliedOptions.exclude,
    appliedOptions.caseSensitive,
    appliedOptions.useRegex,
    appliedOptions.wholeWord,
  ]);

  const readFileContent = useCallback(async (file) => {
    if (!file?.fsPath || typeof window === "undefined") return "";
    const api = window.electronAPI;
    if (!api || typeof api.readFile !== "function") return "";
    return api.readFile(file.fsPath);
  }, []);

  useEffect(() => {
    const options = normalizeSearchOptions(appliedOptions);
    const query = options.query.trim();

    if (!query) {
      setSearchState({ status: "idle", result: createEmptySearchResult() });
      return undefined;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    let cancelled = false;

    setSearchState((prev) => ({
      status: "loading",
      result: prev.result || createEmptySearchResult(),
    }));

    searchFiles({ files, options, readFile: readFileContent })
      .then((nextResult) => {
        if (cancelled || runIdRef.current !== runId) return;
        setSearchState({
          status: nextResult.error ? "error" : "ready",
          result: nextResult,
        });
      })
      .catch((error) => {
        if (cancelled || runIdRef.current !== runId) return;
        setSearchState({
          status: "error",
          result: createEmptySearchResult({
            error: error?.message || "Unbekannter Suchfehler.",
          }),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [appliedOptions, files, readFileContent]);

  const updateDraft = (patch) => {
    setDraft((prev) => normalizeSearchOptions({ ...prev, ...patch }));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setIsDebouncing(false);
    setAppliedOptions(normalizeSearchOptions(draft));
  };

  const clearSearch = () => {
    const nextOptions = { ...draft, query: "" };
    setDraft(nextOptions);
    setAppliedOptions(normalizeSearchOptions(nextOptions));
    inputRef.current?.focus();
  };

  const resetScopes = () => {
    updateDraft({ include: "", exclude: "" });
  };

  const toggleCollapse = (id) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    setCollapsed(
      Object.fromEntries(groups.map((group) => [group.fileId || group.path, true])),
    );
  };

  const expandAll = () => {
    setCollapsed({});
  };

  const openFirstResult = () => {
    const first = groups[0];
    if (first?.fileId) onFileSelect?.(first.fileId);
  };

  const copyMatch = useCallback((group, match) => {
    const text = `${group.path || group.fileName}:${match.lineNumber}:${match.column} ${match.lineText || match.excerpt}`;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, []);

  const totalLabel = result.matchLimitReached
    ? `${result.totalMatches}+`
    : String(result.totalMatches);
  const footerText =
    result.totalMatches > 0
      ? `${totalLabel} Treffer in ${result.matchedFiles} ${
          result.matchedFiles === 1 ? "Datei" : "Dateien"
        }`
      : `${result.scannedFiles || 0} Dateien durchsucht`;

  return (
    <PanelShell ariaLabel="Search">
      <PanelHeader
        icon={Search}
        title="Workspace Search"
        subtitle={
          hasWorkspace
            ? `${searchableFileCount} Dateien im Workspace`
            : "Workspace-Suche wartet auf Dateien"
        }
        status={
          !hasWorkspace ? (
            <PanelBadge tone="warning">Idle</PanelBadge>
          ) : appliedQuery ? (
            <PanelBadge tone={isLoading ? "accent" : "muted"}>
              {isLoading ? "..." : totalLabel}
            </PanelBadge>
          ) : null
        }
      >
        <form onSubmit={submitSearch} className="space-y-2">
          <div
            className="flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 py-1.5"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.058), rgba(255,255,255,0.028))",
              border: draft.query
                ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.34)"
                : "1px solid rgba(255,255,255,0.07)",
              transition: "border-color 0.2s ease",
            }}
          >
            <Search size={13} className="shrink-0 text-gray-500" />
            <input
              ref={inputRef}
              value={draft.query}
              onChange={(event) => updateDraft({ query: event.target.value })}
              placeholder="Search files..."
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder:text-gray-600"
            />
            {draft.query && (
              <motion.button
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                onClick={clearSearch}
                className="shrink-0 rounded-lg p-1 hover:bg-white/10"
                title="Suche leeren"
              >
                <X size={11} className="text-gray-500" />
              </motion.button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <OptionButton
              active={draft.caseSensitive}
              onClick={() => updateDraft({ caseSensitive: !draft.caseSensitive })}
              icon={CaseSensitive}
              label="Case"
              title="Gross-/Kleinschreibung beachten"
            />
            <OptionButton
              active={draft.useRegex}
              onClick={() => updateDraft({ useRegex: !draft.useRegex })}
              label=".* Regex"
              title="Regulaeren Ausdruck verwenden"
            />
            <OptionButton
              active={draft.wholeWord}
              onClick={() => updateDraft({ wholeWord: !draft.wholeWord })}
              label="Wort"
              title="Nur ganze Woerter"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <ScopeInput
              label="Include"
              value={draft.include}
              onChange={(value) => updateDraft({ include: value })}
              placeholder="src/**/*.jsx, *.md"
            />
            <ScopeInput
              label="Exclude"
              value={draft.exclude}
              onChange={(value) => updateDraft({ exclude: value })}
              placeholder="node_modules, dist"
            />
          </div>
        </form>
      </PanelHeader>

      <PanelBody>
        {showResults && (
          <div
            className="sticky top-0 z-10 mx-2 mt-2 rounded-2xl border px-3 py-2 backdrop-blur-md"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,13,27,0.96), rgba(8,10,22,0.9))",
              borderColor: "rgba(255,255,255,0.065)",
            }}
          >
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-gray-300">
                  {totalLabel} Treffer in {result.matchedFiles} Dateien
                </p>
                <p className="truncate text-[10px] text-gray-600">
                  {result.scannedFiles} gescannt, {result.skippedFiles} uebersprungen
                </p>
              </div>
              {result.matchLimitReached ? (
                <PanelBadge tone="warning">limitiert</PanelBadge>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <PanelActionButton icon={FileSearch} onClick={openFirstResult} tone="accent">
                Erster
              </PanelActionButton>
              <PanelActionButton icon={Minimize2} onClick={collapseAll}>
                Klappen
              </PanelActionButton>
              <PanelActionButton icon={Maximize2} onClick={expandAll}>
                Oeffnen
              </PanelActionButton>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {showResults &&
            groups.map((group, index) => {
              const isCollapsed = collapsed[group.fileId];
              const color = group.color || getExtColor(group.fileName);
              const extension = group.extension || getExtLabel(group.fileName);

              return (
                <motion.div
                  key={group.fileId || group.path}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: Math.min(index * 0.025, 0.16), duration: 0.18 }}
                  className="mx-2 mt-1 overflow-hidden rounded-xl border border-white/[0.045] bg-white/[0.018]"
                >
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.fileId)}
                    className="group flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.045]"
                  >
                    <motion.div
                      animate={{ rotate: isCollapsed ? -90 : 0 }}
                      transition={{ duration: 0.18 }}
                      className="shrink-0"
                    >
                      <ChevronDown size={12} className="text-gray-600" />
                    </motion.div>
                    <span
                      className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold"
                      style={{ background: `${color}20`, color }}
                    >
                      {extension}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block break-words text-xs font-medium leading-snug text-gray-300"
                        style={{ overflowWrap: "anywhere" }}
                      >
                        {group.fileName}
                      </span>
                      {group.path && group.path !== group.fileName && (
                        <span className="block truncate text-[10px] text-gray-600">
                          {group.path}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-1 text-gray-600 opacity-0 transition-opacity hover:bg-white/[0.07] hover:text-purple-200 group-hover:opacity-100"
                      title="Datei oeffnen"
                      onClick={(event) => {
                        event.stopPropagation();
                        onFileSelect?.(group.fileId);
                      }}
                    >
                      <FileSearch size={12} />
                    </button>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: "rgba(128,0,255,0.15)",
                        color: "#a855f7",
                      }}
                    >
                      {group.perFileLimitReached
                        ? `${group.matches.length}+`
                        : group.totalMatches}
                    </span>
                  </button>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: "hidden" }}
                      >
                        {group.matches.map((match, matchIndex) => (
                          <div
                            key={`${match.lineNumber}:${match.column}:${matchIndex}`}
                            className="group flex items-start gap-1 px-2 py-1 transition-colors hover:bg-purple-500/[0.07]"
                          >
                            <button
                              type="button"
                              onClick={() => onFileSelect?.(group.fileId)}
                              className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-0.5 text-left"
                            >
                              <span
                                className="mt-0.5 w-12 shrink-0 text-right font-mono text-[10px]"
                                style={{ color: "#4b5563" }}
                                title={`Line ${match.lineNumber}, Column ${match.column}`}
                              >
                                {match.lineNumber}:{match.column}
                              </span>
                              <span
                                className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed group-hover:text-gray-300"
                                style={{ overflowWrap: "anywhere" }}
                              >
                                <HighlightedLine match={match} />
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyMatch(group, match)}
                              className="mt-0.5 shrink-0 rounded-md p-1 text-gray-700 opacity-0 transition-opacity hover:bg-white/[0.08] hover:text-gray-300 group-hover:opacity-100"
                              title="Trefferzeile kopieren"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        ))}

                        {group.perFileLimitReached && (
                          <button
                            type="button"
                            onClick={() => onFileSelect?.(group.fileId)}
                            className="w-full px-16 py-1 text-left transition-colors hover:bg-white/5"
                          >
                            <span className="text-[10px] text-purple-400/70">
                              + {group.totalMatches - group.matches.length} weitere Treffer
                            </span>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {!showResults && (
          <SearchState
            state={isLoading ? "loading" : searchState.status}
            result={result}
            query={draft.query.trim()}
            fileCount={searchableFileCount}
            hasScopeFilters={hasScopeFilters}
            onResetScopes={resetScopes}
          />
        )}
      </PanelBody>

      {(appliedQuery || result.warnings.length > 0) && (
        <PanelFooter>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[10px] text-gray-600">{footerText}</span>
            {result.durationMs > 0 && (
              <span className="shrink-0 text-[10px] text-gray-700">
                {result.durationMs} ms
              </span>
            )}
          </div>
          {result.warnings.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {result.warnings.slice(0, 2).map((warning) => (
                <div key={warning} className="truncate text-[10px] text-amber-300/70">
                  {warning}
                </div>
              ))}
            </div>
          )}
          {hasScopeFilters && (
            <button
              type="button"
              onClick={resetScopes}
              className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-purple-300/80 hover:text-purple-200"
            >
              <RotateCcw size={10} />
              Include/Exclude zuruecksetzen
            </button>
          )}
        </PanelFooter>
      )}
    </PanelShell>
  );
}
