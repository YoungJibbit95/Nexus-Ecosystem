import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Info,
  Lightbulb,
  MapPin,
  Maximize2,
  RotateCcw,
  Search,
  Shrink,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  getProblemFilePath,
  getProblemKey,
  getProblemSeverityId,
  problemMatchesQuery,
} from "../../pages/editor/editorFeatureModel.js";
import {
  PanelActionButton,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelIconButton,
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

const FILTERS = Object.freeze([
  { id: "all", label: "All" },
  { id: "error", label: "Errors" },
  { id: "warning", label: "Warn" },
  { id: "info", label: "Info" },
]);

function getSeverityMeta(problem) {
  const severity = getProblemSeverityId(problem);
  if (severity === "error") {
    return {
      icon: XCircle,
      label: "Error",
      iconClass: "text-red-500",
      dotClass: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]",
    };
  }
  if (severity === "warning") {
    return {
      icon: AlertTriangle,
      label: "Warning",
      iconClass: "text-yellow-500",
      dotClass: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.35)]",
    };
  }
  if (severity === "info") {
    return {
      icon: Info,
      label: "Info",
      iconClass: "text-blue-500",
      dotClass: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.35)]",
    };
  }
  return {
    icon: Lightbulb,
    label: "Hint",
    iconClass: "text-sky-400",
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]",
  };
}

function getCounts(problems) {
  return problems.reduce(
    (acc, problem) => {
      acc.all += 1;
      acc[getProblemSeverityId(problem)] += 1;
      return acc;
    },
    { all: 0, error: 0, warning: 0, info: 0, hint: 0 },
  );
}

function normalizeProblemList(problems) {
  return Array.isArray(problems) ? problems.filter(Boolean) : [];
}

function problemMatchesFilter(problem, filter) {
  const severity = getProblemSeverityId(problem);
  if (filter === "all") return true;
  if (filter === "info") return severity === "info" || severity === "hint";
  return severity === filter;
}

