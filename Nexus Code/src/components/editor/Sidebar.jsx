import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Blocks,
  Bug,
  FileCode2,
  GitBranch,
  Search,
  Settings,
} from "lucide-react";
import { getGitCapability } from "../../pages/editor/gitPanelModel";

const SIDEBAR_ITEMS = [
  { icon: FileCode2, label: "Explorer", id: "explorer" },
  { icon: Search, label: "Suche", id: "search" },
  { icon: AlertCircle, label: "Problems", id: "problems" },
  { icon: GitBranch, label: "Git", id: "git" },
  { icon: Bug, label: "Debug", id: "debug" },
  { icon: Blocks, label: "Extensions", id: "extensions" },
];

function SidebarButton({ item, isActive, onClick, gitCapability, problemCount, side }) {
  const Icon = item.icon;
  const gitReady = item.id === "git" && gitCapability.available;
  const hasProblemBadge = item.id === "problems" && problemCount > 0;
  const title = gitReady ? `${item.label} - ${gitCapability.label}` : item.label;
  const indicatorEdge = side === "right" ? "right-[2px]" : "left-[2px]";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={isActive}
      className="nx-code-sidebar-btn relative flex h-10 w-10 items-center justify-center rounded-md outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        background: isActive
          ? "color-mix(in srgb, var(--primary) 14%, transparent)"
          : "transparent",
        color: isActive ? "var(--primary)" : "var(--nexus-muted)",
        boxShadow: isActive
          ? "inset 0 0 0 1px color-mix(in srgb, var(--primary) 24%, transparent)"
          : "none",
      }}
    >
      {isActive ? (
        <span
          className={`absolute ${indicatorEdge} top-2 bottom-2 w-[2px] rounded-full`}
          style={{
            background: "var(--primary)",
            boxShadow: "0 0 8px var(--primary)",
          }}
        />
      ) : null}
      <Icon size={19} strokeWidth={isActive ? 2.1 : 1.8} />
      {gitReady ? (
        <span
          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
          style={{
            background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.65)",
          }}
        />
      ) : null}
      {hasProblemBadge ? (
        <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold leading-none text-white">
          {Math.min(problemCount, 9)}
        </span>
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
}) {
  const [gitCapability, setGitCapability] = useState(getGitCapability);

  useEffect(() => {
    setGitCapability(getGitCapability());
    const intervalId = window.setInterval(() => {
      setGitCapability(getGitCapability());
    }, 4000);

    return () => window.clearInterval(intervalId);
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
          color: "var(--nexus-primary, var(--primary))",
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
