const { app, BrowserWindow, ipcMain, shell, Menu, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { spawn, execSync } = require("child_process");
const { createGitService } = require("./services/gitService.cjs");
const { createSecureTokenStore } = require("./services/secureTokenStore.cjs");
const { createGithubAuthService } = require("./services/githubAuthService.cjs");
const { createGithubService } = require("./services/githubService.cjs");
const { createLspProcessService } = require("./services/lspProcessService.cjs");
const { redactSensitiveText } = require("./services/processRunner.cjs");

const DEV = process.env.ELECTRON_DEV === "true";
const DEV_URL = "http://localhost:5175";
const WINDOW_SHOW_FALLBACK_MS = 4_500;
const MAX_PATH_LENGTH = 4096;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_WRITE_BYTES = 20 * 1024 * 1024;
const MAX_TERMINAL_COMMAND_LENGTH = 8_000;
const MAX_TERMINAL_INPUT_LENGTH = 64_000;
const MAX_TERMINAL_SESSIONS = 8;
const PROTECTED_WORKSPACE_NAMES = new Set([".git", ".hg", ".svn"]);
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
const DANGEROUS_TERMINAL_PATTERNS = [
  /\brm\s+(-[^\s]*r[^\s]*f|-rf|-fr)\s+(\/|~|\$HOME)\b/i,
  /\bRemove-Item\b[\s\S]*\b-Recurse\b[\s\S]*\b-Force\b[\s\S]*(C:\\|\/|~|\$HOME)/i,
  /\bdel\s+\/[sqf]+\s+(C:\\|\\|\/)/i,
  /\brmdir\s+\/s\s+(C:\\|\\|\/)/i,
  /\bformat\b\s+[A-Z]:/i,
  /\bdiskpart\b/i,
  /\bbcdedit\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\.[a-z0-9]+\b/i,
  /\bdd\s+.*\bof=\/dev\/(sd|nvme|disk)/i,
];

let mainWindow = null;
const activeProcesses = new Map();
const allowedWorkspaceRoots = new Map();
const gitService = createGitService();
const tokenStore = createSecureTokenStore({
  getUserDataPath: () => app.getPath("userData"),
});
const githubAuthService = createGithubAuthService({ tokenStore });
const githubService = createGithubService({ tokenStore });
const lspProcessService = createLspProcessService({
  onNotification: (sessionId, payload) => {
    mainWindow?.webContents.send(`lsp:notification:${sessionId}`, payload);
  },
  onStatus: (sessionId, payload) => {
    mainWindow?.webContents.send(`lsp:status:${sessionId}`, payload);
  },
});

const buildRendererFailureHtml = (reason, details) => {
  const safeReason = String(reason || "RENDERER_LOAD_FAILED")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeDetails = String(details || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `data:text/html;charset=utf-8,<!doctype html><html><head><meta charset="utf-8"/><title>Nexus Code Start Error</title><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(135deg,#15090a,#0d1320);color:#ffe2df;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}section{max-width:780px;border:1px solid rgba(255,69,58,.42);background:rgba(255,69,58,.14);border-radius:14px;padding:18px;line-height:1.5}h1{margin:0 0 8px;font-size:20px}code{display:block;margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.15);white-space:pre-wrap;word-break:break-word}</style></head><body><section><h1>Nexus Code konnte nicht geladen werden</h1><div>Die Renderer-Oberflaeche ist beim Start fehlgeschlagen. Bitte sende den Fehlercode an den Ecosystem Manager.</div><code>${safeReason}${safeDetails ? `\\n${safeDetails}` : ""}</code></section></body></html>`;
};

const normalizePathKey = (value) => {
  const resolved = path.resolve(String(value || ""));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

const assertPathInput = (value, label = "path") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  if (value.length > MAX_PATH_LENGTH || value.includes("\0")) {
    throw new Error(`${label} is not allowed`);
  }

  return value;
};

const assertTerminalId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 0 || id > 1_000_000) {
    throw new Error("Invalid terminal session id");
  }
  return id;
};

const isPathInsideOrSame = (candidatePath, rootPath) => {
  const candidate = normalizePathKey(candidatePath);
  const root = normalizePathKey(rootPath);
  if (candidate === root) return true;
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  return candidate.startsWith(rootWithSeparator);
};