function getFileProblemCounts(fileProblems) {
  return fileProblems.reduce(
    (acc, item) => {
      const severity = getProblemSeverityId(item.problem);
      acc[severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0, hint: 0 },
  );
}

function getFileTone(counts) {
  if (counts.error > 0) return "danger";
  if (counts.warning > 0) return "warning";
  return "muted";
}


export default function ProblemsPanel({ problems, onSelectProblem }) {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [collapsedGroups, setCollapsedGroups] = React.useState({});
  const listRef = React.useRef(null);
  const normalizedProblems = React.useMemo(
    () => normalizeProblemList(problems),
    [problems],
  );
  const counts = React.useMemo(
    () => getCounts(normalizedProblems),
    [normalizedProblems],
  );

  const filteredProblems = React.useMemo(
    () =>
      normalizedProblems
        .filter((problem) => problemMatchesFilter(problem, filter))
        .filter((problem) => problemMatchesQuery(problem, query)),
    [filter, normalizedProblems, query],
  );

  const grouped = React.useMemo(
    () =>
      filteredProblems.reduce((acc, problem, index) => {
        const file = getProblemFilePath(problem);
        if (!acc[file]) acc[file] = [];
        acc[file].push({ problem, globalIndex: index });
        return acc;
      }, {}),
    [filteredProblems],
  );

  const fileGroups = React.useMemo(
    () =>
      Object.entries(grouped).map(([file, fileProblems]) => ({
        file,
        fileName: file.split(/[\\/]/).pop() || file,
        fileProblems,
        counts: getFileProblemCounts(fileProblems),
      })),
    [grouped],
  );

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filter, query, normalizedProblems.length]);

  React.useEffect(() => {
    const activeRow = listRef.current?.querySelector("[data-active='true']");
    activeRow?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, filteredProblems.length]);

  const selectProblem = React.useCallback(
    (problem, index) => {
      setActiveIndex(index);
      setCollapsedGroups((prev) => ({
        ...prev,
        [getProblemFilePath(problem)]: false,
      }));
      onSelectProblem?.(problem);
    },
    [onSelectProblem],
  );

  const moveActiveProblem = React.useCallback(
    (direction) => {
      if (filteredProblems.length === 0) return;
      const nextIndex =
        (activeIndex + direction + filteredProblems.length) % filteredProblems.length;
      const nextProblem = filteredProblems[nextIndex];
      setActiveIndex(nextIndex);
      setCollapsedGroups((prev) => ({
        ...prev,
        [getProblemFilePath(nextProblem)]: false,
      }));
    },
    [activeIndex, filteredProblems],
  );

  const openActiveProblem = React.useCallback(() => {
    const activeProblem = filteredProblems[activeIndex];
    if (!activeProblem) return;
    selectProblem(activeProblem, activeIndex);
  }, [activeIndex, filteredProblems, selectProblem]);

  const handleListKeyDown = React.useCallback(
    (event) => {
      if (filteredProblems.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveActiveProblem(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveProblem(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(filteredProblems.length - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        openActiveProblem();
      }
    },
    [filteredProblems, moveActiveProblem, openActiveProblem],
  );

  const toggleGroup = (file) => {
    setCollapsedGroups((prev) => ({ ...prev, [file]: !prev[file] }));
  };

  const collapseAllGroups = () => {
    setCollapsedGroups(
      Object.fromEntries(fileGroups.map(({ file }) => [file, true])),
    );
  };

  const expandAllGroups = () => {
    setCollapsedGroups({});
  };

  const resetFilters = () => {
    setFilter("all");
    setQuery("");
    setActiveIndex(0);
  };

  const activeProblem = filteredProblems[activeIndex] || null;
  const filtersActive = filter !== "all" || Boolean(query);
  const infoCount = (counts.info || 0) + (counts.hint || 0);

  const emptyTitle =
    normalizedProblems.length === 0 ? "Keine Probleme" : "Keine Treffer";
  const emptyDetail =
    normalizedProblems.length === 0
      ? "Keine Diagnostics. Neue Meldungen erscheinen hier automatisch nach Datei gruppiert."
      : "Suche oder Severity-Filter blenden aktuell alle Diagnostics aus.";

  return (
    <PanelShell ariaLabel="Problems">
      <PanelHeader
        icon={AlertCircle}
        title="Problems"
        subtitle={
          normalizedProblems.length === 0
            ? "Keine Diagnostics gemeldet"
            : `${filteredProblems.length} von ${normalizedProblems.length} sichtbar`
        }
        status={
          counts.error > 0 ? (
            <PanelBadge tone="danger">{counts.error} Errors</PanelBadge>
          ) : counts.warning > 0 ? (
            <PanelBadge tone="warning">{counts.warning} Warnings</PanelBadge>
          ) : (
            <PanelBadge tone="muted">Clean</PanelBadge>
          )
        }
        actions={
          <>
            <PanelIconButton
              label="Collapse diagnostic groups"
              disabled={fileGroups.length === 0}
              onClick={collapseAllGroups}
            >
              <Shrink />
            </PanelIconButton>
            <PanelIconButton
              label="Expand diagnostic groups"
              disabled={fileGroups.length === 0}
              onClick={expandAllGroups}
            >
              <Maximize2 />
            </PanelIconButton>
            <PanelIconButton
              label="Reset diagnostic filters"
              disabled={!filtersActive}
              onClick={resetFilters}
              active={filtersActive}
            >
              <RotateCcw />
            </PanelIconButton>
          </>
        }
      >
        <div className="space-y-2">
          <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(13rem,1fr)_auto]">
            <div className="relative min-w-0">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Message, Datei oder Code"
                className="h-8 w-full rounded-md border border-white/[0.045] bg-white/[0.018] pl-8 pr-8 text-[12px] text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-sky-300/24 focus:bg-white/[0.032]"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-gray-600 transition-colors hover:bg-white/[0.08] hover:text-gray-300"
                  title="Suche leeren"
                >
                  <RotateCcw size={11} />
                </button>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-md border border-white/[0.035] bg-white/[0.01] p-0.5">
              {FILTERS.map((item) => {
                const active = filter === item.id;
                const count =
                  item.id === "info" ? infoCount : counts[item.id] || 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className="inline-flex min-h-6 min-w-0 items-center gap-1.5 rounded px-2 text-[10px] font-semibold leading-tight transition-colors"
                    style={{
                      background: active
                        ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15)"
                        : "transparent",
                      color: active ? "var(--nexus-primary, #7c8cff)" : "#7f8798",
                    }}
                    aria-pressed={active}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="font-mono text-[9px] opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PanelHeader>

      <PanelBody
        ref={listRef}
        className="p-2 outline-none"
        tabIndex={0}
        role="listbox"
        aria-label="Problems"
        onKeyDown={handleListKeyDown}
      >
        {normalizedProblems.length > 0 || filtersActive ? (
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2 px-1 text-[10px] text-gray-500">
            <span className="truncate">
              {filteredProblems.length} sichtbar{filtersActive ? " mit Filter" : ""}
            </span>
            <span className="hidden shrink-0 text-gray-600 sm:inline">
              Pfeiltasten navigieren, Enter oeffnet
            </span>
          </div>
        ) : null}

        {filteredProblems.length === 0 ? (
          <PanelState
            icon={normalizedProblems.length === 0 ? AlertCircle : Search}
            title={emptyTitle}
            detail={emptyDetail}
            tone={normalizedProblems.length === 0 ? "success" : "muted"}
            actionLabel={normalizedProblems.length > 0 ? "Filter zuruecksetzen" : undefined}
            onAction={normalizedProblems.length > 0 ? resetFilters : undefined}
            compact
          />
        ) : (
          fileGroups.map(({ file, fileName, fileProblems, counts }) => {
            const collapsed = Boolean(collapsedGroups[file]);
            const tone = getFileTone(counts);
            return (
              <div key={file} className="mb-3 last:mb-0">
                <button
                  type="button"
                  onClick={() => toggleGroup(file)}
                  className="mb-1 flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left backdrop-blur-md transition-colors hover:bg-white/[0.036]"
                  style={{
                    background: collapsed ? "rgba(255,255,255,0.012)" : "rgba(255,255,255,0.018)",
                    borderColor:
                      tone === "danger"
                        ? "rgba(239,68,68,0.2)"
                        : tone === "warning"
                          ? "rgba(251,191,36,0.18)"
                          : "rgba(255,255,255,0.06)",
                  }}
                >
                  <ChevronDown
                    size={12}
                    className={`mt-0.5 shrink-0 text-gray-600 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                  />
                  <MapPin size={12} className="mt-0.5 shrink-0 text-sky-300/70" />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block break-words text-[11px] font-semibold leading-snug text-gray-300"
                      style={{ overflowWrap: "anywhere" }}
                      title={file}
                    >
                      {fileName}
                    </span>
                    {file !== fileName ? (
                      <span className="block break-words text-[9px] leading-snug text-gray-600" style={{ overflowWrap: "anywhere" }}>
                        {file}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1">
                    {counts.error > 0 ? <PanelBadge tone="danger">{counts.error}</PanelBadge> : null}
                    {counts.warning > 0 ? <PanelBadge tone="warning">{counts.warning}</PanelBadge> : null}
                    <PanelBadge tone={tone}>{fileProblems.length}</PanelBadge>
                  </span>
                </button>

              {!collapsed ? (
                <div className="space-y-1">
                  {fileProblems.map(({ problem, globalIndex }) => {
                  const meta = getSeverityMeta(problem);
                  const Icon = meta.icon;
                  const active = globalIndex === activeIndex;
                  const sourceLabel = [problem.source || "nexus", problem.code]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <motion.button
                      key={problem.id || getProblemKey(problem, globalIndex)}
                      type="button"
                      whileHover={{ x: 4 }}
                      onFocus={() => setActiveIndex(globalIndex)}
                      onClick={() => selectProblem(problem, globalIndex)}
                      data-active={active ? "true" : "false"}
                      role="option"
                      aria-selected={active}
                      className={`group flex w-full cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left outline-none transition-colors ${
                        active
                          ? "border-sky-300/16 bg-white/[0.038]"
                          : "border-transparent hover:border-white/[0.03] hover:bg-white/[0.022]"
                      }`}
                      title={`${meta.label}: ${problem.message}`}
                    >
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        <Icon size={14} className={meta.iconClass} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="mb-0.5 break-words text-[12px] leading-snug text-gray-300 transition-colors group-hover:text-white"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {problem.message}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-mono text-[10px] text-gray-600">
                            Ln {problem.startLineNumber}, Col {problem.startColumn}
                          </span>
                          <span className="min-w-0 break-words text-[10px] text-gray-600/70" style={{ overflowWrap: "anywhere" }}>
                            {sourceLabel}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                  })}
                </div>
              ) : null}
            </div>
            );
          })
        )}
      </PanelBody>

      <PanelFooter>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
            <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
              {filter === "all" ? "Alle Severities" : `Filter: ${filter}`}
              {activeProblem ? ` - ${getProblemFilePath(activeProblem).split(/[\\/]/).pop()}` : ""}
            </span>
            <span className="min-w-0 break-words text-right" style={{ overflowWrap: "anywhere" }}>
              {counts.error} errors / {counts.warning} warnings
            </span>
          </div>
          {activeProblem ? (
            <PanelActionButton icon={MapPin} onClick={openActiveProblem} tone="accent" className="w-full">
              Aktives Problem oeffnen
            </PanelActionButton>
          ) : null}
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
