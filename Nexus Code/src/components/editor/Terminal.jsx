import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Play,
  Plus,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  createTerminalSession,
  createWelcomeEntries,
  disposeMaybe,
  getTaskRunnerItems,
  getTerminalBridge,
  normalizeTerminalEntry,
  resolveRunCommandForFile,
  updateSessionLastCommand,
} from "../../pages/editor/terminalModel";

const SIMULATED_RESPONSES = {
  help: [
    { type: "output", text: "Verfuegbare Befehle:" },
    { type: "output", text: "  help          - Hilfe anzeigen" },
    { type: "output", text: "  clear         - Terminal leeren" },
    { type: "output", text: "  ls            - Dateien auflisten" },
    { type: "output", text: "  pwd           - Aktuelles Verzeichnis" },
    { type: "output", text: "  echo <text>   - Text ausgeben" },
    { type: "output", text: "  date          - Datum und Uhrzeit" },
    { type: "output", text: "  npm <cmd>     - npm Befehl" },
    { type: "output", text: "  git <cmd>     - Git Befehl" },
    { type: "output", text: "  version       - Nexus Code Version" },
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
    { type: "output", text: "Nexus Code v1.1" },
    { type: "output", text: "  Terminal sessions + task runner ready" },
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
  "npm run dev": [
    { type: "output", text: "" },
    { type: "output", text: "  VITE ready in 312 ms" },
    { type: "output", text: "" },
    { type: "success", text: "  Local:   http://localhost:5173/" },
  ],
  "npm run build": [
    { type: "output", text: "vite building for production..." },
    { type: "output", text: "42 modules transformed." },
    { type: "success", text: "built in 1.24s" },
  ],
  "npm test": [
    { type: "output", text: "No tests configured in simulated terminal." },
  ],
  "npm run lint": [
    { type: "output", text: "eslint . --quiet" },
    { type: "success", text: "No issues found in simulated terminal." },
  ],
  "npm run typecheck": [
    { type: "output", text: "tsc -p ./jsconfig.json" },
    { type: "success", text: "Typecheck completed in simulated terminal." },
  ],
  "node app.js": [
    { type: "output", text: "Hello, Developer! Welcome to Nexus Code." },
    { type: "success", text: "Process exited with code 0" },
  ],
  "python example.py": [
    { type: "output", text: "Fibonacci: [0, 1, 1, 2, 3, 5, 8]" },
    { type: "success", text: "Process exited with code 0" },
  ],
  "java Main": [
    { type: "output", text: "Hello, World!" },
    { type: "success", text: "Process exited with code 0" },
  ],
  whoami: [{ type: "output", text: "developer" }],
  date: [{ type: "output", text: new Date().toLocaleString("de-DE") }],
  uname: [{ type: "output", text: "NexusOS 1.1.0 (Chromium runtime)" }],
};

function getResponse(cmd) {
  const trimmed = cmd.trim().toLowerCase();

  if (SIMULATED_RESPONSES[trimmed]) return SIMULATED_RESPONSES[trimmed];

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
      { type: "output", text: `[main a1b2c3d] ${msg}` },
      { type: "output", text: " 2 files changed, 14 insertions(+), 3 deletions(-)" },
    ];
  }

  if (trimmed.startsWith("npm install ") || trimmed.startsWith("npm i ")) {
    const pkg = cmd.trim().split(" ").pop();
    return [
      { type: "output", text: `added 1 package: ${pkg}` },
      { type: "success", text: "done" },
    ];
  }

  if (trimmed === "clear" || trimmed === "cls") return null;
  if (trimmed.startsWith("cd ")) return [{ type: "output", text: "" }];
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
    return [{ type: "warn", text: `Warnung: '${target}' entfernt (simuliert)` }];
  }
  if (!trimmed) return [];

  return [
    { type: "error", text: `command not found: ${cmd.trim().split(" ")[0]}` },
    { type: "output", text: "Tippe 'help' fuer verfuegbare Befehle." },
  ];
}

