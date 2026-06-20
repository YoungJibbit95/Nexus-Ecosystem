import {
  createDefaultSettings,
  exportSettingsToJson,
  parseSettingsImportPayload,
  type NexusSettings,
  type SettingsPlatform,
  type SettingsResetScope,
} from "@nexus/core/settings";
import type { BgMode, Theme } from "../../store/themeStore";

const FONT_BY_SCALE = {
  compact: "Inter",
  default: "Inter",
  large: "Atkinson Hyperlegible",
} as const;

const FONT_SIZE_BY_SCALE = {
  compact: 12,
  default: 14,
  large: 17,
} as const;

const GLASS_DEPTH_BY_INTENSITY = {
  off: 0.1,
  subtle: 0.55,
  balanced: 1,
  deep: 1.75,
} as const;

const backgroundStyleFromTheme = (mode: Theme["background"]["mode"]) => {
  if (mode === "mesh" || mode === "aurora" || mode === "noise") return mode;
  if (mode === "gradient" || mode === "animated-gradient") return "gradient";
  return "solid";
};

const backgroundModeFromSettings = (
  style: NexusSettings["appearance"]["backgroundStyle"],
): BgMode => {
  if (style === "mesh" || style === "aurora" || style === "noise") return style;
  if (style === "gradient") return "gradient";
  return "solid";
};

const glassIntensityFromTheme = (theme: Theme): NexusSettings["appearance"]["glassIntensity"] => {
  if (!theme.glassmorphism.frostedGlass || theme.glassmorphism.glassDepth <= 0.2) return "off";
  if (theme.glassmorphism.glassDepth < 0.8) return "subtle";
  if (theme.glassmorphism.glassDepth > 1.4) return "deep";
  return "balanced";
};

const fontScaleFromTheme = (theme: Theme): NexusSettings["appearance"]["fontScale"] => {
  if (theme.qol.fontSize >= 16) return "large";
  if (theme.qol.fontSize <= 12) return "compact";
  return "default";
};

export const buildSettingsSnapshotFromTheme = (
  theme: Theme,
  platform: SettingsPlatform,
): NexusSettings => ({
  ...createDefaultSettings(platform),
  appearance: {
    themePreset: theme.mode,
    accentColor: theme.accent,
    backgroundStyle: backgroundStyleFromTheme(theme.background.mode),
    glassIntensity: glassIntensityFromTheme(theme),
    fontScale: fontScaleFromTheme(theme),
    density: theme.qol.panelDensity,
  },
  layout: {
    sidebarPosition: theme.sidebarPosition,
    sidebarStyle: theme.sidebarStyle,
    compactMode: theme.visual.compactMode,
    toolbarStyle: theme.toolbar.toolbarMode,
  },
  motion: {
    reducedMotion: theme.qol.reducedMotion,
    disableHeavyBlur: theme.glassmorphism.panelRenderer !== "blur" || theme.blur.strength <= 8,
    disableParticles: !theme.animations.particleEffects,
    lowPowerMode: theme.qol.motionProfile === "minimal",
    adaptiveRendering: true,
  },
  accessibility: {
    largerText: theme.qol.fontSize >= 16,
    highContrast: theme.qol.highContrast,
    visibleFocusRings: true,
    reducedTransparency: theme.glassmorphism.tintOpacity <= 0.02,
  },
  mobile: {
    ...createDefaultSettings("mobile").mobile,
    navigationStyle: "tabs",
    largeTapTargets: true,
  },
});

export const exportSettingsSnapshotFromTheme = (
  theme: Theme,
  platform: SettingsPlatform,
) => exportSettingsToJson(buildSettingsSnapshotFromTheme(theme, platform));

export const applySettingsToTheme = (
  theme: Theme,
  settings: NexusSettings,
  scope: SettingsResetScope = "all",
) => {
  if (scope === "all" || scope === "appearance") {
    if (settings.appearance.themePreset === "light" || settings.appearance.themePreset === "dark") {
      theme.setMode(settings.appearance.themePreset);
    }
    theme.setColors({ accent: settings.appearance.accentColor });
    theme.setBackground({ mode: backgroundModeFromSettings(settings.appearance.backgroundStyle) });
    theme.setGlassmorphism({
      frostedGlass: settings.appearance.glassIntensity !== "off",
      glassDepth: GLASS_DEPTH_BY_INTENSITY[settings.appearance.glassIntensity],
      tintOpacity: settings.appearance.glassIntensity === "off" ? 0.01 : undefined,
    });
    theme.setGlobalFont(FONT_BY_SCALE[settings.appearance.fontScale]);
    theme.setQOL({
      fontSize: FONT_SIZE_BY_SCALE[settings.appearance.fontScale],
      panelDensity: settings.appearance.density,
    });
  }

  if (scope === "all" || scope === "layout") {
    theme.setSidebarPosition(settings.layout.sidebarPosition);
    theme.setSidebarStyle(settings.layout.sidebarStyle);
    theme.setVisual({
      compactMode: settings.layout.compactMode,
      spacingDensity: settings.appearance.density,
    });
    theme.setToolbar({
      toolbarMode: settings.layout.toolbarStyle,
      mode: settings.layout.toolbarStyle === "full-width" ? "full-width" : "pill",
    });
  }

  if (scope === "all" || scope === "motion") {
    theme.setQOL({
      reducedMotion: settings.motion.reducedMotion,
      motionProfile: settings.motion.lowPowerMode ? "minimal" : "balanced",
    });
    theme.setBlur({
      strength: settings.motion.disableHeavyBlur ? 8 : 24,
      panelBlur: settings.motion.disableHeavyBlur ? 6 : 20,
      sidebarBlur: settings.motion.disableHeavyBlur ? 6 : 18,
      modalBlur: settings.motion.disableHeavyBlur ? 8 : 26,
    });
    theme.setGlassmorphism({
      panelRenderer: settings.motion.disableHeavyBlur ? "fake-glass" : "blur",
    });
    theme.setAnimations({
      particleEffects: !settings.motion.disableParticles,
      pageTransitions: !settings.motion.reducedMotion,
      smoothTransitions: !settings.motion.reducedMotion,
      hoverLift: !settings.motion.lowPowerMode,
    });
  }

  if (scope === "all" || scope === "accessibility") {
    theme.setQOL({
      highContrast: settings.accessibility.highContrast,
      fontSize: settings.accessibility.largerText ? 17 : 14,
    });
    theme.setGlassmorphism({
      tintOpacity: settings.accessibility.reducedTransparency ? 0.01 : 0.04,
      saturation: settings.accessibility.reducedTransparency ? 120 : 200,
    });
  }
};

export const importSettingsSnapshotIntoTheme = (
  theme: Theme,
  payload: unknown,
  platform: SettingsPlatform,
) => {
  const parsed = parseSettingsImportPayload(payload, platform);
  if (parsed.ok) applySettingsToTheme(theme, parsed.settings, "all");
  return parsed;
};

export const resetThemeSettingsSection = (
  theme: Theme,
  scope: SettingsResetScope,
  platform: SettingsPlatform,
) => applySettingsToTheme(theme, createDefaultSettings(platform), scope);
