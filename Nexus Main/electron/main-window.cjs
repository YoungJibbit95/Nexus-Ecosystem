'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('path');

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
      webSecurity: !isDev,
      sandbox: !isDev,
      devTools: isDev,
      allowRunningInsecureContent: isDev,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    if (typeof onClosed === 'function') onClosed();
  });

  return win;
}

module.exports = { createMainWindow };
