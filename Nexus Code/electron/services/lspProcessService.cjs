"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { redactSensitiveText } = require("./processRunner.cjs");
const { createSanitizedProcessEnv } = require("./safeProcessEnv.cjs");

const MAX_LSP_PAYLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_RETRY_DELAY_MS = 5_000;
const COMMAND_LOOKUP_TIMEOUT_MS = 2_500;
const HEADER_SEPARATOR = Buffer.from("\r\n\r\n");

const DEFAULT_SERVER_CONFIGS = Object.freeze({
  javascript: {
    label: "TypeScript Language Server",
    command: process.platform === "win32" ? "typescript-language-server.cmd" : "typescript-language-server",
    args: ["--stdio"],
    env: "NEXUS_LSP_TYPESCRIPT",
    installHint:
      "Install with npm install -g typescript typescript-language-server or set NEXUS_LSP_TYPESCRIPT to a custom command.",
  },
  typescript: {
    label: "TypeScript Language Server",
    command: process.platform === "win32" ? "typescript-language-server.cmd" : "typescript-language-server",
    args: ["--stdio"],
    env: "NEXUS_LSP_TYPESCRIPT",
    installHint:
      "Install with npm install -g typescript typescript-language-server or set NEXUS_LSP_TYPESCRIPT to a custom command.",
  },
  python: {
    label: "Pyright",
    command: process.platform === "win32" ? "pyright-langserver.cmd" : "pyright-langserver",
    args: ["--stdio"],
    env: "NEXUS_LSP_PYTHON",
    installHint:
      "Install with pip install pyright or set NEXUS_LSP_PYTHON to a custom command.",
  },
  rust: {
    label: "rust-analyzer",
    command: process.platform === "win32" ? "rust-analyzer.exe" : "rust-analyzer",
    args: [],
    env: "NEXUS_LSP_RUST",
    installHint:
      "Install rust-analyzer with rustup component add rust-analyzer or set NEXUS_LSP_RUST to a custom command.",
  },
  go: {
    label: "gopls",
    command: process.platform === "win32" ? "gopls.exe" : "gopls",
    args: [],
    env: "NEXUS_LSP_GO",
    installHint:
      "Install with go install golang.org/x/tools/gopls@latest or set NEXUS_LSP_GO to a custom command.",
  },
  c: {
    label: "clangd",
    command: process.platform === "win32" ? "clangd.exe" : "clangd",
    args: [],
    env: "NEXUS_LSP_CLANGD",
    installHint:
      "Install clangd from LLVM or set NEXUS_LSP_CLANGD to a custom command.",
  },
  cpp: {
    label: "clangd",
    command: process.platform === "win32" ? "clangd.exe" : "clangd",
    args: [],
    env: "NEXUS_LSP_CLANGD",
    installHint:
      "Install clangd from LLVM or set NEXUS_LSP_CLANGD to a custom command.",
  },
});

function parseCommandSpec(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parts = [];
  let current = "";
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if ((char === "\"" || char === "'") && (!quote || quote === char)) {
      quote = quote ? null : char;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  if (parts.length === 0) return null;
  return { command: parts[0], args: parts.slice(1) };
}

function normalizeLanguageId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_#+.-]/g, "")
    .slice(0, 64);
}

function createSessionId(languageId, workspaceRoot) {
  const hash = crypto
    .createHash("sha1")
    .update(`${languageId}:${workspaceRoot}`)
    .digest("hex")
    .slice(0, 16);
  return `lsp_${languageId}_${hash}`;
}

function resolveServerConfig(languageId, env = process.env) {
  const normalized = normalizeLanguageId(languageId);
  const preset = DEFAULT_SERVER_CONFIGS[normalized];
  if (!preset) return null;
  const override = parseCommandSpec(env[preset.env]);
  const envOverride = Boolean(override);
  if (override) {
    return {
      label: preset.label,
      command: override.command,
      args: override.args.length > 0 ? override.args : preset.args,
      envName: preset.env,
      envOverride,
      source: "env",
      installHint: preset.installHint,
    };
  }
  return {
    label: preset.label,
    command: preset.command,
    args: preset.args,
    envName: preset.env,
    envOverride,
    source: "default",
    installHint: preset.installHint,
  };
}

