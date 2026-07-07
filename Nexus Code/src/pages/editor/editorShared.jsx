import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { createQueuedStorageManager } from './storageManager';
import {
  BACKGROUND_MAP,
  DEFAULT_THEME_ID,
  THEME_MAP,
  normalizeThemeId,
  resolveNexusTheme,
} from '../../theme/nexusThemeResolver.js';
import {
  KEYBINDING_SETTING_KEY,
  normalizeKeybindingSettings,
} from './keybindingModel.js';

export const FILES_STORAGE_KEY = "nexus-code-files";
export const SETTINGS_STORAGE_KEY = "nexus-code-settings";
const FILES_INDEX_STORAGE_KEY = "nexus-code-files-index-v2";
const FILE_CONTENT_KEY_PREFIX = "nexus-code-file-content-v2:";
const filesStorage = createQueuedStorageManager({
  debounceMs: 2600,
  idleTimeoutMs: 1800,
});
const settingsStorage = createQueuedStorageManager({
  debounceMs: 1200,
  idleTimeoutMs: 1200,
});
const lastFileContentById = new Map();
let knownPersistedFileIds = new Set();

let _idCounter = 0;
export const generateId = () => {
  return "file_" + Date.now() + "_" + ++_idCounter;
};

export const BACKGROUNDS = BACKGROUND_MAP;

export const THEMES = THEME_MAP;

export { resolveNexusTheme };

export const DEFAULT_FILES = [];

const defaultResolvedTheme = resolveNexusTheme({ theme: DEFAULT_THEME_ID });
const LEGACY_SECONDARY_ACCENTS = new Set([
  "#2dd4bf",
  "#10b981",
  "#14b8a6",
  "#22c55e",
]);

export const DEFAULT_SETTINGS = {
  theme: DEFAULT_THEME_ID,
  background: null,
  visual_performance_profile: "balanced",
  panel_background_mode: "blur",
  glow_renderer: "css",
  panel_blur_strength: 16,
  panel_glow_outline: false,
  glow_intensity: 28,
  glow_radius: 14,
  ui_radius: 10,
  font_size: 14,
  font_family: "JetBrains Mono",
  tab_size: 4,
  word_wrap: false,
  minimap: true,
  line_numbers: true,
  auto_save: true,
  autocomplete_enabled: true,
  autocomplete_lsp: true,
  autocomplete_snippets: true,
  autocomplete_language_hints: true,
  autocomplete_local_words: true,
  autocomplete_min_chars: 2,
  autocomplete_max_items: 120,
  lsp_enabled: true,
  validation_decorations: true,
  line_height: 1.6,
  letter_spacing: 0,
  primary_accent: defaultResolvedTheme.colors.primary,
  secondary_accent: defaultResolvedTheme.colors.secondary,
  custom_surface: null,
  custom_input_surface: null,
  render_whitespace: "none",
  reduce_motion: false,
  animations_enabled: true,
  animation_speed: 1,
  smooth_caret: true,
  format_on_paste: true,
  sticky_scroll: false,
  cursor_style: "line",
  cursor_blinking: "solid",
  cursor_glow: true,
  icon_glow: false,
  text_glow: false,
  border_glow: false,
  line_highlight: "all",
  bracket_colorization: true,
  font_ligatures: true,
  sidebar_position: "left",
  status_bar_visible: true,
  sidebar_visible: true,
  zen_mode: false,
  font_weight: "400",
  terminal_default_profile: "system",
  terminal_confirm_kill: true,
  git_auto_fetch: false,
  git_smart_commit: true,
  github_pr_notifications: true,
  extensions_auto_update: true,
  extensions_recommendations: true,
  [KEYBINDING_SETTING_KEY]: {},
};

const VISUAL_PROFILE_IDS = new Set(["performance", "balanced", "quality", "custom"]);

function readBoundedNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function normalizeEditorSettings(settings) {
  const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  next.theme = normalizeThemeId(next.theme);
  if (LEGACY_SECONDARY_ACCENTS.has(String(next.secondary_accent || "").toLowerCase())) {
    next.secondary_accent = DEFAULT_SETTINGS.secondary_accent;
  }
  if (next.background && !BACKGROUNDS[next.background]) {
    next.background = null;
  }
  if (!VISUAL_PROFILE_IDS.has(next.visual_performance_profile)) {
    next.visual_performance_profile = "balanced";
  }
  next.panel_blur_strength = readBoundedNumber(next.panel_blur_strength, 0, 32, 16);
  next.glow_intensity = readBoundedNumber(next.glow_intensity, 0, 100, 28);
  next.glow_radius = readBoundedNumber(next.glow_radius, 0, 64, 14);
  next.ui_radius = readBoundedNumber(next.ui_radius, 4, 24, 10);
  next.font_size = readBoundedNumber(next.font_size, 10, 28, 14);
  next.line_height = readBoundedNumber(next.line_height, 1.2, 2.5, 1.6);
  next.letter_spacing = readBoundedNumber(next.letter_spacing, 0, 1.5, 0);
  next.animation_speed = readBoundedNumber(next.animation_speed, 0.5, 1.8, 1);
  next.tab_size = readBoundedNumber(next.tab_size, 2, 8, 4);
  next.autocomplete_min_chars = readBoundedNumber(next.autocomplete_min_chars, 1, 5, 2);
  next.autocomplete_max_items = readBoundedNumber(next.autocomplete_max_items, 24, 180, 120);
  if (!["system", "powershell", "bash", "cmd"].includes(next.terminal_default_profile)) {
    next.terminal_default_profile = "system";
  }
  return normalizeKeybindingSettings(next);
}

export function loadFilesFromStorage() {
  const indexed = filesStorage.readJson(FILES_INDEX_STORAGE_KEY, null);
  if (Array.isArray(indexed) && indexed.length > 0) {
    const hydrated = indexed
      .map((fileMeta) => {
        if (!fileMeta || typeof fileMeta !== "object") return null;
        const fileId = String(fileMeta.id || "");
        if (!fileId) return null;
        const contentKey = `${FILE_CONTENT_KEY_PREFIX}${fileId}`;
        const restoredContent = filesStorage.readJson(
          contentKey,
          typeof fileMeta.content === "string" ? fileMeta.content : "",
        );
        const content =
          typeof restoredContent === "string" ? restoredContent : "";
        lastFileContentById.set(fileId, content);
        return {
          ...fileMeta,
          content,
        };
      })
      .filter((file) => !!file);

    if (hydrated.length > 0) {
      knownPersistedFileIds = new Set(
        hydrated.map((file) => String(file.id || "")).filter(Boolean),
      );
      return hydrated;
    }
  }

  const legacy = filesStorage.readJson(FILES_STORAGE_KEY, null);
  if (Array.isArray(legacy)) {
    const normalized = legacy.filter((file) => !!file);
    knownPersistedFileIds = new Set(
      normalized.map((file) => String(file.id || "")).filter(Boolean),
    );
    normalized.forEach((file) => {
      const fileId = String(file?.id || "");
      if (!fileId) return;
      const content = typeof file?.content === "string" ? file.content : "";
      lastFileContentById.set(fileId, content);
    });
    saveFilesToStorage(normalized);
    return normalized;
  }
  return null;
}

export function saveFilesToStorage(files) {
  if (!Array.isArray(files)) return;

  const nextIndex = [];
  const nextFileIds = new Set();

  files.forEach((file) => {
    if (!file || typeof file !== "object") return;
    const fileId = String(file.id || "");
    if (!fileId) return;

    nextFileIds.add(fileId);
    const { content, ...meta } = file;
    nextIndex.push(meta);
    const normalizedContent = typeof content === "string" ? content : "";

    if (lastFileContentById.get(fileId) !== normalizedContent) {
      filesStorage.writeJson(
        `${FILE_CONTENT_KEY_PREFIX}${fileId}`,
        normalizedContent,
      );
      lastFileContentById.set(fileId, normalizedContent);
    }
  });

  filesStorage.writeJson(FILES_INDEX_STORAGE_KEY, nextIndex);

  knownPersistedFileIds.forEach((fileId) => {
    if (nextFileIds.has(fileId)) return;
    filesStorage.remove(`${FILE_CONTENT_KEY_PREFIX}${fileId}`);
    lastFileContentById.delete(fileId);
  });
  knownPersistedFileIds = nextFileIds;
  filesStorage.remove(FILES_STORAGE_KEY);
}

/* ─── Error Boundary ─────────────────────────────────────────────────── */

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Editor Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#03030b]">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Nexus Code is abgestürzt
          </h1>
          <p className="text-gray-500 text-sm max-w-md mb-8">
            Ein unerwarteter Fehler ist aufgetreten:{" "}
            {this.state.error?.message || "Unbekannter Fehler"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-white font-medium"
          >
            <RotateCcw size={16} /> Neustarten
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Storage Helpers ────────────────────────────────────────────────── */

export function loadSettingsFromStorage() {
  const stored = settingsStorage.readJson(SETTINGS_STORAGE_KEY, null);
  if (stored && typeof stored === "object") {
    return normalizeEditorSettings(stored);
  }
  return normalizeEditorSettings(DEFAULT_SETTINGS);
}

export function saveSettingsToStorage(settings) {
  settingsStorage.writeJson(SETTINGS_STORAGE_KEY, settings);
}
