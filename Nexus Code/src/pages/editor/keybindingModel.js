export const KEYBINDING_SETTING_KEY = "keybinding_overrides";

export const KEYBINDING_CATEGORIES = Object.freeze([
  { id: "editor", label: "Editor", description: "Cursor, Text, Formatierung und Code-Navigation." },
  { id: "workbench", label: "Workbench", description: "Panels, Suche, Dateien und globale IDE-Aktionen." },
  { id: "terminal", label: "Terminal", description: "Terminal-Fokus, Tasks und Prozesssteuerung." },
  { id: "git", label: "Git/GitHub", description: "Source-Control und Pull-Request-Workflows." },
  { id: "extensions", label: "Extensions", description: "Extension-Lifecycle und beigesteuerte Commands." },
]);

export const DEFAULT_KEYBINDINGS = Object.freeze([
  {
    id: "workbench.commandPalette",
    command: "workbench.commandPalette",
    label: "Command Palette",
    category: "workbench",
    defaultShortcut: "Ctrl+Shift+P",
    macShortcut: "Cmd+Shift+P",
    when: "workbench",
    keywords: ["palette", "commands", "spotlight"],
  },
  {
    id: "workbench.quickOpen",
    command: "workbench.quickOpen",
    label: "Quick Open",
    category: "workbench",
    defaultShortcut: "Ctrl+P",
    macShortcut: "Cmd+P",
    when: "workbench",
    keywords: ["file", "search", "open"],
  },
  {
    id: "workbench.openSettings",
    command: "open-settings",
    label: "Settings oeffnen",
    category: "workbench",
    defaultShortcut: "Ctrl+,",
    macShortcut: "Cmd+,",
    when: "workbench",
    keywords: ["settings", "preferences"],
  },
  {
    id: "workbench.toggleSidebar",
    command: "workbench.toggleSidebar",
    label: "Sidebar umschalten",
    category: "workbench",
    defaultShortcut: "Ctrl+B",
    macShortcut: "Cmd+B",
    when: "workbench",
    keywords: ["sidebar", "panel", "layout"],
  },
  {
    id: "editor.save",
    command: "editor.save",
    label: "Datei speichern",
    category: "editor",
    defaultShortcut: "Ctrl+S",
    macShortcut: "Cmd+S",
    when: "editorTextFocus",
    keywords: ["save", "file", "write"],
  },
  {
    id: "editor.formatDocument",
    command: "editor.formatDocument",
    label: "Dokument formatieren",
    category: "editor",
    defaultShortcut: "Alt+Shift+F",
    macShortcut: "Option+Shift+F",
    when: "editorTextFocus",
    keywords: ["format", "prettier", "lsp"],
  },
  {
    id: "editor.renameSymbol",
    command: "editor.renameSymbol",
    label: "Symbol umbenennen",
    category: "editor",
    defaultShortcut: "F2",
    macShortcut: "F2",
    when: "editorTextFocus",
    keywords: ["rename", "refactor", "lsp"],
  },
  {
    id: "editor.goToDefinition",
    command: "editor.goToDefinition",
    label: "Zur Definition",
    category: "editor",
    defaultShortcut: "F12",
    macShortcut: "F12",
    when: "editorTextFocus",
    keywords: ["definition", "navigation", "lsp"],
  },
  {
    id: "editor.find",
    command: "editor.find",
    label: "In Datei suchen",
    category: "editor",
    defaultShortcut: "Ctrl+F",
    macShortcut: "Cmd+F",
    when: "editorTextFocus",
    keywords: ["find", "search", "document"],
  },
  {
    id: "terminal.toggle",
    command: "terminal.toggle",
    label: "Terminal umschalten",
    category: "terminal",
    defaultShortcut: "Ctrl+`",
    macShortcut: "Ctrl+`",
    when: "workbench",
    keywords: ["terminal", "panel", "shell"],
  },
  {
    id: "terminal.new",
    command: "terminal.new",
    label: "Neues Terminal",
    category: "terminal",
    defaultShortcut: "Ctrl+Shift+`",
    macShortcut: "Ctrl+Shift+`",
    when: "terminal",
    keywords: ["terminal", "new", "shell"],
  },
  {
    id: "git.openSourceControl",
    command: "git.openSourceControl",
    label: "Source Control oeffnen",
    category: "git",
    defaultShortcut: "Ctrl+Shift+G",
    macShortcut: "Ctrl+Shift+G",
    when: "workbench",
    keywords: ["git", "source control", "changes"],
  },
  {
    id: "github.openPullRequests",
    command: "github.openPullRequests",
    label: "Pull Requests oeffnen",
    category: "git",
    defaultShortcut: "Ctrl+Shift+R",
    macShortcut: "Cmd+Shift+R",
    when: "workbench",
    keywords: ["github", "pull requests", "review"],
  },
  {
    id: "extensions.open",
    command: "extensions.open",
    label: "Extensions oeffnen",
    category: "extensions",
    defaultShortcut: "Ctrl+Shift+X",
    macShortcut: "Cmd+Shift+X",
    when: "workbench",
    keywords: ["extensions", "marketplace", "plugins"],
  },
]);

