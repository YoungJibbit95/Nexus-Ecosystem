import React, { useState, useEffect, useRef } from "react";
import { Search, File, Zap, Command, Terminal, Settings, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_ACTIONS = [
  { id: "new-file", label: "Datev erstellen", icon: File, category: "Aktion" },
  { id: "toggle-terminal", label: "Terminal umschalten", icon: Terminal, category: "Aktion" },
  { id: "open-settings", label: "Einstellungen", icon: Settings, category: "Aktion" },
  { id: "toggle-sidebar", label: "Sidebar umschalten", icon: Layout, category: "Aktion" },
];

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

  const fileResults = (files || [])
    .filter(f => f && f.type === "file" && f.name && f.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(f => ({ ...f, category: "Dateien" }));

  const actionResults = QUICK_ACTIONS.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const results = [...actionResults, ...fileResults];

  useEffect(() => {
    if (selectedIndex >= results.length) {
      setSelectedIndex(Math.max(0, results.length - 1));
    }
  }, [results, selectedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[selectedIndex];
      if (selected) {
        if (selected.category === "Dateien") {
          onAction("open-file", selected.id);
        } else {
          onAction(selected.id);
        }
        onClose();
      }
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
            initial={{ opacity: 0, y: -40, scale: 0.98, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: -20, scale: 0.98, x: "-50%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-[15%] left-1/2 w-full max-w-2xl bg-[#0a0a1a]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] z-[2001] overflow-hidden"
            style={{ border: "1px solid var(--nexus-border)" }}
          >
            <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
              <Search size={24} className="text-purple-500/80" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Suche nach Dateien oder Aktionen..."
                className="flex-1 bg-transparent text-xl text-gray-100 outline-none placeholder:text-gray-600 font-light"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                <Command size={12} className="text-gray-500" />
                <span className="text-[10px] font-mono text-gray-500">K</span>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-2">
              {results.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {results.map((res, i) => {
                    const active = i === selectedIndex;
                    const Icon = res.icon || File;
                    
                    // Show category label if it's the first item of that category
                    const showCategory = i === 0 || results[i-1].category !== res.category;

                    return (
                      <React.Fragment key={res.id}>
                        {showCategory && (
                          <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-500/70 uppercase tracking-widest">
                            {res.category}
                          </div>
                        )}
                        <motion.button
                          onMouseEnter={() => setSelectedIndex(i)}
                          onClick={() => {
                            if (res.category === "Dateien") onAction("open-file", res.id);
                            else onAction(res.id);
                            onClose();
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                            active 
                              ? "bg-purple-500/10 text-white" 
                              : "text-gray-400 hover:bg-white/5"
                          }`}
                          style={{
                            background: active ? "var(--primary)15" : "transparent"
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${active ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-600"}`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex flex-col items-start translate-y-[-1px]">
                              <span className={`text-[13px] font-medium ${active ? "text-white" : "text-gray-300"}`}>
                                {res.name || res.label}
                              </span>
                              {res.fsPath && (
                                <span className="text-[10px] text-gray-600 font-mono truncate max-w-[400px]">
                                  {res.fsPath}
                                </span>
                              )}
                            </div>
                          </div>
                          {active && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/20 rounded-md border border-purple-500/20">
                              <span className="text-[9px] font-bold text-purple-400">ÖFFNEN</span>
                            </div>
                          )}
                        </motion.button>
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Search size={48} />
                  <span className="text-sm mt-4 font-medium italic">Keine Ergebnisse gefunden...</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500">↑↓</div>
                  <span className="text-[10px] text-gray-600">Navigieren</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500">↵</div>
                  <span className="text-[10px] text-gray-600">Auswählen</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-600">Esc zum Schließen</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
