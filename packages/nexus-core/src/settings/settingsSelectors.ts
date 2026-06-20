import type { NexusSettings } from "./settingsTypes";

export const selectAppearanceSettings = (settings: NexusSettings) => settings.appearance;
export const selectLayoutSettings = (settings: NexusSettings) => settings.layout;
export const selectMotionSettings = (settings: NexusSettings) => settings.motion;
export const selectAccessibilitySettings = (settings: NexusSettings) => settings.accessibility;
export const selectWorkspaceSettings = (settings: NexusSettings) => settings.workspace;
export const selectDataSettings = (settings: NexusSettings) => settings.data;
export const selectDeveloperSettings = (settings: NexusSettings) => settings.developer;
export const selectMobileSettings = (settings: NexusSettings) => settings.mobile;

export const selectEffectiveMotionSettings = (settings: NexusSettings) => ({
  reducedMotion: settings.motion.reducedMotion || settings.accessibility.reducedTransparency,
  disableHeavyBlur:
    settings.motion.disableHeavyBlur ||
    settings.motion.lowPowerMode ||
    settings.accessibility.reducedTransparency,
  disableParticles: settings.motion.disableParticles || settings.motion.lowPowerMode,
  adaptiveRendering: settings.motion.adaptiveRendering || settings.platform === "mobile",
});

export const selectDeveloperVisible = (settings: NexusSettings, isDevelopment: boolean) =>
  isDevelopment && settings.developer.enabled;
