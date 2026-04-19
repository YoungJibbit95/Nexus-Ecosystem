'use strict';
const { dialog, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const MAX_READ_BYTES = 5 * 1024 * 1024;
const MAX_WRITE_BYTES = 2 * 1024 * 1024;
const MAX_EXEC_CODE_BYTES = 800 * 1024;
const MAX_EXEC_OUTPUT_CHARS = 280_000;
const EXEC_TIMEOUT_MS = Number(process.env.NEXUS_CODE_EXEC_TIMEOUT_MS || 12_000);

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

const EXEC_EXT_BY_LANG = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  bash: 'sh',
};

const sanitizeFileName = (value, fallback) => {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  const safe = path
    .basename(value)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+/, '')
    .slice(0, 80);
  if (!safe) return fallback;
  return safe;
};

const resolveExecutionAttempts = (lang, filePath) => {
  const nodeMajor = Number(String(process.versions?.node || '').split('.')[0] || 0);
  const supportsStripTypes = Number.isFinite(nodeMajor) && nodeMajor >= 22;
  switch (lang) {
    case 'javascript':
      return [
        { runtime: 'node', binary: process.execPath, args: [filePath] },
      ];
    case 'typescript':
      return [
        { runtime: 'tsx', binary: 'tsx', args: [filePath] },
        ...(supportsStripTypes
          ? [{ runtime: 'node-strip-types', binary: process.execPath, args: ['--experimental-strip-types', filePath] }]
          : []),
        { runtime: 'node', binary: process.execPath, args: [filePath] },
      ];
    case 'python':
      return [
        { runtime: 'python3', binary: 'python3', args: [filePath] },
        { runtime: 'python', binary: 'python', args: [filePath] },
      ];
    case 'bash':
      return [
        { runtime: 'bash', binary: 'bash', args: [filePath] },
      ];
    default:
      return [];
  }
};

const runExecutionAttempt = (attempt) =>
  new Promise((resolve) => {
    let timedOut = false;
    let output = '';
    let truncated = false;
    let launchErrorCode = null;
    let settled = false;

    const append = (chunk) => {
      if (settled || !chunk) return;
      const text = typeof chunk === 'string' ? chunk : chunk.toString();
      if (!text) return;
      const remaining = MAX_EXEC_OUTPUT_CHARS - output.length;
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      if (text.length > remaining) {
        output += text.slice(0, remaining);
        truncated = true;
        return;
      }
      output += text;
    };

    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let proc;
    try {
      proc = spawn(attempt.binary, attempt.args, {
        cwd: os.homedir(),
        env: { ...process.env, FORCE_COLOR: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      done({
        ok: false,
        runtime: attempt.runtime,
        exitCode: 1,
        output: '',
        error: error?.message || 'Failed to spawn process',
        launchErrorCode: error?.code || null,
        timedOut: false,
      });
      return;
    }

    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill('SIGTERM');
      } catch {}
      setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
      }, 900);
    }, EXEC_TIMEOUT_MS);

    proc.stdout?.on('data', append);
    proc.stderr?.on('data', append);
    proc.on('error', (error) => {
      launchErrorCode = error?.code || null;
      clearTimeout(timeout);
      done({
        ok: false,
        runtime: attempt.runtime,
        exitCode: 1,
        output,
        error: error?.message || 'Process error',
        launchErrorCode,
        timedOut: false,
      });
    });
    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (truncated) {
        output += '\n\n… output truncated …';
      }
      const exitCode = typeof code === 'number' ? code : timedOut ? 124 : 1;
      done({
        ok: !timedOut && exitCode === 0,
        runtime: attempt.runtime,
        exitCode,
        output,
        error: timedOut ? `Execution timed out after ${Math.round(EXEC_TIMEOUT_MS / 1000)}s` : null,
        launchErrorCode,
        timedOut,
      });
    });
  });

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

function registerCodeExecutionHandler() {
  ipcMain.handle('code:execute', async (_, payload) => {
    const lang = String(payload?.lang || '').trim().toLowerCase();
    const code = typeof payload?.code === 'string' ? payload.code : '';
    const fileName = typeof payload?.fileName === 'string' ? payload.fileName : '';

    if (!lang) {
      return { ok: false, output: '', error: 'missing language' };
    }
    if (!code) {
      return { ok: false, output: '', error: 'missing code content' };
    }
    const codeBytes = Buffer.byteLength(code, 'utf8');
    if (codeBytes > MAX_EXEC_CODE_BYTES) {
      return {
        ok: false,
        output: '',
        error: `code payload too large (${codeBytes} bytes)`,
      };
    }

    const ext = EXEC_EXT_BY_LANG[lang];
    if (!ext) {
      return {
        ok: false,
        output: '',
        unsupported: true,
        error: `runtime for "${lang}" is not available`,
      };
    }

    let tempDir = null;
    try {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-code-run-'));
      const safeBase = sanitizeFileName(fileName, `snippet-${Date.now()}.${ext}`);
      const finalName = safeBase.includes('.') ? safeBase : `${safeBase}.${ext}`;
      const filePath = path.join(tempDir, finalName);
      fs.writeFileSync(filePath, code, 'utf8');

      const attempts = resolveExecutionAttempts(lang, filePath);
      if (!attempts.length) {
        return {
          ok: false,
          output: '',
          unsupported: true,
          error: `runtime for "${lang}" is not configured`,
        };
      }

      let lastError = null;
      for (const attempt of attempts) {
        const result = await runExecutionAttempt(attempt);
        if (result.launchErrorCode === 'ENOENT') {
          lastError = `runtime "${attempt.runtime}" not installed`;
          continue;
        }
        return {
          ok: result.ok,
          output: result.output || '',
          error: result.error || undefined,
          exitCode: result.exitCode,
          runtime: result.runtime,
          timeout: result.timedOut,
        };
      }

      return {
        ok: false,
        output: '',
        unsupported: true,
        error: lastError || `no installed runtime found for "${lang}"`,
      };
    } catch (error) {
      return {
        ok: false,
        output: '',
        error: error?.message || 'code execution failed',
      };
    } finally {
      if (tempDir) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {}
      }
    }
  });
}

function registerIpcHandlers(getMainWindow) {
  registerWindowHandlers(getMainWindow);
  registerFileHandlers(getMainWindow);
  registerNotificationHandler();
  registerCodeExecutionHandler();
}

module.exports = { registerIpcHandlers };
