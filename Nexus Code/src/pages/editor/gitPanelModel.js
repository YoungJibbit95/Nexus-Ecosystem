const GITHUB_TOKEN_STORAGE_KEY = "github_token";
const GITHUB_OWNER_STORAGE_KEY = "github_owner";
const GITHUB_REPO_STORAGE_KEY = "github_repo";

const isBrowser = () => typeof window !== "undefined";
const isFunction = (value) => typeof value === "function";

function safeLocalStorage() {
  if (!isBrowser()) return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function getNestedValue(root, path) {
  return path.reduce((current, key) => current?.[key], root);
}

function resolveProvider(candidates) {
  if (!isBrowser()) return null;

  for (const candidate of candidates) {
    const api = getNestedValue(window, candidate.path);
    if (!api) continue;
    const availableMethods = Object.entries(candidate.methods)
      .filter(([, names]) => names.some((name) => isFunction(api?.[name])))
      .map(([key]) => key);

    if (availableMethods.length > 0) {
      return {
        ...candidate,
        api,
        availableMethods,
      };
    }
  }

  return null;
}

function getMethod(provider, key) {
  const names = provider?.methods?.[key] || [];
  return names.map((name) => provider.api?.[name]).find(isFunction) || null;
}

async function callProvider(provider, key, payload = {}, fallbackArgs = []) {
  const method = getMethod(provider, key);
  if (!method) {
    throw new Error(`${provider?.label || "Git provider"} does not support ${key}.`);
  }

  try {
    return await method.call(provider.api, payload);
  } catch (firstError) {
    if (fallbackArgs.length === 0) throw firstError;
    return await method.call(provider.api, ...fallbackArgs);
  }
}

function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === false) {
      throw new Error(result.error || "Backend request failed.");
    }
    return result.data;
  }
  return result;
}

export function getGitProvider() {
  return resolveProvider([
    {
      kind: "electron",
      label: "Electron Git IPC",
      path: ["electronAPI"],
      methods: {
        status: ["gitStatus"],
        diff: ["gitDiff"],
        stage: ["gitStage"],
        unstage: ["gitUnstage"],
        commit: ["gitCommit"],
        push: ["gitPush"],
        pull: ["gitPull"],
        log: ["gitLog", "gitHistory"],
        branches: ["gitBranch", "gitBranches"],
        remotes: ["gitRemotes"],
      },
    },
    {
      kind: "nexus",
      label: "Nexus Git Bridge",
      path: ["nexus", "git"],
      methods: {
        status: ["status", "gitStatus"],
        diff: ["diff", "gitDiff"],
        stage: ["stage", "gitStage"],
        unstage: ["unstage", "gitUnstage"],
        commit: ["commit", "gitCommit"],
        push: ["push", "gitPush"],
        pull: ["pull", "gitPull"],
        log: ["log", "history", "gitLog"],
        branches: ["branches", "gitBranches"],
      },
    },
  ]);
}

export function getGitCapability() {
  const provider = getGitProvider();
  return {
    available: Boolean(provider),
    provider: provider?.kind || "fallback",
    label: provider?.label || "Simulated files",
    methods: provider?.availableMethods || [],
  };
}

function statusCode(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "M";
  if (raw === "??" || raw === "U" || raw === "UNTRACKED") return "U";
  if (raw.startsWith("MOD")) return "M";
  if (raw.startsWith("ADD") || raw === "A") return "A";
  if (raw.startsWith("DEL") || raw === "D") return "D";
  if (raw.startsWith("REN") || raw === "R") return "R";
  if (raw.startsWith("CON") || raw === "C") return "C";
  return raw[0] || "M";
}

function normalizePathName(file, index) {
  return (
    file?.path ||
    file?.filePath ||
    file?.relativePath ||
    file?.name ||
    file?.fsPath ||
    `change-${index + 1}`
  );
}

