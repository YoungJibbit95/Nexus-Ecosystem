export type SettingsPlatform = "desktop" | "mobile";

export type ThemePresetId =
  | "system"
  | "dark"
  | "light"
  | "macos-dark"
  | "aurora"
  | "focus";

export type AccentColor =
  | "#007AFF"
  | "#5E5CE6"
  | "#34C759"
  | "#FF9F0A"
  | "#FF375F"
  | "#64D2FF";

export type BackgroundStyle =
  | "solid"
  | "gradient"
  | "mesh"
  | "aurora"
  | "noise";

export type GlassIntensity = "off" | "subtle" | "balanced" | "deep";
export type FontScale = "compact" | "default" | "large";
export type Density = "compact" | "comfortable" | "spacious";
export type SidebarPosition = "left" | "right";
export type SidebarStyle = "default" | "floating" | "minimal" | "rail" | "hidden";
export type ToolbarStyle = "island" | "spotlight" | "full-width";
export type MobileNavigationStyle = "tabs" | "rail" | "command";

export type SettingsSectionId =
  | "appearance"
  | "layout"
  | "motion"
  | "accessibility"
  | "workspace"
  | "data"
  | "developer"
  | "mobile";

export type SettingsResetScope =
  | "appearance"
  | "layout"
  | "motion"
  | "accessibility"
  | "workspace"
  | "data"
  | "developer"
  | "mobile"
  | "all";

export interface AppearanceSettings {
  themePreset: ThemePresetId;
  accentColor: AccentColor | string;
  backgroundStyle: BackgroundStyle;
  glassIntensity: GlassIntensity;
  fontScale: FontScale;
  density: Density;
}

export interface LayoutSettings {
  sidebarPosition: SidebarPosition;
  sidebarStyle: SidebarStyle;
  compactMode: boolean;
  toolbarStyle: ToolbarStyle;
}

export interface MotionSettings {
  reducedMotion: boolean;
  disableHeavyBlur: boolean;
  disableParticles: boolean;
  lowPowerMode: boolean;
  adaptiveRendering: boolean;
}

export interface AccessibilitySettings {
  largerText: boolean;
  highContrast: boolean;
  visibleFocusRings: boolean;
  reducedTransparency: boolean;
}

export interface WorkspaceSettings {
  restoreLastView: boolean;
  safeModeOnBootFailure: boolean;
  autosaveIntervalMs: number;
  backupRetention: number;
}

export interface DataSettings {
  validateImports: boolean;
  backupBeforeImport: boolean;
  clearCacheOnLogout: boolean;
}

export interface DeveloperSettings {
  enabled: boolean;
  featureFlags: Record<string, boolean>;
  renderDiagnostics: boolean;
  runtimeMetrics: boolean;
}

export interface MobileSettings {
  navigationStyle: MobileNavigationStyle;
  largeTapTargets: boolean;
  haptics: boolean;
  preferNativeSheets: boolean;
  keepCanvasControlsMinimal: boolean;
}

export interface NexusSettings {
  version: number;
  platform: SettingsPlatform;
  appearance: AppearanceSettings;
  layout: LayoutSettings;
  motion: MotionSettings;
  accessibility: AccessibilitySettings;
  workspace: WorkspaceSettings;
  data: DataSettings;
  developer: DeveloperSettings;
  mobile: MobileSettings;
}

export interface SettingsExportPayload {
  schema: "nexus.settings";
  version: number;
  exportedAt: string;
  settings: NexusSettings;
}

export interface SettingsValidationIssue {
  path: string;
  message: string;
}

export type SettingsParseResult =
  | {
      ok: true;
      settings: NexusSettings;
      warnings: SettingsValidationIssue[];
    }
  | {
      ok: false;
      errors: SettingsValidationIssue[];
    };

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};
