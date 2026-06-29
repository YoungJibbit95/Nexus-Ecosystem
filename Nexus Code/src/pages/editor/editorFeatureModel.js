import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const DEFAULT_SYNTAX_COLORS = Object.freeze({
  comment: "#6e7788",
  keyword: "#b987ff",
  string: "#8bd5ca",
  number: "#f5a97f",
  function: "#8aadf4",
  variable: "#cad3f5",
  type: "#91d7e3",
  operator: "#a6adc8",
});

const COMPLETION_KIND_TYPES = Object.freeze({
  1: "text",
  2: "method",
  3: "function",
  4: "function",
  5: "variable",
  6: "variable",
  7: "class",
  8: "interface",
  9: "namespace",
  10: "property",
  11: "property",
  12: "function",
  13: "variable",
  14: "keyword",
  15: "text",
  16: "text",
  17: "text",
  18: "text",
  19: "text",
  20: "constant",
  21: "constant",
  22: "function",
  23: "text",
  24: "class",
  25: "type",
});

const COMPLETION_KIND_NAMES = Object.freeze({
  1: "Text",
  2: "Method",
  3: "Function",
  4: "Constructor",
  5: "Field",
  6: "Variable",
  7: "Class",
  8: "Interface",
  9: "Module",
  10: "Property",
  11: "Unit",
  12: "Value",
  13: "Enum",
  14: "Keyword",
  15: "Snippet",
  16: "Color",
  17: "File",
  18: "Reference",
  19: "Folder",
  20: "Enum member",
  21: "Constant",
  22: "Struct",
  23: "Event",
  24: "Operator",
  25: "Type parameter",
});

export const EDITOR_COMMAND_CATEGORY_ORDER = Object.freeze([
  "file",
  "navigation",
  "source-control",
  "diagnostics",
  "terminal",
  "layout",
  "extensions",
  "preferences",
]);

export const EDITOR_COMMAND_CATEGORIES = Object.freeze({
  file: Object.freeze({
    id: "file",
    label: "Files",
    description: "Dateien und Workspaces",
    tone: "cyan",
  }),
  navigation: Object.freeze({
    id: "navigation",
    label: "Navigation",
    description: "Editor und Workbench bewegen",
    tone: "emerald",
  }),
  "source-control": Object.freeze({
    id: "source-control",
    label: "Source Control",
    description: "Git-Status und Aenderungen",
    tone: "amber",
  }),
  diagnostics: Object.freeze({
    id: "diagnostics",
    label: "Diagnostics",
    description: "Probleme und Hinweise",
    tone: "rose",
  }),
  terminal: Object.freeze({
    id: "terminal",
    label: "Terminal",
    description: "Tasks und CLI",
    tone: "blue",
  }),
  layout: Object.freeze({
    id: "layout",
    label: "Layout",
    description: "Panels, Fokus und Raum",
    tone: "violet",
  }),
  extensions: Object.freeze({
    id: "extensions",
    label: "Extensions",
    description: "Sprachen und Tools",
    tone: "teal",
  }),
  preferences: Object.freeze({
    id: "preferences",
    label: "Preferences",
    description: "Themes und Konto",
    tone: "slate",
  }),
});

