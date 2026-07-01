import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
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

  const emptyTitle =
    normalizedProblems.length === 0 ? "Keine Probleme" : "Keine Treffer";
  const emptyDetail =
    normalizedProblems.length === 0
      ? "Diagnostics sind leer oder noch nicht vom Language Server geladen."
      : "Passe Severity oder Suchfilter an, um andere Diagnostics zu sehen.";

  return (
    <PanelShell ariaLabel="Problems">
      <PanelHeader
        icon={AlertCircle}
        title="Problems"
        subtitle={`${filteredProblems.length} sichtbar von ${normalizedProblems.length} Diagnostics`}
        status={
          counts.error > 0 ? (
            <PanelBadge tone="danger">{counts.error} Errors</PanelBadge>
          ) : (
            <PanelBadge tone="muted">Clean</PanelBadge>
          )
        }
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/[0.055] bg-black/15 px-2.5 py-1.5 text-[10px] text-gray-500">
          <span className="font-semibold text-red-300/80">{counts.error} errors</span>
          <span className="font-semibold text-amber-300/80">{counts.warning} warnings</span>
          <span className="font-semibold text-sky-300/80">
            {(counts.info || 0) + (counts.hint || 0)} info
          </span>
        </div>

        <div className="mt-2 grid min-w-0 grid-cols-2 gap-1">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            const count =
              item.id === "info"
                ? (counts.info || 0) + (counts.hint || 0)
                : counts[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className="flex min-h-7 min-w-0 items-center justify-between gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold leading-tight transition-colors"
                style={{
                  background: active
                    ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15)"
                    : "rgba(255,255,255,0.024)",
                  borderColor: active
                    ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.26)"
                    : "rgba(255,255,255,0.055)",
                  color: active ? "var(--nexus-primary, #7c8cff)" : "#8b93a7",
                }}
                aria-pressed={active}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    active ? "bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.4)]" : "bg-gray-600"
                  }`}
                />
                <span className="min-w-0 flex-1 break-words" style={{ overflowWrap: "anywhere" }}>
                  {item.label}
                </span>
                <span className="shrink-0 font-mono text-[10px] opacity-80">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-2 min-w-0">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Message, file, source oder code"
            className="h-8 w-full rounded-lg border border-white/[0.06] bg-white/[0.026] pl-8 pr-2 text-[12px] text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-sky-300/35 focus:bg-white/[0.04]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-600 transition-colors hover:bg-white/[0.08] hover:text-gray-300"
              title="Suche leeren"
            >
              <RotateCcw size={12} />
            </button>
          ) : null}
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
          <div className="sticky top-0 z-20 mb-2 rounded-xl border border-white/[0.055] bg-[#070a13]/95 px-2 py-1.5 backdrop-blur-md">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 break-words text-[10px] font-semibold text-gray-500" style={{ overflowWrap: "anywhere" }}>
                {filteredProblems.length} sichtbar
                {filtersActive ? " mit Filter" : ""}
              </span>
              <div className="flex shrink-0 items-center gap-1">
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
                <PanelIconButton
                  label="Previous diagnostic"
                  disabled={filteredProblems.length === 0}
                  onClick={() => moveActiveProblem(-1)}
                >
                  <ChevronUp />
                </PanelIconButton>
                <PanelIconButton
                  label="Next diagnostic"
                  disabled={filteredProblems.length === 0}
                  onClick={() => moveActiveProblem(1)}
                >
                  <ChevronDown />
                </PanelIconButton>
              </div>
            </div>
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
                  className="mb-1 flex w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left backdrop-blur-md transition-colors hover:bg-white/[0.045]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(9,12,25,0.96), rgba(7,9,19,0.9))",
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
                  className={`shrink-0 text-gray-600 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                />
                <MapPin size={12} className="shrink-0 text-sky-300/70" />
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
                {counts.error > 0 ? <PanelBadge tone="danger">{counts.error}</PanelBadge> : null}
                {counts.warning > 0 ? <PanelBadge tone="warning">{counts.warning}</PanelBadge> : null}
                <PanelBadge tone={tone}>{fileProblems.length}</PanelBadge>
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
                      className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-left outline-none transition-colors ${
                        active
                          ? "border-purple-300/20 bg-white/[0.07]"
                          : "border-transparent hover:border-white/[0.045] hover:bg-white/[0.032]"
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
          <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500">
            <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
              {filter === "all" ? "Alle Severities" : `Filter: ${filter}`}
              {activeProblem ? ` - ${getProblemFilePath(activeProblem).split(/[\\/]/).pop()}` : ""}
            </span>
            <span className="shrink-0">
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