const listAllowedWorkspaceRoots = () => Array.from(allowedWorkspaceRoots.values());

const findAllowedRootForCanonicalPath = (canonicalPath) => (
  listAllowedWorkspaceRoots().find((root) => isPathInsideOrSame(canonicalPath, root)) || null
);

const registerWorkspaceRoot = async (dirPath) => {
  const candidate = path.resolve(assertPathInput(dirPath, "workspace root"));
  const realPath = await fs.realpath(candidate);
  const stats = await fs.stat(realPath);
  if (!stats.isDirectory()) {
    throw new Error("Selected workspace root is not a directory");
  }

  allowedWorkspaceRoots.set(normalizePathKey(realPath), realPath);
  return realPath;
};

const assertWorkspaceReady = () => {
  if (allowedWorkspaceRoots.size === 0) {
    throw new Error("Bitte zuerst einen Workspace-Ordner auswaehlen.");
  }
};

const resolveWorkspacePath = async (targetPath, options = {}) => {
  const { allowMissing = false, allowRoot = true, expected = "any" } = options;
  assertWorkspaceReady();

  const requested = path.resolve(assertPathInput(targetPath));
  let canonical = requested;

  try {
    canonical = await fs.realpath(requested);
  } catch (error) {
    if (!allowMissing) throw error;
    const parentPath = path.dirname(requested);
    const parentCanonical = await fs.realpath(parentPath);
    canonical = path.join(parentCanonical, path.basename(requested));
  }

  const root = findAllowedRootForCanonicalPath(canonical);
  if (!root) {
    throw new Error("Path outside selected workspace.");
  }

  if (!allowRoot && normalizePathKey(canonical) === normalizePathKey(root)) {
    throw new Error("Workspace root itself cannot be modified.");
  }

  const stats = allowMissing
    ? await fs.stat(canonical).catch(() => null)
    : await fs.stat(canonical);

  if (expected === "file" && (!stats || !stats.isFile())) {
    throw new Error("Expected a file inside the selected workspace.");
  }

  if (expected === "directory" && (!stats || !stats.isDirectory())) {
    throw new Error("Expected a directory inside the selected workspace.");
  }

  return { requested, canonical, root, stats };
};

const resolveWritableWorkspacePath = async (targetPath) => {
  assertWorkspaceReady();

  const requested = path.resolve(assertPathInput(targetPath));
  const existing = await fs.stat(requested).catch(() => null);
  if (existing) {
    return resolveWorkspacePath(requested, { allowRoot: false });
  }

  const parent = await resolveWorkspacePath(path.dirname(requested), {
    allowRoot: true,
    expected: "directory",
  });
  const canonical = path.join(parent.canonical, path.basename(requested));

  if (!findAllowedRootForCanonicalPath(canonical)) {
    throw new Error("Target path outside selected workspace.");
  }

  return { requested, canonical, root: parent.root, stats: null };
};

const assertNotProtectedWorkspacePath = (canonicalPath) => {
  const segments = canonicalPath.split(/[\\/]+/);
  if (segments.some((segment) => PROTECTED_WORKSPACE_NAMES.has(segment))) {
    throw new Error("Protected workspace metadata cannot be modified.");
  }
};

const byteLength = (value) => Buffer.byteLength(String(value ?? ""), "utf8");

const toIpcResponse = async (operation) => {
  try {
    const data = await operation();
    return { ok: true, data, error: null };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: redactSensitiveText(error?.message || "Unknown IPC error"),
    };
  }
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

const isExternalHttpUrl = (url) => {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.protocol === "https:") return true;
    if (!DEV || parsed.protocol !== "http:") return false;
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const configureSessionSecurity = () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);
};

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

const isBlockedDangerousTerminalCommand = (command) => {
  const raw = String(command || "").trim();
  if (!raw) return false;
  return DANGEROUS_TERMINAL_PATTERNS.some((pattern) => pattern.test(raw));
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
  assertWorkspaceReady();
  const fallbackRoot = listAllowedWorkspaceRoots()[0];
  const selectedPath = typeof candidatePath === "string" && candidatePath.trim()
    ? candidatePath
    : fallbackRoot;
  const safePath = await resolveWorkspacePath(selectedPath, { allowRoot: true });

  if (safePath.stats?.isDirectory()) return safePath.canonical;

  const parentPath = await resolveWorkspacePath(path.dirname(safePath.canonical), {
    allowRoot: true,
    expected: "directory",
  });
  return parentPath.canonical;
};

