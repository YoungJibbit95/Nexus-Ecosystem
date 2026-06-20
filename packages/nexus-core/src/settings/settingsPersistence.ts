import { createDefaultSettings } from "./settingsDefaults";
import { migrateSettingsPayload } from "./settingsMigrations";
import {
  SETTINGS_SCHEMA_NAME,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from "./settingsSchema";
import { normalizeSettings } from "./settingsValidation";
import type {
  NexusSettings,
  SettingsExportPayload,
  SettingsParseResult,
  SettingsPlatform,
} from "./settingsTypes";

const getDefaultStorage = (): Storage | undefined => {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

export const safeJsonParse = <T = unknown>(
  raw: string | null | undefined,
  fallback: T,
): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const safeStorageGet = (
  key: string,
  fallback: string | null = null,
  storage: Storage | undefined = getDefaultStorage(),
): string | null => {
  try {
    return storage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const safeStorageSet = (
  key: string,
  value: string,
  storage: Storage | undefined = getDefaultStorage(),
): boolean => {
  try {
    storage?.setItem(key, value);
    return Boolean(storage);
  } catch {
    return false;
  }
};

export const safeStorageRemove = (
  key: string,
  storage: Storage | undefined = getDefaultStorage(),
): boolean => {
  try {
    storage?.removeItem(key);
    return Boolean(storage);
  } catch {
    return false;
  }
};

export const createPlatformApiGuard = <T extends Record<string, unknown>>(
  api: unknown,
  methodNames: Array<keyof T>,
): Partial<T> => {
  if (!api || typeof api !== "object") return {};
  const source = api as Record<string, unknown>;
  return methodNames.reduce<Partial<T>>((guarded, methodName) => {
    const value = source[String(methodName)];
    if (typeof value === "function") {
      guarded[methodName] = value as T[keyof T];
    }
    return guarded;
  }, {});
};

export const parseSettingsImportPayload = (
  payload: unknown,
  platform: SettingsPlatform = "desktop",
): SettingsParseResult => {
  const migrated = migrateSettingsPayload(payload);
  const normalized = normalizeSettings(migrated, platform);
  return {
    ok: true,
    settings: normalized.settings,
    warnings: normalized.warnings,
  };
};

export const loadSettings = (
  platform: SettingsPlatform = "desktop",
  storage: Storage | undefined = getDefaultStorage(),
): NexusSettings => {
  const raw = safeStorageGet(SETTINGS_STORAGE_KEY, null, storage);
  if (!raw) return createDefaultSettings(platform);
  const parsed = safeJsonParse<unknown>(raw, null);
  if (!parsed) return createDefaultSettings(platform);
  const result = parseSettingsImportPayload(parsed, platform);
  return result.ok ? result.settings : createDefaultSettings(platform);
};

export const saveSettings = (
  settings: NexusSettings,
  storage: Storage | undefined = getDefaultStorage(),
): boolean => safeStorageSet(SETTINGS_STORAGE_KEY, JSON.stringify(settings), storage);

export const createSettingsExportPayload = (
  settings: NexusSettings,
  exportedAt = new Date().toISOString(),
): SettingsExportPayload => ({
  schema: SETTINGS_SCHEMA_NAME,
  version: SETTINGS_SCHEMA_VERSION,
  exportedAt,
  settings,
});

export const exportSettingsToJson = (settings: NexusSettings): string =>
  JSON.stringify(createSettingsExportPayload(settings), null, 2);
