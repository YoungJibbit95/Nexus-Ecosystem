const DEFAULT_DEBOUNCE_MS = 1400;
const DEFAULT_IDLE_TIMEOUT_MS = 1200;
const DEFAULT_FLUSH_BUDGET_MS = 9;

const canUseLocalStorage = () =>
  typeof window !== "undefined" && !!window.localStorage;

const runIdle = (task, timeoutMs = DEFAULT_IDLE_TIMEOUT_MS) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(task, { timeout: timeoutMs });
    return;
  }
  globalThis.setTimeout(task, Math.min(180, timeoutMs));
};

export function createQueuedStorageManager(options = {}) {
  const debounceMs = Math.max(250, Number(options.debounceMs || DEFAULT_DEBOUNCE_MS));
  const idleTimeoutMs = Math.max(
    200,
    Number(options.idleTimeoutMs || DEFAULT_IDLE_TIMEOUT_MS),
  );
  const flushBudgetMs = Math.max(4, Number(options.flushBudgetMs || DEFAULT_FLUSH_BUDGET_MS));

  const pending = new Map();
  const lastSerialized = new Map();
  let flushTimer = null;
  let flushQueued = false;

  const flushNow = () => {
    if (!canUseLocalStorage() || pending.size === 0) {
      flushQueued = false;
      return;
    }
    const entries = Array.from(pending.entries());
    pending.clear();
    const startedAt =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : 0;
    for (let i = 0; i < entries.length; i += 1) {
      const [key, value] = entries[i];
      try {
        const serialized = JSON.stringify(value);
        if (lastSerialized.get(key) !== serialized) {
          window.localStorage.setItem(key, serialized);
          lastSerialized.set(key, serialized);
        }
      } catch {
        // Ignore storage errors to keep editor responsive.
      }
      if (i < entries.length - 1 && typeof performance !== "undefined") {
        if (performance.now() - startedAt > flushBudgetMs) {
          for (let j = i + 1; j < entries.length; j += 1) {
            const [restKey, restValue] = entries[j];
            pending.set(restKey, restValue);
          }
          break;
        }
      }
    }
    flushQueued = false;
    if (pending.size > 0) {
      queueFlush();
    }
  };

  const queueFlush = () => {
    if (flushQueued) return;
    flushQueued = true;
    runIdle(flushNow, idleTimeoutMs);
  };

  const scheduleFlush = () => {
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer);
    }
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      queueFlush();
    }, debounceMs);
  };

  const flushSync = () => {
    if (!canUseLocalStorage() || pending.size === 0) return;
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer);
      flushTimer = null;
    }
    const entries = Array.from(pending.entries());
    pending.clear();
    flushQueued = false;
    for (const [key, value] of entries) {
      try {
        const serialized = JSON.stringify(value);
        if (lastSerialized.get(key) !== serialized) {
          window.localStorage.setItem(key, serialized);
          lastSerialized.set(key, serialized);
        }
      } catch {
        // Ignore flush failures while backgrounding/app close.
      }
    }
  };

  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", flushSync);
  }

  return {
    readJson(key, fallback = null) {
      if (!canUseLocalStorage()) return fallback;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        lastSerialized.set(key, raw);
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    writeJson(key, value) {
      pending.set(key, value);
      if (canUseLocalStorage()) {
        scheduleFlush();
      }
    },
    remove(key) {
      pending.delete(key);
      lastSerialized.delete(key);
      if (!canUseLocalStorage()) return;
      if (flushTimer !== null && pending.size === 0) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      window.localStorage.removeItem(key);
    },
    flushSync,
  };
}
