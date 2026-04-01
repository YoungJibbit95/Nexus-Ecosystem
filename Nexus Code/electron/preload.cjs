"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Expose a safe subset of Electron APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Window controls
  minimize:     () => ipcRenderer.send("window:minimize"),
  maximize:     () => ipcRenderer.send("window:maximize"),
  close:        () => ipcRenderer.send("window:close"),
  isMaximized:  () => ipcRenderer.invoke("window:is-maximized"),

  // Listen for window state changes
  onMaximized:   (cb) => {
    const handler = (_event, value) => cb(value);
    ipcRenderer.on("window:maximized", handler);
    return () => ipcRenderer.removeListener("window:maximized", handler);
  },
  onFullscreen:  (cb) => {
    const handler = (_event, value) => cb(value);
    ipcRenderer.on("window:fullscreen", handler);
    return () => ipcRenderer.removeListener("window:fullscreen", handler);
  },

  // File System & Dialogs
  openFolder:   () => ipcRenderer.invoke("dialog:open-folder"),
  readDir:      (path) => ipcRenderer.invoke("fs:read-directory", path),
  readFile:     (path) => ipcRenderer.invoke("fs:read-file", path),
  writeFile:    (path, content) => ipcRenderer.invoke("fs:write-file", path, content),
  mkdir:        (path) => ipcRenderer.invoke("fs:mkdir", path),
  delete:       (path) => ipcRenderer.invoke("fs:delete", path),
  rename:       (oldPath, newPath) => ipcRenderer.invoke("fs:rename", oldPath, newPath),
  openSystemTerminal: (cwd) => ipcRenderer.invoke("system:open-terminal", cwd),
  
  // Terminal
  terminalRun:  (payload) => ipcRenderer.send("terminal:run", payload),
  terminalKill: (id) => ipcRenderer.send("terminal:kill", id),
  onTerminalOutput: (id, cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on(`terminal:output:${id}`, handler);
    return () => ipcRenderer.removeListener(`terminal:output:${id}`, handler);
  },
  onTerminalExit: (id, cb) => {
    const handler = (_event, code) => cb(code);
    ipcRenderer.on(`terminal:exit:${id}`, handler);
    return () => ipcRenderer.removeListener(`terminal:exit:${id}`, handler);
  },
  onTerminalReady: (id, cb) => {
    const handler = () => cb();
    ipcRenderer.on(`terminal:ready:${id}`, handler);
    return () => ipcRenderer.removeListener(`terminal:ready:${id}`, handler);
  },
});
