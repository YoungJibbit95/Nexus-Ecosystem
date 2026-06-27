"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const MAX_PATH_LENGTH = 4096;
const MAX_WRITE_BYTES = 20 * 1024 * 1024;
const MAX_TERMINAL_COMMAND_LENGTH = 8_000;
const MAX_TERMINAL_INPUT_LENGTH = 64_000;
const MAX_BRIDGE_OPTION_BYTES = 64 * 1024;

const noop = () => {};

const assertCallback = (value) => (typeof value === "function" ? value : noop);

const sanitizePath = (value, label = "path") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  if (value.length > MAX_PATH_LENGTH || value.includes("\0")) {
    throw new Error(`${label} is not allowed`);
  }

  return value;
};

const sanitizeOptionalPath = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return sanitizePath(value, "cwd");
};

const sanitizeTerminalId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 0 || id > 1_000_000) {
    throw new Error("Invalid terminal session id");
  }
  return id;
};

const sanitizeText = (value, maxBytes, label) => {
  const text = String(value ?? "");
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error(`${label} is too large`);
  }
  return text;
};

const sanitizeBridgeOptions = (value, label = "options") => {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const safeKey = sanitizeText(key, 128, `${label} key`);
    if (item === undefined) continue;
    if (item === null || typeof item === "boolean") {
      result[safeKey] = item;
      continue;
    }
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new Error(`${safeKey} must be finite`);
      result[safeKey] = item;
      continue;
    }
    if (typeof item === "string") {
      result[safeKey] = sanitizeText(item, MAX_BRIDGE_OPTION_BYTES, safeKey);
      continue;
    }
    if (Array.isArray(item)) {
      result[safeKey] = item.map((entry) => sanitizeText(entry, MAX_BRIDGE_OPTION_BYTES, safeKey));
      continue;
    }
  }
  return result;
};

const terminalChannel = (type, id) => `terminal:${type}:${sanitizeTerminalId(id)}`;

const onIpc = (channel, callback, mapper = (_event, value) => value) => {
  const safeCallback = assertCallback(callback);
  const handler = (event, value) => safeCallback(mapper(event, value));
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,

  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),

  onMaximized: (callback) => onIpc("window:maximized", callback),
  onFullscreen: (callback) => onIpc("window:fullscreen", callback),

  openFolder: () => ipcRenderer.invoke("dialog:open-folder"),
  readDir: (targetPath) => ipcRenderer.invoke("fs:read-directory", sanitizePath(targetPath)),
  readFile: (targetPath) => ipcRenderer.invoke("fs:read-file", sanitizePath(targetPath)),
  writeFile: (targetPath, content) => ipcRenderer.invoke(
    "fs:write-file",
    sanitizePath(targetPath),
    sanitizeText(content, MAX_WRITE_BYTES, "File content"),
  ),
  mkdir: (targetPath) => ipcRenderer.invoke("fs:mkdir", sanitizePath(targetPath)),
  delete: (targetPath) => ipcRenderer.invoke("fs:delete", sanitizePath(targetPath)),
  rename: (oldPath, newPath) => ipcRenderer.invoke(
    "fs:rename",
    sanitizePath(oldPath, "oldPath"),
    sanitizePath(newPath, "newPath"),
  ),
  openSystemTerminal: (cwd) => ipcRenderer.invoke("system:open-terminal", sanitizeOptionalPath(cwd)),

  gitStatus: (repoPath) => ipcRenderer.invoke("git:status", sanitizePath(repoPath, "repoPath")),
  gitDiff: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:diff",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitDiff options"),
  ),
  gitStage: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:stage",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitStage options"),
  ),
  gitUnstage: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:unstage",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitUnstage options"),
  ),
  gitCommit: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:commit",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitCommit options"),
  ),
  gitBranch: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:branch",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitBranch options"),
  ),
  gitLog: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:log",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitLog options"),
  ),
  gitRemotes: (repoPath) => ipcRenderer.invoke("git:remotes", sanitizePath(repoPath, "repoPath")),

  githubGetAuthStatus: () => ipcRenderer.invoke("github:auth-status"),
  githubStartDeviceFlow: (options = {}) => ipcRenderer.invoke(
    "github:device-flow:start",
    sanitizeBridgeOptions(options, "githubStartDeviceFlow options"),
  ),
  githubPollDeviceFlow: (flow) => ipcRenderer.invoke(
    "github:device-flow:poll",
    typeof flow === "object" && flow !== null
      ? sanitizeBridgeOptions(flow, "githubPollDeviceFlow options")
      : { flowId: sanitizeText(flow, 256, "flowId") },
  ),
  githubSignOut: () => ipcRenderer.invoke("github:sign-out"),
  githubGetViewer: () => ipcRenderer.invoke("github:viewer"),
  githubListRepositories: (options = {}) => ipcRenderer.invoke(
    "github:repositories",
    sanitizeBridgeOptions(options, "githubListRepositories options"),
  ),
  githubGetRateLimit: () => ipcRenderer.invoke("github:rate-limit"),

  terminalRun: (payload = {}) => ipcRenderer.send("terminal:run", {
    id: sanitizeTerminalId(payload.id),
    command: sanitizeText(payload.command, MAX_TERMINAL_COMMAND_LENGTH, "Terminal command"),
    cwd: sanitizeOptionalPath(payload.cwd),
  }),
  terminalInput: (payload = {}) => ipcRenderer.send("terminal:input", {
    id: sanitizeTerminalId(payload.id),
    input: sanitizeText(payload.input, MAX_TERMINAL_INPUT_LENGTH, "Terminal input"),
  }),
  terminalKill: (id) => ipcRenderer.send("terminal:kill", sanitizeTerminalId(id)),
  onTerminalOutput: (id, callback) => onIpc(terminalChannel("output", id), callback),
  onTerminalExit: (id, callback) => onIpc(terminalChannel("exit", id), callback),
  onTerminalReady: (id, callback) => onIpc(terminalChannel("ready", id), callback, () => undefined),
});
