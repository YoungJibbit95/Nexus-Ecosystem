import React, { useEffect, useRef, useState } from "react";
import {
  Blocks,
  File,
  FolderOpen,
  GitBranch,
  Layout,
  Maximize2,
  Search,
  Settings,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const QUICK_ACTIONS = [
  { id: "new-file", label: "Datei erstellen", icon: File, category: "Aktion", keywords: "new create" },
  { id: "open-folder", label: "Workspace Ordner oeffnen", icon: FolderOpen, category: "Workspace", keywords: "folder project" },
  { id: "open-explorer", label: "Explorer anzeigen", icon: Layout, category: "Workspace", keywords: "files sidebar tree" },
  { id: "open-search", label: "Suche anzeigen", icon: Search, category: "Workspace", keywords: "find grep" },
  { id: "github-sync", label: "Git Source Control", icon: GitBranch, category: "Workspace", keywords: "commit branch diff stage" },
  { id: "toggle-terminal", label: "Terminal umschalten", icon: Terminal, category: "Aktion", keywords: "shell console cli" },
  { id: "open-problems", label: "Problems anzeigen", icon: TriangleAlert, category: "Aktion", keywords: "errors warnings diagnostics" },
  { id: "open-extensions", label: "Extensions anzeigen", icon: Blocks, category: "Aktion", keywords: "plugins languages tools" },
  { id: "toggle-zen", label: "Zen Mode umschalten", icon: Maximize2, category: "Aktion", keywords: "focus layout" },
  { id: "open-settings", label: "Einstellungen", icon: Settings, category: "Aktion", keywords: "preferences config theme" },
];

function getSearchablePath(file) {
  return `${file?.name || ""} ${file?.fsPath || ""}`.toLowerCase();
}

export default function SpotlightSearch({ isOpen, onClose, onAction, files }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const normalizedQuery = query.trim().toLowerCase();
  const fileResults = (files || [])
    .filter((file) => file && file.type === "file" && file.name)
    .filter((file) => !normalizedQuery || getSearchablePath(file).includes(normalizedQuery))
    .slice(0, 5)
    .map((file) => ({ ...file, category: "Dateien" }));

  const actionResults = QUICK_ACTIONS.filter((action) => {
    if (!normalizedQuery) return true;
    return `${action.label} ${action.keywords || ""}`.toLowerCase().includes(normalizedQuery);
  });

  const results = [...actionResults, ...fileResults];

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, selectedIndex]);

  const runResult = (selected) => {
    if (!selected) return;
    if (selected.category === "Dateien") onAction("open-file", selected.id);
    else onAction(selected.id);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      runResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[2000]"
          />
          <motion.div
            initial={{ opacity: 0, y: -32, scale: 0.98, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.98, x: "-50%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-[14%] left-1/2 w-[min(48rem,calc(100vw-1.5rem))] bg-[#0a0a1a]/88 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.45)] z-[2001] overflow-hidden"
            style={{ border: "1px solid var(--nexus-border)" }}
          >
            <div className="flex items-center gap-4 px-5 py-4 border-b border-white/5">
              <Search size={20} className="text-purple-400/80" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Suche nach Dateien oder Aktionen..."
                className="flex-1 min-w-0 bg-transparent text-base text-gray-100 outline-none placeholder:text-gray-600"
              />
            </div>

            <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-2">
              {results.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {results.map((result, index) => {
                    const active = index === selectedIndex;
                    const Icon = result.icon || File;
                    const showCategory = index === 0 || results[index - 1].category !== result.category;

                    return (
                      <React.Fragment key={`${result.category}-${result.id}`}>
                        {showCategory && (
                          <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-500/70 uppercase tracking-widest">
                            {result.category}
                          </div>
                        )}
                        <motion.button
                          type="button"
                          onMouseEnter={() => setSelectedIndex(index)}
                          onClick={() => runResult(result)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                            active
                              ? "bg-purple-500/10 text-white"
                              : "text-gray-400 hover:bg-white/5"
                          }`}
                          style={{
                            background: active ? "var(--primary)15" : "transparent",
                          }}
                        >
                          <div className="min-w-0 flex items-center gap-4">
                            <div className={`p-2 rounded-md ${active ? "bg-purple-500/20 text-purple-300" : "bg-white/5 text-gray-600"}`}>
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0 flex flex-col items-start translate-y-[-1px]">
                              <span className={`max-w-full truncate text-[13px] font-medium ${active ? "text-white" : "text-gray-300"}`}>
                                {result.name || result.label}
                              </span>
                              {result.fsPath && (
                                <span className="max-w-[min(30rem,55vw)] truncate text-[10px] text-gray-600 font-mono">
                                  {result.fsPath}
                                </span>
                              )}
                            </div>
                          </div>
                          {active && (
                            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 rounded-md border border-purple-500/20">
                              <span className="text-[9px] font-bold text-purple-300">OEFFNEN</span>
                            </div>
                          )}
                        </motion.button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-25">
                  <Search size={48} />
                  <span className="text-sm mt-4 font-medium italic">Keine Ergebnisse gefunden...</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500">Up/Down</div>
                  <span className="text-[10px] text-gray-600">Navigieren</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500">Enter</div>
                  <span className="text-[10px] text-gray-600">Auswaehlen</span>
                </div>
              </div>
              <span className="text-[10px] text-gray-600">Esc zum Schliessen</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
