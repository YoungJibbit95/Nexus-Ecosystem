"use strict";

const fs = require("fs");
const path = require("path");
const { runProcess } = require("./processRunner.cjs");
const { createSanitizedProcessEnv } = require("./safeProcessEnv.cjs");

const key = value => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
const inside = (value, root) => key(value) === key(root) || key(value).startsWith(`${key(root).replace(/[\\/]$/, "")}${path.sep}`);
const boundaryError = () => new Error("GIT_WORKSPACE_BOUNDARY: Git metadata must stay inside the selected workspace.");
const isInspection = args => ["status", "diff", "log", "remote", "rev-parse"].includes(args[0]) ||
  (args[0] === "branch" && args[1]?.startsWith("--format="));

function assertSafeMetadataTree(roots) {
  const pending = [...new Set(roots)], seen = new Set();
  let count = 0;
  while (pending.length) {
    const directory = pending.pop();
    if (seen.has(key(directory))) continue;
    seen.add(key(directory));
    const handle = fs.opendirSync(directory);
    try {
      let entry;
      while ((entry = handle.readSync())) {
        // Bounded enumeration without following junctions/symlinks. Top-level
        // canonical checks alone do not constrain objects/xx or refs/heads links.
        if (++count > 100_000) throw new Error("GIT_SAFE_MODE_METADATA_LIMIT: Git metadata exceeds the supported inspection limit.");
        if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw boundaryError();
        if (entry.isDirectory()) pending.push(path.join(directory, entry.name));
      }
    } finally { handle.closeSync(); }
  }
}

