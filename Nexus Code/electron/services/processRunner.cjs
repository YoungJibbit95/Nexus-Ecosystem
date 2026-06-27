"use strict";

const { spawn } = require("child_process");

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const MAX_COMMAND_LENGTH = 512;
const MAX_ARG_BYTES = 64 * 1024;
const MAX_STDIN_BYTES = 1024 * 1024;

const TOKEN_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\b(token|access_token)=([^&\s]+)/gi,
  /(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi,
];

class ProcessRunnerError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ProcessRunnerError";
    this.code = details.code || "PROCESS_FAILED";
    this.exitCode = details.exitCode;
    this.signal = details.signal;
    this.stderr = details.stderr || "";
    this.stdout = details.stdout || "";
  }
}

const byteLength = (value) => Buffer.byteLength(String(value ?? ""), "utf8");

const redactSensitiveText = (value) => {
  let text = String(value ?? "");
  for (const pattern of TOKEN_PATTERNS) {
    text = text.replace(pattern, (match, prefix) => {
      if (typeof prefix === "string" && prefix.startsWith("http")) {
        return `${prefix}***:***@`;
      }
      if (/^Bearer/i.test(match)) return "Bearer [redacted]";
      if (/=/i.test(match)) return match.replace(/=.*/, "=[redacted]");
      return "[redacted]";
    });
  }
  return text;
};

const assertCommand = (command) => {
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new ProcessRunnerError("Executable must be a non-empty string.", {
      code: "INVALID_COMMAND",
    });
  }

  const normalized = command.trim();
  if (normalized.length > MAX_COMMAND_LENGTH || normalized.includes("\0")) {
    throw new ProcessRunnerError("Executable is not allowed.", {
      code: "INVALID_COMMAND",
    });
  }

  return normalized;
};

const assertArgs = (args) => {
  if (!Array.isArray(args)) {
    throw new ProcessRunnerError("Process args must be an array.", {
      code: "INVALID_ARGS",
    });
  }

  return args.map((arg) => {
    const value = String(arg ?? "");
    if (value.includes("\0") || byteLength(value) > MAX_ARG_BYTES) {
      throw new ProcessRunnerError("Process arg is not allowed.", {
        code: "INVALID_ARGS",
      });
    }
    return value;
  });
};

const normalizeAllowedExitCodes = (allowedExitCodes) => {
  if (allowedExitCodes === "any") return "any";
  if (!Array.isArray(allowedExitCodes)) return new Set([0]);
  return new Set(allowedExitCodes.map((value) => Number(value)));
};

const appendChunk = (chunks, nextChunk, state, maxBufferBytes, streamName, child) => {
  state.bytes += nextChunk.length;
  if (state.bytes > maxBufferBytes) {
    state.overflow = streamName;
    try {
      child.kill("SIGTERM");
    } catch {}
    return;
  }
  chunks.push(nextChunk);
};

const normalizeEnv = (env) => {
  if (!env || typeof env !== "object" || Array.isArray(env)) return process.env;
  const merged = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (typeof key !== "string" || key.includes("\0")) continue;
    if (value === undefined || value === null) {
      delete merged[key];
    } else {
      merged[key] = String(value);
    }
  }
  return merged;
};

const runProcess = (command, args = [], options = {}) => new Promise((resolve, reject) => {
  let executable;
  let normalizedArgs;

  try {
    executable = assertCommand(command);
    normalizedArgs = assertArgs(args);
  } catch (error) {
    reject(error);
    return;
  }

  const timeoutMs = Math.max(0, Number(options.timeoutMs ?? DEFAULT_TIMEOUT_MS));
  const maxBufferBytes = Math.max(1024, Number(options.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES));
  const allowedExitCodes = normalizeAllowedExitCodes(options.allowedExitCodes);
  const input = options.input === undefined ? undefined : String(options.input);

  if (input !== undefined && byteLength(input) > (options.maxInputBytes ?? MAX_STDIN_BYTES)) {
    reject(new ProcessRunnerError("Process input is too large.", { code: "INVALID_INPUT" }));
    return;
  }

  const child = spawn(executable, normalizedArgs, {
    cwd: options.cwd,
    env: normalizeEnv(options.env),
    shell: false,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    windowsHide: true,
  });

  const stdoutChunks = [];
  const stderrChunks = [];
  const state = { bytes: 0, overflow: null, timedOut: false };
  let settled = false;
  let timer = null;

  const settle = (fn, value) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    fn(value);
  };

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      state.timedOut = true;
      try {
        child.kill("SIGTERM");
      } catch {}
      setTimeout(() => {
        if (!child.killed) {
          try {
            child.kill("SIGKILL");
          } catch {}
        }
      }, 1200);
    }, timeoutMs);
  }

  child.stdout?.on("data", (chunk) => {
    appendChunk(stdoutChunks, chunk, state, maxBufferBytes, "stdout", child);
  });

  child.stderr?.on("data", (chunk) => {
    appendChunk(stderrChunks, chunk, state, maxBufferBytes, "stderr", child);
  });

  child.on("error", (error) => {
    settle(reject, new ProcessRunnerError(`Failed to start process: ${error.message}`, {
      code: "PROCESS_START_FAILED",
    }));
  });

  child.on("close", (exitCode, signal) => {
    const stdout = Buffer.concat(stdoutChunks).toString("utf8");
    const stderr = Buffer.concat(stderrChunks).toString("utf8");

    if (state.timedOut) {
      settle(reject, new ProcessRunnerError("Process timed out.", {
        code: "PROCESS_TIMEOUT",
        exitCode,
        signal,
        stdout: redactSensitiveText(stdout),
        stderr: redactSensitiveText(stderr),
      }));
      return;
    }

    if (state.overflow) {
      settle(reject, new ProcessRunnerError(`Process ${state.overflow} exceeded the buffer limit.`, {
        code: "PROCESS_OUTPUT_TOO_LARGE",
        exitCode,
        signal,
        stdout: redactSensitiveText(stdout),
        stderr: redactSensitiveText(stderr),
      }));
      return;
    }

    const code = typeof exitCode === "number" ? exitCode : 1;
    const allowed = allowedExitCodes === "any" || allowedExitCodes.has(code);
    if (!allowed) {
      const safeStderr = redactSensitiveText(stderr.trim());
      settle(reject, new ProcessRunnerError(
        safeStderr || `Process exited with code ${code}.`,
        {
          code: "PROCESS_EXIT_NON_ZERO",
          exitCode: code,
          signal,
          stdout: redactSensitiveText(stdout),
          stderr: safeStderr,
        },
      ));
      return;
    }

    settle(resolve, { exitCode: code, signal, stdout, stderr });
  });

  if (input !== undefined && child.stdin) {
    child.stdin.end(input);
  }
});

module.exports = {
  ProcessRunnerError,
  redactSensitiveText,
  runProcess,
};