function hasPathSeparator(value) {
  return /[\\/]/.test(String(value || ""));
}

function getWindowsPathCandidates(command) {
  if (process.platform !== "win32") return [command];
  const extension = path.extname(command);
  if (extension) return [command];
  const pathExt = String(process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  return [command, ...pathExt.map((ext) => `${command}${ext.toLowerCase()}`)];
}

function checkPathCommandAvailable(command) {
  const candidates = getWindowsPathCandidates(command);
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return { available: true, path: resolved };
    }
  }
  return { available: false, path: null };
}

function checkCommandAvailable(command) {
  return new Promise((resolve) => {
    if (!command) {
      resolve({ available: false, path: null });
      return;
    }

    if (path.isAbsolute(command) || hasPathSeparator(command)) {
      resolve(checkPathCommandAvailable(command));
      return;
    }

    const binary = process.platform === "win32" ? "where.exe" : "which";
    const proc = spawn(binary, [command], {
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    let stdout = "";
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGTERM");
      } catch {}
      finish({ available: false, path: null });
    }, COMMAND_LOOKUP_TIMEOUT_MS);
    proc.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(0, 4096);
    });
    proc.on("error", () => finish({ available: false, path: null }));
    proc.on("close", (code) => {
      const firstPath = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
      finish({ available: code === 0, path: firstPath });
    });
  });
}

function createServerStatusSnapshot(languageId, config, availability = {}, runtime = {}) {
  const normalizedLanguageId = normalizeLanguageId(languageId);
  const checkedAt = new Date().toISOString();

  if (!config) {
    return {
      languageId: normalizedLanguageId,
      label: normalizedLanguageId || "unknown",
      command: "",
      args: [],
      envName: null,
      envOverride: false,
      source: "unsupported",
      available: false,
      missing: true,
      path: null,
      resolvedPath: null,
      state: "unsupported",
      status: "unsupported",
      canStart: false,
      canRetry: false,
      retryable: false,
      retryDelayMs: null,
      installHint: null,
      message: `No LSP server configuration for ${normalizedLanguageId || "this language"}.`,
      lastError: runtime.lastError || null,
      lastExitCode: runtime.lastExitCode ?? null,
      lastState: runtime.lastState || null,
      lastStartedAt: runtime.lastStartedAt || null,
      checkedAt,
    };
  }

  const available = availability.available === true;
  const resolvedPath = availability.path || null;
  const missing = !available;
  const state = available ? "available" : "missing";
  const lastError = runtime.lastError
    ? redactSensitiveText(String(runtime.lastError)).slice(-2_000)
    : null;

  return {
    languageId: normalizedLanguageId,
    label: config.label || normalizedLanguageId,
    command: config.command || "",
    args: Array.isArray(config.args) ? config.args : [],
    envName: config.envName || null,
    envOverride: config.envOverride === true,
    source: config.source || (config.envOverride ? "env" : "default"),
    available,
    missing,
    path: resolvedPath,
    resolvedPath,
    state,
    status: state,
    canStart: available,
    canRetry: true,
    retryable: true,
    retryDelayMs: missing ? DEFAULT_RETRY_DELAY_MS : 0,
    installHint: config.installHint || null,
    message: missing
      ? `${config.label || normalizedLanguageId} is not available on PATH.`
      : `${config.label || normalizedLanguageId} is available.`,
    lastError,
    lastExitCode: runtime.lastExitCode ?? null,
    lastState: runtime.lastState || null,
    lastStartedAt: runtime.lastStartedAt || null,
    checkedAt,
  };
}

function createLspServiceError(message, details = {}) {
  const error = new Error(message);
  error.code = details.code || "LSP_ERROR";
  error.toIpcError = () => ({
    code: error.code,
    retryable: details.retryable === true,
    status: details.status || null,
    languageId: details.languageId || null,
  });
  return error;
}

function encodeJsonRpcMessage(payload) {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf8");
  if (body.length > MAX_LSP_PAYLOAD_BYTES) {
    throw new Error("LSP payload is too large.");
  }
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8"),
    body,
  ]);
}