const resolveGitWorkingDirectory = async (candidatePath) => {
  const safePath = await resolveWorkspacePath(candidatePath, { allowRoot: true });
  if (safePath.stats?.isDirectory()) return safePath.canonical;

  const parentPath = await resolveWorkspacePath(path.dirname(safePath.canonical), {
    allowRoot: true,
    expected: "directory",
  });
  return parentPath.canonical;
};

const resolveLspWorkspaceRoot = async (candidatePath) => {
  const cwd = await resolveTerminalWorkingDirectory(candidatePath);
  const safePath = await resolveWorkspacePath(cwd, {
    allowRoot: true,
    expected: "directory",
  });
  return safePath.canonical;
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

const registerWebContentsGuards = () => {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event) => {
      event.preventDefault();
    });

    contents.on("will-navigate", (event, url) => {
      if (!isAllowedNavigation(url)) {
        event.preventDefault();
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      if (isExternalHttpUrl(url)) {
        shell.openExternal(url).catch(() => {});
      }
      return { action: "deny" };
    });
  });
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

// IPC: window controls

ipcMain.on("window:minimize",  () => mainWindow?.minimize());
ipcMain.on("window:maximize",  () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on("window:close",     () => mainWindow?.close());

ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

// IPC: file system

ipcMain.handle("dialog:open-folder", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;
  return registerWorkspaceRoot(result.filePaths[0]);
});

