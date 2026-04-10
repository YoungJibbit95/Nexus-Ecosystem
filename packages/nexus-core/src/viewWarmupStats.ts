import {
  NEXUS_VIEW_ORDER,
  type NexusViewId,
  type NexusViewTransitionStats,
} from "./views";

export type NexusWarmupStatsPayload = {
  transitionStats: NexusViewTransitionStats;
  recentViews: NexusViewId[];
};

const DB_NAME = "nexus-view-warmup";
const STORE_NAME = "viewWarmupStats";
const DB_VERSION = 1;
const RECENT_VIEWS_LIMIT = 8;
const KNOWN_VIEWS = new Set<NexusViewId>(NEXUS_VIEW_ORDER);

type PersistedStatsRow = {
  appId: string;
  updatedAt: number;
  version: number;
  transitionStats: NexusViewTransitionStats;
  recentViews: string[];
};

const EMPTY_STATS: NexusWarmupStatsPayload = {
  transitionStats: {},
  recentViews: [],
};

const hasIndexedDb = () =>
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).indexedDB !== "undefined";

let warmupDbPromise: Promise<IDBDatabase | null> | null = null;

const openWarmupDb = () => {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (warmupDbPromise) return warmupDbPromise;

  warmupDbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = (globalThis as any).indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "appId" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return warmupDbPromise;
};

const sanitizeRecentViews = (value: unknown): NexusViewId[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<NexusViewId>();
  const next: NexusViewId[] = [];
  value.forEach((candidate) => {
    if (typeof candidate !== "string") return;
    const viewId = candidate as NexusViewId;
    if (!KNOWN_VIEWS.has(viewId) || seen.has(viewId)) return;
    seen.add(viewId);
    next.push(viewId);
  });
  return next.slice(0, RECENT_VIEWS_LIMIT);
};

const sanitizeTransitionStats = (
  value: unknown,
): NexusViewTransitionStats => {
  if (!value || typeof value !== "object") return {};

  const source = value as Record<string, unknown>;
  const next: NexusViewTransitionStats = {};
  Object.entries(source).forEach(([from, targetMap]) => {
    const fromView = from as NexusViewId;
    if (!KNOWN_VIEWS.has(fromView) || !targetMap || typeof targetMap !== "object") {
      return;
    }

    const targetSource = targetMap as Record<string, unknown>;
    const nextTarget: Partial<Record<NexusViewId, number>> = {};
    Object.entries(targetSource).forEach(([to, rawWeight]) => {
      const toView = to as NexusViewId;
      if (!KNOWN_VIEWS.has(toView)) return;
      const weight = Number(rawWeight);
      if (!Number.isFinite(weight) || weight <= 0) return;
      nextTarget[toView] = Math.min(10_000, Math.round(weight));
    });

    if (Object.keys(nextTarget).length > 0) {
      next[fromView] = nextTarget;
    }
  });

  return next;
};

const getStoreRequest = async (
  mode: IDBTransactionMode,
): Promise<IDBObjectStore | null> => {
  const db = await openWarmupDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  } catch {
    return null;
  }
};

export const loadViewWarmupStats = async (
  appId: string,
): Promise<NexusWarmupStatsPayload> => {
  if (!appId) return EMPTY_STATS;
  const store = await getStoreRequest("readonly");
  if (!store) return EMPTY_STATS;

  return new Promise<NexusWarmupStatsPayload>((resolve) => {
    try {
      const req = store.get(appId);
      req.onsuccess = () => {
        const row = req.result as PersistedStatsRow | undefined;
        if (!row) {
          resolve(EMPTY_STATS);
          return;
        }
        resolve({
          transitionStats: sanitizeTransitionStats(row.transitionStats),
          recentViews: sanitizeRecentViews(row.recentViews),
        });
      };
      req.onerror = () => resolve(EMPTY_STATS);
    } catch {
      resolve(EMPTY_STATS);
    }
  });
};

export const saveViewWarmupStats = async (
  appId: string,
  payload: NexusWarmupStatsPayload,
): Promise<boolean> => {
  if (!appId) return false;
  const store = await getStoreRequest("readwrite");
  if (!store) return false;

  const row: PersistedStatsRow = {
    appId,
    updatedAt: Date.now(),
    version: 1,
    transitionStats: sanitizeTransitionStats(payload.transitionStats),
    recentViews: sanitizeRecentViews(payload.recentViews),
  };

  return new Promise<boolean>((resolve) => {
    try {
      const req = store.put(row);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
};
