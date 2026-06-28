import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Blocks,
  Bug,
  FileCode2,
  GitBranch,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { getGitCapability } from "../../pages/editor/gitPanelModel";
import {
  getExtensionStats,
  loadExtensionRegistry,
} from "../../pages/editor/extensionSystem";

const SIDEBAR_ITEMS = [
  { icon: FileCode2, label: "Explorer", id: "explorer" },
  { icon: Search, label: "Suche", id: "search" },
  { icon: AlertCircle, label: "Problems", id: "problems" },
  { icon: GitBranch, label: "Git", id: "git" },
  { icon: Bug, label: "Debug", id: "debug" },
  { icon: Blocks, label: "Extensions", id: "extensions" },
  { icon: UserRound, label: "Account", id: "account" },
];

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
  const badgeEdge = side === "right" ? "left-1.5" : "right-1.5";
  const dotEdge = side === "right" ? "left-2" : "right-2";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={isActive}
      className="nx-code-sidebar-btn relative isolate flex h-10 w-10 items-center justify-center rounded-md outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        background: isActive
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14)"
          : "transparent",
        color: isActive ? "var(--nexus-primary, #7c8cff)" : "var(--nexus-muted)",
        boxShadow: isActive
          ? "inset 0 0 0 1px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)"
          : "none",
      }}
    >
      {isActive ? (
        <span
          className={`absolute ${indicatorEdge} top-2 bottom-2 w-[2px] rounded-full`}
          style={{
            background: "var(--nexus-primary, #7c8cff)",
            boxShadow: "0 0 8px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.72)",
          }}
        />
      ) : null}
      <Icon size={19} strokeWidth={isActive ? 2.1 : 1.8} />
      {gitReady ? (
        <span
          className={`nx-code-sidebar-badge absolute ${dotEdge} top-2 h-1.5 w-1.5 rounded-full`}
          style={{
            background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.65)",
          }}
        />
      ) : null}
      {hasProblemBadge ? (
        <span className={`nx-code-sidebar-badge absolute ${badgeEdge} top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm shadow-black/30`}>
          {Math.min(problemCount, 9)}
        </span>
      ) : null}
      {item.id === "extensions" && extensionStats.enabled > 0 ? (
        <span
          className={`nx-code-sidebar-badge absolute bottom-1.5 ${badgeEdge} h-1.5 w-1.5 rounded-full`}
          style={{
            background: "var(--nexus-primary, #7c8cff)",
            boxShadow: "0 0 7px rgba(124,140,255,0.7)",
          }}
        />
      ) : null}
      {item.id === "account" ? (
        <span
          className={`nx-code-sidebar-badge absolute bottom-1.5 ${badgeEdge} h-1.5 w-1.5 rounded-full`}
          style={{
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
      className="flex h-full min-h-0 w-14 shrink-0 flex-col items-center gap-1 overflow-visible px-2 pb-2 pt-2"
      style={{
        background: "var(--nexus-surface)",
        borderRight: side === "left" ? "1px solid var(--nexus-border)" : 0,
        borderLeft: side === "right" ? "1px solid var(--nexus-border)" : 0,
        zIndex: 40,
      }}
    >
      <div
        className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold"
        style={{
          background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)",
          borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.2)",
          color: "var(--nexus-primary, #7c8cff)",
        }}
        title={compact ? "Nexus Code" : "Nexus Code Rail"}
      >
        NC
      </div>

      <div
        className="mb-1 h-px w-7 shrink-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-visible py-1">
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
        className="my-1 h-px w-7 shrink-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        }}
      />

      <button
        type="button"
        onClick={onOpenSettings}
        className="nx-code-sidebar-btn flex h-10 w-10 items-center justify-center rounded-md text-[var(--nexus-muted)] outline-none transition-colors hover:bg-white/[0.06] hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-purple-500/60"
        title="Einstellungen"
      >
        <Settings size={19} strokeWidth={1.8} />
      </button>
    </div>
  );
}