function resolveRepository(cwd, root) {
  const canonicalRoot = fs.realpathSync(root);
  let worktree = fs.realpathSync(cwd);
  if (!inside(worktree, canonicalRoot)) throw boundaryError();
  const bounded = target => {
    const canonical = fs.realpathSync(target);
    if (!inside(canonical, canonicalRoot)) throw boundaryError();
    return canonical;
  };
  const readSmall = target => {
    const canonical = bounded(target);
    const stat = fs.statSync(canonical);
    if (!stat.isFile() || stat.size > 4096) throw boundaryError();
    return fs.readFileSync(canonical, "utf8").trim();
  };
  while (true) {
    const dotgit = path.join(worktree, ".git");
    let stat;
    try { stat = fs.statSync(dotgit); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (stat) {
      let gitdir = bounded(dotgit);
      if (stat.isFile()) {
        const match = /^gitdir: (.+)$/.exec(readSmall(gitdir));
        if (!match) throw boundaryError();
        gitdir = bounded(path.resolve(worktree, match[1]));
      }
      if (!fs.statSync(gitdir).isDirectory()) throw boundaryError();
      let common = gitdir;
      if (fs.existsSync(path.join(gitdir, "commondir"))) common = bounded(path.resolve(gitdir, readSmall(path.join(gitdir, "commondir"))));
      for (const config of [path.join(common, "config"), path.join(gitdir, "config.worktree")]) {
        if (fs.existsSync(config)) bounded(config);
      }
      for (const metadata of [path.join(gitdir, "HEAD"), path.join(gitdir, "index"), path.join(common, "objects"), path.join(common, "refs")]) {
        if (fs.existsSync(metadata)) bounded(metadata);
      }
      assertSafeMetadataTree([gitdir, common]);
      return { worktree, gitdir, common };
    }
    if (key(worktree) === key(canonicalRoot)) throw new Error("GIT_WORKSPACE_BOUNDARY: No repository inside the selected workspace.");
    worktree = path.dirname(worktree);
    if (!inside(worktree, canonicalRoot)) throw boundaryError();
  }
}

function resolveGitExecutable(env, root) {
  const pathKey = Object.keys(env).find(name => name.toLowerCase() === "path");
  for (const directory of String(env[pathKey] || "").split(path.delimiter)) {
    if (!path.isAbsolute(directory) || inside(directory, root)) continue;
    try {
      const binary = fs.realpathSync(path.join(directory, process.platform === "win32" ? "git.exe" : "git"));
      if (!inside(binary, root) && fs.statSync(binary).isFile()) return binary;
    } catch {}
  }
  throw new Error("GIT_EXECUTABLE_UNAVAILABLE: Install Git on an absolute tool path outside this workspace.");
}

function createGitExecutionPolicy({ getContext, getSecurityDirectory, environment = process.env }) {
  if (typeof getContext !== "function" || typeof getSecurityDirectory !== "function") throw new Error("Git requires a native workspace policy.");
  const hooksDirectory = () => {
    const directory = path.join(getSecurityDirectory(), "git-empty-hooks");
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.readdirSync(directory).length !== 0) throw new Error("GIT_SAFE_MODE_UNAVAILABLE: Controlled hooks directory is not empty.");
    return fs.realpathSync(directory);
  };
  return async (cwd, args, options = {}) => {
    const context = getContext(cwd);
    const inspection = isInspection(args) && options.requireTrust !== true;
    if (!inspection && !context.trusted) throw new Error("WORKSPACE_TRUST_REQUIRED: Git changes require explicit workspace trust.");
    const repository = resolveRepository(cwd, context.root);
    // Even trusted inspection does not need hooks, user config or filters. Trusted
    // mutations retain normal hooks/identity; explicit trust authorizes execution.
    const env = createSanitizedProcessEnv({
      GIT_TERMINAL_PROMPT: "0", GIT_NO_LAZY_FETCH: "1", GIT_PROTOCOL_FROM_USER: "0",
      GIT_ALLOW_PROTOCOL: "",
      GIT_OPTIONAL_LOCKS: inspection ? "0" : "1",
      ...(inspection ? { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_SYSTEM: process.platform === "win32" ? "NUL" : "/dev/null", GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null" } : {}),
    }, { allowExtra: false, source: environment });
    const executable = resolveGitExecutable(env, context.root);
    const emptyHooks = inspection ? hooksDirectory() : null;
    const prefix = ["--no-pager", "--no-lazy-fetch", `--git-dir=${repository.gitdir}`, `--work-tree=${repository.worktree}`,
      "-c", "core.fsmonitor=false", "-c", "submodule.recurse=false", "-c", "fetch.recurseSubmodules=false",
      "-c", "protocol.allow=never", "-c", "protocol.file.allow=never", "-c", "protocol.ext.allow=never",
      "-c", "log.showSignature=false", "-c", "gc.auto=0", "-c", "maintenance.auto=false",
      ...(inspection ? ["-c", `core.hooksPath=${emptyHooks}`, "-c", "diff.submodule=short"] : [])];
    const execute = (commandArgs, overrides = {}) => runProcess(executable, [...prefix, ...commandArgs], {
      cwd: repository.worktree, env, timeoutMs: options.timeoutMs ?? 30_000,
      maxBufferBytes: options.maxBufferBytes ?? 8 * 1024 * 1024,
      input: options.input, maxInputBytes: options.maxInputBytes, ...overrides,
    });
    if (inspection) {
      // --no-includes and names only: no external configuration is followed or
      // emitted. Reject executable filters, including clean/process on status.
      for (const filename of [path.join(repository.common, "config"), path.join(repository.gitdir, "config.worktree")]) {
        if (!fs.existsSync(filename)) continue;
        // Parse the explicit bounded file away from the repository, so even Git's
        // early startup cannot discover/follow repository config includes.
        const config = await runProcess(executable, ["--no-pager", "config", "--file", filename, "--no-includes", "--null", "--name-only", "--list"], {
          cwd: emptyHooks, env: { ...env, GIT_CEILING_DIRECTORIES: path.dirname(emptyHooks) },
          timeoutMs: 5000, maxBufferBytes: 256 * 1024,
        });
        if (config.stdout.split("\0").some(name => /^(include(?:if)?\.|filter\.)/i.test(name))) {
          throw new Error("GIT_SAFE_MODE_UNSUPPORTED_CONFIG: Inspection is restricted because this repository uses config includes or content filters. File editing remains available.");
        }
      }
      for (const filename of ["alternates", "http-alternates"]) {
        if (fs.existsSync(path.join(repository.common, "objects", "info", filename))) {
          throw new Error("GIT_SAFE_MODE_UNSUPPORTED_CONFIG: Alternate object stores require separate authorization.");
        }
      }
    }
    const current = getContext(cwd);
    if (current.revision !== context.revision || key(current.root) !== key(context.root) || current.trusted !== context.trusted) {
      throw new Error("WORKSPACE_TRUST_REQUIRED: Workspace trust changed before Git execution; retry the operation.");
    }
    const currentRepository = resolveRepository(cwd, current.root);
    if (Object.keys(repository).some(name => key(repository[name]) !== key(currentRepository[name]))) throw boundaryError();
    return execute(args);
  };
}

module.exports = { createGitExecutionPolicy, resolveRepository, resolveGitExecutable };
