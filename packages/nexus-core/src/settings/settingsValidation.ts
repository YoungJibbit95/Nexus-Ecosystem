import { createDefaultSettings } from "./settingsDefaults";
import { SETTINGS_ALLOWED, SETTINGS_SCHEMA_VERSION } from "./settingsSchema";
import type {
  DeepPartial,
  NexusSettings,
  SettingsPlatform,
  SettingsValidationIssue,
} from "./settingsTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const has = <T extends string>(allowed: readonly T[], value: unknown): value is T =>
  typeof value === "string" && allowed.includes(value as T);

const bool = (value: unknown, fallback: boolean, issues: SettingsValidationIssue[], path: string): boolean => {
  if (typeof value === "boolean") return value;
  if (value !== undefined) issues.push({ path, message: "Expected boolean; default was used." });
  return fallback;
};

const finiteNumber = (
  value: unknown,
  fallback: number,
  issues: SettingsValidationIssue[],
  path: string,
  min: number,
  max: number,
): number => {
  const next = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  if (value !== undefined && next === fallback && value !== fallback) {
    issues.push({ path, message: "Expected finite number; default was used." });
  }
  return Math.max(min, Math.min(max, next));
};

const enumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  issues: SettingsValidationIssue[],
  path: string,
): T => {
  if (has(allowed, value)) return value;
  if (value !== undefined) issues.push({ path, message: "Unknown option; default was used." });
  return fallback;
};

const stringValue = (
  value: unknown,
  fallback: string,
  issues: SettingsValidationIssue[],
  path: string,
): string => {
  if (typeof value === "string" && value.trim()) return value;
  if (value !== undefined) issues.push({ path, message: "Expected string; default was used." });
  return fallback;
};

const featureFlags = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
};