function normalizeGitFile(file, index, stagedDefault = false) {
  const path = normalizePathName(file, index);
  const status =
    file?.status ||
    file?.workingTreeStatus ||
    file?.workingTree ||
    file?.indexStatus ||
    file?.index ||
    file?.type ||
    "M";

  return {
    id: file?.id || `git:${path}:${statusCode(status)}:${stagedDefault ? "staged" : "worktree"}`,
    name: file?.name || path,
    path,
    status: statusCode(status),
    staged: Boolean(file?.staged ?? file?.isStaged ?? stagedDefault),
    additions: Number(file?.additions || file?.added || 0),
    deletions: Number(file?.deletions || file?.deleted || 0),
    source: "git",
    raw: file,
  };
}

function parsePorcelainStatus(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line, index) => {
      const indexStatus = line[0] || " ";
      const worktreeStatus = line[1] || " ";
      const rawPath = line.slice(3).replace(/^.* -> /, "");
      const staged = indexStatus !== " " && indexStatus !== "?";
      return normalizeGitFile(
        {
          path: rawPath,
          status: worktreeStatus !== " " ? worktreeStatus : indexStatus,
          staged,
          rawStatus: line.slice(0, 2),
        },
        index,
        staged,
      );
    });
}

export function normalizeGitStatus(result) {
  const data = result?.data || result || {};
  let files = [];

  if (typeof data === "string") {
    files = parsePorcelainStatus(data);
  } else if (Array.isArray(data)) {
    files = data.map((file, index) => normalizeGitFile(file, index));
  } else {
    const staged = data.staged || data.stagedFiles || data.index || [];
    const unstaged = data.unstaged || data.unstagedFiles || data.worktree || [];
    const untracked = data.untracked || data.untrackedFiles || [];
    const allFiles =
      data.files ||
      data.changes ||
      data.changedFiles ||
      data.status ||
      data.entries ||
      [];

    if (Array.isArray(allFiles) && allFiles.length > 0) {
      files = allFiles.map((file, index) => normalizeGitFile(file, index));
    } else {
      files = [
        ...staged.map((file, index) => normalizeGitFile(file, index, true)),
        ...unstaged.map((file, index) => normalizeGitFile(file, index, false)),
        ...untracked.map((file, index) =>
          normalizeGitFile({ ...file, status: "U" }, index, false),
        ),
      ];
    }
  }

  return {
    branch:
      data.branch ||
      data.currentBranch ||
      data.current ||
      data.head ||
      data.ref ||
      "main",
    ahead: Number(data.ahead || data.aheadBy || 0),
    behind: Number(data.behind || data.behindBy || 0),
    clean: Boolean(data.clean ?? data.isClean ?? files.length === 0),
    files,
    raw: result,
  };
}

export function normalizeGitHistory(result) {
  const data = result?.data || result || [];
  const commits = Array.isArray(data)
    ? data
    : data.commits || data.history || data.items || [];

  return commits.map((commit, index) => {
    const sha = commit.sha || commit.hash || commit.id || String(index + 1);
    const author = commit.author?.name || commit.authorName || commit.author || "Git";
    const date = commit.date || commit.author?.date || commit.time || commit.committedAt;
    return {
      hash: String(sha).substring(0, 7),
      message: commit.message || commit.subject || commit.title || "(no message)",
      author,
      time: date ? new Date(date).toLocaleString() : commit.relativeTime || "",
      raw: commit,
    };
  });
}

export async function loadLocalGitStatus(options = {}) {
  const provider = getGitProvider();
  if (!provider) throw new Error("No local Git bridge is available.");
  const result = await callProvider(provider, "status", options, [options.cwd]);
  return {
    ...normalizeGitStatus(result),
    provider: provider.kind,
    providerLabel: provider.label,
  };
}

export async function loadLocalGitHistory(options = {}) {
  const provider = getGitProvider();
  if (!provider || !getMethod(provider, "log")) return [];
  const result = await callProvider(provider, "log", options, [
    options.cwd,
    { limit: options.limit },
  ]);
  return normalizeGitHistory(result);
}

