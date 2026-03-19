const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { spawn } = require("child_process");
const os = require("os");

const DEV = process.env.ELECTRON_DEV === "true";
const DEV_URL = "http://localhost:5173";

let mainWindow = null;

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
      sandbox: false,
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
    shell.openExternal(url);
    return { action: "deny" };
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

// ── IPC: Terminal (Real Shell) ─────────────────────────────────────────────

const activeProcesses = new Map();

ipcMain.on("terminal:run", (event, { id, command, cwd }) => {
  try {
    // Use the system shell directly for maximum compatibility
    const proc = spawn(command, [], {
      cwd: cwd || os.homedir(),
      env: { ...process.env, FORCE_COLOR: "1" },
      shell: true
    });

    activeProcesses.set(id, proc);

    proc.stdout.on("data", (data) => {
      event.sender.send(`terminal:output:${id}`, { type: "output", text: data.toString() });
    });

    proc.stderr.on("data", (data) => {
      event.sender.send(`terminal:output:${id}`, { type: "error", text: data.toString() });
    });

    proc.on("close", (code) => {
      event.sender.send(`terminal:output:${id}`, { type: "system", text: `\nProcess exited with code ${code}` });
      event.sender.send(`terminal:exit:${id}`, code);
      activeProcesses.delete(id);
    });

    event.sender.send(`terminal:ready:${id}`);
  } catch (error) {
    event.sender.send(`terminal:output:${id}`, { type: "error", text: `Failed to start: ${error.message}` });
  }
});

ipcMain.on("terminal:kill", (event, id) => {
  const proc = activeProcesses.get(id);
  if (proc) {
    proc.kill();
    activeProcesses.delete(id);
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
