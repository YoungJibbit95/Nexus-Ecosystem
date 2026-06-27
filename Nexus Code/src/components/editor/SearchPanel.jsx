import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CaseSensitive,
  ChevronDown,
  Loader2,
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
      className="flex min-w-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all"
      style={{
        background: active ? "rgba(128,0,255,0.17)" : "rgba(255,255,255,0.035)",
        color: active ? "#c084fc" : "#7b8190",
        border: active
          ? "1px solid rgba(168,85,247,0.38)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
      title={title}
      aria-pressed={active}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function ScopeInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-semibold uppercase tracking-widest text-gray-600">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-7 w-full rounded-md border border-white/10 bg-white/[0.035] px-2 text-[11px] text-gray-300 outline-none placeholder:text-gray-700 focus:border-purple-500/45"
      />
    </label>
  );
}

function SearchState({ state, result, query, fileCount }) {
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <Loader2 size={24} className="mb-3 animate-spin text-purple-400/80" />
        <p className="text-xs text-gray-500">Suche laeuft...</p>
        <p className="mt-1 text-[10px] text-gray-700">
          {fileCount} Dateien im aktuellen Workspace
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <AlertTriangle size={24} className="mb-3 text-amber-400/90" />
        <p className="text-xs text-gray-500">Suche konnte nicht starten</p>
        <p className="mt-1 max-w-full truncate text-[10px] text-amber-300/80">
          {result.error}
        </p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <motion.div
          animate={{ opacity: [0.42, 0.8, 0.42] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Search size={28} className="mb-3 text-gray-700" />
        </motion.div>
        <p className="text-xs text-gray-600">Suchbegriff eingeben</p>
        <p className="mt-1 text-[10px] text-gray-700">
          {fileCount} Dateien verfuegbar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <Search size={24} className="mb-3 text-gray-700" />
      <p className="text-xs text-gray-600">Keine Treffer fuer</p>
      <p className="mt-1 max-w-full truncate text-xs font-mono text-gray-500">
        "{query}"
      </p>
      {result.scannedFiles > 0 && (
        <p className="mt-2 text-[10px] text-gray-700">
          {result.scannedFiles} Dateien durchsucht
        </p>
      )}
    </div>
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

  const toggleCollapse = (id) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    <motion.div
      initial={{ x: -260, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex h-full w-full shrink-0 flex-col overflow-hidden"
      style={{
        background: "rgba(6, 6, 20, 0.32)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="shrink-0 border-b border-white/5 bg-white/[0.025] px-3 pb-3 pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Suche
          </span>
          {appliedQuery && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              {isLoading ? "..." : totalLabel}
            </span>
          )}
        </div>

        <form onSubmit={submitSearch} className="space-y-2">
          <div
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: draft.query
                ? "1px solid rgba(128,0,255,0.35)"
                : "1px solid rgba(255,255,255,0.07)",
              transition: "border-color 0.2s ease",
            }}
          >
            <Search size={13} className="shrink-0 text-gray-500" />
            <input
              ref={inputRef}
              value={draft.query}
              onChange={(event) => updateDraft({ query: event.target.value })}
              placeholder="In Dateien suchen..."
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
                className="shrink-0 rounded p-0.5 hover:bg-white/10"
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
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
                  className="border-b border-white/[0.035]"
                >
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.fileId)}
                    className="group flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
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
                      <span className="block truncate text-xs font-medium text-gray-300">
                        {group.fileName}
                      </span>
                      {group.path && group.path !== group.fileName && (
                        <span className="block truncate text-[10px] text-gray-600">
                          {group.path}
                        </span>
                      )}
                    </span>
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
                          <button
                            type="button"
                            key={`${match.lineNumber}:${match.column}:${matchIndex}`}
                            onClick={() => onFileSelect?.(group.fileId)}
                            className="group flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-purple-500/[0.07]"
                          >
                            <span
                              className="mt-0.5 w-12 shrink-0 text-right font-mono text-[10px]"
                              style={{ color: "#4b5563" }}
                              title={`Line ${match.lineNumber}, Column ${match.column}`}
                            >
                              {match.lineNumber}:{match.column}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-mono text-[11px] leading-relaxed group-hover:text-gray-300">
                              <HighlightedLine match={match} />
                            </span>
                          </button>
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
          />
        )}
      </div>

      {(appliedQuery || result.warnings.length > 0) && (
        <div
          className="shrink-0 px-3 py-2"
          style={{ borderTop: "1px solid rgba(128,0,255,0.08)" }}
        >
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
        </div>
      )}
    </motion.div>
  );
}
