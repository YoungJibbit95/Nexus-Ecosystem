const { app, BrowserWindow } = require("electron");
const { createMainWindow } = require("./electron/main-window.cjs");
const { applySecurityHeaders } = require("./electron/security.cjs");
const { registerIpcHandlers } = require("./electron/ipc-handlers.cjs");

let mainWindow: any = null;

function bootMainWindow() {
  mainWindow = createMainWindow(() => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  applySecurityHeaders({ isDev: !app.isPackaged });
  registerIpcHandlers(() => mainWindow);
  bootMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) bootMainWindow();
});
