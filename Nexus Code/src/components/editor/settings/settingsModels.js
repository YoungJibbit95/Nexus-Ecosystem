import { DEFAULT_SETTINGS } from "../../../pages/editor/editorShared.jsx";
import {
  SETTING_INDEX,
  SETTING_INDEX_BY_ID,
  SETTING_SECTIONS,
  TEXT_SIZE_PRESETS,
  THEME_EDITOR_RECIPES,
  THEME_EDITOR_SETTING_KEYS,
} from "./settingsCatalog.jsx";

export function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok) return result.data;
    throw new Error(result.error || result.errorDetails?.code || "IPC response failed.");
  }
  return result || [];
}

export function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_/.:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getSearchTerms(query) {
  return normalizeSearch(query)
    .split(" ")
    .map((term) => term.trim())
    .filter(Boolean);
}

function createSearchText(parts) {
  return normalizeSearch(parts.filter(Boolean).join(" "));
}

function getTextSearchScore(text, query) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return 0;
  const normalizedText = normalizeSearch(text);
  if (!normalizedText) return 0;
  const terms = getSearchTerms(normalizedQuery);
  if (terms.length === 0) return 0;

  let score = normalizedText.includes(normalizedQuery) ? 40 : 0;
  let matchedTerms = 0;
  terms.forEach((term) => {
    if (normalizedText.includes(term)) {
      matchedTerms += 1;
      score += 12;
    }
  });

  if (matchedTerms === 0) return 0;
  if (terms.length > 1 && matchedTerms < terms.length) {
    return score > 40 ? score - 12 : 0;
  }
  return score + matchedTerms;
}

export function resolveVisualProfileId(settings = {}) {
  if (settings.visual_performance_profile) {
    return settings.visual_performance_profile;
  }
  if (
    settings.panel_blur_strength <= 10 ||
    settings.smooth_caret === false ||
    settings.cursor_glow === false
  ) {
    return "performance";
  }
  if (
    settings.panel_background_mode === "fake-glass" ||
    settings.panel_background_mode === "glass-shader" ||
    settings.glow_intensity >= 40 ||
    settings.panel_glow_outline
  ) {
    return "quality";
  }
  return "balanced";
}

function settingMatchesSearch(settingId, sectionId, query) {
  if (!query) return true;
  const entry = SETTING_INDEX_BY_ID.get(settingId);
  const section = SETTING_SECTIONS.find((item) => item.id === sectionId);
  const haystack = createSearchText([
    entry?.label,
    entry?.description,
    entry?.keywords,
    section?.label,
    section?.description,
    section?.keywords,
  ]);
  return getTextSearchScore(haystack, query) > 0;
}

function sectionMatchesSearch(section, query) {
  if (!query || !section) return false;
  return getTextSearchScore(
    createSearchText([
    section.label,
    section.eyebrow,
    section.description,
    section.keywords,
    ]),
    query,
  ) > 0;
}

export function countSectionMatches(sectionId, query) {
  if (!query) {
    return SETTING_INDEX.filter((entry) => entry.section === sectionId).length;
  }
  const section = SETTING_SECTIONS.find((item) => item.id === sectionId);
  if (section && sectionMatchesSearch(section, query)) {
    return SETTING_INDEX.filter((entry) => entry.section === sectionId).length;
  }
  return SETTING_INDEX.filter(
    (entry) => entry.section === sectionId && settingMatchesSearch(entry.id, sectionId, query),
  ).length;
}

export function isVisibleSetting(settingId, sectionId, query) {
  if (!query) return true;
  const section = SETTING_SECTIONS.find((item) => item.id === sectionId);
  return sectionMatchesSearch(section, query) || settingMatchesSearch(settingId, sectionId, query);
}

