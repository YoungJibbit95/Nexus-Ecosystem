import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Blocks,
  Bug,
  FileCode2,
  GitBranch,
  GitPullRequest,
  KanbanSquare,
  ListChecks,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getGitCapability } from "../../pages/editor/gitPanelModel";
import {
  getExtensionStats,
  loadExtensionRegistry,
} from "../../pages/editor/extensionSystem";

const SIDEBAR_ITEMS = [
  { icon: FileCode2, label: "Explorer", railLabel: "Files", id: "explorer" },
  { icon: Search, label: "Suche", railLabel: "Find", id: "search" },
  { icon: AlertCircle, label: "Problems", railLabel: "Issues", id: "problems" },
  { icon: GitBranch, label: "Git", railLabel: "Git", id: "git" },
  { icon: ListChecks, label: "GitHub Issues", railLabel: "Tasks", id: "issues" },
  { icon: GitPullRequest, label: "Pull Requests", railLabel: "PRs", id: "prs" },
  { icon: KanbanSquare, label: "Projects", railLabel: "Board", id: "projects" },
  { icon: Bug, label: "Debug", railLabel: "Run", id: "debug" },
  { icon: Blocks, label: "Extensions", railLabel: "Lab", id: "extensions" },
  { icon: UserRound, label: "Account", railLabel: "Me", id: "account" },
];

function formatBadgeCount(value) {
  if (value > 99) return "99+";
  if (value > 9) return "9+";
  return value;
}

function SidebarButton({
  item,
  isActive,
  onClick,
  gitCapability,
  problemCount,
  extensionStats,
  controlStatus,
  side,
}) {
  const Icon = item.icon;
  const railLabel = item.railLabel || item.label;
  const gitReady = item.id === "git" && gitCapability.available;
  const hasProblemBadge = item.id === "problems" && problemCount > 0;
  const extensionTitle =
    item.id === "extensions"
      ? `${item.label} - ${extensionStats.enabled}/${extensionStats.installed} aktiv`
      : item.label;
  const title = gitReady ? `${item.label} - ${gitCapability.label}` : extensionTitle;
  const indicatorEdge = side === "right" ? "right-[2px]" : "left-[2px]";
  const accountMode = controlStatus?.mode || "offline";
  const accountTone =
    accountMode === "online"
      ? "#22c55e"
      : accountMode === "limited"
        ? "#f59e0b"
        : "#38bdf8";
  const edgeStyle = side === "right" ? { left: 4 } : { right: 4 };
  const dotEdgeStyle = side === "right" ? { left: 7 } : { right: 7 };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={isActive}
      aria-label={title}
      className="nx-code-sidebar-btn nx-code-sidebar-rail-button group relative isolate flex flex-col items-center justify-center outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        width: 44,
        minHeight: 46,
        gap: 2,
        borderRadius: 8,
        padding: "5px 3px",
        background: isActive
          ? "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.17), rgba(255,255,255,0.025))"
          : "transparent",
        color: isActive ? "var(--nexus-primary, #7c8cff)" : "var(--nexus-muted)",
        boxShadow: isActive
          ? "0 0 20px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1), inset 0 0 0 1px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.25)"
          : "none",
      }}
    >
      {isActive ? (
        <span
          className={`nx-code-sidebar-active-rail absolute ${indicatorEdge} rounded-full`}
          style={{
            top: 7,
            bottom: 7,
            width: 2,
            background: "var(--nexus-primary, #7c8cff)",
            boxShadow: "0 0 8px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.72)",
          }}
        />
      ) : null}
      <span
        className="nx-code-sidebar-icon-frame flex shrink-0 items-center justify-center"
        style={{
          width: 25,
          height: 22,
          borderRadius: 7,
          background: isActive ? "rgba(255, 255, 255, 0.052)" : "transparent",
        }}
      >
        <Icon size={17} strokeWidth={isActive ? 2.15 : 1.8} />
      </span>
      <span
        className="nx-code-sidebar-label max-w-full truncate text-[9px] font-semibold"
        style={{
          color: isActive ? "var(--nexus-text, #eef2f8)" : "var(--nexus-muted)",
          lineHeight: 1.05,
        }}
      >
        {railLabel}
      </span>
      {gitReady ? (
        <span
          className="nx-code-sidebar-badge nx-code-sidebar-status-dot absolute rounded-full"
          style={{
            top: 7,
            width: 8,
            height: 8,
            ...dotEdgeStyle,
            background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.65)",
          }}
        />
      ) : null}
      {hasProblemBadge ? (
        <span
          className="nx-code-sidebar-badge nx-code-sidebar-count-badge absolute flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold leading-none text-white shadow-sm shadow-black/30"
          style={{
            top: 4,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            ...edgeStyle,
          }}
        >
          {formatBadgeCount(problemCount)}
        </span>
      ) : null}
      {item.id === "extensions" && extensionStats.enabled > 0 ? (
        <span
          className="nx-code-sidebar-badge nx-code-sidebar-count-badge absolute flex items-center justify-center rounded-full text-[8px] font-bold leading-none"
          style={{
            bottom: 4,
            minWidth: 15,
            height: 15,
            padding: "0 4px",
            ...edgeStyle,
            background: "var(--nexus-primary, #7c8cff)",
            color: "#fff",
            boxShadow: "0 0 7px rgba(124,140,255,0.7)",
          }}
        >
          {formatBadgeCount(extensionStats.enabled)}
        </span>
      ) : null}
      {item.id === "account" ? (
        <span
          className="nx-code-sidebar-badge nx-code-sidebar-status-dot absolute rounded-full"
          style={{
            bottom: 6,
            width: 8,
            height: 8,
            ...edgeStyle,
            background: accountTone,
            boxShadow: `0 0 7px ${accountTone}`,
          }}
        />
      ) : null}
    </button>
  );
}

