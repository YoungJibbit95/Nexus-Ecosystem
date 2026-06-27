import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Folder,
  Play,
  Plus,
  RotateCcw,
  Square,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TERMINAL_OUTPUT_LIMIT,
  createTerminalSession,
  createTerminalStatusEntry,
  createWelcomeEntries,
  disposeMaybe,
  formatTerminalPath,
  getCommandSuggestions,
  getSessionStatusMeta,
  getTaskRunnerItems,
  getTerminalBridge,
  markSessionExited,
  markSessionRunning,
  markSessionStopped,
  normalizeTerminalEntries,
  resolveRunCommandForFile,
  trimTerminalEntries,
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
  uname: [{ type: "output", text: "NexusOS 1.1.0 (Chromium runtime)" }],
};

const ENTRY_COLORS = {
  system: "#64748b",
  input: "var(--primary)",
  output: "#d1d5db",
  success: "#4ade80",
  warn: "#fbbf24",
  error: "#fb7185",
  status: "#94a3b8",
};

const STATUS_STYLES = {
  running: {
    color: "#86efac",
    background: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.28)",
  },
  success: {
    color: "#86efac",
    background: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.18)",
  },
  error: {
    color: "#fda4af",
    background: "rgba(244,63,94,0.1)",
    border: "rgba(244,63,94,0.24)",
  },
  warning: {
    color: "#facc15",
    background: "rgba(250,204,21,0.08)",
    border: "rgba(250,204,21,0.2)",
  },
  task: {
    color: "#c4b5fd",
    background: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
  },
  idle: {
    color: "#cbd5e1",
    background: "rgba(148,163,184,0.06)",
    border: "rgba(148,163,184,0.14)",
  },
};

const STATUS_DOT_COLORS = {
  running: "#22c55e",
  success: "#22c55e",
  error: "#fb7185",
  warning: "#facc15",
  task: "#a78bfa",
  idle: "#64748b",
};

