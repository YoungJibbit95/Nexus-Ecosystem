"use strict";

const { REQUIRED_SCOPES, TOKEN_SERVICE } = require("./githubAuthService.cjs");

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const USER_AGENT = "Nexus-Code-Electron";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_GRAPHQL_VARIABLE_BYTES = 128 * 1024;
const MAX_TEXT_BYTES = 64 * 1024;
const MAX_REVIEW_COMMENTS = 100;
const PROJECT_SCOPE = ["project"];
const REPO_SCOPE = ["repo"];

class GithubServiceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "GithubServiceError";
    this.code = details.code || "GITHUB_API_ERROR";
    this.status = details.status || 0;
    this.documentationUrl = details.documentationUrl || null;
    this.rateLimit = details.rateLimit || null;
    this.scopes = details.scopes || null;
    this.errors = details.errors || null;
    this.hint = details.hint || null;
  }

  toIpcError() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      documentationUrl: this.documentationUrl,
      rateLimit: this.rateLimit,
      scopes: this.scopes,
      errors: this.errors,
      hint: this.hint,
    };
  }
}

const isPlainObject = (value) => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const byteLength = (value) => Buffer.byteLength(String(value ?? ""), "utf8");

const parseHeaderList = (value) => String(value || "")
  .split(/[\s,]+/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const normalizePerPage = (value, fallback = 50) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(1, Math.trunc(number)));
};

const normalizePage = (value) => {
  const number = Number(value ?? 1);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.trunc(number));
};

const normalizeFirst = (value, fallback = 25) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(100, Math.max(1, Math.trunc(number)));
};

