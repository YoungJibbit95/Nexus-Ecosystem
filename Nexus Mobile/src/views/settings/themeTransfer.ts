import type {
  AnimationsConfig,
  BackgroundConfig,
  BlurConfig,
  EditorConfig,
  GlassmorphismConfig,
  GlowConfig,
  NotesConfig,
  QOLConfig,
  Theme,
  VisualConfig,
} from "../../store/themeStore";

export type ThemeTransferPayload = {
  version: "v5";
  mode: Theme["mode"];
  accent: string;
  accent2: string;
  bg: string;
  globalFont: string;
  glow: Partial<GlowConfig>;
  blur: Partial<BlurConfig>;
  background: Partial<BackgroundConfig>;
  glassmorphism: Partial<GlassmorphismConfig>;
  visual: Partial<VisualConfig>;
  animations: Partial<AnimationsConfig>;
  editor: Partial<EditorConfig>;
  notes: Partial<NotesConfig>;
  qol: Partial<QOLConfig>;
  toolbar: Partial<Theme["toolbar"]>;
};

export type ThemeTransferParseResult =
  | {
      ok: true;
      partial: boolean;
      payload: Partial<ThemeTransferPayload>;
      warnings: string[];
    }
  | {
      ok: false;
      message: string;
    };

type ApplyThemeTransferOptions = {
  includeReleaseFrozen?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const asEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined => (isString(value) && allowed.includes(value as T) ? (value as T) : undefined);

const asStops = (
  value: unknown,
): BackgroundConfig["stops"] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const stops = value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const color = isString(entry.color) ? entry.color : null;
      const position = isNumber(entry.position) ? entry.position : null;
      const opacity = isNumber(entry.opacity) ? entry.opacity : null;
      if (!color || position === null || opacity === null) return null;
      return { color, position, opacity };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return stops.length > 0 ? stops : undefined;
};

const pickGlow = (value: unknown): Partial<GlowConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<GlowConfig> = {};
  const mode = asEnum(value.mode, ["ambient", "outline", "focus", "gradient", "pulse", "off"] as const);
  if (mode) out.mode = mode;
  if (isString(value.color)) out.color = value.color;
  if (isNumber(value.intensity)) out.intensity = value.intensity;
  if (isNumber(value.radius)) out.radius = value.radius;
  if (isNumber(value.spread)) out.spread = value.spread;
  const blendMode = asEnum(value.blendMode, ["normal", "screen", "multiply", "overlay"] as const);
  if (blendMode) out.blendMode = blendMode;
  if (isBoolean(value.gradientGlow)) out.gradientGlow = value.gradientGlow;
  if (isString(value.gradientColor1)) out.gradientColor1 = value.gradientColor1;
  if (isString(value.gradientColor2)) out.gradientColor2 = value.gradientColor2;
  if (isNumber(value.gradientAngle)) out.gradientAngle = value.gradientAngle;
  if (isBoolean(value.animated)) out.animated = value.animated;
  if (isNumber(value.animationSpeed)) out.animationSpeed = value.animationSpeed;
  return out;
};

const pickBlur = (value: unknown): Partial<BlurConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<BlurConfig> = {};
  if (isNumber(value.strength)) out.strength = value.strength;
  if (isBoolean(value.noiseOverlay)) out.noiseOverlay = value.noiseOverlay;
  if (isNumber(value.noiseOpacity)) out.noiseOpacity = value.noiseOpacity;
  if (isNumber(value.sidebarBlur)) out.sidebarBlur = value.sidebarBlur;
  if (isNumber(value.panelBlur)) out.panelBlur = value.panelBlur;
  if (isNumber(value.modalBlur)) out.modalBlur = value.modalBlur;
  return out;
};

const pickBackground = (value: unknown): Partial<BackgroundConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<BackgroundConfig> = {};
  const mode = asEnum(
    value.mode,
    ["solid", "gradient", "animated-gradient", "mesh", "noise", "aurora"] as const,
  );
  if (mode) out.mode = mode;
  const panelBgMode = asEnum(
    value.panelBgMode,
    ["glass", "solid", "gradient", "noise", "dots", "grid", "carbon", "circuit"] as const,
  );
  if (panelBgMode) out.panelBgMode = panelBgMode;
  const stops = asStops(value.stops);
  if (stops) out.stops = stops;
  if (isNumber(value.angle)) out.angle = value.angle;
  if (isBoolean(value.animated)) out.animated = value.animated;
  if (isNumber(value.animationSpeed)) out.animationSpeed = value.animationSpeed;
  if (isNumber(value.noiseOpacity)) out.noiseOpacity = value.noiseOpacity;
  if (isNumber(value.meshIntensity)) out.meshIntensity = value.meshIntensity;
  if (isNumber(value.overlayOpacity)) out.overlayOpacity = value.overlayOpacity;
  if (isBoolean(value.vignette)) out.vignette = value.vignette;
  if (isNumber(value.vignetteStrength)) out.vignetteStrength = value.vignetteStrength;
  if (isBoolean(value.scanlines)) out.scanlines = value.scanlines;
  return out;
};