const CATEGORY_IDS = new Set(KEYBINDING_CATEGORIES.map((category) => category.id));
const DEFAULT_BY_ID = new Map(DEFAULT_KEYBINDINGS.map((binding) => [binding.id, binding]));
const MODIFIER_ALIASES = new Map([
  ["CONTROL", "Ctrl"],
  ["CTRL", "Ctrl"],
  ["CMD", "Cmd"],
  ["COMMAND", "Cmd"],
  ["META", "Cmd"],
  ["OPTION", "Alt"],
  ["ALT", "Alt"],
  ["SHIFT", "Shift"],
]);
const MODIFIER_ORDER = ["Ctrl", "Cmd", "Alt", "Shift"];
const FUNCTION_KEY_PATTERN = /^F(?:[1-9]|1[0-9]|2[0-4])$/;
const NAMED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Enter",
  "Escape",
  "Space",
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "`",
  ",",
  ".",
  "/",
  "\\",
  "-",
  "=",
  "[",
  "]",
  ";",
  "'",
]);

function normalizeKeyToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (MODIFIER_ALIASES.has(upper)) return MODIFIER_ALIASES.get(upper);
  if (FUNCTION_KEY_PATTERN.test(upper)) return upper;
  if (upper === "ESC") return "Escape";
  if (upper === "SPACE") return "Space";
  if (upper === "RETURN") return "Enter";
  if (upper === "PLUS") return "+";
  if (upper === "UP") return "ArrowUp";
  if (upper === "DOWN") return "ArrowDown";
  if (upper === "LEFT") return "ArrowLeft";
  if (upper === "RIGHT") return "ArrowRight";
  if (raw.length === 1) return raw.toUpperCase();
  return raw[0].toUpperCase() + raw.slice(1);
}

export function normalizeKeybindingShortcut(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const chords = raw
    .replace(/\s*\+\s*/g, "+")
    .split(/\s+/)
    .map((chord) => {
      const tokens = chord
        .split("+")
        .map(normalizeKeyToken)
        .filter(Boolean);
      const modifiers = MODIFIER_ORDER.filter((modifier) => tokens.includes(modifier));
      const key = tokens.find((token) => !MODIFIER_ORDER.includes(token));
      if (!key) return "";
      return [...modifiers, key].join("+");
    })
    .filter(Boolean);
  return chords.slice(0, 2).join(" ");
}

export function validateKeybindingShortcut(value) {
  const rawChords = String(value || "")
    .trim()
    .replace(/\s*\+\s*/g, "+")
    .split(/\s+/)
    .filter(Boolean);
  const normalized = normalizeKeybindingShortcut(value);
  if (!String(value || "").trim()) {
    return { ok: true, normalized: "", reason: "" };
  }
  if (rawChords.length > 2) {
    return { ok: false, normalized, reason: "Maximal zwei Chords sind erlaubt." };
  }
  if (!normalized) {
    return { ok: false, normalized: "", reason: "Shortcut braucht eine Taste." };
  }
  const chords = normalized.split(/\s+/);
  for (const chord of chords) {
    const parts = chord.split("+");
    const key = parts.at(-1);
    if (!key || MODIFIER_ORDER.includes(key)) {
      return { ok: false, normalized, reason: "Shortcut braucht eine Nicht-Modifier-Taste." };
    }
    const knownKey =
      key.length === 1 ||
      FUNCTION_KEY_PATTERN.test(key) ||
      NAMED_KEYS.has(key);
    if (!knownKey) {
      return { ok: false, normalized, reason: `Unbekannte Taste: ${key}` };
    }
  }
  return { ok: true, normalized, reason: "" };
}