export function getNumberSetting(settings, key, fallback) {
  const value = Number(settings?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

export function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

export function formatSettingNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(digits).replace(/\.?0+$/, "");
}

function getSectionLabel(sectionId) {
  return SETTING_SECTIONS.find((section) => section.id === sectionId)?.label || sectionId;
}

export function getSearchResults(query, limit = 8) {
  if (!query) return [];
  return SETTING_INDEX
    .map((entry) => {
      const section = SETTING_SECTIONS.find((item) => item.id === entry.section);
      const settingScore = getTextSearchScore(
        createSearchText([entry.label, entry.description, entry.keywords]),
        query,
      );
      const sectionScore = getTextSearchScore(
        createSearchText([section?.label, section?.eyebrow, section?.description, section?.keywords]),
        query,
      );
      return {
        ...entry,
        score: settingScore + Math.round(sectionScore * 0.45),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      sectionLabel: getSectionLabel(entry.section),
    }));
}

export function createThemeTokenList(resolvedTheme) {
  const cssVars = resolvedTheme?.cssVars || {};
  const colors = resolvedTheme?.colors || {};
  const syntax = resolvedTheme?.syntax || {};
  return [
    { label: "Primary", varName: "--nexus-primary", value: cssVars["--nexus-primary"] || colors.primary },
    { label: "Secondary", varName: "--nexus-accent-2", value: cssVars["--nexus-accent-2"] || colors.secondary },
    { label: "Surface", varName: "--nexus-panel-surface", value: cssVars["--nexus-panel-surface"] || colors.surface },
    { label: "Control", varName: "--nexus-control-surface", value: cssVars["--nexus-control-surface"] || colors.inputSurfaceSoft },
    { label: "Border", varName: "--nexus-border", value: cssVars["--nexus-border"] || colors.border },
    { label: "Text", varName: "--nexus-text", value: cssVars["--nexus-text"] || colors.text },
    { label: "Muted", varName: "--nexus-muted", value: cssVars["--nexus-muted"] || colors.muted },
    { label: "Keyword", varName: "--nexus-keyword", value: cssVars["--nexus-keyword"] || syntax.keyword },
    { label: "String", varName: "--nexus-string", value: cssVars["--nexus-string"] || syntax.string },
    { label: "Function", varName: "--nexus-function", value: cssVars["--nexus-function"] || syntax.function },
  ].filter((token) => token.value);
}

export function getTextPresetId(settings = {}) {
  const fontSize = getNumberSetting(settings, "font_size", 14);
  const lineHeight = getNumberSetting(settings, "line_height", 1.6);
  const letterSpacing = getNumberSetting(settings, "letter_spacing", 0);
  return (
    TEXT_SIZE_PRESETS.find((preset) => (
      Math.abs(fontSize - preset.settings.font_size) < 0.01 &&
      Math.abs(lineHeight - preset.settings.line_height) < 0.01 &&
      Math.abs(letterSpacing - preset.settings.letter_spacing) < 0.01
    ))?.id || "custom"
  );
}

function pickThemeEditorSettings(settings = {}) {
  return Object.fromEntries(
    THEME_EDITOR_SETTING_KEYS
      .filter((key) => Object.prototype.hasOwnProperty.call(settings, key))
      .map((key) => [key, settings[key]]),
  );
}

export function buildThemeEditorResetPatch() {
  return Object.fromEntries(
    THEME_EDITOR_SETTING_KEYS
      .filter((key) => Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key))
      .map((key) => [key, DEFAULT_SETTINGS[key]]),
  );
}

export function getThemeEditorRecipeId(settings = {}) {
  return (
    THEME_EDITOR_RECIPES.find((recipe) =>
      Object.entries(recipe.settings).every(([key, value]) => settings[key] === value),
    )?.id || "custom"
  );
}

export function createThemeExportPayload(settings, resolvedTheme, visualBudgetSummary) {
  const cssVars = resolvedTheme?.cssVars || {};
  const tokenKeys = [
    "--nexus-primary",
    "--nexus-accent-2",
    "--nexus-surface",
    "--nexus-panel-surface",
    "--nexus-control-surface",
    "--nexus-control-surface-hover",
    "--nexus-border",
    "--nexus-glow-radius",
    "--nexus-glow-intensity",
    "--nexus-blur-radius",
  ];

  return {
    schema: "nexus-code.theme-editor.v1",
    theme: {
      id: resolvedTheme.id,
      name: resolvedTheme.name,
    },
    settings: pickThemeEditorSettings(settings),
    tokens: Object.fromEntries(
      tokenKeys
        .filter((key) => cssVars[key])
        .map((key) => [key, cssVars[key]]),
    ),
    visualBudget: {
      score: visualBudgetSummary.score,
      tier: visualBudgetSummary.tier,
      profile: visualBudgetSummary.profileLabel,
      categories: visualBudgetSummary.categories.map((category) => ({
        id: category.id,
        rating: category.rating,
        value: category.value,
      })),
      recommendations: visualBudgetSummary.recommendations,
    },
  };
}

