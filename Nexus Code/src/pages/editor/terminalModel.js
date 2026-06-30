let nextSessionId = 1;

export const TERMINAL_OUTPUT_LIMIT = 700;
export const TERMINAL_ENTRY_TEXT_LIMIT = 4000;

const isBrowser = () => typeof window !== "undefined";
const isFunction = (value) => typeof value === "function";

const ANSI_PATTERN =
  /[\x1B\x9B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\x07)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

export const TERMINAL_COMMON_COMMANDS = [
  {
    id: "git-status",
    label: "git status",
    command: "git status",
    group: "Git",
  },
  {
    id: "git-branch",
    label: "git branch",
    command: "git branch",
    group: "Git",
  },
  {
    id: "npm-dev",
    label: "npm dev",
    command: "npm run dev",
    group: "NPM",
  },
  {
    id: "npm-build",
    label: "npm build",
    command: "npm run build",
    group: "NPM",
  },
  {
    id: "npm-lint",
    label: "npm lint",
    command: "npm run lint",
    group: "NPM",
  },
  {
    id: "npm-test",
    label: "npm test",
    command: "npm test",
    group: "NPM",
  },
  {
    id: "pwd",
    label: "pwd",
    command: "pwd",
    group: "Shell",
  },
  {
    id: "ls",
    label: "ls -la",
    command: "ls -la",
    group: "Shell",
  },
  {
    id: "clear",
    label: "clear",
    command: "clear",
    group: "Shell",
  },
];

export const TERMINAL_TASKS = [
  {
    id: "git-status",
    label: "Git Status",
    shortLabel: "git status",
    command: "git status",
    group: "Git",
    quick: true,
  },
  {
    id: "npm-dev",
    label: "Dev Server",
    shortLabel: "npm dev",
    command: "npm run dev",
    group: "NPM",
    quick: true,
  },
  {
    id: "npm-build",
    label: "Build",
    shortLabel: "npm build",
    command: "npm run build",
    group: "NPM",
    quick: true,
  },
  {
    id: "npm-test",
    label: "Tests",
    shortLabel: "npm test",
    command: "npm test",
    group: "NPM",
    quick: false,
  },
  {
    id: "npm-lint",
    label: "Lint",
    shortLabel: "npm lint",
    command: "npm run lint",
    group: "NPM",
    quick: false,
  },
  {
    id: "npm-typecheck",
    label: "Typecheck",
    shortLabel: "typecheck",
    command: "npm run typecheck",
    group: "NPM",
    quick: false,
  },
  {
    id: "run-active-file",
    label: "Run Active File",
    shortLabel: "run file",
    command: null,
    group: "File",
    quick: true,
  },
];

export function createTerminalSession(options = {}) {
  const id = options.id ?? nextSessionId++;
  return {
    id,
    name: options.name || (options.kind === "task" ? "task" : "bash"),
    kind: options.kind || "shell",
    cwd: options.cwd || null,
    taskId: options.taskId || null,
    status: options.status || "idle",
    lastExitCode: options.lastExitCode ?? null,
    lastCommand: options.lastCommand || "",
    lastStartedAt: options.lastStartedAt || null,
    lastEndedAt: options.lastEndedAt || null,
    createdAt: options.createdAt || new Date().toISOString(),
  };
}

export function createWelcomeEntries(session) {
  const label = session?.kind === "task" ? "Task Runner" : "Terminal";
  const cwd = formatTerminalPath(session?.cwd);
  return [
    { id: 1, type: "system", text: `Nexus Code ${label} v1.1` },
    { id: 2, type: "system", text: "Tippe 'help' fuer verfuegbare Befehle." },
    { id: 3, type: "status", status: "idle", text: `cwd ${cwd}` },
  ];
}

export function resolveRunCommandForFile(activeFile) {
  const fileName = activeFile?.name || "";
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : "";
  if (!ext) return "";
  const shellFileName = quoteShellToken(fileName);
  if (ext === "js" || ext === "mjs" || ext === "cjs") return `node ${shellFileName}`;
  if (ext === "ts" || ext === "tsx") return `npx tsx ${shellFileName}`;
  if (ext === "py") return `python ${shellFileName}`;
  if (ext === "java") return `java ${fileName.replace(".java", "")}`;
  if (ext === "sh") return `bash ${shellFileName}`;
  return "";
}

