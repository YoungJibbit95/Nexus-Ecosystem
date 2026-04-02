'use strict';
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DEV_URL = 'http://localhost:5173';

const isAllowedNavigation = (url, isDev) => {
  if (!url || typeof url !== 'string') return false;
  if (isDev) {
    return url.startsWith(`${DEV_URL}/`) || url === DEV_URL;
  }
  return url.startsWith('file://');
};

function createMainWindow(onClosed) {
  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
  const hasDistIndex = fs.existsSync(distIndexPath);
  const forceDev = process.argv.includes('--dev') || process.env.ELECTRON_DEV === 'true';
  const isDev = forceDev || (!app.isPackaged && !hasDistIndex);
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
    win.loadURL(DEV_URL).catch(() => {
      if (hasDistIndex) {
        void win.loadFile(distIndexPath);
      }
    });
  } else {
    win.loadFile(distIndexPath);
  }

  win.webContents.on('did-fail-load', (_event, _errorCode, _errorDescription, validatedURL) => {
    if (!isDev) return;
    if (!hasDistIndex) return;
    if (typeof validatedURL !== 'string' || !validatedURL.startsWith(DEV_URL)) return;
    if (win.webContents.isLoadingMainFrame()) return;
    void win.loadFile(distIndexPath);
  });

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
