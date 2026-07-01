"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const MAX_PATH_LENGTH = 4096;
const MAX_WRITE_BYTES = 20 * 1024 * 1024;
const MAX_TERMINAL_COMMAND_LENGTH = 8_000;
const MAX_TERMINAL_INPUT_LENGTH = 64_000;
const MAX_BRIDGE_OPTION_BYTES = 64 * 1024;
const MAX_LSP_METHOD_LENGTH = 128;
const MAX_LSP_PAYLOAD_BYTES = 2 * 1024 * 1024;
const MAX_GITHUB_PAYLOAD_BYTES = 512 * 1024;
const MAX_GITHUB_STRING_BYTES = 128 * 1024;
const MAX_GITHUB_DEPTH = 8;

const noop = () => {};

const assertCallback = (value) => (typeof value === "function" ? value : noop);

const sanitizePath = (value, label = "path") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  if (value.length > MAX_PATH_LENGTH || value.includes("\0")) {
    throw new Error(`${label} is not allowed`);
  }

  return value;
};

const sanitizeOptionalPath = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return sanitizePath(value, "cwd");
};

const sanitizeTerminalId = (value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 0 || id > 1_000_000) {
    throw new Error("Invalid terminal session id");
  }
  return id;
};

const sanitizeText = (value, maxBytes, label) => {
  const text = String(value ?? "");
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error(`${label} is too large`);
  }
  return text;
};

const sanitizeBridgeOptions = (value, label = "options") => {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const safeKey = sanitizeText(key, 128, `${label} key`);
    if (item === undefined) continue;
    if (item === null || typeof item === "boolean") {
      result[safeKey] = item;
      continue;
    }
    if (typeof item === "number") {
      if (!Number.isFinite(item)) throw new Error(`${safeKey} must be finite`);
      result[safeKey] = item;
      continue;
    }
    if (typeof item === "string") {
      result[safeKey] = sanitizeText(item, MAX_BRIDGE_OPTION_BYTES, safeKey);
      continue;
    }
    if (Array.isArray(item)) {
      result[safeKey] = item.map((entry) => sanitizeText(entry, MAX_BRIDGE_OPTION_BYTES, safeKey));
      continue;
    }
  }
  return result;
};

const terminalChannel = (type, id) => `terminal:${type}:${sanitizeTerminalId(id)}`;

const sanitizeLspSessionId = (value) => {
  const id = String(value ?? "").trim();
  if (!/^lsp_[a-z0-9_#+.-]{1,64}_[a-f0-9]{16}$/i.test(id)) {
    throw new Error("Invalid LSP session id");
  }
  return id;
};

const sanitizeLspLanguageId = (value) => {
  const id = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_#+.-]{1,64}$/.test(id)) {
    throw new Error("Invalid LSP language id");
  }
  return id;
};

const sanitizeLspMethod = (value) => {
  const method = sanitizeText(value, MAX_LSP_METHOD_LENGTH, "LSP method").trim();
  if (!/^[a-zA-Z0-9_$./-]+$/.test(method)) {
    throw new Error("Invalid LSP method");
  }
  return method;
};

const sanitizeJsonPayload = (value, label = "LSP payload") => {
  if (value === undefined || value === null) return {};
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, "utf8") > MAX_LSP_PAYLOAD_BYTES) {
    throw new Error(`${label} is too large`);
  }
  return JSON.parse(json);
};

