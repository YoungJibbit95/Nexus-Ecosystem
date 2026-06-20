import type {
  AccentColor,
  BackgroundStyle,
  Density,
  FontScale,
  GlassIntensity,
  MobileNavigationStyle,
  SettingsPlatform,
  SidebarPosition,
  SidebarStyle,
  ThemePresetId,
  ToolbarStyle,
} from "./settingsTypes";

export const SETTINGS_SCHEMA_VERSION = 1;

export const SETTINGS_SCHEMA_NAME = "nexus.settings" as const;

export const SETTINGS_STORAGE_KEY = "nx-settings-v1";

export const SETTINGS_ALLOWED = {
  platform: ["desktop", "mobile"] as const satisfies readonly SettingsPlatform[],
  themePreset: ["system", "dark", "light", "macos-dark", "aurora", "focus"] as const satisfies readonly ThemePresetId[],
  accentColor: ["#007AFF", "#5E5CE6", "#34C759", "#FF9F0A", "#FF375F", "#64D2FF"] as const satisfies readonly AccentColor[],
  backgroundStyle: ["solid", "gradient", "mesh", "aurora", "noise"] as const satisfies readonly BackgroundStyle[],
  glassIntensity: ["off", "subtle", "balanced", "deep"] as const satisfies readonly GlassIntensity[],
  fontScale: ["compact", "default", "large"] as const satisfies readonly FontScale[],
  density: ["compact", "comfortable", "spacious"] as const satisfies readonly Density[],
  sidebarPosition: ["left", "right"] as const satisfies readonly SidebarPosition[],
  sidebarStyle: ["default", "floating", "minimal", "rail", "hidden"] as const satisfies readonly SidebarStyle[],
  toolbarStyle: ["island", "spotlight", "full-width"] as const satisfies readonly ToolbarStyle[],
  mobileNavigationStyle: ["tabs", "rail", "command"] as const satisfies readonly MobileNavigationStyle[],
};

export const SETTINGS_SECTION_LABELS = {
  appearance: "Appearance",
  layout: "Layout",
  motion: "Motion & Performance",
  accessibility: "Accessibility",
  workspace: "Workspace",
  data: "Data",
  developer: "Developer",
  mobile: "Mobile",
} as const;
