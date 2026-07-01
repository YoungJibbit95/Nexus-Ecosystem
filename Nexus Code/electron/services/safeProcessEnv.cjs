"use strict";

const DEFAULT_ALLOWED_ENV_NAMES = Object.freeze([
  "ALLUSERSPROFILE",
  "APPDATA",
  "ComSpec",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOCALAPPDATA",
  "OS",
  "PATH",
  "PATHEXT",
  "Path",
  "ProgramData",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "PROCESSOR_ARCHITECTURE",
  "SHELL",
  "SystemDrive",
  "SystemRoot",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USER",
  "USERDOMAIN",
  "USERNAME",
  "USERPROFILE",
  "WINDIR",
]);

const EXTRA_ALLOWLIST_ENV_KEYS = Object.freeze([
  "NEXUS_CODE_CHILD_ENV_ALLOW",
  "NEXUS_CODE_TERMINAL_ENV_ALLOW",
]);

const splitEnvList = (value) => String(value || "")
  .split(/[;,]/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const resolveEnvKey = (name) => Object.keys(process.env)
  .find((key) => key.toLowerCase() === String(name || "").toLowerCase());

const createSanitizedProcessEnv = (overrides = {}) => {
  const allowedNames = new Set(DEFAULT_ALLOWED_ENV_NAMES);
  for (const key of EXTRA_ALLOWLIST_ENV_KEYS) {
    for (const entry of splitEnvList(process.env[key])) {
      allowedNames.add(entry);
    }
  }

  const next = {};
  for (const name of allowedNames) {
    const sourceKey = resolveEnvKey(name);
    if (!sourceKey || process.env[sourceKey] == null) continue;
    next[sourceKey] = String(process.env[sourceKey]);
  }

  next.NEXUS_SANITIZED_CHILD_ENV = "1";

  for (const [key, value] of Object.entries(overrides || {})) {
    if (typeof key !== "string" || key.length === 0 || key.includes("\0")) continue;
    if (value === undefined || value === null) {
      delete next[key];
    } else {
      next[key] = String(value);
    }
  }

  return next;
};

module.exports = {
  createSanitizedProcessEnv,
};
