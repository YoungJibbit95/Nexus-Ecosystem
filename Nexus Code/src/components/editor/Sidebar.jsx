import React from "react";
import {
  FileCode2,
  Settings,
  Search,
  GitBranch,
  Bug,
  Blocks,
  AlertCircle,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { icon: FileCode2, label: "Explorer", id: "explorer" },
  { icon: Search, label: "Suche", id: "search" },
  { icon: AlertCircle, label: "Problems", id: "problems" },
  { icon: GitBranch, label: "Git", id: "git" },
  { icon: Bug, label: "Debug", id: "debug" },
  { icon: Blocks, label: "Extensions", id: "extensions" },
];

function SidebarButton({ item, isActive, onClick }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      title={item.label}
      className="nx-code-sidebar-btn relative w-10 h-10 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      style={{
        background: isActive
          ? "color-mix(in srgb, var(--primary) 15%, transparent)"
          : "transparent",
        color: isActive ? "var(--primary)" : "var(--nexus-muted)",
        boxShadow: isActive
          ? "0 0 14px color-mix(in srgb, var(--primary) 16%, transparent)"
          : "none",
        transition:
          "background-color 120ms ease, color 120ms ease, box-shadow 140ms ease",
        willChange: "transform",
      }}
    >
      {isActive ? (
        <div
          className="absolute left-[2px] top-[8px] bottom-[8px] w-[2px] rounded-full"
          style={{
            background: "var(--primary)",
            boxShadow: "0 0 6px var(--primary)",
          }}
        />
      ) : null}
      <Icon size={19} strokeWidth={isActive ? 2 : 1.75} />
    </button>
  );
}

export default function Sidebar({
  activePanel,
  setActivePanel,
  onOpenSettings,
}) {
  return (
    <div
      className="w-14 h-full min-h-0 flex flex-col items-center pt-3 pb-1 gap-1 shrink-0 relative"
      style={{
        background: "var(--nexus-surface)",
        borderRight: "1px solid var(--nexus-border)",
        zIndex: 40,
        overflow: "visible",
        willChange: "transform, opacity",
      }}
    >
      {/* ── Logo mark ─────────────────────────────────────────────── */}
      <div
        className="mb-3 flex flex-col items-center gap-0.5 select-none"
      >
        <span
          className="text-purple-400 font-bold leading-none"
          style={{
            fontSize: 18,
            textShadow: "0 0 10px rgba(168,85,247,0.55)",
          }}
        >
          ✦
        </span>
        <span
          className="text-purple-400/60 font-bold tracking-widest"
          style={{ fontSize: 8 }}
        >
          NC
        </span>
      </div>

      {/* ── Thin divider ──────────────────────────────────────────── */}
      <div
        className="w-6 mb-1 shrink-0 rounded-full"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(128,0,255,0.3), transparent)",
        }}
      />

      {/* ── Nav items ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0.5">
        {SIDEBAR_ITEMS.map((item) => (
          <div
            key={item.id}
            style={{
              transition: "transform 120ms ease, opacity 120ms ease",
              transform: "translateZ(0)",
              opacity: 1,
            }}
          >
            <SidebarButton
              item={item}
              isActive={activePanel === item.id}
              onClick={() =>
                setActivePanel(activePanel === item.id ? null : item.id)
              }
            />
          </div>
        ))}
      </div>

      {/* ── Spacer ────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Thin divider ──────────────────────────────────────────── */}
      <div
        className="w-6 mb-1 shrink-0 rounded-full"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(128,0,255,0.2), transparent)",
        }}
      />

      {/* ── Settings button ───────────────────────────────────────── */}
      <button
        onClick={onOpenSettings}
        className="nx-code-sidebar-btn w-10 h-10 flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        style={{
          background: "transparent",
          color: "var(--nexus-muted)",
          transition: "background-color 120ms ease, color 120ms ease",
        }}
        title="Einstellungen"
      >
        <Settings size={19} strokeWidth={1.75} />
      </button>
    </div>
  );
}
