"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const MAX_PATH_LENGTH = 4096;
const MAX_WRITE_BYTES = 20 * 1024 * 1024;
const MAX_TERMINAL_COMMAND_LENGTH = 8_000;
const MAX_TERMINAL_INPUT_LENGTH = 64_000;

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