export function formatJsonSize(payload) {
  const size = JSON.stringify(payload, null, 2).length;
  return size >= 1024 ? `${formatSettingNumber(size / 1024, 1)} KB` : `${size} B`;
}

function createBudgetCategory(id, label, rating, value, score, detail) {
  return {
    id,
    label,
    rating,
    value,
    score: Math.round(clampNumber(score, 0, 100, 0)),
    detail,
    hot: score >= 70,
  };
}

export function buildVisualBudgetSummary(settings = {}, visualProfileId, shouldReduceMotion) {
  const panelBlur = clampNumber(settings.panel_blur_strength, 0, 32, 16);
  const glowIntensity = clampNumber(settings.glow_intensity, 0, 100, 28);
  const glowRadius = clampNumber(settings.glow_radius, 0, 64, 14);
  const animationSpeed = clampNumber(settings.animation_speed, 0.5, 1.8, 1);
  const panelMode = settings.panel_background_mode || "blur";
  const animationsEnabled = settings.animations_enabled !== false;
  const rendererCost = settings.glow_renderer === "three" ? 18 : 0;
  const panelModeCost =
    panelMode === "glass-shader" ? 14 : panelMode === "fake-glass" ? 8 : 2;
  const motionCost = shouldReduceMotion || !animationsEnabled
    ? 0
    : 8 + Math.max(0, animationSpeed - 1) * 10;
  const featureCost =
    (settings.panel_glow_outline ? 8 : 0) +
    (settings.cursor_glow === true ? 4 : 0) +
    (settings.icon_glow ? 4 : 0) +
    (settings.minimap !== false ? 5 : 0) +
    (settings.autocomplete_enabled !== false ? 3 : 0) +
    (settings.autocomplete_lsp !== false && settings.lsp_enabled !== false ? 4 : 0);
  const blurScore = (panelBlur / 32) * 100;
  const glowScore =
    (glowIntensity / 100) * 58 +
    (glowRadius / 64) * 24 +
    rendererCost +
    (settings.panel_glow_outline ? 8 : 0) +
    (settings.cursor_glow === true ? 4 : 0) +
    (settings.icon_glow ? 4 : 0);
  const motionScore = shouldReduceMotion || !animationsEnabled
    ? 8
    : 32 + Math.max(0, animationSpeed - 1) * 42 + (settings.smooth_caret !== false ? 8 : 0);
  const backgroundScore =
    panelMode === "glass-shader"
      ? 82
      : panelMode === "fake-glass"
        ? 54
        : panelBlur >= 20
          ? 44
          : 24;
  const rawScore =
    (panelBlur / 32) * 24 +
    (glowIntensity / 100) * 26 +
    (glowRadius / 64) * 12 +
    rendererCost +
    panelModeCost +
    motionCost +
    featureCost;
  const score = Math.round(clampNumber(rawScore, 0, 100, 42));
  const tier =
    score >= 70
      ? "Teuer"
      : score >= 46
        ? "Mittel"
        : visualProfileId === "performance"
          ? "Low Power"
          : "Stabil";
  const tone = score >= 70 ? "warn" : score >= 46 ? "info" : "good";
  const categories = [
    createBudgetCategory(
      "blur",
      "Blur",
      panelBlur >= 24 ? "hoch" : panelBlur >= 14 ? "mittel" : "leicht",
      `${panelBlur}px`,
      blurScore,
      panelBlur >= 24
        ? "Backdrop-Blur kann beim Scrollen sichtbar kosten."
        : panelBlur <= 10
          ? "Scroll- und Resize-freundlich."
          : "Alltagstauglicher Glass-Wert.",
    ),
    createBudgetCategory(
      "glow",
      "Glow",
      glowScore >= 70 ? "hoch" : glowScore >= 42 ? "mittel" : "leicht",
      `${glowIntensity}% / ${glowRadius}px`,
      glowScore,
      settings.glow_renderer === "three"
        ? "Intensiver Renderer plus Glow reserviert extra Budget."
        : glowIntensity >= 55 || glowRadius >= 34
          ? "Grosses Leuchtfeld erhoeht Paint-Flaeche."
          : "CSS-Glow bleibt im normalen Rahmen.",
    ),
    createBudgetCategory(
      "motion",
      "Motion",
      shouldReduceMotion || !animationsEnabled
        ? "reduziert"
        : animationSpeed > 1.25
          ? "praesent"
          : "normal",
      shouldReduceMotion ? "Fallback" : `${formatSettingNumber(animationSpeed, 1)}x`,
      motionScore,
      shouldReduceMotion || !animationsEnabled
        ? "Animationen werden kurz gehalten oder ausgelassen."
        : animationSpeed > 1.25
          ? "Schnelle Transitions fallen staerker auf."
          : "Normale Settings- und Preview-Bewegung.",
    ),
    createBudgetCategory(
      "background",
      "Background",
      panelMode === "glass-shader" ? "hoch" : panelMode === "fake-glass" ? "mittel" : "leicht",
      panelMode,
      backgroundScore,
      panelMode === "glass-shader"
        ? "Shader-Glass ist der teuerste Panel-Modus."
        : panelMode === "fake-glass"
          ? "Fake Glass ist sichtbar, aber guenstiger als Shader."
          : "Blur-Modus nutzt den schlanksten Pfad.",
    ),
  ];
  const recommendations = [];
  if (panelBlur > 16) recommendations.push("Setze Blur fuer Low-Power auf 8-12px.");
  if (glowIntensity > 32 || glowRadius > 18) recommendations.push("Halte Glow bei 12-28% und Radius unter 18px.");
  if (settings.glow_renderer === "three") recommendations.push("Wechsle den Glow Renderer auf CSS.");
  if (panelMode === "glass-shader") recommendations.push("Nutze Blur oder Fake Glass statt Glass Shader.");
  if (!shouldReduceMotion && animationSpeed > 1.1) recommendations.push("Reduziere Motion auf 0.75-1.0x.");
  if (
    settings.minimap !== false &&
    settings.validation_decorations !== false &&
    settings.lsp_enabled !== false &&
    settings.autocomplete_lsp !== false
  ) {
    recommendations.push("Bei grossen Dateien Minimap zuerst deaktivieren; LSP-Autocomplete nur bei Bedarf.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Keine Low-Power-Aktion noetig; das aktuelle Profil ist schon sparsam.");
  }

  return {
    score,
    tier,
    tone,
    profileLabel: visualProfileId,
    categories,
    recommendations: recommendations.slice(0, 4),
  };
}

