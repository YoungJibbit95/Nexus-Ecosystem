'use strict';
const { app, BrowserWindow } = require('electron');
const { execSync } = require('child_process');
const { createMainWindow } = require('./electron/main-window.cjs');
const { registerIpcHandlers } = require('./electron/ipc-handlers.cjs');

let mainWindow = null;
const shouldEnableGpuSwitches = process.env.NEXUS_FORCE_GPU_SWITCHES === '1';

const isRosettaTranslated = () => {
  if (process.platform !== 'darwin') return false;
  if (process.arch !== 'x64') return false;
  try {
    const value = execSync('/usr/sbin/sysctl -in sysctl.proc_translated', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return value === '1';
  } catch {
    return false;
  }
};

if (shouldEnableGpuSwitches) {
  // Keep GPU overrides opt-in only to avoid build-only driver regressions.
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
}

if (isRosettaTranslated()) {
  console.warn(
    '[Nexus Main] running under Rosetta translation (x64 on Apple Silicon). ' +
      'Use the arm64 build for production performance.',
  );
}

function bootMainWindow() {
  mainWindow = createMainWindow(() => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
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

  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return;
    }
    if (app.isReady()) {
      bootMainWindow();
    }
  });
}
