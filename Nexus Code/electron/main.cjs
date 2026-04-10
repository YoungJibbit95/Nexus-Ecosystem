const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { spawn, execSync } = require("child_process");
const os = require("os");

const DEV = process.env.ELECTRON_DEV === "true";
const DEV_URL = "http://localhost:5175";
const WINDOW_SHOW_FALLBACK_MS = 4_500;
const NETWORK_MUTATION_PATTERNS = [
  /\bnetworksetup\b/i,
  /\bscutil\b/i,
  /\bnetsh\b/i,
  /\bpfctl\b/i,
  /\biptables\b/i,
  /\bufw\b/i,
  /\bfirewall-cmd\b/i,
  /\bSet-Net(Firewall|IP|Connection|DnsClient|Proxy)\b/i,
  /\broute\b.+\b(add|delete|change)\b/i,
  /\bifconfig\b.+\b(up|down|alias|-alias)\b/i,
  /\/etc\/hosts\b/i,
  /\/etc\/resolv\.conf\b/i,
  /\bgsettings\b.+\bproxy\b/i,
];

let mainWindow = null;
const activeProcesses = new Map();

const buildRendererFailureHtml = (reason, details) => {
  const safeReason = String(reason || "RENDERER_LOAD_FAILED")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeDetails = String(details || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `data:text/html;charset=utf-8,<!doctype html><html><head><meta charset="utf-8"/><title>Nexus Code Start Error</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(135deg,#15090a,#0d1320);color:#ffe2df;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}section{max-width:780px;border:1px solid rgba(255,69,58,.42);background:rgba(255,69,58,.14);border-radius:14px;padding:18px;line-height:1.5}h1{margin:0 0 8px;font-size:20px}code{display:block;margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.15);white-space:pre-wrap;word-break:break-word}</style></head><body><section><h1>Nexus Code konnte nicht geladen werden</h1><div>Die Renderer-Oberflaeche ist beim Start fehlgeschlagen. Bitte sende den Fehlercode an den Ecosystem Manager.</div><code>${safeReason}${safeDetails ? `\\n${safeDetails}` : ""}</code></section></body></html>`;
};

const shouldEnableGpuSwitches = process.env.NEXUS_FORCE_GPU_SWITCHES === "1";

const isRosettaTranslated = () => {
  if (process.platform !== "darwin") return false;
  if (process.arch !== "x64") return false;
  try {
    const value = execSync("/usr/sbin/sysctl -in sysctl.proc_translated", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return value === "1";
  } catch {
    return false;
  }
};

if (shouldEnableGpuSwitches) {
  // Keep GPU overrides opt-in only to avoid build-only driver regressions.
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");
  app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
}

if (isRosettaTranslated()) {
  console.warn(
    "[Nexus Code] running under Rosetta translation (x64 on Apple Silicon). " +
      "Use the arm64 build for production performance.",
  );
}

const isAllowedNavigation = (url) => {
  if (!url || typeof url !== "string") return false;
  if (DEV) {
    return url.startsWith(`${DEV_URL}/`) || url === DEV_URL;
  }
  return url.startsWith("file://");
};

const isExternalHttpUrl = (url) => /^https?:\/\//i.test(String(url || ""));

const resolveShellLaunch = (command) => {
  if (process.platform === "win32") {
    return {
      binary: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", command],
    };
  }

  return {
    binary: process.env.SHELL || "/bin/bash",
    args: ["-lc", command],
  };
};

const isBlockedNetworkMutationCommand = (command) => {
  const raw = String(command || "").trim();
  if (!raw) return false;
  return NETWORK_MUTATION_PATTERNS.some((pattern) => pattern.test(raw));
};

const terminateActiveProcesses = () => {
  for (const [id, proc] of activeProcesses.entries()) {
    try {
      proc.kill("SIGTERM");
    } catch {}
    activeProcesses.delete(id);
  }
};

const resolveTerminalWorkingDirectory = async (candidatePath) => {
  if (!candidatePath || typeof candidatePath !== "string") return os.homedir();
  try {
    const stats = await fs.stat(candidatePath);
    if (stats.isDirectory()) return candidatePath;
    return path.dirname(candidatePath);
  } catch {
    return os.homedir();
  }
};

const openSystemTerminal = async (candidatePath) => {
  const cwd = await resolveTerminalWorkingDirectory(candidatePath);
  if (process.platform === "darwin") {
    const proc = spawn("open", ["-a", "Terminal", cwd], {
      detached: true,
      stdio: "ignore",
    });
    proc.unref();
    return true;
  }

  if (process.platform === "win32") {
    const proc = spawn("cmd.exe", ["/c", "start", "", "cmd.exe", "/K", `cd /d "${cwd}"`], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    proc.unref();
    return true;
  }

  try {
    const proc = spawn(process.env.TERMINAL || "x-terminal-emulator", ["--working-directory", cwd], {
      detached: true,
      stdio: "ignore",
    });
    proc.unref();
    return true;
  } catch {
    await shell.openPath(cwd);
    return false;
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: "#060614",
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  // Remove default application menu
  Menu.setApplicationMenu(null);

  let windowShown = false;
  let rendererFailed = false;
  const revealWindow = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed() || windowShown) return;
    windowShown = true;
    try {
      mainWindow.show();
    } catch {}
    console.info("[Nexus Code] window shown:", reason);
  };
  const fallbackShowTimer = setTimeout(() => {
    revealWindow("fallback-timeout");
  }, WINDOW_SHOW_FALLBACK_MS);

  const reportRendererFailure = (reason, details) => {
    rendererFailed = true;
    console.error("[Nexus Code] renderer failed:", reason, details || "");
    if (!mainWindow || mainWindow.isDestroyed()) return;
    revealWindow("renderer-failure");
    if (!DEV) {
      mainWindow
        .loadURL(buildRendererFailureHtml(reason, details))
        .catch(() => {});
    }
  };

  if (DEV) {
    mainWindow.loadURL(DEV_URL).catch((error) => {
      reportRendererFailure("DEV_URL_LOAD_FAILED", error?.message || String(error));
    });
  } else {
    mainWindow
      .loadFile(path.join(__dirname, "../dist/index.html"))
      .catch((error) => {
        reportRendererFailure("DIST_INDEX_LOAD_FAILED", error?.message || String(error));
      });
  }

  // Show window once ready to avoid white flash
  mainWindow.once("ready-to-show", () => {
    revealWindow("ready-to-show");
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;
      reportRendererFailure(
        "DID_FAIL_LOAD",
        `code=${errorCode} desc=${errorDescription} url=${validatedURL}`,
      );
    },
  );
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    reportRendererFailure(
      "RENDER_PROCESS_GONE",
      details ? JSON.stringify(details) : "no-details",
    );
  });
  mainWindow.webContents.on("did-finish-load", () => {
    if (!rendererFailed) {
      revealWindow("did-finish-load");
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalHttpUrl(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    clearTimeout(fallbackShowTimer);
    mainWindow = null;
  });

  // Emit maximize/unmaximize events to renderer
  mainWindow.on("maximize",   () => mainWindow?.webContents.send("window:maximized",   true));
  mainWindow.on("unmaximize", () => mainWindow?.webContents.send("window:maximized",   false));
  mainWindow.on("enter-full-screen", () => mainWindow?.webContents.send("window:fullscreen", true));
  mainWindow.on("leave-full-screen", () => mainWindow?.webContents.send("window:fullscreen", false));
}

// ── IPC: window controls ───────────────────────────────────────────────────

ipcMain.on("window:minimize",  () => mainWindow?.minimize());
ipcMain.on("window:maximize",  () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on("window:close",     () => mainWindow?.close());

ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

// ── IPC: File System ───────────────────────────────────────────────────────

ipcMain.handle("dialog:open-folder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("fs:read-directory", async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );
    return files;
  } catch (error) {
    console.error("FS Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:read-file", async (event, filePath) => {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    console.error("FS Read Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:write-file", async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return true;
  } catch (error) {
    console.error("FS Write Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:mkdir", async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error("FS Mkdir Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:delete", async (event, targetPath) => {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error("FS Delete Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:rename", async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return true;
  } catch (error) {
    console.error("FS Rename Error:", error);
    throw error;
  }
});

ipcMain.handle("system:open-terminal", async (_event, cwd) => {
  try {
    const opened = await openSystemTerminal(cwd);
    return { ok: true, opened };
  } catch (error) {
    return { ok: false, error: error?.message || "Unknown terminal launch error" };
  }
});

// ── IPC: Terminal (Real Shell) ─────────────────────────────────────────────

ipcMain.on("terminal:run", (event, { id, command, cwd }) => {
  try {
    const normalized = String(command || "").trim();

    if (!normalized) {
      event.sender.send(`terminal:output:${id}`, {
        type: "error",
        text: "Kein Befehl uebergeben.",
      });
      event.sender.send(`terminal:exit:${id}`, 1);
      return;
    }

    if (isBlockedNetworkMutationCommand(normalized)) {
      event.sender.send(`terminal:output:${id}`, {
        type: "error",
        text: "Blocked: network/system configuration commands are disabled in this app.",
      });
      event.sender.send(`terminal:exit:${id}`, 126);
      return;
    }

    const running = activeProcesses.get(id);
    if (running && !running.killed) {
      try {
        running.kill("SIGTERM");
      } catch {}
      activeProcesses.delete(id);
    }

    const shellLaunch = resolveShellLaunch(normalized);
    const proc = spawn(shellLaunch.binary, shellLaunch.args, {
      cwd: cwd || os.homedir(),
      env: { ...process.env, FORCE_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    activeProcesses.set(id, proc);
    event.sender.send(`terminal:ready:${id}`);

    proc.stdout.on("data", (data) => {
      event.sender.send(`terminal:output:${id}`, { type: "output", text: data.toString() });
    });

    proc.stderr.on("data", (data) => {
      event.sender.send(`terminal:output:${id}`, { type: "error", text: data.toString() });
    });

    proc.on("error", (error) => {
      event.sender.send(`terminal:output:${id}`, { type: "error", text: `Failed to start: ${error.message}` });
      event.sender.send(`terminal:exit:${id}`, 1);
      activeProcesses.delete(id);
    });

    proc.on("close", (code) => {
      const exitCode = typeof code === "number" ? code : 1;
      event.sender.send(`terminal:output:${id}`, { type: "system", text: `\nProcess exited with code ${exitCode}` });
      event.sender.send(`terminal:exit:${id}`, exitCode);
      activeProcesses.delete(id);
    });
  } catch (error) {
    event.sender.send(`terminal:output:${id}`, { type: "error", text: `Failed to start: ${error.message}` });
    event.sender.send(`terminal:exit:${id}`, 1);
  }
});

ipcMain.on("terminal:kill", (event, id) => {
  const proc = activeProcesses.get(id);
  if (proc) {
    try {
      proc.kill("SIGTERM");
    } catch {}

    setTimeout(() => {
      if (!proc.killed) {
        try {
          proc.kill("SIGKILL");
        } catch {}
      }
    }, 1200);
  }
});

ipcMain.on("terminal:input", (_event, payload) => {
  const id = payload?.id;
  const input = payload?.input;
  if (typeof id !== "number") return;
  const proc = activeProcesses.get(id);
  if (!proc || proc.killed) return;
  try {
    const text = String(input ?? "");
    if (text.length === 0) return;
    proc.stdin?.write(text);
  } catch {}
});

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  terminateActiveProcesses();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return;
    }
    if (app.isReady()) {
      createWindow();
    }
  });
}
