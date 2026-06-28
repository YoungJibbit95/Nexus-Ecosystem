import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  MapPin,
  RotateCcw,
  Search,
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
  PanelMetric,
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

const FILTERS = Object.freeze([
  { id: "all", label: "ALL" },
  { id: "error", label: "ERRORS" },
  { id: "warning", label: "WARNINGS" },
  { id: "info", label: "INFO" },
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

  const resetFilters = () => {
    setFilter("all");
    setQuery("");
    setActiveIndex(0);
  };

  const activeProblem = filteredProblems[activeIndex] || null;

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
            <PanelBadge tone="success">Clean</PanelBadge>
          )
        }
        actions={
          <>
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
          </>
        }
      >
        <div className="grid grid-cols-3 gap-1.5">
          <PanelMetric label="Errors" value={counts.error} tone={counts.error > 0 ? "danger" : "muted"} />
          <PanelMetric label="Warnings" value={counts.warning} tone={counts.warning > 0 ? "warning" : "muted"} />
          <PanelMetric label="Info" value={(counts.info || 0) + (counts.hint || 0)} tone="accent" />
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap gap-1">
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
                className="flex h-7 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold transition-colors"
                style={{
                  background: active
                    ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.15)"
                    : "rgba(255,255,255,0.032)",
                  borderColor: active
                    ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.26)"
                    : "rgba(255,255,255,0.075)",
                  color: active ? "var(--nexus-primary, #7c8cff)" : "#8b93a7",
                }}
                aria-pressed={active}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    active ? "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.55)]" : "bg-gray-600"
                  }`}
                />
                <span className="truncate">
                  {item.label} ({count})
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
            className="h-8 w-full rounded-md border border-white/10 bg-white/[0.04] pl-8 pr-2 text-[12px] text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-purple-400/45"
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
        {filteredProblems.length === 0 ? (
          <PanelState
            icon={normalizedProblems.length === 0 ? AlertCircle : Search}
            title={emptyTitle}
            detail={emptyDetail}
            tone={normalizedProblems.length === 0 ? "success" : "muted"}
            actionLabel={normalizedProblems.length > 0 ? "Filter zuruecksetzen" : undefined}
            onAction={normalizedProblems.length > 0 ? resetFilters : undefined}
          />
        ) : (
          fileGroups.map(({ file, fileName, fileProblems, counts }) => {
            const collapsed = Boolean(collapsedGroups[file]);
            const tone = getFileTone(counts);
            return (
            <div key={file} className="mb-4 last:mb-0">
              <button
                type="button"
                onClick={() => toggleGroup(file)}
                className="sticky top-0 z-10 mb-1 flex w-full items-center gap-2 rounded-md border bg-[#060614]/95 px-2 py-1.5 text-left backdrop-blur-md transition-colors hover:bg-white/[0.04]"
                style={{
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
                <MapPin size={12} className="shrink-0 text-purple-300/70" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold text-gray-300" title={file}>
                    {fileName}
                  </span>
                  {file !== fileName ? (
                    <span className="block truncate text-[9px] text-gray-600">{file}</span>
                  ) : null}
                </span>
                {counts.error > 0 ? <PanelBadge tone="danger">{counts.error}</PanelBadge> : null}
                {counts.warning > 0 ? <PanelBadge tone="warning">{counts.warning}</PanelBadge> : null}
                <PanelBadge tone={tone}>{fileProblems.length}</PanelBadge>
              </button>

              {!collapsed ? (
                <div className="space-y-0.5">
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
                      className={`group flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-1.5 text-left outline-none transition-colors ${
                        active ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
                      }`}
                      title={`${meta.label}: ${problem.message}`}
                    >
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        <Icon size={14} className={meta.iconClass} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-[12px] leading-snug text-gray-300 transition-colors group-hover:text-white">
                          {problem.message}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-mono text-[10px] text-gray-600">
                            Ln {problem.startLineNumber}, Col {problem.startColumn}
                          </span>
                          <span className="truncate text-[10px] text-gray-600/70">
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
            <span className="truncate">
              {filter === "all" ? "Alle Severities" : `Filter: ${filter}`}
              {activeProblem ? ` - ${getProblemFilePath(activeProblem).split(/[\\/]/).pop()}` : ""}
            </span>
            <span className="shrink-0">
              {counts.error} errors / {counts.warning} warnings
            </span>
          </div>
          {activeProblem ? (
            <PanelActionButton icon={MapPin} onClick={openActiveProblem} tone="accent">
              Aktives Problem oeffnen
            </PanelActionButton>
          ) : null}
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
