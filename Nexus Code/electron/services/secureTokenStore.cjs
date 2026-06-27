"use strict";

const crypto = require("crypto");
const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const { safeStorage } = require("electron");

const STORE_VERSION = 1;
const DEFAULT_STORE_FILE = "github-token-store.json";
const FALLBACK_CIPHER = "aes-256-gcm";

const machineFingerprint = (userDataPath) => {
  const user = (() => {
    try {
      return os.userInfo();
    } catch {
      return {};
    }
  })();

  return [
    "nexus-code-token-store",
    process.platform,
    process.arch,
    os.hostname(),
    user.username || "",
    user.homedir || os.homedir(),
    userDataPath,
  ].join("|");
};

const isSafeStorageAvailable = () => {
  try {
    return Boolean(safeStorage?.isEncryptionAvailable?.());
  } catch {
    return false;
  }
};

const encryptWithSafeStorage = (plainText) => ({
  mode: "safeStorage",
  cipherText: safeStorage.encryptString(plainText).toString("base64"),
});

const decryptWithSafeStorage = (entry) => (
  safeStorage.decryptString(Buffer.from(String(entry.cipherText || ""), "base64"))
);

const deriveFallbackKey = (userDataPath, salt) => crypto.scryptSync(
  machineFingerprint(userDataPath),
  Buffer.from(salt, "base64"),
  32,
);

const encryptWithFallback = (plainText, userDataPath) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = deriveFallbackKey(userDataPath, salt.toString("base64"));
  const cipher = crypto.createCipheriv(FALLBACK_CIPHER, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return {
    mode: "machineLocal",
    cipher: FALLBACK_CIPHER,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    cipherText: encrypted.toString("base64"),
  };
};

const decryptWithFallback = (entry, userDataPath) => {
  const key = deriveFallbackKey(userDataPath, String(entry.salt || ""));
  const decipher = crypto.createDecipheriv(
    entry.cipher || FALLBACK_CIPHER,
    key,
    Buffer.from(String(entry.iv || ""), "base64"),
  );
  decipher.setAuthTag(Buffer.from(String(entry.tag || ""), "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(entry.cipherText || ""), "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

const sanitizeMetadata = (metadata = {}) => {
  const result = {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return result;
  for (const [key, value] of Object.entries(metadata)) {
    if (/token|secret|password/i.test(key)) continue;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      result[key] = value;
    }
  }
  return result;
};

const createSecureTokenStore = (options = {}) => {
  const getUserDataPath = typeof options.getUserDataPath === "function"
    ? options.getUserDataPath
    : () => options.userDataPath || path.join(os.homedir(), ".nexus-code");
  const storeFileName = options.storeFileName || DEFAULT_STORE_FILE;

  const resolveStorePath = () => path.join(getUserDataPath(), "secure", storeFileName);

  const readStore = async () => {
    const storePath = resolveStorePath();
    try {
      const raw = await fs.readFile(storePath, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid token store.");
      return {
        version: parsed.version || STORE_VERSION,
        entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      };
    } catch (error) {
      if (error?.code === "ENOENT") return { version: STORE_VERSION, entries: {} };
      throw new Error("Token store could not be read.");
    }
  };

  const writeStore = async (store) => {
    const storePath = resolveStorePath();
    const dirPath = path.dirname(storePath);
    await fs.mkdir(dirPath, { recursive: true, mode: 0o700 });
    const tempPath = `${storePath}.${process.pid}.${Date.now()}.tmp`;
    const body = JSON.stringify({
      version: STORE_VERSION,
      entries: store.entries || {},
    }, null, 2);
    await fs.writeFile(tempPath, body, { encoding: "utf8", mode: 0o600 });
    await fs.rename(tempPath, storePath);
  };

  const encrypt = (plainText) => {
    const userDataPath = getUserDataPath();
    if (isSafeStorageAvailable()) {
      return encryptWithSafeStorage(plainText);
    }
    return encryptWithFallback(plainText, userDataPath);
  };

  const decrypt = (entry) => {
    if (!entry || typeof entry !== "object") return null;
    if (entry.mode === "safeStorage") {
      if (!isSafeStorageAvailable()) {
        throw new Error("OS secure storage is unavailable for this token.");
      }
      return decryptWithSafeStorage(entry);
    }
    if (entry.mode === "machineLocal") {
      return decryptWithFallback(entry, getUserDataPath());
    }
    throw new Error("Unsupported token storage mode.");
  };

  return {
    async setToken(service, token, metadata = {}) {
      const serviceName = String(service || "").trim();
      const plainText = String(token || "");
      if (!serviceName) throw new Error("Token service name is required.");
      if (!plainText) throw new Error("Token value is required.");
      const store = await readStore();
      store.entries[serviceName] = {
        ...encrypt(plainText),
        metadata: sanitizeMetadata(metadata),
        updatedAt: new Date().toISOString(),
      };
      await writeStore(store);
      return {
        service: serviceName,
        storageMode: store.entries[serviceName].mode,
        updatedAt: store.entries[serviceName].updatedAt,
        metadata: store.entries[serviceName].metadata,
      };
    },

    async getToken(service) {
      const serviceName = String(service || "").trim();
      if (!serviceName) throw new Error("Token service name is required.");
      const store = await readStore();
      const entry = store.entries[serviceName];
      if (!entry) return null;
      return decrypt(entry);
    },

    async getMetadata(service) {
      const serviceName = String(service || "").trim();
      if (!serviceName) throw new Error("Token service name is required.");
      const store = await readStore();
      const entry = store.entries[serviceName];
      if (!entry) return null;
      return {
        service: serviceName,
        storageMode: entry.mode,
        updatedAt: entry.updatedAt || null,
        metadata: sanitizeMetadata(entry.metadata),
      };
    },

    async hasToken(service) {
      const token = await this.getToken(service);
      return Boolean(token);
    },

    async deleteToken(service) {
      const serviceName = String(service || "").trim();
      if (!serviceName) throw new Error("Token service name is required.");
      const store = await readStore();
      const existed = Boolean(store.entries[serviceName]);
      delete store.entries[serviceName];
      await writeStore(store);
      return existed;
    },
  };
};

module.exports = {
  createSecureTokenStore,
};
