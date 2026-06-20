import { createDefaultSettings, resetSettingsSection } from "./settingsDefaults";
import {
  exportSettingsToJson,
  loadSettings,
  parseSettingsImportPayload,
  saveSettings,
} from "./settingsPersistence";
import type {
  DeepPartial,
  NexusSettings,
  SettingsPlatform,
  SettingsResetScope,
} from "./settingsTypes";
import { normalizeSettings } from "./settingsValidation";

type SettingsListener = (settings: NexusSettings) => void;

export interface SettingsStore {
  getState: () => NexusSettings;
  setSettings: (settings: DeepPartial<NexusSettings>) => NexusSettings;
  reset: (scope?: SettingsResetScope) => NexusSettings;
  importSettings: (payload: unknown) => ReturnType<typeof parseSettingsImportPayload>;
  exportSettings: () => string;
  subscribe: (listener: SettingsListener) => () => void;
}

export const createSettingsStore = (
  platform: SettingsPlatform = "desktop",
  storage?: Storage,
): SettingsStore => {
  let state = loadSettings(platform, storage);
  const listeners = new Set<SettingsListener>();
  const emit = () => listeners.forEach((listener) => listener(state));
  const commit = (settings: NexusSettings) => {
    state = settings;
    saveSettings(state, storage);
    emit();
    return state;
  };

  return {
    getState: () => state,
    setSettings: (settings) => {
      const normalized = normalizeSettings({ ...state, ...settings }, state.platform);
      return commit(normalized.settings);
    },
    reset: (scope = "all") => {
      if (scope === "all") return commit(createDefaultSettings(state.platform));
      return commit(resetSettingsSection(state, scope));
    },
    importSettings: (payload) => {
      const result = parseSettingsImportPayload(payload, state.platform);
      if (result.ok) commit(result.settings);
      return result;
    },
    exportSettings: () => exportSettingsToJson(state),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const settingsStore = createSettingsStore();

export const useSettingsStore = <T = NexusSettings>(
  selector: (settings: NexusSettings) => T = (settings) => settings as T,
): T => selector(settingsStore.getState());
