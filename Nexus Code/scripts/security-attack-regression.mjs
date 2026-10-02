import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module");

const loadSecureTokenStoreWithSafeStorage = (safeStorage) => {
  const modulePath = require.resolve("../electron/services/secureTokenStore.cjs");
  delete require.cache[modulePath];
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "electron") return { safeStorage };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
};

const { createNavigationPolicy } = require("../electron/services/navigationPolicy.cjs");
const {
  ACCOUNT_SESSION_STORAGE_KEY,
  clearNexusAccountSession,
  loadNexusAccountSession,
  saveNexusAccountSession,
} = await import("../src/app/accountSession.js");

class MemoryStorage {
  values = new Map();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key) { return this.values.get(key) ?? null; }
  key(index) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key) { this.values.delete(key); }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const distRoot = path.resolve("dist");
const production = createNavigationPolicy({
  dev: false,
  devUrl: "http://127.0.0.1:5175",
  distRoot,
});
const indexUrl = pathToFileURL(path.join(distRoot, "index.html")).toString();

assert.equal(production.isAllowedNavigation(indexUrl), true);
assert.equal(production.isAllowedNavigation(`${indexUrl}#/editor`), true);
assert.equal(production.isAllowedNavigation("file://attacker.invalid/share/payload.html"), false);
assert.equal(
  production.isAllowedNavigation(pathToFileURL(path.resolve("..", "outside.html")).toString()),
  false,
);
assert.equal(production.isAllowedNavigation("https://attacker.invalid/payload"), false);

const development = createNavigationPolicy({
  dev: true,
  devUrl: "http://127.0.0.1:5175",
  distRoot,
});
assert.equal(development.isAllowedNavigation("http://127.0.0.1:5175/editor"), true);
assert.equal(development.isAllowedNavigation("http://127.0.0.1:5175.evil.test/editor"), false);
assert.equal(development.isAllowedNavigation("http://localhost:5175/editor"), false);
assert.equal(development.isAllowedNavigation("https://127.0.0.1:5175/editor"), false);

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
globalThis.window = { localStorage, sessionStorage };
const savedSession = saveNexusAccountSession({
  authMode: "nexus",
  endpoint: "https://nexus-api.cloud",
  token: "nexus-bearer-secret",
  userId: "usr_security",
  username: "security-user",
  role: "user",
  userTier: "pro",
  expiresAt: Date.now() + 60_000,
});
assert.equal(savedSession.token, "nexus-bearer-secret");
assert.equal(localStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY), null);
assert.match(sessionStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY) || "", /nexus-bearer-secret/);

clearNexusAccountSession();
localStorage.setItem(ACCOUNT_SESSION_STORAGE_KEY, JSON.stringify(savedSession));
assert.equal(loadNexusAccountSession().token, "");
assert.equal(localStorage.getItem(ACCOUNT_SESSION_STORAGE_KEY), null);
delete globalThis.window;

const unavailableSafeStorage = {
  isEncryptionAvailable: () => false,
  encryptString: () => { throw new Error("must not encrypt without OS secure storage"); },
  decryptString: () => { throw new Error("must not decrypt without OS secure storage"); },
};
const secureStoreDir = await mkdtemp(path.join(os.tmpdir(), "nexus-code-token-store-"));
try {
  const { createSecureTokenStore } = loadSecureTokenStoreWithSafeStorage(unavailableSafeStorage);
  const tokenStore = createSecureTokenStore({ userDataPath: secureStoreDir });
  const rawGithubToken = "github-oauth-token-must-not-persist";
  await assert.rejects(
    tokenStore.setToken("github", rawGithubToken),
    /OS secure storage.*unavailable|secure storage.*required/i,
  );
  const storePath = path.join(secureStoreDir, "secure", "github-token-store.json");
  await assert.rejects(readFile(storePath, "utf8"), (error) => error?.code === "ENOENT");

  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify({
    version: 1,
    entries: { github: { mode: "machineLocal", cipherText: "legacy-opaque-ciphertext" } },
  }), "utf8");
  await assert.rejects(
    tokenStore.getToken("github"),
    /Legacy machine-local GitHub credential was removed/i,
  );
  const cleanedLegacyStore = JSON.parse(await readFile(storePath, "utf8"));
  assert.equal(cleanedLegacyStore.entries.github, undefined);
} finally {
  await rm(secureStoreDir, { recursive: true, force: true });
}

const availableSafeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`sealed:${Buffer.from(String(value), "utf8").toString("base64")}`),
  decryptString: (value) => {
    const encoded = String(value).replace(/^sealed:/, "");
    return Buffer.from(encoded, "base64").toString("utf8");
  },
};
const persistentStoreDir = await mkdtemp(path.join(os.tmpdir(), "nexus-code-token-store-safe-"));
try {
  const { createSecureTokenStore } = loadSecureTokenStoreWithSafeStorage(availableSafeStorage);
  const tokenStore = createSecureTokenStore({ userDataPath: persistentStoreDir });
  const rawGithubToken = "github-oauth-token-main-process-only";
  const saved = await tokenStore.setToken("github", rawGithubToken, {
    scope: "repo read:user",
    tokenHint: rawGithubToken,
  });
  assert.equal(saved.storageMode, "safeStorage");
  assert.doesNotMatch(JSON.stringify(saved), /github-oauth-token-main-process-only/);
  assert.equal(saved.metadata.tokenHint, undefined);
  const persisted = await readFile(
    path.join(persistentStoreDir, "secure", "github-token-store.json"),
    "utf8",
  );
  assert.doesNotMatch(persisted, /github-oauth-token-main-process-only/);
  assert.equal(await tokenStore.getToken("github"), rawGithubToken);
} finally {
  await rm(persistentStoreDir, { recursive: true, force: true });
}

const tokenStoreSource = await readFile(new URL("../electron/services/secureTokenStore.cjs", import.meta.url), "utf8");
assert.doesNotMatch(tokenStoreSource, /scryptSync|createCipheriv|machineFingerprint|encryptWithFallback/);

const electronMainSource = await readFile(new URL("../electron/main.cjs", import.meta.url), "utf8");
assert.match(electronMainSource, /const DEV = !app\.isPackaged && process\.env\.ELECTRON_DEV === "true";/);
assert.match(electronMainSource, /devTools:\s*DEV/);

console.log("[security-attack-regression] navigation attacks and disk-backed Nexus token persistence rejected");
