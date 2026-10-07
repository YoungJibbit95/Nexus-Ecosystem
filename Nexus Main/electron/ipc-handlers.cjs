'use strict';
const { dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const MAX_READ_BYTES = 5 * 1024 * 1024;
const MAX_WRITE_BYTES = 2 * 1024 * 1024;
const resolveAllowedRoots = () => {
  const envValue = process.env.NEXUS_ALLOWED_FS_ROOTS;
  const roots = envValue
    ? envValue.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean)
    : [];

  return roots.map((root) => path.resolve(root));
};

const canonicalizeExistingPath = (targetPath) => {
  const realpath = fs.realpathSync.native || fs.realpathSync;
  return realpath(targetPath);
};

const ALLOWED_ROOTS = resolveAllowedRoots().map((rootPath) => {
  try {
    const canonical = canonicalizeExistingPath(rootPath);
    return fs.statSync(canonical).isDirectory() ? canonical : null;
  } catch {
    return null;
  }
}).filter(Boolean);

const accessRequired = () => ({
  ok: false,
  code: 'WORKSPACE_ACCESS_REQUIRED',
  error: 'Bitte den Workspace-Ordner in dieser Sitzung erneut auswaehlen.',
});

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

const resolvePathForAuthorization = (targetPath, allowMissing = false) => {
  if (!allowMissing || fs.existsSync(targetPath)) {
    return canonicalizeExistingPath(targetPath);
  }

  const missingSegments = [];
  let existingAncestor = targetPath;
  while (!fs.existsSync(existingAncestor)) {
    // existsSync follows links: a dangling link is not an ordinary missing path.
    try {
      if (fs.lstatSync(existingAncestor).isSymbolicLink()) throw new Error('dangling symbolic link is not allowed');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) {
      throw new Error('path has no existing ancestor');
    }
    missingSegments.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }

  return path.resolve(canonicalizeExistingPath(existingAncestor), ...missingSegments);
};

const isPathAllowed = (targetPath) => ALLOWED_ROOTS.some((rootPath) => isWithinRoot(targetPath, rootPath));

const assertAllowedPath = (inputPath, options = {}) => {
  const normalized = normalizePathInput(inputPath);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }
  if (ALLOWED_ROOTS.length === 0) return accessRequired();

  let authorizedPath;
  try {
    authorizedPath = resolvePathForAuthorization(normalized.value, options.allowMissing === true);
  } catch (error) {
    return { ok: false, error: error?.message || 'path cannot be resolved safely' };
  }

  if (!isPathAllowed(authorizedPath)) {
    return accessRequired();
  }

  return { ok: true, value: authorizedPath };
};

const assertTrustedSender = (event, getMainWindow) => {
  const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
  if (!win || win.isDestroyed?.() || win.webContents?.isDestroyed?.() || event?.sender !== win.webContents) {
    throw new Error('untrusted IPC sender');
  }
  if (!event.senderFrame || !win.webContents.mainFrame || event.senderFrame !== win.webContents.mainFrame) {
    throw new Error('IPC is restricted to the main renderer frame');
  }
  return win;
};

const registerTrustedHandler = (channel, getMainWindow, handler) => {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event, getMainWindow);
    return handler(event, ...args);
  });
};

function registerWindowHandlers(getMainWindow) {
  registerTrustedHandler('window:minimize', getMainWindow, () => getMainWindow()?.minimize());
  registerTrustedHandler('window:maximize', getMainWindow, () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  registerTrustedHandler('window:close', getMainWindow, () => getMainWindow()?.close());
}

function registerFileHandlers(getMainWindow) {
  registerTrustedHandler('fs:pickDirectory', getMainWindow, async (event) => {
    try {
      const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
      const result = await dialog.showOpenDialog(win || undefined, {
        title: 'Nexus Workspace Ordner auswählen',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || !result.filePaths?.length) {
        return { ok: false, canceled: true };
      }

      // The native selection, never a renderer-provided path, grants authority.
      if (assertTrustedSender(event, getMainWindow) !== win) return accessRequired();
      const selected = normalizePathInput(result.filePaths[0]);
      if (!selected.ok) return selected;
      const canonical = canonicalizeExistingPath(selected.value);
      if (!fs.statSync(canonical).isDirectory()) return { ok: false, error: 'Selected root is not a directory' };
      if (!ALLOWED_ROOTS.includes(canonical)) ALLOWED_ROOTS.push(canonical);
      return { ok: true, path: canonical };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  registerTrustedHandler('fs:read', getMainWindow, async (_, filePath) => {
    try {
      const check = assertAllowedPath(filePath);
      if (!check.ok) {
        return check;
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
      return { ok: false, error: e.message, code: typeof e.code === 'string' ? e.code : undefined };
    }
  });

  registerTrustedHandler('fs:readDir', getMainWindow, async (_, dirPath, recursive = true) => {
    try {
      const check = assertAllowedPath(dirPath);
      if (!check.ok) {
        return check;
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
          if (entry.isSymbolicLink()) continue;
          const absPath = path.resolve(currentDir, entry.name);
          const authorizedEntry = assertAllowedPath(absPath);
          if (!authorizedEntry.ok) continue;
          const entryStats = fs.statSync(authorizedEntry.value);
          entries.push({
            path: authorizedEntry.value,
            isDirectory: entry.isDirectory(),
            size: entryStats.size || 0,
            mtimeMs: entryStats.mtimeMs || 0,
          });
          if (entries.length >= maxEntries) {
            return { ok: true, entries };
          }
          if (recursive && entry.isDirectory()) {
            stack.push(authorizedEntry.value);
          }
        }
      }

      return { ok: true, entries };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  registerTrustedHandler('fs:write', getMainWindow, async (_, filePath, content) => {
    try {
      const check = assertAllowedPath(filePath, { allowMissing: true });
      if (!check.ok) {
        return check;
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

function registerNotificationHandler(getMainWindow) {
  registerTrustedHandler('notify', getMainWindow, (_, title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}

function registerIpcHandlers(getMainWindow) {
  registerWindowHandlers(getMainWindow);
  registerFileHandlers(getMainWindow);
  registerNotificationHandler(getMainWindow);
}

module.exports = {
  registerIpcHandlers,
  assertAllowedPath,
  assertTrustedSender,
  resolvePathForAuthorization,
};