export function buildLowPowerState(settings = {}, visualProfileId, prefersReducedMotion, shouldReduceMotion) {
  const reasons = [];
  if (prefersReducedMotion) reasons.push("System reduziert Bewegung");
  if (settings.reduce_motion === true) reasons.push("Reduce Motion ist aktiv");
  if (settings.animations_enabled === false) reasons.push("Animationen sind deaktiviert");
  if (visualProfileId === "performance") reasons.push("Performance-Profil ist aktiv");
  if (settings.smooth_caret === false) reasons.push("Sanfter Caret ist deaktiviert");
  const actions = [
    "Blur 8px, Glow 12% / 8px",
    "CSS-Renderer, kein Panel-Outline",
    "Motion aus, Caret ruhig",
    "Minimap aus; Autocomplete-Quellen bleiben separat steuerbar",
  ];

  const active = shouldReduceMotion || visualProfileId === "performance";
  return {
    active,
    title: active ? "Low-Power-Fallback aktiv" : "Low-Power-Fallback bereit",
    text: active
      ? "Nexus Code nutzt reduzierte Motion und ein kleineres Effektbudget."
      : "Ein Klick reduziert Blur, Glow, Motion und Minimap ohne Language Features abzuschalten.",
    reasons: reasons.length > 0 ? reasons : ["Balanced/Quality Visuals sind aktiv"],
    actions,
  };
}

