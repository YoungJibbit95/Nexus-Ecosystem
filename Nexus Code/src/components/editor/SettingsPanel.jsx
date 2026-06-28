import React from "react";
import {
  ArrowLeft,
  Check,
  Code2,
  Cpu,
  Eye,
  Gauge,
  Info,
  Palette,
  PanelLeft,
  RefreshCcw,
  Search,
  Settings2,
  Sparkles,
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
    keywords: "performance visual profile blur glow outline lsp diagnostics autocomplete minimap renderer hints budget",
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

function unwrapIpcResponse(result) {
  if (result && typeof result === "object" && "ok" in result) {
    return result.ok ? result.data : [];
  }
  return result || [];
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
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
  const haystack = [
    entry?.label,
    entry?.description,
    entry?.keywords,
    section?.label,
    section?.description,
    section?.keywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sectionMatchesSearch(section, query) {
  if (!query || !section) return false;
  return [
    section.label,
    section.eyebrow,
    section.description,
    section.keywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
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

function getSearchResults(query, limit = 6) {
  if (!query) return [];
  return SETTING_INDEX
    .filter((entry) => {
      const section = SETTING_SECTIONS.find((item) => item.id === entry.section);
      return sectionMatchesSearch(section, query) || settingMatchesSearch(entry.id, entry.section, query);
    })
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
    { label: "Border", varName: "--nexus-border", value: cssVars["--nexus-border"] || colors.border },
    { label: "Text", varName: "--nexus-text", value: cssVars["--nexus-text"] || colors.text },
    { label: "Muted", varName: "--nexus-muted", value: cssVars["--nexus-muted"] || colors.muted },
    { label: "Keyword", varName: "--nexus-keyword", value: cssVars["--nexus-keyword"] || syntax.keyword },
    { label: "String", varName: "--nexus-string", value: cssVars["--nexus-string"] || syntax.string },
    { label: "Function", varName: "--nexus-function", value: cssVars["--nexus-function"] || syntax.function },
  ].filter((token) => token.value);
}

function buildPerformanceHints(settings = {}, visualProfileId, lspServers = []) {
  const hints = [];
  const panelBlur = getNumberSetting(settings, "panel_blur_strength", 16);
  const glowIntensity = getNumberSetting(settings, "glow_intensity", 28);
  const glowRadius = getNumberSetting(settings, "glow_radius", 14);
  const missingLspCount = lspServers.filter((server) => !server.available).length;

  if (visualProfileId === "performance") {
    hints.push({
      tone: "good",
      title: "Performance-Profil aktiv",
      text: "Motion und Glow laufen bereits mit kleinem Budget.",
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
  if (settings.glow_renderer === "three") {
    hints.push({
      tone: "warn",
      title: "Intensiver Renderer",
      text: "Nur fuer starke Theme-Previews sinnvoll, CSS bleibt guenstiger.",
    });
  }
  if (settings.lsp_enabled !== false && missingLspCount > 0) {
    hints.push({
      tone: "info",
      title: "LSP teilweise offline",
      text: `${missingLspCount} Server fehlen; Autocomplete faellt dort leiser zurueck.`,
    });
  }
  if (hints.length === 0) {
    hints.push({
      tone: "good",
      title: "Budget stabil",
      text: "Blur, Glow und Language Features liegen im ausgewogenen Bereich.",
    });
  }
  return hints.slice(0, 4);
}

function SettingsHeader({ title, eyebrow, description, icon: Icon }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
          <Icon size={13} />
          <span>{eyebrow}</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-100">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingsGroup({ title, description, children }) {
  return (
    <section
      className="rounded-lg border p-4 sm:p-5"
      style={{
        background: "rgba(255,255,255,0.026)",
        borderColor: "var(--nexus-border)",
      }}
    >
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {description ? (
          <p className="text-xs leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
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
      className={`flex min-w-0 gap-3 rounded-md border border-white/5 bg-white/[0.018] px-3 py-3 ${
        compact ? "items-center justify-between" : "flex-col sm:flex-row sm:items-center sm:justify-between"
      }`}
    >
      <div className="min-w-0">
        <NativeLabel className="block text-gray-300">{title}</NativeLabel>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0 sm:max-w-[19rem]">{children}</div>
    </div>
  );
}

function ValueBadge({ children }) {
  return (
    <span
      className="inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[10px] font-semibold text-gray-300"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </span>
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
      className="rounded-lg border p-4"
      style={{
        background: "rgba(255,255,255,0.026)",
        borderColor: "var(--nexus-border)",
      }}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            <Search size={13} />
            <span>Result Hints</span>
          </div>
          <p className="mt-2 text-sm text-gray-300">
            {totalMatches} Treffer fuer "{query}"
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Oeffne einen Treffer direkt oder nutze die Kategorien links als gefilterte Karte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {matchedSections.map((section) => (
            <span
              key={section.id}
              className="rounded-md border px-2 py-1 text-[10px] font-medium text-gray-400"
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
            className="rounded-md border p-3 text-left transition-colors hover:bg-white/[0.045]"
            style={{
              background: "rgba(255,255,255,0.018)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-xs font-semibold text-gray-200">
                {result.label}
              </span>
              <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-500">
                {result.sectionLabel}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">
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
          className="flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2"
          style={{
            background: "rgba(255,255,255,0.018)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="h-6 w-6 shrink-0 rounded-md border border-white/10"
            style={{ background: token.value }}
          />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-gray-300">
              {token.label}
            </div>
            <code className="block truncate text-[10px] text-gray-500">
              {token.varName}
            </code>
          </div>
          <code className="ml-auto max-w-[7rem] shrink-0 truncate text-[10px] text-gray-500">
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
          className="flex gap-3 rounded-md border px-3 py-2.5"
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
            <div className="text-xs font-semibold text-gray-200">
              {hint.title}
            </div>
            <p className="mt-0.5 text-[10px] leading-4 text-gray-500">
              {hint.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColorControl({ value, fallback, onChange, label }) {
  const current = value || fallback;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        aria-label={label}
        type="color"
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-white/10 bg-transparent p-1"
      />
      <NativeInput
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 bg-white/5 font-mono text-gray-300"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}

function PresetButton({
  active,
  title,
  description,
  colors = [],
  onClick,
  shouldReduceMotion,
}) {
  return (
    <motion.button
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      onClick={onClick}
      className="group min-w-0 rounded-lg border p-3 text-left transition-colors"
      style={{
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)"
          : "rgba(255,255,255,0.025)",
        borderColor: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.32)"
          : "rgba(255,255,255,0.07)",
        boxShadow: active
          ? "0 12px 26px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.1)"
          : "none",
      }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-gray-200">
          {title}
        </span>
        {active ? <Check size={13} style={{ color: "var(--nexus-primary)" }} /> : null}
      </div>
      {description ? (
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">
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

function ThemePreview({
  settings,
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
      className="overflow-hidden rounded-lg border"
      style={{
        borderRadius: radius,
        background: "rgba(255,255,255,0.026)",
        borderColor: "var(--nexus-border)",
        boxShadow: previewShadow,
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3"
        style={{
          background: `linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14), rgba(var(--nexus-accent-2-rgb, 45, 212, 191), 0.06))`,
          backdropFilter: blurStrength > 0 ? `blur(${Math.min(12, blurStrength)}px)` : "none",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: primaryAccent }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: secondaryAccent }}
          />
          <span className="ml-1 text-xs font-semibold text-gray-300">
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
        <div className="grid min-w-0 flex-1 grid-cols-[3.5rem_1fr]">
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
            <div className="flex items-center gap-1 text-gray-500">
              <span>// cursor</span>
              <span
                className={`${cursorShape} inline-block rounded-sm`}
                style={{ background: primaryAccent, boxShadow: previewShadow }}
              />
              <span>{cursorStyle}</span>
            </div>
            <div className="text-gray-500">
              // blur {blurStrength}px, radius {radius}px, letter {formatSettingNumber(letterSpacing, 2)}px
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-2 text-[10px] text-gray-500">
          <span>main.tsx</span>
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
}) {
  const [activeSection, setActiveSection] = React.useState("theme-editor");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [lspServers, setLspServers] = React.useState([]);
  const prefersReducedMotion = useReducedMotion();
  const resolvedTheme = React.useMemo(
    () => resolveNexusTheme(settings),
    [settings],
  );
  const searchTerm = normalizeSearch(searchQuery);
  const activeThemeId = resolvedTheme.id;
  const primaryAccent = resolvedTheme.colors.primary;
  const secondaryAccent = resolvedTheme.colors.secondary;
  const visualProfileId = resolveVisualProfileId(settings);
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
  const performanceHints = React.useMemo(
    () => buildPerformanceHints(settings, visualProfileId, lspServers),
    [lspServers, settings, visualProfileId],
  );

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    Object.entries(scopedThemeVars).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  }, [scopedThemeVars]);

  React.useEffect(() => {
    let mounted = true;
    const api = typeof window !== "undefined" ? window.electronAPI : null;
    if (!api?.lspListServers) return undefined;
    api
      .lspListServers()
      .then((result) => {
        if (!mounted) return;
        const servers = unwrapIpcResponse(result);
        setLspServers(Array.isArray(servers) ? servers : []);
      })
      .catch(() => {
        if (mounted) setLspServers([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

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

  const applyVisualProfile = React.useCallback(
    (profile) => {
      onSettingsChange({ ...settings, ...profile.settings });
    },
    [onSettingsChange, settings],
  );

  const renderIfVisible = (sectionId, render) =>
    visibleSectionIds.includes(sectionId) ? render() : null;

  const renderLspServers = () =>
    lspServers.length > 0 ? (
      <div
        className="rounded-md border p-3"
        style={{
          background: "rgba(255,255,255,0.025)",
          borderColor: "var(--nexus-border)",
        }}
      >
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          LSP Tools
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {lspServers.map((server) => (
            <div
              key={server.languageId}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              style={{
                background: server.available
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(148,163,184,0.06)",
                border: server.available
                  ? "1px solid rgba(34,197,94,0.18)"
                  : "1px solid rgba(148,163,184,0.12)",
              }}
              title={
                server.available
                  ? server.resolvedPath || server.command
                  : `${server.envName} installieren oder setzen`
              }
            >
              <span className="min-w-0 truncate text-xs text-gray-300">
                {server.languageId}
              </span>
              <span
                className={`shrink-0 text-[10px] font-medium ${
                  server.available ? "text-green-300" : "text-gray-500"
                }`}
              >
                {server.available ? "bereit" : "fehlt"}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motionTransition}
      className="nx-code-settings-panel flex-1 flex overflow-hidden rounded-xl sm:rounded-2xl border border-white/5 min-w-0"
      style={{
        ...scopedThemeVars,
        background: "var(--nexus-panel-surface)",
        backdropFilter: "var(--nexus-settings-filter, blur(8px) saturate(115%))",
        WebkitBackdropFilter:
          "var(--nexus-settings-filter, blur(8px) saturate(115%))",
        borderColor: "var(--nexus-border)",
        borderRadius: `min(18px, ${Math.max(10, radius + 6)}px)`,
      }}
    >
      <motion.aside
        initial={shouldReduceMotion ? false : { x: -220, opacity: 0 }}
        animate={shouldReduceMotion ? undefined : { x: 0, opacity: 1 }}
        transition={motionTransition}
        className="nx-code-settings-nav flex w-48 shrink-0 flex-col overflow-y-auto p-3 sm:w-60 sm:p-4"
        style={{
          background: "var(--nexus-sidebar)",
          borderRight: "1px solid var(--nexus-border)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="mb-5 flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-200"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Zurueck</span>
        </button>

        <div className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-widest text-gray-500">
              Einstellungen
            </span>
            <button
              type="button"
              onClick={onResetSettings}
              title="Alles zuruecksetzen"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
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
              className="h-9 w-full rounded-md border border-white/10 bg-white/[0.035] pl-8 pr-8 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-[rgba(var(--nexus-primary-rgb),0.45)]"
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
            <div className="mt-2 text-[10px] text-gray-500">
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
                    ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.12)"
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
                <span className="min-w-0 flex-1 truncate text-sm">{section.label}</span>
                {searchTerm && count > 0 ? (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
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
        className="nx-code-settings-content min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8"
      >
        {searchTerm && visibleSectionIds.length === 0 ? (
          <div className="flex h-full min-h-[22rem] items-center justify-center">
            <div className="max-w-sm text-center">
              <Search size={28} className="mx-auto text-gray-600" />
              <h2 className="mt-4 text-lg font-semibold text-gray-300">
                Keine Settings gefunden
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Probiere Begriffe wie Font, Glow, Diagnostics, Workbench oder
                Motion.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
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
                  themeName={resolvedTheme.name}
                  primaryAccent={primaryAccent}
                  secondaryAccent={secondaryAccent}
                  radius={radius}
                  animationSpeed={animationSpeed}
                  shouldReduceMotion={shouldReduceMotion}
                />
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
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete"
                      description="LSP-Vorschlaege, Hover und Diagnose."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
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
                {renderLspServers()}
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
                    {themes.map((theme) => (
                      <PresetButton
                        key={theme.id}
                        active={activeThemeId === theme.id}
                        title={theme.name}
                        colors={theme.colors}
                        shouldReduceMotion={shouldReduceMotion}
                        onClick={() => {
                          onSettingsChange({
                            ...settings,
                            theme: theme.id,
                            background: null,
                            primary_accent: theme.accent,
                            secondary_accent: theme.accent2,
                          });
                        }}
                      />
                    ))}
                  </div>
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
                    {renderLspServers()}
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

            <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-5 text-xs text-gray-500 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Settings2 size={14} />
                Storage: bestehende Nexus-Code-Pipeline
              </div>
              <div className="flex items-center gap-2">
                <Cpu size={14} />
                Profil: {visualProfileId}
              </div>
              <div className="flex items-center gap-2">
                <Eye size={14} />
                Motion: {shouldReduceMotion ? "reduziert" : "aktiv"}
              </div>
            </div>
          </div>
        )}
      </motion.main>
    </motion.div>
  );
}
