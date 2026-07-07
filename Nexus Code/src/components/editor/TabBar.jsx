import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Search, TerminalSquare, Save, Circle, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const langColors = {
  js: "#facc15",
  jsx: "#61dafb",
  ts: "#3b82f6",
  tsx: "#3b82f6",
  py: "#38bdf8",
  java: "#f97316",
  html: "#f97316",
  css: "#3b82f6",
  json: "#facc15",
  md: "#a855f7",
  cpp: "#3b82f6",
  c: "#6b7280",
  rs: "#f97316",
  go: "#38bdf8",
  rb: "#ef4444",
  php: "#8b5cf6",
};

const languagePresets = [
  { id: "typescript", label: "TypeScript", ext: "ts" },
  { id: "javascript", label: "JavaScript", ext: "js" },
  { id: "python", label: "Python", ext: "py" },
  { id: "html", label: "HTML", ext: "html" },
  { id: "css", label: "CSS", ext: "css" },
  { id: "json", label: "JSON", ext: "json" },
  { id: "markdown", label: "Markdown", ext: "md" },
  { id: "rust", label: "Rust", ext: "rs" },
  { id: "go", label: "Go", ext: "go" },
];

function getExt(name) {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function ActionButton({ title, onClick, active = false, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className="nx-code-tab-action grid h-7 w-7 shrink-0 place-items-center border border-white/10 text-gray-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 [&>svg]:h-3.5 [&>svg]:w-3.5"
      style={{
        background: active
          ? "linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14), rgba(var(--nexus-accent-2-rgb, 56, 189, 248), 0.04))"
          : "rgba(0,0,0,0.14)",
        color: active ? "var(--nexus-primary, #7c8cff)" : undefined,
        borderRadius: "var(--nexus-radius-md, 12px)",
        boxShadow: active
          ? "0 0 14px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08), inset 0 1px 0 rgba(255,255,255,0.04)"
          : "inset 0 1px 0 rgba(255,255,255,0.025)",
      }}
    >
      {children}
    </button>
  );
}

function TabActionMenuItem({ item, onSelect }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => {
        item.action?.();
        onSelect();
      }}
      className={`nx-code-menu-item ${item.active ? "is-active" : ""}`}
      role="menuitem"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {Icon ? <Icon size={13} className="shrink-0" /> : null}
        <span className="min-w-0 truncate">{item.label}</span>
      </span>
      {item.shortcut ? (
        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-gray-500">
          {item.shortcut}
        </span>
      ) : null}
    </button>
  );
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onCreateFile,
  onSaveAll,
  onToggleTerminal,
  onOpenCommandPalette,
  bottomPanelOpen = false,
  bottomTab = "terminal",
  compact = false,
  zenMode = false,
}) {
  const [newFileMenuOpen, setNewFileMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [customFileName, setCustomFileName] = useState("");
  const menuRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const safeTabs = useMemo(
    () => (Array.isArray(tabs) ? tabs.filter((tab) => tab && tab.name) : []),
    [tabs],
  );

  useEffect(() => {
    if (!newFileMenuOpen && !actionsMenuOpen) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (menuRef.current?.contains(target) || actionsMenuRef.current?.contains(target))
      ) {
        return;
      }
      setNewFileMenuOpen(false);
      setActionsMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setNewFileMenuOpen(false);
      setActionsMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [actionsMenuOpen, newFileMenuOpen]);

  const tabsCount = safeTabs.length;
  const menuItems = useMemo(() => languagePresets, []);
  const tabActionItems = useMemo(
    () => [
      {
        label: "Befehlspalette",
        shortcut: "F1",
        action: onOpenCommandPalette,
        icon: Search,
      },
      {
        label:
          bottomPanelOpen && bottomTab === "terminal"
            ? "Terminal schliessen"
            : "Terminal oeffnen",
        shortcut: "Ctrl+`",
        action: onToggleTerminal,
        icon: TerminalSquare,
        active: bottomPanelOpen && bottomTab === "terminal",
      },
      {
        label: "Alle speichern",
        shortcut: "Ctrl+S",
        action: onSaveAll,
        icon: Save,
      },
    ],
    [
      bottomPanelOpen,
      bottomTab,
      onOpenCommandPalette,
      onSaveAll,
      onToggleTerminal,
    ],
  );

  const submitCustomFile = () => {
    const trimmed = customFileName.trim();
    if (!trimmed) return;
    onCreateFile?.(trimmed, "name");
    setCustomFileName("");
    setNewFileMenuOpen(false);
  };

  return (
    <div
      className={`nx-code-tabbar flex h-full min-w-0 shrink-0 items-stretch border-b border-white/5 ${compact ? "is-compact" : ""}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.004)), var(--nexus-editor-surface)",
        borderBottom: "1px solid var(--nexus-border)",
        minHeight: "40px",
      }}
    >
      <div
        className="nx-code-tabbar-actions flex h-full shrink-0 items-center gap-1 border-r border-white/5 px-2"
        role="toolbar"
        aria-label="Editor actions"
      >
        <div className="relative" ref={menuRef}>
          <ActionButton
            title="Neue Datei"
            onClick={() => {
              setActionsMenuOpen(false);
              setNewFileMenuOpen((prev) => !prev);
            }}
            active={newFileMenuOpen}
          >
            <Plus size={14} />
          </ActionButton>

          <AnimatePresence>
            {newFileMenuOpen && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="nx-code-menu-dropdown nx-code-new-file-menu absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] border border-white/10 p-2"
                role="menu"
              >
                <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Datei-Typ
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onCreateFile?.(item.id, "language");
                        setNewFileMenuOpen(false);
                      }}
                      className="nx-code-new-file-option min-w-0 border border-white/5 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-white/15 hover:bg-white/10"
                      style={{ color: "var(--nexus-text)" }}
                      role="menuitem"
                    >
                      <span
                        className="inline-block max-w-full font-semibold leading-tight"
                        style={{ overflowWrap: "normal", wordBreak: "normal" }}
                      >
                        {item.label}
                      </span>
                      <span className="ml-1 inline-block text-[10px] text-gray-500">
                        .{item.ext}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="my-2 h-px bg-white/10" />

                <div className="px-1">
                  <div className="mb-1.5 text-[10px] text-gray-500">Dateiname</div>
                  <div className="flex gap-1.5">
                    <input
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitCustomFile();
                      }}
                      placeholder="api.contract.nxs"
                      className="h-8 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-2 text-xs outline-none focus:border-purple-500/50"
                      style={{ color: "var(--nexus-text)" }}
                    />
                    <button
                      type="button"
                      onClick={submitCustomFile}
                      className="nx-code-new-file-create min-h-8 min-w-[5.6rem] shrink-0 border border-white/15 bg-white/10 px-2.5 text-xs font-semibold hover:bg-white/20"
                      style={{ color: "var(--nexus-text)" }}
                    >
                      Erstellen
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={actionsMenuRef}>
          <ActionButton
            title="Tabaktionen"
            onClick={() => {
              setNewFileMenuOpen(false);
              setActionsMenuOpen((prev) => !prev);
            }}
            active={actionsMenuOpen}
          >
            <MoreHorizontal size={14} />
          </ActionButton>

          <AnimatePresence>
            {actionsMenuOpen && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="nx-code-menu-dropdown absolute left-0 top-full z-50 mt-2 w-[min(13rem,calc(100vw-1rem))] p-1"
                role="menu"
              >
                {tabActionItems.map((item) => (
                  <TabActionMenuItem
                    key={item.label}
                    item={item}
                    onSelect={() => setActionsMenuOpen(false)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="nx-code-tab-scroll h-full min-w-0 flex-1 overflow-x-auto">
        {tabsCount === 0 ? (
          <div className="nx-code-tabbar-empty flex h-full min-w-0 items-center gap-2 px-3 text-[11px] text-gray-500">
            <Circle size={7} fill="currentColor" />
            <span className="truncate">
              {zenMode ? "Zen Focus" : "Keine Datei geoeffnet"}
            </span>
          </div>
        ) : (
          <div className="flex h-full min-w-max items-center">
            {safeTabs.map((tab) => {
              const ext = getExt(tab.name);
              const color = langColors[ext] || "#6b7280";
              const isActive = tab.id === activeTabId;

              return (
                <button
                  key={tab.id || tab.name}
                  type="button"
                  onClick={() => onTabSelect?.(tab.id)}
                  title={tab.name}
                  role="tab"
                  aria-selected={isActive}
                  className="nx-code-tab group relative flex h-full min-w-[8.5rem] max-w-[15rem] shrink-0 items-center gap-2 border-r border-white/5 px-3 text-left transition-colors hover:bg-white/[0.04]"
                  style={{
                    background: isActive
                      ? "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.09), rgba(var(--nexus-accent-2-rgb, 56, 189, 248), 0.025), rgba(255,255,255,0.012))"
                      : "transparent",
                    borderBottom: isActive
                      ? `2px solid ${color}`
                      : "2px solid transparent",
                  }}
                >
                  <span
                    className="nx-code-tab-ext grid h-5 w-9 shrink-0 place-items-center rounded px-1 text-[10px] font-bold leading-none"
                    style={{ background: color + "22", color }}
                  >
                    {ext.toUpperCase() || "TXT"}
                  </span>
                  <span
                    className="nx-code-tab-label min-w-0 flex-1 truncate text-xs"
                    style={{
                      color: isActive ? "var(--nexus-text)" : "var(--nexus-muted)",
                    }}
                  >
                    {tab.name}
                  </span>
                  {tab.modified ? (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: "var(--nexus-primary, #7c8cff)",
                        boxShadow:
                          "0 0 5px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.32)",
                      }}
                    />
                  ) : null}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose?.(tab.id);
                    }}
                    role="button"
                    tabIndex={-1}
                    className={`nx-code-tab-close flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-white/10 ${
                      isActive ? "opacity-80" : "opacity-0 group-hover:opacity-80"
                    }`}
                    title="Tab schliessen"
                  >
                    <X size={12} className="text-gray-500" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
