import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronDown,
  Copy,
  Trash2,
  Play,
  Plus,
  X,
  Terminal as TerminalIcon,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Simulated command responses ───────────────────────────────────────── */

const SIMULATED_RESPONSES = {
  help: [
    { type: "output", text: "Verfügbare Befehle:" },
    { type: "output", text: "  help          — Hilfe anzeigen" },
    { type: "output", text: "  clear         — Terminal leeren" },
    { type: "output", text: "  ls            — Dateien auflisten" },
    { type: "output", text: "  pwd           — Aktuelles Verzeichnis" },
    { type: "output", text: "  echo <text>   — Text ausgeben" },
    { type: "output", text: "  date          — Datum und Uhrzeit" },
    { type: "output", text: "  node <file>   — Node.js ausführen" },
    { type: "output", text: "  python <file> — Python ausführen" },
    { type: "output", text: "  java <class>  — Java ausführen" },
    { type: "output", text: "  npm <cmd>     — npm Befehl" },
    { type: "output", text: "  git <cmd>     — Git Befehl" },
    { type: "output", text: "  version       — Nexus Code Version" },
  ],
  ls: [
    { type: "output", text: "main.java    example.py    app.js    styles.css" },
  ],
  "ls -la": [
    { type: "output", text: "total 4" },
    { type: "output", text: "-rw-r--r--  1 user  staff   842  main.java" },
    { type: "output", text: "-rw-r--r--  1 user  staff   596  example.py" },
    { type: "output", text: "-rw-r--r--  1 user  staff  1024  app.js" },
    { type: "output", text: "-rw-r--r--  1 user  staff   712  styles.css" },
  ],
  pwd: [{ type: "output", text: "/workspace/nexus-code" }],
  version: [
    { type: "output", text: "✦ Nexus Code v1.0.0" },
    { type: "output", text: "  Node.js  v20.11.0" },
    { type: "output", text: "  npm      v10.2.4" },
    { type: "output", text: "  Python   v3.12.1" },
  ],
  "git status": [
    { type: "output", text: "On branch main" },
    { type: "output", text: "Your branch is up to date with 'origin/main'." },
    { type: "output", text: "" },
    { type: "output", text: "Changes not staged for commit:" },
    { type: "warn", text: "  modified:   app.js" },
    { type: "warn", text: "  modified:   styles.css" },
    { type: "output", text: "" },
    { type: "output", text: "no changes added to commit" },
  ],
  "git log --oneline": [
    { type: "output", text: "a3f92b1 feat: add syntax highlighting" },
    { type: "output", text: "d71c304 fix: autocomplete position" },
    { type: "output", text: "88e1a5f refactor: editor state cleanup" },
    { type: "output", text: "c209d7a chore: initial project setup" },
  ],
  "git branch": [
    { type: "output", text: "* main" },
    { type: "output", text: "  develop" },
    { type: "output", text: "  feature/search-panel" },
  ],
  "npm install": [
    { type: "output", text: "npm warn deprecated react-leaflet@4.2.1" },
    { type: "output", text: "added 284 packages in 3.2s" },
    { type: "output", text: "" },
    { type: "success", text: "✓ 284 packages are up to date." },
  ],
  "npm run dev": [
    { type: "output", text: "" },
    { type: "output", text: "  VITE v6.1.0  ready in 312 ms" },
    { type: "output", text: "" },
    { type: "success", text: "  ➜  Local:   http://localhost:5173/" },
    { type: "output", text: "  ➜  Network: use --host to expose" },
  ],
  "npm run build": [
    { type: "output", text: "vite v6.1.0 building for production..." },
    { type: "output", text: "✓ 42 modules transformed." },
    { type: "output", text: "dist/index.html                  0.46 kB" },
    {
      type: "output",
      text: "dist/assets/index-DiwrgTda.css  12.08 kB │ gzip:   3.11 kB",
    },
    {
      type: "output",
      text: "dist/assets/index-BXHM2Qna.js  241.30 kB │ gzip:  77.64 kB",
    },
    { type: "success", text: "✓ built in 1.24s" },
  ],
  "node app.js": [
    { type: "output", text: "Hello, Developer! Welcome to Nexus Code." },
    { type: "output", text: "Even doubled: [4, 8, 12, 16, 20]" },
    { type: "output", text: "" },
    { type: "success", text: "Process exited with code 0" },
  ],
  "python example.py": [
    { type: "output", text: "Fibonacci: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]" },
    { type: "output", text: "8" },
    { type: "output", text: "28" },
    { type: "output", text: "Squares: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]" },
    { type: "success", text: "Process exited with code 0" },
  ],
  "java Main": [
    { type: "output", text: "Hello, World!" },
    { type: "output", text: "Sum 1-10: 55" },
    { type: "output", text: " - Apple" },
    { type: "output", text: " - Banana" },
    { type: "output", text: " - Cherry" },
    { type: "success", text: "Process exited with code 0" },
  ],
  whoami: [{ type: "output", text: "developer" }],
  date: [{ type: "output", text: new Date().toLocaleString("de-DE") }],
  uname: [{ type: "output", text: "NexusOS 1.0.0 (Chromium-based runtime)" }],
};

