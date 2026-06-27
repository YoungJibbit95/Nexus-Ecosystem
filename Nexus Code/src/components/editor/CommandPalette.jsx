import React, { useEffect, useRef, useState } from "react";
import {
  FileCode2,
  GitBranch,
  ListChecks,
  Palette,
  Search,
  Settings,
  Terminal,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const COMMANDS = [
  {
    id: "new-file",
    label: "Neues File erstellen",
    icon: FileCode2,
    shortcut: "Ctrl+N",
  },
  {
    id: "change-theme",
    label: "Theme aendern...",
    icon: Palette,
    shortcut: "Ctrl+K Ctrl+T",
  },
  {
    id: "toggle-terminal",
    label: "Terminal Session umschalten",
    icon: Terminal,
    shortcut: "Ctrl+`",
  },
  {
    id: "terminal-task-runner",
    actionId: "toggle-terminal",
    label: "Terminal: Task Runner oeffnen",
    icon: ListChecks,
    shortcut: "",
  },
  {
    id: "github-sync",
    label: "Git: Source Control oeffnen",
    icon: GitBranch,
    shortcut: "",
  },
  {
    id: "open-settings",
    label: "Einstellungen oeffnen",
    icon: Settings,
    shortcut: "Ctrl+,",
  },
];

export default function CommandPalette({ isOpen, onClose, onAction }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = COMMANDS.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  const runCommand = (command) => {
    if (!command) return;
    onAction(command.actionId || command.id);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      runCommand(filtered[selectedIndex]);
    } else if (event.key === "Escape") {
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
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            className="fixed top-[20%] left-1/2 w-full max-w-xl nexus-glass rounded-xl shadow-2xl z-[1000] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search size={18} className="text-gray-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Befehl eingeben oder suchen..."
                className="flex-1 bg-transparent text-sm text-gray-200 outline-none"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2">
              {filtered.map((command, index) => {
                const Icon = command.icon;
                const active = index === selectedIndex;
                return (
                  <motion.button
                    key={command.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => runCommand(command)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      active
                        ? "bg-purple-600/20 text-purple-300"
                        : "text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={16}
                        className={active ? "text-purple-400" : "text-gray-500"}
                      />
                      <span className="text-sm font-medium">{command.label}</span>
                    </div>
                    {command.shortcut && (
                      <span className="text-[10px] font-mono opacity-50">
                        {command.shortcut}
                      </span>
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