const pickGlass = (value: unknown): Partial<GlassmorphismConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<GlassmorphismConfig> = {};
  if (isNumber(value.borderOpacity)) out.borderOpacity = value.borderOpacity;
  if (isBoolean(value.borderGlow)) out.borderGlow = value.borderGlow;
  if (isNumber(value.borderGlowIntensity)) out.borderGlowIntensity = value.borderGlowIntensity;
  if (isNumber(value.saturation)) out.saturation = value.saturation;
  if (isString(value.tintColor)) out.tintColor = value.tintColor;
  if (isNumber(value.tintOpacity)) out.tintOpacity = value.tintOpacity;
  if (isBoolean(value.frostedGlass)) out.frostedGlass = value.frostedGlass;
  if (isBoolean(value.chromaticAberration)) out.chromaticAberration = value.chromaticAberration;
  if (isBoolean(value.glowOutline)) out.glowOutline = value.glowOutline;
  if (isString(value.glowColor1)) out.glowColor1 = value.glowColor1;
  if (isString(value.glowColor2)) out.glowColor2 = value.glowColor2;
  if (isNumber(value.glowOutlineStrength)) out.glowOutlineStrength = value.glowOutlineStrength;
  const glassMode = asEnum(
    value.glassMode,
    ["default", "frosted", "crystal", "neon", "matte", "mirror", "plasma"] as const,
  );
  if (glassMode) out.glassMode = glassMode;
  if (isNumber(value.glassDepth)) out.glassDepth = value.glassDepth;
  if (isBoolean(value.innerShadow)) out.innerShadow = value.innerShadow;
  if (isBoolean(value.reflectionLine)) out.reflectionLine = value.reflectionLine;
  if (isBoolean(value.animatedBlur)) out.animatedBlur = value.animatedBlur;
  if (isNumber(value.animatedBlurSpeed)) out.animatedBlurSpeed = value.animatedBlurSpeed;
  const panelRenderer = asEnum(value.panelRenderer, ["blur", "fake-glass", "glass-shader"] as const);
  if (panelRenderer) out.panelRenderer = panelRenderer;
  const glowRenderer = asEnum(value.glowRenderer, ["css", "three"] as const);
  if (glowRenderer) out.glowRenderer = glowRenderer;
  return out;
};

const pickVisual = (value: unknown): Partial<VisualConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<VisualConfig> = {};
  if (isNumber(value.borderThickness)) out.borderThickness = value.borderThickness;
  if (isNumber(value.shadowDepth)) out.shadowDepth = value.shadowDepth;
  if (isNumber(value.animationSpeed)) out.animationSpeed = value.animationSpeed;
  if (isNumber(value.panelRadius)) out.panelRadius = value.panelRadius;
  if (isBoolean(value.compactMode)) out.compactMode = value.compactMode;
  const spacingDensity = asEnum(value.spacingDensity, ["comfortable", "compact", "spacious"] as const);
  if (spacingDensity) out.spacingDensity = spacingDensity;
  return out;
};

const pickAnimations = (value: unknown): Partial<AnimationsConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<AnimationsConfig> = {};
  const boolKeys: Array<keyof Pick<
    AnimationsConfig,
    | "fade"
    | "scale"
    | "slide"
    | "spring"
    | "smoothTransitions"
    | "entryAnimations"
    | "hoverLift"
    | "pulseEffects"
    | "rippleClick"
    | "pageTransitions"
    | "glowPulse"
    | "particleEffects"
    | "floatEffect"
    | "borderFlow"
    | "shakeOnError"
    | "confettiOnComplete"
    | "magneticButtons"
  >> = [
    "fade",
    "scale",
    "slide",
    "spring",
    "smoothTransitions",
    "entryAnimations",
    "hoverLift",
    "pulseEffects",
    "rippleClick",
    "pageTransitions",
    "glowPulse",
    "particleEffects",
    "floatEffect",
    "borderFlow",
    "shakeOnError",
    "confettiOnComplete",
    "magneticButtons",
  ];
  boolKeys.forEach((key) => {
    if (isBoolean(value[key])) out[key] = value[key];
  });
  const entranceStyle = asEnum(
    value.entranceStyle,
    ["fade", "slide", "scale", "bounce", "flip"] as const,
  );
  if (entranceStyle) out.entranceStyle = entranceStyle;
  return out;
};

