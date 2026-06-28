const isBrowser = () => typeof window !== "undefined";
const isFunction = (value) => typeof value === "function";

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

function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === false) {
      const error = new Error(result.error || "GitHub platform request failed.");
      error.details = result.errorDetails || null;
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

export function getGithubPlatformCapability() {
  const provider = getGithubPlatformProvider();
  return {
    available: Boolean(provider),
    provider: provider?.kind || "none",
    label: provider?.label || "No GitHub platform bridge",
    methods: provider?.availableMethods || [],
  };
}

export async function callGithubPlatform(methodKey, payload = {}) {
  const provider = getGithubPlatformProvider();
  const methodName = GITHUB_PLATFORM_METHODS[methodKey];
  const method = methodName ? provider?.api?.[methodName] : null;
  if (!isFunction(method)) {
    throw new Error(`GitHub platform bridge does not expose ${methodKey}.`);
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
