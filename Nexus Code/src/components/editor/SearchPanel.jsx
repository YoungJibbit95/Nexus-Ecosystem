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
  SlidersHorizontal,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WORKBENCH_MOTION } from "../../theme/workbenchTokens.ts";
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
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelIconButton,
  PanelInput,
  useNexusReducedMotion,
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
    <span className="nx-panel-secondary">
      {before}
      {highlighted && (
        <mark className="nx-panel-match">
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
      className="nx-panel-button"
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
      <span className="mb-1 block text-[9px] font-semibold uppercase nx-panel-muted">
        {label}
      </span>
      <PanelInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
        title="Workspace leer"
        detail="Suche wird aktiv, sobald Workspace-Dateien verfuegbar sind."
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
        detail={`${fileCount} Dateien werden durchsucht.`}
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
        title="Bereit fuer Suche"
        detail={`${fileCount} Dateien verfuegbar. Tippe einen Begriff, Regex oder Dateinamen.`}
        actionLabel={hasScopeFilters ? "Scopes zuruecksetzen" : undefined}
        onAction={hasScopeFilters ? onResetScopes : undefined}
        compact
      />
    );
  }

  return (
    <PanelState
      icon={Search}
      title="Keine Treffer"
      detail={`"${query}" wurde in ${result.scannedFiles || 0} Dateien nicht gefunden. ${result.skippedFiles || 0} Dateien waren durch Scopes ausgeblendet.`}
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
  const [showScopes, setShowScopes] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const reduceMotion = useNexusReducedMotion();
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
  const scopeControlsVisible = showScopes || hasScopeFilters;

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
    setShowScopes(false);
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
    <PanelShell ariaLabel="Search" className="nx-code-search-panel">
      <PanelHeader
        icon={Search}
        title="Search"
        subtitle={
          hasWorkspace
            ? `${searchableFileCount} Dateien`
            : "Wartet auf Workspace-Dateien"
        }
        status={
          !hasWorkspace ? (
            <PanelBadge tone="warning">Leer</PanelBadge>
          ) : appliedQuery ? (
            <PanelBadge tone={isLoading ? "accent" : "muted"}>
              {isLoading ? "Suche" : totalLabel}
            </PanelBadge>
          ) : null
        }
      >
        <form onSubmit={submitSearch} className="space-y-1.5">
          <div
            className="flex min-w-0 items-center gap-1.5"
          >
            <Search size={13} className="shrink-0 nx-panel-muted" />
            <PanelInput
              ref={inputRef}
              value={draft.query}
              onChange={(event) => updateDraft({ query: event.target.value })}
              placeholder="Search files..."
              className="flex-1"
              aria-label="Search files"
            />
            {draft.query && (
              <button
                type="button"
                onClick={clearSearch}
                className="shrink-0 rounded-md p-1 nx-panel-muted hover:bg-[var(--wb-hover)]"
                title="Suche leeren"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))" }}
          >
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
            <button
              type="button"
              onClick={() => setShowScopes((value) => !value)}
              aria-expanded={scopeControlsVisible}
              title="Include-/Exclude-Scopes anzeigen"
              className="nx-panel-button"
              data-active={scopeControlsVisible}
            >
              <SlidersHorizontal size={12} className="shrink-0" />
              <span className="min-w-0 break-words text-center" style={{ overflowWrap: "anywhere" }}>
                Scopes
              </span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {scopeControlsVisible ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: reduceMotion ? 0 : WORKBENCH_MOTION.regular }}
                style={{ overflow: "hidden" }}
              >
                <div className="grid grid-cols-1 gap-2 rounded-md border border-white/[0.035] bg-black/[0.1] p-2">
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
                  {hasScopeFilters ? (
                    <button
                      type="button"
                      onClick={resetScopes}
                      className="inline-flex min-h-7 min-w-0 items-center justify-center gap-1 rounded-md border border-white/[0.055] bg-white/[0.022] px-2 py-1 text-[10px] font-semibold text-sky-300/80 hover:bg-white/[0.05] hover:text-sky-200"
                    >
                      <RotateCcw size={10} className="shrink-0" />
                      <span className="min-w-0 break-words text-center" style={{ overflowWrap: "anywhere" }}>
                        Scopes zuruecksetzen
                      </span>
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      </PanelHeader>

      <PanelBody>
        {showResults && (
          <div
            className="sticky top-0 z-10 mx-2 mt-2 rounded-md border px-2.5 py-1.5"
            style={{
              background:
                "var(--wb-surface-panel)",
              borderColor: "var(--wb-border-subtle)",
            }}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-[11px] font-semibold nx-panel-secondary" style={{ overflowWrap: "anywhere" }}>
                  {totalLabel} Treffer in {result.matchedFiles} Dateien
                </p>
                <p className="break-words text-[10px] nx-panel-muted" style={{ overflowWrap: "anywhere" }}>
                  {result.scannedFiles} gescannt, {result.skippedFiles} uebersprungen
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                {result.matchLimitReached ? (
                  <PanelBadge tone="warning">Limit</PanelBadge>
                ) : null}
                <PanelIconButton label="Ersten Treffer oeffnen" onClick={openFirstResult} active>
                  <FileSearch />
                </PanelIconButton>
                <PanelIconButton label="Alle Ergebnisgruppen einklappen" onClick={collapseAll}>
                  <Minimize2 />
                </PanelIconButton>
                <PanelIconButton label="Alle Ergebnisgruppen oeffnen" onClick={expandAll}>
                  <Maximize2 />
                </PanelIconButton>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {showResults &&
            groups.map((group) => {
              const groupKey = group.fileId || group.path;
              const isCollapsed = Boolean(collapsed[groupKey]);
              const color = group.color || getExtColor(group.fileName);
              const extension = group.extension || getExtLabel(group.fileName);

              return (
                <motion.div
                  key={group.fileId || group.path}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reduceMotion ? 0 : WORKBENCH_MOTION.regular }}
                  className="nx-panel-result-group mx-2 mt-1 overflow-hidden rounded border"
                >
                  <div className="group flex w-full items-center gap-1.5 px-2.5 py-1.5 transition-colors hover:bg-white/[0.026]">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(groupKey)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      aria-expanded={!isCollapsed}
                    >
                      <motion.div
                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                        transition={{ duration: reduceMotion ? 0 : WORKBENCH_MOTION.regular }}
                        className="shrink-0"
                      >
                        <ChevronDown size={12} className="nx-panel-muted" />
                      </motion.div>
                      <span
                        className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold"
                        style={{ background: `${color}20`, color }}
                      >
                        {extension}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block break-words text-[12px] font-medium leading-snug nx-panel-secondary"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {group.fileName}
                        </span>
                        {group.path && group.path !== group.fileName && (
                          <span className="block break-words text-[10px] leading-snug nx-panel-muted" style={{ overflowWrap: "anywhere" }}>
                            {group.path}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-md p-1 nx-panel-muted opacity-70 transition-colors hover:bg-white/[0.07] hover:text-sky-200 group-hover:opacity-100"
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
                        background: "var(--wb-selection)",
                        color: "var(--wb-selection-text)",
                      }}
                    >
                      {group.perFileLimitReached
                        ? `${group.matches.length}+`
                        : group.totalMatches}
                    </span>
                  </div>

                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: reduceMotion ? 0 : WORKBENCH_MOTION.regular }}
                        style={{ overflow: "hidden" }}
                      >
                        {group.matches.map((match, matchIndex) => (
                          <div
                            key={`${match.lineNumber}:${match.column}:${matchIndex}`}
                            className="group flex items-start gap-1 px-2 py-0.5 transition-colors hover:bg-sky-400/[0.032]"
                          >
                            <button
                              type="button"
                              onClick={() => onFileSelect?.(group.fileId)}
                              className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1 py-0.5 text-left"
                            >
                              <span
                                className="mt-0.5 w-12 shrink-0 text-right font-mono text-[10px]"
                                style={{ color: "var(--wb-text-muted)" }}
                                title={`Line ${match.lineNumber}, Column ${match.column}`}
                              >
                                {match.lineNumber}:{match.column}
                              </span>
                              <span
                                className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed"
                                style={{ overflowWrap: "anywhere" }}
                              >
                                <HighlightedLine match={match} />
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyMatch(group, match)}
                              className="mt-0.5 shrink-0 rounded-md p-1 nx-panel-muted opacity-70 transition-opacity hover:bg-[var(--wb-hover)] group-hover:opacity-100"
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
                            <span className="text-[10px] text-sky-300/75">
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
            <span className="min-w-0 break-words text-[10px] nx-panel-muted" style={{ overflowWrap: "anywhere" }}>
              {footerText}
            </span>
            {result.durationMs > 0 && (
              <span className="shrink-0 text-[10px] nx-panel-muted">
                {result.durationMs} ms
              </span>
            )}
          </div>
          {result.warnings.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {result.warnings.slice(0, 2).map((warning) => (
                <div key={warning} className="break-words text-[10px] text-amber-300/70" style={{ overflowWrap: "anywhere" }}>
                  {warning}
                </div>
              ))}
            </div>
          )}
          {hasScopeFilters && (
            <button
              type="button"
              onClick={resetScopes}
              className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-sky-300/80 hover:text-sky-200"
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