export default function Sidebar({
  activePanel,
  setActivePanel,
  onOpenSettings,
  side = "left",
  compact = false,
  problemCount = 0,
  controlStatus = null,
}) {
  const [gitCapability, setGitCapability] = useState(getGitCapability);
  const [extensionStats, setExtensionStats] = useState(() =>
    getExtensionStats(loadExtensionRegistry()),
  );

  useEffect(() => {
    setGitCapability(getGitCapability());
    const intervalId = window.setInterval(() => {
      setGitCapability(getGitCapability());
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const syncExtensionStats = (event) => {
      if (event?.detail?.stats) {
        setExtensionStats(event.detail.stats);
        return;
      }
      setExtensionStats(getExtensionStats(loadExtensionRegistry()));
    };

    syncExtensionStats();
    window.addEventListener("nx-code-extensions-changed", syncExtensionStats);
    return () => {
      window.removeEventListener("nx-code-extensions-changed", syncExtensionStats);
    };
  }, []);

  return (
    <div
      className="nx-code-sidebar-rail flex h-full min-h-0 shrink-0 flex-col items-center overflow-visible"
      style={{
        width: compact ? 50 : 54,
        gap: 6,
        padding: compact ? "7px 3px" : "8px 5px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01)), var(--nexus-surface)",
        borderRight: side === "left" ? "1px solid var(--nexus-border)" : 0,
        borderLeft: side === "right" ? "1px solid var(--nexus-border)" : 0,
        boxShadow:
          side === "left"
            ? "inset -1px 0 0 rgba(255,255,255,0.025)"
            : "inset 1px 0 0 rgba(255,255,255,0.025)",
        zIndex: 40,
      }}
    >
      <div
        className="nx-code-sidebar-orb flex shrink-0 flex-col items-center justify-center border text-[11px] font-semibold"
        style={{
          width: 44,
          height: 40,
          borderRadius: 8,
          gap: 1,
          background:
            "linear-gradient(145deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16), rgba(255,255,255,0.035))",
          borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
          color: "var(--nexus-primary, #7c8cff)",
          boxShadow:
            "0 0 22px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
        title={compact ? "Nexus Code" : "Nexus Code Rail"}
      >
        <Sparkles size={11} />
        <span>NC</span>
      </div>

      <div
        className="h-px shrink-0"
        style={{
          width: 36,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
        }}
      />

      <div
        className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-visible"
        style={{ gap: 5, padding: "2px 0" }}
      >
        {SIDEBAR_ITEMS.map((item) => (
          <SidebarButton
            key={item.id}
            item={item}
            isActive={activePanel === item.id}
            onClick={() =>
              setActivePanel(activePanel === item.id ? null : item.id)
            }
            gitCapability={gitCapability}
            problemCount={problemCount}
            extensionStats={extensionStats}
            controlStatus={controlStatus}
            side={side}
          />
        ))}
      </div>

      <div
        className="h-px shrink-0"
        style={{
          width: 36,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        }}
      />

      <button
        type="button"
        onClick={onOpenSettings}
        className="nx-code-sidebar-btn nx-code-sidebar-settings flex flex-col items-center justify-center text-[var(--nexus-muted)] outline-none transition-colors hover:bg-white/[0.06] hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-purple-500/60"
        style={{
          width: 44,
          minHeight: 44,
          gap: 2,
          borderRadius: 8,
        }}
        title="Einstellungen"
      >
        <Settings size={17} strokeWidth={1.8} />
        <span className="max-w-full truncate text-[9px] font-semibold leading-none">
          Setup
        </span>
      </button>
    </div>
  );
}
