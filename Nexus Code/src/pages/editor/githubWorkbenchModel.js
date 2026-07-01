const isBrowser = () => typeof window !== "undefined";
const isFunction = (value) => typeof value === "function";

const DEFAULT_SCOPE_HINTS = ["repo", "read:org", "project"];

export const GITHUB_PLATFORM_METHODS = {
  authStatus: "githubGetAuthStatus",
  viewer: "githubGetViewer",
  repositories: "githubListRepositories",
  rateLimit: "githubGetRateLimit",
  issues: "githubListIssues",
  issue: "githubGetIssue",
  createIssue: "githubCreateIssue",
  updateIssue: "githubUpdateIssue",
  issueComments: "githubListIssueComments",
  createIssueComment: "githubCreateIssueComment",
  pullRequests: "githubListPullRequests",
  pullRequest: "githubGetPullRequest",
  createPullRequest: "githubCreatePullRequest",
  updatePullRequest: "githubUpdatePullRequest",
  pullRequestFiles: "githubListPullRequestFiles",
  pullRequestCommits: "githubListPullRequestCommits",
  pullRequestReviews: "githubListPullRequestReviews",
  createPullRequestReview: "githubCreatePullRequestReview",
  mergePullRequest: "githubMergePullRequest",
  updatePullRequestBranch: "githubUpdatePullRequestBranch",
  projectsV2: "githubListProjectsV2",
  projectV2: "githubGetProjectV2",
  projectV2Items: "githubListProjectV2Items",
  addProjectV2Item: "githubAddProjectV2Item",
  updateProjectV2ItemField: "githubUpdateProjectV2ItemField",
};

export const GITHUB_PLATFORM_ERROR_KINDS = {
  offline: "offline",
  methodUnavailable: "method-unavailable",
  auth: "auth",
  scope: "scope",
  rateLimit: "rate-limit",
  notFound: "not-found",
  validation: "validation",
  unknown: "unknown",
};

export const GITHUB_PANEL_METHOD_REQUIREMENTS = {
  issues: ["issues", "createIssue", "updateIssue"],
  prs: [
    "pullRequests",
    "createPullRequest",
    "updatePullRequest",
    "updatePullRequestBranch",
    "mergePullRequest",
  ],
  projects: [
    "projectsV2",
    "projectV2",
    "projectV2Items",
    "addProjectV2Item",
    "updateProjectV2ItemField",
  ],
};

function createPlatformError(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  if (details.status) error.status = details.status;
  if (details.code) error.code = details.code;
  return error;
}

function normalizeRequiredMethods(requiredMethods) {
  return Array.isArray(requiredMethods)
    ? requiredMethods.filter((method) => Object.hasOwn(GITHUB_PLATFORM_METHODS, method))
    : [];
}

function normalizeErrorDetails(details) {
  return details && typeof details === "object" ? details : {};
}

function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === false) {
      const error = new Error(result.error || "GitHub platform request failed.");
      error.details = normalizeErrorDetails(result.errorDetails);
      if (error.details.status) error.status = error.details.status;
      if (error.details.code) error.code = error.details.code;
      throw error;
    }
    return result.data;
  }
  return result;
}

function getAvailableMethods(api) {
  return Object.entries(GITHUB_PLATFORM_METHODS)
    .filter(([, methodName]) => isFunction(api?.[methodName]))
    .map(([key]) => key);
}

export function getGithubPlatformProvider() {
  if (!isBrowser()) return null;
  const api = window.electronAPI;
  if (!api) return null;
  const availableMethods = getAvailableMethods(api);
  if (availableMethods.length === 0) return null;
  return {
    kind: "electron-github-platform",
    label: "Electron GitHub Platform IPC",
    api,
    availableMethods,
  };
}

export function getGithubPlatformCapability(requiredMethods = []) {
  const provider = getGithubPlatformProvider();
  const required = normalizeRequiredMethods(requiredMethods);
  const methods = provider?.availableMethods || [];
  const missingMethods = required.filter((method) => !methods.includes(method));
  const available = Boolean(provider);
  return {
    available,
    ready: available && missingMethods.length === 0,
    provider: provider?.kind || "none",
    label: provider?.label || "No GitHub platform bridge",
    methods,
    requiredMethods: required,
    missingMethods,
  };
}

export function getGithubCapabilityStatus(capability) {
  if (!capability?.available) {
    return {
      id: "offline",
      tone: "danger",
      label: "Bridge offline",
      title: "Desktop bridge unavailable",
      detail:
        "GitHub features need the Nexus Code desktop runtime with the Electron GitHub bridge.",
    };
  }

  if (capability.missingMethods?.length) {
    return {
      id: "partial",
      tone: "warning",
      label: "Bridge partial",
      title: "GitHub bridge is missing methods",
      detail: `Update Nexus Code or switch runtime. Missing: ${capability.missingMethods.join(", ")}.`,
    };
  }

  return {
    id: "ready",
    tone: "accent",
    label: "Bridge ready",
    title: "GitHub bridge ready",
    detail: `${capability.methods?.length || 0} GitHub IPC methods available.`,
  };
}

export function normalizeGithubRepositoryInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return { owner: "", repo: "", label: "" };

  const cleaned = raw
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, "")
    .replace(/^git@github\.com:/i, "")
    .split(/[?#]/)[0]
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "");
  const [owner = "", repo = ""] = cleaned
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    owner,
    repo,
    label: owner && repo ? `${owner}/${repo}` : raw,
  };
}

export function getGithubRepositoryError(repoRef) {
  if (!repoRef?.owner || !repoRef?.repo) {
    return "Enter a repository as owner/repo before refreshing or updating GitHub data.";
  }
  return "";
}

export function getRawGithubErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  return (
    error.message ||
    error.error ||
    error.details?.message ||
    error.details?.error ||
    error.details?.response?.message ||
    ""
  );
}

export function getGithubErrorStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.code,
    error?.details?.status,
    error?.details?.statusCode,
    error?.details?.response?.status,
  ];
  const explicitStatus = candidates
    .map((value) => Number(value))
    .find((value) => Number.isInteger(value) && value >= 100);
  if (explicitStatus) return explicitStatus;

  const messageStatus = getRawGithubErrorMessage(error).match(/\b(401|403|404|422|429)\b/);
  return messageStatus ? Number(messageStatus[1]) : null;
}

function formatGithubDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function classifyGithubPlatformError(error) {
  const rawMessage = getRawGithubErrorMessage(error);
  const lowerMessage = rawMessage.toLowerCase();
  const status = getGithubErrorStatus(error);
  const details = normalizeErrorDetails(error?.details);
  const missingScopes = details.scopes?.missingScopes || details.missingScopes || [];
  const resetAt = details.rateLimit?.resetAt ? formatGithubDate(details.rateLimit.resetAt) : "";
  const validation = Array.isArray(details.errors)
    ? details.errors
      .map((entry) => entry?.message || entry?.code || "")
      .filter(Boolean)
      .slice(0, 3)
    : [];
  const documentationUrl = details.documentationUrl || details.documentation_url || "";
  const hint = details.hint || "";
  const rawDetail = rawMessage ? `GitHub said: ${rawMessage}` : "";
  const docsDetail = documentationUrl ? `Docs: ${documentationUrl}` : "";

  if (
    details.code === "GITHUB_BRIDGE_UNAVAILABLE" ||
    lowerMessage.includes("bridge is not available") ||
    lowerMessage.includes("no github platform bridge")
  ) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.offline,
      tone: "danger",
      title: "GitHub bridge offline",
      detail:
        "Open Nexus Code in the desktop runtime, reconnect GitHub in Account, then refresh.",
      status,
      hints: [rawDetail].filter(Boolean),
    };
  }

  if (
    details.code === "GITHUB_METHOD_UNAVAILABLE" ||
    lowerMessage.includes("does not expose")
  ) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.methodUnavailable,
      tone: "warning",
      title: "GitHub bridge missing method",
      detail: "Update Nexus Code or switch to the desktop runtime that exposes this GitHub API.",
      status,
      hints: [hint, rawDetail].filter(Boolean),
    };
  }

  if (
    status === 401 ||
    lowerMessage.includes("bad credentials") ||
    lowerMessage.includes("requires authentication") ||
    lowerMessage.includes("unauthorized")
  ) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.auth,
      tone: "danger",
      title: "GitHub auth expired",
      detail: "Reconnect GitHub in Account, then refresh this panel.",
      status,
      hints: [rawDetail].filter(Boolean),
    };
  }

  if (
    details.code === "GITHUB_RATE_LIMITED" ||
    details.rateLimit?.remaining === 0 ||
    status === 429 ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("secondary rate") ||
    lowerMessage.includes("abuse detection")
  ) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.rateLimit,
      tone: "warning",
      title: "GitHub rate limited",
      detail: resetAt
        ? `Wait until ${resetAt}, then refresh.`
        : "Wait for the limit to reset, then refresh.",
      status,
      hints: [hint, rawDetail, docsDetail].filter(Boolean),
    };
  }

  if (
    details.code === "GITHUB_SCOPE_REQUIRED" ||
    missingScopes.length > 0 ||
    lowerMessage.includes("resource not accessible") ||
    lowerMessage.includes("insufficient") ||
    lowerMessage.includes("scope") ||
    lowerMessage.includes("permission") ||
    lowerMessage.includes("sso")
  ) {
    const scopes = missingScopes.length ? missingScopes : DEFAULT_SCOPE_HINTS;
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.scope,
      tone: "warning",
      title: "GitHub scope required",
      detail:
        "Approve organization SSO and ensure the token can access repositories, pull requests, and Projects v2.",
      status,
      hints: [`Scopes to check: ${scopes.join(", ")}.`, hint, rawDetail, docsDetail].filter(Boolean),
    };
  }

  if (status === 403) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.scope,
      tone: "warning",
      title: "GitHub access denied",
      detail:
        "The token may be missing repository, pull request, Projects v2, or organization SSO access.",
      status,
      hints: [hint, rawDetail, docsDetail].filter(Boolean),
    };
  }

  if (status === 404) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.notFound,
      tone: "warning",
      title: "GitHub object not found",
      detail: "Check owner/repo, project owner type, issue/PR IDs, and token access.",
      status,
      hints: [hint, rawDetail, docsDetail].filter(Boolean),
    };
  }

  if (status === 422) {
    return {
      kind: GITHUB_PLATFORM_ERROR_KINDS.validation,
      tone: "warning",
      title: "GitHub validation failed",
      detail: "Check branch names, required fields, duplicate project items, and selected IDs.",
      status,
      hints: [...validation, hint, rawDetail, docsDetail].filter(Boolean),
    };
  }

  return {
    kind: GITHUB_PLATFORM_ERROR_KINDS.unknown,
    tone: "danger",
    title: "GitHub request failed",
    detail: rawMessage || "The GitHub platform returned an unknown error.",
    status,
    hints: [hint, docsDetail].filter(Boolean),
  };
}

