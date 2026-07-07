import React from "react";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Code2,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  GitBranch,
  Info,
  Keyboard,
  Palette,
  Package,
  PanelBottom,
  PanelLeft,
  PanelRight,
  RefreshCcw,
  Search,
  Settings2,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

/* Lightweight native replacements for the UI-kit components. */

import {
  NativeInput,
  NativeLabel,
  NativeSelect,
  NativeSlider,
  NativeSwitch,
  backgrounds,
  fonts,
  themes,
  visualPerformanceProfiles,
} from './settingsShared';
import { resolveNexusTheme } from '../../theme/nexusThemeResolver.js';
import { DEFAULT_SETTINGS } from '../../pages/editor/editorShared.jsx';
import { createThemeSelectionPatch } from '../../pages/editor/themeOptionsModel.js';
import { createLspSetupModel } from '../../pages/editor/lspSetupModel.js';
import {
  getBottomPanelSizeOptions,
  getSidePanelSizeOptions,
  getWorkbenchLayoutPresetOptions,
  getWorkbenchZonePanelIds,
  normalizeWorkbenchLayout,
  WORKBENCH_SNAP_ZONES,
} from '../../pages/editor/workbenchDockModel.js';
import {
  KEYBINDING_SETTING_KEY,
  createKeybindingSettingsModel,
  normalizeKeybindingOverrideMap,
  normalizeKeybindingShortcut,
  validateKeybindingShortcut,
} from '../../pages/editor/keybindingModel.js';

const SETTING_SECTIONS = [
  {
    id: "theme-editor",
    label: "Theme Editor",
    eyebrow: "Design",
    icon: Palette,
    description: "Accent, Glow, Blur, Radius und Editor-Typografie zusammen steuern.",
    keywords: "theme color accent primary glow blur radius roundness editor font minimap diagnostics autocomplete",
  },
  {
    id: "editor",
    label: "Editor",
    eyebrow: "Text",
    icon: Code2,
    description: "Typing, Layout, Hilfen und CodeMirror-Verhalten.",
    keywords: "font line height letter spacing wrap minimap diagnostics autocomplete lsp whitespace cursor bracket tab",
  },
  {
    id: "workbench",
    label: "Workbench",
    eyebrow: "Shell",
    icon: PanelLeft,
    description: "Sidebar, Statusleiste, Zen Mode, Autosave und Panel-Verhalten.",
    keywords: "sidebar visible status bar zen autosave workbench panels background",
  },
  {
    id: "keybindings",
    label: "Keybindings",
    eyebrow: "Shortcuts",
    icon: Keyboard,
    description: "Shortcuts suchen, ueberschreiben, validieren und gezielt zuruecksetzen.",
    keywords: "keyboard shortcuts keybindings commands hotkeys reset conflicts",
  },
  {
    id: "terminal",
    label: "Terminal",
    eyebrow: "Shell",
    icon: Terminal,
    description: "Terminal-Profil und sichere Prozessoptionen.",
    keywords: "terminal shell profile powershell bash cmd process kill",
  },
  {
    id: "git",
    label: "Git/GitHub",
    eyebrow: "Source",
    icon: GitBranch,
    description: "Source-Control und GitHub-Workbench-Defaults.",
    keywords: "git github source control pull requests fetch commit notifications",
  },
  {
    id: "extensions",
    label: "Extensions",
    eyebrow: "Runtime",
    icon: Package,
    description: "Extension-Updates, Empfehlungen und Runtime-Verhalten.",
    keywords: "extensions plugins marketplace recommendations update runtime",
  },
  {
    id: "theme",
    label: "Theme",
    eyebrow: "Presets",
    icon: Sparkles,
    description: "Nexus-Presets, Hintergrund und Farbakzente.",
    keywords: "theme preset background color accent primary secondary",
  },
  {
    id: "performance",
    label: "Performance",
    eyebrow: "Budget",
    icon: Gauge,
    description: "Blur/Glow-Budget, LSP, Diagnostics und Rendering-Kosten.",
    keywords: "performance visual profile blur glow outline lsp diagnostics autocomplete minimap renderer hints budget low power fallback battery",
  },
  {
    id: "animations",
    label: "Animations",
    eyebrow: "Motion",
    icon: Zap,
    description: "Reduced Motion, Cursor-Animationen und Glow-Bewegung.",
    keywords: "animation motion reduce speed duration caret cursor blink glow",
  },
];

const SETTING_INDEX = [
  {
    id: "primary_accent",
    section: "theme-editor",
    label: "Primaerfarbe",
    description: "Hauptakzent fuer Buttons, Cursor, Selection und Nexus Glow.",
    keywords: "primary accent color colour theme editor",
  },
  {
    id: "secondary_accent",
    section: "theme-editor",
    label: "Sekundaerfarbe",
    description: "Zweiter Akzent fuer Gradients, Switches und dezente Highlights.",
    keywords: "secondary accent color colour theme editor",
  },
  {
    id: "custom_surface",
    section: "theme-editor",
    label: "Custom Surface",
    description: "Panel- und Editor-Oberflaeche als eigener Theme-Wert.",
    keywords: "surface panel background custom color colour theme editor",
  },
  {
    id: "custom_input_surface",
    section: "theme-editor",
    label: "Input Surface",
    description: "Control- und Input-Flaechen fuer Suche, Selects und Felder.",
    keywords: "input control surface field select search custom color colour",
  },
  {
    id: "theme_editor_presets",
    section: "theme-editor",
    label: "Theme Editor Presets",
    description: "Schnelle Rezepte fuer Fokus, Glass und Review-Optik.",
    keywords: "preset recipe apply reset theme editor quick focus glass review",
  },
  {
    id: "theme_export_json",
    section: "theme-editor",
    label: "Export JSON",
    description: "Theme-Editor-Settings und CSS-Tokens in die Zwischenablage kopieren.",
    keywords: "export copy clipboard json theme settings tokens",
  },
  {
    id: "glow_intensity",
    section: "theme-editor",
    label: "Glow Intensitaet",
    description: "Staerke der Akzentbeleuchtung in Panels, Text und Cursor.",
    keywords: "glow bloom neon intensity light",
  },
  {
    id: "glow_radius",
    section: "theme-editor",
    label: "Glow Radius",
    description: "Ausbreitung der Akzentbeleuchtung.",
    keywords: "glow radius bloom light spread",
  },
  {
    id: "panel_blur_strength",
    section: "theme-editor",
    label: "Blur Intensitaet",
    description: "Glass-Blur fuer Settings, Side Panels und Oberflaechen.",
    keywords: "blur glass backdrop performance panel",
  },
  {
    id: "panel_background_mode",
    section: "workbench",
    label: "Panel Background",
    description: "Blur, Fake Glass oder Glass Shader fuer Workbench-Panels.",
    keywords: "panel background blur glass shader workbench",
  },
  {
    id: "ui_radius",
    section: "theme-editor",
    label: "Roundness / Radius",
    description: "Radius fuer die Theme-Vorschau und gespeicherte UI-Rundung.",
    keywords: "radius roundness rounded corner ui",
  },
  {
    id: "font_family",
    section: "editor",
    label: "Editor Font",
    description: "Monospace-Schrift fuer den Code Editor.",
    keywords: "font family typeface editor typography",
  },
  {
    id: "font_size",
    section: "editor",
    label: "Editor Font Size",
    description: "Schriftgroesse in Pixeln.",
    keywords: "font size text zoom editor",
  },
  {
    id: "text_size_preset",
    section: "editor",
    label: "Textgroessen Presets",
    description: "Schnelle Kombinationen aus Font Size, Line Height und Letter Spacing.",
    keywords: "text size font preset scale compact comfortable presentation line height letter spacing",
  },
  {
    id: "line_height",
    section: "editor",
    label: "Line Height",
    description: "Zeilenhoehe im Editor.",
    keywords: "line height spacing editor",
  },
  {
    id: "font_weight",
    section: "editor",
    label: "Schriftstaerke",
    description: "Gewicht der Editor-Schrift.",
    keywords: "font weight bold medium typography",
  },
  {
    id: "letter_spacing",
    section: "editor",
    label: "Letter Spacing",
    description: "Zusatzabstand zwischen Zeichen im Code Editor.",
    keywords: "letter spacing tracking character typografie font editor",
  },
  {
    id: "tab_size",
    section: "editor",
    label: "Tab-Groesse",
    description: "Spaces pro Tab.",
    keywords: "tab size indentation indent spaces",
  },
  {
    id: "word_wrap",
    section: "editor",
    label: "Word Wrap",
    description: "Lange Zeilen umbrechen.",
    keywords: "wrap word line editor",
  },
  {
    id: "line_numbers",
    section: "editor",
    label: "Zeilennummern",
    description: "Line numbers im Gutter anzeigen.",
    keywords: "line numbers gutter editor",
  },
  {
    id: "minimap",
    section: "editor",
    label: "Minimap",
    description: "Kompakte Dateiuebersicht anzeigen, wenn verfuegbar.",
    keywords: "minimap overview code map",
  },
  {
    id: "validation_decorations",
    section: "editor",
    label: "Diagnostics",
    description: "Inline-Diagnostics und Lint-Gutter anzeigen.",
    keywords: "diagnostic validation errors warnings lint problems",
  },
  {
    id: "lsp_enabled",
    section: "editor",
    label: "Autocomplete",
    description: "Language-Server-basierte Vorschlaege, Hover und Diagnose.",
    keywords: "autocomplete completion suggestions lsp hover intellisense",
  },
  {
    id: "lsp_setup",
    section: "editor",
    label: "LSP Setup",
    description: "PATH-Erkennung, Env-Overrides, Install-Hints und Retry-Diagnose je Language Server.",
    keywords: "lsp setup language server path env override install hint retry status diagnostics typescript python rust go clangd",
  },
  {
    id: "autocomplete_enabled",
    section: "editor",
    label: "Autocomplete aktiv",
    description: "CodeMirror-Vorschlaege beim Schreiben und via Shortcut anzeigen.",
    keywords: "autocomplete completion suggestions intellisense active typing",
  },
  {
    id: "autocomplete_lsp",
    section: "editor",
    label: "LSP als Quelle",
    description: "Language Server fuer kontextnahe Vorschlaege nutzen, wenn verfuegbar.",
    keywords: "autocomplete completion lsp language server source",
  },
  {
    id: "autocomplete_snippets",
    section: "editor",
    label: "Snippets",
    description: "Mehrzeilige Vorlagen fuer haeufige Sprachmuster anbieten.",
    keywords: "autocomplete snippets templates boilerplate completion",
  },
  {
    id: "autocomplete_language_hints",
    section: "editor",
    label: "Sprach-Hints",
    description: "Keywords, Standardstrukturen und Framework-nahe Vorschlaege lokal anbieten.",
    keywords: "autocomplete language hints keywords structures local",
  },
  {
    id: "autocomplete_local_words",
    section: "editor",
    label: "Datei-Woerter",
    description: "Woerter und Symbole aus der aktuellen Datei als Vorschlaege verwenden.",
    keywords: "autocomplete local words symbols current document",
  },
  {
    id: "autocomplete_min_chars",
    section: "editor",
    label: "Autocomplete Trigger",
    description: "Wie viele Zeichen getippt werden, bevor Vorschlaege automatisch erscheinen.",
    keywords: "autocomplete trigger min chars delay typing",
  },
  {
    id: "autocomplete_max_items",
    section: "editor",
    label: "Autocomplete Limit",
    description: "Maximale interne Vorschlaege pro Anfrage.",
    keywords: "autocomplete completion limit max suggestions performance",
  },
  {
    id: "render_whitespace",
    section: "editor",
    label: "Whitespace anzeigen",
    description: "Unsichtbare Zeichen markieren.",
    keywords: "whitespace render spaces tabs invisible",
  },
  {
    id: "bracket_colorization",
    section: "editor",
    label: "Klammerfarben",
    description: "Bracket Colorization im Editor.",
    keywords: "bracket colorization parentheses braces colors",
  },
  {
    id: "format_on_paste",
    section: "editor",
    label: "Beim Einfuegen formatieren",
    description: "Format-on-paste fuer unterstuetzte Sprachen.",
    keywords: "format paste formatter editor",
  },
  {
    id: "sticky_scroll",
    section: "editor",
    label: "Sticky Scroll",
    description: "Fixierter Kontext im Editor.",
    keywords: "sticky scroll context editor",
  },
  {
    id: "sidebar_position",
    section: "workbench",
    label: "Sidebar Position",
    description: "Primary activity rail links oder rechts platzieren.",
    keywords: "sidebar workbench rail left right",
  },
  {
    id: "sidebar_visible",
    section: "workbench",
    label: "Sidebar Sichtbarkeit",
    description: "Activity Rail und Side Panel sichtbar halten.",
    keywords: "sidebar visible activity rail panel hide show workbench",
  },
  {
    id: "status_bar_visible",
    section: "workbench",
    label: "Statusleiste",
    description: "Workspace, Sprache und Problemstatus unten anzeigen.",
    keywords: "status bar workbench bottom",
  },
  {
    id: "zen_mode",
    section: "workbench",
    label: "Zen Mode",
    description: "Ablenkungsarme Arbeitsansicht.",
    keywords: "zen focus distraction workbench",
  },
  {
    id: "auto_save",
    section: "workbench",
    label: "Auto Save",
    description: "Lokale Aenderungen automatisch speichern.",
    keywords: "autosave auto save storage",
  },
  {
    id: "workbench_layout_presets",
    section: "workbench",
    label: "Layout Presets",
    description: "Fokus, Comfortable oder Wide direkt anwenden.",
    keywords: "layout preset compact focus comfortable wide quick action shell",
  },
  {
    id: "workbench_panel_sizes",
    section: "workbench",
    label: "Panel Groessen",
    description: "Side-Panel-Breite und Bottom-Dock-Hoehe einstellen.",
    keywords: "panel size width height side bottom dock compact",
  },
  {
    id: "workbench_docking",
    section: "workbench",
    label: "Docking",
    description: "Aktives Panel links, rechts, unten oder hidden docken.",
    keywords: "dock snap left right bottom hidden panel quick action",
  },
  {
    id: "workbench_layout_reset",
    section: "workbench",
    label: "Layout Reset",
    description: "Workbench Layout und Panel-Zonen auf Defaults zuruecksetzen.",
    keywords: "reset layout default fallback restore workbench",
  },
  {
    id: "keybindings_manager",
    section: "keybindings",
    label: "Keybindings Manager",
    description: "Shortcuts suchen, nach Kategorie filtern, Overrides setzen und Konflikte sehen.",
    keywords: "keyboard shortcuts keybindings commands hotkeys override reset conflict categories",
  },
  {
    id: "terminal_default_profile",
    section: "terminal",
    label: "Terminal Default Profile",
    description: "Startprofil fuer neue integrierte Terminals.",
    keywords: "terminal shell profile powershell bash cmd system",
  },
  {
    id: "terminal_confirm_kill",
    section: "terminal",
    label: "Terminal Kill Confirm",
    description: "Vor dem Beenden laufender Terminal-Prozesse bestaetigen.",
    keywords: "terminal process kill confirm safe",
  },
  {
    id: "git_auto_fetch",
    section: "git",
    label: "Git Auto Fetch",
    description: "Repository-Status automatisch im Hintergrund aktualisieren.",
    keywords: "git source control fetch background repository",
  },
  {
    id: "git_smart_commit",
    section: "git",
    label: "Smart Commit",
    description: "Commit-Aktionen fuer gestagte oder eindeutig geaenderte Dateien vorbereiten.",
    keywords: "git commit staged smart changes source control",
  },
  {
    id: "github_pr_notifications",
    section: "git",
    label: "GitHub PR Hinweise",
    description: "Pull-Request- und Review-Signale im GitHub-Panel anzeigen.",
    keywords: "github pull request review notifications prs",
  },
  {
    id: "extensions_auto_update",
    section: "extensions",
    label: "Extension Auto Update",
    description: "Installierte Extensions automatisch aktuell halten, wenn der Runtime-Provider es erlaubt.",
    keywords: "extensions plugins auto update marketplace runtime",
  },
  {
    id: "extensions_recommendations",
    section: "extensions",
    label: "Extension Recommendations",
    description: "Workspace-nahe Extension-Empfehlungen anzeigen.",
    keywords: "extensions recommendations workspace marketplace plugins",
  },
  {
    id: "theme",
    section: "theme",
    label: "Theme Preset",
    description: "Nexus Theme-Familie auswaehlen.",
    keywords: "theme preset palette",
  },
  {
    id: "background",
    section: "theme",
    label: "Hintergrund",
    description: "Theme-Hintergrund oder alternative Presets.",
    keywords: "background wallpaper gradient surface",
  },
  {
    id: "visual_performance_profile",
    section: "performance",
    label: "Performance-Profil",
    description: "Ausbalanciertes Budget fuer Blur, Glow und Animation.",
    keywords: "performance quality balanced profile visual",
  },
  {
    id: "visual_budget_summary",
    section: "performance",
    label: "Visual Budget",
    description: "Sichtbarer Kostenindikator fuer Blur, Glow, Renderer und Motion.",
    keywords: "visual budget cost expensive blur glow renderer motion paint performance",
  },
  {
    id: "low_power_fallback",
    section: "performance",
    label: "Low-Power Fallback",
    description: "Reduzierte Visuals, Motion und Minimap fuer schwache Systeme.",
    keywords: "low power fallback battery reduce motion performance profile minimap",
  },
  {
    id: "glow_renderer",
    section: "performance",
    label: "Glow Renderer",
    description: "CSS oder intensiver Renderpfad fuer Licht.",
    keywords: "glow renderer css three performance",
  },
  {
    id: "panel_glow_outline",
    section: "performance",
    label: "Panel Glow Outline",
    description: "Leuchtende Panel-Kante fuer aktives Theme.",
    keywords: "panel glow outline border light performance",
  },
  {
    id: "reduce_motion",
    section: "animations",
    label: "Reduce Motion",
    description: "Panel-Motion reduzieren und Cursor sanfter deaktivieren.",
    keywords: "reduce motion animation accessibility",
  },
  {
    id: "animations_enabled",
    section: "animations",
    label: "Animationen",
    description: "Mikroanimationen im Settings-Erlebnis ein- oder ausschalten.",
    keywords: "animations motion transition",
  },
  {
    id: "animation_speed",
    section: "animations",
    label: "Animation Speed",
    description: "Tempo der Settings-Transitions und Preview-Bewegung.",
    keywords: "animation speed motion duration transition tempo",
  },
  {
    id: "smooth_caret",
    section: "animations",
    label: "Sanfte Cursor-Animation",
    description: "Cursor-Bewegung und visuelles Effektbudget steuern.",
    keywords: "caret cursor animation smooth",
  },
  {
    id: "cursor_blinking",
    section: "animations",
    label: "Cursor-Blinken",
    description: "Blinkverhalten im Code Editor.",
    keywords: "cursor blinking blink phase smooth solid",
  },
  {
    id: "cursor_style",
    section: "animations",
    label: "Cursor-Stil",
    description: "Linie, Block oder Unterstrich.",
    keywords: "cursor style line block underline",
  },
  {
    id: "cursor_glow",
    section: "animations",
    label: "Cursor-Glow",
    description: "Leuchtender Cursor im Editor.",
    keywords: "cursor glow caret light",
  },
  {
    id: "icon_glow",
    section: "animations",
    label: "Icon Glow",
    description: "Leuchtende Icons in der Shell.",
    keywords: "icon glow shell light",
  },
];

