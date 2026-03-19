import React, { useState, useEffect, useRef } from "react";
import { Command, Search, FileCode2, Palette, Terminal, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COMMANDS = [
  { id: "new-file", label: "Neues File erstellen", icon: FileCode2, shortcut: "Ctrl+N" },
  { id: "change-theme", label: "Theme ändern...", icon: Palette, shortcut: "Ctrl+K Ctrl+T" },
  { id: "toggle-terminal", label: "Terminal umschalten", icon: Terminal, shortcut: "Ctrl+`" },
  { id: "open-settings", label: "Einstellungen öffnen", icon: Settings, shortcut: "Ctrl+," },
  { id: "github-sync", label: "GitHub: Repository synchronisieren", icon: Command, shortcut: "" },
];

export default function CommandPalette({ isOpen, onClose, onAction }) {
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

  const filtered = COMMANDS.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered, selectedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onAction(filtered[selectedIndex].id);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            className="fixed top-[20%] left-1/2 w-full max-w-xl nexus-glass rounded-xl shadow-2xl z-[1000] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search size={18} className="text-gray-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Befehl eingeben oder suchen..."
                className="flex-1 bg-transparent text-sm text-gray-200 outline-none"
              />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                const active = i === selectedIndex;
                return (
                  <motion.button
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => {
                      onAction(cmd.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      active ? "bg-purple-600/20 text-purple-300" : "text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={active ? "text-purple-400" : "text-gray-500"} />
                      <span className="text-sm font-medium">{cmd.label}</span>
                    </div>
                    {cmd.shortcut && (
                      <span className="text-[10px] font-mono opacity-50">{cmd.shortcut}</span>
                    )}
                  </motion.button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-600 text-sm">
                  Keine Befehle gefunden
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
