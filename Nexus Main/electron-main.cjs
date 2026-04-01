'use strict';
const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./electron/main-window.cjs');
const { registerIpcHandlers } = require('./electron/ipc-handlers.cjs');

let mainWindow = null;
const isPackaged = app.isPackaged;

if (isPackaged) {
  // Packaged builds can fall back to slower software compositing on some Macs.
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
}

function bootMainWindow() {
  mainWindow = createMainWindow(() => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers(() => mainWindow);
  bootMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) bootMainWindow();
});
