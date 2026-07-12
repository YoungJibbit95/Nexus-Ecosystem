import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
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

console.log("[security-attack-regression] navigation attacks and disk-backed Nexus token persistence rejected");