export function resolveTaskCommand(task, activeFile) {
  if (!task) return "";
  if (task.id === "run-active-file") return resolveRunCommandForFile(activeFile);
  return task.command || "";
}

export function getTaskRunnerItems(activeFile) {
  return TERMINAL_TASKS.map((task) => {
    const command = resolveTaskCommand(task, activeFile);
    return {
      ...task,
      command,
      disabled: task.id === "run-active-file" && !command,
    };
  });
}

export function getCommandSuggestions({ activeFile, history = [], limit = 6 } = {}) {
  const runFileCommand = resolveRunCommandForFile(activeFile);
  const recent = history
    .filter(Boolean)
    .slice(0, 3)
    .map((command, index) => ({
      id: `recent-${index}-${command}`,
      label: command.length > 18 ? `${command.slice(0, 18)}...` : command,
      command,
      group: "Recent",
      recent: true,
    }));
  const runFile = runFileCommand
    ? [
        {
          id: "run-active-file-suggestion",
          label: "run file",
          command: runFileCommand,
          group: "File",
        },
      ]
    : [];

  const seen = new Set();
  return [...recent, ...runFile, ...TERMINAL_COMMON_COMMANDS]
    .filter((item) => {
      if (!item.command || seen.has(item.command)) return false;
      seen.add(item.command);
      return true;
    })
    .slice(0, limit);
}

export function getTerminalBridge() {
  if (!isBrowser()) return { available: false, provider: "fallback" };

  const electron = window.electronAPI;
  if (electron?.terminalRun) {
    return {
      available: true,
      provider: "electron",
      label: "Electron terminal IPC",
      run: (payload) => electron.terminalRun(payload),
      input: (payload) => electron.terminalInput?.(payload),
      kill: (id) => electron.terminalKill?.(id),
      openSystemTerminal: (cwd) => electron.openSystemTerminal?.(cwd),
      onOutput: (id, callback) => electron.onTerminalOutput?.(id, callback),
      onExit: (id, callback) => electron.onTerminalExit?.(id, callback),
      onReady: (id, callback) => electron.onTerminalReady?.(id, callback),
    };
  }

  const nexusTerminal = window.nexus?.terminal;
  if (nexusTerminal) {
    return {
      available: Boolean(nexusTerminal.run),
      provider: "nexus",
      label: "Nexus terminal bridge",
      run: (payload) => nexusTerminal.run?.(payload),
      input: (payload) => nexusTerminal.input?.(payload),
      kill: (id) => nexusTerminal.kill?.(id),
      openSystemTerminal: (cwd) => nexusTerminal.openSystemTerminal?.(cwd),
      onOutput: (id, callback) =>
        nexusTerminal.onOutput?.(id, callback) ||
        nexusTerminal.subscribe?.(id, "output", callback),
      onExit: (id, callback) =>
        nexusTerminal.onExit?.(id, callback) ||
        nexusTerminal.subscribe?.(id, "exit", callback),
      onReady: (id, callback) =>
        nexusTerminal.onReady?.(id, callback) ||
        nexusTerminal.subscribe?.(id, "ready", callback),
    };
  }

  return { available: false, provider: "fallback", label: "Simulated terminal" };
}

export function stripAnsiSequences(text) {
  return String(text ?? "").replace(ANSI_PATTERN, "");
}

export function normalizeTerminalEntry(entry) {
  if (typeof entry === "string") {
    return { type: "output", text: stripAnsiSequences(entry) };
  }
  const text = stripAnsiSequences(entry?.text ?? entry?.data ?? entry?.message ?? "");
  return {
    type: entry?.type || "output",
    ...entry,
    text,
  };
}

export function normalizeTerminalEntries(entry) {
  const normalized = normalizeTerminalEntry(entry);
  const text = String(normalized.text ?? "");

  if (normalized.type === "input" || normalized.type === "status") {
    return [{ ...normalized, text }];
  }

  const normalizedNewlines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedNewlines.includes("\n")
    ? normalizedNewlines.split("\n")
    : [normalizedNewlines];

  return lines.flatMap((line) => {
    if (line.length <= TERMINAL_ENTRY_TEXT_LIMIT) {
      return [{ ...normalized, text: line }];
    }

    const chunks = [];
    for (let index = 0; index < line.length; index += TERMINAL_ENTRY_TEXT_LIMIT) {
      chunks.push({
        ...normalized,
        text: line.slice(index, index + TERMINAL_ENTRY_TEXT_LIMIT),
      });
    }
    return chunks;
  });
}

