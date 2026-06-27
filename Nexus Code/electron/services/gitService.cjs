"use strict";

const path = require("path");
const { runProcess } = require("./processRunner.cjs");
const { parseGitStatus } = require("./gitStatusParser.cjs");

const MAX_REPO_PATH_LENGTH = 4096;
const MAX_PATHSPEC_BYTES = 64 * 1024;
const MAX_COMMIT_MESSAGE_BYTES = 64 * 1024;
const MAX_LOG_LIMIT = 200;

const byteLength = (value) => Buffer.byteLength(String(value ?? ""), "utf8");

const assertRepoPath = (repoPath) => {
  if (typeof repoPath !== "string" || repoPath.trim().length === 0) {
    throw new Error("Repository path must be a non-empty string.");
  }

  const resolved = path.resolve(repoPath);
  if (resolved.length > MAX_REPO_PATH_LENGTH || resolved.includes("\0")) {
    throw new Error("Repository path is not allowed.");
  }
  return resolved;
};

const assertGitName = (value, label) => {
  const text = String(value || "").trim();
  if (!text || text.includes("\0") || text.startsWith("-") || byteLength(text) > 512) {
    throw new Error(`${label} is not allowed.`);
  }
  return text;
};

const normalizePathspecs = (value) => {
  if (value === undefined || value === null) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => {
    const text = String(item || "");
    if (!text || text.includes("\0") || byteLength(text) > MAX_PATHSPEC_BYTES) {
      throw new Error("Git pathspec is not allowed.");
    }
    return text;
  });
};

const normalizeLimit = (value, fallback = 50) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(MAX_LOG_LIMIT, Math.max(1, Math.trunc(number)));
};

const redactRemoteUrl = (url) => String(url || "")
  .replace(/(https?:\/\/)([^/\s:@]+):([^@\s/]+)@/gi, "$1***:***@")
  .replace(/(https?:\/\/)([^@\s/]+)@/gi, "$1***@");

const git = (repoPath, args, options = {}) => runProcess("git", ["-C", assertRepoPath(repoPath), ...args], {
  timeoutMs: options.timeoutMs ?? 30_000,
  maxBufferBytes: options.maxBufferBytes ?? 8 * 1024 * 1024,
  input: options.input,
  maxInputBytes: options.maxInputBytes,
});

const parseBranches = (stdout) => String(stdout || "")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [name, upstream, commit, head, date] = line.split("\t");
    return {
      name,
      upstream: upstream || null,
      commit: commit || null,
      current: head === "*",
      lastCommitDate: date || null,
    };
  });

const parseLog = (stdout) => String(stdout || "")
  .split("\x1e")
  .map((record) => record.trim())
  .filter(Boolean)
  .map((record) => {
    const [hash, shortHash, authorName, authorEmail, date, subject] = record.split("\x1f");
    return {
      hash,
      shortHash,
      authorName,
      authorEmail,
      date,
      subject,
    };
  });

const parseRemotes = (stdout) => {
  const remotes = new Map();
  for (const line of String(stdout || "").split(/\r?\n/).filter(Boolean)) {
    const match = /^([^\s]+)\s+(.+?)\s+\((fetch|push)\)$/.exec(line.trim());
    if (!match) continue;
    const [, name, url, type] = match;
    const existing = remotes.get(name) || { name, fetchUrl: null, pushUrl: null };
    if (type === "fetch") existing.fetchUrl = redactRemoteUrl(url);
    if (type === "push") existing.pushUrl = redactRemoteUrl(url);
    remotes.set(name, existing);
  }
  return Array.from(remotes.values());
};

