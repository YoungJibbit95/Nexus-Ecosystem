"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const key = (value) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
const inside = (value, root) => key(value) === key(root) || key(value).startsWith(`${key(root).replace(/[\\/]$/, "")}${path.sep}`);
const denied = () => new Error("WORKSPACE_TRUST_REQUIRED: Restricted workspace. Trust this folder through the native confirmation to enable execution.");

// Main-process only. Never expose grant() directly as a renderer-controlled boolean.
function createWorkspaceTrustStore({ getUserDataPath }) {
  let loaded = false;
  let storageError = false;
  let secureDirectory;
  let filename;
  let revision = 0;
  let records = new Map();

  const identity = (root) => {
    const canonical = fs.realpathSync(root);
    const stat = fs.statSync(canonical, { bigint: true });
    if (!stat.isDirectory() || key(root) !== key(canonical)) throw denied();
    return `${stat.dev}:${stat.ino}:${stat.birthtimeNs}`;
  };
  const initialize = () => {
    if (loaded) return;
    loaded = true;
    secureDirectory = path.join(path.resolve(getUserDataPath()), "secure");
    try {
      fs.mkdirSync(secureDirectory, { recursive: true, mode: 0o700 });
      secureDirectory = fs.realpathSync(secureDirectory);
      filename = path.join(secureDirectory, "workspace-trust-v1.json");
      let body;
      try {
        const stat = fs.lstatSync(filename);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) throw denied();
        body = fs.readFileSync(filename, "utf8");
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      const data = JSON.parse(body);
      if (data?.version !== 1 || !Array.isArray(data.roots) || data.roots.length > 1000) throw denied();
      for (const entry of data.roots) {
        if (!entry || typeof entry.path !== "string" || !path.isAbsolute(entry.path) || entry.path.includes("\0") || entry.path.length > 4096 || !/^\d+:\d+:\d+$/.test(entry.identity)) throw denied();
        if (records.has(key(entry.path))) throw denied();
        records.set(key(entry.path), { path: entry.path, identity: entry.identity });
      }
    } catch {
      records.clear();
      storageError = true;
    }
  };
  const persist = () => {
    if (storageError) throw new Error("WORKSPACE_TRUST_STORAGE_UNAVAILABLE: Trust storage requires repair outside the workspace.");
    const temp = path.join(secureDirectory, `trust-${crypto.randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temp, JSON.stringify({ version: 1, roots: [...records.values()] }), { flag: "wx", mode: 0o600 });
      fs.renameSync(temp, filename);
    } catch {
      storageError = true;
      records.clear();
      try { fs.unlinkSync(temp); } catch {}
      throw new Error("WORKSPACE_TRUST_STORAGE_UNAVAILABLE: Execution is restricted. Trust changes could not be saved; repair trust storage before restarting.");
    }
  };
  const status = (root) => {
    initialize();
    let trusted = false;
    try { trusted = !storageError && records.get(key(root))?.identity === identity(root); } catch {}
    return { path: root, trusted, mode: trusted ? "trusted" : "restricted", revision, storageError };
  };
  const assertTrusted = (root, expectedRevision = revision) => {
    if (expectedRevision !== revision || !status(root).trusted) throw denied();
  };
  return {
    status,
    identity,
    getRevision: () => revision,
    assertTrusted,
    grant(root, expectedRevision, expectedIdentity) {
      initialize();
      if (expectedRevision !== revision || identity(root) !== expectedIdentity) throw denied();
      if (records.size >= 1000 && !records.has(key(root))) throw new Error("Workspace trust limit reached.");
      records.set(key(root), { path: root, identity: identity(root) });
      revision += 1;
      persist();
      return status(root);
    },
    revoke(root, stopExecution = () => {}) {
      initialize();
      records.delete(key(root));
      revision += 1;
      // Invalidate permits and stop managed execution even if persistence fails.
      stopExecution();
      persist();
      return status(root);
    },
    assertWritable(candidate) {
      initialize();
      // Also guard ancestors: deleting/renaming userData must not replace trust state.
      const lexicalDirectory = path.join(path.resolve(getUserDataPath()), "secure");
      for (const protectedPath of [lexicalDirectory, secureDirectory]) {
        if (inside(candidate, protectedPath) || inside(protectedPath, candidate)) {
          throw new Error("Protected application security metadata cannot be modified.");
        }
      }
      if (storageError && !filename) throw new Error("Application security path is unavailable; writes are restricted.");
    },
  };
}

module.exports = { createWorkspaceTrustStore };
