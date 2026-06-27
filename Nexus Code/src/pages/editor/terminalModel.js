let nextSessionId = 1;

const isBrowser = () => typeof window !== "undefined";
const isFunction = (value) => typeof value === "function";

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
    lastCommand: options.lastCommand || "",
    createdAt: options.createdAt || new Date().toISOString(),
  };
}

export function createWelcomeEntries(session) {
  const label = session?.kind === "task" ? "Task Runner" : "Terminal";
  return [
    { id: 1, type: "system", text: `Nexus Code ${label} v1.1` },
    { id: 2, type: "system", text: "Tippe 'help' fuer verfuegbare Befehle." },
  ];
}

export function resolveRunCommandForFile(activeFile) {
  const fileName = activeFile?.name || "";
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.toLowerCase()
    : "";
  if (!ext) return "";
  if (ext === "js" || ext === "mjs" || ext === "cjs") return `node ${fileName}`;
  if (ext === "ts" || ext === "tsx") return `npx tsx ${fileName}`;
  if (ext === "py") return `python ${fileName}`;
  if (ext === "java") return `java ${fileName.replace(".java", "")}`;
  if (ext === "sh") return `bash ${fileName}`;
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

export function normalizeTerminalEntry(entry) {
  if (typeof entry === "string") return { type: "output", text: entry };
  return {
    type: entry?.type || "output",
    text: String(entry?.text ?? entry?.data ?? ""),
    ...entry,
  };
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
