const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { spawn } = require("child_process");
const os = require("os");

const DEV = process.env.ELECTRON_DEV === "true";
const DEV_URL = "http://localhost:5175";
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
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  // Remove default application menu
  Menu.setApplicationMenu(null);

  if (DEV) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Show window once ready to avoid white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
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
      stdio: ["ignore", "pipe", "pipe"],
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
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