const normalizeEnum = (value, allowed, fallback, label) => {
  const raw = String(value ?? fallback ?? "").trim();
  const normalized = allowed.includes(raw) ? raw : fallback;
  if (!normalized) {
    throw new GithubServiceError(`${label} is not allowed.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return normalized;
};

const assertText = (value, label, options = {}) => {
  const { required = true, maxBytes = MAX_TEXT_BYTES, trim = false } = options;
  if (value === undefined || value === null) {
    if (!required) return undefined;
    throw new GithubServiceError(`${label} is required.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }

  const text = trim ? String(value).trim() : String(value);
  if (required && text.length === 0) {
    throw new GithubServiceError(`${label} is required.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  if (text.includes("\0") || byteLength(text) > maxBytes) {
    throw new GithubServiceError(`${label} is not allowed.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return text;
};

const assertOwner = (value, label = "owner") => {
  const owner = assertText(value, label, { maxBytes: 80, trim: true });
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) {
    throw new GithubServiceError(`${label} is not a valid GitHub owner login.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return owner;
};

const assertRepoName = (value) => {
  const repo = assertText(value, "repo", { maxBytes: 120, trim: true }).replace(/\.git$/i, "");
  if (
    repo === "." ||
    repo === ".." ||
    repo.includes("/") ||
    repo.includes("\\") ||
    !/^[A-Za-z0-9._-]{1,100}$/.test(repo)
  ) {
    throw new GithubServiceError("repo is not a valid GitHub repository name.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return repo;
};

const assertRepoRef = (options = {}) => {
  if (!isPlainObject(options)) {
    throw new GithubServiceError("GitHub options must be an object.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }

  let owner = options.owner;
  let repo = options.repo;
  const fullName = options.fullName || options.repository || options.nameWithOwner;
  if ((!owner || !repo) && fullName) {
    const parts = String(fullName).trim().replace(/\.git$/i, "").split("/");
    if (parts.length === 2) {
      [owner, repo] = parts;
    }
  }

  return {
    owner: assertOwner(owner),
    repo: assertRepoName(repo),
  };
};

const assertPositiveInteger = (value, label, max = 2_147_483_647) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) {
    throw new GithubServiceError(`${label} must be a positive integer.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return number;
};

const assertOptionalInteger = (value, label) => {
  if (value === undefined || value === null || value === "") return undefined;
  return assertPositiveInteger(value, label);
};

const assertGitRef = (value, label) => {
  const ref = assertText(value, label, { maxBytes: 512, trim: true });
  if (
    ref.startsWith("/") ||
    ref.endsWith("/") ||
    ref.includes("..") ||
    ref.includes("@{") ||
    ref.includes("//") ||
    ref.endsWith(".lock") ||
    /[\x00-\x1f\x7f~^:?*[\\\s]/.test(ref)
  ) {
    throw new GithubServiceError(`${label} is not a safe Git ref.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return ref;
};

const assertPullHead = (value) => {
  const head = assertText(value, "head", { maxBytes: 512, trim: true });
  if (!head.includes(":")) return assertGitRef(head, "head");

  const parts = head.split(":");
  if (parts.length !== 2) {
    throw new GithubServiceError("head is not a safe pull request head ref.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return `${assertOwner(parts[0], "head owner")}:${assertGitRef(parts[1], "head ref")}`;
};

const assertNodeId = (value, label = "node id") => {
  const id = assertText(value, label, { maxBytes: 512, trim: true });
  if (/[\x00-\x1f\x7f]/.test(id)) {
    throw new GithubServiceError(`${label} is not allowed.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return id;
};

const assertOptionalCursor = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return assertNodeId(value, "cursor");
};

const normalizeBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return Boolean(value);
};

const normalizeStringList = (value, label, options = {}) => {
  const { limit = 100, itemBytes = 256, pattern = null } = options;
  if (value === undefined || value === null || value === "") return undefined;
  const items = Array.isArray(value) ? value : String(value).split(",");
  const normalized = items
    .map((item) => assertText(item, label, { maxBytes: itemBytes, trim: true, required: false }))
    .filter(Boolean);
  if (normalized.length > limit) {
    throw new GithubServiceError(`${label} has too many entries.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  if (pattern && normalized.some((item) => !pattern.test(item))) {
    throw new GithubServiceError(`${label} contains an invalid entry.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return Array.from(new Set(normalized));
};

const normalizeDateTimeFilter = (value, label) => {
  if (value === undefined || value === null || value === "") return undefined;
  const text = assertText(value, label, { maxBytes: 80, trim: true });
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new GithubServiceError(`${label} must be an ISO date or date-time.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return text;
};

const pickDefined = (source) => Object.fromEntries(
  Object.entries(source).filter(([, value]) => value !== undefined)
);

const repoPath = ({ owner, repo }) => `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

const assertRelativeApiPath = (apiPath) => {
  const text = String(apiPath || "").trim();
  if (!text.startsWith("/") || text.includes("\0") || text.includes("://")) {
    throw new GithubServiceError("GitHub API path is not allowed.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return text;
};

const extractRateLimit = (headers) => {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  const used = headers.get("x-ratelimit-used");
  const resource = headers.get("x-ratelimit-resource");
  if (!limit && !remaining && !reset && !used && !resource) return null;

  const resetNumber = Number(reset);
  return {
    limit: limit ? Number(limit) : null,
    remaining: remaining ? Number(remaining) : null,
    used: used ? Number(used) : null,
    resource: resource || null,
    resetAt: Number.isFinite(resetNumber)
      ? new Date(resetNumber * 1000).toISOString()
      : null,
  };
};

const extractScopeHint = (headers, expectedScopes = []) => {
  const grantedScopes = parseHeaderList(headers.get("x-oauth-scopes"));
  const acceptedScopes = parseHeaderList(headers.get("x-accepted-oauth-scopes"));
  const requiredScopes = Array.from(new Set([...expectedScopes, ...acceptedScopes]));
  const missingScopes = requiredScopes.length > 0
    ? requiredScopes.filter((scope) => !grantedScopes.includes(scope))
    : [];

  return {
    requiredScopes,
    grantedScopes,
    acceptedScopes,
    missingScopes,
    hasRequiredScopes: missingScopes.length === 0,
  };
};

const buildErrorHint = (status, rateLimit, scopes) => {
  if (status === 401) {
    return "Sign in to GitHub again before retrying.";
  }
  if (status === 403 && rateLimit?.remaining === 0) {
    return rateLimit.resetAt
      ? `GitHub rate limit exceeded; retry after ${rateLimit.resetAt}.`
      : "GitHub rate limit exceeded; retry later.";
  }
  if ((status === 401 || status === 403) && scopes?.missingScopes?.length > 0) {
    return `Re-authorize GitHub with scopes: ${scopes.missingScopes.join(", ")}.`;
  }
  if (status === 404) {
    return "Check the repository name and whether the authenticated token can access it.";
  }
  if (status === 422) {
    return "GitHub rejected the payload; inspect validation errors before retrying.";
  }
  return null;
};

const normalizeGithubErrors = (errors) => {
  if (!Array.isArray(errors)) return null;
  return errors.slice(0, 10).map((error) => {
    if (typeof error === "string") return { message: error };
    return {
      message: error?.message || "Validation error",
      resource: error?.resource || null,
      field: error?.field || null,
      code: error?.code || error?.type || null,
    };
  });
};

const statusCodeForError = (status, rateLimit, scopes) => {
  if (status === 401) return "GITHUB_AUTH_REQUIRED";
  if (status === 403 && rateLimit?.remaining === 0) return "GITHUB_RATE_LIMITED";
  if (status === 403 && scopes?.missingScopes?.length > 0) return "GITHUB_SCOPE_REQUIRED";
  if (status === 403) return "GITHUB_FORBIDDEN";
  if (status === 404) return "GITHUB_NOT_FOUND";
  if (status === 422) return "GITHUB_VALIDATION_FAILED";
  if (status >= 500) return "GITHUB_UNAVAILABLE";
  return "GITHUB_API_ERROR";
};

const parseResponseBody = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
};

const normalizeHttpError = (response, data, context = {}) => {
  const rateLimit = extractRateLimit(response.headers);
  const scopes = extractScopeHint(response.headers, context.expectedScopes || []);
  const errors = normalizeGithubErrors(data?.errors);
  const hint = buildErrorHint(response.status, rateLimit, scopes);
  const message = data?.message || `GitHub API request failed with ${response.status}.`;
  return new GithubServiceError(hint ? `${message} ${hint}` : message, {
    code: statusCodeForError(response.status, rateLimit, scopes),
    status: response.status,
    documentationUrl: data?.documentation_url || null,
    rateLimit,
    scopes,
    errors,
    hint,
  });
};

const assertJsonBodySize = (body, maxBytes, label) => {
  const text = JSON.stringify(body);
  if (byteLength(text) > maxBytes) {
    throw new GithubServiceError(`${label} is too large.`, {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return text;
};

const mapUser = (user) => {
  if (!user) return null;
  return {
    id: user.id || user.databaseId || null,
    nodeId: user.node_id || user.id || null,
    login: user.login || null,
    name: user.name || null,
    avatarUrl: user.avatar_url || user.avatarUrl || null,
    htmlUrl: user.html_url || user.url || null,
    type: user.type || user.__typename || null,
  };
};

const mapLabel = (label) => {
  if (typeof label === "string") return { name: label };
  return {
    id: label?.id || null,
    nodeId: label?.node_id || null,
    name: label?.name || "",
    color: label?.color || null,
    description: label?.description || null,
  };
};

const mapMilestone = (milestone) => {
  if (!milestone) return null;
  return {
    id: milestone.id || null,
    nodeId: milestone.node_id || null,
    number: milestone.number || null,
    title: milestone.title || "",
    state: milestone.state || null,
    dueOn: milestone.due_on || null,
  };
};

const mapIssue = (issue) => ({
  id: issue.id,
  nodeId: issue.node_id,
  number: issue.number,
  title: issue.title,
  state: issue.state,
  stateReason: issue.state_reason || null,
  locked: Boolean(issue.locked),
  body: issue.body || "",
  labels: Array.isArray(issue.labels) ? issue.labels.map(mapLabel) : [],
  assignees: Array.isArray(issue.assignees) ? issue.assignees.map(mapUser) : [],
  milestone: mapMilestone(issue.milestone),
  author: mapUser(issue.user),
  comments: Number(issue.comments || 0),
  htmlUrl: issue.html_url,
  url: issue.url,
  createdAt: issue.created_at,
  updatedAt: issue.updated_at,
  closedAt: issue.closed_at || null,
  isPullRequest: Boolean(issue.pull_request),
  pullRequest: issue.pull_request || null,
});

const mapComment = (comment) => ({
  id: comment.id,
  nodeId: comment.node_id || null,
  body: comment.body || "",
  author: mapUser(comment.user),
  htmlUrl: comment.html_url || null,
  createdAt: comment.created_at || null,
  updatedAt: comment.updated_at || null,
  authorAssociation: comment.author_association || null,
});

const mapPullRequest = (pull) => ({
  id: pull.id,
  nodeId: pull.node_id,
  number: pull.number,
  title: pull.title,
  state: pull.state,
  draft: Boolean(pull.draft),
  locked: Boolean(pull.locked),
  body: pull.body || "",
  author: mapUser(pull.user),
  labels: Array.isArray(pull.labels) ? pull.labels.map(mapLabel) : [],
  requestedReviewers: Array.isArray(pull.requested_reviewers)
    ? pull.requested_reviewers.map(mapUser)
    : [],
  head: pull.head
    ? {
        ref: pull.head.ref,
        sha: pull.head.sha,
        repo: pull.head.repo?.full_name || null,
        owner: pull.head.user?.login || null,
      }
    : null,
  base: pull.base
    ? {
        ref: pull.base.ref,
        sha: pull.base.sha,
        repo: pull.base.repo?.full_name || null,
        owner: pull.base.user?.login || null,
      }
    : null,
  mergeable: pull.mergeable ?? null,
  mergeableState: pull.mergeable_state || null,
  merged: Boolean(pull.merged),
  mergedAt: pull.merged_at || null,
  htmlUrl: pull.html_url,
  issueUrl: pull.issue_url || null,
  commits: pull.commits ?? null,
  additions: pull.additions ?? null,
  deletions: pull.deletions ?? null,
  changedFiles: pull.changed_files ?? null,
  comments: pull.comments ?? null,
  reviewComments: pull.review_comments ?? null,
  createdAt: pull.created_at,
  updatedAt: pull.updated_at,
  closedAt: pull.closed_at || null,
});

const mapPullFile = (file) => ({
  sha: file.sha || null,
  filename: file.filename,
  status: file.status,
  additions: Number(file.additions || 0),
  deletions: Number(file.deletions || 0),
  changes: Number(file.changes || 0),
  blobUrl: file.blob_url || null,
  rawUrl: file.raw_url || null,
  contentsUrl: file.contents_url || null,
  patch: file.patch || null,
});

const mapCommit = (commit) => ({
  sha: commit.sha,
  nodeId: commit.node_id || null,
  message: commit.commit?.message || commit.message || "",
  author: commit.commit?.author || commit.author || null,
  committer: commit.commit?.committer || commit.committer || null,
  htmlUrl: commit.html_url || null,
});

const mapReview = (review) => ({
  id: review.id,
  nodeId: review.node_id || null,
  body: review.body || "",
  state: review.state || null,
  commitId: review.commit_id || null,
  author: mapUser(review.user),
  htmlUrl: review.html_url || null,
  submittedAt: review.submitted_at || null,
  authorAssociation: review.author_association || null,
});

const mapProjectOwner = (owner) => {
  if (!owner) return null;
  return {
    type: owner.__typename || null,
    login: owner.login || null,
  };
};

const mapProjectV2 = (project) => ({
  id: project.id,
  number: project.number,
  title: project.title,
  shortDescription: project.shortDescription || "",
  public: Boolean(project.public),
  closed: Boolean(project.closed),
  url: project.url || null,
  owner: mapProjectOwner(project.owner),
  createdAt: project.createdAt || null,
  updatedAt: project.updatedAt || null,
  fields: Array.isArray(project.fields?.nodes)
    ? project.fields.nodes.filter(Boolean).map((field) => ({
        id: field.id,
        name: field.name,
        dataType: field.dataType || null,
        type: field.__typename || null,
        options: Array.isArray(field.options)
          ? field.options.map((option) => ({
              id: option.id,
              name: option.name,
              color: option.color || null,
              description: option.description || null,
            }))
          : [],
        iterations: Array.isArray(field.configuration?.iterations)
          ? field.configuration.iterations.map((iteration) => ({
              id: iteration.id,
              title: iteration.title,
              startDate: iteration.startDate,
              duration: iteration.duration,
            }))
          : [],
      }))
    : undefined,
});

const mapProjectContent = (content) => {
  if (!content) return null;
  const base = {
    type: content.__typename || null,
    id: content.id || null,
    title: content.title || "",
    url: content.url || null,
  };
  if (content.__typename === "Issue" || content.__typename === "PullRequest") {
    return {
      ...base,
      number: content.number || null,
      state: content.state || null,
      repository: content.repository?.nameWithOwner || null,
      author: mapUser(content.author),
    };
  }
  return {
    ...base,
    body: content.body || "",
  };
};

const mapProjectFieldValue = (value) => {
  if (!value) return null;
  const base = {
    id: value.id || null,
    type: value.__typename || null,
    field: value.field
      ? {
          id: value.field.id,
          name: value.field.name,
          dataType: value.field.dataType || null,
        }
      : null,
    updatedAt: value.updatedAt || null,
  };
  if (value.__typename === "ProjectV2ItemFieldTextValue") return { ...base, text: value.text || "" };
  if (value.__typename === "ProjectV2ItemFieldNumberValue") return { ...base, number: value.number ?? null };
  if (value.__typename === "ProjectV2ItemFieldDateValue") return { ...base, date: value.date || null };
  if (value.__typename === "ProjectV2ItemFieldSingleSelectValue") {
    return {
      ...base,
      optionId: value.optionId || null,
      name: value.name || "",
      color: value.color || null,
    };
  }
  if (value.__typename === "ProjectV2ItemFieldIterationValue") {
    return {
      ...base,
      iterationId: value.iterationId || null,
      title: value.title || "",
      startDate: value.startDate || null,
      duration: value.duration || null,
    };
  }
  return base;
};

const mapProjectItem = (item) => ({
  id: item.id,
  type: item.type || null,
  archived: Boolean(item.archived ?? item.isArchived),
  content: mapProjectContent(item.content),
  fieldValues: Array.isArray(item.fieldValues?.nodes)
    ? item.fieldValues.nodes.filter(Boolean).map(mapProjectFieldValue)
    : [],
  createdAt: item.createdAt || null,
  updatedAt: item.updatedAt || null,
});

const normalizeIssueQuery = (options = {}) => pickDefined({
  state: normalizeEnum(options.state, ["open", "closed", "all"], "open", "state"),
  labels: normalizeStringList(options.labels, "labels", { limit: 50, itemBytes: 256 })?.join(","),
  assignee: options.assignee
    ? assertText(options.assignee, "assignee", { maxBytes: 80, trim: true })
    : undefined,
  mentioned: options.mentioned
    ? assertText(options.mentioned, "mentioned", { maxBytes: 80, trim: true })
    : undefined,
  milestone: options.milestone === undefined || options.milestone === null || options.milestone === ""
    ? undefined
    : String(options.milestone),
  since: normalizeDateTimeFilter(options.since, "since"),
  sort: normalizeEnum(options.sort, ["created", "updated", "comments"], "updated", "sort"),
  direction: normalizeEnum(options.direction, ["asc", "desc"], "desc", "direction"),
  per_page: normalizePerPage(options.perPage ?? options.per_page),
  page: normalizePage(options.page),
});

const normalizeIssueMutationBody = (options = {}, mode = "create") => {
  if (!isPlainObject(options)) {
    throw new GithubServiceError("Issue payload must be an object.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  const body = {};

  if (mode === "create" || hasOwn(options, "title")) {
    body.title = assertText(options.title, "title", { maxBytes: 1024, trim: true });
  }
  if (hasOwn(options, "body")) {
    body.body = assertText(options.body, "body", { required: false });
  }
  if (hasOwn(options, "assignees")) {
    body.assignees = normalizeStringList(options.assignees, "assignees", {
      limit: 100,
      itemBytes: 80,
      pattern: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/,
    });
  }
  if (hasOwn(options, "labels")) {
    body.labels = normalizeStringList(options.labels, "labels", { limit: 100, itemBytes: 256 });
  }
  if (hasOwn(options, "milestone")) {
    body.milestone = options.milestone === null ? null : assertOptionalInteger(options.milestone, "milestone");
  }
  if (mode === "update" && hasOwn(options, "state")) {
    body.state = normalizeEnum(options.state, ["open", "closed"], "open", "state");
  }
  if (mode === "update" && hasOwn(options, "stateReason")) {
    body.state_reason = normalizeEnum(
      options.stateReason,
      ["completed", "not_planned", "reopened"],
      "completed",
      "stateReason",
    );
  }

  if (Object.keys(body).length === 0) {
    throw new GithubServiceError("Issue update payload is empty.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return body;
};

const normalizePullQuery = (options = {}) => pickDefined({
  state: normalizeEnum(options.state, ["open", "closed", "all"], "open", "state"),
  head: options.head ? assertPullHead(options.head) : undefined,
  base: options.base ? assertGitRef(options.base, "base") : undefined,
  sort: normalizeEnum(options.sort, ["created", "updated", "popularity", "long-running"], "updated", "sort"),
  direction: normalizeEnum(options.direction, ["asc", "desc"], "desc", "direction"),
  per_page: normalizePerPage(options.perPage ?? options.per_page),
  page: normalizePage(options.page),
});

const normalizePullCreateBody = (options = {}) => {
  const body = {
    title: assertText(options.title, "title", { maxBytes: 1024, trim: true }),
    head: assertPullHead(options.head),
    base: assertGitRef(options.base, "base"),
  };
  if (hasOwn(options, "body")) body.body = assertText(options.body, "body", { required: false });
  if (hasOwn(options, "maintainerCanModify")) {
    body.maintainer_can_modify = Boolean(options.maintainerCanModify);
  } else if (hasOwn(options, "maintainer_can_modify")) {
    body.maintainer_can_modify = Boolean(options.maintainer_can_modify);
  }
  if (hasOwn(options, "draft")) body.draft = Boolean(options.draft);
  return body;
};

const normalizePullUpdateBody = (options = {}) => {
  const body = {};
  if (hasOwn(options, "title")) body.title = assertText(options.title, "title", { maxBytes: 1024, trim: true });
  if (hasOwn(options, "body")) body.body = assertText(options.body, "body", { required: false });
  if (hasOwn(options, "state")) body.state = normalizeEnum(options.state, ["open", "closed"], "open", "state");
  if (hasOwn(options, "base")) body.base = assertGitRef(options.base, "base");
  if (hasOwn(options, "maintainerCanModify")) body.maintainer_can_modify = Boolean(options.maintainerCanModify);
  if (hasOwn(options, "maintainer_can_modify")) body.maintainer_can_modify = Boolean(options.maintainer_can_modify);
  if (Object.keys(body).length === 0) {
    throw new GithubServiceError("Pull request update payload is empty.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return body;
};

const normalizeReviewComments = (comments) => {
  if (comments === undefined || comments === null) return undefined;
  if (!Array.isArray(comments)) {
    throw new GithubServiceError("review comments must be an array.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  if (comments.length > MAX_REVIEW_COMMENTS) {
    throw new GithubServiceError("review comments has too many entries.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }
  return comments.map((comment) => {
    if (!isPlainObject(comment)) {
      throw new GithubServiceError("review comment must be an object.", {
        code: "GITHUB_INVALID_ARGUMENT",
      });
    }
    const next = {
      path: assertText(comment.path, "review comment path", { maxBytes: 4096, trim: true }),
      body: assertText(comment.body, "review comment body"),
    };
    if (hasOwn(comment, "position")) next.position = assertPositiveInteger(comment.position, "position");
    if (hasOwn(comment, "line")) next.line = assertPositiveInteger(comment.line, "line");
    if (hasOwn(comment, "side")) next.side = normalizeEnum(comment.side, ["LEFT", "RIGHT"], "RIGHT", "side");
    if (hasOwn(comment, "startLine")) next.start_line = assertPositiveInteger(comment.startLine, "startLine");
    if (hasOwn(comment, "start_line")) next.start_line = assertPositiveInteger(comment.start_line, "start_line");
    if (hasOwn(comment, "startSide")) next.start_side = normalizeEnum(comment.startSide, ["LEFT", "RIGHT"], "RIGHT", "startSide");
    if (hasOwn(comment, "start_side")) next.start_side = normalizeEnum(comment.start_side, ["LEFT", "RIGHT"], "RIGHT", "start_side");
    return next;
  });
};

const normalizeReviewBody = (options = {}) => {
  const body = {};
  if (hasOwn(options, "commitId")) body.commit_id = assertText(options.commitId, "commitId", { maxBytes: 80, trim: true });
  if (hasOwn(options, "commit_id")) body.commit_id = assertText(options.commit_id, "commit_id", { maxBytes: 80, trim: true });
  if (hasOwn(options, "body")) body.body = assertText(options.body, "body", { required: false });
  if (hasOwn(options, "event") && options.event) {
    body.event = normalizeEnum(options.event, ["APPROVE", "REQUEST_CHANGES", "COMMENT"], "COMMENT", "event");
  }
  const comments = normalizeReviewComments(options.comments);
  if (comments) body.comments = comments;
  return body;
};

const normalizeMergeBody = (options = {}) => pickDefined({
  commit_title: hasOwn(options, "commitTitle")
    ? assertText(options.commitTitle, "commitTitle", { required: false, maxBytes: 512 })
    : hasOwn(options, "commit_title")
      ? assertText(options.commit_title, "commit_title", { required: false, maxBytes: 512 })
      : undefined,
  commit_message: hasOwn(options, "commitMessage")
    ? assertText(options.commitMessage, "commitMessage", { required: false })
    : hasOwn(options, "commit_message")
      ? assertText(options.commit_message, "commit_message", { required: false })
      : undefined,
  sha: hasOwn(options, "sha") ? assertText(options.sha, "sha", { maxBytes: 80, trim: true }) : undefined,
  merge_method: normalizeEnum(options.mergeMethod ?? options.merge_method, ["merge", "squash", "rebase"], "merge", "mergeMethod"),
});

const normalizeProjectFieldValue = (value) => {
  if (!isPlainObject(value)) {
    throw new GithubServiceError("Project field value must be an object.", {
      code: "GITHUB_INVALID_ARGUMENT",
    });
  }

  const result = {};
  if (hasOwn(value, "text")) result.text = assertText(value.text, "text", { required: false, maxBytes: 8192 });
  if (hasOwn(value, "number")) {
    const number = Number(value.number);
    if (!Number.isFinite(number)) {
      throw new GithubServiceError("number field value must be finite.", {
        code: "GITHUB_INVALID_ARGUMENT",
      });
    }
    result.number = number;
  }
  if (hasOwn(value, "date")) {
    const text = assertText(value.date, "date", { maxBytes: 32, trim: true });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new GithubServiceError("date field value must use YYYY-MM-DD.", {
        code: "GITHUB_INVALID_ARGUMENT",
      });
    }
    result.date = text;
  }
  if (hasOwn(value, "singleSelectOptionId")) {
    result.singleSelectOptionId = assertNodeId(value.singleSelectOptionId, "singleSelectOptionId");
  }
  if (hasOwn(value, "single_select_option_id")) {
    result.singleSelectOptionId = assertNodeId(value.single_select_option_id, "single_select_option_id");
  }
  if (hasOwn(value, "iterationId")) result.iterationId = assertNodeId(value.iterationId, "iterationId");
  if (hasOwn(value, "iteration_id")) result.iterationId = assertNodeId(value.iteration_id, "iteration_id");

  if (Object.keys(result).length !== 1) {
    throw new GithubServiceError(
      "Project field value must contain exactly one of text, number, date, singleSelectOptionId, or iterationId.",
      { code: "GITHUB_INVALID_ARGUMENT" },
    );
  }
  return result;
};

const PROJECT_V2_FIELDS = `
  id
  number
  title
  shortDescription
  public
  closed
  url
  createdAt
  updatedAt
  owner {
    __typename
    ... on User { login }
    ... on Organization { login }
  }
`;

const PROJECT_V2_FIELD_NODES = `
  fields(first: $fieldsFirst) {
    nodes {
      __typename
      ... on ProjectV2FieldCommon {
        id
        name
        dataType
      }
      ... on ProjectV2SingleSelectField {
        id
        name
        dataType
        options {
          id
          name
          color
          description
        }
      }
      ... on ProjectV2IterationField {
        id
        name
        dataType
        configuration {
          iterations {
            id
            title
            startDate
            duration
          }
        }
      }
    }
  }
`;

const PROJECT_V2_ITEM_NODE = `
  id
  type
  isArchived
  createdAt
  updatedAt
  content {
    __typename
    ... on Issue {
      id
      number
      title
      state
      url
      repository { nameWithOwner }
      author {
        __typename
        login
        ... on User { avatarUrl url }
      }
    }
    ... on PullRequest {
      id
      number
      title
      state
      url
      repository { nameWithOwner }
      author {
        __typename
        login
        ... on User { avatarUrl url }
      }
    }
    ... on DraftIssue {
      id
      title
      body
    }
  }
  fieldValues(first: 20) {
    nodes {
      __typename
      ... on ProjectV2ItemFieldTextValue {
        id
        text
        updatedAt
        field { ... on ProjectV2FieldCommon { id name dataType } }
      }
      ... on ProjectV2ItemFieldNumberValue {
        id
        number
        updatedAt
        field { ... on ProjectV2FieldCommon { id name dataType } }
      }
      ... on ProjectV2ItemFieldDateValue {
        id
        date
        updatedAt
        field { ... on ProjectV2FieldCommon { id name dataType } }
      }
      ... on ProjectV2ItemFieldSingleSelectValue {
        id
        optionId
        name
        color
        updatedAt
        field { ... on ProjectV2FieldCommon { id name dataType } }
      }
      ... on ProjectV2ItemFieldIterationValue {
        id
        iterationId
        title
        startDate
        duration
        updatedAt
        field { ... on ProjectV2FieldCommon { id name dataType } }
      }
    }
  }
`;

const createGithubService = ({ tokenStore }) => {
  const getToken = async (expectedScopes = REQUIRED_SCOPES) => {
    const token = await tokenStore.getToken(TOKEN_SERVICE);
    if (!token) {
      throw new GithubServiceError("GitHub is not authenticated. Sign in to GitHub before retrying.", {
        code: "GITHUB_AUTH_REQUIRED",
        scopes: {
          requiredScopes: expectedScopes,
          grantedScopes: [],
          missingScopes: expectedScopes,
          hasRequiredScopes: false,
        },
        hint: `Authorize GitHub with scopes: ${expectedScopes.join(", ")}.`,
      });
    }
    return token;
  };

  const request = async (apiPath, options = {}) => {
    const expectedScopes = options.expectedScopes || REPO_SCOPE;
    const token = await getToken(expectedScopes);

    const url = new URL(assertRelativeApiPath(apiPath), GITHUB_API_BASE);
    for (const [key, value] of Object.entries(options.query || {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const hasBody = hasOwn(options, "body") && options.body !== undefined;
    const body = hasBody ? assertJsonBodySize(options.body, MAX_BODY_BYTES, "GitHub request body") : undefined;

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": USER_AGENT,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        },
        body,
        signal: controller.signal,
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw normalizeHttpError(response, data, { expectedScopes });
      }
      return data;
    } catch (error) {
      if (error instanceof GithubServiceError) throw error;
      if (error?.name === "AbortError") {
        throw new GithubServiceError("GitHub request timed out.", {
          code: "GITHUB_TIMEOUT",
        });
      }
      throw new GithubServiceError(`GitHub network request failed: ${error?.message || "unknown error"}`, {
        code: "GITHUB_NETWORK_ERROR",
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const graphql = async (query, variables = {}, options = {}) => {
    const expectedScopes = options.expectedScopes || PROJECT_SCOPE;
    const token = await getToken(expectedScopes);
    const body = assertJsonBodySize({ query, variables }, MAX_GRAPHQL_VARIABLE_BYTES, "GitHub GraphQL request body");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(GITHUB_GRAPHQL_URL, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body,
        signal: controller.signal,
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw normalizeHttpError(response, data, { expectedScopes });
      }
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const rateLimit = extractRateLimit(response.headers);
        const scopes = extractScopeHint(response.headers, expectedScopes);
        const hint = buildErrorHint(403, rateLimit, scopes);
        throw new GithubServiceError(
          data.errors.map((error) => error.message).filter(Boolean).join("; ") || "GitHub GraphQL request failed.",
          {
            code: scopes.missingScopes.length > 0 ? "GITHUB_SCOPE_REQUIRED" : "GITHUB_GRAPHQL_ERROR",
            status: 200,
            rateLimit,
            scopes,
            errors: normalizeGithubErrors(data.errors),
            hint,
          },
        );
      }
      return data?.data || {};
    } catch (error) {
      if (error instanceof GithubServiceError) throw error;
      if (error?.name === "AbortError") {
        throw new GithubServiceError("GitHub GraphQL request timed out.", {
          code: "GITHUB_TIMEOUT",
        });
      }
      throw new GithubServiceError(`GitHub GraphQL request failed: ${error?.message || "unknown error"}`, {
        code: "GITHUB_NETWORK_ERROR",
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    async getViewer() {
      const user = await request("/user", { expectedScopes: ["read:user"] });
      return {
        id: user.id,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
      };
    },

    async listRepositories(options = {}) {
      const repos = await request("/user/repos", {
        expectedScopes: REPO_SCOPE,
        query: {
          visibility: options.visibility || "all",
          affiliation: options.affiliation || "owner,collaborator,organization_member",
          sort: options.sort || "updated",
          direction: options.direction || "desc",
          per_page: normalizePerPage(options.perPage),
          page: normalizePage(options.page),
        },
      });

      return {
        repositories: repos.map((repo) => ({
          id: repo.id,
          nodeId: repo.node_id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          defaultBranch: repo.default_branch,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          sshUrl: repo.ssh_url,
          updatedAt: repo.updated_at,
        })),
      };
    },

    async getRateLimit() {
      return request("/rate_limit", { expectedScopes: [] });
    },

    async listIssues(options = {}) {
      const repo = assertRepoRef(options);
      const issues = await request(`/repos/${repoPath(repo)}/issues`, {
        expectedScopes: REPO_SCOPE,
        query: normalizeIssueQuery(options),
      });
      const includePullRequests = Boolean(options.includePullRequests);
      return {
        issues: issues
          .filter((issue) => includePullRequests || !issue.pull_request)
          .map(mapIssue),
      };
    },

    async getIssue(options = {}) {
      const repo = assertRepoRef(options);
      const issueNumber = assertPositiveInteger(options.issueNumber ?? options.number, "issueNumber");
      const issue = await request(`/repos/${repoPath(repo)}/issues/${issueNumber}`, {
        expectedScopes: REPO_SCOPE,
      });
      return { issue: mapIssue(issue) };
    },

    async createIssue(options = {}) {
      const repo = assertRepoRef(options);
      const issue = await request(`/repos/${repoPath(repo)}/issues`, {
        method: "POST",
        expectedScopes: REPO_SCOPE,
        body: normalizeIssueMutationBody(options, "create"),
      });
      return { issue: mapIssue(issue) };
    },

    async updateIssue(options = {}) {
      const repo = assertRepoRef(options);
      const issueNumber = assertPositiveInteger(options.issueNumber ?? options.number, "issueNumber");
      const issue = await request(`/repos/${repoPath(repo)}/issues/${issueNumber}`, {
        method: "PATCH",
        expectedScopes: REPO_SCOPE,
        body: normalizeIssueMutationBody(options, "update"),
      });
      return { issue: mapIssue(issue) };
    },

    async listIssueComments(options = {}) {
      const repo = assertRepoRef(options);
      const issueNumber = assertPositiveInteger(options.issueNumber ?? options.number, "issueNumber");
      const comments = await request(`/repos/${repoPath(repo)}/issues/${issueNumber}/comments`, {
        expectedScopes: REPO_SCOPE,
        query: {
          per_page: normalizePerPage(options.perPage ?? options.per_page),
          page: normalizePage(options.page),
          since: normalizeDateTimeFilter(options.since, "since"),
        },
      });
      return { comments: comments.map(mapComment) };
    },

    async createIssueComment(options = {}) {
      const repo = assertRepoRef(options);
      const issueNumber = assertPositiveInteger(options.issueNumber ?? options.number, "issueNumber");
      const comment = await request(`/repos/${repoPath(repo)}/issues/${issueNumber}/comments`, {
        method: "POST",
        expectedScopes: REPO_SCOPE,
        body: {
          body: assertText(options.body, "body"),
        },
      });
      return { comment: mapComment(comment) };
    },

    async listPullRequests(options = {}) {
      const repo = assertRepoRef(options);
      const pulls = await request(`/repos/${repoPath(repo)}/pulls`, {
        expectedScopes: REPO_SCOPE,
        query: normalizePullQuery(options),
      });
      return { pullRequests: pulls.map(mapPullRequest) };
    },

    async getPullRequest(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const pull = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}`, {
        expectedScopes: REPO_SCOPE,
      });
      return { pullRequest: mapPullRequest(pull) };
    },

    async createPullRequest(options = {}) {
      const repo = assertRepoRef(options);
      const pull = await request(`/repos/${repoPath(repo)}/pulls`, {
        method: "POST",
        expectedScopes: REPO_SCOPE,
        body: normalizePullCreateBody(options),
      });
      return { pullRequest: mapPullRequest(pull) };
    },

    async updatePullRequest(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const pull = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}`, {
        method: "PATCH",
        expectedScopes: REPO_SCOPE,
        body: normalizePullUpdateBody(options),
      });
      return { pullRequest: mapPullRequest(pull) };
    },

    async listPullRequestFiles(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const files = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}/files`, {
        expectedScopes: REPO_SCOPE,
        query: {
          per_page: normalizePerPage(options.perPage ?? options.per_page),
          page: normalizePage(options.page),
        },
      });
      return { files: files.map(mapPullFile) };
    },

    async listPullRequestCommits(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const commits = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}/commits`, {
        expectedScopes: REPO_SCOPE,
        query: {
          per_page: normalizePerPage(options.perPage ?? options.per_page),
          page: normalizePage(options.page),
        },
      });
      return { commits: commits.map(mapCommit) };
    },

    async listPullRequestReviews(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const reviews = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}/reviews`, {
        expectedScopes: REPO_SCOPE,
        query: {
          per_page: normalizePerPage(options.perPage ?? options.per_page),
          page: normalizePage(options.page),
        },
      });
      return { reviews: reviews.map(mapReview) };
    },

    async createPullRequestReview(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const review = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}/reviews`, {
        method: "POST",
        expectedScopes: REPO_SCOPE,
        body: normalizeReviewBody(options),
      });
      return { review: mapReview(review) };
    },

    async mergePullRequest(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const result = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}/merge`, {
        method: "PUT",
        expectedScopes: REPO_SCOPE,
        body: normalizeMergeBody(options),
      });
      return {
        merged: Boolean(result?.merged),
        message: result?.message || "",
        sha: result?.sha || null,
      };
    },

    async updatePullRequestBranch(options = {}) {
      const repo = assertRepoRef(options);
      const pullNumber = assertPositiveInteger(options.pullNumber ?? options.number, "pullNumber");
      const body = {};
      if (hasOwn(options, "expectedHeadSha")) {
        body.expected_head_sha = assertText(options.expectedHeadSha, "expectedHeadSha", {
          maxBytes: 80,
          trim: true,
        });
      }
      if (hasOwn(options, "expected_head_sha")) {
        body.expected_head_sha = assertText(options.expected_head_sha, "expected_head_sha", {
          maxBytes: 80,
          trim: true,
        });
      }
      const result = await request(`/repos/${repoPath(repo)}/pulls/${pullNumber}/update-branch`, {
        method: "PUT",
        expectedScopes: REPO_SCOPE,
        body,
      });
      return { message: result?.message || "Branch update queued." };
    },

    async listProjectsV2(options = {}) {
      const ownerType = normalizeEnum(
        options.ownerType || options.type || (options.login || options.owner ? "user" : "viewer"),
        ["viewer", "user", "organization"],
        "viewer",
        "ownerType",
      );
      const first = normalizeFirst(options.first ?? options.perPage, 25);
      const after = assertOptionalCursor(options.after);
      const variables = { first, after };
      let query;

      if (ownerType === "viewer") {
        query = `
          query NexusCodeViewerProjects($first: Int!, $after: String) {
            viewer {
              login
              projectsV2(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
                pageInfo { hasNextPage endCursor }
                nodes { ${PROJECT_V2_FIELDS} }
              }
            }
          }
        `;
      } else {
        variables.login = assertOwner(options.login || options.owner, "login");
        const rootField = ownerType === "organization" ? "organization" : "user";
        query = `
          query NexusCodeOwnerProjects($login: String!, $first: Int!, $after: String) {
            ${rootField}(login: $login) {
              login
              projectsV2(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
                pageInfo { hasNextPage endCursor }
                nodes { ${PROJECT_V2_FIELDS} }
              }
            }
          }
        `;
      }

      const data = await graphql(query, variables, { expectedScopes: PROJECT_SCOPE });
      const owner = ownerType === "viewer"
        ? data.viewer
        : data[ownerType === "organization" ? "organization" : "user"];
      if (!owner) {
        throw new GithubServiceError("GitHub Projects v2 owner was not found.", {
          code: "GITHUB_NOT_FOUND",
          hint: "Check ownerType and login.",
        });
      }
      return {
        owner: { type: ownerType, login: owner.login || null },
        projects: (owner.projectsV2?.nodes || []).filter(Boolean).map(mapProjectV2),
        pageInfo: owner.projectsV2?.pageInfo || { hasNextPage: false, endCursor: null },
      };
    },

    async getProjectV2(options = {}) {
      const projectId = assertNodeId(options.projectId || options.id, "projectId");
      const fieldsFirst = normalizeFirst(options.fieldsFirst, 50);
      const data = await graphql(
        `
          query NexusCodeProject($projectId: ID!, $fieldsFirst: Int!) {
            node(id: $projectId) {
              __typename
              ... on ProjectV2 {
                ${PROJECT_V2_FIELDS}
                ${PROJECT_V2_FIELD_NODES}
              }
            }
          }
        `,
        { projectId, fieldsFirst },
        { expectedScopes: PROJECT_SCOPE },
      );
      if (data.node?.__typename !== "ProjectV2") {
        throw new GithubServiceError("GitHub Projects v2 project was not found.", {
          code: "GITHUB_NOT_FOUND",
        });
      }
      return { project: mapProjectV2(data.node) };
    },

    async listProjectV2Items(options = {}) {
      const projectId = assertNodeId(options.projectId || options.id, "projectId");
      const first = normalizeFirst(options.first ?? options.perPage, 25);
      const after = assertOptionalCursor(options.after);
      const data = await graphql(
        `
          query NexusCodeProjectItems($projectId: ID!, $first: Int!, $after: String) {
            node(id: $projectId) {
              __typename
              ... on ProjectV2 {
                id
                items(first: $first, after: $after) {
                  pageInfo { hasNextPage endCursor }
                  nodes { ${PROJECT_V2_ITEM_NODE} }
                }
              }
            }
          }
        `,
        { projectId, first, after },
        { expectedScopes: PROJECT_SCOPE },
      );
      if (data.node?.__typename !== "ProjectV2") {
        throw new GithubServiceError("GitHub Projects v2 project was not found.", {
          code: "GITHUB_NOT_FOUND",
        });
      }
      return {
        items: (data.node.items?.nodes || []).filter(Boolean).map(mapProjectItem),
        pageInfo: data.node.items?.pageInfo || { hasNextPage: false, endCursor: null },
      };
    },

    async addProjectV2ItemById(options = {}) {
      const projectId = assertNodeId(options.projectId, "projectId");
      const contentId = assertNodeId(options.contentId || options.nodeId, "contentId");
      const data = await graphql(
        `
          mutation NexusCodeAddProjectItem($projectId: ID!, $contentId: ID!) {
            addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
              item { id type isArchived createdAt updatedAt }
            }
          }
        `,
        { projectId, contentId },
        { expectedScopes: PROJECT_SCOPE },
      );
      return { item: mapProjectItem(data.addProjectV2ItemById?.item || {}) };
    },

    async updateProjectV2ItemFieldValue(options = {}) {
      const projectId = assertNodeId(options.projectId, "projectId");
      const itemId = assertNodeId(options.itemId, "itemId");
      const fieldId = assertNodeId(options.fieldId, "fieldId");
      const value = normalizeProjectFieldValue(options.value);
      const data = await graphql(
        `
          mutation NexusCodeUpdateProjectItemField(
            $projectId: ID!
            $itemId: ID!
            $fieldId: ID!
            $value: ProjectV2FieldValue!
          ) {
            updateProjectV2ItemFieldValue(
              input: {
                projectId: $projectId
                itemId: $itemId
                fieldId: $fieldId
                value: $value
              }
            ) {
              projectV2Item { id type isArchived createdAt updatedAt }
            }
          }
        `,
        { projectId, itemId, fieldId, value },
        { expectedScopes: PROJECT_SCOPE },
      );
      return { item: mapProjectItem(data.updateProjectV2ItemFieldValue?.projectV2Item || {}) };
    },
  };
};

module.exports = {
  GithubServiceError,
  createGithubService,
};