export default function Terminal({ isOpen, onToggle, activeFile, workspacePath }) {
  const initialSessionRef = useRef(null);
  if (!initialSessionRef.current) {
    initialSessionRef.current = createTerminalSession();
  }

  const [sessions, setSessions] = useState(() => [initialSessionRef.current]);
  const [activeSessionId, setActiveSessionId] = useState(
    () => initialSessionRef.current.id,
  );
  const [histories, setHistories] = useState(() => ({
    [initialSessionRef.current.id]: createWelcomeEntries(initialSessionRef.current),
  }));
  const [inputs, setInputs] = useState(() => ({
    [initialSessionRef.current.id]: "",
  }));
  const [cmdHistories, setCmdHistories] = useState(() => ({
    [initialSessionRef.current.id]: [],
  }));
  const [cmdIndex, setCmdIndex] = useState({});
  const [copied, setCopied] = useState(false);
  const [terminalLaunchBusy, setTerminalLaunchBusy] = useState(false);
  const [runningBySession, setRunningBySession] = useState({});

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const entryIdRef = useRef(10);

  const currentHistory = histories[activeSessionId] || [];
  const currentInput = inputs[activeSessionId] || "";
  const isRunning = Boolean(runningBySession[activeSessionId]);
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];
  const runActiveFileCommand = resolveRunCommandForFile(activeFile);
  const taskItems = useMemo(() => getTaskRunnerItems(activeFile), [activeFile]);
  const quickTasks = taskItems.filter((task) => task.quick);
  const bridgeInfo = getTerminalBridge();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [histories, activeSessionId]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const setInput = useCallback((sessionId, value) => {
    setInputs((prev) => ({ ...prev, [sessionId]: value }));
  }, []);

  const addEntries = useCallback((sessionId, entries) => {
    setHistories((prev) => ({
      ...prev,
      [sessionId]: [
        ...(prev[sessionId] || []),
        ...entries.map((entry) => ({
          ...normalizeTerminalEntry(entry),
          id: ++entryIdRef.current,
        })),
      ],
    }));
  }, []);

  const addCommandHistory = useCallback((sessionId, cmd) => {
    setCmdHistories((prev) => {
      const current = prev[sessionId] || [];
      const next = [cmd, ...current.filter((item) => item !== cmd)];
      return { ...prev, [sessionId]: next.slice(0, 100) };
    });
    setCmdIndex((prev) => ({ ...prev, [sessionId]: -1 }));
  }, []);

  const setSessionRunning = useCallback((sessionId, running) => {
    setRunningBySession((prev) => ({ ...prev, [sessionId]: running }));
  }, []);

  useEffect(() => {
    const bridge = getTerminalBridge();
    if (!bridge.available) return undefined;

    const unsubscribes = sessions.map((session) => {
      const unsubOutput = bridge.onOutput?.(session.id, (data) => {
        addEntries(session.id, [data]);
      });
      const unsubExit = bridge.onExit?.(session.id, () => {
        setSessionRunning(session.id, false);
      });
      const unsubReady = bridge.onReady?.(session.id, () => {
        setSessionRunning(session.id, true);
      });

      return () => {
        disposeMaybe(unsubOutput);
        disposeMaybe(unsubExit);
        disposeMaybe(unsubReady);
      };
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [sessions, addEntries, setSessionRunning]);

  const executeCommandInSession = useCallback(
    (sessionId, rawInput, metadata = {}) => {
      const cmd = String(rawInput || "").trim();
      const cmdLower = cmd.toLowerCase();
      const sessionRunning = Boolean(runningBySession[sessionId]);
      if (sessionRunning || !cmd) return;

      if (cmdLower === "clear" || cmdLower === "cls") {
        setHistories((prev) => ({ ...prev, [sessionId]: [] }));
        setInput(sessionId, "");
        return;
      }

      addEntries(sessionId, [{ type: "input", text: `$ ${cmd}` }]);
      addCommandHistory(sessionId, cmd);
      setInput(sessionId, "");
      setSessions((prev) => updateSessionLastCommand(prev, sessionId, cmd));

      const bridge = getTerminalBridge();
      if (bridge.available && bridge.run) {
        setSessionRunning(sessionId, true);
        try {
          const maybePromise = bridge.run({
            id: sessionId,
            sessionId,
            command: cmd,
            cwd: workspacePath || null,
            taskId: metadata.taskId || null,
          });
          maybePromise?.catch?.((error) => {
            addEntries(sessionId, [
              {
                type: "error",
                text: error?.message || "Terminal command failed.",
              },
            ]);
            setSessionRunning(sessionId, false);
          });
        } catch (error) {
          addEntries(sessionId, [
            { type: "error", text: error?.message || "Terminal command failed." },
          ]);
          setSessionRunning(sessionId, false);
        }
      } else {
        setSessionRunning(sessionId, true);
        window.setTimeout(() => {
          const responses = getResponse(cmd);
          if (responses) addEntries(sessionId, responses);
          setSessionRunning(sessionId, false);
        }, 500);
      }
    },
    [
      addCommandHistory,
      addEntries,
      runningBySession,
      setInput,
      setSessionRunning,
      workspacePath,
    ],
  );

  const executeCommand = useCallback(
    (rawInput) => executeCommandInSession(activeSessionId, rawInput),
    [activeSessionId, executeCommandInSession],
  );

  const openSession = useCallback((options = {}) => {
    const session = createTerminalSession({
      cwd: workspacePath || null,
      ...options,
    });
    setSessions((prev) => [...prev, session]);
    setHistories((prev) => ({
      ...prev,
      [session.id]: createWelcomeEntries(session).map((entry) => ({
        ...entry,
        id: ++entryIdRef.current,
      })),
    }));
    setInputs((prev) => ({ ...prev, [session.id]: "" }));
    setCmdHistories((prev) => ({ ...prev, [session.id]: [] }));
    setActiveSessionId(session.id);
    return session;
  }, [workspacePath]);

  const runTask = useCallback(
    (task) => {
      if (!task || task.disabled || !task.command) return;
      const session = openSession({
        name: task.shortLabel || task.label,
        kind: "task",
        taskId: task.id,
      });
      window.setTimeout(() => {
        executeCommandInSession(session.id, task.command, { taskId: task.id });
      }, 0);
    },
    [executeCommandInSession, openSession],
  );

  const handleRun = useCallback(() => {
    const commandText = String(currentInput || "").trim();
    if (!commandText) return;

    if (isRunning) {
      addEntries(activeSessionId, [{ type: "input", text: `$ ${commandText}` }]);
      const bridge = getTerminalBridge();
      if (bridge.input) {
        bridge.input({ id: activeSessionId, sessionId: activeSessionId, input: `${commandText}\n` });
      } else {
        addEntries(activeSessionId, [
          { type: "warn", text: "stdin forwarding ist in dieser Runtime nicht verfuegbar." },
        ]);
      }
      setInput(activeSessionId, "");
      return;
    }

    executeCommand(commandText);
  }, [
    activeSessionId,
    addEntries,
    currentInput,
    executeCommand,
    isRunning,
    setInput,
  ]);

  const handleStopRunning = useCallback(() => {
    if (!isRunning) return;
    const bridge = getTerminalBridge();
    bridge.kill?.(activeSessionId);
    addEntries(activeSessionId, [{ type: "warn", text: "^C (manuell beendet)" }]);
    setSessionRunning(activeSessionId, false);
    inputRef.current?.focus();
  }, [activeSessionId, addEntries, isRunning, setSessionRunning]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleRun();
        return;
      }

      const hist = cmdHistories[activeSessionId] || [];
      const idx = cmdIndex[activeSessionId] ?? -1;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const newIdx = Math.min(idx + 1, hist.length - 1);
        setCmdIndex((prev) => ({ ...prev, [activeSessionId]: newIdx }));
        if (hist[newIdx] !== undefined) setInput(activeSessionId, hist[newIdx]);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const newIdx = Math.max(idx - 1, -1);
        setCmdIndex((prev) => ({ ...prev, [activeSessionId]: newIdx }));
        setInput(activeSessionId, newIdx === -1 ? "" : (hist[newIdx] ?? ""));
        return;
      }

      if (event.key === "c" && event.ctrlKey) {
        event.preventDefault();
        if (isRunning) {
          handleStopRunning();
        } else {
          addEntries(activeSessionId, [
            { type: "input", text: `$ ${currentInput}^C` },
          ]);
          setInput(activeSessionId, "");
        }
        return;
      }

      if (event.key === "l" && event.ctrlKey) {
        event.preventDefault();
        setHistories((prev) => ({ ...prev, [activeSessionId]: [] }));
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const cmds = Object.keys(SIMULATED_RESPONSES);
        const match = cmds.find(
          (command) => command.startsWith(currentInput) && command !== currentInput,
        );
        if (match) setInput(activeSessionId, match);
      }
    },
    [
      activeSessionId,
      addEntries,
      cmdHistories,
      cmdIndex,
      currentInput,
      handleRun,
      handleStopRunning,
      isRunning,
      setInput,
    ],
  );

  const handleCopy = async () => {
    const text = currentHistory.map((entry) => entry.text).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handleClear = () => {
    setHistories((prev) => ({ ...prev, [activeSessionId]: [] }));
    inputRef.current?.focus();
  };

  const handleOpenSystemTerminal = useCallback(async () => {
    const bridge = getTerminalBridge();
    if (!bridge.openSystemTerminal) {
      addEntries(activeSessionId, [
        { type: "warn", text: "System Terminal Link ist in dieser Runtime nicht verfuegbar." },
      ]);
      return;
    }

    setTerminalLaunchBusy(true);
    try {
      const result = await bridge.openSystemTerminal(workspacePath || undefined);
      if (result?.ok || result === true) {
        addEntries(activeSessionId, [
          {
            type: "success",
            text: `System Terminal geoeffnet (${workspacePath || "~"}).`,
          },
        ]);
      } else {
        addEntries(activeSessionId, [
          {
            type: "error",
            text: `System Terminal konnte nicht geoeffnet werden: ${result?.error || "Unbekannter Fehler"}`,
          },
        ]);
      }
    } catch (error) {
      addEntries(activeSessionId, [
        {
          type: "error",
          text: `System Terminal konnte nicht geoeffnet werden: ${error?.message || "Unbekannter Fehler"}`,
        },
      ]);
    } finally {
      setTerminalLaunchBusy(false);
    }
  }, [activeSessionId, addEntries, workspacePath]);

  const addSession = () => {
    openSession({ name: "bash", kind: "shell" });
  };

  const closeSession = (sessionId) => {
    if (sessions.length === 1) return;

    if (runningBySession[sessionId]) {
      getTerminalBridge().kill?.(sessionId);
    }

    setRunningBySession((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setHistories((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setInputs((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setCmdHistories((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });

    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  };

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
        <span className="text-[10px] text-gray-700 ml-auto font-mono truncate">
          {activeSession?.name || activeFile?.name || bridgeInfo.label}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 260, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col shrink-0"
      style={{
        background: "var(--nexus-bg)",
        borderTop: "1px solid var(--nexus-border)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center shrink-0"
        style={{ borderBottom: "1px solid var(--nexus-border)" }}
      >
        <div className="flex items-center flex-1 overflow-x-auto min-w-0 h-8">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const sessionRunning = Boolean(runningBySession[session.id]);
            return (
              <motion.div
                key={session.id}
                layout
                onClick={() => setActiveSessionId(session.id)}
                className="flex items-center gap-1.5 px-3 h-full cursor-pointer select-none group shrink-0 relative"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "transparent",
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
                  style={{
                    color: isActive ? "var(--primary)" : "var(--nexus-muted)",
                  }}
                />
                <span
                  className="text-[11px] font-mono max-w-[9rem] truncate"
                  style={{
                    color: isActive ? "var(--nexus-text)" : "var(--nexus-muted)",
                  }}
                >
                  {session.name}
                </span>
                <span
                  className="text-[8px] uppercase tracking-wide"
                  style={{
                    color: sessionRunning
                      ? "#86efac"
                      : session.kind === "task"
                        ? "#a78bfa"
                        : "#64748b",
                  }}
                >
                  {sessionRunning ? "run" : session.kind}
                </span>
                {sessions.length > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6 }}
                    whileHover={{ opacity: 1, scale: 1.15 }}
                    animate={{ opacity: 0 }}
                    className="group-hover:opacity-100 p-0.5 rounded hover:bg-white/10"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeSession(session.id);
                    }}
                    style={{ transition: "opacity 0.15s ease" }}
                  >
                    <X size={9} className="text-gray-500" />
                  </motion.button>
                )}
              </motion.div>
            );
          })}

          <motion.button
            whileHover={{ scale: 1.12, color: "var(--primary)" }}
            whileTap={{ scale: 0.9 }}
            onClick={addSession}
            title="Neue Terminal Session"
            className="h-full px-2.5 flex items-center text-gray-600 hover:text-purple-400 transition-colors shrink-0"
          >
            <Plus size={11} />
          </motion.button>
        </div>

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
                <motion.div key="copy" initial={{ scale: 1 }} animate={{ scale: 1 }}>
                  <Copy size={11} className="text-gray-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            title="Loeschen (Ctrl+L)"
            className="p-1.5 rounded hover:bg-white/[0.06] transition-colors"
          >
            <Trash2 size={11} className="text-gray-500" />
          </motion.button>

          {isRunning && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStopRunning}
              title="Laufenden Prozess stoppen (Ctrl+C)"
              className="px-2 py-1 rounded text-[10px] font-semibold text-red-200"
              style={{
                border: "1px solid rgba(248,113,113,0.35)",
                background: "rgba(248,113,113,0.08)",
              }}
            >
              Stop
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleOpenSystemTerminal}
            disabled={terminalLaunchBusy}
            title="System Terminal oeffnen"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              color: terminalLaunchBusy ? "#64748b" : "#cbd5e1",
              cursor: terminalLaunchBusy ? "progress" : "pointer",
            }}
          >
            <ExternalLink size={10} />
            <span className="hidden sm:inline">System</span>
          </motion.button>

          {activeFile && runActiveFileCommand && (
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                runTask({
                  id: "run-active-file",
                  label: "Run Active File",
                  shortLabel: activeFile.name,
                  command: runActiveFileCommand,
                })
              }
              title={`${activeFile.name} ausfuehren`}
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
            title="Schliessen"
            className="p-1.5 rounded hover:bg-white/[0.06] transition-colors ml-0.5"
          >
            <ChevronDown size={12} className="text-gray-500" />
          </motion.button>
        </div>
      </div>

      <div
        className="flex items-center gap-1 px-3 py-1 shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <select
          value=""
          onChange={(event) => {
            const task = taskItems.find((item) => item.id === event.target.value);
            runTask(task);
          }}
          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/30 border border-white/10 text-gray-300 outline-none"
          title="Task Runner"
        >
          <option value="">Tasks</option>
          {taskItems.map((task) => (
            <option key={task.id} value={task.id} disabled={task.disabled}>
              {task.label}
            </option>
          ))}
        </select>

        {quickTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => runTask(task)}
            disabled={task.disabled}
            className="px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              color: task.disabled ? "#64748b" : "#cbd5e1",
              background: task.kind === "task" ? "rgba(168,85,247,0.07)" : "rgba(255,255,255,0.02)",
              cursor: task.disabled ? "not-allowed" : "pointer",
            }}
            title={task.disabled ? "Task aktuell nicht verfuegbar" : `Task ausfuehren: ${task.command}`}
          >
            {task.shortLabel}
          </button>
        ))}

        <span className="text-[10px] text-gray-700 ml-auto shrink-0">
          {bridgeInfo.label}
        </span>
      </div>

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

        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
              style={{ fontSize: "12px", color: "#4b5563" }}
            >
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              ))}
              <span className="text-[11px] text-gray-500 ml-1">
                Prozess laeuft ... Enter sendet Eingabe, Ctrl+C stoppt
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
          onChange={(event) => setInput(activeSessionId, event.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent outline-none font-mono min-w-0"
          style={{
            color: "#d1d5db",
            caretColor: "#a855f7",
            fontSize: "12px",
            opacity: 1,
          }}
          placeholder={
            isRunning
              ? "Prozess laeuft ... Eingabe wird an stdin gesendet"
              : "Befehl eingeben... (Pfeile: Verlauf, Tab: Vervollstaendigung)"
          }
        />
      </div>
    </motion.div>
  );
}