const SECTION_IDS = SETTING_SECTIONS.map((section) => section.id);
const SETTING_INDEX_BY_ID = new Map(SETTING_INDEX.map((entry) => [entry.id, entry]));
const WORKBENCH_LAYOUT_OPTIONS = getWorkbenchLayoutPresetOptions();
const WORKBENCH_SIDE_PANEL_SIZE_OPTIONS = getSidePanelSizeOptions();
const WORKBENCH_BOTTOM_PANEL_SIZE_OPTIONS = getBottomPanelSizeOptions();
const WORKBENCH_QUICK_ACTION_SETTING_IDS = Object.freeze([
  "workbench_layout_presets",
  "workbench_panel_sizes",
  "workbench_docking",
  "workbench_layout_reset",
]);
const WORKBENCH_DOCK_ACTIONS = Object.freeze([
  {
    zone: WORKBENCH_SNAP_ZONES.left,
    label: "Links",
    Icon: PanelLeft,
  },
  {
    zone: WORKBENCH_SNAP_ZONES.right,
    label: "Rechts",
    Icon: PanelRight,
  },
  {
    zone: WORKBENCH_SNAP_ZONES.bottom,
    label: "Unten",
    Icon: PanelBottom,
  },
  {
    zone: WORKBENCH_SNAP_ZONES.hidden,
    label: "Hidden",
    Icon: EyeOff,
  },
]);

const TEXT_SIZE_PRESETS = [
  {
    id: "compact",
    label: "Compact",
    description: "13px / 1.45 fuer dichte Dateien.",
    settings: { font_size: 13, line_height: 1.45, letter_spacing: 0 },
  },
  {
    id: "standard",
    label: "Standard",
    description: "14px / 1.6 als ruhiger Default.",
    settings: { font_size: 14, line_height: 1.6, letter_spacing: 0 },
  },
  {
    id: "comfortable",
    label: "Comfort",
    description: "16px / 1.7 fuer laengere Sessions.",
    settings: { font_size: 16, line_height: 1.7, letter_spacing: 0.02 },
  },
  {
    id: "presentation",
    label: "Present",
    description: "18px / 1.75 fuer Demos und Reviews.",
    settings: { font_size: 18, line_height: 1.75, letter_spacing: 0.04 },
  },
];

const THEME_EDITOR_SETTING_KEYS = [
  "theme",
  "background",
  "primary_accent",
  "secondary_accent",
  "custom_surface",
  "custom_input_surface",
  "panel_background_mode",
  "glow_renderer",
  "panel_blur_strength",
  "panel_glow_outline",
  "glow_intensity",
  "glow_radius",
  "ui_radius",
  "font_family",
  "font_size",
  "line_height",
  "letter_spacing",
  "font_weight",
  "word_wrap",
  "minimap",
  "validation_decorations",
  "lsp_enabled",
  "reduce_motion",
  "animations_enabled",
  "animation_speed",
  "smooth_caret",
  "cursor_glow",
  "icon_glow",
  "visual_performance_profile",
];

const THEME_EDITOR_RECIPES = [
  {
    id: "focus",
    label: "Focus",
    description: "Dichte Code-Ansicht mit wenig Effektkosten.",
    colors: ["#7c8cff", "#38bdf8", "#11141d"],
    settings: {
      custom_surface: "#10131d",
      custom_input_surface: "#151a24",
      panel_background_mode: "blur",
      glow_renderer: "css",
      panel_blur_strength: 10,
      panel_glow_outline: false,
      glow_intensity: 18,
      glow_radius: 10,
      ui_radius: 8,
      animations_enabled: true,
      animation_speed: 0.9,
      visual_performance_profile: "custom",
    },
  },
  {
    id: "glass",
    label: "Glass",
    description: "Mehr Tiefe ohne den intensiven Renderer.",
    colors: ["#8aadf4", "#38bdf8", "#151925"],
    settings: {
      custom_surface: "#111827",
      custom_input_surface: "#182033",
      panel_background_mode: "fake-glass",
      glow_renderer: "css",
      panel_blur_strength: 20,
      panel_glow_outline: true,
      glow_intensity: 34,
      glow_radius: 18,
      ui_radius: 12,
      animations_enabled: true,
      animation_speed: 1,
      visual_performance_profile: "custom",
    },
  },
  {
    id: "review",
    label: "Review",
    description: "Praesenter Look fuer Pairing und Screen-Sharing.",
    colors: ["#f472b6", "#22d3ee", "#17111f"],
    settings: {
      primary_accent: "#f472b6",
      secondary_accent: "#22d3ee",
      custom_surface: "#17111f",
      custom_input_surface: "#22182d",
      panel_background_mode: "fake-glass",
      glow_renderer: "css",
      panel_blur_strength: 18,
      panel_glow_outline: true,
      glow_intensity: 42,
      glow_radius: 20,
      ui_radius: 14,
      font_size: 16,
      line_height: 1.7,
      letter_spacing: 0.02,
      animations_enabled: true,
      animation_speed: 1.05,
      visual_performance_profile: "custom",
    },
  },
];

function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok) return result.data;
    throw new Error(result.error || result.errorDetails?.code || "IPC response failed.");
  }
  return result || [];
}

