'use strict';
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DEV_URL = 'http://localhost:5173';
const WINDOW_SHOW_FALLBACK_MS = 4_500;
const RENDERER_BOOT_CHECK_MS = 2_800;

const isAllowedNavigation = (url, isDev) => {
  if (!url || typeof url !== 'string') return false;
  if (isDev) {
    return url.startsWith(`${DEV_URL}/`) || url === DEV_URL;
  }
  return url.startsWith('file://');
};

const buildRendererFailureHtml = (reason, details) => {
  const safeReason = String(reason || 'RENDERER_LOAD_FAILED')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDetails = String(details || '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `data:text/html;charset=utf-8,<!doctype html><html><head><meta charset="utf-8"/><title>Nexus Main Start Error</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(135deg,#17090b,#0d1320);color:#ffe2df;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}section{max-width:780px;border:1px solid rgba(255,69,58,.42);background:rgba(255,69,58,.14);border-radius:14px;padding:18px;line-height:1.5}h1{margin:0 0 8px;font-size:20px}code{display:block;margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.15);white-space:pre-wrap;word-break:break-word}</style></head><body><section><h1>Nexus Main konnte nicht geladen werden</h1><div>Die Renderer-Oberflaeche ist beim Start fehlgeschlagen. Bitte sende den Fehlercode an den Ecosystem Manager.</div><code>${safeReason}${safeDetails ? `\\n${safeDetails}` : ''}</code></section></body></html>`;
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
      backgroundThrottling: false,
      devTools: isDev,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  let windowShown = false;
  let rendererFailed = false;
  let rendererBootTimer = null;
  let emptyRendererReloaded = false;
  const revealWindow = (reason) => {
    if (win.isDestroyed() || windowShown) return;
    windowShown = true;
    try {
      win.show();
    } catch {}
    console.info('[Nexus Main] window shown:', reason);
  };
  const fallbackShowTimer = setTimeout(() => {
    revealWindow('fallback-timeout');
  }, WINDOW_SHOW_FALLBACK_MS);

  const reportRendererFailure = (reason, details) => {
    rendererFailed = true;
    if (rendererBootTimer) {
      clearTimeout(rendererBootTimer);
      rendererBootTimer = null;
    }
    console.error('[Nexus Main] renderer failed:', reason, details || '');
    revealWindow('renderer-failure');
    if (!isDev) {
      win.loadURL(buildRendererFailureHtml(reason, details)).catch(() => {});
    }
  };

  const scheduleRendererBootCheck = (reason) => {
    if (rendererBootTimer) clearTimeout(rendererBootTimer);
    rendererBootTimer = setTimeout(() => {
      rendererBootTimer = null;
      if (win.isDestroyed() || rendererFailed) return;
      win.webContents
        .executeJavaScript(
          `(() => {
            const root = document.getElementById('root');
            const booted = Boolean(
              root?.children?.length ||
              document.querySelector('.nx-app-shell, [data-nexus-boot-ready]')
            );
            return {
              booted,
              readyState: document.readyState,
              href: window.location.href,
              title: document.title,
              rootLength: root?.innerHTML?.length || 0,
              bodyText: (document.body?.innerText || '').slice(0, 220)
            };
          })()`,
          true,
        )
        .then((status) => {
          if (status?.booted) return;
          const details = `reason=${reason} status=${JSON.stringify(status || {})}`;
          if (!isDev && !emptyRendererReloaded) {
            emptyRendererReloaded = true;
            console.warn('[Nexus Main] renderer root empty; reloading once:', details);
            win.reload();
            return;
          }
          reportRendererFailure('RENDERER_BOOT_EMPTY', details);
        })
        .catch((error) => {
          reportRendererFailure(
            'RENDERER_BOOT_CHECK_FAILED',
            error?.message || String(error),
          );
        });
    }, RENDERER_BOOT_CHECK_MS);
  };

  if (isDev) {
    win.loadURL(DEV_URL).catch((error) => {
      if (hasDistIndex) {
        void win.loadFile(distIndexPath).catch((fallbackError) => {
          reportRendererFailure(
            'DEV_AND_DIST_LOAD_FAILED',
            `${error?.message || String(error)} | ${fallbackError?.message || String(fallbackError)}`,
          );
        });
        return;
      }
      reportRendererFailure('DEV_URL_LOAD_FAILED', error?.message || String(error));
    });
  } else {
    win.loadFile(distIndexPath).catch((error) => {
      reportRendererFailure('DIST_INDEX_LOAD_FAILED', error?.message || String(error));
    });
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;

    if (isDev && hasDistIndex) {
      const isDevMainUrl = typeof validatedURL === 'string'
        && (validatedURL === DEV_URL || validatedURL.startsWith(`${DEV_URL}/`));
      if (isDevMainUrl && !win.webContents.isLoadingMainFrame()) {
        void win.loadFile(distIndexPath).catch((error) => {
          reportRendererFailure('DEV_FALLBACK_DIST_LOAD_FAILED', error?.message || String(error));
        });
        return;
      }
    }

    reportRendererFailure(
      'DID_FAIL_LOAD',
      `code=${errorCode} desc=${errorDescription} url=${validatedURL}`,
    );
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    reportRendererFailure(
      'RENDER_PROCESS_GONE',
      details ? JSON.stringify(details) : 'no-details',
    );
  });
  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    reportRendererFailure(
      'PRELOAD_ERROR',
      `${preloadPath}: ${error?.message || String(error)}`,
    );
  });
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const prefix = `[Nexus Main renderer:${level}]`;
    const suffix = sourceId ? ` (${sourceId}:${line || 0})` : '';
    if (level >= 2) {
      console.error(prefix, `${message}${suffix}`);
      return;
    }
    console.log(prefix, `${message}${suffix}`);
  });
  win.webContents.on('did-finish-load', () => {
    if (!rendererFailed) {
      revealWindow('did-finish-load');
      scheduleRendererBootCheck('did-finish-load');
    }
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
    revealWindow('ready-to-show');
  });

  win.on('closed', () => {
    clearTimeout(fallbackShowTimer);
    if (rendererBootTimer) clearTimeout(rendererBootTimer);
    if (typeof onClosed === 'function') onClosed();
  });

  return win;
}

module.exports = { createMainWindow };
