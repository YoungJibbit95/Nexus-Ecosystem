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
  PanelInput,
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
      iconClass: "text-[var(--wb-danger)]",
      dotClass: "bg-[var(--wb-danger)]",
    };
  }
  if (severity === "warning") {
    return {
      icon: AlertTriangle,
      label: "Warning",
      iconClass: "text-[var(--wb-warning)]",
      dotClass: "bg-[var(--wb-warning)]",
    };
  }
  if (severity === "info") {
    return {
      icon: Info,
      label: "Info",
      iconClass: "text-[var(--wb-info)]",
      dotClass: "bg-[var(--wb-info)]",
    };
  }
  return {
    icon: Lightbulb,
    label: "Hint",
    iconClass: "text-[var(--wb-info)]",
    dotClass: "bg-[var(--wb-info)]",
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
    <PanelShell ariaLabel="Problems" className="nx-code-problems-panel">
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
          <div className="nx-problems-filter-grid">
            <div className="relative min-w-0">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 nx-panel-muted"
              />
              <PanelInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Message, Datei oder Code"
                aria-label="Filter diagnostics"
                style={{ paddingLeft: "32px", paddingRight: "32px" }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full nx-panel-muted transition-colors hover:bg-[var(--wb-hover)]"
                  title="Suche leeren"
                >
                  <RotateCcw size={11} />
                </button>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-0.5 rounded-md border border-white/[0.03] bg-white/[0.008] p-0.5">
              {FILTERS.map((item) => {
                const active = filter === item.id;
                const count =
                  item.id === "info" ? infoCount : counts[item.id] || 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className="nx-panel-button"
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
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2 px-1 text-[10px] nx-panel-muted">
            <span className="truncate">
              {filteredProblems.length} sichtbar{filtersActive ? " mit Filter" : ""}
            </span>
            <span className="hidden shrink-0 nx-panel-muted sm:inline">
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
                  className="nx-panel-result-group mb-1 flex w-full items-start gap-2 rounded border px-2.5 py-1.5 text-left"
                  aria-expanded={!collapsed}
                >
                  <ChevronDown
                    size={12}
                    className={`mt-0.5 shrink-0 nx-panel-muted transition-transform ${collapsed ? "-rotate-90" : ""}`}
                  />
                  <MapPin size={12} className="mt-0.5 shrink-0 text-sky-300/70" />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block break-words text-[11px] font-semibold leading-snug nx-panel-secondary"
                      style={{ overflowWrap: "anywhere" }}
                      title={file}
                    >
                      {fileName}
                    </span>
                    {file !== fileName ? (
                      <span className="block break-words text-[9px] leading-snug nx-panel-muted" style={{ overflowWrap: "anywhere" }}>
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
                    <button
                      key={problem.id || getProblemKey(problem, globalIndex)}
                      type="button"
                      onFocus={() => setActiveIndex(globalIndex)}
                      onClick={() => selectProblem(problem, globalIndex)}
                      data-active={active ? "true" : "false"}
                      role="option"
                      aria-selected={active}
                      className="nx-panel-result-row group flex w-full cursor-pointer items-start gap-2.5 px-2.5 py-1.5 text-left"
                      title={`${meta.label}: ${problem.message}`}
                    >
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        <Icon size={14} className={meta.iconClass} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="mb-0.5 break-words text-[12px] leading-snug nx-panel-secondary transition-colors"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {problem.message}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-mono text-[10px] nx-panel-muted">
                            Ln {problem.startLineNumber}, Col {problem.startColumn}
                          </span>
                          <span className="min-w-0 break-words text-[10px] nx-panel-muted" style={{ overflowWrap: "anywhere" }}>
                            {sourceLabel}
                          </span>
                        </div>
                      </div>
                    </button>
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] nx-panel-muted">
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