ipcMain.handle("fs:read-directory", async (_event, dirPath) => {
  try {
    const safeDir = await resolveWorkspacePath(dirPath, {
      allowRoot: true,
      expected: "directory",
    });
    const entries = await fs.readdir(safeDir.canonical, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(safeDir.canonical, entry.name);
      try {
        if (!entry.isSymbolicLink()) {
          files.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: null,
            modified: null,
          });
          continue;
        }

        const canonical = await fs.realpath(fullPath);
        if (!findAllowedRootForCanonicalPath(canonical)) continue;
        const stats = await fs.stat(canonical);
        files.push({
          name: entry.name,
          path: fullPath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        });
      } catch {
        // Ignore broken links and files that disappeared while listing.
      }
    }

    return files;
  } catch (error) {
    console.error("FS Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:read-file", async (_event, filePath) => {
  try {
    const safeFile = await resolveWorkspacePath(filePath, {
      allowRoot: false,
      expected: "file",
    });

    if ((safeFile.stats?.size || 0) > MAX_FILE_BYTES) {
      throw new Error("File is too large for the Nexus Code bridge.");
    }

    return await fs.readFile(safeFile.canonical, "utf-8");
  } catch (error) {
    console.error("FS Read Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:write-file", async (_event, filePath, content) => {
  try {
    const body = String(content ?? "");
    if (byteLength(body) > MAX_WRITE_BYTES) {
      throw new Error("File content is too large for the Nexus Code bridge.");
    }

    const safeFile = await resolveWritableWorkspacePath(filePath);
    assertNotProtectedWorkspacePath(safeFile.canonical);
    await fs.writeFile(safeFile.canonical, body, "utf-8");
    return true;
  } catch (error) {
    console.error("FS Write Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:mkdir", async (_event, dirPath) => {
  try {
    const safeDir = await resolveWritableWorkspacePath(dirPath);
    assertNotProtectedWorkspacePath(safeDir.canonical);
    await fs.mkdir(safeDir.canonical, { recursive: true });
    return true;
  } catch (error) {
    console.error("FS Mkdir Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:delete", async (_event, targetPath) => {
  try {
    const safeTarget = await resolveWorkspacePath(targetPath, { allowRoot: false });
    assertNotProtectedWorkspacePath(safeTarget.canonical);
    await fs.rm(safeTarget.canonical, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error("FS Delete Error:", error);
    throw error;
  }
});

ipcMain.handle("fs:rename", async (_event, oldPath, newPath) => {
  try {
    const safeOld = await resolveWorkspacePath(oldPath, { allowRoot: false });
    const safeNew = await resolveWritableWorkspacePath(newPath);

    if (normalizePathKey(safeOld.root) !== normalizePathKey(safeNew.root)) {
      throw new Error("Rename must stay inside the same workspace root.");
    }

    assertNotProtectedWorkspacePath(safeOld.canonical);
    assertNotProtectedWorkspacePath(safeNew.canonical);
    await fs.rename(safeOld.canonical, safeNew.canonical);
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

// IPC: Git and GitHub foundations

ipcMain.handle("git:status", async (_event, repoPath) => toIpcResponse(async () => (
  gitService.status(await resolveGitWorkingDirectory(repoPath))
)));

ipcMain.handle("git:diff", async (_event, repoPath, options = {}) => toIpcResponse(async () => (
  gitService.diff(await resolveGitWorkingDirectory(repoPath), options || {})
)));

ipcMain.handle("git:stage", async (_event, repoPath, options = {}) => toIpcResponse(async () => (
  gitService.stage(await resolveGitWorkingDirectory(repoPath), options || {})
)));

ipcMain.handle("git:unstage", async (_event, repoPath, options = {}) => toIpcResponse(async () => (
  gitService.unstage(await resolveGitWorkingDirectory(repoPath), options || {})
)));

ipcMain.handle("git:commit", async (_event, repoPath, options = {}) => toIpcResponse(async () => (
  gitService.commit(await resolveGitWorkingDirectory(repoPath), options || {})
)));

ipcMain.handle("git:branch", async (_event, repoPath, options = {}) => toIpcResponse(async () => (
  gitService.branch(await resolveGitWorkingDirectory(repoPath), options || {})
)));

ipcMain.handle("git:log", async (_event, repoPath, options = {}) => toIpcResponse(async () => (
  gitService.log(await resolveGitWorkingDirectory(repoPath), options || {})
)));

ipcMain.handle("git:remotes", async (_event, repoPath) => toIpcResponse(async () => (
  gitService.remotes(await resolveGitWorkingDirectory(repoPath))
)));

ipcMain.handle("github:auth-status", async () => toIpcResponse(async () => (
  githubAuthService.getAuthStatus()
)));

ipcMain.handle("github:device-flow:start", async (_event, options = {}) => toIpcResponse(async () => (
  githubAuthService.startDeviceFlow(options || {})
)));

ipcMain.handle("github:device-flow:poll", async (_event, options = {}) => toIpcResponse(async () => (
  githubAuthService.pollDeviceFlow(options || {})
)));

ipcMain.handle("github:sign-out", async () => toIpcResponse(async () => (
  githubAuthService.signOut()
)));

ipcMain.handle("github:viewer", async () => toIpcResponse(async () => (
  githubService.getViewer()
)));

ipcMain.handle("github:repositories", async (_event, options = {}) => toIpcResponse(async () => (
  githubService.listRepositories(options || {})
)));

ipcMain.handle("github:rate-limit", async () => toIpcResponse(async () => (
  githubService.getRateLimit()
)));

// IPC: Language Server Protocol

ipcMain.handle("lsp:start", async (_event, payload = {}) => toIpcResponse(async () => {
  const workspaceRoot = await resolveLspWorkspaceRoot(payload.workspacePath);
  return lspProcessService.startSession({
    languageId: payload.languageId,
    workspaceRoot,
  });
}));

ipcMain.handle("lsp:request", async (_event, payload = {}) => toIpcResponse(async () => (
  lspProcessService.request(
    payload.sessionId,
    String(payload.method || ""),
    payload.params || {},
    { timeoutMs: payload.timeoutMs },
  )
)));

ipcMain.handle("lsp:stop", async (_event, payload = {}) => toIpcResponse(async () => (
  lspProcessService.stopSession(payload.sessionId)
)));

ipcMain.handle("lsp:list", async () => toIpcResponse(async () => (
  lspProcessService.listSessions()
)));

ipcMain.handle("lsp:servers", async () => toIpcResponse(async () => (
  lspProcessService.listServerStatus()
)));

ipcMain.on("lsp:notify", (_event, payload = {}) => {
  try {
    lspProcessService.notify(
      payload.sessionId,
      String(payload.method || ""),
      payload.params || {},
    );
  } catch {}
});

// IPC: terminal (real shell)

const sendTerminalMessage = (sender, id, channel, payload) => {
  try {
    sender.send(`terminal:${channel}:${id}`, payload);
  } catch {}
};

ipcMain.on("terminal:run", async (event, payload = {}) => {
  let id = 0;
  try {
    id = assertTerminalId(payload.id);
    const normalized = String(payload.command || "").trim();

    if (!normalized) {
      sendTerminalMessage(event.sender, id, "output", {
        type: "error",
        text: "Kein Befehl uebergeben.",
      });
      sendTerminalMessage(event.sender, id, "exit", 1);
      return;
    }

    if (byteLength(normalized) > MAX_TERMINAL_COMMAND_LENGTH) {
      sendTerminalMessage(event.sender, id, "output", {
        type: "error",
        text: "Command is too large for the Nexus Code terminal bridge.",
      });
      sendTerminalMessage(event.sender, id, "exit", 126);
      return;
    }

    if (isBlockedNetworkMutationCommand(normalized)) {
      sendTerminalMessage(event.sender, id, "output", {
        type: "error",
        text: "Blocked: network/system configuration commands are disabled in this app.",
      });
      sendTerminalMessage(event.sender, id, "exit", 126);
      return;
    }

    if (isBlockedDangerousTerminalCommand(normalized)) {
      sendTerminalMessage(event.sender, id, "output", {
        type: "error",
        text: "Blocked: destructive system-level commands are disabled in this app.",
      });
      sendTerminalMessage(event.sender, id, "exit", 126);
      return;
    }

    const running = activeProcesses.get(id);
    if (running && !running.killed) {
      try {
        running.kill("SIGTERM");
      } catch {}
      activeProcesses.delete(id);
    }

    if (!running && activeProcesses.size >= MAX_TERMINAL_SESSIONS) {
      sendTerminalMessage(event.sender, id, "output", {
        type: "error",
        text: "Too many terminal sessions are running.",
      });
      sendTerminalMessage(event.sender, id, "exit", 126);
      return;
    }

    const resolvedCwd = await resolveTerminalWorkingDirectory(payload.cwd);
    const shellLaunch = resolveShellLaunch(normalized);
    const proc = spawn(shellLaunch.binary, shellLaunch.args, {
      cwd: resolvedCwd,
      env: { ...process.env, FORCE_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    activeProcesses.set(id, proc);
    sendTerminalMessage(event.sender, id, "ready");

    proc.stdout.on("data", (data) => {
      sendTerminalMessage(event.sender, id, "output", { type: "output", text: data.toString() });
    });

    proc.stderr.on("data", (data) => {
      sendTerminalMessage(event.sender, id, "output", { type: "error", text: data.toString() });
    });

    proc.on("error", (error) => {
      sendTerminalMessage(event.sender, id, "output", { type: "error", text: `Failed to start: ${error.message}` });
      sendTerminalMessage(event.sender, id, "exit", 1);
      activeProcesses.delete(id);
    });

    proc.on("close", (code) => {
      const exitCode = typeof code === "number" ? code : 1;
      sendTerminalMessage(event.sender, id, "output", { type: "system", text: `\nProcess exited with code ${exitCode}` });
      sendTerminalMessage(event.sender, id, "exit", exitCode);
      activeProcesses.delete(id);
    });
  } catch (error) {
    sendTerminalMessage(event.sender, id, "output", { type: "error", text: `Failed to start: ${error.message}` });
    sendTerminalMessage(event.sender, id, "exit", 1);
  }
});

ipcMain.on("terminal:kill", (_event, id) => {
  let terminalId = null;
  try {
    terminalId = assertTerminalId(id);
  } catch {
    return;
  }

  const proc = activeProcesses.get(terminalId);
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
  let id = null;
  try {
    id = assertTerminalId(payload?.id);
  } catch {
    return;
  }

  const input = payload?.input;
  const proc = activeProcesses.get(id);
  if (!proc || proc.killed) return;
  try {
    const text = String(input ?? "");
    if (text.length === 0 || byteLength(text) > MAX_TERMINAL_INPUT_LENGTH) return;
    proc.stdin?.write(text);
  } catch {}
});

// App lifecycle

app.whenReady().then(() => {
  configureSessionSecurity();
  registerWebContentsGuards();
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
  lspProcessService.dispose();
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