export function buildPerformanceHints(settings = {}, visualProfileId, lspServers = [], shouldReduceMotion = false) {
  const hints = [];
  const panelBlur = getNumberSetting(settings, "panel_blur_strength", 16);
  const glowIntensity = getNumberSetting(settings, "glow_intensity", 28);
  const glowRadius = getNumberSetting(settings, "glow_radius", 14);
  const animationSpeed = clampNumber(settings.animation_speed, 0.5, 1.8, 1);
  const panelMode = settings.panel_background_mode || "blur";
  const missingLspCount = lspServers.filter((server) => !server.available).length;

  if (visualProfileId === "performance") {
    hints.push({
      tone: "good",
      title: "Performance-Profil aktiv",
      text: "Motion und Glow laufen bereits mit kleinem Budget.",
    });
  }
  if (shouldReduceMotion && visualProfileId !== "performance") {
    hints.push({
      tone: "good",
      title: "Motion-Fallback greift",
      text: "System- oder Nutzer-Setting reduziert Animationen auch ohne Performance-Profil.",
    });
  }
  if (panelBlur >= 24) {
    hints.push({
      tone: "warn",
      title: "Hoher Blur",
      text: "Backdrop-Blur ueber 24px kann Panel-Scrolling teurer machen.",
    });
  }
  if (glowIntensity >= 55 || glowRadius >= 34) {
    hints.push({
      tone: "warn",
      title: "Grosses Glow-Feld",
      text: "Intensitaet oder Radius vergroessern die Paint-Flaeche.",
    });
  }
  if (panelMode === "glass-shader") {
    hints.push({
      tone: "warn",
      title: "Glass Shader",
      text: "Shader-Glass sollte nur fuer starke Maschinen oder kurze Sessions aktiv sein.",
    });
  }
  if (settings.glow_renderer === "three") {
    hints.push({
      tone: "warn",
      title: "Intensiver Renderer",
      text: "Nur fuer starke Theme-Previews sinnvoll, CSS bleibt guenstiger.",
    });
  }
  if (settings.panel_glow_outline && glowIntensity >= 35) {
    hints.push({
      tone: "info",
      title: "Outline plus Glow",
      text: "Panel-Kanten und Glow addieren sich visuell; Balanced reicht meist.",
    });
  }
  if (!shouldReduceMotion && animationSpeed > 1.25) {
    hints.push({
      tone: "info",
      title: "Schnelle Motion",
      text: "Hoehere Animation Speed wirkt flotter, macht Transitions aber praesenter.",
    });
  }
  if (
    settings.autocomplete_enabled !== false &&
    settings.autocomplete_lsp !== false &&
    settings.lsp_enabled !== false &&
    missingLspCount > 0
  ) {
    hints.push({
      tone: "info",
      title: "LSP teilweise offline",
      text: `${missingLspCount} Server fehlen; Autocomplete faellt dort leiser zurueck.`,
    });
  }
  if (
    settings.autocomplete_enabled !== false &&
    settings.autocomplete_local_words !== false &&
    settings.autocomplete_language_hints !== false
  ) {
    hints.push({
      tone: "good",
      title: "Lokales Autocomplete aktiv",
      text: "Snippets, Sprach-Hints und Datei-Woerter bleiben nutzbar, auch wenn ein LSP fehlt.",
    });
  }
  if (
    settings.minimap !== false &&
    settings.validation_decorations !== false &&
    settings.lsp_enabled !== false &&
    settings.autocomplete_lsp !== false
  ) {
    hints.push({
      tone: "info",
      title: "Editor-Dienste komplett",
      text: "Minimap, Diagnostics und LSP sind nuetzlich, aber auf sehr grossen Dateien spuerbar.",
    });
  }
  if (hints.length === 0) {
    hints.push({
      tone: "good",
      title: "Budget stabil",
      text: "Blur, Glow und Language Features liegen im ausgewogenen Bereich.",
    });
  }
  return hints.slice(0, 5);
}
