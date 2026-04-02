import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Search, TerminalSquare, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMobile } from "../../hook/useMobile";

const langColors = {
  js: "#facc15",
  jsx: "#61dafb",
  ts: "#3b82f6",
  tsx: "#3b82f6",
  py: "#22c55e",
  java: "#f97316",
  html: "#f97316",
  css: "#3b82f6",
  json: "#facc15",
  md: "#a855f7",
  cpp: "#3b82f6",
  c: "#6b7280",
  rs: "#f97316",
  go: "#22d3ee",
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

function ActionButton({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-8 w-8 rounded-md border border-white/10 hover:border-white/20 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex items-center justify-center"
    >
      {children}
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
}) {
  const isMobile = useMobile();
  const [newFileMenuOpen, setNewFileMenuOpen] = useState(false);
  const [customFileName, setCustomFileName] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    if (!newFileMenuOpen) return;
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setNewFileMenuOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [newFileMenuOpen]);

  const tabsCount = tabs.length;
  const menuItems = useMemo(() => languagePresets, []);

  const submitCustomFile = () => {
    const trimmed = customFileName.trim();
    if (!trimmed) return;
    onCreateFile?.(trimmed, "name");
    setCustomFileName("");
    setNewFileMenuOpen(false);
  };

  return (
    <div
      className={`flex items-center shrink-0 border-b border-white/5 ${isMobile ? "h-11" : "h-10"}`}
      style={{
        background: "rgba(0,0,0,0.12)",
        borderBottom: "1px solid var(--nexus-border)",
      }}
    >
      <div className="flex items-center gap-1 px-2 shrink-0 border-r border-white/5">
        <div className="relative" ref={menuRef}>
          <ActionButton
            title="Neue Datei"
            onClick={() => setNewFileMenuOpen((prev) => !prev)}
          >
            <Plus size={14} />
          </ActionButton>

          <AnimatePresence>
            {newFileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border border-white/10 bg-black/85 backdrop-blur-xl shadow-2xl p-2"
              >
                <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  Datei-Typ wählen
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onCreateFile?.(item.id, "language");
                        setNewFileMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-left border border-white/5 hover:border-white/15 hover:bg-white/10 transition-colors"
                      style={{ color: "var(--nexus-text)" }}
                    >
                      <span className="font-semibold">{item.label}</span>
                      <span className="ml-1 text-[10px] text-gray-500">.{item.ext}</span>
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-2" />

                <div className="px-1">
                  <div className="text-[10px] text-gray-500 mb-1.5">Manueller Dateiname</div>
                  <div className="flex gap-1.5">
                    <input
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitCustomFile();
                      }}
                      placeholder="z.B. api.contract.nxs"
                      className="flex-1 h-8 rounded-md border border-white/10 bg-black/40 px-2 text-xs outline-none"
                      style={{ color: "var(--nexus-text)" }}
                    />
                    <button
                      onClick={submitCustomFile}
                      className="h-8 px-2.5 rounded-md border border-white/15 bg-white/10 hover:bg-white/20 text-xs font-semibold"
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

        <ActionButton
          title="Befehlspalette"
          onClick={() => onOpenCommandPalette?.()}
        >
          <Search size={13} />
        </ActionButton>

        <ActionButton title="Terminal" onClick={() => onToggleTerminal?.()}>
          <TerminalSquare size={13} />
        </ActionButton>

        <ActionButton title="Alle speichern" onClick={() => onSaveAll?.()}>
          <Save size={13} />
        </ActionButton>
      </div>

      <div
        className="flex-1 min-w-0 h-full overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {tabsCount === 0 ? (
          <div className="h-full px-3 flex items-center text-[11px] text-gray-500">
            Keine Datei geöffnet
          </div>
        ) : (
          <div className="h-full flex items-center">
            <AnimatePresence mode="popLayout">
              {tabs.map((tab) => {
                if (!tab || !tab.name) return null;
                const ext = getExt(tab.name);
                const color = langColors[ext] || "#6b7280";
                const isActive = tab.id === activeTabId;

                return (
                  <motion.div
                    key={tab.id}
                    initial={{ width: 0, opacity: 0, y: -8 }}
                    animate={{ width: "auto", opacity: 1, y: 0 }}
                    exit={{ width: 0, opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                    onClick={() => onTabSelect(tab.id)}
                    className={`flex items-center gap-2 px-3 h-full cursor-pointer group relative shrink-0 ${
                      isMobile ? "min-w-[120px] max-w-[200px]" : ""
                    }`}
                    style={{
                      background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                      borderBottom: isActive
                        ? `2px solid ${color}`
                        : "2px solid transparent",
                    }}
                  >
                    <span
                      className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0"
                      style={{ background: color + "22", color }}
                    >
                      {ext.toUpperCase() || "TXT"}
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{
                        color: isActive ? "var(--nexus-text)" : "var(--nexus-muted)",
                      }}
                    >
                      {tab.name}
                    </span>
                    {tab.modified && (
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"
                        style={{ boxShadow: "0 0 6px #a855f7" }}
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTabClose(tab.id);
                      }}
                      className={`${
                        isMobile
                          ? "opacity-70 active:opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      } p-1 rounded hover:bg-white/10 shrink-0 transition-opacity`}
                    >
                      <X size={isMobile ? 13 : 12} className="text-gray-500" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