export function formatGithubPlatformError(error, fallback = "GitHub request failed.") {
  const classification = classifyGithubPlatformError(error);
  const title =
    classification.kind === GITHUB_PLATFORM_ERROR_KINDS.unknown
      ? fallback
      : classification.title;
  const hints = classification.hints?.length ? ` ${classification.hints.join(" ")}` : "";
  return `${title}. ${classification.detail}${hints}`.trim();
}

export async function callGithubPlatform(methodKey, payload = {}) {
  const provider = getGithubPlatformProvider();
  const methodName = GITHUB_PLATFORM_METHODS[methodKey];
  if (!methodName) {
    throw createPlatformError(`Unknown GitHub platform method ${methodKey}.`, {
      code: "GITHUB_UNKNOWN_METHOD",
      methodKey,
    });
  }
  if (!provider) {
    throw createPlatformError("GitHub platform bridge is not available in this runtime.", {
      code: "GITHUB_BRIDGE_UNAVAILABLE",
      methodKey,
    });
  }

  const method = provider.api?.[methodName];
  if (!isFunction(method)) {
    throw createPlatformError(`GitHub platform bridge does not expose ${methodKey}.`, {
      code: "GITHUB_METHOD_UNAVAILABLE",
      methodKey,
      methodName,
    });
  }
  return unwrapIpcResponse(await method.call(provider.api, payload || {}));
}

export const loadGithubIssues = (options = {}) => callGithubPlatform("issues", options);
export const loadGithubIssue = (options = {}) => callGithubPlatform("issue", options);
export const createGithubIssue = (options = {}) => callGithubPlatform("createIssue", options);
export const updateGithubIssue = (options = {}) => callGithubPlatform("updateIssue", options);
export const loadGithubIssueComments = (options = {}) => callGithubPlatform("issueComments", options);
export const createGithubIssueComment = (options = {}) => callGithubPlatform("createIssueComment", options);

export const loadGithubPullRequests = (options = {}) => callGithubPlatform("pullRequests", options);
export const loadGithubPullRequest = (options = {}) => callGithubPlatform("pullRequest", options);
export const createGithubPullRequest = (options = {}) => callGithubPlatform("createPullRequest", options);
export const updateGithubPullRequest = (options = {}) => callGithubPlatform("updatePullRequest", options);
export const loadGithubPullRequestFiles = (options = {}) => callGithubPlatform("pullRequestFiles", options);
export const loadGithubPullRequestCommits = (options = {}) => callGithubPlatform("pullRequestCommits", options);
export const loadGithubPullRequestReviews = (options = {}) => callGithubPlatform("pullRequestReviews", options);
export const createGithubPullRequestReview = (options = {}) => callGithubPlatform("createPullRequestReview", options);
export const mergeGithubPullRequest = (options = {}) => callGithubPlatform("mergePullRequest", options);
export const updateGithubPullRequestBranch = (options = {}) => callGithubPlatform("updatePullRequestBranch", options);

export const loadGithubProjectsV2 = (options = {}) => callGithubPlatform("projectsV2", options);
export const loadGithubProjectV2 = (options = {}) => callGithubPlatform("projectV2", options);
export const loadGithubProjectV2Items = (options = {}) => callGithubPlatform("projectV2Items", options);
export const addGithubProjectV2Item = (options = {}) => callGithubPlatform("addProjectV2Item", options);
export const updateGithubProjectV2ItemField = (options = {}) => callGithubPlatform("updateProjectV2ItemField", options);
