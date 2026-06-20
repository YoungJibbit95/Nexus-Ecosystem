import { SETTINGS_SCHEMA_VERSION } from "./settingsSchema";
import type { DeepPartial, NexusSettings, SettingsPlatform } from "./settingsTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const inferPlatform = (value: unknown): SettingsPlatform => {
  if (!isRecord(value)) return "desktop";
  if (value.platform === "mobile") return "mobile";
  if (isRecord(value.mobile) && value.mobile.enabled === true) return "mobile";
  return "desktop";
};

const migrateLegacyThemePayload = (
  raw: Record<string, unknown>,
): DeepPartial<NexusSettings> => ({
  version: SETTINGS_SCHEMA_VERSION,
  platform: inferPlatform(raw),
  appearance: {
    themePreset: raw.mode === "light" ? "light" : "dark",
    accentColor: typeof raw.accent === "string" ? raw.accent : undefined,
    backgroundStyle: isRecord(raw.background) && raw.background.mode === "aurora" ? "aurora" : undefined,
    glassIntensity:
      isRecord(raw.glassmorphism) && Number(raw.glassmorphism.glassDepth) >= 1.6
        ? "deep"
        : undefined,
    density:
      isRecord(raw.qol) && raw.qol.panelDensity === "compact"
        ? "compact"
        : undefined,
  },
  layout: {
    sidebarPosition: raw.sidebarPosition === "right" ? "right" : undefined,
    sidebarStyle: typeof raw.sidebarStyle === "string" ? raw.sidebarStyle as never : undefined,
    compactMode: isRecord(raw.visual) && raw.visual.compactMode === true,
    toolbarStyle:
      isRecord(raw.toolbar) && typeof raw.toolbar.toolbarMode === "string"
        ? raw.toolbar.toolbarMode as never
        : undefined,
  },
  motion: {
    reducedMotion: isRecord(raw.qol) && raw.qol.reducedMotion === true,
    disableParticles: isRecord(raw.animations) && raw.animations.particleEffects === false,
    adaptiveRendering: true,
  },
  accessibility: {
    highContrast: isRecord(raw.qol) && raw.qol.highContrast === true,
  },
});

export const migrateSettingsPayload = (payload: unknown): DeepPartial<NexusSettings> => {
  const raw = isRecord(payload) ? payload : {};
  const candidate = isRecord(raw.settings) ? raw.settings : raw;

  if (!isRecord(candidate)) {
    return { version: SETTINGS_SCHEMA_VERSION, platform: "desktop" };
  }

  if (
    "accent" in candidate ||
    "glassmorphism" in candidate ||
    "qol" in candidate ||
    "toolbar" in candidate
  ) {
    return migrateLegacyThemePayload(candidate);
  }

  const version =
    typeof candidate.version === "number" && Number.isFinite(candidate.version)
      ? candidate.version
      : 0;

  if (version >= SETTINGS_SCHEMA_VERSION) {
    return candidate as DeepPartial<NexusSettings>;
  }

  return {
    ...(candidate as DeepPartial<NexusSettings>),
    version: SETTINGS_SCHEMA_VERSION,
    platform: inferPlatform(candidate),
  };
};
