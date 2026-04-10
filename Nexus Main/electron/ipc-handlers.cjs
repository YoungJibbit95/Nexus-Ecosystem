'use strict';
const { dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const MAX_READ_BYTES = 5 * 1024 * 1024;
const MAX_WRITE_BYTES = 2 * 1024 * 1024;

const resolveAllowedRoots = () => {
  const envValue = process.env.NEXUS_ALLOWED_FS_ROOTS;
  const roots = envValue
    ? envValue.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean)
    : [os.homedir()];

  return roots.map((root) => path.resolve(root));
};

const ALLOWED_ROOTS = resolveAllowedRoots();

const normalizePathInput = (value) => {
  if (typeof value !== 'string') {
    return { ok: false, error: 'invalid path type' };
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, error: 'invalid path value' };
  }

  return { ok: true, value: path.resolve(trimmed) };
};

const isWithinRoot = (targetPath, rootPath) => {
  const relative = path.relative(rootPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const isPathAllowed = (targetPath) => ALLOWED_ROOTS.some((rootPath) => isWithinRoot(targetPath, rootPath));

const assertAllowedPath = (inputPath) => {
  const normalized = normalizePathInput(inputPath);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  if (!isPathAllowed(normalized.value)) {
    return {
      ok: false,
      error: `path not allowed; configure NEXUS_ALLOWED_FS_ROOTS (${ALLOWED_ROOTS.join(', ')})`,
    };
  }

  return { ok: true, value: normalized.value };
};

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

function registerFileHandlers(getMainWindow) {
  ipcMain.handle('fs:pickDirectory', async () => {
    try {
      const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
      const result = await dialog.showOpenDialog(win || undefined, {
        title: 'Nexus Workspace Ordner auswählen',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || !result.filePaths?.length) {
        return { ok: false, canceled: true };
      }

      const selectedPath = path.resolve(result.filePaths[0]);
      if (!isPathAllowed(selectedPath)) {
        return {
          ok: false,
          error: `path not allowed; configure NEXUS_ALLOWED_FS_ROOTS (${ALLOWED_ROOTS.join(', ')})`,
        };
      }

      return { ok: true, path: selectedPath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('fs:read', async (_, filePath) => {
    try {
      const check = assertAllowedPath(filePath);
      if (!check.ok) {
        return { ok: false, error: check.error };
      }

      const stats = fs.statSync(check.value);
      if (!stats.isFile()) {
        return { ok: false, error: 'path is not a file' };
      }
      if (stats.size > MAX_READ_BYTES) {
        return { ok: false, error: `file too large (${stats.size} bytes)` };
      }

      return { ok: true, data: fs.readFileSync(check.value, 'utf-8') };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('fs:readDir', async (_, dirPath, recursive = true) => {
    try {
      const check = assertAllowedPath(dirPath);
      if (!check.ok) {
        return { ok: false, error: check.error };
      }

      const stats = fs.statSync(check.value);
      if (!stats.isDirectory()) {
        return { ok: false, error: 'path is not a directory' };
      }

      const entries = [];
      const stack = [check.value];
      const maxEntries = 2_500;

      while (stack.length > 0) {
        const currentDir = stack.pop();
        const dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of dirEntries) {
          const absPath = path.resolve(currentDir, entry.name);
          if (!isPathAllowed(absPath)) continue;
          const entryStats = fs.statSync(absPath);
          entries.push({
            path: absPath,
            isDirectory: entry.isDirectory(),
            size: entryStats.size || 0,
            mtimeMs: entryStats.mtimeMs || 0,
          });
          if (entries.length >= maxEntries) {
            return { ok: true, entries };
          }
          if (recursive && entry.isDirectory()) {
            stack.push(absPath);
          }
        }
      }

      return { ok: true, entries };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('fs:write', async (_, filePath, content) => {
    try {
      const check = assertAllowedPath(filePath);
      if (!check.ok) {
        return { ok: false, error: check.error };
      }

      if (typeof content !== 'string') {
        return { ok: false, error: 'content must be a string' };
      }

      const payloadSize = Buffer.byteLength(content, 'utf8');
      if (payloadSize > MAX_WRITE_BYTES) {
        return { ok: false, error: `content too large (${payloadSize} bytes)` };
      }

      fs.mkdirSync(path.dirname(check.value), { recursive: true });
      fs.writeFileSync(check.value, content, 'utf-8');
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
  registerFileHandlers(getMainWindow);
  registerNotificationHandler();
}

module.exports = { registerIpcHandlers };