function getResponse(cmd) {
  const trimmed = cmd.trim().toLowerCase();

  if (trimmed === "date") {
    return [{ type: "output", text: new Date().toLocaleString("de-DE") }];
  }

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

function inferExitCode(entries) {
  if (!entries) return 0;
  return entries.some((entry) => entry?.type === "error") ? 127 : 0;
}

function resolveExitCode(payload) {
  if (typeof payload === "number") return payload;
  if (payload && typeof payload === "object") {
    const code = payload.code ?? payload.exitCode ?? payload.status;
    return Number.isFinite(Number(code)) ? Number(code) : 1;
  }
  return 1;
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDuration(session, isRunning) {
  if (!session?.lastStartedAt) return "";
  const end = isRunning ? Date.now() : Date.parse(session.lastEndedAt || "");
  const start = Date.parse(session.lastStartedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function getEntryColor(type) {
  return ENTRY_COLORS[type] || "#94a3b8";
}

function getStatusStyle(tone) {
  return STATUS_STYLES[tone] || STATUS_STYLES.idle;
}

const TerminalOutputRow = React.memo(function TerminalOutputRow({ entry }) {
  const text = entry.text === "" ? "\u00A0" : entry.text;

  if (entry.type === "status" || entry.trimMarker) {
    return (
      <div
        className="my-1 flex min-w-0 items-center gap-2 rounded px-2 py-1 text-[11px]"
        style={{
          color: entry.trimMarker ? "#94a3b8" : "#cbd5e1",
          background: entry.trimMarker
            ? "rgba(148,163,184,0.06)"
            : "rgba(128,0,255,0.06)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: entry.trimMarker
              ? "#64748b"
              : STATUS_DOT_COLORS[entry.status] || "var(--primary)",
          }}
        />
        {entry.timestamp && (
          <span className="shrink-0 text-[10px] text-slate-500">
            {formatTime(entry.timestamp)}
          </span>
        )}
        <span className="min-w-0 break-words">{text}</span>
      </div>
    );
  }

  return (
    <div
      className="leading-relaxed"
      style={{
        color: getEntryColor(entry.type),
        fontSize: "12px",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {text}
    </div>
  );
});

export default function Terminal({ isOpen, onToggle, activeFile, workspacePath }) {
  const initialSessionRef = useRef(null);
  if (!initialSessionRef.current) {
    initialSessionRef.current = createTerminalSession({
      cwd: workspacePath || null,
    });
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
  const [autoScrollBySession, setAutoScrollBySession] = useState(() => ({
    [initialSessionRef.current.id]: true,
  }));
  const [copied, setCopied] = useState(false);
  const [terminalLaunchBusy, setTerminalLaunchBusy] = useState(false);
  const [runningBySession, setRunningBySession] = useState({});

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const entryIdRef = useRef(1000);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];
  const currentHistory = histories[activeSessionId] || [];
  const currentInput = inputs[activeSessionId] || "";
  const currentCommandHistory = cmdHistories[activeSessionId] || [];
  const isRunning = Boolean(runningBySession[activeSessionId]);
  const autoScrollEnabled = autoScrollBySession[activeSessionId] !== false;
  const activeCwd = activeSession?.cwd || workspacePath || null;
  const runActiveFileCommand = resolveRunCommandForFile(activeFile);
  const taskItems = useMemo(() => getTaskRunnerItems(activeFile), [activeFile]);
  const quickTasks = taskItems.filter((task) => task.quick);
  const commandSuggestions = useMemo(
    () =>
      getCommandSuggestions({
        activeFile,
        history: currentCommandHistory,
        limit: 10,
      }),
    [activeFile, currentCommandHistory],
  );
  const sessionSubscriptionKey = useMemo(
    () => sessions.map((session) => session.id).join("|"),
    [sessions],
  );
  const bridgeInfo = getTerminalBridge();
  const statusMeta = getSessionStatusMeta(activeSession, isRunning);
  const statusStyle = getStatusStyle(statusMeta.tone);
  const lastCommand = currentCommandHistory[0] || activeSession?.lastCommand || "";
  const outputLineCount = currentHistory.filter((entry) => !entry.trimMarker).length;
  const elapsedLabel = formatDuration(activeSession, isRunning);

  const scrollToBottom = useCallback((behavior = "auto") => {
    window.requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    });
  }, []);

  const setAutoScroll = useCallback((sessionId, enabled) => {
    setAutoScrollBySession((prev) => {
      if ((prev[sessionId] !== false) === enabled) return prev;
      return { ...prev, [sessionId]: enabled };
    });
  }, []);

  useEffect(() => {
    if (autoScrollEnabled) {
      scrollToBottom("smooth");
    }
  }, [activeSessionId, autoScrollEnabled, currentHistory.length, isRunning, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
      if (autoScrollEnabled) scrollToBottom("auto");
    }
  }, [autoScrollEnabled, isOpen, scrollToBottom]);

  useEffect(() => {
    if (!workspacePath) return;
    setSessions((prev) =>
      prev.map((session) =>
        session.cwd ? session : { ...session, cwd: workspacePath },
      ),
    );
  }, [workspacePath]);

  const setInput = useCallback((sessionId, value) => {
    setInputs((prev) => ({ ...prev, [sessionId]: value }));
  }, []);

  const addEntries = useCallback((sessionId, entries) => {
    const normalizedEntries = (Array.isArray(entries) ? entries : [entries]).flatMap(
      normalizeTerminalEntries,
    );
    if (!normalizedEntries.length) return;

    setHistories((prev) => {
      const nextEntries = normalizedEntries.map((entry) => ({
        ...entry,
        id: ++entryIdRef.current,
      }));
      const bounded = trimTerminalEntries(
        [...(prev[sessionId] || []), ...nextEntries],
        TERMINAL_OUTPUT_LIMIT,
        (omitted) => ({
          id: ++entryIdRef.current,
          type: "status",
          status: "idle",
          trimMarker: true,
          omittedCount: omitted,
          text: `${omitted} older terminal lines hidden to keep this session responsive.`,
        }),
      );
      return { ...prev, [sessionId]: bounded };
    });
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

    const ids = sessionSubscriptionKey
      .split("|")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    const unsubscribes = ids.map((sessionId) => {
      const unsubOutput = bridge.onOutput?.(sessionId, (data) => {
        addEntries(sessionId, [data]);
      });
      const unsubExit = bridge.onExit?.(sessionId, (payload) => {
        const code = resolveExitCode(payload);
        setSessionRunning(sessionId, false);
        setSessions((prev) => markSessionExited(prev, sessionId, code));
        addEntries(sessionId, [
          createTerminalStatusEntry(
            code === 0 ? "success" : "error",
            code === 0 ? "Process exited cleanly." : `Process exited with code ${code}.`,
            { exitCode: code },
          ),
        ]);
      });
      const unsubReady = bridge.onReady?.(sessionId, () => {
        setSessionRunning(sessionId, true);
      });

      return () => {
        disposeMaybe(unsubOutput);
        disposeMaybe(unsubExit);
        disposeMaybe(unsubReady);
      };
    });

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [sessionSubscriptionKey, addEntries, setSessionRunning]);

  const executeCommandInSession = useCallback(
    (sessionId, rawInput, metadata = {}) => {
      const cmd = String(rawInput || "").trim();
      const cmdLower = cmd.toLowerCase();
      const sessionRunning = Boolean(runningBySession[sessionId]);
      const commandCwd = workspacePath || activeCwd || null;
      if (sessionRunning || !cmd) return;

      if (cmdLower === "clear" || cmdLower === "cls") {
        setHistories((prev) => ({ ...prev, [sessionId]: [] }));
        setInput(sessionId, "");
        setCmdIndex((prev) => ({ ...prev, [sessionId]: -1 }));
        return;
      }

      addEntries(sessionId, [
        { type: "input", text: `$ ${cmd}` },
        createTerminalStatusEntry("running", `Running ${cmd}`, {
          cwd: commandCwd,
          taskId: metadata.taskId || null,
        }),
      ]);
      addCommandHistory(sessionId, cmd);
      setInput(sessionId, "");
      setSessions((prev) =>
        markSessionRunning(
          updateSessionLastCommand(prev, sessionId, cmd),
          sessionId,
          cmd,
          commandCwd,
        ),
      );

      const bridge = getTerminalBridge();
      if (bridge.available && bridge.run) {
        setSessionRunning(sessionId, true);
        try {
          const maybePromise = bridge.run({
            id: sessionId,
            sessionId,
            command: cmd,
            cwd: commandCwd,
            taskId: metadata.taskId || null,
          });
          maybePromise?.catch?.((error) => {
            addEntries(sessionId, [
              {
                type: "error",
                text: error?.message || "Terminal command failed.",
              },
              createTerminalStatusEntry("error", "Terminal command failed.", {
                exitCode: 1,
              }),
            ]);
            setSessionRunning(sessionId, false);
            setSessions((prev) => markSessionExited(prev, sessionId, 1));
          });
        } catch (error) {
          addEntries(sessionId, [
            { type: "error", text: error?.message || "Terminal command failed." },
            createTerminalStatusEntry("error", "Terminal command failed.", {
              exitCode: 1,
            }),
          ]);
          setSessionRunning(sessionId, false);
          setSessions((prev) => markSessionExited(prev, sessionId, 1));
        }
      } else {
        setSessionRunning(sessionId, true);
        window.setTimeout(() => {
          const responses = getResponse(cmd);
          const exitCode = inferExitCode(responses || []);
          if (responses) addEntries(sessionId, responses);
          addEntries(sessionId, [
            createTerminalStatusEntry(
              exitCode === 0 ? "success" : "error",
              exitCode === 0
                ? "Simulated command completed."
                : `Simulated command exited with code ${exitCode}.`,
              { exitCode },
            ),
          ]);
          setSessionRunning(sessionId, false);
          setSessions((prev) => markSessionExited(prev, sessionId, exitCode));
        }, 360);
      }
    },
    [
      activeCwd,
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

  const openSession = useCallback(
    (options = {}) => {
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
      setAutoScrollBySession((prev) => ({ ...prev, [session.id]: true }));
      setActiveSessionId(session.id);
      return session;
    },
    [workspacePath],
  );

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
      addEntries(activeSessionId, [{ type: "input", text: `> ${commandText}` }]);
      const bridge = getTerminalBridge();
      if (bridge.input) {
        bridge.input({
          id: activeSessionId,
          sessionId: activeSessionId,
          input: `${commandText}\n`,
        });
      } else {
        addEntries(activeSessionId, [
          {
            type: "warn",
            text: "stdin forwarding ist in dieser Runtime nicht verfuegbar.",
          },
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

  const handleRunLast = useCallback(() => {
    if (!lastCommand || isRunning) return;
    executeCommandInSession(activeSessionId, lastCommand);
  }, [activeSessionId, executeCommandInSession, isRunning, lastCommand]);

  const handleStopRunning = useCallback(() => {
    if (!isRunning) return;
    const bridge = getTerminalBridge();
    bridge.kill?.(activeSessionId);
    addEntries(activeSessionId, [
      createTerminalStatusEntry("warning", "Stop requested. Waiting for process exit."),
    ]);
    setSessionRunning(activeSessionId, false);
    setSessions((prev) => markSessionStopped(prev, activeSessionId));
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

      if (event.key.toLowerCase() === "r" && event.ctrlKey) {
        event.preventDefault();
        handleRunLast();
        return;
      }

      if (event.key.toLowerCase() === "c" && event.ctrlKey) {
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

      if (event.key.toLowerCase() === "l" && event.ctrlKey) {
        event.preventDefault();
        setHistories((prev) => ({ ...prev, [activeSessionId]: [] }));
        return;
      }

      if (event.key === "Escape") {
        setInput(activeSessionId, "");
        setCmdIndex((prev) => ({ ...prev, [activeSessionId]: -1 }));
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        const match = commandSuggestions.find(
          (item) =>
            item.command.startsWith(currentInput) &&
            item.command !== currentInput,
        );
        if (match) setInput(activeSessionId, match.command);
      }
    },
    [
      activeSessionId,
      addEntries,
      cmdHistories,
      cmdIndex,
      commandSuggestions,
      currentInput,
      handleRun,
      handleRunLast,
      handleStopRunning,
      isRunning,
      setInput,
    ],
  );

  const handleCopy = async () => {
    const text = currentHistory
      .filter((entry) => !entry.trimMarker)
      .map((entry) => entry.text)
      .join("\n");
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

  const handleToggleAutoScroll = () => {
    const next = !autoScrollEnabled;
    setAutoScroll(activeSessionId, next);
    if (next) scrollToBottom("smooth");
  };

  const handleOutputScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAutoScroll(activeSessionId, distanceFromBottom < 56);
  }, [activeSessionId, setAutoScroll]);

  const handleOpenSystemTerminal = useCallback(async () => {
    const bridge = getTerminalBridge();
    if (!bridge.openSystemTerminal) {
      addEntries(activeSessionId, [
        {
          type: "warn",
          text: "System Terminal Link ist in dieser Runtime nicht verfuegbar.",
        },
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
    openSession({ name: `shell ${sessions.length + 1}`, kind: "shell" });
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
    setAutoScrollBySession((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });

    setSessions((prev) => {
      const remaining = prev.filter((session) => session.id !== sessionId);
      if (activeSessionId === sessionId && remaining.length) {
        setActiveSessionId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
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
        <div className="flex items-center gap-1.5">
          <TerminalIcon size={12} className="text-purple-400" />
          <span className="text-[11px] font-semibold text-purple-400/80 tracking-widest">
            TERMINAL
          </span>
        </div>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: STATUS_DOT_COLORS[statusMeta.tone] || "#64748b" }}
        />
        <span className="text-[10px] text-gray-500 font-mono truncate">
          {activeSession?.name || "shell"} · {statusMeta.label}
        </span>
        <span className="text-[10px] text-gray-700 ml-auto font-mono truncate">
          {formatTerminalPath(activeCwd) || bridgeInfo.label}
        </span>
        <ChevronDown size={12} className="text-gray-600 rotate-180 ml-0.5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 360, opacity: 1 }}
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
        className="flex min-h-[40px] items-center shrink-0"
        style={{ borderBottom: "1px solid var(--nexus-border)" }}
      >
        <div className="flex h-full min-w-0 flex-1 items-stretch overflow-x-auto">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const sessionRunning = Boolean(runningBySession[session.id]);
            const sessionStatus = getSessionStatusMeta(session, sessionRunning);
            const sessionStyle = getStatusStyle(sessionStatus.tone);
            return (
              <motion.div
                key={session.id}
                layout
                onClick={() => setActiveSessionId(session.id)}
                className="group relative flex min-w-[160px] max-w-[230px] cursor-pointer select-none items-center gap-2 px-3"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                    : "transparent",
                  borderRight: "1px solid var(--nexus-border)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="termTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--primary), transparent)",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background:
                      STATUS_DOT_COLORS[sessionStatus.tone] || "var(--primary)",
                    boxShadow: sessionRunning
                      ? "0 0 10px rgba(34,197,94,0.55)"
                      : "none",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[11px] font-semibold"
                    style={{
                      color: isActive
                        ? "var(--nexus-text)"
                        : "var(--nexus-muted)",
                    }}
                  >
                    {session.name}
                  </div>
                  <div
                    className="truncate text-[9px] font-mono"
                    style={{ color: sessionStyle.color }}
                  >
                    {sessionStatus.label}
                  </div>
                </div>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    className="rounded p-1 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeSession(session.id);
                    }}
                    title="Session schliessen"
                  >
                    <X size={10} className="text-gray-500" />
                  </button>
                )}
              </motion.div>
            );
          })}

          <motion.button
            whileHover={{ scale: 1.05, color: "var(--primary)" }}
            whileTap={{ scale: 0.95 }}
            onClick={addSession}
            title="Neue Terminal Session"
            className="flex h-full shrink-0 items-center gap-1.5 px-3 text-gray-500 transition-colors hover:text-purple-300"
            type="button"
          >
            <Plus size={12} />
            <span className="hidden text-[10px] font-semibold sm:inline">New</span>
          </motion.button>
        </div>

        <div className="flex shrink-0 items-center gap-1 px-2">
          <button
            type="button"
            onClick={handleCopy}
            title="Output kopieren"
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.6 }}
                >
                  <Check size={12} className="text-green-400" />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 1 }} animate={{ scale: 1 }}>
                  <Copy size={12} className="text-slate-400" />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="hidden md:inline">{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            title="Output loeschen"
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            <Trash2 size={12} className="text-slate-400" />
            <span className="hidden md:inline">Clear</span>
          </button>

          <button
            type="button"
            onClick={handleStopRunning}
            disabled={!isRunning}
            title="Laufenden Prozess beenden"
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-40"
            style={{
              border: "1px solid rgba(248,113,113,0.26)",
              background: isRunning
                ? "rgba(248,113,113,0.1)"
                : "rgba(255,255,255,0.02)",
              color: isRunning ? "#fecdd3" : "#64748b",
              cursor: isRunning ? "pointer" : "not-allowed",
            }}
          >
            <Square size={10} fill="currentColor" />
            <span className="hidden md:inline">Kill</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSystemTerminal}
            disabled={terminalLaunchBusy}
            title="System Terminal oeffnen"
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              color: terminalLaunchBusy ? "#64748b" : "#cbd5e1",
              cursor: terminalLaunchBusy ? "progress" : "pointer",
            }}
          >
            <ExternalLink size={11} />
            <span className="hidden md:inline">System</span>
          </button>

          {activeFile && runActiveFileCommand && (
            <button
              type="button"
              onClick={() =>
                runTask({
                  id: "run-active-file",
                  label: "Run Active File",
                  shortLabel: activeFile.name,
                  command: runActiveFileCommand,
                })
              }
              title={`${activeFile.name} ausfuehren`}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                boxShadow: "0 0 10px rgba(124,58,237,0.28)",
              }}
            >
              <Play size={10} fill="white" />
              <span className="hidden md:inline">File</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            title="Schliessen"
            className="rounded p-1.5 transition-colors hover:bg-white/[0.06]"
          >
            <ChevronDown size={13} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div
        className="flex min-h-[38px] shrink-0 items-center gap-2 overflow-x-auto px-3 py-1.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span
          className="flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[10px] font-semibold"
          style={{
            color: statusStyle.color,
            background: statusStyle.background,
            border: `1px solid ${statusStyle.border}`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: STATUS_DOT_COLORS[statusMeta.tone] || "var(--primary)",
            }}
          />
          {statusMeta.label}
        </span>

        <span className="flex min-w-[160px] items-center gap-1.5 truncate text-[10px] text-slate-500">
          <Folder size={11} className="shrink-0 text-slate-600" />
          <span className="truncate font-mono">{formatTerminalPath(activeCwd)}</span>
        </span>

        <span className="hidden shrink-0 items-center gap-1.5 text-[10px] text-slate-600 sm:flex">
          <Clock size={11} />
          {elapsedLabel || formatTime(activeSession?.createdAt)}
        </span>

        {typeof activeSession?.lastExitCode === "number" && (
          <span className="shrink-0 rounded border border-white/10 px-2 py-1 text-[10px] font-mono text-slate-400">
            exit {activeSession.lastExitCode}
          </span>
        )}

        <span className="shrink-0 rounded border border-white/10 px-2 py-1 text-[10px] text-slate-500">
          {outputLineCount}/{TERMINAL_OUTPUT_LIMIT} lines
        </span>

        <span className="ml-auto shrink-0 truncate text-[10px] text-slate-600">
          {bridgeInfo.label}
        </span>

        <button
          type="button"
          onClick={handleToggleAutoScroll}
          title={autoScrollEnabled ? "Autoscroll aktiv" : "Autoscroll fortsetzen"}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-white/[0.06]"
          style={{
            color: autoScrollEnabled ? "#cbd5e1" : "#facc15",
            border: "1px solid rgba(255,255,255,0.1)",
            background: autoScrollEnabled
              ? "rgba(255,255,255,0.02)"
              : "rgba(250,204,21,0.08)",
          }}
        >
          <ArrowDown size={11} />
          {autoScrollEnabled ? "Auto" : "Paused"}
        </button>
      </div>

      <div
        className="flex min-h-[40px] shrink-0 items-center gap-2 overflow-x-auto px-3 py-1.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <select
          value=""
          onChange={(event) => {
            const task = taskItems.find((item) => item.id === event.target.value);
            runTask(task);
          }}
          className="h-7 shrink-0 rounded border border-white/10 bg-black/30 px-2 text-[10px] font-semibold text-gray-300 outline-none"
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
            className="h-7 shrink-0 rounded px-2 text-[10px] font-mono transition-colors disabled:opacity-40"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              color: task.disabled ? "#64748b" : "#cbd5e1",
              background:
                task.kind === "task"
                  ? "rgba(168,85,247,0.07)"
                  : "rgba(255,255,255,0.02)",
              cursor: task.disabled ? "not-allowed" : "pointer",
            }}
            title={
              task.disabled
                ? "Task aktuell nicht verfuegbar"
                : `Task ausfuehren: ${task.command}`
            }
          >
            {task.shortLabel}
          </button>
        ))}

        <button
          type="button"
          onClick={handleRunLast}
          disabled={!lastCommand || isRunning}
          title={lastCommand ? `Run last: ${lastCommand}` : "Kein Verlauf"}
          className="flex h-7 shrink-0 items-center gap-1 rounded px-2 text-[10px] font-semibold transition-colors disabled:opacity-40"
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.02)",
            color: !lastCommand || isRunning ? "#64748b" : "#cbd5e1",
            cursor: !lastCommand || isRunning ? "not-allowed" : "pointer",
          }}
        >
          <RotateCcw size={11} />
          Last
        </button>

        <span
          className="flex shrink-0 items-center gap-1 text-[10px] text-slate-600"
          title="Command history"
        >
          <Clock size={11} />
        </span>

        {commandSuggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => executeCommandInSession(activeSessionId, item.command)}
            disabled={isRunning}
            className="h-7 shrink-0 rounded px-2 text-[10px] font-mono transition-colors disabled:opacity-40"
            style={{
              border: item.recent
                ? "1px solid rgba(128,0,255,0.24)"
                : "1px solid rgba(255,255,255,0.1)",
              background: item.recent
                ? "rgba(128,0,255,0.08)"
                : "rgba(255,255,255,0.02)",
              color: isRunning ? "#64748b" : "#cbd5e1",
              cursor: isRunning ? "not-allowed" : "pointer",
            }}
            title={`${item.group}: ${item.command}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-4 py-2 font-mono"
        onClick={() => inputRef.current?.focus()}
        onScroll={handleOutputScroll}
        style={{ cursor: "text" }}
      >
        <div className="space-y-0.5">
          {currentHistory.map((entry) => (
            <TerminalOutputRow key={entry.id} entry={entry} />
          ))}
        </div>

        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 flex items-center gap-1.5"
              style={{ fontSize: "12px", color: "#64748b" }}
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
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              ))}
              <span className="ml-1 text-[11px] text-gray-500">
                Process running · stdin ready
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="flex min-h-[46px] shrink-0 items-center gap-2 px-4 py-2"
        style={{ borderTop: "1px solid rgba(128,0,255,0.09)" }}
      >
        <span
          className="flex shrink-0 items-center gap-1 rounded border border-white/10 bg-white/[0.02] px-2 py-1 font-mono text-[11px]"
          style={{ color: "var(--primary)" }}
        >
          $
        </span>

        <input
          ref={inputRef}
          value={currentInput}
          onChange={(event) => {
            setInput(activeSessionId, event.target.value);
            setCmdIndex((prev) => ({ ...prev, [activeSessionId]: -1 }));
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-3 py-2 font-mono outline-none transition-colors focus:border-purple-500/50"
          style={{
            color: "#d1d5db",
            caretColor: "#a855f7",
            fontSize: "12px",
            opacity: 1,
          }}
          placeholder={isRunning ? "stdin..." : "Command"}
        />

        <button
          type="button"
          onClick={handleRun}
          disabled={!currentInput.trim()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-[11px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            cursor: currentInput.trim() ? "pointer" : "not-allowed",
          }}
        >
          <Play size={12} fill="white" />
          {isRunning ? "Send" : "Run"}
        </button>
      </div>
    </motion.div>
  );
}