function parseBufferedMessages(session, onMessage) {
  while (session.buffer.length > 0) {
    const headerEnd = session.buffer.indexOf(HEADER_SEPARATOR);
    if (headerEnd < 0) return;

    const header = session.buffer.slice(0, headerEnd).toString("utf8");
    const lengthMatch = /content-length:\s*(\d+)/i.exec(header);
    if (!lengthMatch) {
      session.buffer = Buffer.alloc(0);
      return;
    }

    const contentLength = Number(lengthMatch[1]);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_LSP_PAYLOAD_BYTES) {
      session.buffer = Buffer.alloc(0);
      return;
    }

    const bodyStart = headerEnd + HEADER_SEPARATOR.length;
    const bodyEnd = bodyStart + contentLength;
    if (session.buffer.length < bodyEnd) return;

    const body = session.buffer.slice(bodyStart, bodyEnd).toString("utf8");
    session.buffer = session.buffer.slice(bodyEnd);
    try {
      onMessage(JSON.parse(body));
    } catch {
      // Ignore malformed LSP payloads from external servers.
    }
  }
}

function createLspProcessService(options = {}) {
  const sessions = new Map();
  const runtimeByLanguage = new Map();
  const onNotification =
    typeof options.onNotification === "function" ? options.onNotification : () => {};
  const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};

  const rememberRuntime = (languageId, patch = {}) => {
    const normalizedLanguageId = normalizeLanguageId(languageId);
    const current = runtimeByLanguage.get(normalizedLanguageId) || {};
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    runtimeByLanguage.set(normalizedLanguageId, next);
    return next;
  };

  const emitStatus = (session, status) => {
    onStatus(session.id, {
      sessionId: session.id,
      languageId: session.languageId,
      workspaceRoot: session.workspaceRoot,
      label: session.config?.label || session.languageId,
      command: session.config?.command || "",
      args: Array.isArray(session.config?.args) ? session.config.args : [],
      envName: session.config?.envName || null,
      envOverride: session.config?.envOverride === true,
      installHint: session.config?.installHint || null,
      canRetry: status.canRetry ?? true,
      retryable: status.retryable ?? true,
      retryDelayMs: status.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      ...status,
    });
  };

  const cleanupSession = (session, status = {}) => {
    if (!sessions.has(session.id)) return;
    sessions.delete(session.id);
    for (const pending of session.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(status.message || "LSP server stopped."));
    }
    session.pending.clear();
    emitStatus(session, { state: "stopped", ...status });
  };

  const handleMessage = (session, message) => {
    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      const pending = session.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      session.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message || "LSP request failed."));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (message.method) {
      onNotification(session.id, {
        sessionId: session.id,
        languageId: session.languageId,
        method: message.method,
        params: message.params || {},
      });
    }
  };

  const writeMessage = (session, payload) => {
    if (!session.proc || session.proc.killed) {
      throw new Error("LSP server is not running.");
    }
    session.proc.stdin.write(encodeJsonRpcMessage(payload));
  };

  const startSession = async ({ languageId, workspaceRoot }) => {
    const normalizedLanguageId = normalizeLanguageId(languageId);
    if (!normalizedLanguageId) throw new Error("Language id is required.");
    if (!workspaceRoot) throw new Error("Workspace root is required.");

    const config = resolveServerConfig(normalizedLanguageId);
    if (!config) {
      const status = createServerStatusSnapshot(normalizedLanguageId, null, null, {
        lastState: "unsupported",
      });
      throw createLspServiceError(status.message, {
        code: "LSP_UNSUPPORTED_LANGUAGE",
        languageId: normalizedLanguageId,
        retryable: false,
        status,
      });
    }

    const sessionId = createSessionId(normalizedLanguageId, workspaceRoot);
    const existing = sessions.get(sessionId);
    if (existing && !existing.proc.killed) {
      emitStatus(existing, {
        state: "running",
        available: true,
        missing: false,
        path: existing.serverPath || null,
        resolvedPath: existing.serverPath || null,
        canStart: true,
        retryDelayMs: 0,
      });
      return {
        sessionId,
        languageId: normalizedLanguageId,
        workspaceRoot,
        label: existing.config.label,
        state: "running",
        available: true,
        missing: false,
        path: existing.serverPath || null,
        resolvedPath: existing.serverPath || null,
        envOverride: existing.config.envOverride === true,
        installHint: existing.config.installHint || null,
      };
    }

    const availability = await checkCommandAvailable(config.command);
    const status = createServerStatusSnapshot(
      normalizedLanguageId,
      config,
      availability,
      runtimeByLanguage.get(normalizedLanguageId),
    );
    if (!status.available) {
      rememberRuntime(normalizedLanguageId, {
        lastError: status.message,
        lastState: status.state,
      });
      throw createLspServiceError(
        `${status.message} ${status.installHint || ""}`.trim(),
        {
          code: "LSP_SERVER_MISSING",
          languageId: normalizedLanguageId,
          retryable: true,
          status,
        },
      );
    }

    let proc = null;
    try {
      proc = spawn(config.command, config.args, {
        cwd: workspaceRoot,
        env: createSanitizedProcessEnv(),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      const message = redactSensitiveText(error?.message || "LSP server failed to start.");
      const runtime = rememberRuntime(normalizedLanguageId, {
        lastError: message,
        lastState: "error",
      });
      throw createLspServiceError(message, {
        code: "LSP_SPAWN_FAILED",
        languageId: normalizedLanguageId,
        retryable: true,
        status: {
          ...createServerStatusSnapshot(normalizedLanguageId, config, availability, runtime),
          state: "error",
          status: "error",
          message,
        },
      });
    }

    const session = {
      id: sessionId,
      languageId: normalizedLanguageId,
      workspaceRoot,
      config,
      serverPath: availability.path || null,
      proc,
      buffer: Buffer.alloc(0),
      nextRequestId: 1,
      pending: new Map(),
      stderr: "",
    };
    sessions.set(sessionId, session);
    rememberRuntime(normalizedLanguageId, {
      lastState: "starting",
      lastStartedAt: new Date().toISOString(),
      lastError: null,
      lastExitCode: null,
    });
    emitStatus(session, {
      state: "starting",
      available: true,
      missing: false,
      path: availability.path || null,
      resolvedPath: availability.path || null,
      canStart: true,
      retryDelayMs: 0,
    });

    proc.stdout.on("data", (chunk) => {
      session.buffer = Buffer.concat([session.buffer, chunk]);
      parseBufferedMessages(session, (message) => handleMessage(session, message));
    });

    proc.stderr.on("data", (chunk) => {
      session.stderr = `${session.stderr}${chunk.toString("utf8")}`.slice(-16_000);
      emitStatus(session, {
        state: "stderr",
        message: redactSensitiveText(chunk.toString("utf8")).slice(0, 2_000),
      });
    });

    proc.on("spawn", () => {
      rememberRuntime(normalizedLanguageId, {
        lastState: "running",
        lastError: null,
        lastExitCode: null,
      });
      emitStatus(session, {
        state: "running",
        available: true,
        missing: false,
        path: availability.path || null,
        resolvedPath: availability.path || null,
        canStart: true,
        retryDelayMs: 0,
      });
    });

    proc.on("error", (error) => {
      const message = redactSensitiveText(error?.message || "LSP server failed.");
      rememberRuntime(normalizedLanguageId, {
        lastError: message,
        lastState: "error",
      });
      cleanupSession(session, {
        state: "error",
        code: "LSP_SPAWN_FAILED",
        message,
        available: false,
        missing: error?.code === "ENOENT",
        canStart: false,
        canRetry: true,
        retryable: true,
        retryDelayMs: DEFAULT_RETRY_DELAY_MS,
      });
    });

    proc.on("close", (code) => {
      const exitCode = typeof code === "number" ? code : null;
      const message = session.stderr ? redactSensitiveText(session.stderr).slice(-2_000) : undefined;
      rememberRuntime(normalizedLanguageId, {
        lastError: exitCode && exitCode !== 0 ? message || `LSP server exited with code ${exitCode}.` : null,
        lastExitCode: exitCode,
        lastState: exitCode === 0 ? "stopped" : "error",
      });
      cleanupSession(session, {
        state: exitCode === 0 ? "stopped" : "error",
        code: exitCode === 0 ? "LSP_STOPPED" : "LSP_SERVER_EXITED",
        exitCode,
        message,
        available: true,
        missing: false,
        canStart: true,
        canRetry: true,
        retryable: true,
        retryDelayMs: exitCode === 0 ? 0 : DEFAULT_RETRY_DELAY_MS,
      });
    });

    return {
      sessionId,
      languageId: normalizedLanguageId,
      workspaceRoot,
      label: config.label,
      state: "starting",
      command: config.command,
      args: config.args,
      available: true,
      missing: false,
      path: availability.path || null,
      resolvedPath: availability.path || null,
      envName: config.envName || null,
      envOverride: config.envOverride === true,
      installHint: config.installHint || null,
      canStart: true,
      canRetry: true,
      retryable: true,
      retryDelayMs: 0,
    };
  };

  return {
    startSession,

    request(sessionId, method, params = {}, options = {}) {
      const session = sessions.get(String(sessionId || ""));
      if (!session) {
        throw createLspServiceError("LSP session was not found.", {
          code: "LSP_SESSION_NOT_FOUND",
          retryable: true,
        });
      }
      const requestId = session.nextRequestId++;
      const timeoutMs = Math.min(
        60_000,
        Math.max(1_000, Number(options.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS)),
      );

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          session.pending.delete(requestId);
          reject(new Error(`LSP request timed out: ${method}`));
        }, timeoutMs);
        session.pending.set(requestId, { resolve, reject, timeout });
        try {
          writeMessage(session, {
            jsonrpc: "2.0",
            id: requestId,
            method,
            params: params || {},
          });
        } catch (error) {
          clearTimeout(timeout);
          session.pending.delete(requestId);
          reject(error);
        }
      });
    },

    notify(sessionId, method, params = {}) {
      const session = sessions.get(String(sessionId || ""));
      if (!session) {
        throw createLspServiceError("LSP session was not found.", {
          code: "LSP_SESSION_NOT_FOUND",
          retryable: true,
        });
      }
      writeMessage(session, {
        jsonrpc: "2.0",
        method,
        params: params || {},
      });
      return true;
    },

    stopSession(sessionId) {
      const session = sessions.get(String(sessionId || ""));
      if (!session) return false;
      try {
        session.proc.kill("SIGTERM");
      } catch {}
      cleanupSession(session, { state: "stopped" });
      return true;
    },

    listSessions() {
      return Array.from(sessions.values()).map((session) => ({
        sessionId: session.id,
        languageId: session.languageId,
        workspaceRoot: session.workspaceRoot,
        label: session.config.label,
        command: session.config.command,
        args: session.config.args,
        envName: session.config.envName || null,
        envOverride: session.config.envOverride === true,
        path: session.serverPath || null,
        resolvedPath: session.serverPath || null,
        installHint: session.config.installHint || null,
        pending: session.pending.size,
        killed: session.proc.killed,
      }));
    },

    async listServerStatus() {
      const languageIds = Object.keys(DEFAULT_SERVER_CONFIGS);
      const statuses = await Promise.all(
        languageIds.map(async (languageId) => {
          const config = resolveServerConfig(languageId);
          const availability = config
            ? await checkCommandAvailable(config.command)
            : { available: false, path: null };
          return createServerStatusSnapshot(
            languageId,
            config,
            availability,
            runtimeByLanguage.get(languageId),
          );
        }),
      );
      return statuses;
    },

    dispose() {
      for (const session of Array.from(sessions.values())) {
        try {
          session.proc.kill("SIGTERM");
        } catch {}
        cleanupSession(session, { state: "stopped" });
      }
    },
  };
}

module.exports = {
  DEFAULT_SERVER_CONFIGS,
  DEFAULT_RETRY_DELAY_MS,
  createLspProcessService,
  createServerStatusSnapshot,
  normalizeLanguageId,
  resolveServerConfig,
};