const sanitizeGithubJsonValue = (value, label, depth = 0) => {
  if (depth > MAX_GITHUB_DEPTH) {
    throw new Error(`${label} is too deeply nested`);
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`);
    return value;
  }
  if (typeof value === "string") {
    if (value.includes("\0")) throw new Error(`${label} contains an invalid character`);
    return sanitizeText(value, MAX_GITHUB_STRING_BYTES, label);
  }
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error(`${label} has too many entries`);
    return value.map((item, index) => sanitizeGithubJsonValue(item, `${label}[${index}]`, depth + 1));
  }
  if (value && typeof value === "object") {
    const result = {};
    const entries = Object.entries(value);
    if (entries.length > 200) throw new Error(`${label} has too many fields`);
    for (const [key, item] of entries) {
      if (item === undefined) continue;
      const safeKey = sanitizeText(key, 128, `${label} key`);
      if (safeKey.includes("\0") || safeKey === "__proto__" || safeKey === "constructor") {
        throw new Error(`${label} contains an invalid key`);
      }
      result[safeKey] = sanitizeGithubJsonValue(item, `${label}.${safeKey}`, depth + 1);
    }
    return result;
  }
  throw new Error(`${label} contains an unsupported value`);
};

const sanitizeGithubPayload = (value = {}, label = "GitHub payload") => {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, "utf8") > MAX_GITHUB_PAYLOAD_BYTES) {
    throw new Error(`${label} is too large`);
  }
  return sanitizeGithubJsonValue(JSON.parse(json), label);
};

const lspChannel = (type, sessionId) => `lsp:${type}:${sanitizeLspSessionId(sessionId)}`;

const onIpc = (channel, callback, mapper = (_event, value) => value) => {
  const safeCallback = assertCallback(callback);
  const handler = (event, value) => safeCallback(mapper(event, value));
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,

  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),

  onMaximized: (callback) => onIpc("window:maximized", callback),
  onFullscreen: (callback) => onIpc("window:fullscreen", callback),

  openFolder: () => ipcRenderer.invoke("dialog:open-folder"),
  readDir: (targetPath) => ipcRenderer.invoke("fs:read-directory", sanitizePath(targetPath)),
  readFile: (targetPath) => ipcRenderer.invoke("fs:read-file", sanitizePath(targetPath)),
  writeFile: (targetPath, content) => ipcRenderer.invoke(
    "fs:write-file",
    sanitizePath(targetPath),
    sanitizeText(content, MAX_WRITE_BYTES, "File content"),
  ),
  mkdir: (targetPath) => ipcRenderer.invoke("fs:mkdir", sanitizePath(targetPath)),
  delete: (targetPath) => ipcRenderer.invoke("fs:delete", sanitizePath(targetPath)),
  rename: (oldPath, newPath) => ipcRenderer.invoke(
    "fs:rename",
    sanitizePath(oldPath, "oldPath"),
    sanitizePath(newPath, "newPath"),
  ),
  openSystemTerminal: (cwd) => ipcRenderer.invoke("system:open-terminal", sanitizeOptionalPath(cwd)),

  gitStatus: (repoPath) => ipcRenderer.invoke("git:status", sanitizePath(repoPath, "repoPath")),
  gitDiff: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:diff",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitDiff options"),
  ),
  gitStage: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:stage",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitStage options"),
  ),
  gitUnstage: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:unstage",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitUnstage options"),
  ),
  gitCommit: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:commit",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitCommit options"),
  ),
  gitBranch: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:branch",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitBranch options"),
  ),
  gitLog: (repoPath, options = {}) => ipcRenderer.invoke(
    "git:log",
    sanitizePath(repoPath, "repoPath"),
    sanitizeBridgeOptions(options, "gitLog options"),
  ),
  gitRemotes: (repoPath) => ipcRenderer.invoke("git:remotes", sanitizePath(repoPath, "repoPath")),

  githubGetAuthStatus: () => ipcRenderer.invoke("github:auth-status"),
  githubStartDeviceFlow: (options = {}) => ipcRenderer.invoke(
    "github:device-flow:start",
    sanitizeBridgeOptions(options, "githubStartDeviceFlow options"),
  ),
  githubPollDeviceFlow: (flow) => ipcRenderer.invoke(
    "github:device-flow:poll",
    typeof flow === "object" && flow !== null
      ? sanitizeBridgeOptions(flow, "githubPollDeviceFlow options")
      : { flowId: sanitizeText(flow, 256, "flowId") },
  ),
  githubSignOut: () => ipcRenderer.invoke("github:sign-out"),
  githubGetViewer: () => ipcRenderer.invoke("github:viewer"),
  githubListRepositories: (options = {}) => ipcRenderer.invoke(
    "github:repositories",
    sanitizeBridgeOptions(options, "githubListRepositories options"),
  ),
  githubGetRateLimit: () => ipcRenderer.invoke("github:rate-limit"),
  githubListIssues: (options = {}) => ipcRenderer.invoke(
    "github:issues:list",
    sanitizeGithubPayload(options, "githubListIssues options"),
  ),
  githubGetIssue: (options = {}) => ipcRenderer.invoke(
    "github:issues:get",
    sanitizeGithubPayload(options, "githubGetIssue options"),
  ),
  githubCreateIssue: (options = {}) => ipcRenderer.invoke(
    "github:issues:create",
    sanitizeGithubPayload(options, "githubCreateIssue options"),
  ),
  githubUpdateIssue: (options = {}) => ipcRenderer.invoke(
    "github:issues:update",
    sanitizeGithubPayload(options, "githubUpdateIssue options"),
  ),
  githubListIssueComments: (options = {}) => ipcRenderer.invoke(
    "github:issues:comments",
    sanitizeGithubPayload(options, "githubListIssueComments options"),
  ),
  githubCreateIssueComment: (options = {}) => ipcRenderer.invoke(
    "github:issues:comment",
    sanitizeGithubPayload(options, "githubCreateIssueComment options"),
  ),
  githubListPullRequests: (options = {}) => ipcRenderer.invoke(
    "github:pulls:list",
    sanitizeGithubPayload(options, "githubListPullRequests options"),
  ),
  githubGetPullRequest: (options = {}) => ipcRenderer.invoke(
    "github:pulls:get",
    sanitizeGithubPayload(options, "githubGetPullRequest options"),
  ),
  githubCreatePullRequest: (options = {}) => ipcRenderer.invoke(
    "github:pulls:create",
    sanitizeGithubPayload(options, "githubCreatePullRequest options"),
  ),
  githubUpdatePullRequest: (options = {}) => ipcRenderer.invoke(
    "github:pulls:update",
    sanitizeGithubPayload(options, "githubUpdatePullRequest options"),
  ),
  githubListPullRequestFiles: (options = {}) => ipcRenderer.invoke(
    "github:pulls:files",
    sanitizeGithubPayload(options, "githubListPullRequestFiles options"),
  ),
  githubListPullRequestCommits: (options = {}) => ipcRenderer.invoke(
    "github:pulls:commits",
    sanitizeGithubPayload(options, "githubListPullRequestCommits options"),
  ),
  githubListPullRequestReviews: (options = {}) => ipcRenderer.invoke(
    "github:pulls:reviews",
    sanitizeGithubPayload(options, "githubListPullRequestReviews options"),
  ),
  githubCreatePullRequestReview: (options = {}) => ipcRenderer.invoke(
    "github:pulls:review:create",
    sanitizeGithubPayload(options, "githubCreatePullRequestReview options"),
  ),
  githubMergePullRequest: (options = {}) => ipcRenderer.invoke(
    "github:pulls:merge",
    sanitizeGithubPayload(options, "githubMergePullRequest options"),
  ),
  githubUpdatePullRequestBranch: (options = {}) => ipcRenderer.invoke(
    "github:pulls:update-branch",
    sanitizeGithubPayload(options, "githubUpdatePullRequestBranch options"),
  ),
  githubListProjectsV2: (options = {}) => ipcRenderer.invoke(
    "github:projects-v2:list",
    sanitizeGithubPayload(options, "githubListProjectsV2 options"),
  ),
  githubGetProjectV2: (options = {}) => ipcRenderer.invoke(
    "github:projects-v2:get",
    sanitizeGithubPayload(options, "githubGetProjectV2 options"),
  ),
  githubListProjectV2Items: (options = {}) => ipcRenderer.invoke(
    "github:projects-v2:items",
    sanitizeGithubPayload(options, "githubListProjectV2Items options"),
  ),
  githubAddProjectV2Item: (options = {}) => ipcRenderer.invoke(
    "github:projects-v2:item:add",
    sanitizeGithubPayload(options, "githubAddProjectV2Item options"),
  ),
  githubUpdateProjectV2ItemField: (options = {}) => ipcRenderer.invoke(
    "github:projects-v2:item-field:update",
    sanitizeGithubPayload(options, "githubUpdateProjectV2ItemField options"),
  ),

  lspStart: (payload = {}) => ipcRenderer.invoke("lsp:start", {
    languageId: sanitizeLspLanguageId(payload.languageId),
    workspacePath: sanitizePath(payload.workspacePath, "workspacePath"),
  }),
  lspRequest: (payload = {}) => ipcRenderer.invoke("lsp:request", {
    sessionId: sanitizeLspSessionId(payload.sessionId),
    method: sanitizeLspMethod(payload.method),
    params: sanitizeJsonPayload(payload.params),
    timeoutMs: Number.isFinite(Number(payload.timeoutMs)) ? Number(payload.timeoutMs) : undefined,
  }),
  lspNotify: (payload = {}) => ipcRenderer.send("lsp:notify", {
    sessionId: sanitizeLspSessionId(payload.sessionId),
    method: sanitizeLspMethod(payload.method),
    params: sanitizeJsonPayload(payload.params),
  }),
  lspStop: (payload = {}) => ipcRenderer.invoke("lsp:stop", {
    sessionId: sanitizeLspSessionId(payload.sessionId),
  }),
  lspList: () => ipcRenderer.invoke("lsp:list"),
  lspListServers: () => ipcRenderer.invoke("lsp:servers"),
  onLspNotification: (sessionId, callback) => onIpc(lspChannel("notification", sessionId), callback),
  onLspStatus: (sessionId, callback) => onIpc(lspChannel("status", sessionId), callback),

  terminalRun: (payload = {}) => ipcRenderer.send("terminal:run", {
    id: sanitizeTerminalId(payload.id),
    command: sanitizeText(payload.command, MAX_TERMINAL_COMMAND_LENGTH, "Terminal command"),
    cwd: sanitizeOptionalPath(payload.cwd),
  }),
  terminalInput: (payload = {}) => ipcRenderer.send("terminal:input", {
    id: sanitizeTerminalId(payload.id),
    input: sanitizeText(payload.input, MAX_TERMINAL_INPUT_LENGTH, "Terminal input"),
  }),
  terminalKill: (id) => ipcRenderer.send("terminal:kill", sanitizeTerminalId(id)),
  onTerminalOutput: (id, callback) => onIpc(terminalChannel("output", id), callback),
  onTerminalExit: (id, callback) => onIpc(terminalChannel("exit", id), callback),
  onTerminalReady: (id, callback) => onIpc(terminalChannel("ready", id), callback, () => undefined),
});