const pickEditor = (value: unknown): Partial<EditorConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<EditorConfig> = {};
  const boolKeys: Array<keyof Pick<
    EditorConfig,
    "autosave" | "wordWrap" | "lineNumbers" | "minimap" | "cursorAnimation"
  >> = ["autosave", "wordWrap", "lineNumbers", "minimap", "cursorAnimation"];
  boolKeys.forEach((key) => {
    if (isBoolean(value[key])) out[key] = value[key];
  });
  if (isNumber(value.autosaveInterval)) out.autosaveInterval = value.autosaveInterval;
  if (isNumber(value.tabSize)) out.tabSize = value.tabSize;
  if (isNumber(value.fontSize)) out.fontSize = value.fontSize;
  if (isString(value.fontFamily)) out.fontFamily = value.fontFamily;
  return out;
};

const pickNotes = (value: unknown): Partial<NotesConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<NotesConfig> = {};
  if (isNumber(value.fontSize)) out.fontSize = value.fontSize;
  if (isString(value.fontFamily)) out.fontFamily = value.fontFamily;
  if (isNumber(value.lineHeight)) out.lineHeight = value.lineHeight;
  const mode = asEnum(value.mode, ["dark", "light"] as const);
  if (mode) out.mode = mode;
  return out;
};

const pickQol = (value: unknown): Partial<QOLConfig> => {
  if (!isRecord(value)) return {};
  const out: Partial<QOLConfig> = {};
  const boolKeys: Array<keyof Pick<
    QOLConfig,
    | "reducedMotion"
    | "highContrast"
    | "showTooltips"
    | "sidebarAutoHide"
    | "quickActions"
    | "autoAccentContrast"
  >> = [
    "reducedMotion",
    "highContrast",
    "showTooltips",
    "sidebarAutoHide",
    "quickActions",
    "autoAccentContrast",
  ];
  boolKeys.forEach((key) => {
    if (isBoolean(value[key])) out[key] = value[key];
  });
  if (isNumber(value.fontSize)) out.fontSize = value.fontSize;
  const panelDensity = asEnum(value.panelDensity, ["comfortable", "compact", "spacious"] as const);
  if (panelDensity) out.panelDensity = panelDensity;
  const motionProfile = asEnum(value.motionProfile, ["minimal", "balanced", "expressive", "cinematic"] as const);
  if (motionProfile) out.motionProfile = motionProfile;
  return out;
};

const pickToolbar = (value: unknown): Partial<Theme["toolbar"]> => {
  if (!isRecord(value)) return {};
  const out: Partial<Theme["toolbar"]> = {};
  const toolbarMode = asEnum(value.toolbarMode, ["island", "spotlight", "full-width"] as const);
  if (toolbarMode) out.toolbarMode = toolbarMode;
  const position = asEnum(value.position, ["top", "bottom"] as const);
  if (position) out.position = position;
  const mode = asEnum(value.mode, ["pill", "full-width"] as const);
  if (mode) out.mode = mode;
  if (isNumber(value.height)) out.height = value.height;
  if (isBoolean(value.visible)) out.visible = value.visible;
  return out;
};

export function buildThemeTransferPayload(theme: Theme): ThemeTransferPayload {
  return {
    version: "v5",
    mode: theme.mode,
    accent: theme.accent,
    accent2: theme.accent2,
    bg: theme.bg,
    globalFont: theme.globalFont,
    glow: { ...theme.glow },
    blur: { ...theme.blur },
    background: { ...theme.background },
    glassmorphism: { ...theme.glassmorphism },
    visual: { ...theme.visual },
    animations: { ...theme.animations },
    editor: { ...theme.editor },
    notes: { ...theme.notes },
    qol: { ...theme.qol },
    toolbar: { ...theme.toolbar },
  };
}

