'use strict';
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const DEV_URL = 'http://localhost:5173';

const isAllowedNavigation = (url, isDev) => {
  if (!url || typeof url !== 'string') return false;
  if (isDev) {
    return url.startsWith(`${DEV_URL}/`) || url === DEV_URL;
  }
  return url.startsWith('file://');
};

function createMainWindow(onClosed) {
  const isDev = !app.isPackaged;
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      devTools: isDev,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url && /^https?:\/\//i.test(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, isDev)) {
      event.preventDefault();
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    if (typeof onClosed === 'function') onClosed();
  });

  return win;
}

module.exports = { createMainWindow };