function getResponse(cmd) {
  const trimmed = cmd.trim().toLowerCase();

  if (SIMULATED_RESPONSES[trimmed]) return SIMULATED_RESPONSES[trimmed];

  // Dynamic responses
  if (trimmed.startsWith("echo ")) {
    const text = cmd
      .trim()
      .slice(5)
      .replace(/^["']|["']$/g, "");
    return [{ type: "output", text }];
  }
  if (trimmed.startsWith("git commit -m ")) {
    const msg = cmd
      .trim()
      .slice(14)
      .replace(/^["']|["']$/g, "");
    return [
      { type: "output", text: "[main a1b2c3d] " + msg },
      {
        type: "output",
        text: " 2 files changed, 14 insertions(+), 3 deletions(-)",
      },
    ];
  }
  if (trimmed.startsWith("npm install ") || trimmed.startsWith("npm i ")) {
    const pkg = cmd.trim().split(" ").pop();
    return [
      { type: "output", text: `added 1 package: ${pkg}` },
      { type: "success", text: "✓ done" },
    ];
  }
  if (trimmed === "clear" || trimmed === "cls") {
    return null; // special case handled outside
  }
  if (trimmed.startsWith("cd ")) {
    return [{ type: "output", text: "" }];
  }
  if (trimmed.startsWith("cat ")) {
    const file = cmd.trim().slice(4);
    return [{ type: "error", text: `cat: ${file}: Datei nicht gefunden` }];
  }
  if (trimmed.startsWith("mkdir ")) {
    const dir = cmd.trim().slice(6);
    return [{ type: "success", text: `Verzeichnis '${dir}' erstellt` }];
  }
  if (trimmed.startsWith("rm ")) {
    const target = cmd.trim().slice(3);
    return [
      { type: "warn", text: `Warnung: '${target}' entfernt (simuliert)` },
    ];
  }
  if (trimmed === "" || trimmed === " ") {
    return [];
  }

  return [
    { type: "error", text: `command not found: ${cmd.trim().split(" ")[0]}` },
    { type: "output", text: "Tippe 'help' für verfügbare Befehle." },
  ];
}

/* ─── Tab component ──────────────────────────────────────────────────────── */

let _tabId = 1;
function makeTab(name = "bash") {
  return { id: _tabId++, name };
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function Terminal({ isOpen, onToggle, activeFile, code, workspacePath }) {
  const [tabs, setTabs] = useState([makeTab()]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [histories, setHistories] = useState({
    1: [
      { id: 1, type: "system", text: "✦ Nexus Code Terminal v1.0" },
      { id: 2, type: "system", text: "Tippe 'help' für verfügbare Befehle." },
    ],
  });
  const [inputs, setInputs] = useState({ 1: "" });
  const [cmdHistories, setCmdHistories] = useState({ 1: [] });
  const [cmdIndex, setCmdIndex] = useState({});
  const [copied, setCopied] = useState(false);
  const [runningByTab, setRunningByTab] = useState({});

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const entryIdRef = useRef(10);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [histories, activeTabId]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const addEntries = useCallback((tabId, entries) => {
    setHistories((prev) => ({
      ...prev,
      [tabId]: [
        ...(prev[tabId] || []),
        ...entries.map((e) => ({
          ...e,
          id: ++entryIdRef.current,
        })),
      ],
    }));
  }, []);

  const addCommandHistory = useCallback((tabId, cmd) => {
    setCmdHistories((prev) => {
      const current = prev[tabId] || [];
      const next = [cmd, ...current.filter((item) => item !== cmd)];
      return { ...prev, [tabId]: next.slice(0, 100) };
    });
    setCmdIndex((prev) => ({ ...prev, [tabId]: -1 }));
  }, []);

  const setTabRunning = useCallback((tabId, running) => {
    setRunningByTab((prev) => ({ ...prev, [tabId]: running }));
  }, []);

  // Terminal Output Listeners
  useEffect(() => {
    // @ts-ignore
    const api = window.electronAPI;
    if (!api) return undefined;

    const unsubscribes = tabs.map((tab) => {
      const unsubOutput = api.onTerminalOutput?.(tab.id, (data) => {
        addEntries(tab.id, [data]);
      });
      const unsubExit = api.onTerminalExit?.(tab.id, () => {
        setTabRunning(tab.id, false);
      });
      const unsubReady = api.onTerminalReady?.(tab.id, () => {
        setTabRunning(tab.id, true);
      });

      return () => {
        unsubOutput?.();
        unsubExit?.();
        unsubReady?.();
      };
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [tabs, addEntries, setTabRunning]);

  const setInput = useCallback((tabId, value) => {
    setInputs((prev) => ({ ...prev, [tabId]: value }));
  }, []);

  const currentHistory = histories[activeTabId] || [];
  const currentInput = inputs[activeTabId] || "";
  const isRunning = Boolean(runningByTab[activeTabId]);

  const executeCommand = useCallback((rawInput) => {
    const tabId = activeTabId;
    const cmd = String(rawInput || "").trim();
    const cmdLower = cmd.toLowerCase();
    const tabRunning = Boolean(runningByTab[tabId]);
    if (tabRunning) return;

    if (!cmd) return;

    // Handle clear specially
    if (cmdLower === "clear" || cmdLower === "cls") {
      setHistories((prev) => ({ ...prev, [tabId]: [] }));
      setInput(tabId, "");
      return;
    }

    addEntries(tabId, [{ type: "input", text: `$ ${cmd}` }]);
    addCommandHistory(tabId, cmd);
    setInput(tabId, "");

    // @ts-ignore
    const api = window.electronAPI;
    if (api?.terminalRun) {
      setTabRunning(tabId, true);
      api.terminalRun({
        id: tabId,
        command: cmd,
        cwd: workspacePath || null,
      });
    } else {
      // Fallback for non-electron (simulated)
      setTabRunning(tabId, true);
      setTimeout(() => {
        const responses = getResponse(cmd);
        if (responses) addEntries(tabId, responses);
        setTabRunning(tabId, false);
      }, 500);
    }
  }, [activeTabId, runningByTab, addEntries, addCommandHistory, setInput, setTabRunning, workspacePath]);

  const handleRun = useCallback(() => {
    executeCommand(currentInput);
  }, [executeCommand, currentInput]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRun();
        return;
      }

      // Command history navigation
      const hist = cmdHistories[activeTabId] || [];
      const idx = cmdIndex[activeTabId] ?? -1;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIdx = Math.min(idx + 1, hist.length - 1);
        setCmdIndex((prev) => ({ ...prev, [activeTabId]: newIdx }));
        if (hist[newIdx] !== undefined) setInput(activeTabId, hist[newIdx]);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIdx = Math.max(idx - 1, -1);
        setCmdIndex((prev) => ({ ...prev, [activeTabId]: newIdx }));
        setInput(activeTabId, newIdx === -1 ? "" : (hist[newIdx] ?? ""));
        return;
      }

      // Ctrl+C — cancel / kill
      if (e.key === "c" && e.ctrlKey) {
        e.preventDefault();
        // @ts-ignore
        if (isRunning && window.electronAPI?.terminalKill) {
          // @ts-ignore
          window.electronAPI.terminalKill(activeTabId);
          setTabRunning(activeTabId, false);
        } else {
          addEntries(activeTabId, [{ type: "input", text: `$ ${currentInput}^C` }]);
          setInput(activeTabId, "");
          setTabRunning(activeTabId, false);
        }
        return;
      }

      // Ctrl+L — clear
      if (e.key === "l" && e.ctrlKey) {
        e.preventDefault();
        setHistories((prev) => ({ ...prev, [activeTabId]: [] }));
        return;
      }

      // Tab completion (basic)
      if (e.key === "Tab") {
        e.preventDefault();
        const cmds = Object.keys(SIMULATED_RESPONSES);
        const match = cmds.find(
          (c) => c.startsWith(currentInput) && c !== currentInput,
        );
        if (match) setInput(activeTabId, match);
        return;
      }
    },
    [handleRun, cmdHistories, cmdIndex, activeTabId, currentInput, addEntries, isRunning, setInput, setTabRunning],
  );

  const handleCopy = async () => {
    const text = currentHistory.map((h) => h.text).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  };

  const handleClear = () => {
    setHistories((prev) => ({ ...prev, [activeTabId]: [] }));
    inputRef.current?.focus();
  };

  const addTab = () => {
    const tab = makeTab();
    setTabs((prev) => [...prev, tab]);
    setHistories((prev) => ({
      ...prev,
      [tab.id]: [
        {
          id: ++entryIdRef.current,
          type: "system",
          text: "✦ Nexus Code Terminal v1.0",
        },
        {
          id: ++entryIdRef.current,
          type: "system",
          text: "Tippe 'help' für verfügbare Befehle.",
        },
      ],
    }));
    setInputs((prev) => ({ ...prev, [tab.id]: "" }));
    setCmdHistories((prev) => ({ ...prev, [tab.id]: [] }));
    setActiveTabId(tab.id);
  };

  const closeTab = (tabId) => {
    if (tabs.length === 1) return;

    // @ts-ignore
    if (runningByTab[tabId] && window.electronAPI?.terminalKill) {
      // @ts-ignore
      window.electronAPI.terminalKill(tabId);
    }

    setRunningByTab((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });

    setTabs((prev) => {
      const remaining = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId)
        setActiveTabId(remaining[remaining.length - 1].id);
      return remaining;
    });
  };

  /* ── Entry colour helper ─────────────────────────────────────────────── */
  const entryColor = (type) => {
    switch (type) {
      case "system":
        return "#4b5563";
      case "input":
        return "var(--primary)";
      case "output":
        return "#d1d5db";
      case "success":
        return "#22c55e";
      case "warn":
        return "#fbbf24";
      case "error":
        return "#f87171";
      default:
        return "#9ca3af";
    }
  };

  /* ── Collapsed bar ────────────────────────────────────────────────────── */
  if (!isOpen) {
    return (
      <motion.button
        whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        whileTap={{ scale: 0.99 }}
        onClick={onToggle}
        className="h-8 flex items-center gap-2.5 px-4 shrink-0 w-full cursor-pointer select-none"
        style={{
          background: "var(--nexus-surface)",
          borderTop: "1px solid var(--nexus-border)",
        }}
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-1.5"
        >
          <TerminalIcon size={12} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-purple-400/80 tracking-widest">
            TERMINAL
          </span>
        </motion.div>
        <ChevronDown size={12} className="text-gray-600 rotate-180 ml-0.5" />
        {activeFile && (
          <span className="text-[10px] text-gray-700 ml-auto font-mono">
            {activeFile.name}
          </span>
        )}
      </motion.button>
    );
  }

  /* ── Expanded terminal ────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 220, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col shrink-0"
      style={{
        background: "var(--nexus-bg)",
        borderTop: "1px solid var(--nexus-border)",
        overflow: "hidden",
      }}
    >
      {/* ── Title bar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{ borderBottom: "1px solid var(--nexus-border)" }}
      >
        {/* Tab strip */}
        <div className="flex items-center flex-1 overflow-x-auto min-w-0 h-8">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <motion.div
                key={tab.id}
                layout
                onClick={() => setActiveTabId(tab.id)}
                className="flex items-center gap-1.5 px-3 h-full cursor-pointer select-none group shrink-0 relative"
                style={{
                  background: isActive ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  borderRight: "1px solid var(--nexus-border)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="termTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--primary), transparent)",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <TerminalIcon
                  size={10}
                  style={{ color: isActive ? "var(--primary)" : "var(--nexus-muted)" }}
                />
                <span
                  className="text-[11px] font-mono"
                  style={{ color: isActive ? "var(--nexus-text)" : "var(--nexus-muted)" }}
                >
                  {tab.name}
                </span>
                {tabs.length > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6 }}
                    whileHover={{ opacity: 1, scale: 1.15 }}
                    animate={{ opacity: 0 }}
                    className="group-hover:opacity-100 p-0.5 rounded hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    style={{ transition: "opacity 0.15s ease" }}
                  >
                    <X size={9} className="text-gray-500" />
                  </motion.button>
                )}
              </motion.div>
            );
          })}

          {/* New tab button */}
          <motion.button
            whileHover={{ scale: 1.12, color: "var(--primary)" }}
            whileTap={{ scale: 0.9 }}
            onClick={addTab}
            title="Neues Terminal"
            className="h-full px-2.5 flex items-center text-gray-600 hover:text-purple-400 transition-colors shrink-0"
          >
            <Plus size={11} />
          </motion.button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            title="Kopieren"
            className="p-1.5 rounded hover:bg-white/[0.06] transition-colors"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.5 }}
                >
                  <Check size={11} className="text-green-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                >
                  <Copy size={11} className="text-gray-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            title="Löschen (Ctrl+L)"
            className="p-1.5 rounded hover:bg-white/[0.06] transition-colors"
          >
            <Trash2 size={11} className="text-gray-500" />
          </motion.button>

          {/* Run active file */}
          {activeFile && (
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
              const ext = activeFile.name ? activeFile.name.split(".").pop()?.toLowerCase() : "";
              let cmd = "";
                if (ext === "js") cmd = `node ${activeFile.name}`;
                else if (ext === "py") cmd = `python ${activeFile.name}`;
                else if (ext === "java") {
                  const cls = activeFile.name.replace(".java", "");
                  cmd = `java ${cls}`;
                }
                if (cmd) {
                  executeCommand(cmd);
                }
              }}
              title={`${activeFile.name} ausführen`}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-white ml-1"
              style={{
                background: "linear-gradient(135deg, #8000ff, #0033ff)",
                boxShadow: "0 0 10px rgba(128,0,255,0.3)",
              }}
            >
              <Play size={9} fill="white" />
              <span className="hidden sm:inline">Run</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggle}
            title="Schließen"
            className="p-1.5 rounded hover:bg-white/[0.06] transition-colors ml-0.5"
          >
            <ChevronDown size={12} className="text-gray-500" />
          </motion.button>
        </div>
      </div>

      {/* ── Output area ────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 font-mono"
        onClick={() => inputRef.current?.focus()}
        style={{ cursor: "text" }}
      >
        <AnimatePresence initial={false}>
          {currentHistory.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12 }}
              className="leading-relaxed"
              style={{
                color: entryColor(entry.type),
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {entry.text === "" ? "\u00A0" : entry.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Running indicator */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
              style={{ fontSize: "12px", color: "#4b5563" }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input row ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ borderTop: "1px solid rgba(128,0,255,0.07)" }}
      >
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-primary font-mono select-none shrink-0"
          style={{ fontSize: "12px", color: "var(--primary)" }}
        >
          $
        </motion.span>

        <input
          ref={inputRef}
          value={currentInput}
          onChange={(e) => setInput(activeTabId, e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent outline-none font-mono min-w-0"
          style={{
            color: "#d1d5db",
            caretColor: "#a855f7",
            fontSize: "12px",
            opacity: isRunning ? 0.5 : 1,
          }}
          placeholder={
            isRunning
              ? ""
              : "Befehl eingeben… (↑↓ Verlauf, Tab Vervollständigung)"
          }
        />
      </div>
    </motion.div>
  );
}