export async function stageGitPath(path, options = {}) {
  const provider = getGitProvider();
  const paths = Array.isArray(path) ? path : [path].filter(Boolean);
  const payload = { ...options, path: paths[0], paths };
  return callProvider(provider, "stage", payload, [options.cwd, payload]);
}

export async function unstageGitPath(path, options = {}) {
  const provider = getGitProvider();
  const paths = Array.isArray(path) ? path : [path].filter(Boolean);
  const payload = { ...options, path: paths[0], paths };
  return callProvider(provider, "unstage", payload, [options.cwd, payload]);
}

export async function commitLocalGit(message, options = {}) {
  const provider = getGitProvider();
  const payload = { ...options, message };
  return callProvider(provider, "commit", payload, [options.cwd, payload]);
}

export async function pushLocalGit(options = {}) {
  const provider = getGitProvider();
  return callProvider(provider, "push", options, [options.cwd]);
}

export async function pullLocalGit(options = {}) {
  const provider = getGitProvider();
  return callProvider(provider, "pull", options, [options.cwd]);
}

export function buildFallbackGitStatus(files = []) {
  const fallbackFiles = files
    .filter((file) => file?.type !== "folder")
    .map((file, index) =>
      normalizeGitFile(
        {
          id: file.id,
          name: file.name,
          path: file.fsPath || file.name,
          status: file.content ? "M" : "A",
        },
        index,
        false,
      ),
    );

  return {
    branch: "local-preview",
    ahead: 0,
    behind: 0,
    clean: fallbackFiles.length === 0,
    files: fallbackFiles,
    provider: "fallback",
    providerLabel: "Editor file preview",
  };
}

export function inferWorkspaceRoot(files = []) {
  const fsPath = files.find((file) => typeof file?.fsPath === "string")?.fsPath;
  if (!fsPath) return null;
  const separator = fsPath.includes("\\") ? "\\" : "/";
  const parts = fsPath.split(/[\\/]/);
  if (parts.length <= 1) return fsPath;
  return parts.slice(0, -1).join(separator);
}

export function readGithubSettings() {
  const storage = safeLocalStorage();
  return {
    owner: storage?.getItem(GITHUB_OWNER_STORAGE_KEY) || "",
    repo: storage?.getItem(GITHUB_REPO_STORAGE_KEY) || "",
    legacyTokenPresent: Boolean(storage?.getItem(GITHUB_TOKEN_STORAGE_KEY)),
  };
}

export function saveGithubRepositorySettings(owner, repo) {
  const storage = safeLocalStorage();
  if (!storage) return;
  storage.setItem(GITHUB_OWNER_STORAGE_KEY, owner || "");
  storage.setItem(GITHUB_REPO_STORAGE_KEY, repo || "");
}

export function clearDeprecatedGithubToken() {
  safeLocalStorage()?.removeItem(GITHUB_TOKEN_STORAGE_KEY);
}

export function getGithubBackendProvider() {
  const provider = resolveProvider([
    {
      kind: "nexus-github",
      label: "Nexus GitHub backend",
      path: ["nexus", "github"],
      methods: {
        session: ["session", "getSession", "getUser"],
        repos: ["repositories", "listRepositories", "listRepos"],
        commits: ["commits", "listCommits", "history"],
      },
    },
    {
      kind: "nexus-github",
      label: "Nexus GitHub backend",
      path: ["nexus", "gitHub"],
      methods: {
        session: ["session", "getSession", "getUser"],
        repos: ["repositories", "listRepositories", "listRepos"],
        commits: ["commits", "listCommits", "history"],
      },
    },
    {
      kind: "electron-github",
      label: "Electron GitHub IPC",
      path: ["electronAPI"],
      methods: {
        authStatus: ["githubGetAuthStatus"],
        session: ["githubGetViewer", "githubGetAuthStatus"],
        repos: ["githubListRepositories", "githubRepos", "githubListRepos"],
        commits: ["githubCommits", "githubListCommits"],
        startDeviceFlow: ["githubStartDeviceFlow"],
        pollDeviceFlow: ["githubPollDeviceFlow"],
        signOut: ["githubSignOut"],
        rateLimit: ["githubGetRateLimit"],
      },
    },
  ]);

  if (provider) return provider;

  if (isBrowser()) {
    const apiBase =
      window.nexus?.config?.githubApiBase ||
      window.nexus?.githubApiBase ||
      window.__NEXUS_GITHUB_API_BASE__;
    if (apiBase) {
      return {
        kind: "http",
        label: "Secure GitHub HTTP API",
        api: { apiBase },
        availableMethods: ["session", "repos", "commits"],
        methods: {},
      };
    }
  }

  return null;
}