export function parseThemeTransferPayload(rawInput: unknown): ThemeTransferParseResult {
  if (!isRecord(rawInput)) {
    return { ok: false, message: "Ungültige Theme-Datei: JSON-Objekt erwartet." };
  }

  const payload: Partial<ThemeTransferPayload> = {};
  const warnings: string[] = [];

  if (asEnum(rawInput.version, ["v5"] as const) === "v5") payload.version = "v5";

  const mode = asEnum(rawInput.mode, ["dark", "light"] as const);
  if (mode) payload.mode = mode;
  if (isString(rawInput.accent)) payload.accent = rawInput.accent;
  if (isString(rawInput.accent2)) payload.accent2 = rawInput.accent2;
  if (isString(rawInput.bg)) payload.bg = rawInput.bg;
  if (isString(rawInput.globalFont)) payload.globalFont = rawInput.globalFont;

  payload.glow = pickGlow(rawInput.glow);
  payload.blur = pickBlur(rawInput.blur);
  payload.background = pickBackground(rawInput.background);
  payload.glassmorphism = pickGlass(rawInput.glassmorphism);
  payload.visual = pickVisual(rawInput.visual);
  payload.animations = pickAnimations(rawInput.animations);
  payload.editor = pickEditor(rawInput.editor);
  payload.notes = pickNotes(rawInput.notes);
  payload.qol = pickQol(rawInput.qol);
  payload.toolbar = pickToolbar(rawInput.toolbar);

  if (!payload.mode && !payload.accent && !payload.accent2 && !payload.bg) {
    warnings.push("Keine Basis-Farbinformation gefunden.");
  }

  const hasAnyNested =
    Object.keys(payload.glow || {}).length > 0 ||
    Object.keys(payload.blur || {}).length > 0 ||
    Object.keys(payload.background || {}).length > 0 ||
    Object.keys(payload.glassmorphism || {}).length > 0 ||
    Object.keys(payload.visual || {}).length > 0 ||
    Object.keys(payload.animations || {}).length > 0 ||
    Object.keys(payload.editor || {}).length > 0 ||
    Object.keys(payload.notes || {}).length > 0 ||
    Object.keys(payload.qol || {}).length > 0 ||
    Object.keys(payload.toolbar || {}).length > 0;

  if (
    !payload.mode &&
    !payload.accent &&
    !payload.accent2 &&
    !payload.bg &&
    !payload.globalFont &&
    !hasAnyNested
  ) {
    return { ok: false, message: "Theme-Datei enthält keine unterstützten Felder." };
  }

  return { ok: true, payload, partial: warnings.length > 0, warnings };
}

export function applyThemeTransferPayload(
  theme: Theme,
  payload: Partial<ThemeTransferPayload>,
  options: ApplyThemeTransferOptions = {},
) {
  const includeReleaseFrozen = Boolean(options.includeReleaseFrozen);

  if (payload.mode) theme.setMode(payload.mode);
  if (payload.accent || payload.accent2 || payload.bg) {
    theme.setColors({
      accent: payload.accent,
      accent2: payload.accent2,
      bg: payload.bg,
    });
  }
  if (payload.globalFont) theme.setGlobalFont(payload.globalFont);
  if (payload.blur && Object.keys(payload.blur).length > 0) theme.setBlur(payload.blur);
  if (payload.background && Object.keys(payload.background).length > 0) {
    theme.setBackground(payload.background);
  }
  if (payload.glassmorphism && Object.keys(payload.glassmorphism).length > 0) {
    const patch = { ...payload.glassmorphism };
    if (!includeReleaseFrozen) {
      delete patch.glowRenderer;
    }
    theme.setGlassmorphism(patch);
  }
  if (payload.visual && Object.keys(payload.visual).length > 0) theme.setVisual(payload.visual);
  if (payload.animations && Object.keys(payload.animations).length > 0) {
    theme.setAnimations(payload.animations);
  }
  if (payload.editor && Object.keys(payload.editor).length > 0) theme.setEditor(payload.editor);
  if (payload.notes && Object.keys(payload.notes).length > 0) theme.setNotes(payload.notes);
  if (payload.qol && Object.keys(payload.qol).length > 0) theme.setQOL(payload.qol);
  if (includeReleaseFrozen && payload.glow && Object.keys(payload.glow).length > 0) {
    theme.setGlow(payload.glow);
  }
  if (includeReleaseFrozen && payload.toolbar && Object.keys(payload.toolbar).length > 0) {
    theme.setToolbar(payload.toolbar);
  }
}
