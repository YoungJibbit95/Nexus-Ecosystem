import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
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
  input: "#7dd3fc",
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
    color: "#93c5fd",
    background: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.16)",
  },
  idle: {
    color: "#cbd5e1",
    background: "rgba(148,163,184,0.06)",
    border: "rgba(148,163,184,0.14)",
  },
};

const STATUS_DOT_COLORS = {
  running: "#38bdf8",
  success: "#60a5fa",
  error: "#fb7185",
  warning: "#facc15",
  task: "#38bdf8",
  idle: "#64748b",
};

const toolbarButtonClass =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-slate-500 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-35";

const toolbarButtonStyle = {
  borderColor: "rgba(148,163,184,0.055)",
  background: "rgba(2,6,23,0.16)",
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
        className="grid min-w-0 grid-cols-[1.4rem_1fr] gap-2 py-0.5 text-[11px] leading-relaxed"
        style={{
          color: entry.trimMarker ? "#64748b" : "#94a3b8",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        <span className="select-none text-right text-slate-700">
          {entry.trimMarker ? "..." : "#"}
        </span>
        <span className="min-w-0 break-words">
          {entry.timestamp ? `[${formatTime(entry.timestamp)}] ` : ""}
          {text}
        </span>
      </div>
    );
  }

  if (entry.type === "input") {
    const commandText = String(text).replace(/^[$>]\s?/, "");
    const prompt = String(text).startsWith(">") ? ">" : "$";

    return (
      <div className="grid min-w-0 grid-cols-[1.4rem_1fr] gap-2 py-0.5 leading-relaxed">
        <span className="select-none text-right text-[12px] text-cyan-300/85">
          {prompt}
        </span>
        <span
          className="min-w-0 break-words text-[12px] text-cyan-100"
          style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}
        >
          {commandText || "\u00A0"}
        </span>
      </div>
    );
  }

  return (
    <div
      className="grid min-w-0 grid-cols-[1.4rem_1fr] gap-2 leading-relaxed"
      style={{
        color: getEntryColor(entry.type),
        fontSize: "12px",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      <span className="select-none text-right text-slate-700">
        {entry.type === "error" ? "!" : entry.type === "warn" ? "*" : ""}
      </span>
      <span className="min-w-0 break-words">{text}</span>
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
  const commandSuggestions = useMemo(
    () =>
      getCommandSuggestions({
        activeFile,
        history: currentCommandHistory,
        limit: 6,
      }),
    [activeFile, currentCommandHistory],
  );
  const sessionSubscriptionKey = useMemo(
    () => sessions.map((session) => session.id).join("|"),
    [sessions],
  );
  const bridgeInfo = getTerminalBridge();
  const statusMeta = getSessionStatusMeta(activeSession, isRunning);
  const lastCommand = currentCommandHistory[0] || activeSession?.lastCommand || "";
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
        className="flex h-7 w-full shrink-0 cursor-pointer select-none items-center gap-2 px-3 font-mono"
        style={{
          background: "rgba(5,8,14,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.052)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <TerminalIcon size={12} className="text-slate-500" />
          <span className="text-[11px] font-medium text-slate-400">
            Terminal
          </span>
        </div>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: STATUS_DOT_COLORS[statusMeta.tone] || "#64748b" }}
        />
        <span className="min-w-0 truncate font-mono text-[10px] text-slate-500">
          {activeSession?.name || "shell"} - {statusMeta.label}{elapsedLabel ? ` - ${elapsedLabel}` : ""}
        </span>
        <span className="ml-auto hidden min-w-0 truncate font-mono text-[10px] text-slate-600 sm:block">
          {formatTerminalPath(activeCwd) || bridgeInfo.label}
        </span>
        <ChevronDown size={12} className="ml-0.5 rotate-180 text-slate-600" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "min(320px, 36vh)", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex shrink-0 flex-col font-mono selection:bg-sky-300/20"
      style={{
        background: "linear-gradient(180deg, rgba(1,4,8,0.998), rgba(0,2,5,0.998))",
        borderTop: "1px solid rgba(148,163,184,0.065)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex min-h-[30px] shrink-0 items-center"
        style={{ borderBottom: "1px solid rgba(148,163,184,0.042)" }}
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
                className="group relative flex min-w-[104px] max-w-[184px] cursor-pointer select-none items-center gap-2 border-r px-2.5 transition-colors sm:min-w-[122px]"
                style={{
                  background: isActive ? "rgba(148,163,184,0.038)" : "transparent",
                  borderColor: "rgba(148,163,184,0.04)",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="termTabIndicator"
                    className="absolute inset-x-3 bottom-0 h-px"
                    style={{ background: "rgba(125,211,252,0.34)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: STATUS_DOT_COLORS[sessionStatus.tone] || "#64748b",
                  }}
                />
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span
                    className="truncate text-[11px] font-medium"
                    style={{
                      color: isActive ? "#e5e7eb" : "#94a3b8",
                    }}
                  >
                    {session.name}
                  </span>
                  <span
                    className="hidden shrink-0 font-mono text-[9px] sm:inline"
                    style={{ color: sessionRunning ? "#86efac" : sessionStyle.color }}
                  >
                    {sessionStatus.label}
                  </span>
                </div>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    className="rounded p-0.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeSession(session.id);
                    }}
                    title="Session schliessen"
                  >
                    <X size={10} className="text-slate-500" />
                  </button>
                )}
              </motion.div>
            );
          })}

          <motion.button
            whileHover={{ backgroundColor: "rgba(255,255,255,0.055)" }}
            whileTap={{ scale: 0.96 }}
            onClick={addSession}
            title="Neue Terminal Session"
            className="mx-1 my-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.045] bg-white/[0.012] text-slate-500 transition-colors hover:text-slate-200"
            type="button"
          >
            <Plus size={13} />
          </motion.button>
        </div>

        <div className="flex shrink-0 items-center gap-1 px-2">
          <div className="hidden items-center gap-0.5 rounded-md border border-white/[0.038] bg-white/[0.01] p-0.5 sm:flex">
            <button
              type="button"
              onClick={handleCopy}
              title="Output kopieren"
              className={`${toolbarButtonClass} hover:bg-white/[0.055] hover:text-slate-200`}
              style={toolbarButtonStyle}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.6 }}
                  >
                    <Check size={13} className="text-sky-300" />
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 1 }} animate={{ scale: 1 }}>
                    <Copy size={13} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={handleClear}
              title="Output loeschen"
              className={`${toolbarButtonClass} hover:bg-white/[0.055] hover:text-slate-200`}
              style={toolbarButtonStyle}
            >
              <Trash2 size={13} />
            </button>

            <button
              type="button"
              onClick={handleStopRunning}
              disabled={!isRunning}
              title="Laufenden Prozess beenden"
              className={`${toolbarButtonClass} hover:bg-rose-400/[0.08]`}
              style={{
                ...toolbarButtonStyle,
                borderColor: isRunning
                  ? "rgba(248,113,113,0.22)"
                  : toolbarButtonStyle.borderColor,
                background: isRunning
                  ? "rgba(248,113,113,0.07)"
                  : toolbarButtonStyle.background,
                color: isRunning ? "#fca5a5" : "#64748b",
              }}
            >
              <Square size={11} fill="currentColor" />
            </button>

            <button
              type="button"
              onClick={handleOpenSystemTerminal}
              disabled={terminalLaunchBusy}
              title="System Terminal oeffnen"
              className={`${toolbarButtonClass} hover:bg-white/[0.055] hover:text-slate-200`}
              style={toolbarButtonStyle}
            >
              <ExternalLink size={13} />
            </button>

            <button
              type="button"
              onClick={handleToggleAutoScroll}
              title={autoScrollEnabled ? "Autoscroll aktiv" : "Autoscroll fortsetzen"}
              className={`${toolbarButtonClass} hover:bg-white/[0.055] hover:text-slate-200`}
              style={{
                ...toolbarButtonStyle,
                color: autoScrollEnabled ? "#94a3b8" : "#facc15",
              }}
            >
              <ArrowDown size={13} />
            </button>

            <button
              type="button"
              onClick={onToggle}
              title="Schliessen"
              className={`${toolbarButtonClass} hover:bg-white/[0.055] hover:text-slate-200`}
              style={toolbarButtonStyle}
            >
              <ChevronDown size={13} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleStopRunning}
            disabled={!isRunning}
            title="Laufenden Prozess beenden"
            className={`${toolbarButtonClass} sm:hidden`}
            style={{
              ...toolbarButtonStyle,
              borderColor: isRunning
                ? "rgba(248,113,113,0.22)"
                : toolbarButtonStyle.borderColor,
              background: isRunning
                ? "rgba(248,113,113,0.07)"
                : toolbarButtonStyle.background,
              color: isRunning ? "#fca5a5" : "#64748b",
            }}
          >
            <Square size={11} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            title="Schliessen"
            className={`${toolbarButtonClass} sm:hidden`}
            style={toolbarButtonStyle}
          >
            <ChevronDown size={13} />
          </button>
        </div>
      </div>


      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-4 py-2.5"
        onClick={() => inputRef.current?.focus()}
        onScroll={handleOutputScroll}
        style={{
          cursor: "text",
          background:
            "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.025), transparent 35%), #020407",
        }}
      >
        {currentHistory.length === 0 ? (
          <div className="py-2 text-[11px] text-slate-700">
            terminal cleared
          </div>
        ) : (
          <div className="space-y-0.5">
            {currentHistory.map((entry) => (
              <TerminalOutputRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 inline-flex min-w-0 items-center gap-2 rounded-md border border-sky-400/15 bg-sky-400/[0.055] px-2.5 py-1.5"
              style={{ fontSize: "12px", color: "#64748b" }}
            >
              <span className="flex shrink-0 items-center gap-1">
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
                    style={{ background: "#38bdf8" }}
                  />
                ))}
              </span>
              <span className="min-w-0 truncate text-[11px] text-sky-100/75">
                Process running. stdin is ready.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="flex min-h-[38px] shrink-0 items-center gap-2 px-4 py-1.5"
        style={{
          borderTop: "1px solid rgba(148,163,184,0.045)",
          background: "rgba(0,0,0,0.22)",
        }}
      >
        <span
          className="shrink-0 font-mono text-[12px]"
          style={{ color: "#7dd3fc" }}
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
          className="min-w-0 flex-1 border border-transparent bg-transparent px-1 py-1.5 outline-none transition-colors placeholder:text-slate-700 focus:border-transparent"
          style={{
            color: "#dbe4ef",
            caretColor: "#7dd3fc",
            fontSize: "12px",
            opacity: 1,
          }}
          placeholder={isRunning ? "stdin..." : "command"}
        />

        <div className="hidden min-w-0 shrink-0 items-center gap-1 md:flex">
          <select
            value=""
            onChange={(event) => {
              const task = taskItems.find((item) => item.id === event.target.value);
              runTask(task);
            }}
            className="h-6 w-[94px] min-w-0 rounded-md border border-white/[0.04] bg-black/20 px-1.5 text-[10px] text-slate-500 outline-none transition-colors hover:text-slate-200"
            title="Task Runner"
          >
            <option value="">tasks</option>
            {taskItems.map((task) => (
              <option key={task.id} value={task.id} disabled={task.disabled}>
                {task.label}
              </option>
            ))}
          </select>

          {activeFile && runActiveFileCommand ? (
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
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-sky-300/[0.08] bg-sky-300/[0.025] text-sky-200/80 transition-colors hover:bg-sky-300/[0.06] hover:text-sky-100"
            >
              <Play size={11} fill="currentColor" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleRunLast}
            disabled={!lastCommand || isRunning}
            title={lastCommand ? `Run last: ${lastCommand}` : "Kein Verlauf"}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/[0.04] bg-white/[0.008] text-slate-500 transition-colors hover:bg-white/[0.045] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <RotateCcw size={11} />
          </button>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={!currentInput.trim()}
          className="flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-medium transition-colors disabled:opacity-35"
          style={{
            borderColor: currentInput.trim()
              ? "rgba(125,211,252,0.16)"
              : "rgba(255,255,255,0.045)",
            background: currentInput.trim()
              ? "rgba(14,165,233,0.065)"
              : "rgba(255,255,255,0.01)",
            color: currentInput.trim() ? "#bae6fd" : "#64748b",
            cursor: currentInput.trim() ? "pointer" : "not-allowed",
          }}
        >
          <Play size={12} fill="currentColor" />
          <span className="hidden sm:inline">{isRunning ? "Send" : "Run"}</span>
        </button>
      </div>
    </motion.div>
  );
}
