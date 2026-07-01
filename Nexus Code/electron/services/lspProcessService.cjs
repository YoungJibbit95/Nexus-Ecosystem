"use strict";

const crypto = require("crypto");
const { spawn } = require("child_process");
const { redactSensitiveText } = require("./processRunner.cjs");
const { createSanitizedProcessEnv } = require("./safeProcessEnv.cjs");

const MAX_LSP_PAYLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const HEADER_SEPARATOR = Buffer.from("\r\n\r\n");

const DEFAULT_SERVER_CONFIGS = Object.freeze({
  javascript: {
    label: "TypeScript Language Server",
    command: process.platform === "win32" ? "typescript-language-server.cmd" : "typescript-language-server",
    args: ["--stdio"],
    env: "NEXUS_LSP_TYPESCRIPT",
  },
  typescript: {
    label: "TypeScript Language Server",
    command: process.platform === "win32" ? "typescript-language-server.cmd" : "typescript-language-server",
    args: ["--stdio"],
    env: "NEXUS_LSP_TYPESCRIPT",
  },
  python: {
    label: "Pyright",
    command: process.platform === "win32" ? "pyright-langserver.cmd" : "pyright-langserver",
    args: ["--stdio"],
    env: "NEXUS_LSP_PYTHON",
  },
  rust: {
    label: "rust-analyzer",
    command: process.platform === "win32" ? "rust-analyzer.exe" : "rust-analyzer",
    args: [],
    env: "NEXUS_LSP_RUST",
  },
  go: {
    label: "gopls",
    command: process.platform === "win32" ? "gopls.exe" : "gopls",
    args: [],
    env: "NEXUS_LSP_GO",
  },
  c: {
    label: "clangd",
    command: process.platform === "win32" ? "clangd.exe" : "clangd",
    args: [],
    env: "NEXUS_LSP_CLANGD",
  },
  cpp: {
    label: "clangd",
    command: process.platform === "win32" ? "clangd.exe" : "clangd",
    args: [],
    env: "NEXUS_LSP_CLANGD",
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

function resolveServerConfig(languageId) {
  const normalized = normalizeLanguageId(languageId);
  const preset = DEFAULT_SERVER_CONFIGS[normalized];
  if (!preset) return null;
  const override = parseCommandSpec(process.env[preset.env]);
  if (override) {
    return {
      label: preset.label,
      command: override.command,
      args: override.args,
      envName: preset.env,
    };
  }
  return {
    label: preset.label,
    command: preset.command,
    args: preset.args,
    envName: preset.env,
  };
}

function checkCommandAvailable(command) {
  return new Promise((resolve) => {
    const binary = process.platform === "win32" ? "where.exe" : "which";
    const proc = spawn(binary, [command], {
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    let stdout = "";
    proc.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(0, 4096);
    });
    proc.on("error", () => resolve({ available: false, path: null }));
    proc.on("close", (code) => {
      const firstPath = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
      resolve({ available: code === 0, path: firstPath });
    });
  });
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
  const onNotification =
    typeof options.onNotification === "function" ? options.onNotification : () => {};
  const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};

  const emitStatus = (session, status) => {
    onStatus(session.id, {
      sessionId: session.id,
      languageId: session.languageId,
      workspaceRoot: session.workspaceRoot,
      label: session.config?.label || session.languageId,
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

  const startSession = ({ languageId, workspaceRoot }) => {
    const normalizedLanguageId = normalizeLanguageId(languageId);
    if (!normalizedLanguageId) throw new Error("Language id is required.");
    if (!workspaceRoot) throw new Error("Workspace root is required.");

    const config = resolveServerConfig(normalizedLanguageId);
    if (!config) {
      throw new Error(`No LSP server configuration for ${normalizedLanguageId}.`);
    }

    const sessionId = createSessionId(normalizedLanguageId, workspaceRoot);
    const existing = sessions.get(sessionId);
    if (existing && !existing.proc.killed) {
      emitStatus(existing, { state: "running" });
      return {
        sessionId,
        languageId: normalizedLanguageId,
        workspaceRoot,
        label: existing.config.label,
        state: "running",
      };
    }

    const proc = spawn(config.command, config.args, {
      cwd: workspaceRoot,
      env: createSanitizedProcessEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const session = {
      id: sessionId,
      languageId: normalizedLanguageId,
      workspaceRoot,
      config,
      proc,
      buffer: Buffer.alloc(0),
      nextRequestId: 1,
      pending: new Map(),
      stderr: "",
    };
    sessions.set(sessionId, session);
    emitStatus(session, { state: "starting" });

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
      emitStatus(session, { state: "running" });
    });

    proc.on("error", (error) => {
      cleanupSession(session, {
        state: "error",
        message: redactSensitiveText(error?.message || "LSP server failed."),
      });
    });

    proc.on("close", (code) => {
      cleanupSession(session, {
        code: typeof code === "number" ? code : null,
        message: session.stderr ? redactSensitiveText(session.stderr).slice(-2_000) : undefined,
      });
    });

    return {
      sessionId,
      languageId: normalizedLanguageId,
      workspaceRoot,
      label: config.label,
      state: "starting",
      command: config.command,
    };
  };

  return {
    startSession,

    request(sessionId, method, params = {}, options = {}) {
      const session = sessions.get(String(sessionId || ""));
      if (!session) throw new Error("LSP session was not found.");
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
      if (!session) throw new Error("LSP session was not found.");
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
          return {
            languageId,
            label: config?.label || languageId,
            command: config?.command || "",
            args: config?.args || [],
            envName: config?.envName || null,
            available: availability.available,
            resolvedPath: availability.path,
          };
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
  createLspProcessService,
};
