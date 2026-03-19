'use strict';
const { ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

function registerWindowHandlers(getMainWindow) {
  ipcMain.handle('window:minimize', () => getMainWindow()?.minimize());
  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle('window:close', () => getMainWindow()?.close());
}

function registerFileHandlers() {
  ipcMain.handle('fs:read', async (_, filePath) => {
    try {
      return { ok: true, data: fs.readFileSync(filePath, 'utf-8') };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('fs:write', async (_, filePath, content) => {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

function registerNotificationHandler() {
  ipcMain.handle('notify', (_, title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}

function registerIpcHandlers(getMainWindow) {
  registerWindowHandlers(getMainWindow);
  registerFileHandlers();
  registerNotificationHandler();
}

module.exports = { registerIpcHandlers };

