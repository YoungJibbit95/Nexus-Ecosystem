const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const DEFAULT_THEME_ID = "nexus_vibrant";
export const ZED_THEME_ALIAS = "nexus_zed";

const FALLBACK_PRIMARY = "#7c8cff";
const FALLBACK_SECONDARY = "#38bdf8";

function normalizeHexColor(value, fallback = FALLBACK_PRIMARY) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  const short = trimmed.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    return `#${short[1]
      .split("")
      .map((part) => `${part}${part}`)
      .join("")}`.toLowerCase();
  }
  const full = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  return full ? `#${full[1].toLowerCase()}` : fallback;
}

function normalizeOptionalHexColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = normalizeHexColor(trimmed, "");
  return normalized || null;
}

function colorToHex(value, fallback = FALLBACK_PRIMARY) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed) || /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return normalizeHexColor(trimmed, fallback);
  }

  const rgb = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i,
  );
  if (!rgb) return fallback;
  const toHex = (channel) =>
    clamp(Number.parseInt(channel, 10) || 0, 0, 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
}

function hexToRgbTuple(value, fallback = FALLBACK_PRIMARY) {
  const hex = normalizeHexColor(value, fallback).slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function hexToRgbString(value, fallback) {
  return hexToRgbTuple(value, fallback).join(", ");
}

function hexToRgba(value, alpha = 1, fallback) {
  const [r, g, b] = hexToRgbTuple(value, fallback);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function hexToHslString(value, fallback) {
  const [rRaw, gRaw, bRaw] = hexToRgbTuple(value, fallback).map(
    (channel) => channel / 255,
  );
  const max = Math.max(rRaw, gRaw, bRaw);
  const min = Math.min(rRaw, gRaw, bRaw);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rRaw:
        hue = (gRaw - bRaw) / delta + (gRaw < bRaw ? 6 : 0);
        break;
      case gRaw:
        hue = (bRaw - rRaw) / delta + 2;
        break;
      default:
        hue = (rRaw - gRaw) / delta + 4;
        break;
    }
    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(
    lightness * 100,
  )}%`;
}

function tokenHex(value, fallback) {
  return normalizeHexColor(value, fallback).replace("#", "");
}

function readNumberSetting(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function resolveEffectBudget(settings = {}) {
  const profile = settings.visual_performance_profile || "balanced";
  const panelMode = settings.panel_background_mode || "blur";
  const panelBlur = clamp(readNumberSetting(settings.panel_blur_strength, 16), 0, 32);
  const glowIntensityPercent = clamp(
    readNumberSetting(settings.glow_intensity, 28),
    0,
    100,
  );
  const glowRadius = clamp(readNumberSetting(settings.glow_radius, 14), 0, 48);
  const reduceEffects =
    profile === "performance" ||
    settings.smooth_caret === false ||
    (panelBlur <= 8 && glowIntensityPercent <= 14);
  const blurScale =
    panelMode === "glass-shader" ? 0.55 : panelMode === "fake-glass" ? 0.5 : 0.42;
  const maxBlur =
    panelMode === "glass-shader" ? 14 : panelMode === "fake-glass" ? 12 : 10;
  const panelFilter =
    reduceEffects || panelBlur <= 0
      ? "none"
      : `blur(${Math.round(clamp(panelBlur * blurScale, 4, maxBlur))}px) saturate(${
          panelMode === "glass-shader" ? 136 : panelMode === "fake-glass" ? 128 : 118
        }%)`;
  const settingsFilter =
    reduceEffects || panelBlur <= 0
      ? "none"
      : `blur(${Math.round(clamp(panelBlur * 0.45, 4, 8))}px) saturate(112%)`;
  const glowAlpha = reduceEffects
    ? clamp(glowIntensityPercent / 100 * 0.18, 0.04, 0.12)
    : clamp(0.08 + (glowIntensityPercent / 100) * 0.36, 0.06, 0.36);

  return {
    profile,
    panelMode,
    panelBlur,
    panelFilter,
    settingsFilter,
    glowIntensityPercent,
    glowRadius,
    glowAlpha,
    reduceEffects,
    motionQuick: reduceEffects ? "80ms" : "170ms",
    motionRegular: reduceEffects ? "120ms" : "210ms",
  };
}

const nexusZedSyntax = {
  comment: "#6e7788",
  keyword: "#b987ff",
  string: "#8bd5ca",
  number: "#f5a97f",
  function: "#8aadf4",
  variable: "#cad3f5",
  type: "#91d7e3",
  operator: "#a6adc8",
};

export const THEME_PRESETS = Object.freeze({
  [DEFAULT_THEME_ID]: {
    id: DEFAULT_THEME_ID,
    name: "Nexus Zed",
    legacyName: "Nexus Vibrant",
    description: "Dark Nexus workbench depth with Zed-like editor contrast.",
    bg_type: "gradient",
    bg_value:
      "radial-gradient(circle at 42% -10%, rgba(124, 140, 255, 0.12), transparent 34rem), linear-gradient(135deg, #05070c 0%, #090b12 52%, #03050a 100%)",
    surface: "rgba(10, 13, 20, 0.86)",
    border: "rgba(120, 132, 164, 0.18)",
    text: "#d7dae0",
    muted: "#8b93a7",
    accent: FALLBACK_PRIMARY,
    accent2: FALLBACK_SECONDARY,
    glow: hexToRgba(FALLBACK_PRIMARY, 0.16),
    selection: "rgba(124, 140, 255, 0.22)",
    syntax: nexusZedSyntax,
    swatches: ["#0b0d14", FALLBACK_PRIMARY, FALLBACK_SECONDARY],
    semantic: {
      canvas: "#07080d",
      raised: "#11141d",
      subtle: "#171b26",
      success: "#74c7a8",
      warning: "#f5c177",
      danger: "#ee6d85",
      info: "#8aadf4",
      focus: FALLBACK_PRIMARY,
    },
  },
  neon_pink: {
    id: "neon_pink",
    name: "Neon Pink",
    bg_type: "gradient",
    bg_value: "linear-gradient(135deg, #050010 0%, #1a0033 100%)",
    surface: "rgba(10, 0, 32, 0.62)",
    border: "rgba(255, 0, 255, 0.2)",
    text: "#ffffff",
    muted: "#8b8b98",
    accent: "#ff00ff",
    accent2: "#00ffff",
    glow: "rgba(255, 0, 255, 0.22)",
    selection: "rgba(255, 0, 255, 0.22)",
    syntax: {
      comment: "#ff7bd580",
      keyword: "#00ffff",
      string: "#ffff00",
      number: "#ff8cff",
      function: "#ff7bd5",
      variable: "#ffffff",
      type: "#00ffff",
      operator: "#ffffff",
    },
    swatches: ["#050010", "#ff00ff", "#00ffff"],
  },
  ocean_light: {
    id: "ocean_light",
    name: "Ocean Light",
    bg_type: "gradient",
    bg_value: "linear-gradient(135deg, #000814 0%, #001d3d 100%)",
    surface: "rgba(0, 18, 51, 0.66)",
    border: "rgba(14, 165, 233, 0.18)",
    text: "#eef2ff",
    muted: "#8aa3bf",
    accent: "#0ea5e9",
    accent2: "#6366f1",
    glow: "rgba(14, 165, 233, 0.18)",
    selection: "rgba(30, 58, 138, 0.7)",
    syntax: {
      comment: "#94a3b8",
      keyword: "#38bdf8",
      string: "#34d399",
      number: "#f59e0b",
      function: "#818cf8",
      variable: "#fb7185",
      type: "#67e8f9",
      operator: "#bfdbfe",
    },
    swatches: ["#000814", "#0ea5e9", "#38bdf8"],
  },
  midnight_mystery: {
    id: "midnight_mystery",
    name: "Midnight Mystery",
    bg_type: "gradient",
    bg_value: "radial-gradient(circle at center, #1a0b2e 0%, #03030b 100%)",
    surface: "rgba(17, 7, 31, 0.66)",
    border: "rgba(168, 85, 247, 0.18)",
    text: "#f3f4f6",
    muted: "#9ca3af",
    accent: "#a855f7",
    accent2: "#6d28d9",
    glow: "rgba(168, 85, 247, 0.18)",
    selection: "rgba(59, 7, 100, 0.75)",
    syntax: {
      comment: "#a78bfa",
      keyword: "#d8b4fe",
      string: "#fbcfe8",
      number: "#e9d5ff",
      function: "#a78bfa",
      variable: "#d8b4fe",
      type: "#c4b5fd",
      operator: "#ddd6fe",
    },
    swatches: ["#1a0b2e", "#a855f7", "#d8b4fe"],
  },
  dracula_classic: {
    id: "dracula_classic",
    name: "Dracula Classic",
    bg_type: "solid",
    bg_value: "#282a36",
    surface: "rgba(52, 55, 70, 0.82)",
    border: "rgba(189, 147, 249, 0.18)",
    text: "#f8f8f2",
    muted: "#8892bf",
    accent: "#bd93f9",
    accent2: "#ff79c6",
    glow: "rgba(189, 147, 249, 0.18)",
    selection: "#44475a",
    syntax: {
      comment: "#6272a4",
      keyword: "#ff79c6",
      string: "#f1fa8c",
      number: "#bd93f9",
      function: "#50fa7b",
      variable: "#ffb86c",
      type: "#8be9fd",
      operator: "#ff79c6",
    },
    swatches: ["#282a36", "#bd93f9", "#ff79c6"],
  },
  void_pitch: {
    id: "void_pitch",
    name: "Void Pitch",
    bg_type: "solid",
    bg_value: "#000000",
    surface: "rgba(10, 10, 10, 0.84)",
    border: "rgba(255, 255, 255, 0.1)",
    text: "#ffffff",
    muted: "#777777",
    accent: "#ffffff",
    accent2: "#777777",
    glow: "rgba(255, 255, 255, 0.12)",
    selection: "#333333",
    syntax: {
      comment: "#888888",
      keyword: "#ffffff",
      string: "#aaaaaa",
      number: "#eeeeee",
      function: "#dddddd",
      variable: "#ffffff",
      type: "#cccccc",
      operator: "#bbbbbb",
    },
    swatches: ["#000000", "#ffffff", "#888888"],
  },
});

export const BACKGROUND_PRESETS = Object.freeze({
  nexus_dark: {
    id: "nexus_dark",
    name: "Nexus Dark",
    type: "solid",
    value: "#07080d",
    surface: "rgba(17, 20, 29, 0.82)",
    border: "rgba(142, 153, 183, 0.16)",
    swatches: ["#07080d", "#11141d", FALLBACK_PRIMARY],
  },
  neon_ultra: {
    id: "neon_ultra",
    name: "Neon Ultra",
    type: "gradient",
    value: "linear-gradient(135deg, #050010 0%, #1a0033 100%)",
    surface: "rgba(10, 0, 32, 0.62)",
    border: "rgba(255, 0, 255, 0.2)",
    swatches: ["#050010", "#1a0033", "#ff00ff"],
  },
  ocean_wave: {
    id: "ocean_wave",
    name: "Ocean Wave",
    type: "gradient",
    value: "linear-gradient(135deg, #000814 0%, #001d3d 100%)",
    surface: "rgba(0, 18, 51, 0.66)",
    border: "rgba(14, 165, 233, 0.18)",
    swatches: ["#000814", "#001d3d", "#0ea5e9"],
  },
  midnight_purple: {
    id: "midnight_purple",
    name: "Midnight Purple",
    type: "gradient",
    value: "radial-gradient(circle at center, #1a0b2e 0%, #03030b 100%)",
    surface: "rgba(17, 7, 31, 0.66)",
    border: "rgba(168, 85, 247, 0.18)",
    swatches: ["#1a0b2e", "#03030b", "#a855f7"],
  },
  cyber_sunset: {
    id: "cyber_sunset",
    name: "Cyber Sunset",
    type: "gradient",
    value: "linear-gradient(135deg, #120458 0%, #ff0055 100%)",
    surface: "rgba(18, 4, 88, 0.5)",
    border: "rgba(255, 0, 85, 0.22)",
    swatches: ["#120458", "#ff0055", "#ff8fab"],
  },
  dracula: {
    id: "dracula",
    name: "Dracula",
    type: "solid",
    value: "#282a36",
    surface: "rgba(52, 55, 70, 0.82)",
    border: "rgba(189, 147, 249, 0.18)",
    swatches: ["#282a36", "#343746", "#bd93f9"],
  },
  void: {
    id: "void",
    name: "Void",
    type: "solid",
    value: "#000000",
    surface: "rgba(10, 10, 10, 0.84)",
    border: "rgba(255, 255, 255, 0.1)",
    swatches: ["#000000", "#0a0a0a", "#ffffff"],
  },
});

const THEME_ORDER = [
  DEFAULT_THEME_ID,
  "neon_pink",
  "ocean_light",
  "midnight_mystery",
  "dracula_classic",
  "void_pitch",
];

const BACKGROUND_ORDER = [
  "nexus_dark",
  "neon_ultra",
  "ocean_wave",
  "midnight_purple",
  "cyber_sunset",
  "dracula",
  "void",
];

export function normalizeThemeId(themeId) {
  if (themeId === ZED_THEME_ALIAS) return DEFAULT_THEME_ID;
  return THEME_PRESETS[themeId] ? themeId : DEFAULT_THEME_ID;
}

function getThemePreset(themeId) {
  return THEME_PRESETS[normalizeThemeId(themeId)];
}

function getBackgroundPreset(backgroundId) {
  return backgroundId && BACKGROUND_PRESETS[backgroundId]
    ? BACKGROUND_PRESETS[backgroundId]
    : null;
}

function createLegacyTheme(preset) {
  return {
    id: preset.id,
    name: preset.name,
    legacyName: preset.legacyName,
    bg_type: preset.bg_type,
    bg_value: preset.bg_value,
    surface: preset.surface,
    border: preset.border,
    text: preset.text,
    muted: preset.muted,
    accent: preset.accent,
    accent2: preset.accent2,
    glow: preset.glow,
    selection: preset.selection,
    comment: preset.syntax.comment,
    keyword: preset.syntax.keyword,
    string: preset.syntax.string,
    number: preset.syntax.number,
    function: preset.syntax.function,
    variable: preset.syntax.variable,
    type: preset.syntax.type,
    operator: preset.syntax.operator,
    semantic: preset.semantic || {},
    swatches: preset.swatches,
  };
}

export const THEME_MAP = Object.freeze({
  ...Object.fromEntries(
    Object.entries(THEME_PRESETS).map(([id, preset]) => [
      id,
      Object.freeze(createLegacyTheme(preset)),
    ]),
  ),
  [ZED_THEME_ALIAS]: Object.freeze(createLegacyTheme(THEME_PRESETS[DEFAULT_THEME_ID])),
});

export const BACKGROUND_MAP = Object.freeze({
  ...Object.fromEntries(
    Object.entries(BACKGROUND_PRESETS).map(([id, preset]) => [
      id,
      Object.freeze({
        id,
        name: preset.name,
        type: preset.type,
        value: preset.value,
        surface: preset.surface,
        border: preset.border,
        swatches: preset.swatches,
      }),
    ]),
  ),
});

export function getThemePresetOptions() {
  return THEME_ORDER.map((id) => {
    const preset = THEME_PRESETS[id];
    return {
      id: preset.id,
      name: preset.name,
      legacyName: preset.legacyName,
      description: preset.description,
      colors: preset.swatches || [
        preset.accent,
        preset.syntax.function,
        preset.syntax.keyword,
      ],
      accent: preset.accent,
      accent2: preset.accent2,
    };
  });
}

export function getBackgroundPresetOptions() {
  return BACKGROUND_ORDER.map((id) => {
    const preset = BACKGROUND_PRESETS[id];
    return {
      id,
      name: preset.name,
      colors: preset.swatches,
    };
  });
}

export function createEditorSyntaxThemeDefinition(resolvedTheme) {
  const theme =
    resolvedTheme?.theme ||
    getThemePreset(resolvedTheme?.settings?.theme || resolvedTheme?.themeId);
  const colors = resolvedTheme?.colors || {
    primary: theme.accent,
    text: theme.text,
    surface: theme.surface,
    selection: theme.selection,
  };
  const syntax = resolvedTheme?.syntax || theme.syntax;

  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: "comment",
        foreground: tokenHex(syntax.comment, nexusZedSyntax.comment),
        fontStyle: "italic",
      },
      { token: "keyword", foreground: tokenHex(syntax.keyword, nexusZedSyntax.keyword) },
      { token: "string", foreground: tokenHex(syntax.string, nexusZedSyntax.string) },
      { token: "number", foreground: tokenHex(syntax.number, nexusZedSyntax.number) },
      {
        token: "identifier.function",
        foreground: tokenHex(syntax.function, nexusZedSyntax.function),
      },
      { token: "type", foreground: tokenHex(syntax.type, syntax.keyword) },
      { token: "operator", foreground: tokenHex(syntax.operator, syntax.variable) },
    ],
    colors: {
      "editor.background": "#00000000",
      "editorGutter.background": "#00000000",
      "minimap.background": "#00000000",
      "editorOverviewRuler.background": "#00000000",
      "editor.lineHighlightBorder": "#00000000",
      "editor.foreground": normalizeHexColor(colors.text, theme.text),
      "editor.selectionBackground": colors.selection || theme.selection,
      "editorLineNumber.foreground": "#7d8598",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorCursor.foreground": normalizeHexColor(colors.primary, theme.accent),
      "editorWidget.background": "#11141d",
      "editorSuggestWidget.background": "#11141d",
      "editorSuggestWidget.border": "#242938",
      "editorSuggestWidget.selectedBackground": hexToRgba(colors.primary, 0.16),
    },
  };
}

export function resolveNexusTheme(settings = {}) {
  const theme = getThemePreset(settings.theme);
  const background = getBackgroundPreset(settings.background);
  const effectBudget = resolveEffectBudget(settings);
  const primary = normalizeHexColor(settings.primary_accent, theme.accent);
  const secondary = normalizeHexColor(settings.secondary_accent, theme.accent2);
  const backgroundValue = background ? background.value : theme.bg_value;
  const backgroundType = background ? background.type : theme.bg_type;
  const baseSurface = background ? background.surface : theme.surface;
  const surfaceHex = colorToHex(baseSurface, "#11141d");
  const customSurface = normalizeOptionalHexColor(settings.custom_surface);
  const customInputSurface = normalizeOptionalHexColor(settings.custom_input_surface);
  const surface = customSurface ? hexToRgba(customSurface, 0.84, surfaceHex) : baseSurface;
  const effectiveSurfaceHex = customSurface || surfaceHex;
  const inputSurface = customInputSurface || effectiveSurfaceHex;
  const inputSurfaceSoft = hexToRgba(inputSurface, 0.28, effectiveSurfaceHex);
  const inputSurfaceHover = hexToRgba(inputSurface, 0.42, effectiveSurfaceHex);
  const border = background ? background.border : theme.border;
  const panelSurface =
    effectBudget.panelMode === "glass-shader"
      ? `linear-gradient(135deg, ${hexToRgba(primary, 0.12)}, ${surface})`
      : effectBudget.panelMode === "fake-glass"
        ? `linear-gradient(135deg, rgba(255, 255, 255, 0.055), ${surface})`
        : surface;
  const primaryRgb = hexToRgbString(primary);
  const secondaryRgb = hexToRgbString(secondary, FALLBACK_SECONDARY);
  const primaryHsl = hexToHslString(primary);
  const secondaryHsl = hexToHslString(secondary, FALLBACK_SECONDARY);
  const accentGlow = hexToRgba(primary, effectBudget.glowAlpha);
  const panelShadow =
    effectBudget.reduceEffects || effectBudget.glowIntensityPercent <= 0
      ? "0 10px 24px rgba(0, 0, 0, 0.2)"
      : `0 14px 32px rgba(0, 0, 0, 0.24), 0 0 ${Math.round(
          effectBudget.glowRadius,
        )}px ${hexToRgba(primary, Math.min(effectBudget.glowAlpha, 0.18))}`;

  const colors = {
    background: backgroundValue,
    backgroundType,
    surface,
    surfaceHex: effectiveSurfaceHex,
    panelSurface,
    inputSurface,
    inputSurfaceSoft,
    inputSurfaceHover,
    border,
    text: theme.text,
    muted: theme.muted,
    primary,
    secondary,
    primaryRgb,
    secondaryRgb,
    primaryHsl,
    secondaryHsl,
    glow: accentGlow,
    selection: theme.selection,
    onPrimary: "#ffffff",
    ...theme.semantic,
  };

  const cssVars = {
    "--nexus-bg": backgroundType === "solid" ? backgroundValue : "#07080d",
    "--nexus-bg-image": backgroundType === "gradient" ? backgroundValue : "none",
    "--nexus-bg-type": backgroundType,
    "--nexus-bg-value": backgroundValue,
    "--nexus-surface": surface,
    "--nexus-sidebar": surface,
    "--nexus-titlebar": surface,
    "--nexus-side-panel": surface,
    "--nexus-editor-bg": backgroundType === "solid" ? backgroundValue : "#07080d",
    "--nexus-editor-surface": surface,
    "--nexus-panel-surface": panelSurface,
    "--nexus-panel-border": border,
    "--nexus-panel-filter": effectBudget.panelFilter,
    "--nexus-settings-filter": effectBudget.settingsFilter,
    "--nexus-panel-shadow": panelShadow,
    "--nexus-control-surface": inputSurfaceSoft,
    "--nexus-control-surface-hover": inputSurfaceHover,
    "--nexus-input-surface": inputSurfaceSoft,
    "--nexus-border": border,
    "--nexus-glass": surface,
    "--nexus-glass-border": border,
    "--nexus-text": colors.text,
    "--nexus-muted": colors.muted,
    "--nexus-primary": primary,
    "--nexus-primary-rgb": primaryRgb,
    "--nexus-primary-hsl": primaryHsl,
    "--nexus-primary-foreground": colors.onPrimary,
    "--nexus-secondary-accent": secondary,
    "--nexus-accent-2": secondary,
    "--nexus-accent-2-rgb": secondaryRgb,
    "--nexus-accent-2-hsl": secondaryHsl,
    "--nexus-purple": primary,
    "--nexus-purple-glow": colors.glow,
    "--nexus-accent-glow": colors.glow,
    "--nexus-glow-radius": `${effectBudget.glowRadius}px`,
    "--nexus-glow-radius-sm": `${Math.max(4, Math.round(effectBudget.glowRadius * 0.45))}px`,
    "--nexus-glow-intensity": `${effectBudget.glowIntensityPercent}%`,
    "--nexus-blur-radius": `${effectBudget.panelBlur}px`,
    "--nx-motion-quick": effectBudget.motionQuick,
    "--nx-motion-regular": effectBudget.motionRegular,
    "--nexus-selection": colors.selection,
    "--nexus-comment": theme.syntax.comment,
    "--nexus-keyword": theme.syntax.keyword,
    "--nexus-string": theme.syntax.string,
    "--nexus-number": theme.syntax.number,
    "--nexus-function": theme.syntax.function,
    "--nexus-variable": theme.syntax.variable,
    "--nexus-type": theme.syntax.type,
    "--nexus-operator": theme.syntax.operator,
    "--primary-rgb": primaryRgb,
  };

  const resolved = {
    id: theme.id,
    name: theme.name,
    theme,
    background,
    effectBudget,
    colors,
    syntax: theme.syntax,
    cssVars,
  };

  return {
    ...resolved,
    editorSyntax: createEditorSyntaxThemeDefinition(resolved),
  };
}
