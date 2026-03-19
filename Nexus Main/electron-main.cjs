'use strict';
const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./electron/main-window.cjs');
const { registerIpcHandlers } = require('./electron/ipc-handlers.cjs');

let mainWindow = null;

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