export const EDITOR_COMMANDS = Object.freeze([
  Object.freeze({
    id: "new-file",
    actionId: "new-file",
    label: "Neue Datei erstellen",
    description: "Lege eine neue TypeScript-Datei im aktuellen Workspace an.",
    category: "file",
    shortcut: "Ctrl+N",
    keywords: Object.freeze(["create", "file", "datei", "typescript", "javascript", "new"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 100,
  }),
  Object.freeze({
    id: "open-folder",
    actionId: "open-folder",
    label: "Workspace-Ordner oeffnen",
    description: "Waehle einen lokalen Projektordner aus.",
    category: "file",
    shortcut: "Ctrl+O",
    keywords: Object.freeze(["folder", "workspace", "project", "ordner", "open"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 96,
  }),
  Object.freeze({
    id: "open-explorer",
    actionId: "open-explorer",
    label: "Explorer anzeigen",
    description: "Oeffne den Datei-Explorer der Workbench.",
    category: "navigation",
    shortcut: "Ctrl+B",
    keywords: Object.freeze(["files", "sidebar", "tree", "explorer", "project"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 92,
  }),
  Object.freeze({
    id: "open-search",
    actionId: "open-search",
    label: "Workspace-Suche anzeigen",
    description: "Durchsuche Dateien und Projektinhalte.",
    category: "navigation",
    shortcut: "Ctrl+Shift+F",
    keywords: Object.freeze(["find", "search", "workspace", "grep", "suche"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 90,
  }),
  Object.freeze({
    id: "focus-editor",
    actionId: "focus-editor",
    label: "Editor fokussieren",
    description: "Springe direkt zur aktiven Editor-Datei.",
    category: "navigation",
    shortcut: "",
    keywords: Object.freeze(["focus", "cursor", "active", "editor", "code"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 88,
  }),
  Object.freeze({
    id: "github-sync",
    actionId: "github-sync",
    label: "Git: Source Control anzeigen",
    description: "Pruefe Branch, Staging und lokale Aenderungen.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["git", "source control", "commit", "stage", "diff", "branch"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 82,
  }),
  Object.freeze({
    id: "open-problems",
    actionId: "open-problems",
    label: "Problems anzeigen",
    description: "Oeffne Diagnosemeldungen, Fehler und Warnungen.",
    category: "diagnostics",
    shortcut: "",
    keywords: Object.freeze(["problems", "diagnostics", "errors", "warnings", "lint"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 80,
  }),
  Object.freeze({
    id: "toggle-terminal",
    actionId: "toggle-terminal",
    label: "Terminal umschalten",
    description: "Zeige oder verstecke das integrierte Terminal.",
    category: "terminal",
    shortcut: "Ctrl+`",
    keywords: Object.freeze(["shell", "console", "cli", "terminal", "command"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 78,
  }),
  Object.freeze({
    id: "terminal-task-runner",
    actionId: "toggle-terminal",
    label: "Terminal: Task Runner oeffnen",
    description: "Bereite npm-, build- oder testbezogene Tasks vor.",
    category: "terminal",
    shortcut: "",
    keywords: Object.freeze(["npm", "test", "build", "run", "task", "runner"]),
    surfaces: Object.freeze(["palette"]),
    priority: 70,
  }),
  Object.freeze({
    id: "toggle-zen",
    actionId: "toggle-zen",
    label: "Zen Mode umschalten",
    description: "Reduziere die Workbench auf fokussiertes Arbeiten.",
    category: "layout",
    shortcut: "Ctrl+K Z",
    keywords: Object.freeze(["focus", "layout", "zen", "distraction", "clean"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 74,
  }),
  Object.freeze({
    id: "toggle-sidebar",
    actionId: "toggle-sidebar",
    label: "Sidebar umschalten",
    description: "Blende die seitliche Workbench-Navigation ein oder aus.",
    category: "layout",
    shortcut: "Ctrl+B",
    keywords: Object.freeze(["sidebar", "panel", "left", "workbench", "toggle"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 72,
  }),
  Object.freeze({
    id: "layout-balanced",
    actionId: "layout-balanced",
    label: "Layout: Balanced",
    description: "Setze die Workbench auf ein ausgewogenes Layout.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["layout", "balanced", "comfortable", "panels", "workspace"]),
    surfaces: Object.freeze(["palette"]),
    priority: 68,
  }),
  Object.freeze({
    id: "layout-compact",
    actionId: "layout-compact",
    label: "Layout: Compact Focus",
    description: "Gib dem Editor mehr Flaeche fuer konzentrierte Arbeit.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["layout", "compact", "focus", "small", "panels"]),
    surfaces: Object.freeze(["palette"]),
    priority: 66,
  }),
  Object.freeze({
    id: "layout-roomy",
    actionId: "layout-roomy",
    label: "Layout: Roomy",
    description: "Erweitere Panels und Seitenbereiche fuer Uebersicht.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["layout", "roomy", "wide", "large", "panels"]),
    surfaces: Object.freeze(["palette"]),
    priority: 64,
  }),
  Object.freeze({
    id: "cycle-side-panel-size",
    actionId: "cycle-side-panel-size",
    label: "Side Panel Groesse wechseln",
    description: "Wechsle zwischen kompakten und breiten Seitenpanels.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["side", "panel", "size", "width", "layout"]),
    surfaces: Object.freeze(["palette"]),
    priority: 60,
  }),
  Object.freeze({
    id: "cycle-bottom-panel-size",
    actionId: "cycle-bottom-panel-size",
    label: "Bottom Panel Groesse wechseln",
    description: "Wechsle die Hoehe des unteren Workbench-Panels.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["bottom", "panel", "size", "height", "terminal"]),
    surfaces: Object.freeze(["palette"]),
    priority: 58,
  }),
  Object.freeze({
    id: "layout-reset",
    actionId: "layout-reset",
    label: "Layout zuruecksetzen",
    description: "Setze Dock-Zonen, Panelgroessen und Workbench-Preset auf den Nexus Standard zurueck.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["layout", "reset", "dock", "panels", "default", "zuruecksetzen"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 57,
  }),
  Object.freeze({
    id: "dock-active-left",
    actionId: "dock-active-left",
    label: "Aktives Panel links docken",
    description: "Verschiebe das aktive Workbench-Panel in die linke Snap-Zone.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["dock", "left", "panel", "snap", "links"]),
    surfaces: Object.freeze(["palette"]),
    priority: 56,
  }),
  Object.freeze({
    id: "dock-active-right",
    actionId: "dock-active-right",
    label: "Aktives Panel rechts docken",
    description: "Verschiebe das aktive Workbench-Panel in die rechte Snap-Zone.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["dock", "right", "panel", "snap", "rechts"]),
    surfaces: Object.freeze(["palette"]),
    priority: 55,
  }),
  Object.freeze({
    id: "dock-active-bottom",
    actionId: "dock-active-bottom",
    label: "Aktives Panel unten docken",
    description: "Verschiebe das aktive Workbench-Panel in die untere Snap-Zone.",
    category: "layout",
    shortcut: "",
    keywords: Object.freeze(["dock", "bottom", "panel", "snap", "unten"]),
    surfaces: Object.freeze(["palette"]),
    priority: 54,
  }),
  Object.freeze({
    id: "open-extensions",
    actionId: "open-extensions",
    label: "Extensions anzeigen",
    description: "Oeffne Erweiterungen, Sprachtools und Integrationen.",
    category: "extensions",
    shortcut: "",
    keywords: Object.freeze(["plugins", "extensions", "languages", "tools", "marketplace"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 76,
  }),
  Object.freeze({
    id: "change-theme",
    actionId: "change-theme",
    label: "Theme wechseln",
    description: "Oeffne die Darstellungseinstellungen.",
    category: "preferences",
    shortcut: "Ctrl+K Ctrl+T",
    keywords: Object.freeze(["appearance", "color", "theme", "dark", "light"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 62,
  }),
  Object.freeze({
    id: "open-settings",
    actionId: "open-settings",
    label: "Einstellungen oeffnen",
    description: "Oeffne die Editor- und Workspace-Preferences.",
    category: "preferences",
    shortcut: "Ctrl+,",
    keywords: Object.freeze(["preferences", "settings", "config", "optionen"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 61,
  }),
  Object.freeze({
    id: "open-account",
    actionId: "open-account",
    label: "Account anzeigen",
    description: "Oeffne Konto- und Profilinformationen.",
    category: "preferences",
    shortcut: "",
    keywords: Object.freeze(["account", "profile", "user", "konto"]),
    surfaces: Object.freeze(["palette"]),
    priority: 44,
  }),
]);

const SNIPPET_PLACEHOLDER_PATTERN = /\$\{(?:\d+:)?([^}]+)\}|\$\d+/g;
const WORD_COMPLETION_PATTERN = /^[\w$-]*$/;

function normalizeCommandListValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (!value) return [];
  return String(value)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getEditorCommandCategory(command) {
  const categoryId = command?.category || "navigation";
  return EDITOR_COMMAND_CATEGORIES[categoryId] || EDITOR_COMMAND_CATEGORIES.navigation;
}

export function normalizeEditorCommand(command, index = 0) {
  const id = String(command?.id || "").trim();
  if (!id) return null;
  const category = getEditorCommandCategory(command);
  return Object.freeze({
    id,
    actionId: String(command?.actionId || id).trim(),
    label: String(command?.label || id).trim(),
    description: String(command?.description || "").trim(),
    category: category.id,
    shortcut: String(command?.shortcut || "").trim(),
    keywords: Object.freeze(normalizeCommandListValue(command?.keywords)),
    surfaces: Object.freeze(normalizeCommandListValue(command?.surfaces || ["palette"])),
    priority: Number.isFinite(Number(command?.priority))
      ? Number(command.priority)
      : Math.max(0, 50 - index),
    extensionId: command?.extensionId ? String(command.extensionId) : "",
  });
}

export function createEditorCommandRegistry(extensionCommands = []) {
  const registry = new Map();
  const safeExtensionCommands = Array.isArray(extensionCommands)
    ? extensionCommands
    : [];
  [...EDITOR_COMMANDS, ...safeExtensionCommands].forEach(
    (command, index) => {
      const normalized = normalizeEditorCommand(command, index);
      if (normalized) registry.set(normalized.id, normalized);
    },
  );

  return Object.freeze(
    [...registry.values()].sort((a, b) => {
      const categoryDelta =
        EDITOR_COMMAND_CATEGORY_ORDER.indexOf(a.category) -
        EDITOR_COMMAND_CATEGORY_ORDER.indexOf(b.category);
      if (categoryDelta !== 0) return categoryDelta;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.label.localeCompare(b.label);
    }),
  );
}

function normalizeHex(value, fallback) {
  const normalized = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

function getThemeSyntax(theme) {
  return {
    ...DEFAULT_SYNTAX_COLORS,
    comment: theme?.comment || theme?.syntax?.comment || DEFAULT_SYNTAX_COLORS.comment,
    keyword: theme?.keyword || theme?.syntax?.keyword || DEFAULT_SYNTAX_COLORS.keyword,
    string: theme?.string || theme?.syntax?.string || DEFAULT_SYNTAX_COLORS.string,
    number: theme?.number || theme?.syntax?.number || DEFAULT_SYNTAX_COLORS.number,
    function: theme?.function || theme?.syntax?.function || DEFAULT_SYNTAX_COLORS.function,
    variable: theme?.variable || theme?.syntax?.variable || DEFAULT_SYNTAX_COLORS.variable,
    type: theme?.type || theme?.syntax?.type || DEFAULT_SYNTAX_COLORS.type,
    operator: theme?.operator || theme?.syntax?.operator || DEFAULT_SYNTAX_COLORS.operator,
  };
}

export function createEditorHighlightStyle(theme) {
  const syntax = getThemeSyntax(theme);
  const muted = normalizeHex(theme?.muted, "#8b93a7");
  const text = normalizeHex(theme?.text, "#d7dae0");

  return HighlightStyle.define([
    { tag: tags.comment, color: normalizeHex(syntax.comment, muted), fontStyle: "italic" },
    { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: normalizeHex(syntax.keyword, text) },
    { tag: [tags.string, tags.special(tags.string), tags.regexp], color: normalizeHex(syntax.string, text) },
    { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom], color: normalizeHex(syntax.number, text) },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.function(tags.variableName))], color: normalizeHex(syntax.function, text) },
    { tag: [tags.variableName, tags.definition(tags.variableName), tags.self], color: normalizeHex(syntax.variable, text) },
    { tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.typeName)], color: normalizeHex(syntax.type, text) },
    { tag: [tags.operator, tags.compareOperator, tags.logicOperator, tags.arithmeticOperator, tags.derefOperator], color: normalizeHex(syntax.operator, text) },
    { tag: [tags.propertyName, tags.attributeName], color: normalizeHex(syntax.function, text) },
    { tag: tags.labelName, color: normalizeHex(syntax.type, text) },
    { tag: [tags.meta, tags.processingInstruction], color: muted },
    { tag: tags.invalid, color: "#fecaca", textDecoration: "underline wavy #ef4444" },
  ]);
}

export function cmPosToLspPosition(doc, pos) {
  const line = doc.lineAt(pos);
  return {
    lineNumber: line.number,
    column: pos - line.from + 1,
  };
}

export function lspRangeToCodeMirrorRange(doc, range) {
  if (!doc || !range?.start) return null;
  const resolvePos = (position) => {
    const lineNumber = Math.max(
      1,
      Math.min(doc.lines, Number(position?.line ?? 0) + 1),
    );
    const line = doc.line(lineNumber);
    const character = Math.max(0, Number(position?.character ?? 0));
    return Math.max(line.from, Math.min(line.to, line.from + character));
  };
  const from = resolvePos(range.start);
  const to = range.end ? resolvePos(range.end) : from;
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

export function lspSeverityToProblemSeverity(severity) {
  if (severity === 1 || severity === "error") return 8;
  if (severity === 2 || severity === "warning") return 4;
  if (severity === 3 || severity === "info" || severity === "information") return 2;
  return 1;
}

export function getProblemSeverityId(problem) {
  if (problem?.severity === 8) return "error";
  if (problem?.severity === 4) return "warning";
  if (problem?.severity === 2) return "info";
  return "hint";
}

export function getProblemFilePath(problem) {
  if (problem?.resource?.path) return String(problem.resource.path);
  if (problem?.resource) return String(problem.resource);
  return "Unknown File";
}

export function getProblemKey(problem, index = 0) {
  return [
    getProblemFilePath(problem),
    problem?.startLineNumber ?? 1,
    problem?.startColumn ?? 1,
    problem?.severity ?? 0,
    problem?.source || "",
    problem?.code || "",
    problem?.message || "",
    index,
  ].join("|");
}

export function problemMatchesQuery(problem, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return true;
  return [
    problem?.message,
    problem?.source,
    problem?.code,
    getProblemSeverityId(problem),
    getProblemFilePath(problem),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function lspDiagnosticsToProblems(diagnostics, resource) {
  return (diagnostics || []).slice(0, 180).map((diagnostic, index) => {
    const range = diagnostic.range || {};
    const start = range.start || {};
    const end = range.end || {};
    const line = Number(start.line ?? 0) + 1;
    const column = Number(start.character ?? 0) + 1;
    return {
      id: [
        resource,
        line,
        column,
        diagnostic.severity,
        diagnostic.source,
        diagnostic.code,
        diagnostic.message,
        index,
      ].join("|"),
      message: diagnostic.message || "Diagnostic",
      source: diagnostic.source || "nexus-lsp",
      code: diagnostic.code,
      severity: lspSeverityToProblemSeverity(diagnostic.severity),
      startLineNumber: Math.max(1, line),
      startColumn: Math.max(1, column),
      endLineNumber: Math.max(1, Number(end.line ?? start.line ?? 0) + 1),
      endColumn: Math.max(1, Number(end.character ?? start.character ?? 0) + 1),
      resource,
    };
  });
}

export function lspDiagnosticsToCodeMirror(diagnostics, view) {
  const doc = view?.state?.doc;
  if (!doc) return [];
  return (diagnostics || []).slice(0, 220).map((diagnostic) => {
    const range = lspRangeToCodeMirrorRange(doc, diagnostic.range) || {
      from: 0,
      to: Math.min(doc.length, 1),
    };
    const from = Math.max(0, Math.min(doc.length, range.from));
    const fallbackTo = Math.min(doc.length, from + 1);
    const to = Math.max(from, Math.min(doc.length, range.to || fallbackTo));
    const severity =
      diagnostic.severity === 1
        ? "error"
        : diagnostic.severity === 2
          ? "warning"
          : "info";

    return {
      from,
      to: to === from && from < doc.length ? from + 1 : to,
      severity,
      message: diagnostic.message || "Diagnostic",
      source: diagnostic.source || "nexus-lsp",
    };
  });
}

export function findDiagnosticAtPosition(diagnostics, view, pos) {
  return lspDiagnosticsToCodeMirror(diagnostics, view)
    .filter((diagnostic) => diagnostic.from <= pos && pos <= diagnostic.to)
    .sort((a, b) => {
      const severityDelta =
        (a.severity === "error" ? 0 : a.severity === "warning" ? 1 : 2) -
        (b.severity === "error" ? 0 : b.severity === "warning" ? 1 : 2);
      if (severityDelta !== 0) return severityDelta;
      return a.to - a.from - (b.to - b.from);
    })[0] || null;
}

function stripLspSnippet(value) {
  return String(value || "").replace(SNIPPET_PLACEHOLDER_PATTERN, (_, placeholder) =>
    placeholder ? String(placeholder) : "",
  );
}

function completionType(kind) {
  return COMPLETION_KIND_TYPES[Number(kind)] || "text";
}

function completionKindName(kind) {
  return COMPLETION_KIND_NAMES[Number(kind)] || "Symbol";
}

function normalizeCompletionLabel(item) {
  if (typeof item?.label === "string") return item.label;
  if (item?.label?.label) return item.label.label;
  return String(item?.insertText || item?.textEdit?.newText || "completion");
}

function readMarkupContent(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(readMarkupContent).filter(Boolean).join("\n\n");
  }
  if (typeof value === "object") {
    if (typeof value.value === "string") return value.value;
    if (typeof value.contents === "string" || Array.isArray(value.contents)) {
      return readMarkupContent(value.contents);
    }
  }
  return "";
}

export function readHoverText(hover) {
  return readMarkupContent(hover?.contents ?? hover)
    .replace(/\r\n/g, "\n")
    .trim();
}

function resolveCompletionText(item, label) {
  const text = item?.textEdit?.newText ?? item?.insertText ?? item?.label?.label ?? label;
  return item?.insertTextFormat === 2 ? stripLspSnippet(text) : String(text || label);
}

function applyCompletionTextEdit(item, insertText) {
  const range = item?.textEdit?.range || item?.textEdit?.insert || item?.textEdit?.replace;
  if (!range) return insertText;

  return (view, _completion, from, to) => {
    const resolvedRange = lspRangeToCodeMirrorRange(view.state.doc, range);
    const changeFrom = resolvedRange?.from ?? from;
    const changeTo = resolvedRange?.to ?? to;
    view.dispatch({
      changes: { from: changeFrom, to: changeTo, insert: insertText },
      selection: { anchor: changeFrom + insertText.length },
      userEvent: "input.complete",
    });
  };
}

function getCompletionBoost(item, index) {
  if (item?.preselect) return 99;
  if (item?.sortText && /^[!#0]/.test(String(item.sortText))) return 30;
  return Math.max(-30, 12 - index / 8);
}

export function createSnippetCompletions(context) {
  const word = context.matchBefore(/[\w$-]*/);
  const from = word ? word.from : context.pos;
  return {
    from,
    options: [
      {
        label: "nexus-component",
        type: "function",
        detail: "Nexus React component",
        boost: 25,
        apply: [
          "import React from 'react';",
          "import { motion } from 'framer-motion';",
          "",
          "export default function ComponentName() {",
          "  return (",
          "    <motion.div className=\"nexus-glass p-6 rounded-lg\">",
          "      <h1>Hello Nexus</h1>",
          "    </motion.div>",
          "  );",
          "}",
        ].join("\n"),
      },
      {
        label: "clg",
        type: "function",
        detail: "console.log",
        boost: 20,
        apply: "console.log();",
      },
      {
        label: "useState",
        type: "function",
        detail: "React state hook",
        boost: 16,
        apply: "const [value, setValue] = useState(null);",
      },
    ],
    validFor: WORD_COMPLETION_PATTERN,
  };
}

export function shouldRequestLspCompletion(context) {
  if (context.explicit) return true;
  const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
  return /[.\w$:/<#@"'`-]$/.test(before);
}

export function lspCompletionsToCodeMirror(context, completionList, snippetResult, maxItems = 120) {
  const word = context.matchBefore(/[\w$-]*/);
  const from = word ? word.from : context.pos;
  const items = completionList?.items || [];
  const options = items.slice(0, maxItems).map((item, index) => {
    const label = normalizeCompletionLabel(item);
    const insertText = resolveCompletionText(item, label);
    const documentation = readMarkupContent(item.documentation).trim();
    const kindDetail = completionKindName(item.kind);
    const detailParts = [
      item.detail,
      item.labelDetails?.detail,
      item.labelDetails?.description,
    ].filter(Boolean);

    return {
      label,
      type: completionType(item.kind),
      detail: detailParts.join(" ").trim() || kindDetail,
      info: documentation || kindDetail,
      apply: applyCompletionTextEdit(item, insertText),
      boost: getCompletionBoost(item, index),
      section: item.sortText?.startsWith("!") ? "Recommended" : "Language Server",
    };
  });

  const unique = new Map();
  [...snippetResult.options, ...options].forEach((option) => {
    const key = `${option.label}|${option.detail || ""}`;
    if (!unique.has(key)) unique.set(key, option);
  });

  return {
    from,
    options: [...unique.values()],
    validFor: completionList?.isIncomplete ? undefined : WORD_COMPLETION_PATTERN,
  };
}