export function normalizeKeybindingOverrideMap(overrides = {}) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return {};
  return Object.fromEntries(
    Object.entries(overrides).flatMap(([id, value]) => {
      if (!DEFAULT_BY_ID.has(id)) return [];
      const validation = validateKeybindingShortcut(value);
      if (!validation.ok || !validation.normalized) return [];
      const defaultShortcut = DEFAULT_BY_ID.get(id).defaultShortcut;
      if (validation.normalized === normalizeKeybindingShortcut(defaultShortcut)) return [];
      return [[id, validation.normalized]];
    }),
  );
}

export function normalizeKeybindingSettings(settings = {}) {
  return {
    ...settings,
    [KEYBINDING_SETTING_KEY]: normalizeKeybindingOverrideMap(
      settings?.[KEYBINDING_SETTING_KEY],
    ),
  };
}

export function createKeybindingSettingsModel(options = {}) {
  const overrides = normalizeKeybindingOverrideMap(options.overrides);
  const query = String(options.query || "").trim().toLowerCase();
  const categoryFilter = CATEGORY_IDS.has(options.category) ? options.category : "all";
  const platform = options.platform === "mac" ? "mac" : "default";
  const allRows = DEFAULT_KEYBINDINGS.map((binding) => {
    const defaultShortcut =
      platform === "mac" ? binding.macShortcut || binding.defaultShortcut : binding.defaultShortcut;
    const override = overrides[binding.id] || "";
    const effectiveShortcut = override || defaultShortcut;
    return {
      ...binding,
      defaultShortcut,
      override,
      effectiveShortcut,
      isCustomized: Boolean(override),
      searchText: [
        binding.id,
        binding.command,
        binding.label,
        binding.category,
        binding.when,
        defaultShortcut,
        override,
        ...(binding.keywords || []),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });

  const conflictBuckets = new Map();
  for (const row of allRows) {
    if (!row.effectiveShortcut) continue;
    const conflictKey = row.effectiveShortcut.toLowerCase();
    const bucket = conflictBuckets.get(conflictKey) || [];
    bucket.push(row.id);
    conflictBuckets.set(conflictKey, bucket);
  }
  const conflictEntries = [...conflictBuckets.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([shortcut, bindingIds]) => ({
      shortcut,
      bindingIds,
      labels: bindingIds.map(
        (id) => allRows.find((row) => row.id === id)?.label || id,
      ),
    }));
  const conflictIds = new Set(
    conflictEntries.flatMap((entry) => entry.bindingIds),
  );

  const rows = allRows.filter((row) => {
    const categoryMatches = categoryFilter === "all" || row.category === categoryFilter;
    const queryMatches = !query || row.searchText.includes(query);
    return categoryMatches && queryMatches;
  });

  const categorizedCounts = Object.fromEntries(
    KEYBINDING_CATEGORIES.map((category) => [
      category.id,
      DEFAULT_KEYBINDINGS.filter((binding) => binding.category === category.id).length,
    ]),
  );

  return {
    rows: rows.map((row) => {
      const conflict = conflictEntries.find((entry) => entry.bindingIds.includes(row.id));
      return {
        ...row,
        hasConflict: conflictIds.has(row.id),
        conflictLabels: conflict
          ? conflict.labels.filter((label) => label !== row.label)
          : [],
      };
    }),
    categories: KEYBINDING_CATEGORIES.map((category) => ({
      ...category,
      count: categorizedCounts[category.id] || 0,
    })),
    overrideCount: Object.keys(overrides).length,
    totalCount: DEFAULT_KEYBINDINGS.length,
    visibleCount: rows.length,
    visibleOverrideCount: rows.filter((row) => row.isCustomized).length,
    visibleConflictCount: rows.filter((row) => conflictIds.has(row.id)).length,
    conflictCount: conflictIds.size,
    conflicts: conflictEntries,
  };
}