async function callGithubBackend(provider, key, payload = {}) {
  if (!provider) throw new Error("Secure GitHub backend is not connected.");

  if (provider.kind === "http") {
    const base = String(provider.api.apiBase).replace(/\/$/, "");
    const query = new URLSearchParams();
    Object.entries(payload).forEach(([name, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(name, String(value));
      }
    });

    if (
      key === "startDeviceFlow" ||
      key === "pollDeviceFlow" ||
      key === "signOut"
    ) {
      throw new Error("This GitHub backend does not expose OAuth controls.");
    }

    const endpoint =
      key === "session" || key === "authStatus"
        ? `${base}/session`
        : key === "repos"
          ? `${base}/repos`
          : `${base}/repos/${encodeURIComponent(payload.owner)}/${encodeURIComponent(payload.repo)}/commits`;
    const url = query.size && key !== "commits" ? `${endpoint}?${query}` : endpoint;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`GitHub backend returned ${response.status}.`);
    return response.json();
  }

  return callProvider(provider, key, payload);
}

export function getGithubBackendCapability() {
  const provider = getGithubBackendProvider();
  return {
    available: Boolean(provider),
    provider: provider?.kind || "none",
    label: provider?.label || "No secure GitHub backend",
    methods: provider?.availableMethods || [],
  };
}

export async function loadGithubSession() {
  const provider = getGithubBackendProvider();
  const result = unwrapIpcResponse(await callGithubBackend(provider, "session"));
  return result?.user || result?.account || result?.viewer || result;
}

export async function loadGithubRepositories() {
  const provider = getGithubBackendProvider();
  const result = unwrapIpcResponse(await callGithubBackend(provider, "repos"));
  const repos = result?.repositories || result?.repos || result || [];
  return Array.isArray(repos) ? repos : [];
}

export async function loadGithubCommitHistory(owner, repo, limit = 10) {
  if (!owner || !repo) return [];
  const provider = getGithubBackendProvider();
  const result = unwrapIpcResponse(await callGithubBackend(provider, "commits", {
    owner,
    repo,
    limit,
    per_page: limit,
  }));
  return normalizeGitHistory(result);
}

export async function loadGithubAuthStatus() {
  const provider = getGithubBackendProvider();
  if (!provider) return { authenticated: false, connected: false };
  if (!getMethod(provider, "authStatus") && provider.kind !== "http") {
    try {
      const session = await loadGithubSession();
      return { authenticated: Boolean(session), connected: Boolean(session), session };
    } catch {
      return { authenticated: false, connected: true };
    }
  }
  const result = unwrapIpcResponse(await callGithubBackend(provider, "authStatus"));
  return { connected: true, ...(result || {}) };
}

export async function startGithubDeviceFlow(options = {}) {
  const provider = getGithubBackendProvider();
  const result = unwrapIpcResponse(
    await callGithubBackend(provider, "startDeviceFlow", options),
  );
  return result;
}

export async function pollGithubDeviceFlow(flow) {
  const provider = getGithubBackendProvider();
  const result = unwrapIpcResponse(
    await callGithubBackend(provider, "pollDeviceFlow", flow),
  );
  return result;
}

export async function signOutGithub() {
  const provider = getGithubBackendProvider();
  const result = unwrapIpcResponse(await callGithubBackend(provider, "signOut"));
  return result;
}
