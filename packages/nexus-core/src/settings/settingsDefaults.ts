import { SETTINGS_SCHEMA_VERSION } from "./settingsSchema";
import type { DeepPartial, NexusSettings, SettingsPlatform } from "./settingsTypes";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const mergeObject = <T extends object>(
  base: T,
  incoming?: DeepPartial<T>,
): T => {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return clone(base);
  }

  const output = clone(base) as Record<string, unknown>;
  Object.entries(incoming).forEach(([key, value]) => {
    if (value === undefined) return;
    const current = output[key];
    if (
      current &&
      value &&
      typeof current === "object" &&
      typeof value === "object" &&
      !Array.isArray(current) &&
      !Array.isArray(value)
    ) {
      output[key] = mergeObject(
        current as Record<string, unknown>,
        value as DeepPartial<Record<string, unknown>>,
      );
      return;
    }
    output[key] = value;
  });
  return output as T;
};

export const DEFAULT_NEXUS_SETTINGS: NexusSettings = {
  version: SETTINGS_SCHEMA_VERSION,
  platform: "desktop",
  appearance: {
    themePreset: "system",
    accentColor: "#007AFF",
    backgroundStyle: "solid",
    glassIntensity: "balanced",
    fontScale: "default",
    density: "comfortable",
  },
  layout: {
    sidebarPosition: "left",
    sidebarStyle: "default",
    compactMode: false,
    toolbarStyle: "island",
  },
  motion: {
    reducedMotion: false,
    disableHeavyBlur: false,
    disableParticles: false,
    lowPowerMode: false,
    adaptiveRendering: true,
  },
  accessibility: {
    largerText: false,
    highContrast: false,
    visibleFocusRings: true,
    reducedTransparency: false,
  },
  workspace: {
    restoreLastView: true,
    safeModeOnBootFailure: true,
    autosaveIntervalMs: 2000,
    backupRetention: 5,
  },
  data: {
    validateImports: true,
    backupBeforeImport: true,
    clearCacheOnLogout: false,
  },
  developer: {
    enabled: false,
    featureFlags: {},
    renderDiagnostics: false,
    runtimeMetrics: false,
  },
  mobile: {
    navigationStyle: "tabs",
    largeTapTargets: true,
    haptics: true,
    preferNativeSheets: true,
    keepCanvasControlsMinimal: true,
  },
};

export const createDefaultSettings = (
  platform: SettingsPlatform = "desktop",
  overrides?: DeepPartial<NexusSettings>,
): NexusSettings =>
  mergeObject(DEFAULT_NEXUS_SETTINGS, {
    platform,
    ...overrides,
  });

export const createSettingsSectionDefaults = <K extends keyof NexusSettings>(
  section: K,
): NexusSettings[K] => clone(DEFAULT_NEXUS_SETTINGS[section]);

export const resetSettingsSection = (
  settings: NexusSettings,
  section: keyof Omit<NexusSettings, "version" | "platform"> | "all",
): NexusSettings => {
  if (section === "all") {
    return createDefaultSettings(settings.platform);
  }
  return {
    ...settings,
    [section]: createSettingsSectionDefaults(section),
  };
};