const createGitService = () => ({
  async status(repoPath) {
    const result = await git(repoPath, ["status", "--porcelain=v1", "-z", "--branch"], {
      maxBufferBytes: 16 * 1024 * 1024,
    });
    return parseGitStatus(result.stdout);
  },

  async diff(repoPath, options = {}) {
    const pathspecs = normalizePathspecs(options.paths || options.pathspecs);
    const args = ["diff", "--no-ext-diff"];
    if (options.staged || options.cached) args.push("--cached");
    if (options.stat) args.push("--stat");
    if (options.context !== undefined) {
      const context = Math.min(999, Math.max(0, Number(options.context) || 0));
      args.push(`--unified=${context}`);
    }
    if (pathspecs.length > 0) args.push("--", ...pathspecs);
    const result = await git(repoPath, args, { maxBufferBytes: 24 * 1024 * 1024 });
    return { diff: result.stdout };
  },

  async stage(repoPath, options = {}) {
    const pathspecs = normalizePathspecs(options.paths || options.pathspecs);
    const args = ["add"];
    if (options.all === true) {
      args.push("--all");
    } else {
      if (pathspecs.length === 0) throw new Error("Stage requires paths unless all=true.");
      args.push("--", ...pathspecs);
    }
    await git(repoPath, args);
    return { staged: pathspecs, all: options.all === true };
  },

  async unstage(repoPath, options = {}) {
    const pathspecs = normalizePathspecs(options.paths || options.pathspecs);
    const args = ["restore", "--staged"];
    if (options.all === true) {
      args.push("--", ".");
    } else {
      if (pathspecs.length === 0) throw new Error("Unstage requires paths unless all=true.");
      args.push("--", ...pathspecs);
    }
    await git(repoPath, args);
    return { unstaged: pathspecs, all: options.all === true };
  },

  async commit(repoPath, options = {}) {
    const message = String(options.message || "").trim();
    if (!message) throw new Error("Commit message is required.");
    if (byteLength(message) > MAX_COMMIT_MESSAGE_BYTES) {
      throw new Error("Commit message is too large.");
    }

    const args = ["commit"];
    if (options.all === true) args.push("-a");
    args.push("-F", "-");
    const result = await git(repoPath, args, {
      input: `${message}\n`,
      maxInputBytes: MAX_COMMIT_MESSAGE_BYTES + 1,
      maxBufferBytes: 12 * 1024 * 1024,
    });
    const head = await git(repoPath, ["rev-parse", "HEAD"]);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      hash: head.stdout.trim(),
    };
  },

  async branch(repoPath, options = {}) {
    const action = String(options.action || "list").trim().toLowerCase();
    if (action === "list") {
      const result = await git(repoPath, [
        "branch",
        "--format=%(refname:short)\t%(upstream:short)\t%(objectname:short)\t%(HEAD)\t%(committerdate:iso-strict)",
        "--sort=-committerdate",
      ]);
      return { branches: parseBranches(result.stdout) };
    }

    if (action === "create") {
      const name = assertGitName(options.name, "Branch name");
      const args = options.checkout === true ? ["switch", "-c", name] : ["branch", name];
      if (options.startPoint) args.push(assertGitName(options.startPoint, "Start point"));
      const result = await git(repoPath, args);
      return { action, name, stdout: result.stdout, stderr: result.stderr };
    }

    if (action === "checkout" || action === "switch") {
      const name = assertGitName(options.name, "Branch name");
      const result = await git(repoPath, ["switch", name]);
      return { action: "checkout", name, stdout: result.stdout, stderr: result.stderr };
    }

    if (action === "delete") {
      const name = assertGitName(options.name, "Branch name");
      const result = await git(repoPath, ["branch", options.force === true ? "-D" : "-d", name]);
      return { action, name, stdout: result.stdout, stderr: result.stderr };
    }

    throw new Error("Unsupported branch action.");
  },

  async log(repoPath, options = {}) {
    const pathspecs = normalizePathspecs(options.paths || options.pathspecs);
    const limit = normalizeLimit(options.limit, 50);
    const args = [
      "log",
      `--max-count=${limit}`,
      "--date=iso-strict",
      "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e",
    ];
    if (pathspecs.length > 0) args.push("--", ...pathspecs);
    const result = await git(repoPath, args, { maxBufferBytes: 16 * 1024 * 1024 });
    return { commits: parseLog(result.stdout) };
  },

  async remotes(repoPath) {
    const result = await git(repoPath, ["remote", "-v"]);
    return { remotes: parseRemotes(result.stdout) };
  },
});

module.exports = {
  createGitService,
  redactRemoteUrl,
};