function normalizeSearch(value) {
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

function resolveVisualProfileId(settings = {}) {
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

function countSectionMatches(sectionId, query) {
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

function isVisibleSetting(settingId, sectionId, query) {
  if (!query) return true;
  const section = SETTING_SECTIONS.find((item) => item.id === sectionId);
  return sectionMatchesSearch(section, query) || settingMatchesSearch(settingId, sectionId, query);
}

function getNumberSetting(settings, key, fallback) {
  const value = Number(settings?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function formatSettingNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(digits).replace(/\.?0+$/, "");
}

function getSectionLabel(sectionId) {
  return SETTING_SECTIONS.find((section) => section.id === sectionId)?.label || sectionId;
}

function getSearchResults(query, limit = 8) {
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

function createThemeTokenList(resolvedTheme) {
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

function getTextPresetId(settings = {}) {
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

function buildThemeEditorResetPatch() {
  return Object.fromEntries(
    THEME_EDITOR_SETTING_KEYS
      .filter((key) => Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key))
      .map((key) => [key, DEFAULT_SETTINGS[key]]),
  );
}

function getThemeEditorRecipeId(settings = {}) {
  return (
    THEME_EDITOR_RECIPES.find((recipe) =>
      Object.entries(recipe.settings).every(([key, value]) => settings[key] === value),
    )?.id || "custom"
  );
}

function createThemeExportPayload(settings, resolvedTheme, visualBudgetSummary) {
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

function formatJsonSize(payload) {
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

function buildVisualBudgetSummary(settings = {}, visualProfileId, shouldReduceMotion) {
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

function buildLowPowerState(settings = {}, visualProfileId, prefersReducedMotion, shouldReduceMotion) {
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

function buildPerformanceHints(settings = {}, visualProfileId, lspServers = [], shouldReduceMotion = false) {
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

function SettingsHeader({ title, eyebrow, description, icon: Icon }) {
  return (
    <div className="nx-code-settings-header flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-[var(--nexus-accent-2,#38bdf8)]">
          <Icon size={13} className="shrink-0 opacity-80" />
          <span className="min-w-0 break-words">{eyebrow}</span>
        </div>
        <h2 className="mt-1.5 break-words text-[1.55rem] font-semibold leading-tight text-gray-100 sm:text-[1.75rem]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingsGroup({ title, description, children }) {
  return (
    <section
      className="nx-code-settings-group min-w-0 rounded-lg border px-3.5 py-3.5 sm:px-4 sm:py-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: "rgba(156,178,226,0.075)",
      }}
    >
      <div className="mb-3 flex min-w-0 flex-col gap-1">
        <h3 className="break-words text-sm font-semibold leading-tight text-gray-200">
          {title}
        </h3>
        {description ? (
          <p className="break-words text-xs leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function SettingRow({
  id,
  sectionId,
  searchQuery,
  title,
  description,
  children,
  compact = false,
}) {
  if (!isVisibleSetting(id, sectionId, searchQuery)) return null;
  return (
    <div
      className={`nx-code-settings-row min-w-0 rounded-md border px-3 py-3 ${
        compact ? "sm:items-center" : "sm:items-start"
      }`}
      style={{
        background: "rgba(255,255,255,0.014)",
        borderColor: "rgba(156,178,226,0.055)",
      }}
    >
      <div className="min-w-0 flex-1">
        <NativeLabel className="block whitespace-normal break-words leading-5 text-gray-300">
          {title}
        </NativeLabel>
        {description ? (
          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="nx-code-settings-control min-w-0 w-full shrink-0">
        {children}
      </div>
    </div>
  );
}

function ValueBadge({ children }) {
  return (
    <span
      className="inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight text-gray-300"
      style={{
        background: "rgba(255,255,255,0.032)",
        borderColor: "rgba(156,178,226,0.08)",
      }}
    >
      {children}
    </span>
  );
}

function KeybindingManager({
  model,
  overrides,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onSetOverride,
  onResetBinding,
  onResetAll,
}) {
  const [drafts, setDrafts] = React.useState({});
  React.useEffect(() => {
    setDrafts(
      Object.fromEntries(
        model.rows.map((row) => [row.id, row.override || row.defaultShortcut || ""]),
      ),
    );
  }, [model.rows, overrides]);

  const commitDraft = React.useCallback(
    (row) => {
      const validation = validateKeybindingShortcut(drafts[row.id]);
      if (!validation.ok) return;
      onSetOverride(row.id, validation.normalized);
      setDrafts((current) => ({
        ...current,
        [row.id]: validation.normalized || row.defaultShortcut,
      }));
    },
    [drafts, onSetOverride],
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_13rem_auto]">
        <div className="relative min-w-0">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <NativeInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Command, Shortcut oder Kategorie suchen"
            className="h-9 w-full pl-8"
          />
        </div>
        <NativeSelect
          value={category}
          onValueChange={onCategoryChange}
          className="h-9 w-full"
        >
          <option value="all">Alle Kategorien</option>
          {model.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.count})
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          onClick={onResetAll}
          disabled={model.overrideCount === 0}
          className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "rgba(255,255,255,0.026)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <RefreshCcw size={13} />
          <span className="min-w-0 break-words">Alle zuruecksetzen</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ValueBadge>{model.visibleCount} sichtbar</ValueBadge>
        <ValueBadge>{model.overrideCount} Overrides</ValueBadge>
        <ValueBadge>{model.conflictCount} Konflikte</ValueBadge>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {model.rows.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-white/[0.018] px-3 py-4 text-xs text-gray-500">
            Keine Keybindings fuer diese Suche.
          </div>
        ) : (
          model.rows.map((row) => {
            const draft = drafts[row.id] ?? row.override ?? row.defaultShortcut;
            const validation = validateKeybindingShortcut(draft);
            const isChanged =
              normalizeKeybindingShortcut(draft) !==
              normalizeKeybindingShortcut(row.override || row.defaultShortcut);
            return (
              <div
                key={row.id}
                className="grid min-w-0 grid-cols-1 gap-3 rounded-md border px-3 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)_auto]"
                style={{
                  background: row.hasConflict
                    ? "rgba(245,158,11,0.07)"
                    : "rgba(255,255,255,0.014)",
                  borderColor: row.hasConflict
                    ? "rgba(245,158,11,0.18)"
                    : "rgba(156,178,226,0.055)",
                }}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words text-xs font-semibold text-gray-200">
                      {row.label}
                    </span>
                    <span className="rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[10px] leading-tight text-gray-500">
                      {row.category}
                    </span>
                    {row.isCustomized ? (
                      <span className="rounded border border-[rgba(var(--nexus-primary-rgb),0.22)] bg-[rgba(var(--nexus-primary-rgb),0.08)] px-1.5 py-0.5 text-[10px] leading-tight text-[var(--nexus-primary)]">
                        Override
                      </span>
                    ) : null}
                    {row.hasConflict ? (
                      <span className="rounded border border-amber-300/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] leading-tight text-amber-200">
                        Konflikt
                      </span>
                    ) : null}
                  </div>
                  <code className="mt-1 block break-all text-[10px] leading-4 text-gray-500">
                    {row.command}
                  </code>
                  <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                    Default: {row.defaultShortcut || "nicht gesetzt"} · When: {row.when}
                  </p>
                </div>
                <div className="min-w-0">
                  <NativeInput
                    value={draft}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                    onBlur={() => commitDraft(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitDraft(row);
                    }}
                    placeholder="z.B. Ctrl+Shift+P"
                    className={`h-9 w-full font-mono ${
                      validation.ok ? "" : "border-red-400/40"
                    }`}
                  />
                  {!validation.ok ? (
                    <p className="mt-1 break-words text-[10px] leading-4 text-red-300/80">
                      {validation.reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => commitDraft(row)}
                    disabled={!validation.ok || !isChanged}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold text-gray-300 transition-colors hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.026)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Check size={12} />
                    Setzen
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetBinding(row.id)}
                    disabled={!row.isCustomized}
                    title="Binding zuruecksetzen"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-gray-400 transition-colors hover:bg-white/[0.045] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.026)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <RefreshCcw size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SearchResultSummary({
  query,
  totalMatches,
  sectionMatchCounts,
  results,
  onOpenSetting,
}) {
  const matchedSections = SETTING_SECTIONS.filter(
    (section) => sectionMatchCounts[section.id] > 0,
  );

  return (
    <section
      className="nx-code-settings-group rounded-lg border p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: "rgba(156,178,226,0.075)",
      }}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Search size={13} />
            <span className="min-w-0 break-words">Result Hints</span>
          </div>
          <p className="mt-2 break-words text-sm text-gray-300">
            {totalMatches} Treffer fuer "{query}"
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
            Oeffne einen Treffer direkt oder nutze die Kategorien links als gefilterte Karte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {matchedSections.map((section) => (
            <span
              key={section.id}
              className="rounded-md border px-2 py-1 text-[10px] font-medium leading-tight text-gray-400"
              style={{
                background: "rgba(255,255,255,0.035)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {section.label} {sectionMatchCounts[section.id]}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {results.map((result) => (
          <button
            key={`${result.section}-${result.id}`}
            type="button"
            onClick={() => onOpenSetting(result)}
            className="min-w-0 rounded-md border p-3 text-left transition-colors hover:bg-white/[0.04]"
            style={{
              background: "rgba(255,255,255,0.018)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-xs font-semibold text-gray-200">
                {result.label}
              </span>
              <span className="shrink-0 rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[10px] leading-tight text-gray-500">
                {result.sectionLabel}
              </span>
            </div>
            <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
              {result.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function ThemeTokenGrid({ tokens }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {tokens.map((token) => (
        <div
          key={token.varName}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border px-2.5 py-2"
          style={{
            background: "rgba(255,255,255,0.018)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="h-6 w-6 shrink-0 rounded-md border border-white/10"
            style={{ background: token.value }}
          />
          <div className="min-w-0 flex-1">
            <div className="break-words text-xs font-medium text-gray-300">
              {token.label}
            </div>
            <code className="block break-all text-[10px] text-gray-500">
              {token.varName}
            </code>
          </div>
          <code className="max-w-full break-all text-[10px] text-gray-500 sm:ml-auto sm:max-w-[8rem] sm:shrink-0">
            {token.value}
          </code>
        </div>
      ))}
    </div>
  );
}

function PerformanceHintList({ hints }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {hints.map((hint) => (
        <div
          key={`${hint.title}-${hint.text}`}
          className="flex min-w-0 gap-3 rounded-md border px-3 py-2.5"
          style={{
            background:
              hint.tone === "warn"
                ? "rgba(245,158,11,0.08)"
                : hint.tone === "good"
                  ? "rgba(34,197,94,0.07)"
                  : "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
            borderColor:
              hint.tone === "warn"
                ? "rgba(245,158,11,0.18)"
                : hint.tone === "good"
                  ? "rgba(34,197,94,0.16)"
                  : "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
          }}
        >
          <Info size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <div className="break-words text-xs font-semibold text-gray-200">
              {hint.title}
            </div>
            <p className="mt-0.5 break-words text-[10px] leading-4 text-gray-500">
              {hint.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getLspToneClass(tone) {
  if (tone === "good") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  if (tone === "warn") return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  if (tone === "error") return "border-rose-300/20 bg-rose-300/10 text-rose-200";
  if (tone === "muted") return "border-white/[0.08] bg-white/[0.025] text-gray-500";
  return "border-sky-300/20 bg-sky-300/10 text-sky-200";
}

function getLspRowBackground(tone) {
  if (tone === "good") {
    return {
      background: "linear-gradient(135deg, rgba(34,197,94,0.07), rgba(14,165,233,0.032))",
      borderColor: "rgba(34,197,94,0.18)",
    };
  }
  if (tone === "warn") {
    return {
      background: "linear-gradient(135deg, rgba(251,191,36,0.075), rgba(148,163,184,0.025))",
      borderColor: "rgba(251,191,36,0.17)",
    };
  }
  if (tone === "error") {
    return {
      background: "linear-gradient(135deg, rgba(244,63,94,0.075), rgba(148,163,184,0.025))",
      borderColor: "rgba(244,63,94,0.18)",
    };
  }
  return {
    background: "rgba(255,255,255,0.018)",
    borderColor: "rgba(255,255,255,0.07)",
  };
}

function getLspStatusIcon(tone) {
  if (tone === "good") return Check;
  if (tone === "warn" || tone === "error") return X;
  return Info;
}

function LspSetupPanel({ model, isRefreshing, onRefresh }) {
  const summary = model.summary;
  const detailTitles = ["Server", "Env-Var", "Install-Hint"];

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Info size={13} className="shrink-0" />
            <span className="min-w-0 break-words">PATH / Env / Retry</span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <p className="break-words text-sm font-semibold leading-tight text-gray-200">
              {summary.headline}
            </p>
            <ValueBadge>{summary.readyCount}/{summary.total} bereit</ValueBadge>
          </div>
          <p className="mt-1 max-w-3xl break-words text-[11px] leading-5 text-gray-500">
            {summary.message}
          </p>
          <p className="mt-1 max-w-3xl break-words text-[10px] leading-4 text-gray-600">
            {summary.caption}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
          title="PATH, Env-Overrides und Serverstatus erneut pruefen"
        >
          <RefreshCcw size={13} className={isRefreshing ? "animate-spin" : ""} />
          <span className="min-w-0 break-words">
            {isRefreshing ? "Pruefe" : "Status aktualisieren"}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {model.rows.map((row) => {
          const StatusIcon = getLspStatusIcon(row.statusTone);
          const rowStyle = getLspRowBackground(row.statusTone);
          return (
            <div
              key={row.id}
              className="grid min-w-0 gap-3 rounded-md border px-3 py-2.5"
              style={rowStyle}
              title={row.lastDiagnostic || row.statusDescription}
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words text-xs font-semibold leading-tight text-gray-200">
                      {row.languageLabel}
                    </span>
                    <span className="rounded-md border border-white/[0.08] bg-black/20 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-gray-500">
                      {row.serverLabel}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                    {row.statusDescription}
                  </p>
                </div>
                <span
                  className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight ${getLspToneClass(row.statusTone)}`}
                >
                  <StatusIcon size={12} className="shrink-0" />
                  <span className="min-w-0 break-words">{row.statusLabel}</span>
                </span>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-3">
                {row.details.map((detail, index) => (
                  <div
                    key={`${row.id}-${detailTitles[index]}`}
                    className="min-w-0 rounded-md border border-white/[0.055] bg-black/10 px-2.5 py-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase leading-tight text-gray-500">
                      <span>{detailTitles[index]}</span>
                      <span className={`rounded border px-1.5 py-0.5 normal-case ${getLspToneClass(detail.tone)}`}>
                        {detail.label}
                      </span>
                    </div>
                    {detail.code ? (
                      <code className="mt-1 block break-all text-[10px] leading-4 text-gray-400">
                        {detail.code}
                      </code>
                    ) : null}
                    <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 items-start gap-2 rounded-md border border-white/[0.05] bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-500">
                <RefreshCcw size={12} className="mt-0.5 shrink-0 text-gray-500" />
                <span className="min-w-0 break-words">{row.actionHint}</span>
              </div>
              {row.lastDiagnostic ? (
                <div className="break-words rounded-md border border-white/[0.05] bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-600">
                  Diagnose: {row.lastDiagnostic}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisualBudgetCard({ summary }) {
  const toneStyles =
    summary.tone === "warn"
      ? {
          background: "rgba(245,158,11,0.08)",
          borderColor: "rgba(245,158,11,0.2)",
          fill: "linear-gradient(90deg, #f59e0b, #ef4444)",
        }
      : summary.tone === "good"
        ? {
            background: "rgba(34,197,94,0.07)",
            borderColor: "rgba(34,197,94,0.16)",
            fill: "linear-gradient(90deg, #8b5cf6, #38bdf8)",
          }
        : {
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
            borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
            fill: "linear-gradient(90deg, var(--nexus-primary), var(--nexus-accent-2))",
          };

  return (
    <section
      className="nx-code-settings-group rounded-lg border p-4"
      style={{
        background:
          summary.tone === "warn" || summary.tone === "good"
            ? toneStyles.background
            : "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.045), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: toneStyles.borderColor,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Gauge size={13} />
            <span className="min-w-0 break-words">Visual Budget</span>
          </div>
          <div className="mt-2 break-words text-sm font-semibold text-gray-100">
            {summary.tier}
          </div>
        </div>
        <ValueBadge>{summary.score}/100</ValueBadge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/25">
        <div
          className="h-full rounded-full"
          style={{
            width: `${summary.score}%`,
            background: toneStyles.fill,
          }}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {summary.categories.map((category) => (
          <div
            key={category.id}
            className="min-w-0 rounded-md border border-white/5 bg-black/10 px-2.5 py-2 text-[10px]"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 break-words font-semibold text-gray-400">{category.label}</span>
              <span className={category.hot ? "shrink-0 font-semibold text-amber-200" : "shrink-0 text-gray-300"}>
                {category.rating}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center justify-between gap-2 text-gray-500">
              <span className="min-w-0 break-words">{category.detail}</span>
              <span className="shrink-0 text-gray-400">{category.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {summary.recommendations.map((recommendation) => (
          <div
            key={recommendation}
            className="flex min-w-0 gap-2 rounded-md bg-black/10 px-2.5 py-1.5 text-[10px] leading-4 text-gray-400"
          >
            <Zap size={11} className="mt-0.5 shrink-0 text-gray-500" />
            <span className="min-w-0 break-words">{recommendation}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LowPowerFallbackPanel({ state, onApply, onRestore }) {
  return (
    <section
      className="nx-code-settings-group rounded-lg border p-4"
      style={{
        background: state.active
          ? "rgba(34,197,94,0.055)"
          : "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.042), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: state.active
          ? "rgba(34,197,94,0.16)"
          : "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Cpu size={13} />
            <span className="min-w-0 break-words">Low Power</span>
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold text-gray-100">
            {state.title}
          </h3>
          <p className="mt-1 max-w-xl break-words text-xs leading-5 text-gray-500">
            {state.text}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold leading-tight text-gray-100"
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)",
            }}
          >
            <Zap size={13} />
            Anwenden
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300"
          >
            <RefreshCcw size={13} />
            Balanced
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] leading-tight text-gray-400"
          >
            {reason}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {state.actions.map((action) => (
          <div
            key={action}
            className="rounded-md border border-white/5 bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-400"
          >
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}

function ColorControl({ value, fallback, onChange, label }) {
  const current = value || fallback;
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(current)
    ? current
    : /^#[0-9a-fA-F]{3}$/.test(current)
      ? current
      : fallback;
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <input
        aria-label={label}
        type="color"
        value={pickerValue}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-white/10 bg-transparent p-1"
      />
      <NativeInput
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 bg-white/5 font-mono text-gray-300"
        style={{
          background: "var(--nexus-input-surface, rgba(255,255,255,0.04))",
          border: "1px solid rgba(156,178,226,0.1)",
        }}
      />
      {value ? (
        <button
          type="button"
          title="Preset-Wert verwenden"
          onClick={() => onChange(null)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.025] text-gray-500 transition-colors hover:bg-white/[0.052] hover:text-gray-300"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

function TextPresetGrid({ settings, onApplyPreset, shouldReduceMotion }) {
  const activePresetId = getTextPresetId(settings);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TEXT_SIZE_PRESETS.map((preset) => (
        <PresetButton
          key={preset.id}
          active={activePresetId === preset.id}
          title={preset.label}
          description={preset.description}
          shouldReduceMotion={shouldReduceMotion}
          onClick={() => onApplyPreset(preset)}
        />
      ))}
    </div>
  );
}

function ThemeEditorUtilityPanel({
  activeRecipeId,
  copyStatus,
  exportSize,
  primaryAccent,
  secondaryAccent,
  shouldReduceMotion,
  onApplyRecipe,
  onApplyBalancedVisuals,
  onApplyLowPower,
  onCopyJson,
  onResetThemeEditor,
}) {
  return (
    <SettingsGroup
      title="Presets und Austausch"
      description="Theme-Rezepte anwenden, lokale Theme-Werte exportieren oder Designwerte zuruecksetzen."
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_EDITOR_RECIPES.map((recipe) => (
            <PresetButton
              key={recipe.id}
              active={activeRecipeId === recipe.id}
              title={recipe.label}
              description={recipe.description}
              colors={recipe.colors}
              shouldReduceMotion={shouldReduceMotion}
              onClick={() => onApplyRecipe(recipe)}
            />
          ))}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-44 lg:grid-cols-1">
          <button
            type="button"
            onClick={onApplyBalancedVisuals}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <Gauge size={13} />
            <span className="min-w-0 break-words text-center">Balanced</span>
          </button>
          <button
            type="button"
            onClick={onApplyLowPower}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <Cpu size={13} />
            <span className="min-w-0 break-words text-center">Low Power</span>
          </button>
          <button
            type="button"
            onClick={onCopyJson}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold leading-tight text-gray-100 transition-colors hover:bg-white/[0.05]"
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.22)",
            }}
          >
            <Clipboard size={13} />
            <span className="min-w-0 break-words text-center">
              {copyStatus === "copied" ? "Kopiert" : copyStatus === "failed" ? "Fehler" : "Copy JSON"}
            </span>
          </button>
          <button
            type="button"
            onClick={onResetThemeEditor}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <RefreshCcw size={13} />
            <span className="min-w-0 break-words text-center">Reset Design</span>
          </button>
          <div className="rounded-md border border-white/5 bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-500 sm:col-span-2 lg:col-span-1">
            JSON {exportSize}; Accent {primaryAccent}; Secondary {secondaryAccent}
          </div>
        </div>
      </div>
    </SettingsGroup>
  );
}

function PresetButton({
  active,
  title,
  description,
  badge,
  colors = [],
  onClick,
  shouldReduceMotion,
  disabled = false,
}) {
  return (
    <motion.button
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      onClick={onClick}
      disabled={disabled}
      className="group min-w-0 rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
      style={{
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)"
          : "rgba(255,255,255,0.018)",
        borderColor: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.26)"
          : "rgba(156,178,226,0.065)",
        boxShadow: active
          ? "0 12px 26px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.065)"
          : "none",
      }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 break-words text-xs font-semibold leading-tight text-gray-200">
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {badge ? (
            <span className="rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-500">
              {badge}
            </span>
          ) : null}
          {active ? <Check size={13} style={{ color: "var(--nexus-primary)" }} /> : null}
        </span>
      </div>
      {description ? (
        <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
          {description}
        </p>
      ) : null}
      {colors.length > 0 ? (
        <div className="mt-3 flex gap-1">
          {colors.slice(0, 4).map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="h-4 w-4 rounded-full border border-white/10"
              style={{ background: color }}
            />
          ))}
        </div>
      ) : null}
    </motion.button>
  );
}

function WorkbenchSegmentedControl({
  label,
  options,
  value,
  onChange,
  getOptionLabel = (option) => option.label,
  disabled = false,
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 break-words text-[10px] font-semibold uppercase leading-tight text-gray-500">
        {label}
      </div>
      <div
        className="grid min-h-9 min-w-0 overflow-hidden rounded-md border border-white/10 bg-white/[0.025]"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const isActive = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(option.id)}
              aria-pressed={isActive}
              title={option.title || option.label}
              className={`min-w-0 px-2 py-1.5 text-[10px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                isActive
                  ? "bg-white/12 text-white"
                  : "text-[var(--nexus-muted)] hover:bg-white/[0.07] hover:text-gray-200"
              }`}
            >
              <span className="block min-w-0 break-words">{getOptionLabel(option)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getZonePanelSummary(layout, zone) {
  const count = getWorkbenchZonePanelIds(layout, zone).length;
  if (count === 1) return "1 Panel";
  return `${count} Panels`;
}

function WorkbenchQuickActions({
  layout,
  activePanelId,
  activePanelLabel,
  onApplyPreset,
  onSetSidePanelSize,
  onSetBottomPanelSize,
  onDockActivePanel,
  onResetLayout,
}) {
  const normalizedLayout = normalizeWorkbenchLayout(layout);
  const activeZone = activePanelId
    ? normalizedLayout.panelZones?.[activePanelId] || null
    : null;
  const canDock = Boolean(activePanelId && onDockActivePanel);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <WorkbenchSegmentedControl
          label="Layout"
          options={WORKBENCH_LAYOUT_OPTIONS}
          value={normalizedLayout.presetId}
          onChange={onApplyPreset}
          disabled={!onApplyPreset}
          getOptionLabel={(option) => option.label}
        />
        <WorkbenchSegmentedControl
          label="Side"
          options={WORKBENCH_SIDE_PANEL_SIZE_OPTIONS}
          value={normalizedLayout.sidePanelSize}
          onChange={onSetSidePanelSize}
          disabled={!onSetSidePanelSize}
        />
        <WorkbenchSegmentedControl
          label="Bottom"
          options={WORKBENCH_BOTTOM_PANEL_SIZE_OPTIONS}
          value={normalizedLayout.bottomPanelSize}
          onChange={onSetBottomPanelSize}
          disabled={!onSetBottomPanelSize}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0 rounded-md border border-white/5 bg-white/[0.014] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="break-words text-[10px] font-semibold uppercase leading-tight text-gray-500">
                Docking
              </div>
              <div className="mt-1 break-words text-xs font-semibold text-gray-200">
                {activePanelLabel || activePanelId || "Explorer"}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              {WORKBENCH_DOCK_ACTIONS.map(({ zone, label, Icon }) => {
                const isActive = activeZone === zone;
                return (
                  <button
                    key={zone}
                    type="button"
                    disabled={!canDock}
                    onClick={() => onDockActivePanel?.(zone)}
                    aria-pressed={isActive}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      isActive
                        ? "border-white/20 bg-white/12 text-white"
                        : "border-white/10 bg-white/[0.03] text-[var(--nexus-muted)] hover:bg-white/[0.07] hover:text-gray-200"
                    }`}
                    title={`Dock ${label}`}
                  >
                    <Icon size={13} />
                    <span className="sr-only">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-gray-500 sm:grid-cols-4">
            {WORKBENCH_DOCK_ACTIONS.map(({ zone, label }) => (
              <div
                key={`${zone}-summary`}
                className="min-w-0 rounded-md border border-white/5 bg-black/10 px-2 py-1.5"
              >
                <div className="break-words font-semibold text-gray-400">{label}</div>
                <div className="break-words">{getZonePanelSummary(normalizedLayout, zone)}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!onResetLayout}
          onClick={onResetLayout}
          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-45 xl:w-32"
          title="Workbench Layout zuruecksetzen"
        >
          <RefreshCcw size={13} />
          Reset
        </button>
      </div>
    </div>
  );
}

function ThemePreview({
  settings,
  resolvedTheme,
  visualBudgetSummary,
  themeName,
  primaryAccent,
  secondaryAccent,
  radius,
  animationSpeed,
  shouldReduceMotion,
}) {
  const glowIntensity = getNumberSetting(settings, "glow_intensity", 28);
  const glowRadius = getNumberSetting(settings, "glow_radius", 14);
  const blurStrength = getNumberSetting(settings, "panel_blur_strength", 16);
  const fontSize = getNumberSetting(settings, "font_size", 14);
  const lineHeight = getNumberSetting(settings, "line_height", 1.6);
  const letterSpacing = getNumberSetting(settings, "letter_spacing", 0);
  const surfaceHex = resolvedTheme.colors.surfaceHex || "#11141d";
  const inputSurface = settings.custom_input_surface || resolvedTheme.colors.inputSurface || "#151924";
  const sidebarVisible = settings.sidebar_visible !== false;
  const statusVisible = settings.status_bar_visible !== false;
  const sidebarRight = settings.sidebar_position === "right";
  const cursorStyle = settings.cursor_style || "line";
  const previewShadow =
    glowIntensity > 0
      ? `0 0 ${Math.max(4, Math.round((glowRadius * glowIntensity) / 90))}px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)`
      : "none";
  const cursorShape =
    cursorStyle === "block"
      ? "h-5 w-2.5"
      : cursorStyle === "underline"
        ? "h-0.5 w-4 self-end"
        : "h-5 w-0.5";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="nx-code-settings-preview overflow-hidden rounded-lg border"
      style={{
        borderRadius: radius,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(0,0,0,0.18)",
        borderColor: "rgba(156,178,226,0.08)",
        boxShadow: previewShadow,
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3"
        style={{
          background: `linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.09), rgba(var(--nexus-accent-2-rgb, 45, 212, 191), 0.04))`,
          backdropFilter: blurStrength > 0 ? `blur(${Math.min(12, blurStrength)}px)` : "none",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: primaryAccent }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: secondaryAccent }}
          />
          <span className="ml-1 min-w-0 break-words text-xs font-semibold text-gray-300">
            settings.preview.tsx
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
          <span>{themeName}</span>
          <span>{settings.word_wrap ? "Wrap" : "No Wrap"}</span>
          <span>{shouldReduceMotion ? "Motion off" : `${formatSettingNumber(animationSpeed, 2)}x motion`}</span>
        </div>
      </div>
      <div className="flex min-h-[15rem]">
        {sidebarVisible && !sidebarRight ? (
          <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-white/5 py-4">
            {[primaryAccent, secondaryAccent, "rgba(255,255,255,0.18)"].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-6 w-6 rounded-md border border-white/10"
                style={{ background: color }}
              />
            ))}
          </div>
        ) : null}
        <div className="grid min-w-0 flex-1 grid-cols-[3rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <div className="border-r border-white/5 px-3 py-4 text-right font-mono text-[11px] leading-6 text-gray-600">
            <div>1</div>
            <div>2</div>
            <div>3</div>
            <div>4</div>
          </div>
          <div
            className="min-w-0 px-4 py-4 font-mono text-gray-300"
            style={{
              fontFamily: settings.font_family || "JetBrains Mono",
              fontSize,
              lineHeight,
              letterSpacing,
              fontWeight: settings.font_weight || "400",
            }}
          >
            <div>
              <span style={{ color: "var(--nexus-keyword)" }}>const</span>{" "}
              <span style={{ color: "var(--nexus-variable)" }}>theme</span>{" "}
              <span style={{ color: "var(--nexus-operator)" }}>=</span>{" "}
              <span style={{ color: "var(--nexus-string)" }}>"Nexus"</span>;
            </div>
            <div>
              <span style={{ color: "var(--nexus-function)" }}>applyGlow</span>
              <span style={{ color: "var(--nexus-text)" }}>(</span>
              <span style={{ color: "var(--nexus-number)" }}>{glowIntensity}</span>
              <span style={{ color: "var(--nexus-text)" }}>)</span>;
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-gray-500">
              <span>// cursor</span>
              <span
                className={`${cursorShape} inline-block rounded-sm`}
                style={{ background: primaryAccent, boxShadow: previewShadow }}
              />
              <span>{cursorStyle}</span>
            </div>
            <div className="break-words text-gray-500">
              // blur {blurStrength}px, radius {radius}px, letter {formatSettingNumber(letterSpacing, 2)}px
            </div>
            <div
              className="mt-4 rounded-md border px-3 py-2 font-sans text-xs"
              style={{
                background: "var(--nexus-input-surface, rgba(255,255,255,0.05))",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Search size={13} className="shrink-0 text-gray-500" />
                <span className="min-w-0 break-words text-gray-400">Settings suchen: input surface, glow, low power</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 font-sans text-[10px] text-gray-500 lg:grid-cols-4">
              {visualBudgetSummary.categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-md border border-white/5 bg-black/10 px-2 py-1.5"
                >
                  <div className="break-words font-semibold text-gray-300">{category.label}</div>
                  <div className={category.hot ? "text-amber-200" : "text-gray-500"}>
                    {category.rating} / {category.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {sidebarVisible && sidebarRight ? (
          <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-l border-white/5 py-4">
            {[primaryAccent, secondaryAccent, "rgba(255,255,255,0.18)"].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-6 w-6 rounded-md border border-white/10"
                style={{ background: color }}
              />
            ))}
          </div>
        ) : null}
      </div>
      {statusVisible ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-2 text-[10px] leading-tight text-gray-500">
          <span>main.tsx</span>
          <span>Surface {surfaceHex}</span>
          <span>Input {inputSurface}</span>
          <span>{settings.lsp_enabled !== false ? "LSP ready" : "LSP off"}</span>
          <span>{settings.auto_save !== false ? "Auto Save" : "Manual Save"}</span>
        </div>
      ) : null}
    </motion.div>
  );
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  onResetSettings,
  onClose,
  themeOptionsModel,
  workbenchLayout,
  activeWorkbenchPanelId = "explorer",
  activeWorkbenchPanelLabel = "Explorer",
  onApplyWorkbenchLayoutPreset,
  onSetSidePanelSize,
  onSetBottomPanelSize,
  onDockActivePanel,
  onResetWorkbenchLayout,
}) {
  const [activeSection, setActiveSection] = React.useState("theme-editor");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [keybindingSearchQuery, setKeybindingSearchQuery] = React.useState("");
  const [keybindingCategory, setKeybindingCategory] = React.useState("all");
  const [lspServers, setLspServers] = React.useState([]);
  const [lspSetupState, setLspSetupState] = React.useState({
    loading: false,
    error: null,
    bridgeAvailable: null,
    checkedAt: null,
  });
  const [copyStatus, setCopyStatus] = React.useState("idle");
  const lspRefreshIdRef = React.useRef(0);
  const lspMountedRef = React.useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const resolvedTheme = React.useMemo(
    () => resolveNexusTheme(settings),
    [settings],
  );
  const effectiveThemeOptionsModel = React.useMemo(() => {
    if (themeOptionsModel?.options) return themeOptionsModel;
    return {
      builtIn: themes.map((theme) => ({
        ...theme,
        label: theme.name,
        source: "built-in",
        sourceLabel: "Built-in",
        selectable: true,
      })),
      extension: [],
      unavailable: [],
      options: themes,
      selectable: themes,
      selectedThemeAvailable: true,
      selectedThemeId: settings.theme,
      fallbackThemeId: DEFAULT_SETTINGS.theme,
    };
  }, [settings.theme, themeOptionsModel]);
  const searchTerm = normalizeSearch(searchQuery);
  const activeThemeId = effectiveThemeOptionsModel.selectable.some(
    (theme) => theme.id === settings.theme,
  )
    ? settings.theme
    : effectiveThemeOptionsModel.selectedThemeId || resolvedTheme.id;
  const primaryAccent = resolvedTheme.colors.primary;
  const secondaryAccent = resolvedTheme.colors.secondary;
  const visualProfileId = resolveVisualProfileId(settings);
  const themeEditorRecipeId = React.useMemo(
    () => getThemeEditorRecipeId(settings),
    [settings],
  );
  const reducedBySetting = settings.reduce_motion === true;
  const animationsEnabled = settings.animations_enabled !== false;
  const animationSpeed = clampNumber(settings.animation_speed, 0.5, 1.8, 1);
  const shouldReduceMotion =
    prefersReducedMotion ||
    reducedBySetting ||
    !animationsEnabled ||
    visualProfileId === "performance";
  const motionTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.22 / animationSpeed, ease: [0.22, 1, 0.36, 1] };
  const radius = getNumberSetting(settings, "ui_radius", 10);
  const letterSpacing = clampNumber(settings.letter_spacing, 0, 1.5, 0);
  const scopedThemeVars = React.useMemo(() => {
    const cssVars = resolvedTheme.cssVars;
    const radiusXs = Math.max(4, radius - 6);
    const radiusSm = Math.max(6, radius - 4);
    const radiusLg = radius + 4;
    const radiusXl = radius + 8;
    return {
      ...cssVars,
      "--nexus-primary": cssVars["--nexus-primary"],
      "--nexus-primary-rgb": cssVars["--nexus-primary-rgb"],
      "--nexus-primary-hsl": cssVars["--nexus-primary-hsl"],
      "--nexus-primary-foreground": cssVars["--nexus-primary-foreground"],
      "--nexus-accent-2": cssVars["--nexus-accent-2"],
      "--nexus-accent-2-rgb": cssVars["--nexus-accent-2-rgb"],
      "--nexus-accent-2-hsl": cssVars["--nexus-accent-2-hsl"],
      "--nexus-accent-glow": cssVars["--nexus-accent-glow"],
      "--nexus-comment": cssVars["--nexus-comment"],
      "--nexus-keyword": cssVars["--nexus-keyword"],
      "--nexus-string": cssVars["--nexus-string"],
      "--nexus-number": cssVars["--nexus-number"],
      "--nexus-function": cssVars["--nexus-function"],
      "--nexus-variable": cssVars["--nexus-variable"],
      "--nexus-type": cssVars["--nexus-type"],
      "--nexus-operator": cssVars["--nexus-operator"],
      "--primary-rgb": cssVars["--primary-rgb"],
      "--nexus-settings-radius": `${radius}px`,
      "--nexus-radius-xs": `${radiusXs}px`,
      "--nexus-radius-sm": `${radiusSm}px`,
      "--nexus-radius-md": `${radius}px`,
      "--nexus-radius-lg": `${radiusLg}px`,
      "--nexus-radius-xl": `${radiusXl}px`,
      "--nexus-radius-2xl": `${radiusXl + 4}px`,
    };
  }, [resolvedTheme, radius]);
  const themeTokens = React.useMemo(
    () => createThemeTokenList(resolvedTheme),
    [resolvedTheme],
  );

  const sectionMatchCounts = React.useMemo(
    () =>
      Object.fromEntries(
        SECTION_IDS.map((sectionId) => [
          sectionId,
          countSectionMatches(sectionId, searchTerm),
        ]),
      ),
    [searchTerm],
  );

  const visibleSectionIds = React.useMemo(() => {
    if (!searchTerm) return [activeSection];
    return SETTING_SECTIONS
      .filter((section) => sectionMatchCounts[section.id] > 0)
      .map((section) => section.id);
  }, [activeSection, searchTerm, sectionMatchCounts]);

  const activeMeta =
    SETTING_SECTIONS.find((section) => section.id === activeSection) ||
    SETTING_SECTIONS[0];
  const totalMatches = Object.values(sectionMatchCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const searchResults = React.useMemo(
    () => getSearchResults(searchTerm),
    [searchTerm],
  );
  const lspSetupModel = React.useMemo(
    () => createLspSetupModel(lspServers, lspSetupState),
    [lspServers, lspSetupState],
  );
  const keybindingPlatform =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "")
      ? "mac"
      : "default";
  const keybindingOverrides = React.useMemo(
    () => normalizeKeybindingOverrideMap(settings[KEYBINDING_SETTING_KEY]),
    [settings],
  );
  const keybindingModel = React.useMemo(
    () =>
      createKeybindingSettingsModel({
        overrides: keybindingOverrides,
        query: keybindingSearchQuery || searchQuery,
        category: keybindingCategory,
        platform: keybindingPlatform,
      }),
    [keybindingCategory, keybindingOverrides, keybindingPlatform, keybindingSearchQuery, searchQuery],
  );
  const performanceHints = React.useMemo(
    () => buildPerformanceHints(settings, visualProfileId, lspServers, shouldReduceMotion),
    [lspServers, settings, shouldReduceMotion, visualProfileId],
  );
  const visualBudgetSummary = React.useMemo(
    () => buildVisualBudgetSummary(settings, visualProfileId, shouldReduceMotion),
    [settings, shouldReduceMotion, visualProfileId],
  );
  const themeExportPayload = React.useMemo(
    () => createThemeExportPayload(settings, resolvedTheme, visualBudgetSummary),
    [resolvedTheme, settings, visualBudgetSummary],
  );
  const themeExportSize = React.useMemo(
    () => formatJsonSize(themeExportPayload),
    [themeExportPayload],
  );
  const lowPowerState = React.useMemo(
    () => buildLowPowerState(settings, visualProfileId, prefersReducedMotion, shouldReduceMotion),
    [prefersReducedMotion, settings, shouldReduceMotion, visualProfileId],
  );
  const normalizedWorkbenchLayout = React.useMemo(
    () => normalizeWorkbenchLayout(workbenchLayout),
    [workbenchLayout],
  );
  const showWorkbenchQuickActions = React.useMemo(
    () =>
      WORKBENCH_QUICK_ACTION_SETTING_IDS.some((settingId) =>
        isVisibleSetting(settingId, "workbench", searchTerm),
      ),
    [searchTerm],
  );

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    Object.entries(scopedThemeVars).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  }, [scopedThemeVars]);

  const refreshLspServers = React.useCallback(async () => {
    const refreshId = lspRefreshIdRef.current + 1;
    lspRefreshIdRef.current = refreshId;
    const api = typeof window !== "undefined" ? window.electronAPI : null;
    if (!api?.lspListServers) {
      if (!lspMountedRef.current) return;
      setLspServers([]);
      setLspSetupState({
        loading: false,
        error: null,
        bridgeAvailable: false,
        checkedAt: null,
      });
      return;
    }

    if (lspMountedRef.current) {
      setLspSetupState((current) => ({
        ...current,
        loading: true,
        error: null,
        bridgeAvailable: true,
      }));
    }

    try {
      const result = await api.lspListServers();
      const servers = unwrapIpcResponse(result);
      if (!lspMountedRef.current || lspRefreshIdRef.current !== refreshId) return;
      setLspServers(Array.isArray(servers) ? servers : []);
      setLspSetupState({
        loading: false,
        error: null,
        bridgeAvailable: true,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (!lspMountedRef.current || lspRefreshIdRef.current !== refreshId) return;
      setLspServers([]);
      setLspSetupState({
        loading: false,
        error: error?.message || "LSP status check failed.",
        bridgeAvailable: true,
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  React.useEffect(() => {
    lspMountedRef.current = true;
    refreshLspServers();
    return () => {
      lspMountedRef.current = false;
    };
  }, [refreshLspServers]);

  const updateSetting = React.useCallback(
    (key, value) => {
      const next = { ...settings, [key]: value };
      if (
        key !== "visual_performance_profile" &&
        visualPerformanceProfiles.some((profile) =>
          Object.prototype.hasOwnProperty.call(profile.settings, key),
        )
      ) {
        next.visual_performance_profile = "custom";
      }
      onSettingsChange(next);
    },
    [onSettingsChange, settings],
  );

  const updateSettings = React.useCallback(
    (patch) => {
      const next = { ...settings, ...patch };
      if (
        Object.keys(patch).some((key) =>
          visualPerformanceProfiles.some((profile) =>
            Object.prototype.hasOwnProperty.call(profile.settings, key),
          ),
        )
      ) {
        next.visual_performance_profile = patch.visual_performance_profile || "custom";
      }
      onSettingsChange(next);
    },
    [onSettingsChange, settings],
  );

  const updateKeybindingOverrides = React.useCallback(
    (nextOverrides) => {
      updateSetting(KEYBINDING_SETTING_KEY, normalizeKeybindingOverrideMap(nextOverrides));
    },
    [updateSetting],
  );

  const setKeybindingOverride = React.useCallback(
    (bindingId, value) => {
      const normalized = normalizeKeybindingShortcut(value);
      const next = { ...keybindingOverrides };
      if (normalized) {
        next[bindingId] = normalized;
      } else {
        delete next[bindingId];
      }
      updateKeybindingOverrides(next);
    },
    [keybindingOverrides, updateKeybindingOverrides],
  );

  const resetKeybinding = React.useCallback(
    (bindingId) => {
      const next = { ...keybindingOverrides };
      delete next[bindingId];
      updateKeybindingOverrides(next);
    },
    [keybindingOverrides, updateKeybindingOverrides],
  );

  const applyVisualProfile = React.useCallback(
    (profile) => {
      onSettingsChange({ ...settings, ...profile.settings });
    },
    [onSettingsChange, settings],
  );

  const applyTextPreset = React.useCallback(
    (preset) => {
      updateSettings(preset.settings);
    },
    [updateSettings],
  );

  const applyLowPowerFallback = React.useCallback(() => {
    const performanceProfile = visualPerformanceProfiles.find(
      (profile) => profile.id === "performance",
    );
    updateSettings({
      ...(performanceProfile?.settings || {}),
      reduce_motion: true,
      animations_enabled: false,
      animation_speed: 0.75,
      minimap: false,
      smooth_caret: false,
      cursor_glow: false,
      icon_glow: false,
      panel_glow_outline: false,
      glow_renderer: "css",
      panel_background_mode: "blur",
      panel_blur_strength: 8,
      glow_intensity: 12,
      glow_radius: 8,
      visual_performance_profile: "performance",
    });
  }, [updateSettings]);

  const restoreBalancedVisuals = React.useCallback(() => {
    const balancedProfile = visualPerformanceProfiles.find(
      (profile) => profile.id === "balanced",
    );
    updateSettings({
      ...(balancedProfile?.settings || {}),
      reduce_motion: false,
      animations_enabled: true,
      animation_speed: 1,
      minimap: true,
      visual_performance_profile: "balanced",
    });
  }, [updateSettings]);

  const applyThemeEditorRecipe = React.useCallback(
    (recipe) => {
      updateSettings(recipe.settings);
    },
    [updateSettings],
  );

  const resetThemeEditor = React.useCallback(() => {
    updateSettings(buildThemeEditorResetPatch());
  }, [updateSettings]);

  const copyThemeJson = React.useCallback(async () => {
    const json = JSON.stringify(themeExportPayload, null, 2);
    try {
      const clipboard =
        typeof navigator !== "undefined" ? navigator.clipboard : null;
      if (!clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await clipboard.writeText(json);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  }, [themeExportPayload]);

  const renderIfVisible = (sectionId, render) =>
    visibleSectionIds.includes(sectionId) ? render() : null;

  const renderLspSetup = () =>
    isVisibleSetting("lsp_setup", "editor", searchTerm) ? (
      <SettingsGroup
        title="LSP Setup"
        description="PATH-Erkennung, Env-Overrides und Statusdiagnose ohne Auto-Installation."
      >
        <LspSetupPanel
          model={lspSetupModel}
          isRefreshing={lspSetupState.loading}
          onRefresh={refreshLspServers}
        />
      </SettingsGroup>
    ) : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motionTransition}
      className="nx-code-settings-panel flex-1 flex overflow-hidden rounded-xl border border-white/5 min-w-0"
      style={{
        ...scopedThemeVars,
        background:
          "radial-gradient(circle at 14% 0%, rgba(var(--nexus-primary-rgb), 0.04), transparent 22rem), linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), var(--nexus-panel-surface)",
        backdropFilter: "var(--nexus-settings-filter, blur(12px) saturate(110%))",
        WebkitBackdropFilter:
          "var(--nexus-settings-filter, blur(12px) saturate(110%))",
        borderColor: "rgba(156,178,226,0.095)",
        borderRadius: `min(16px, ${Math.max(10, radius + 5)}px)`,
      }}
    >
      <motion.aside
        initial={shouldReduceMotion ? false : { x: -220, opacity: 0 }}
        animate={shouldReduceMotion ? undefined : { x: 0, opacity: 1 }}
        transition={motionTransition}
        className="nx-code-settings-nav flex w-48 shrink-0 flex-col overflow-y-auto p-3 sm:w-56 sm:p-3.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.004)), var(--nexus-sidebar)",
          borderRight: "1px solid rgba(156,178,226,0.075)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="mb-4 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-gray-400 transition-colors hover:bg-white/[0.035] hover:text-gray-200"
        >
          <ArrowLeft size={16} />
          <span className="min-w-0 break-words text-sm">Zurueck</span>
        </button>

        <div className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 break-words text-xs font-semibold uppercase leading-tight text-gray-500">
              Einstellungen
            </span>
            <button
              type="button"
              onClick={onResetSettings}
              title="Alles zuruecksetzen"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-red-400/70 transition-colors hover:border-red-300/10 hover:bg-red-500/10 hover:text-red-300"
            >
              <RefreshCcw size={13} />
            </button>
          </div>
          <div className="relative mt-3">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Settings suchen"
              className="h-9 w-full rounded-md border border-white/10 bg-white/[0.026] pl-8 pr-8 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-[rgba(var(--nexus-primary-rgb),0.38)]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                title="Suche leeren"
                className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
          {searchTerm ? (
            <div className="mt-2 break-words text-[10px] leading-tight text-gray-500">
              {totalMatches} Treffer in {visibleSectionIds.length} Kategorien
            </div>
          ) : null}
        </div>

        <div className="space-y-1">
          {SETTING_SECTIONS.map((section, index) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id && !searchTerm;
            const count = sectionMatchCounts[section.id];
            const disabledBySearch = searchTerm && count === 0;
            return (
              <motion.button
                key={section.id}
                initial={shouldReduceMotion ? false : { x: -12, opacity: 0 }}
                animate={shouldReduceMotion ? undefined : { x: 0, opacity: 1 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { delay: 0.04 + index * 0.02, duration: 0.18 }
                }
                whileHover={shouldReduceMotion || disabledBySearch ? undefined : { x: 4 }}
                whileTap={shouldReduceMotion || disabledBySearch ? undefined : { scale: 0.99 }}
                type="button"
                onClick={() => {
                  if (!disabledBySearch) setActiveSection(section.id);
                }}
                className="relative flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left"
                style={{
                  background: isActive
                    ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)"
                    : "transparent",
                  color: disabledBySearch
                    ? "#4b5563"
                    : isActive
                      ? "var(--nexus-primary, #7c8cff)"
                      : "#9ca3af",
                  cursor: disabledBySearch ? "default" : "pointer",
                }}
              >
                {isActive ? (
                  <motion.span
                    layoutId="settingsActiveIndicator"
                    className="absolute left-1 top-1 bottom-1 w-0.5 rounded-full"
                    style={{
                      background: "var(--nexus-primary, #7c8cff)",
                      boxShadow:
                        "0 0 6px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)",
                    }}
                  />
                ) : null}
                <Icon size={16} className="shrink-0" />
                <span className="min-w-0 flex-1 break-words text-sm leading-tight">{section.label}</span>
                {searchTerm && count > 0 ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[10px] leading-tight">
                    {count}
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </motion.aside>

      <motion.main
        key={searchTerm ? "search-results" : activeSection}
        initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
        transition={motionTransition}
        className="nx-code-settings-content min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 xl:p-6"
      >
        {searchTerm && visibleSectionIds.length === 0 ? (
          <div className="flex h-full min-h-[22rem] items-center justify-center">
            <div className="max-w-sm text-center">
              <Search size={28} className="mx-auto text-gray-600" />
              <h2 className="mt-4 text-lg font-semibold text-gray-300">
                Keine Settings gefunden
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-gray-500">
                Probiere Begriffe wie Font, Glow, Diagnostics, Workbench oder
                Motion.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!searchTerm ? (
              <SettingsHeader
                title={activeMeta.label}
                eyebrow={activeMeta.eyebrow}
                description={activeMeta.description}
                icon={activeMeta.icon}
              />
            ) : (
              <SettingsHeader
                title="Suchergebnisse"
                eyebrow="Settings"
                description={`Gefiltert nach "${searchQuery}". Es werden passende Kategorien und Controls angezeigt.`}
                icon={Search}
              />
            )}

            {searchTerm ? (
              <SearchResultSummary
                query={searchQuery}
                totalMatches={totalMatches}
                sectionMatchCounts={sectionMatchCounts}
                results={searchResults}
                onOpenSetting={(result) => {
                  setActiveSection(result.section);
                  setSearchQuery("");
                }}
              />
            ) : null}

            {renderIfVisible("theme-editor", () => (
              <section key="theme-editor" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Theme Editor"
                    eyebrow="Design"
                    description="Die wichtigsten Design- und Editor-Regler an einem Ort."
                    icon={Palette}
                  />
                ) : null}
                <ThemePreview
                  settings={settings}
                  resolvedTheme={resolvedTheme}
                  visualBudgetSummary={visualBudgetSummary}
                  themeName={resolvedTheme.name}
                  primaryAccent={primaryAccent}
                  secondaryAccent={secondaryAccent}
                  radius={radius}
                  animationSpeed={animationSpeed}
                  shouldReduceMotion={shouldReduceMotion}
                />
                <ThemeEditorUtilityPanel
                  activeRecipeId={themeEditorRecipeId}
                  copyStatus={copyStatus}
                  exportSize={themeExportSize}
                  primaryAccent={primaryAccent}
                  secondaryAccent={secondaryAccent}
                  shouldReduceMotion={shouldReduceMotion}
                  onApplyRecipe={applyThemeEditorRecipe}
                  onApplyBalancedVisuals={restoreBalancedVisuals}
                  onApplyLowPower={applyLowPowerFallback}
                  onCopyJson={copyThemeJson}
                  onResetThemeEditor={resetThemeEditor}
                />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <VisualBudgetCard summary={visualBudgetSummary} />
                  <LowPowerFallbackPanel
                    state={lowPowerState}
                    onApply={applyLowPowerFallback}
                    onRestore={restoreBalancedVisuals}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup
                    title="Theme Tokens"
                    description="Direkte Farben und Oberflaechenwerte fuer Nexus Code."
                  >
                    <SettingRow
                      id="primary_accent"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Primaerfarbe"
                      description="Wirkt auf Cursor, aktive Settings, Buttons und Glow."
                    >
                      <ColorControl
                        label="Primaerfarbe"
                        value={settings.primary_accent}
                        fallback={primaryAccent}
                        onChange={(value) => updateSetting("primary_accent", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="secondary_accent"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Sekundaerfarbe"
                      description="Zweiter Ton fuer Gradients, Switches und Akzentpaare."
                    >
                      <ColorControl
                        label="Sekundaerfarbe"
                        value={settings.secondary_accent}
                        fallback={secondaryAccent}
                        onChange={(value) => updateSetting("secondary_accent", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="custom_surface"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Custom Surface"
                      description="Optionaler Panel-/Editor-Surface-Hexwert; leer entspricht dem Preset."
                    >
                      <ColorControl
                        label="Custom Surface"
                        value={settings.custom_surface}
                        fallback={resolvedTheme.colors.surfaceHex || "#11141d"}
                        onChange={(value) => updateSetting("custom_surface", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="custom_input_surface"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Input Surface"
                      description="Farbwert fuer Search-, Select- und Textfeld-Flaechen."
                    >
                      <ColorControl
                        label="Input Surface"
                        value={settings.custom_input_surface}
                        fallback={resolvedTheme.colors.inputSurface || "#151924"}
                        onChange={(value) => updateSetting("custom_input_surface", value)}
                      />
                    </SettingRow>
                    <ThemeTokenGrid tokens={themeTokens} />
                    <SettingRow
                      id="ui_radius"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Roundness / Radius: ${radius}px`}
                      description="Gespeicherter Radius fuer Theme-Editor und kuenftige UI-Anbindung."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[radius]}
                          onValueChange={([value]) => updateSetting("ui_radius", value)}
                          min={4}
                          max={24}
                          step={1}
                        />
                        <ValueBadge>{radius}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup
                    title="Glass und Glow"
                    description="Die sichtbaren Performance-sensiblen Design-Regler."
                  >
                    <SettingRow
                      id="glow_intensity"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Glow Intensitaet: ${settings.glow_intensity ?? 28}%`}
                      description="Steuert globale Accent-Leuchtkraft im Theme Resolver."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.glow_intensity ?? 28]}
                          onValueChange={([value]) => updateSetting("glow_intensity", value)}
                          min={0}
                          max={100}
                          step={5}
                        />
                        <ValueBadge>{settings.glow_intensity ?? 28}%</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="panel_blur_strength"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Blur Intensitaet: ${settings.panel_blur_strength ?? 16}px`}
                      description="Backdrop-Blur fuer Panels und Settings-Oberflaechen."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.panel_blur_strength ?? 16]}
                          onValueChange={([value]) => updateSetting("panel_blur_strength", value)}
                          min={0}
                          max={32}
                          step={2}
                        />
                        <ValueBadge>{settings.panel_blur_strength ?? 16}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="glow_radius"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Glow Radius: ${settings.glow_radius ?? 14}px`}
                      description="Ausbreitung des Accent-Glow."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.glow_radius ?? 14]}
                          onValueChange={([value]) => updateSetting("glow_radius", value)}
                          min={0}
                          max={64}
                          step={2}
                        />
                        <ValueBadge>{settings.glow_radius ?? 14}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>
                </div>

                <SettingsGroup
                  title="Editor Essentials"
                  description="Die VS-Code-artigen Editor-Optionen direkt im Theme Editor."
                >
                  <div className="mb-3">
                    <TextPresetGrid
                      settings={settings}
                      onApplyPreset={applyTextPreset}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SettingRow
                      id="font_family"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Editor Font"
                      description="Monospace-Familie fuer CodeMirror."
                    >
                      <NativeSelect
                        value={settings.font_family || "JetBrains Mono"}
                        onValueChange={(value) => updateSetting("font_family", value)}
                        className="w-48"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="font_size"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Font Size: ${settings.font_size || 14}px`}
                      description="Schriftgroesse im Editor."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.font_size || 14]}
                          onValueChange={([value]) => updateSetting("font_size", value)}
                          min={10}
                          max={28}
                          step={1}
                        />
                        <ValueBadge>{settings.font_size || 14}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="line_height"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Line Height: ${settings.line_height || 1.6}`}
                      description="Zeilenabstand in relativer Einheit."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.line_height || 1.6]}
                          onValueChange={([value]) => updateSetting("line_height", value)}
                          min={1.2}
                          max={2.5}
                          step={0.05}
                        />
                        <ValueBadge>{settings.line_height || 1.6}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="letter_spacing"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Letter Spacing: ${formatSettingNumber(letterSpacing, 2)}px`}
                      description="Wird direkt im CodeMirror Theme angewendet."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[letterSpacing]}
                          onValueChange={([value]) => updateSetting("letter_spacing", value)}
                          min={0}
                          max={1.5}
                          step={0.05}
                        />
                        <ValueBadge>{formatSettingNumber(letterSpacing, 2)}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="word_wrap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Word Wrap"
                      description="Lange Zeilen im Editor umbrechen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.word_wrap || false}
                        onCheckedChange={(value) => updateSetting("word_wrap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="minimap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Minimap"
                      description="Editor-Uebersicht aktiv lassen, wenn verfuegbar."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.minimap !== false}
                        onCheckedChange={(value) => updateSetting("minimap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="validation_decorations"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Diagnostics"
                      description="Lint-Gutter und Inline-Diagnostics anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.validation_decorations !== false}
                        onCheckedChange={(value) =>
                          updateSetting("validation_decorations", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete"
                      description="Language Server fuer Vorschlaege und Hover verwenden."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="reduce_motion"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Reduce Motion"
                      description="Reduziert Panel-Animation und setzt den Caret ruhig."
                      compact
                    >
                      <NativeSwitch
                        checked={reducedBySetting}
                        onCheckedChange={(value) =>
                          updateSettings({
                            reduce_motion: value,
                            smooth_caret: value ? false : true,
                          })
                        }
                      />
                    </SettingRow>
                  </div>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("editor", () => (
              <section key="editor" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Editor"
                    eyebrow="Text"
                    description="Typing, Layout, Hilfen und Cursor-Verhalten."
                    icon={Code2}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Typography" description="Editor-Schrift und Zeilenmetrik.">
                    <TextPresetGrid
                      settings={settings}
                      onApplyPreset={applyTextPreset}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                    <SettingRow
                      id="font_family"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Schriftfamilie"
                      description="Primare Monospace-Schrift."
                    >
                      <NativeSelect
                        value={settings.font_family || "JetBrains Mono"}
                        onValueChange={(value) => updateSetting("font_family", value)}
                        className="w-48"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="font_size"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Schriftgroesse: ${settings.font_size || 14}px`}
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.font_size || 14]}
                          onValueChange={([value]) => updateSetting("font_size", value)}
                          min={10}
                          max={28}
                          step={1}
                        />
                        <ValueBadge>{settings.font_size || 14}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="line_height"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Zeilenhoehe: ${settings.line_height || 1.6}`}
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.line_height || 1.6]}
                          onValueChange={([value]) => updateSetting("line_height", value)}
                          min={1.2}
                          max={2.5}
                          step={0.05}
                        />
                        <ValueBadge>{settings.line_height || 1.6}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="letter_spacing"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Letter Spacing: ${formatSettingNumber(letterSpacing, 2)}px`}
                      description="Feintuning fuer dichte Monospace-Schriften."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[letterSpacing]}
                          onValueChange={([value]) => updateSetting("letter_spacing", value)}
                          min={0}
                          max={1.5}
                          step={0.05}
                        />
                        <ValueBadge>{formatSettingNumber(letterSpacing, 2)}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="font_weight"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Schriftstaerke"
                      description="Codegewicht fuer bessere Lesbarkeit."
                    >
                      <NativeSelect
                        value={String(settings.font_weight || "400")}
                        onValueChange={(value) => updateSetting("font_weight", value)}
                        className="w-32"
                      >
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                      </NativeSelect>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Intelligence" description="Autocomplete, Snippets, lokale Woerter und Language Server.">
                    <SettingRow
                      id="autocomplete_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete aktiv"
                      description="Vorschlaege beim Tippen und ueber den Shortcut anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_enabled !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_lsp"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="LSP als Quelle"
                      description="Kontextnahe Vorschlaege vom Language Server nutzen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_lsp !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_lsp", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Language Server Engine"
                      description="Hover, Diagnostics und serverbasierte Features starten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_snippets"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Snippets"
                      description="Mehrzeilige Vorlagen fuer Funktionen, Klassen, SQL, HTML, Shell und mehr."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_snippets !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_snippets", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_language_hints"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Sprach-Hints"
                      description="Keywords und Standardstrukturen lokal anbieten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_language_hints !== false}
                        onCheckedChange={(value) =>
                          updateSetting("autocomplete_language_hints", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_local_words"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Datei-Woerter"
                      description="Symbole und Woerter aus der aktuellen Datei als Vorschlaege."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_local_words !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_local_words", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_min_chars"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Trigger nach: ${settings.autocomplete_min_chars || 2} Zeichen`}
                      description="Hoeher ist ruhiger, niedriger fuehlt sich schneller an."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.autocomplete_min_chars || 2]}
                          onValueChange={([value]) => updateSetting("autocomplete_min_chars", value)}
                          min={1}
                          max={5}
                          step={1}
                        />
                        <ValueBadge>{settings.autocomplete_min_chars || 2}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_max_items"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Vorschlagslimit: ${settings.autocomplete_max_items || 120}`}
                      description="Mehr Treffer sind hilfreicher, aber auf sehr grossen Dateien schwerer."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.autocomplete_max_items || 120]}
                          onValueChange={([value]) => updateSetting("autocomplete_max_items", value)}
                          min={24}
                          max={180}
                          step={12}
                        />
                        <ValueBadge>{settings.autocomplete_max_items || 120}</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Editor Verhalten" description="Sichtbarkeit und Eingabehilfen.">
                    <SettingRow
                      id="word_wrap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Word Wrap"
                      description="Lange Zeilen umbrechen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.word_wrap || false}
                        onCheckedChange={(value) => updateSetting("word_wrap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="minimap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Minimap"
                      description="Kompakte Uebersicht anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.minimap !== false}
                        onCheckedChange={(value) => updateSetting("minimap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="validation_decorations"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Diagnostics"
                      description="Inline-Fehler und Lint-Gutter."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.validation_decorations !== false}
                        onCheckedChange={(value) =>
                          updateSetting("validation_decorations", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="tab_size"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Tab-Groesse: ${settings.tab_size || 4}`}
                      description="Spaces pro Tab."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.tab_size || 4]}
                          onValueChange={([value]) => updateSetting("tab_size", value)}
                          min={2}
                          max={8}
                          step={2}
                        />
                        <ValueBadge>{settings.tab_size || 4}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="render_whitespace"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Whitespace anzeigen"
                      description="Unsichtbare Zeichen im Editor markieren."
                    >
                      <NativeSelect
                        value={settings.render_whitespace || "none"}
                        onValueChange={(value) => updateSetting("render_whitespace", value)}
                        className="w-36"
                      >
                        <option value="none">Keine</option>
                        <option value="boundary">Grenzen</option>
                        <option value="all">Alle</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="bracket_colorization"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Klammerfarben"
                      description="Bracket Colorization aktivieren."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.bracket_colorization !== false}
                        onCheckedChange={(value) =>
                          updateSetting("bracket_colorization", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="format_on_paste"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Beim Einfuegen formatieren"
                      description="Format-on-paste fuer unterstuetzte Sprachen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.format_on_paste !== false}
                        onCheckedChange={(value) => updateSetting("format_on_paste", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="line_numbers"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Zeilennummern"
                      description="Line numbers im Gutter anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.line_numbers !== false}
                        onCheckedChange={(value) => updateSetting("line_numbers", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="sticky_scroll"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Sticky Scroll"
                      description="Fixierten Kontext aktivieren."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.sticky_scroll || false}
                        onCheckedChange={(value) => updateSetting("sticky_scroll", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>
                </div>
                {renderLspSetup()}
              </section>
            ))}

            {renderIfVisible("workbench", () => (
              <section key="workbench" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Workbench"
                    eyebrow="Shell"
                    description="Nexus-Code-Arbeitsflaeche, Panels und Ablenkungsgrad."
                    icon={PanelLeft}
                  />
                ) : null}
                {showWorkbenchQuickActions ? (
                  <SettingsGroup
                    title="Layout und Docking"
                    description="Schnelle Workbench-Aktionen fuer Shell, Snap-Zonen und kompakte Panels."
                  >
                    <WorkbenchQuickActions
                      layout={normalizedWorkbenchLayout}
                      activePanelId={activeWorkbenchPanelId}
                      activePanelLabel={activeWorkbenchPanelLabel}
                      onApplyPreset={onApplyWorkbenchLayoutPreset}
                      onSetSidePanelSize={onSetSidePanelSize}
                      onSetBottomPanelSize={onSetBottomPanelSize}
                      onDockActivePanel={onDockActivePanel}
                      onResetLayout={onResetWorkbenchLayout}
                    />
                  </SettingsGroup>
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Layout" description="Primary Shell und Statusflaechen.">
                    <SettingRow
                      id="sidebar_position"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Sidebar Position"
                      description="Activity Rail links oder rechts."
                    >
                      <NativeSelect
                        value={settings.sidebar_position || "left"}
                        onValueChange={(value) => updateSetting("sidebar_position", value)}
                        className="w-32"
                      >
                        <option value="left">Links</option>
                        <option value="right">Rechts</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="sidebar_visible"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Sidebar anzeigen"
                      description="Activity Rail und Side Panel sichtbar halten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.sidebar_visible !== false}
                        onCheckedChange={(value) => updateSetting("sidebar_visible", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="status_bar_visible"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Statusleiste anzeigen"
                      description="Sprache, Workspace und Problemstatus unten halten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.status_bar_visible !== false}
                        onCheckedChange={(value) =>
                          updateSetting("status_bar_visible", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="zen_mode"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Zen Mode"
                      description="Fokussierte Oberflaeche ohne Zusatzrauschen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.zen_mode || false}
                        onCheckedChange={(value) => updateSetting("zen_mode", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="auto_save"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Auto Save"
                      description="Aenderungen ueber die bestehende Storage-Pipeline sichern."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.auto_save !== false}
                        onCheckedChange={(value) => updateSetting("auto_save", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Panels" description="Glass-Style fuer Workbench-Container.">
                    <SettingRow
                      id="panel_background_mode"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Panel Background"
                      description="Blur, Fake Glass oder intensiver Glass Shader."
                    >
                      <NativeSelect
                        value={settings.panel_background_mode || "blur"}
                        onValueChange={(value) => updateSetting("panel_background_mode", value)}
                        className="w-40"
                      >
                        <option value="blur">Blur</option>
                        <option value="fake-glass">Fake Glass</option>
                        <option value="glass-shader">Glass Shader</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="ui_radius"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`UI Radius: ${radius}px`}
                      description="Gespeicherte Roundness fuer das Nexus-Design."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[radius]}
                          onValueChange={([value]) => updateSetting("ui_radius", value)}
                          min={4}
                          max={24}
                          step={1}
                        />
                        <ValueBadge>{radius}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>
                </div>
              </section>
            ))}

            {renderIfVisible("keybindings", () => (
              <section key="keybindings" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Keybindings"
                    eyebrow="Shortcuts"
                    description="Command-Shortcuts durchsuchen, lokal ueberschreiben und Konflikte erkennen."
                    icon={Keyboard}
                  />
                ) : null}
                <SettingsGroup
                  title="Shortcuts"
                  description="Overrides bleiben lokal im Settings-Objekt und koennen pro Binding oder komplett zurueckgesetzt werden."
                >
                  <SettingRow
                    id="keybindings_manager"
                    sectionId="keybindings"
                    searchQuery={searchTerm}
                    title="Keybinding Manager"
                    description="Standard-Shortcuts, Overrides, Kategorien und Konflikte in einer kompakten Liste."
                  >
                    <KeybindingManager
                      model={keybindingModel}
                      overrides={keybindingOverrides}
                      search={keybindingSearchQuery}
                      category={keybindingCategory}
                      onSearchChange={setKeybindingSearchQuery}
                      onCategoryChange={setKeybindingCategory}
                      onSetOverride={setKeybindingOverride}
                      onResetBinding={resetKeybinding}
                      onResetAll={() => updateKeybindingOverrides({})}
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("terminal", () => (
              <section key="terminal" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Terminal"
                    eyebrow="Shell"
                    description="Terminal-Defaults fuer neue Sessions."
                    icon={Terminal}
                  />
                ) : null}
                <SettingsGroup title="Terminal Defaults" description="Sichere, kleine Defaults fuer das integrierte Terminal.">
                  <SettingRow
                    id="terminal_default_profile"
                    sectionId="terminal"
                    searchQuery={searchTerm}
                    title="Default Profile"
                    description="Profil fuer neue Terminal-Sessions."
                  >
                    <NativeSelect
                      value={settings.terminal_default_profile || "system"}
                      onValueChange={(value) => updateSetting("terminal_default_profile", value)}
                      className="w-44"
                    >
                      <option value="system">System Default</option>
                      <option value="powershell">PowerShell</option>
                      <option value="bash">Bash</option>
                      <option value="cmd">Command Prompt</option>
                    </NativeSelect>
                  </SettingRow>
                  <SettingRow
                    id="terminal_confirm_kill"
                    sectionId="terminal"
                    searchQuery={searchTerm}
                    title="Kill bestaetigen"
                    description="Vor dem Beenden laufender Prozesse nachfragen."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.terminal_confirm_kill !== false}
                      onCheckedChange={(value) => updateSetting("terminal_confirm_kill", value)}
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("git", () => (
              <section key="git" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Git/GitHub"
                    eyebrow="Source"
                    description="Source-Control- und Review-nahe Defaults."
                    icon={GitBranch}
                  />
                ) : null}
                <SettingsGroup title="Source Control" description="Ruhige Defaults fuer lokale Repos und GitHub-Workbench.">
                  <SettingRow
                    id="git_auto_fetch"
                    sectionId="git"
                    searchQuery={searchTerm}
                    title="Auto Fetch"
                    description="Repository-Status automatisch aktualisieren."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.git_auto_fetch === true}
                      onCheckedChange={(value) => updateSetting("git_auto_fetch", value)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="git_smart_commit"
                    sectionId="git"
                    searchQuery={searchTerm}
                    title="Smart Commit"
                    description="Commit-Aktionen fuer eindeutige Aenderungen vorbereiten."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.git_smart_commit !== false}
                      onCheckedChange={(value) => updateSetting("git_smart_commit", value)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="github_pr_notifications"
                    sectionId="git"
                    searchQuery={searchTerm}
                    title="GitHub PR Hinweise"
                    description="Review- und Pull-Request-Signale im GitHub-Panel anzeigen."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.github_pr_notifications !== false}
                      onCheckedChange={(value) => updateSetting("github_pr_notifications", value)}
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("extensions", () => (
              <section key="extensions" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Extensions"
                    eyebrow="Runtime"
                    description="Extension-Management fuer die IDE-Workbench."
                    icon={Package}
                  />
                ) : null}
                <SettingsGroup title="Extension Runtime" description="Kompakte Controls fuer Updates und Empfehlungen.">
                  <SettingRow
                    id="extensions_auto_update"
                    sectionId="extensions"
                    searchQuery={searchTerm}
                    title="Auto Update"
                    description="Installierte Extensions automatisch aktuell halten."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.extensions_auto_update !== false}
                      onCheckedChange={(value) => updateSetting("extensions_auto_update", value)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="extensions_recommendations"
                    sectionId="extensions"
                    searchQuery={searchTerm}
                    title="Recommendations"
                    description="Workspace-nahe Extension-Empfehlungen anzeigen."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.extensions_recommendations !== false}
                      onCheckedChange={(value) =>
                        updateSetting("extensions_recommendations", value)
                      }
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("theme", () => (
              <section key="theme" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Theme"
                    eyebrow="Presets"
                    description="Theme- und Hintergrundvorlagen."
                    icon={Sparkles}
                  />
                ) : null}
                <SettingsGroup title="Theme Presets" description="Nexus-Farbwelten mit Live-Akzent.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {effectiveThemeOptionsModel.selectable.map((theme) => (
                      <PresetButton
                        key={theme.id}
                        active={activeThemeId === theme.id}
                        title={theme.name}
                        badge={theme.source === "extension" ? theme.sourceLabel : undefined}
                        description={theme.source === "extension" ? theme.description : undefined}
                        colors={theme.colors}
                        shouldReduceMotion={shouldReduceMotion}
                        onClick={() => {
                          const patch = createThemeSelectionPatch(theme);
                          if (!patch) return;
                          onSettingsChange({ ...settings, ...patch });
                        }}
                      />
                    ))}
                  </div>
                  {effectiveThemeOptionsModel.unavailable.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {effectiveThemeOptionsModel.unavailable.map((theme) => (
                        <PresetButton
                          key={theme.id}
                          active={false}
                          disabled
                          title={theme.name}
                          badge={theme.sourceLabel}
                          description={theme.unavailableReason || theme.description}
                          colors={theme.colors}
                          shouldReduceMotion={shouldReduceMotion}
                        />
                      ))}
                    </div>
                  ) : null}
                </SettingsGroup>
                <SettingsGroup title="Hintergrund" description="Preset-Hintergruende oder Theme-Standard.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <PresetButton
                      active={!settings.background}
                      title="Standard"
                      description="Vom aktiven Theme"
                      colors={[primaryAccent, secondaryAccent, resolvedTheme.colors.surface]}
                      shouldReduceMotion={shouldReduceMotion}
                      onClick={() => updateSetting("background", null)}
                    />
                    {backgrounds.map((background) => (
                      <PresetButton
                        key={background.id}
                        active={settings.background === background.id}
                        title={background.name}
                        colors={background.colors}
                        shouldReduceMotion={shouldReduceMotion}
                        onClick={() => updateSetting("background", background.id)}
                      />
                    ))}
                  </div>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("performance", () => (
              <section key="performance" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Performance"
                    eyebrow="Budget"
                    description="Kosten von visuellen Effekten und Sprachfeatures."
                    icon={Gauge}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <VisualBudgetCard summary={visualBudgetSummary} />
                  <LowPowerFallbackPanel
                    state={lowPowerState}
                    onApply={applyLowPowerFallback}
                    onRestore={restoreBalancedVisuals}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Visual Performance" description="Schnelle Profile fuer Effektbudget.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {visualPerformanceProfiles.map((profile) => (
                        <PresetButton
                          key={profile.id}
                          active={visualProfileId === profile.id}
                          title={profile.label}
                          description={profile.description}
                          colors={[primaryAccent, secondaryAccent]}
                          shouldReduceMotion={shouldReduceMotion}
                          onClick={() => applyVisualProfile(profile)}
                        />
                      ))}
                    </div>
                    <SettingRow
                      id="glow_renderer"
                      sectionId="performance"
                      searchQuery={searchTerm}
                      title="Glow Renderer"
                      description="CSS ist stabil, Intensiv reserviert mehr visuelles Budget."
                    >
                      <NativeSelect
                        value={settings.glow_renderer || "css"}
                        onValueChange={(value) => updateSetting("glow_renderer", value)}
                        className="w-36"
                      >
                        <option value="css">CSS</option>
                        <option value="three">Intensiv</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="panel_glow_outline"
                      sectionId="performance"
                      searchQuery={searchTerm}
                      title="Panel Glow Outline"
                      description="Leuchtende Kante fuer Workbench-Panels und Settings."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.panel_glow_outline === true}
                        onCheckedChange={(value) => updateSetting("panel_glow_outline", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="panel_blur_strength"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Panel Blur: ${settings.panel_blur_strength ?? 16}px`}
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.panel_blur_strength ?? 16]}
                          onValueChange={([value]) => updateSetting("panel_blur_strength", value)}
                          min={0}
                          max={32}
                          step={2}
                        />
                        <ValueBadge>{settings.panel_blur_strength ?? 16}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Language Features" description="Performance-relevante Editor-Dienste.">
                    <SettingRow
                      id="autocomplete_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete"
                      description="Lokale Vorschlaege und Snippets beim Schreiben."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_enabled !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_lsp"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="LSP Suggestions"
                      description="Language Server als Completion-Quelle nutzen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_lsp !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_lsp", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Language Server"
                      description="Vorschlaege, Hover und Diagnose ueber installierte LSPs."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="validation_decorations"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Diagnostics"
                      description="Lint-Gutter und inline Markierungen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.validation_decorations !== false}
                        onCheckedChange={(value) =>
                          updateSetting("validation_decorations", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="minimap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Minimap"
                      description="Auf kleineren Viewports automatisch zurueckhaltend."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.minimap !== false}
                        onCheckedChange={(value) => updateSetting("minimap", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>
                </div>
                <SettingsGroup
                  title="Live Budget Hinweise"
                  description="Schnelle Diagnose aus deinen aktuellen Visual- und Language-Settings."
                >
                  <PerformanceHintList hints={performanceHints} />
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("animations", () => (
              <section key="animations" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Animations"
                    eyebrow="Motion"
                    description="Bewegung und Cursor-Gefuehl im Nexus Design."
                    icon={Zap}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Motion" description="Accessibility und Microinteraction-Budget.">
                    <SettingRow
                      id="reduce_motion"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Reduce Motion"
                      description="Reduziert Settings-Animationen und setzt den Caret ruhig."
                      compact
                    >
                      <NativeSwitch
                        checked={reducedBySetting}
                        onCheckedChange={(value) =>
                          updateSettings({
                            reduce_motion: value,
                            smooth_caret: value ? false : true,
                          })
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="animations_enabled"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Animationen"
                      description="Mikroanimationen in diesem Settings-Erlebnis."
                      compact
                    >
                      <NativeSwitch
                        checked={animationsEnabled}
                        onCheckedChange={(value) => updateSetting("animations_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="animation_speed"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title={`Animation Speed: ${formatSettingNumber(animationSpeed, 2)}x`}
                      description="Steuert die Settings-Transition und die Live-Preview."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[animationSpeed]}
                          onValueChange={([value]) => updateSetting("animation_speed", value)}
                          min={0.5}
                          max={1.8}
                          step={0.1}
                        />
                        <ValueBadge>{formatSettingNumber(animationSpeed, 2)}x</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="smooth_caret"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Sanfte Cursor-Animation"
                      description="Wirkt auch auf das globale visuelle Effektbudget."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.smooth_caret !== false}
                        onCheckedChange={(value) => updateSetting("smooth_caret", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Cursor und Glow" description="Kleine Bewegungs- und Lichtdetails.">
                    <SettingRow
                      id="cursor_blinking"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Cursor-Blinken"
                    >
                      <NativeSelect
                        value={settings.cursor_blinking || "solid"}
                        onValueChange={(value) => updateSetting("cursor_blinking", value)}
                        className="w-36"
                      >
                        <option value="solid">Fest</option>
                        <option value="blink">Blinken</option>
                        <option value="smooth">Sanft</option>
                        <option value="phase">Phase</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="cursor_style"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Cursor-Stil"
                    >
                      <NativeSelect
                        value={settings.cursor_style || "line"}
                        onValueChange={(value) => updateSetting("cursor_style", value)}
                        className="w-36"
                      >
                        <option value="line">Linie</option>
                        <option value="block">Block</option>
                        <option value="underline">Unterstrichen</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="cursor_glow"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Cursor-Glow"
                      description="Leuchtender Cursor im Editor."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.cursor_glow === true}
                        onCheckedChange={(value) => updateSetting("cursor_glow", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="icon_glow"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Icon Glow"
                      description="Leuchtende Icons in der Shell."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.icon_glow || false}
                        onCheckedChange={(value) => updateSetting("icon_glow", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>
                </div>
              </section>
            ))}

            <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-5 text-xs leading-tight text-gray-500 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-2">
                <Settings2 size={14} />
                <span className="min-w-0 break-words">Storage: bestehende Nexus-Code-Pipeline</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Cpu size={14} />
                <span className="min-w-0 break-words">Profil: {visualProfileId}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Eye size={14} />
                <span className="min-w-0 break-words">Motion: {shouldReduceMotion ? "reduziert" : "aktiv"}</span>
              </div>
            </div>
          </div>
        )}
      </motion.main>
    </motion.div>
  );
}