export function createTerminalStatusEntry(status, text, details = {}) {
  return {
    type: "status",
    status,
    text,
    timestamp: new Date().toISOString(),
    ...details,
  };
}

export function trimTerminalEntries(
  entries,
  limit = TERMINAL_OUTPUT_LIMIT,
  createTrimEntry,
) {
  const previousHidden = entries.reduce(
    (total, entry) => total + (entry?.trimMarker ? Number(entry.omittedCount) || 0 : 0),
    0,
  );
  const cleanEntries = entries.filter((entry) => !entry?.trimMarker);
  if (cleanEntries.length <= limit) return cleanEntries;

  const keptCount = Math.max(1, limit - 1);
  const omitted = previousHidden + cleanEntries.length - keptCount;
  const marker =
    createTrimEntry?.(omitted) || {
      type: "system",
      trimMarker: true,
      omittedCount: omitted,
      text: `${omitted} older terminal lines hidden.`,
    };

  return [marker, ...cleanEntries.slice(cleanEntries.length - keptCount)];
}

export function updateTerminalSession(sessions, sessionId, patch) {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, ...patch } : session,
  );
}

export function markSessionRunning(sessions, sessionId, command, cwd) {
  return updateTerminalSession(sessions, sessionId, {
    status: "running",
    cwd: cwd || sessions.find((session) => session.id === sessionId)?.cwd || null,
    lastCommand: command || "",
    lastExitCode: null,
    lastStartedAt: new Date().toISOString(),
    lastEndedAt: null,
  });
}

export function markSessionExited(sessions, sessionId, exitCode) {
  const code = Number.isFinite(Number(exitCode)) ? Number(exitCode) : 1;
  return updateTerminalSession(sessions, sessionId, {
    status: code === 0 ? "success" : "error",
    lastExitCode: code,
    lastEndedAt: new Date().toISOString(),
  });
}

export function markSessionStopped(sessions, sessionId) {
  return updateTerminalSession(sessions, sessionId, {
    status: "stopped",
    lastExitCode: null,
    lastEndedAt: new Date().toISOString(),
  });
}

export function getSessionStatusMeta(session, isRunning = false) {
  if (isRunning || session?.status === "running") {
    return {
      label: "Running",
      tone: "running",
      detail: session?.lastCommand || "Process active",
    };
  }

  if (typeof session?.lastExitCode === "number") {
    return {
      label: session.lastExitCode === 0 ? "Exited 0" : `Exit ${session.lastExitCode}`,
      tone: session.lastExitCode === 0 ? "success" : "error",
      detail: session?.lastCommand || "Process finished",
    };
  }

  if (session?.status === "stopped") {
    return {
      label: "Stopped",
      tone: "warning",
      detail: session?.lastCommand || "Process stopped",
    };
  }

  return {
    label: "Ready",
    tone: session?.kind === "task" ? "task" : "idle",
    detail: session?.lastCommand || "Awaiting command",
  };
}

export function formatTerminalPath(path) {
  if (!path) return "~";
  const value = String(path);
  if (value.length <= 46) return value;

  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 3) return value;

  const prefix = normalized.startsWith("/") ? "/" : "";
  return `${prefix}${parts[0]}/.../${parts.slice(-2).join("/")}`;
}

export function updateSessionLastCommand(sessions, sessionId, command) {
  return sessions.map((session) =>
    session.id === sessionId
      ? {
          ...session,
          lastCommand: command,
          name:
            session.kind === "task" && command
              ? command.length > 18
                ? `${command.slice(0, 18)}...`
                : command
              : session.name,
        }
      : session,
  );
}

export function canUseTerminalBridge() {
  return getTerminalBridge().available;
}

export function disposeMaybe(dispose) {
  if (isFunction(dispose)) dispose();
}

function quoteShellToken(value) {
  const text = String(value || "");
  if (!text) return text;
  if (/^[\w./:-]+$/.test(text)) return text;
  return `"${text.replace(/(["\\$`])/g, "\\$1")}"`;
}