export const normalizeSettings = (
  payload: DeepPartial<NexusSettings>,
  platform: SettingsPlatform = "desktop",
): { settings: NexusSettings; warnings: SettingsValidationIssue[] } => {
  const warnings: SettingsValidationIssue[] = [];
  const defaults = createDefaultSettings(platform);
  const raw = isRecord(payload) ? payload : {};
  const appearance = isRecord(raw.appearance) ? raw.appearance : {};
  const layout = isRecord(raw.layout) ? raw.layout : {};
  const motion = isRecord(raw.motion) ? raw.motion : {};
  const accessibility = isRecord(raw.accessibility) ? raw.accessibility : {};
  const workspace = isRecord(raw.workspace) ? raw.workspace : {};
  const data = isRecord(raw.data) ? raw.data : {};
  const developer = isRecord(raw.developer) ? raw.developer : {};
  const mobile = isRecord(raw.mobile) ? raw.mobile : {};
  const selectedPlatform = enumValue(
    raw.platform,
    SETTINGS_ALLOWED.platform,
    defaults.platform,
    warnings,
    "platform",
  );

  const settings: NexusSettings = {
    version: SETTINGS_SCHEMA_VERSION,
    platform: selectedPlatform,
    appearance: {
      themePreset: enumValue(appearance.themePreset, SETTINGS_ALLOWED.themePreset, defaults.appearance.themePreset, warnings, "appearance.themePreset"),
      accentColor: stringValue(appearance.accentColor, defaults.appearance.accentColor, warnings, "appearance.accentColor"),
      backgroundStyle: enumValue(appearance.backgroundStyle, SETTINGS_ALLOWED.backgroundStyle, defaults.appearance.backgroundStyle, warnings, "appearance.backgroundStyle"),
      glassIntensity: enumValue(appearance.glassIntensity, SETTINGS_ALLOWED.glassIntensity, defaults.appearance.glassIntensity, warnings, "appearance.glassIntensity"),
      fontScale: enumValue(appearance.fontScale, SETTINGS_ALLOWED.fontScale, defaults.appearance.fontScale, warnings, "appearance.fontScale"),
      density: enumValue(appearance.density, SETTINGS_ALLOWED.density, defaults.appearance.density, warnings, "appearance.density"),
    },
    layout: {
      sidebarPosition: enumValue(layout.sidebarPosition, SETTINGS_ALLOWED.sidebarPosition, defaults.layout.sidebarPosition, warnings, "layout.sidebarPosition"),
      sidebarStyle: enumValue(layout.sidebarStyle, SETTINGS_ALLOWED.sidebarStyle, defaults.layout.sidebarStyle, warnings, "layout.sidebarStyle"),
      compactMode: bool(layout.compactMode, defaults.layout.compactMode, warnings, "layout.compactMode"),
      toolbarStyle: enumValue(layout.toolbarStyle, SETTINGS_ALLOWED.toolbarStyle, defaults.layout.toolbarStyle, warnings, "layout.toolbarStyle"),
    },
    motion: {
      reducedMotion: bool(motion.reducedMotion, defaults.motion.reducedMotion, warnings, "motion.reducedMotion"),
      disableHeavyBlur: bool(motion.disableHeavyBlur, defaults.motion.disableHeavyBlur, warnings, "motion.disableHeavyBlur"),
      disableParticles: bool(motion.disableParticles, defaults.motion.disableParticles, warnings, "motion.disableParticles"),
      lowPowerMode: bool(motion.lowPowerMode, defaults.motion.lowPowerMode, warnings, "motion.lowPowerMode"),
      adaptiveRendering: bool(motion.adaptiveRendering, defaults.motion.adaptiveRendering, warnings, "motion.adaptiveRendering"),
    },
    accessibility: {
      largerText: bool(accessibility.largerText, defaults.accessibility.largerText, warnings, "accessibility.largerText"),
      highContrast: bool(accessibility.highContrast, defaults.accessibility.highContrast, warnings, "accessibility.highContrast"),
      visibleFocusRings: bool(accessibility.visibleFocusRings, defaults.accessibility.visibleFocusRings, warnings, "accessibility.visibleFocusRings"),
      reducedTransparency: bool(accessibility.reducedTransparency, defaults.accessibility.reducedTransparency, warnings, "accessibility.reducedTransparency"),
    },
    workspace: {
      restoreLastView: bool(workspace.restoreLastView, defaults.workspace.restoreLastView, warnings, "workspace.restoreLastView"),
      safeModeOnBootFailure: bool(workspace.safeModeOnBootFailure, defaults.workspace.safeModeOnBootFailure, warnings, "workspace.safeModeOnBootFailure"),
      autosaveIntervalMs: finiteNumber(workspace.autosaveIntervalMs, defaults.workspace.autosaveIntervalMs, warnings, "workspace.autosaveIntervalMs", 500, 60000),
      backupRetention: finiteNumber(workspace.backupRetention, defaults.workspace.backupRetention, warnings, "workspace.backupRetention", 1, 50),
    },
    data: {
      validateImports: bool(data.validateImports, defaults.data.validateImports, warnings, "data.validateImports"),
      backupBeforeImport: bool(data.backupBeforeImport, defaults.data.backupBeforeImport, warnings, "data.backupBeforeImport"),
      clearCacheOnLogout: bool(data.clearCacheOnLogout, defaults.data.clearCacheOnLogout, warnings, "data.clearCacheOnLogout"),
    },
    developer: {
      enabled: bool(developer.enabled, defaults.developer.enabled, warnings, "developer.enabled"),
      featureFlags: featureFlags(developer.featureFlags),
      renderDiagnostics: bool(developer.renderDiagnostics, defaults.developer.renderDiagnostics, warnings, "developer.renderDiagnostics"),
      runtimeMetrics: bool(developer.runtimeMetrics, defaults.developer.runtimeMetrics, warnings, "developer.runtimeMetrics"),
    },
    mobile: {
      navigationStyle: enumValue(mobile.navigationStyle, SETTINGS_ALLOWED.mobileNavigationStyle, defaults.mobile.navigationStyle, warnings, "mobile.navigationStyle"),
      largeTapTargets: bool(mobile.largeTapTargets, defaults.mobile.largeTapTargets, warnings, "mobile.largeTapTargets"),
      haptics: bool(mobile.haptics, defaults.mobile.haptics, warnings, "mobile.haptics"),
      preferNativeSheets: bool(mobile.preferNativeSheets, defaults.mobile.preferNativeSheets, warnings, "mobile.preferNativeSheets"),
      keepCanvasControlsMinimal: bool(mobile.keepCanvasControlsMinimal, defaults.mobile.keepCanvasControlsMinimal, warnings, "mobile.keepCanvasControlsMinimal"),
    },
  };

  return { settings, warnings };
};

export const validateSettingsPayload = (
  payload: DeepPartial<NexusSettings>,
  platform: SettingsPlatform = "desktop",
) => normalizeSettings(payload, platform);
