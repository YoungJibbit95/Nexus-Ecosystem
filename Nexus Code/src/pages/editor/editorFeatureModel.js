import { HighlightStyle } from "@codemirror/language";
import {
  insertCompletionText,
  pickedCompletion,
  snippet,
  snippetCompletion,
} from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";
import {
  getLanguageCapabilities,
  getLanguageDisplayName,
  LANGUAGE_IDS,
  normalizeLanguageId,
} from "../../ide/languages/languageIds.js";

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
  "symbols",
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
    label: "Search & Navigation",
    description: "Dateien, Symbole und Fokus finden",
    tone: "sky",
  }),
  symbols: Object.freeze({
    id: "symbols",
    label: "Symbols",
    description: "Scopes, Klassen und Funktionen",
    tone: "violet",
  }),
  "source-control": Object.freeze({
    id: "source-control",
    label: "Git & GitHub",
    description: "Branches, Reviews und Aenderungen",
    tone: "sky",
  }),
  diagnostics: Object.freeze({
    id: "diagnostics",
    label: "Problems",
    description: "Fehler, Warnungen und Lint-Hinweise",
    tone: "violet",
  }),
  terminal: Object.freeze({
    id: "terminal",
    label: "Terminal & Tasks",
    description: "Shells, Scripts und Build-Flows",
    tone: "cyan",
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
    description: "Sprachtools, Formatter und Integrationen",
    tone: "cyan",
  }),
  preferences: Object.freeze({
    id: "preferences",
    label: "Settings",
    description: "Editor, Theme und Account",
    tone: "sky",
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
    keywords: Object.freeze(["files", "sidebar", "tree", "explorer", "project", "navigation", "browse"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 92,
  }),
  Object.freeze({
    id: "open-search",
    actionId: "open-search",
    label: "Search: Workspace durchsuchen",
    description: "Finde Text, Dateien und Projektinhalte im Workspace.",
    category: "navigation",
    shortcut: "Ctrl+Shift+F",
    keywords: Object.freeze([
      "find",
      "search",
      "workspace",
      "grep",
      "ripgrep",
      "suche",
      "find in files",
      "content",
      "text",
    ]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 90,
    favorite: true,
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
    id: "focus-active-symbol",
    actionId: "focus-editor",
    label: "Aktiven Symbol-Scope fokussieren",
    description: "Springe in den Editor und halte Klasse, Methode oder Heading sichtbar.",
    category: "symbols",
    shortcut: "",
    keywords: Object.freeze(["symbol", "symbols", "scope", "breadcrumb", "function", "class", "heading", "active"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 86,
  }),
  Object.freeze({
    id: "search-workspace-symbols",
    actionId: "open-search",
    label: "Workspace-Symbole suchen",
    description: "Oeffne die Suche fuer Funktionen, Klassen, Headings und Strukturtreffer.",
    category: "symbols",
    shortcut: "@",
    keywords: Object.freeze(["symbol", "symbols", "outline", "function", "class", "method", "heading", "workspace"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 84,
  }),
  Object.freeze({
    id: "github-sync",
    actionId: "github-sync",
    label: "Git: Aenderungen und Branches",
    description: "Pruefe Branch, Staging, Diffs und lokale Aenderungen.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze([
      "git",
      "github",
      "source control",
      "scm",
      "commit",
      "stage",
      "staged",
      "unstaged",
      "changes",
      "diff",
      "branch",
      "status",
      "pull",
      "push",
      "sync",
    ]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 82,
    favorite: true,
  }),
  Object.freeze({
    id: "open-github-issues",
    actionId: "open-github-issues",
    label: "GitHub: Issues und Tasks",
    description: "Oeffne Issues mit Status, Labels und Bearbeitungsaktionen.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["github", "issues", "bugs", "tasks", "tickets", "triage", "labels"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 81,
  }),
  Object.freeze({
    id: "open-pull-requests",
    actionId: "open-pull-requests",
    label: "GitHub: Pull Requests",
    description: "Oeffne PRs, Checks und Review-nahe Aktionen.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["github", "pull request", "pull requests", "pr", "review", "checks", "ci"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 80,
  }),
  Object.freeze({
    id: "open-github-projects",
    actionId: "open-github-projects",
    label: "GitHub: Projects und Boards",
    description: "Oeffne Project Boards und verknuepfte Issues oder PRs.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["github", "projects", "board", "planning", "project", "roadmap"]),
    surfaces: Object.freeze(["palette"]),
    priority: 79,
  }),
  Object.freeze({
    id: "open-problems",
    actionId: "open-problems",
    label: "Problems: Fehler und Warnungen",
    description: "Oeffne Diagnosemeldungen, Lint-Fehler und Warnungen.",
    category: "diagnostics",
    shortcut: "",
    keywords: Object.freeze([
      "problems",
      "problem",
      "diagnostics",
      "diagnose",
      "errors",
      "warnings",
      "lint",
      "eslint",
      "typescript",
      "ts",
      "quick fix",
    ]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 80,
    favorite: true,
  }),
  Object.freeze({
    id: "toggle-terminal",
    actionId: "toggle-terminal",
    label: "Terminal: Panel oeffnen",
    description: "Zeige oder fokussiere das integrierte Terminal.",
    category: "terminal",
    shortcut: "Ctrl+`",
    keywords: Object.freeze(["shell", "console", "cli", "terminal", "command line", "integrated terminal"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 78,
    favorite: true,
  }),
  Object.freeze({
    id: "terminal-task-runner",
    actionId: "toggle-terminal",
    label: "Terminal: Tasks und Scripts",
    description: "Bereite npm-, Build- oder Test-Tasks im Terminal vor.",
    category: "terminal",
    shortcut: "",
    keywords: Object.freeze([
      "npm",
      "pnpm",
      "yarn",
      "test",
      "build",
      "run",
      "script",
      "scripts",
      "task",
      "tasks",
      "runner",
    ]),
    surfaces: Object.freeze(["palette"]),
    priority: 70,
    favorite: true,
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
    label: "Extensions: Erweiterungen verwalten",
    description: "Oeffne Sprachtools, Formatter und Integrationen.",
    category: "extensions",
    shortcut: "",
    keywords: Object.freeze([
      "plugins",
      "extensions",
      "extension",
      "languages",
      "language tools",
      "tools",
      "marketplace",
      "install",
      "enable",
      "disable",
      "prettier",
      "eslint",
    ]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 76,
    favorite: true,
  }),
  Object.freeze({
    id: "change-theme",
    actionId: "change-theme",
    label: "Settings: Theme und Farben",
    description: "Oeffne die Darstellungseinstellungen.",
    category: "preferences",
    shortcut: "Ctrl+K Ctrl+T",
    keywords: Object.freeze(["appearance", "color", "theme", "dark", "light", "settings"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 62,
  }),
  Object.freeze({
    id: "open-settings",
    actionId: "open-settings",
    label: "Settings: Editor konfigurieren",
    description: "Oeffne Editor-, Workspace- und Tastatur-Optionen.",
    category: "preferences",
    shortcut: "Ctrl+,",
    keywords: Object.freeze([
      "preferences",
      "settings",
      "setting",
      "config",
      "configuration",
      "optionen",
      "options",
      "keyboard",
      "shortcuts",
      "workspace settings",
    ]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 61,
    favorite: true,
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
const COMPLETION_MATCH_PATTERN = /[\w$-]*$/;
const CSS_COMPLETION_MATCH_PATTERN = /[\w$#.:-]*$/;
const MARKDOWN_COMPLETION_MATCH_PATTERN = /[#>`*\w$-]*$/;
const LOCAL_COMPLETION_IMPLICIT_MIN_LENGTH = 1;
const COMPLETION_LIMIT_MIN = 16;
const COMPLETION_LIMIT_MAX = 240;
const LOCAL_COMPLETION_MIN_PREFIX_FALLBACK = 2;

const COMPLETION_ORIGINS = Object.freeze({
  lspRecommended: "lsp-recommended",
  lsp: "lsp",
  snippet: "snippet",
  local: "local",
  language: "language",
  structure: "structure",
});

const COMPLETION_SECTIONS = Object.freeze({
  lspRecommended: Object.freeze({
    name: "Recommended",
    rank: 0,
    origin: COMPLETION_ORIGINS.lspRecommended,
  }),
  lsp: Object.freeze({ name: "Language Server", rank: 8, origin: COMPLETION_ORIGINS.lsp }),
  snippets: Object.freeze({ name: "Snippets", rank: 12, origin: COMPLETION_ORIGINS.snippet }),
  local: Object.freeze({ name: "Current Document", rank: 13, origin: COMPLETION_ORIGINS.local }),
  language: Object.freeze({ name: "Language", rank: 22, origin: COMPLETION_ORIGINS.language }),
  structure: Object.freeze({ name: "Structures", rank: 24, origin: COMPLETION_ORIGINS.structure }),
});

const STRUCTURE_COMPLETION_SECTION = COMPLETION_SECTIONS.structure;
const LANGUAGE_COMPLETION_SECTION = COMPLETION_SECTIONS.language;
const SNIPPET_COMPLETION_SECTION = COMPLETION_SECTIONS.snippets;
const LOCAL_COMPLETION_SECTION = COMPLETION_SECTIONS.local;
const LOCAL_COMPLETION_WORD_PATTERN = /[A-Za-z_$][\w$-]{2,}/g;
const LOCAL_COMPLETION_MAX_TEXT = 120_000;
const LOCAL_COMPLETION_MAX_ITEMS = 36;
const COMPLETION_LSP_SCAN_FACTOR = 2;
const COMPLETION_LSP_SCAN_MAX = 480;
const LSP_COMPLETION_DEPRECATED_TAG = 1;
const LARGE_FILE_CHAR_THRESHOLD_DEFAULT = 220_000;
const HUGE_FILE_CHAR_THRESHOLD_DEFAULT = 650_000;
const LARGE_FILE_LINE_THRESHOLD_DEFAULT = 7_500;
const HUGE_FILE_LINE_THRESHOLD_DEFAULT = 18_000;
const ACTIVE_LSP_STATES = new Set(["available", "ready", "running", "started"]);
const PENDING_LSP_STATES = new Set(["initializing", "pending", "starting"]);
const FALLBACK_LSP_STATES = new Set([
  "disabled",
  "idle",
  "missing",
  "unavailable",
  "unsupported",
]);

function freezeCompletionList(items) {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function completionInfo(summary, example = "") {
  return [summary, example ? `\n${example}` : ""].join("").trim();
}

function keywordCompletion(label, detail, boost = 0, info = "") {
  return {
    label,
    type: "keyword",
    detail,
    info: info || completionInfo(detail),
    boost,
    section: LANGUAGE_COMPLETION_SECTION,
    completionOrigin: COMPLETION_ORIGINS.language,
  };
}

function textCompletion(label, detail, boost = 0, info = "", type = "text") {
  return {
    label,
    type,
    detail,
    info: info || completionInfo(detail),
    boost,
    section: LANGUAGE_COMPLETION_SECTION,
    completionOrigin: COMPLETION_ORIGINS.language,
  };
}

function snippetItem(label, detail, template, boost, info, type = "function") {
  return {
    label,
    detail,
    template,
    boost,
    info,
    type,
    section: SNIPPET_COMPLETION_SECTION,
    completionOrigin: COMPLETION_ORIGINS.snippet,
  };
}

function structureSnippet(label, detail, template, boost, info, type = "text") {
  return {
    label,
    detail,
    template,
    boost,
    info,
    type,
    section: STRUCTURE_COMPLETION_SECTION,
    completionOrigin: COMPLETION_ORIGINS.structure,
  };
}

const JAVASCRIPT_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "import",
    "ES module import",
    'import ${1:name} from "${2:module}";',
    38,
    completionInfo("Import a symbol or default export from a module."),
    "keyword",
  ),
  snippetItem(
    "fn",
    "named function",
    "function ${1:name}(${2:args}) {\n\t${0}\n}",
    34,
    completionInfo("Create a named JavaScript function."),
  ),
  snippetItem(
    "afn",
    "async arrow function",
    "const ${1:name} = async (${2:args}) => {\n\t${0}\n};",
    33,
    completionInfo("Create an async arrow function expression."),
  ),
  snippetItem(
    "try",
    "try/catch",
    "try {\n\t${1}\n} catch (${2:error}) {\n\t${0}\n}",
    29,
    completionInfo("Wrap code in a try/catch block."),
    "keyword",
  ),
  snippetItem(
    "useEffect",
    "React effect hook",
    "useEffect(() => {\n\t${1}\n}, [${2}]);",
    26,
    completionInfo("Create a React effect with a dependency array."),
  ),
  snippetItem(
    "useMemo",
    "React memo hook",
    "const ${1:value} = useMemo(() => ${2:expression}, [${3}]);",
    23,
    completionInfo("Memoize an expensive React expression."),
  ),
  snippetItem(
    "clg",
    "console.log",
    "console.log(${1:value});",
    21,
    completionInfo("Log a value to the developer console."),
  ),
  keywordCompletion("async", "async function modifier", 12),
  keywordCompletion("await", "wait for a promise", 12),
  keywordCompletion("const", "block scoped binding", 11),
  keywordCompletion("return", "return from function", 10),
  keywordCompletion("export default", "default export", 9),
]);

const TYPESCRIPT_COMPLETIONS = freezeCompletionList([
  ...JAVASCRIPT_COMPLETIONS,
  snippetItem(
    "interface",
    "TypeScript interface",
    "interface ${1:Name} {\n\t${2:property}: ${3:type};\n}",
    36,
    completionInfo("Define a TypeScript object contract."),
    "interface",
  ),
  snippetItem(
    "type",
    "type alias",
    "type ${1:Name} = ${2:value};",
    33,
    completionInfo("Define a TypeScript alias."),
    "type",
  ),
  snippetItem(
    "generic-fn",
    "generic function",
    "function ${1:name}<${2:T}>(${3:value}: ${2:T}): ${2:T} {\n\treturn ${3:value};\n}",
    27,
    completionInfo("Create a generic function with typed input and output."),
  ),
  textCompletion("Readonly", "utility type", 12, "Make every property readonly.", "type"),
  textCompletion("Partial", "utility type", 11, "Make every property optional.", "type"),
  textCompletion("Record", "utility type", 10, "Map a key union to a value type.", "type"),
]);

const PYTHON_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "def",
    "function definition",
    "def ${1:name}(${2:args}):\n\t${0}",
    38,
    completionInfo("Create a Python function."),
  ),
  snippetItem(
    "class",
    "class definition",
    "class ${1:Name}:\n\tdef __init__(self${2:, args}):\n\t\t${0}",
    35,
    completionInfo("Create a Python class with an initializer."),
    "class",
  ),
  snippetItem(
    "ifmain",
    "main guard",
    'if __name__ == "__main__":\n\t${0}',
    32,
    completionInfo("Run code only when the module is executed directly."),
    "keyword",
  ),
  snippetItem(
    "try",
    "try/except",
    "try:\n\t${1}\nexcept ${2:Exception} as ${3:error}:\n\t${0}",
    29,
    completionInfo("Handle a Python exception."),
    "keyword",
  ),
  snippetItem(
    "with-open",
    "open file context",
    'with open("${1:path}", "${2:r}", encoding="utf-8") as ${3:file}:\n\t${0}',
    24,
    completionInfo("Open a file with automatic cleanup."),
  ),
  keywordCompletion("import", "module import", 13),
  keywordCompletion("from", "selective import", 12),
  keywordCompletion("return", "return from function", 10),
  textCompletion("print", "print value", 9, "Write a value to stdout.", "function"),
]);

const RUST_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "fn",
    "function",
    "fn ${1:name}(${2:args}) -> ${3:ReturnType} {\n\t${0}\n}",
    38,
    completionInfo("Create a Rust function."),
  ),
  snippetItem(
    "impl",
    "impl block",
    "impl ${1:Type} {\n\t${0}\n}",
    34,
    completionInfo("Implement inherent methods for a type."),
    "class",
  ),
  snippetItem(
    "struct",
    "struct",
    "struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}",
    33,
    completionInfo("Create a Rust struct."),
    "class",
  ),
  snippetItem(
    "match",
    "match expression",
    "match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => ${0},\n}",
    31,
    completionInfo("Branch on Rust patterns."),
    "keyword",
  ),
  snippetItem(
    "test",
    "unit test",
    "#[test]\nfn ${1:test_name}() {\n\t${0}\n}",
    25,
    completionInfo("Create a Rust unit test."),
  ),
  keywordCompletion("let", "immutable binding", 12),
  keywordCompletion("mut", "mutable binding modifier", 11),
  textCompletion("Result", "std result type", 10, "Return Ok or Err from fallible code.", "type"),
  textCompletion("Option", "optional value type", 10, "Represent Some value or None.", "type"),
]);

const GO_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "func",
    "function",
    "func ${1:name}(${2:args}) ${3:returnType} {\n\t${0}\n}",
    38,
    completionInfo("Create a Go function."),
  ),
  snippetItem(
    "main",
    "main package entry",
    "package main\n\nimport \"fmt\"\n\nfunc main() {\n\t${0}\n}",
    34,
    completionInfo("Create a runnable Go main file."),
  ),
  snippetItem(
    "struct",
    "struct type",
    "type ${1:Name} struct {\n\t${2:Field} ${3:string}\n}",
    31,
    completionInfo("Create a Go struct type."),
    "class",
  ),
  snippetItem(
    "iferr",
    "error guard",
    "if ${1:err} != nil {\n\treturn ${2:nil}, ${1:err}\n}",
    30,
    completionInfo("Return early when an error is present."),
    "keyword",
  ),
  snippetItem(
    "test",
    "Go test",
    "func Test${1:Name}(t *testing.T) {\n\t${0}\n}",
    24,
    completionInfo("Create a Go unit test."),
  ),
  keywordCompletion("package", "package declaration", 12),
  keywordCompletion("import", "import declaration", 12),
  keywordCompletion("defer", "defer call until return", 10),
  textCompletion("context.Context", "request context", 9, "Pass cancellation and deadlines through calls.", "type"),
]);

const CSS_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "flex-center",
    "center with flexbox",
    "display: flex;\nplace-content: center;\nalign-items: center;",
    35,
    completionInfo("Center children with flexbox."),
    "property",
  ),
  structureSnippet(
    "grid-auto",
    "responsive grid",
    "display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(${1:16rem}, 1fr));\ngap: ${2:1rem};",
    32,
    completionInfo("Create a responsive auto-fit grid."),
    "property",
  ),
  structureSnippet(
    "media",
    "media query",
    "@media (${1:min-width}: ${2:768px}) {\n\t${0}\n}",
    29,
    completionInfo("Create a responsive media query."),
    "keyword",
  ),
  structureSnippet(
    "keyframes",
    "animation keyframes",
    "@keyframes ${1:name} {\n\tfrom { ${2:opacity: 0;} }\n\tto { ${3:opacity: 1;} }\n}",
    24,
    completionInfo("Define CSS keyframes."),
    "keyword",
  ),
  textCompletion("display", "layout property", 16, "Set inner display layout.", "property"),
  textCompletion("position", "positioning property", 15, "Control positioning mode.", "property"),
  textCompletion("var(--", "CSS custom property", 14, "Reference a CSS custom property.", "variable"),
  textCompletion("clamp", "responsive value", 12, "Clamp a value between min and max.", "function"),
  textCompletion("color-mix", "color function", 10, "Mix colors in a color space.", "function"),
]);

const JSON_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "object",
    "JSON object",
    "{\n\t\"${1:key}\": ${2:value}\n}",
    30,
    completionInfo("Insert a JSON object skeleton."),
  ),
  structureSnippet(
    "array",
    "JSON array",
    "[\n\t${1:value}\n]",
    26,
    completionInfo("Insert a JSON array skeleton."),
  ),
  structureSnippet(
    "package-scripts",
    "package.json scripts",
    "\"scripts\": {\n\t\"dev\": \"vite\",\n\t\"build\": \"vite build\",\n\t\"lint\": \"eslint .\"\n}",
    24,
    completionInfo("Add common package.json script entries."),
    "property",
  ),
  structureSnippet(
    "tsconfig-compiler",
    "tsconfig compilerOptions",
    "\"compilerOptions\": {\n\t\"target\": \"ES2022\",\n\t\"module\": \"ESNext\",\n\t\"strict\": true\n}",
    22,
    completionInfo("Add a compact TypeScript compilerOptions block."),
    "property",
  ),
  textCompletion("true", "boolean literal", 10, "", "constant"),
  textCompletion("false", "boolean literal", 10, "", "constant"),
  textCompletion("null", "null literal", 9, "", "constant"),
]);

const MARKDOWN_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "heading",
    "section heading",
    "## ${1:Heading}\n\n${0}",
    31,
    completionInfo("Insert a Markdown section heading."),
  ),
  structureSnippet(
    "code-fence",
    "fenced code block",
    "```${1:language}\n${0}\n```",
    30,
    completionInfo("Insert a fenced code block."),
  ),
  structureSnippet(
    "table",
    "markdown table",
    "| ${1:Column} | ${2:Column} |\n| --- | --- |\n| ${3:Value} | ${4:Value} |",
    27,
    completionInfo("Insert a two-column Markdown table."),
  ),
  structureSnippet(
    "task-list",
    "task list",
    "- [ ] ${1:Task}\n- [ ] ${0}",
    24,
    completionInfo("Insert a Markdown task list."),
  ),
  structureSnippet(
    "details",
    "collapsible details",
    "<details>\n<summary>${1:Summary}</summary>\n\n${0}\n</details>",
    20,
    completionInfo("Insert collapsible Markdown details."),
  ),
  textCompletion("TODO", "todo marker", 10, "Mark work that still needs attention.", "keyword"),
  textCompletion("NOTE", "note marker", 9, "Mark a useful note.", "keyword"),
]);

const HTML_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "html",
    "HTML document",
    "<!doctype html>\n<html lang=\"${1:en}\">\n<head>\n\t<meta charset=\"utf-8\" />\n\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n\t<title>${2:Title}</title>\n</head>\n<body>\n\t${0}\n</body>\n</html>",
    36,
    completionInfo("Insert a complete HTML document shell."),
    "text",
  ),
  structureSnippet(
    "section",
    "semantic section",
    "<section class=\"${1:section}\">\n\t<h2>${2:Heading}</h2>\n\t${0}\n</section>",
    30,
    completionInfo("Create a semantic section with a heading."),
    "text",
  ),
  structureSnippet(
    "form",
    "accessible form",
    "<form>\n\t<label for=\"${1:field}\">${2:Label}</label>\n\t<input id=\"${1:field}\" name=\"${1:field}\" type=\"${3:text}\" />\n\t<button type=\"submit\">${4:Submit}</button>\n</form>",
    26,
    completionInfo("Create a compact labelled form."),
    "text",
  ),
  textCompletion("aria-label", "accessibility attribute", 14, "Name controls for assistive technologies.", "property"),
  textCompletion("class", "class attribute", 12, "Apply one or more CSS classes.", "property"),
  textCompletion("data-", "data attribute", 10, "Attach custom data to an element.", "property"),
]);

const SQL_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "select",
    "SELECT query",
    "SELECT ${1:columns}\nFROM ${2:table}\nWHERE ${3:condition};",
    36,
    completionInfo("Create a filtered SELECT query."),
    "keyword",
  ),
  structureSnippet(
    "join",
    "JOIN query",
    "SELECT ${1:columns}\nFROM ${2:left_table}\nJOIN ${3:right_table}\n\tON ${2:left_table}.${4:id} = ${3:right_table}.${5:left_id};",
    30,
    completionInfo("Create a JOIN with an ON clause."),
    "keyword",
  ),
  structureSnippet(
    "cte",
    "common table expression",
    "WITH ${1:name} AS (\n\tSELECT ${2:columns}\n\tFROM ${3:table}\n)\nSELECT * FROM ${1:name};",
    28,
    completionInfo("Create a query with a CTE."),
    "keyword",
  ),
  keywordCompletion("GROUP BY", "aggregate groups", 12),
  keywordCompletion("ORDER BY", "sort rows", 12),
  keywordCompletion("LIMIT", "limit rows", 10),
]);

const SHELL_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "shebang",
    "bash shebang",
    "#!/usr/bin/env bash\nset -euo pipefail\n\n${0}",
    35,
    completionInfo("Create a strict Bash script header."),
    "keyword",
  ),
  snippetItem(
    "if",
    "shell if",
    "if [[ ${1:condition} ]]; then\n\t${0}\nfi",
    30,
    completionInfo("Create a Bash conditional."),
    "keyword",
  ),
  snippetItem(
    "for",
    "shell loop",
    "for ${1:item} in ${2:items}; do\n\t${0}\ndone",
    28,
    completionInfo("Loop over shell items."),
    "keyword",
  ),
  textCompletion("git status", "git status", 12, "Inspect working tree state.", "function"),
  textCompletion("npm run", "npm script", 10, "Run a package script.", "function"),
  textCompletion("Test-Path", "PowerShell path check", 9, "Check if a path exists.", "function"),
]);

const YAML_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "github-action",
    "GitHub Actions workflow",
    "name: ${1:CI}\n\non:\n  push:\n    branches: [${2:main}]\n  pull_request:\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: ${3:Run checks}\n        run: ${0:npm test}",
    36,
    completionInfo("Create a minimal GitHub Actions workflow."),
    "text",
  ),
  structureSnippet(
    "docker-compose",
    "Compose service",
    "services:\n  ${1:app}:\n    image: ${2:image}\n    ports:\n      - \"${3:3000}:3000\"",
    30,
    completionInfo("Create a compact Docker Compose service."),
    "text",
  ),
  textCompletion("version", "version key", 10, "", "property"),
  textCompletion("services", "services key", 10, "", "property"),
  textCompletion("environment", "environment key", 9, "", "property"),
]);

const TOML_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "package",
    "package metadata",
    "[package]\nname = \"${1:name}\"\nversion = \"${2:0.1.0}\"\nedition = \"${3:2021}\"",
    30,
    completionInfo("Create Rust-style package metadata."),
    "property",
  ),
  structureSnippet(
    "dependencies",
    "dependency table",
    "[dependencies]\n${1:name} = \"${2:version}\"",
    26,
    completionInfo("Create a dependency table."),
    "property",
  ),
  textCompletion("workspace", "workspace table", 10, "", "property"),
  textCompletion("features", "features table", 9, "", "property"),
]);

const DOCKER_COMPLETIONS = freezeCompletionList([
  structureSnippet(
    "node",
    "Node Dockerfile",
    "FROM node:${1:22-alpine}\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD [\"npm\", \"run\", \"${2:start}\"]",
    34,
    completionInfo("Create a Node-focused Dockerfile."),
    "keyword",
  ),
  keywordCompletion("FROM", "base image", 14),
  keywordCompletion("RUN", "build command", 12),
  keywordCompletion("COPY", "copy files", 12),
  keywordCompletion("CMD", "default command", 10),
]);

const C_FAMILY_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "main",
    "program entry",
    "int main(${1:void}) {\n\t${0}\n\treturn 0;\n}",
    32,
    completionInfo("Create a C/C++ entry point."),
  ),
  snippetItem(
    "class",
    "class declaration",
    "class ${1:Name} {\npublic:\n\t${1:Name}();\n\t~${1:Name}();\nprivate:\n\t${0}\n};",
    28,
    completionInfo("Create a C++ class declaration."),
    "class",
  ),
  keywordCompletion("const", "constant value", 12),
  keywordCompletion("constexpr", "compile-time value", 10),
  textCompletion("std::vector", "vector container", 9, "", "type"),
]);

const JAVA_FAMILY_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "class",
    "class declaration",
    "public class ${1:Name} {\n\t${0}\n}",
    34,
    completionInfo("Create a public class."),
    "class",
  ),
  snippetItem(
    "main",
    "main method",
    "public static void main(String[] args) {\n\t${0}\n}",
    30,
    completionInfo("Create a Java-style main method."),
  ),
  keywordCompletion("public", "public visibility", 12),
  keywordCompletion("private", "private visibility", 11),
  textCompletion("List", "collection interface", 10, "", "type"),
]);

const PHP_COMPLETIONS = freezeCompletionList([
  snippetItem(
    "php",
    "PHP block",
    "<?php\n\n${0}",
    32,
    completionInfo("Create a PHP opening block."),
    "keyword",
  ),
  snippetItem(
    "function",
    "PHP function",
    "function ${1:name}(${2:args}) {\n\t${0}\n}",
    30,
    completionInfo("Create a PHP function."),
  ),
  keywordCompletion("namespace", "namespace declaration", 12),
  keywordCompletion("use", "import class", 11),
  textCompletion("array_map", "map array", 9, "", "function"),
]);

const LANGUAGE_COMPLETION_MAP = Object.freeze({
  [LANGUAGE_IDS.JAVASCRIPT]: JAVASCRIPT_COMPLETIONS,
  [LANGUAGE_IDS.TYPESCRIPT]: TYPESCRIPT_COMPLETIONS,
  [LANGUAGE_IDS.PYTHON]: PYTHON_COMPLETIONS,
  [LANGUAGE_IDS.RUST]: RUST_COMPLETIONS,
  [LANGUAGE_IDS.GO]: GO_COMPLETIONS,
  [LANGUAGE_IDS.C]: C_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.CPP]: C_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.CSHARP]: C_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.OBJECTIVE_C]: C_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.JAVA]: JAVA_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.KOTLIN]: JAVA_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.SCALA]: JAVA_FAMILY_COMPLETIONS,
  [LANGUAGE_IDS.PHP]: PHP_COMPLETIONS,
  [LANGUAGE_IDS.CSS]: CSS_COMPLETIONS,
  [LANGUAGE_IDS.SCSS]: CSS_COMPLETIONS,
  [LANGUAGE_IDS.LESS]: CSS_COMPLETIONS,
  [LANGUAGE_IDS.HTML]: HTML_COMPLETIONS,
  [LANGUAGE_IDS.VUE]: HTML_COMPLETIONS,
  [LANGUAGE_IDS.SVELTE]: HTML_COMPLETIONS,
  [LANGUAGE_IDS.ASTRO]: HTML_COMPLETIONS,
  [LANGUAGE_IDS.JSON]: JSON_COMPLETIONS,
  [LANGUAGE_IDS.JSONC]: JSON_COMPLETIONS,
  [LANGUAGE_IDS.MARKDOWN]: MARKDOWN_COMPLETIONS,
  [LANGUAGE_IDS.MDX]: MARKDOWN_COMPLETIONS,
  [LANGUAGE_IDS.SQL]: SQL_COMPLETIONS,
  [LANGUAGE_IDS.SHELL]: SHELL_COMPLETIONS,
  [LANGUAGE_IDS.POWERSHELL]: SHELL_COMPLETIONS,
  [LANGUAGE_IDS.BAT]: SHELL_COMPLETIONS,
  [LANGUAGE_IDS.ENV]: SHELL_COMPLETIONS,
  [LANGUAGE_IDS.YAML]: YAML_COMPLETIONS,
  [LANGUAGE_IDS.TOML]: TOML_COMPLETIONS,
  [LANGUAGE_IDS.DOCKERFILE]: DOCKER_COMPLETIONS,
});

const RESERVED_SYMBOL_NAMES = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "catch",
  "case",
  "class",
  "const",
  "continue",
  "debugger",
  "def",
  "default",
  "del",
  "delete",
  "do",
  "elif",
  "else",
  "enum",
  "except",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "global",
  "if",
  "import",
  "in",
  "instanceof",
  "lambda",
  "let",
  "new",
  "none",
  "nonlocal",
  "not",
  "null",
  "or",
  "pass",
  "raise",
  "return",
  "self",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

const JAVASCRIPT_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "class",
    detail: "class",
    pattern: /^\s*(?:export\s+default\s+|export\s+)?class\s+([A-Za-z_$][\w$]*)/,
  }),
  Object.freeze({
    kind: "interface",
    detail: "interface",
    pattern: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/,
  }),
  Object.freeze({
    kind: "type",
    detail: "type",
    pattern: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/,
  }),
  Object.freeze({
    kind: "function",
    detail: "function",
    pattern: /^\s*(?:export\s+default\s+|export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/,
  }),
  Object.freeze({
    kind: "function",
    detail: "arrow function",
    pattern: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
  }),
  Object.freeze({
    kind: "function",
    detail: "function expression",
    pattern: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/,
  }),
  Object.freeze({
    kind: "method",
    detail: "method",
    pattern: /^\s*(?:async\s+|static\s+|public\s+|private\s+|protected\s+|readonly\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/,
  }),
]);

const PYTHON_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "class",
    detail: "class",
    pattern: /^\s*class\s+([A-Za-z_][\w]*)/,
  }),
  Object.freeze({
    kind: "function",
    detail: "function",
    pattern: /^\s*(?:async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/,
  }),
]);

const RUST_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "function",
    detail: "function",
    pattern: /^\s*(?:pub\s+)?fn\s+([A-Za-z_][\w]*)\s*\(/,
  }),
  Object.freeze({
    kind: "class",
    detail: "struct",
    pattern: /^\s*(?:pub\s+)?struct\s+([A-Za-z_][\w]*)/,
  }),
  Object.freeze({
    kind: "enum",
    detail: "enum",
    pattern: /^\s*(?:pub\s+)?enum\s+([A-Za-z_][\w]*)/,
  }),
  Object.freeze({
    kind: "module",
    detail: "impl",
    pattern: /^\s*impl(?:\s*<[^>]+>)?\s+([A-Za-z_][\w]*)/,
  }),
]);

const GO_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "function",
    detail: "function",
    pattern: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)\s*\(/,
  }),
  Object.freeze({
    kind: "type",
    detail: "type",
    pattern: /^\s*type\s+([A-Za-z_][\w]*)\s+(?:struct|interface|func|map|\w+)/,
  }),
]);

const CSS_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "selector",
    detail: "selector",
    pattern: /^\s*([.#]?[A-Za-z][\w-]*)[^{};]*\{\s*$/,
  }),
]);

const JSON_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "property",
    detail: "top-level property",
    maxIndent: 2,
    pattern: /^\s*"([^"]+)"\s*:/,
  }),
]);

const MARKDOWN_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "heading",
    detail: "heading",
    nameIndex: 2,
    depthFromHeading: true,
    pattern: /^(#{1,6})\s+(.+)$/,
  }),
]);

const HTML_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "element",
    detail: "heading",
    pattern: /^\s*<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i,
  }),
  Object.freeze({
    kind: "element",
    detail: "section",
    pattern: /^\s*<(?:section|article|main|nav|aside|header|footer)\b[^>]*(?:id|class)=["']([^"']+)["']/i,
  }),
]);

const SQL_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "query",
    detail: "cte",
    pattern: /^\s*(?:WITH\s+)?([A-Za-z_][\w]*)\s+AS\s*\(/i,
  }),
  Object.freeze({
    kind: "query",
    detail: "statement",
    pattern: /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i,
  }),
]);

const YAML_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "property",
    detail: "top-level key",
    maxIndent: 0,
    pattern: /^([A-Za-z0-9_.-]+)\s*:/,
  }),
]);

const SHELL_SYMBOL_PATTERNS = Object.freeze([
  Object.freeze({
    kind: "function",
    detail: "function",
    pattern: /^\s*(?:function\s+)?([A-Za-z_][\w-]*)\s*\(\)\s*\{/,
  }),
]);

const SYMBOL_PATTERNS_BY_LANGUAGE = Object.freeze({
  [LANGUAGE_IDS.JAVASCRIPT]: JAVASCRIPT_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.TYPESCRIPT]: JAVASCRIPT_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.PYTHON]: PYTHON_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.RUST]: RUST_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.GO]: GO_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.CSS]: CSS_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.SCSS]: CSS_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.LESS]: CSS_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.JSON]: JSON_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.JSONC]: JSON_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.MARKDOWN]: MARKDOWN_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.MDX]: MARKDOWN_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.HTML]: HTML_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.VUE]: HTML_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.SVELTE]: HTML_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.ASTRO]: HTML_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.SQL]: SQL_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.YAML]: YAML_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.TOML]: YAML_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.SHELL]: SHELL_SYMBOL_PATTERNS,
  [LANGUAGE_IDS.POWERSHELL]: SHELL_SYMBOL_PATTERNS,
});

function getLineIndent(line) {
  return String(line || "")
    .match(/^\s*/)[0]
    .replace(/\t/g, "  ").length;
}

function normalizeSymbolName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[({\[].*$/, "")
    .trim();
}

function getBraceDelta(line) {
  return [...String(line || "")].reduce((delta, character) => {
    if (character === "{") return delta + 1;
    if (character === "}") return delta - 1;
    return delta;
  }, 0);
}

function getBraceScopeEndLine(lines, startIndex) {
  const startLine = String(lines[startIndex] || "");
  const startDelta = getBraceDelta(startLine);
  if (startLine.includes("{") && startDelta <= 0) return startIndex + 1;

  let depth = 0;
  let opened = false;
  for (let index = startIndex; index < lines.length; index += 1) {
    const delta = getBraceDelta(lines[index]);
    if (delta > 0) opened = true;
    depth += delta;
    if (opened && depth <= 0) return index + 1;
  }
  return null;
}

function getSymbolEndLine(symbols, index, totalLines) {
  const symbol = symbols[index];
  if (Number.isFinite(Number(symbol.scopeEndLine))) {
    return Math.max(symbol.line, Math.min(totalLines, Number(symbol.scopeEndLine)));
  }
  for (let nextIndex = index + 1; nextIndex < symbols.length; nextIndex += 1) {
    const next = symbols[nextIndex];
    if (next.depth <= symbol.depth) return Math.max(symbol.line, next.line - 1);
  }
  return Math.max(symbol.line, totalLines);
}

function createDocumentSymbol(line, lineIndex, descriptor, match) {
  const name = normalizeSymbolName(match[descriptor.nameIndex || 1]);
  if (!name || RESERVED_SYMBOL_NAMES.has(name)) return null;
  const indent = getLineIndent(line);
  if (Number.isFinite(descriptor.maxIndent) && indent > descriptor.maxIndent) {
    return null;
  }
  const firstColumn = Math.max(1, line.search(/\S/) + 1);
  const depth = descriptor.depthFromHeading
    ? Math.max(0, String(match[1] || "").length - 1)
    : Math.floor(indent / 2);

  return {
    id: `${lineIndex + 1}:${firstColumn}:${descriptor.kind}:${name}`,
    name,
    kind: descriptor.kind,
    detail: descriptor.detail,
    line: lineIndex + 1,
    column: firstColumn,
    depth,
  };
}

export function extractDocumentSymbols(source, languageId, options = {}) {
  const text = String(source || "");
  if (!text.trim()) return [];
  const normalizedLanguageId = normalizeLanguageId(languageId, LANGUAGE_IDS.PLAINTEXT);
  const patterns = SYMBOL_PATTERNS_BY_LANGUAGE[normalizedLanguageId] || JAVASCRIPT_SYMBOL_PATTERNS;
  const maxSymbols = Math.max(
    1,
    Math.min(500, Math.round(Number(options.maxSymbols || 160))),
  );
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const symbols = [];

  for (let index = 0; index < lines.length && symbols.length < maxSymbols; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    for (const descriptor of patterns) {
      const match = descriptor.pattern.exec(line);
      if (!match) continue;
      const symbol = createDocumentSymbol(line, index, descriptor, match);
      if (symbol) {
        symbols.push({
          ...symbol,
          scopeEndLine: getBraceScopeEndLine(lines, index),
        });
      }
      break;
    }
  }

  return symbols.map((symbol, index) =>
    Object.freeze({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      detail: symbol.detail,
      line: symbol.line,
      column: symbol.column,
      depth: symbol.depth,
      endLine: getSymbolEndLine(symbols, index, lines.length),
    }),
  );
}

export function getActiveDocumentSymbol(symbols, lineNumber) {
  const line = Math.max(1, Math.round(Number(lineNumber || 1)));
  let candidate = null;
  let nearestBefore = null;

  (Array.isArray(symbols) ? symbols : []).forEach((symbol) => {
    if (!symbol || !Number.isFinite(Number(symbol.line))) return;
    if (symbol.line <= line) nearestBefore = symbol;
    if (symbol.line > line || Number(symbol.endLine || symbol.line) < line) return;
    if (
      !candidate ||
      symbol.line > candidate.line ||
      (symbol.line === candidate.line && symbol.depth >= candidate.depth)
    ) {
      candidate = symbol;
    }
  });

  return candidate || nearestBefore || null;
}

export function createEditorScopeInfo(symbols, lineNumber, options = {}) {
  const safeSymbols = Array.isArray(symbols) ? symbols.filter(Boolean) : [];
  const line = Math.max(1, Math.round(Number(lineNumber || 1)));
  const lineCount = Math.max(1, Math.round(Number(options.lineCount || line)));
  const activeSymbol = getActiveDocumentSymbol(safeSymbols, line);
  const containingSymbols = safeSymbols
    .filter((symbol) => {
      const startLine = Number(symbol.line || 0);
      const endLine = Number(symbol.endLine || startLine);
      return startLine <= line && line <= Math.max(startLine, endLine);
    })
    .sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.line - b.line;
    });
  const pathSymbols =
    containingSymbols.length > 0
      ? containingSymbols
      : activeSymbol
        ? [activeSymbol]
        : [];
  const primarySymbol = containingSymbols[containingSymbols.length - 1] || activeSymbol;
  const rangeLabel = primarySymbol
    ? `L${primarySymbol.line}-${Math.max(primarySymbol.line, primarySymbol.endLine || primarySymbol.line)}`
    : `L${line}`;
  const pathLabel = pathSymbols.map((symbol) => symbol.name).join(" > ");
  const kindLabel = primarySymbol?.kind || "document";

  return Object.freeze({
    activeSymbol: primarySymbol || null,
    nearestSymbol: activeSymbol,
    inSymbolScope: containingSymbols.length > 0,
    line,
    lineCount,
    path: Object.freeze(pathSymbols.map((symbol) => symbol.name)),
    pathLabel,
    kindLabel,
    rangeLabel,
    symbolCount: safeSymbols.length,
    tooltip: pathLabel
      ? `${kindLabel} ${pathLabel} (${rangeLabel})`
      : `Document line ${line} of ${lineCount}`,
  });
}

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
    favorite: Boolean(command?.favorite),
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
    { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null, tags.atom, tags.literal], color: normalizeHex(syntax.number, text) },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.definition(tags.function(tags.variableName))], color: normalizeHex(syntax.function, text) },
    { tag: [tags.variableName, tags.definition(tags.variableName), tags.self], color: normalizeHex(syntax.variable, text) },
    { tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.typeName)], color: normalizeHex(syntax.type, text) },
    { tag: [tags.operator, tags.operatorKeyword, tags.compareOperator, tags.logicOperator, tags.arithmeticOperator, tags.derefOperator], color: normalizeHex(syntax.operator, text) },
    { tag: [tags.propertyName, tags.attributeName], color: normalizeHex(syntax.function, text) },
    { tag: tags.labelName, color: normalizeHex(syntax.type, text) },
    { tag: [tags.punctuation, tags.separator, tags.brace, tags.squareBracket, tags.angleBracket, tags.paren], color: normalizeHex(syntax.operator, muted) },
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
    const rawLineNumber =
      position?.lineNumber === undefined
        ? Number(position?.line ?? 0) + 1
        : Number(position.lineNumber);
    const lineNumber = Math.max(
      1,
      Math.min(
        doc.lines,
        Number.isFinite(rawLineNumber) ? Math.round(rawLineNumber) : 1,
      ),
    );
    const line = doc.line(lineNumber);
    const rawCharacter =
      position?.column === undefined
        ? Number(position?.character ?? 0)
        : Number(position.column) - 1;
    const character = Math.max(
      0,
      Number.isFinite(rawCharacter) ? Math.round(rawCharacter) : 0,
    );
    return Math.max(line.from, Math.min(line.to, line.from + character));
  };
  const from = resolvePos(range.start);
  const to = range.end ? resolvePos(range.end) : from;
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}

export function lspTextEditsToCodeMirrorChanges(doc, edits) {
  if (!doc || !Array.isArray(edits)) return [];
  const changes = edits
    .map((edit) => {
      const range = lspRangeToCodeMirrorRange(doc, edit?.range);
      if (!range) return null;
      return {
        from: Math.max(0, Math.min(doc.length, range.from)),
        to: Math.max(0, Math.min(doc.length, range.to)),
        insert: String(edit?.newText ?? ""),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.from - right.from || left.to - right.to);

  for (let index = 1; index < changes.length; index += 1) {
    if (changes[index].from < changes[index - 1].to) return [];
  }

  return changes;
}

function getWorkspaceEditUri(entry) {
  return entry?.textDocument?.uri || entry?.uri || "";
}

export function lspWorkspaceEditToCodeMirrorChanges(doc, workspaceEdit, documentUri) {
  const batches = [];
  let externalChangeCount = 0;

  if (workspaceEdit?.changes && typeof workspaceEdit.changes === "object") {
    for (const [uri, edits] of Object.entries(workspaceEdit.changes)) {
      if (!Array.isArray(edits)) continue;
      if (uri === documentUri) {
        batches.push(edits);
      } else {
        externalChangeCount += edits.length;
      }
    }
  }

  if (Array.isArray(workspaceEdit?.documentChanges)) {
    for (const entry of workspaceEdit.documentChanges) {
      const edits = Array.isArray(entry?.edits) ? entry.edits : [];
      if (!edits.length) {
        externalChangeCount += 1;
        continue;
      }
      if (getWorkspaceEditUri(entry) === documentUri) {
        batches.push(edits);
      } else {
        externalChangeCount += edits.length;
      }
    }
  }

  const changes = lspTextEditsToCodeMirrorChanges(doc, batches.flat());
  return {
    changes,
    appliedChangeCount: changes.length,
    externalChangeCount,
    hasExternalChanges: externalChangeCount > 0,
    hasChanges: changes.length > 0 || externalChangeCount > 0,
  };
}

export function getPrimaryLspLocation(locations, documentUri = "") {
  const items = (Array.isArray(locations) ? locations : [locations]).filter(Boolean);
  if (!items.length) return null;
  const selected =
    items.find((location) => (location.targetUri || location.uri || "") === documentUri) ||
    items[0];
  const uri = selected.targetUri || selected.uri || documentUri;
  const range = selected.targetSelectionRange || selected.targetRange || selected.range || null;
  return {
    uri,
    range,
    external: Boolean(documentUri && uri && uri !== documentUri),
    raw: selected,
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

function readDiagnosticSeverity(diagnostic) {
  const severity = diagnostic?.severity;
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  if (severity === "info" || severity === "information") return "info";
  if (severity === "hint") return "hint";

  const looksLikeProblem =
    diagnostic?.startLineNumber !== undefined ||
    diagnostic?.startColumn !== undefined ||
    diagnostic?.resource !== undefined;
  if (!looksLikeProblem) {
    if (severity === 1) return "error";
    if (severity === 2) return "warning";
    if (severity === 3) return "info";
    if (severity === 4) return "hint";
  }

  if (severity === 8) return "error";
  if (severity === 4) return "warning";
  if (severity === 2) return "info";
  if (severity === 1) return "hint";

  const problemSeverity = lspSeverityToProblemSeverity(severity);
  if (problemSeverity === 8) return "error";
  if (problemSeverity === 4) return "warning";
  if (problemSeverity === 2) return "info";
  return "hint";
}

function formatDiagnosticStatusText(summary) {
  if (!summary.enabled) return "Diagnostics off";
  if (summary.total === 0) return "0 Problems";
  const parts = [
    summary.errorCount ? `${summary.errorCount} Error${summary.errorCount === 1 ? "" : "s"}` : "",
    summary.warningCount ? `${summary.warningCount} Warning${summary.warningCount === 1 ? "" : "s"}` : "",
    summary.infoCount + summary.hintCount
      ? `${summary.infoCount + summary.hintCount} Info`
      : "",
  ].filter(Boolean);
  return parts.join(" / ") || `${summary.total} Problems`;
}

export function summarizeEditorDiagnostics(diagnostics, options = {}) {
  const enabled = options.enabled !== false;
  const items = Array.isArray(diagnostics) ? diagnostics : [];
  const counts = {
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    hintCount: 0,
  };

  items.forEach((diagnostic) => {
    const severity = readDiagnosticSeverity(diagnostic);
    if (severity === "error") counts.errorCount += 1;
    else if (severity === "warning") counts.warningCount += 1;
    else if (severity === "info") counts.infoCount += 1;
    else counts.hintCount += 1;
  });

  const total =
    counts.errorCount + counts.warningCount + counts.infoCount + counts.hintCount;
  const summary = {
    enabled,
    total,
    ...counts,
    tone: !enabled
      ? "text-gray-600"
      : counts.errorCount
        ? "text-red-400"
        : counts.warningCount
          ? "text-amber-400"
          : total
            ? "text-sky-300"
            : "text-gray-500",
  };
  return {
    ...summary,
    text: formatDiagnosticStatusText(summary),
    title: enabled
      ? `${total} diagnostics: ${counts.errorCount} errors, ${counts.warningCount} warnings, ${counts.infoCount} info, ${counts.hintCount} hints`
      : "Diagnostic decorations are disabled",
  };
}

function coerceDiagnosticSummary(diagnostics, enabled) {
  if (
    diagnostics &&
    typeof diagnostics === "object" &&
    !Array.isArray(diagnostics) &&
    Number.isFinite(Number(diagnostics.total))
  ) {
    const summary = {
      enabled,
      total: Math.max(0, Number(diagnostics.total)),
      errorCount: Math.max(0, Number(diagnostics.errorCount || 0)),
      warningCount: Math.max(0, Number(diagnostics.warningCount || 0)),
      infoCount: Math.max(0, Number(diagnostics.infoCount || 0)),
      hintCount: Math.max(0, Number(diagnostics.hintCount || 0)),
      tone: enabled ? diagnostics.tone || "text-gray-500" : "text-gray-600",
    };
    return {
      ...summary,
      text:
        diagnostics.enabled === enabled && diagnostics.text
          ? diagnostics.text
          : formatDiagnosticStatusText(summary),
      title:
        diagnostics.enabled === enabled && diagnostics.title
          ? diagnostics.title
          : formatDiagnosticStatusText(summary),
    };
  }
  return summarizeEditorDiagnostics(diagnostics, { enabled });
}

function normalizeEditorLspState(state) {
  const normalized = String(state || "idle").trim().toLowerCase();
  if (["available", "ready", "open", "connected"].includes(normalized)) return "running";
  if (["booting", "loading", "pending"].includes(normalized)) return "starting";
  if (["failed", "error", "offline"].includes(normalized)) return "unavailable";
  if (["off", "disabled"].includes(normalized)) return "disabled";
  if (["unsupported"].includes(normalized)) return "unsupported";
  if (
    ["running", "starting", "idle", "missing", "unavailable", "disabled"].includes(
      normalized,
    )
  ) {
    return normalized;
  }
  return "idle";
}

function getEditorLspTone(state) {
  if (state === "running") return "text-sky-300";
  if (state === "starting") return "text-amber-400";
  if (state === "missing") return "text-amber-300";
  if (state === "unavailable") return "text-red-400";
  return "text-gray-600";
}

function getEditorLspText(state) {
  if (state === "running") return "LSP ready";
  if (state === "starting") return "LSP starting";
  if (state === "missing") return "LSP missing";
  if (state === "unavailable") return "LSP fallback";
  if (state === "disabled") return "LSP off";
  if (state === "unsupported") return "No LSP";
  return "LSP idle";
}

export function createEditorStatusModel(options = {}) {
  const languageId = normalizeLanguageId(options.languageId, LANGUAGE_IDS.PLAINTEXT);
  const languageLabel = options.languageLabel || getLanguageDisplayName(languageId);
  const lspStatus = options.lspStatus || {};
  const lspEnabled = options.lspEnabled !== false;
  const canUseLsp = Boolean(options.canUseLsp);
  const hasWorkspace =
    options.hasWorkspace === undefined ? canUseLsp : Boolean(options.hasWorkspace);
  const hasLspBridge =
    options.hasLspBridge === undefined ? canUseLsp : Boolean(options.hasLspBridge);
  const lspReadyLanguage =
    options.lspReadyLanguage === undefined
      ? canUseLsp
      : Boolean(options.lspReadyLanguage);
  const diagnosticsEnabled = options.diagnosticsEnabled !== false;
  const diagnostics = coerceDiagnosticSummary(options.diagnostics, diagnosticsEnabled);

  let state = normalizeEditorLspState(lspStatus.state);
  let message = String(lspStatus.message || "").trim();

  if (!lspEnabled) {
    state = "disabled";
    message ||= "Language server disabled in settings.";
  } else if (options.isLargeFile) {
    state = "disabled";
    message ||= "Large file mode skips LSP features.";
  } else if (!lspReadyLanguage) {
    state = "unsupported";
    message ||= `${languageLabel} has no configured language server.`;
  } else if (!hasWorkspace) {
    state = "idle";
    message ||= "Open a workspace to start language services.";
  } else if (!hasLspBridge) {
    state = "unavailable";
    message ||= "Desktop LSP bridge is not available.";
  } else if (!canUseLsp && state === "idle") {
    message ||= "Language services are waiting for an editor document.";
  }

  const lspLabel = lspStatus.label || languageLabel || "Language Server";
  const lspText = lspStatus.shortText || lspStatus.statusText || getEditorLspText(state);
  return {
    language: {
      id: languageId,
      label: languageLabel,
      title: `${languageLabel} (${languageId})`,
    },
    engine: {
      label: options.editorFallbackReason ? "Text fallback" : "CodeMirror 6",
      title: options.editorFallbackReason || "CodeMirror 6 editor",
      tone: options.editorFallbackReason ? "text-amber-400" : "text-gray-500",
    },
    lsp: {
      state,
      label: lspLabel,
      text: lspText,
      message,
      tone: getEditorLspTone(state),
      title: lspStatus.title || [lspLabel, lspText, message].filter(Boolean).join(" - "),
      ready: state === "running",
    },
    diagnostics,
  };
}

function readPositiveInteger(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.round(numeric));
}

export function createEditorLargeFilePolicy(options = {}) {
  const charCount = readPositiveInteger(options.charCount ?? options.length, 0);
  const lineCount = readPositiveInteger(options.lineCount, 1);
  const charThreshold = Math.max(
    1,
    readPositiveInteger(options.charThreshold, LARGE_FILE_CHAR_THRESHOLD_DEFAULT),
  );
  const hugeCharThreshold = Math.max(
    charThreshold + 1,
    readPositiveInteger(options.hugeCharThreshold, HUGE_FILE_CHAR_THRESHOLD_DEFAULT),
  );
  const lineThreshold = Math.max(
    1,
    readPositiveInteger(options.lineThreshold, LARGE_FILE_LINE_THRESHOLD_DEFAULT),
  );
  const hugeLineThreshold = Math.max(
    lineThreshold + 1,
    readPositiveInteger(options.hugeLineThreshold, HUGE_FILE_LINE_THRESHOLD_DEFAULT),
  );
  const large = charCount > charThreshold || lineCount > lineThreshold;
  const huge = charCount > hugeCharThreshold || lineCount > hugeLineThreshold;
  const mode = huge ? "plain" : large ? "guarded" : "normal";
  const reason = huge
    ? "Huge file mode keeps expensive editor services off."
    : large
      ? "Large file mode keeps LSP, autocomplete and folding off."
      : "";

  return Object.freeze({
    mode,
    large,
    huge,
    charCount,
    lineCount,
    charThreshold,
    lineThreshold,
    reason,
    statusLabel: large ? (huge ? "HUGE" : "LARGE") : "",
    lspEnabled: !large,
    autocompleteEnabled: !large,
    hoverEnabled: !large,
    foldGutterEnabled: !large,
    syntaxHighlightingEnabled: !huge,
    activeLineEnabled: !huge,
    selectionMatchMax:
      options.selectionMatchMax !== undefined
        ? readPositiveInteger(options.selectionMatchMax, 160)
        : huge
          ? 0
          : large
            ? 24
            : options.lowPowerMode
              ? 80
              : 160,
    dataState: mode,
    title: [mode === "normal" ? "Normal editor mode" : reason, `${lineCount} lines`, `${charCount} chars`]
      .filter(Boolean)
      .join(" | "),
  });
}

function readDocLineColumn(doc, position) {
  const pos = Math.max(0, readPositiveInteger(position, 0));
  if (doc?.lineAt) {
    const line = doc.lineAt(Math.min(Number(doc.length || 0), pos));
    return {
      line: Math.max(1, Number(line?.number || 1)),
      col: Math.max(1, pos - Number(line?.from || 0) + 1),
    };
  }
  return { line: 1, col: pos + 1 };
}

function createSelectionRangeLabel(start, end) {
  if (!start || !end) return "";
  if (start.line === end.line) {
    return `L${start.line}:C${start.col}-C${end.col}`;
  }
  return `L${start.line}:C${start.col}-L${end.line}:C${end.col}`;
}

function normalizeSelectionRange(range) {
  const anchor = readPositiveInteger(range?.anchor ?? range?.from ?? range?.head, 0);
  const head = readPositiveInteger(range?.head ?? range?.to ?? anchor, anchor);
  const from = Math.min(anchor, head);
  const to = Math.max(anchor, head);
  return { anchor, head, from, to, empty: from === to };
}

export function createEditorSelectionSnapshot(doc, selection = null) {
  const rawRanges = Array.isArray(selection?.ranges)
    ? selection.ranges
    : selection?.main
      ? [selection.main]
      : [];
  const ranges = (rawRanges.length ? rawRanges : [{ anchor: 0, head: 0 }]).map(
    normalizeSelectionRange,
  );
  const main = normalizeSelectionRange(selection?.main || ranges[0]);
  const selectedCharacters = ranges.reduce(
    (total, range) => total + Math.max(0, range.to - range.from),
    0,
  );
  const cursor = readDocLineColumn(doc, main.head);
  const start = readDocLineColumn(doc, main.from);
  const end = readDocLineColumn(doc, main.to);
  const empty = selectedCharacters === 0;
  const rangeCount = ranges.length;
  const rangeKey = ranges.map((range) => `${range.anchor}:${range.head}`).join("|");
  const statusText = empty
    ? ""
    : rangeCount > 1
      ? `${rangeCount} selections, ${selectedCharacters} chars`
      : `${selectedCharacters} char${selectedCharacters === 1 ? "" : "s"} selected`;

  return Object.freeze({
    key: `${rangeKey}:${selectedCharacters}`,
    empty,
    rangeCount,
    selectedCharacters,
    cursor,
    anchor: main.anchor,
    head: main.head,
    from: main.from,
    to: main.to,
    range: {
      startLineNumber: start.line,
      startColumn: start.col,
      endLineNumber: end.line,
      endColumn: end.col,
    },
    rangeLabel: empty ? "" : createSelectionRangeLabel(start, end),
    statusText,
    title: empty
      ? `Ln ${cursor.line}, Col ${cursor.col}`
      : `${statusText} | ${createSelectionRangeLabel(start, end)}`,
  });
}

export function createEditorTextSelectionSnapshot(text = "", selectionStart = 0, selectionEnd = selectionStart) {
  const value = String(text || "");
  const safeStart = Math.max(0, Math.min(value.length, readPositiveInteger(selectionStart, 0)));
  const safeEnd = Math.max(0, Math.min(value.length, readPositiveInteger(selectionEnd, safeStart)));
  const doc = {
    length: value.length,
    lineAt(position) {
      const pos = Math.max(0, Math.min(value.length, readPositiveInteger(position, 0)));
      const before = value.slice(0, pos);
      const lineNumber = before.split(/\r\n|\r|\n/).length;
      const lastBreak = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("\r"));
      return {
        number: lineNumber,
        from: lastBreak >= 0 ? lastBreak + 1 : 0,
      };
    },
  };
  return createEditorSelectionSnapshot(doc, {
    main: { anchor: safeStart, head: safeEnd },
    ranges: [{ anchor: safeStart, head: safeEnd }],
  });
}

export const EDITOR_LSP_FEATURE_IDS = Object.freeze({
  goToDefinition: "go-to-definition",
  renameSymbol: "rename-symbol",
  formatDocument: "format-document",
  codeActions: "code-actions",
});

const EDITOR_LSP_FEATURE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.goToDefinition,
    label: "Go to Definition",
    featureName: "definition",
    commandId: "editor.goToDefinition",
    lspMethod: "getDefinition",
    resultKind: "locations",
    shortcut: "F12",
    requiresPosition: true,
  }),
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.renameSymbol,
    label: "Rename Symbol",
    featureName: "rename",
    commandId: "editor.renameSymbol",
    lspMethod: "renameSymbol",
    resultKind: "workspace-edit",
    shortcut: "F2",
    requiresPosition: true,
    requiresNewName: true,
  }),
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.formatDocument,
    label: "Format Document",
    featureName: "formatting",
    commandId: "editor.formatDocument",
    lspMethod: "formatDocument",
    resultKind: "text-edits",
    shortcut: "Shift+Alt+F",
  }),
  Object.freeze({
    id: EDITOR_LSP_FEATURE_IDS.codeActions,
    label: "Code Actions",
    featureName: "codeActions",
    commandId: "editor.codeActions",
    lspMethod: "getCodeActions",
    resultKind: "code-actions",
    shortcut: "Mod+.",
    requiresRange: true,
  }),
]);

function getEditorLspFeatureDefinition(featureId) {
  const normalized = String(featureId || "").trim();
  return EDITOR_LSP_FEATURE_DEFINITIONS.find((feature) => feature.id === normalized) || null;
}

export function createEditorLspActionStatus(status = {}) {
  const featureId = String(status.featureId || "").trim();
  const state = String(status.state || "idle").trim() || "idle";
  const tone =
    status.tone ||
    (state === "failed"
      ? "text-red-400"
      : state === "applied"
        ? "text-emerald-300"
        : state === "available" || state === "external"
          ? "text-sky-300"
          : state === "unavailable"
            ? "text-amber-400"
            : "text-gray-500");
  const definition = getEditorLspFeatureDefinition(featureId);
  const featureLabel = status.label || definition?.label || "LSP action";
  const text = status.text || (state === "idle" ? "" : featureLabel);

  return Object.freeze({
    state,
    featureId,
    featureLabel,
    text,
    title: status.title || text || featureLabel,
    tone,
    dataState: `${featureId || "none"}:${state}`,
  });
}

export function normalizeEditorFeaturePosition(position) {
  if (!position || typeof position !== "object") return null;
  const rawLine = position.lineNumber ?? position.line;
  const rawColumn =
    position.column ??
    (position.character === undefined ? undefined : Number(position.character) + 1);
  const lineNumber = Math.max(1, Math.round(Number(rawLine || 0)));
  const column = Math.max(1, Math.round(Number(rawColumn || 0)));
  if (!Number.isFinite(lineNumber) || !Number.isFinite(column)) return null;
  return { lineNumber, column };
}

export function normalizeEditorFeatureRange(range) {
  if (!range || typeof range !== "object") return null;
  if (range.startLineNumber !== undefined || range.endLineNumber !== undefined) {
    const startLineNumber = Math.max(1, Math.round(Number(range.startLineNumber || 0)));
    const startColumn = Math.max(1, Math.round(Number(range.startColumn || 0)));
    const endLineNumber = Math.max(
      startLineNumber,
      Math.round(Number(range.endLineNumber || startLineNumber)),
    );
    const endColumn = Math.max(1, Math.round(Number(range.endColumn || startColumn)));
    if (
      !Number.isFinite(startLineNumber) ||
      !Number.isFinite(startColumn) ||
      !Number.isFinite(endLineNumber) ||
      !Number.isFinite(endColumn)
    ) {
      return null;
    }
    return { startLineNumber, startColumn, endLineNumber, endColumn };
  }

  const start = normalizeEditorFeaturePosition(range.start);
  const end = normalizeEditorFeaturePosition(range.end || range.start);
  if (!start || !end) return null;
  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: Math.max(start.lineNumber, end.lineNumber),
    endColumn: end.column,
  };
}

function getEditorFeatureUnavailableReason(options) {
  if (options.lspEnabled === false) return "LSP disabled";
  if (options.isLargeFile) return "Large file mode";
  if (options.lspReadyLanguage === false) return "Unsupported language";
  if (options.hasWorkspace === false) return "No workspace";
  if (options.hasLspBridge === false) return "LSP bridge unavailable";
  if (!options.canUseLsp) return "LSP unavailable";
  if (!options.documentUri && !options.hasDocument) return "No open LSP document";
  return "";
}

function resolveEditorLspFeatureSupport(options = {}) {
  const languageId = normalizeLanguageId(options.languageId, LANGUAGE_IDS.PLAINTEXT);
  const languageCapabilities = getLanguageCapabilities(languageId);
  const declaredFeatures = languageCapabilities.lsp?.features || {};
  const runtimeFeatures =
    options.serverFeatures ||
    options.lspFeatures ||
    options.features ||
    options.runtimeStatus?.features ||
    {};

  return Object.fromEntries(
    Object.keys(LSP_FEATURE_LABELS).map((key) => {
      if (runtimeFeatures && Object.prototype.hasOwnProperty.call(runtimeFeatures, key)) {
        return [key, runtimeFeatures[key] === true];
      }
      return [key, declaredFeatures[key] === true];
    }),
  );
}

export function createEditorLspFeatureContracts(options = {}) {
  const disabledReason = getEditorFeatureUnavailableReason(options);
  const support = resolveEditorLspFeatureSupport(options);
  const position = normalizeEditorFeaturePosition(options.position);
  const range = normalizeEditorFeatureRange(options.range);
  const newName = String(options.newName || "").trim();

  return EDITOR_LSP_FEATURE_DEFINITIONS.map((definition) => {
    const supported = support[definition.featureName] === true;
    const missing = [
      definition.requiresPosition && !position ? "position" : "",
      definition.requiresRange && !range ? "range" : "",
      definition.requiresNewName && !newName ? "newName" : "",
    ].filter(Boolean);
    const featureReason = supported ? "" : `${definition.label} unsupported`;
    const effectiveDisabledReason = disabledReason || featureReason;
    const enabled = !effectiveDisabledReason;
    return Object.freeze({
      ...definition,
      languageId: normalizeLanguageId(options.languageId, LANGUAGE_IDS.PLAINTEXT),
      supported,
      enabled,
      ready: enabled && missing.length === 0,
      disabledReason: effectiveDisabledReason,
      pendingReason: missing.length ? `Missing ${missing.join(", ")}` : "",
      missing,
      ui: Object.freeze({
        label: definition.label,
        shortcut: definition.shortcut || "",
        dataState: `${definition.id}:${enabled ? (missing.length ? "pending" : "ready") : "disabled"}`,
        title: [
          definition.label,
          definition.shortcut ? `Shortcut ${definition.shortcut}` : "",
          effectiveDisabledReason || (missing.length ? `Missing ${missing.join(", ")}` : "Ready"),
        ]
          .filter(Boolean)
          .join(" | "),
      }),
    });
  });
}

export function getEditorLspFeatureContract(featureId, options = {}) {
  const definition = getEditorLspFeatureDefinition(featureId);
  if (!definition) return null;
  return createEditorLspFeatureContracts(options).find((feature) => feature.id === definition.id) || null;
}

export function createEditorLspFeatureRequest(featureId, payload = {}) {
  const contract = getEditorLspFeatureContract(featureId, payload);
  if (!contract) {
    return {
      featureId: String(featureId || ""),
      ready: false,
      disabledReason: "Unknown editor feature",
      missing: ["feature"],
    };
  }

  const position = normalizeEditorFeaturePosition(payload.position);
  const range = normalizeEditorFeatureRange(payload.range);
  const newName = String(payload.newName || "").trim();
  const missing = [
    contract.requiresPosition && !position ? "position" : "",
    contract.requiresRange && !range ? "range" : "",
    contract.requiresNewName && !newName ? "newName" : "",
  ].filter(Boolean);

  return Object.freeze({
    featureId: contract.id,
    label: contract.label,
    commandId: contract.commandId,
    lspMethod: contract.lspMethod,
    resultKind: contract.resultKind,
    featureName: contract.featureName,
    shortcut: contract.shortcut || "",
    supported: contract.supported,
    documentUri: payload.documentUri || "",
    languageId: normalizeLanguageId(payload.languageId, LANGUAGE_IDS.PLAINTEXT),
    position,
    range,
    diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics.slice(0, 50) : [],
    newName,
    options: payload.options && typeof payload.options === "object" ? { ...payload.options } : {},
    ready: contract.enabled && missing.length === 0,
    disabledReason: contract.disabledReason,
    pendingReason: missing.length ? `Missing ${missing.join(", ")}` : "",
    missing,
    ui: contract.ui,
  });
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

function resolveCompletionLimit(options) {
  if (typeof options === "number") {
    return Math.max(
      COMPLETION_LIMIT_MIN,
      Math.min(COMPLETION_LIMIT_MAX, Math.round(options)),
    );
  }

  const fallback = options?.lowPowerMode ? 72 : 120;
  const value = Number(options?.maxItems ?? fallback);
  const resolved = Number.isFinite(value) ? value : fallback;
  return Math.max(
    COMPLETION_LIMIT_MIN,
    Math.min(COMPLETION_LIMIT_MAX, Math.round(resolved)),
  );
}

function resolveLspCompletionScanLimit(itemCount, maxItems) {
  const scanned = Math.max(maxItems, maxItems * COMPLETION_LSP_SCAN_FACTOR);
  return Math.min(itemCount, COMPLETION_LSP_SCAN_MAX, scanned);
}

function normalizeCompletionLabel(item) {
  if (typeof item?.label === "string") return item.label;
  if (item?.label?.label) return item.label.label;
  return String(item?.insertText || item?.textEdit?.newText || "completion");
}

function normalizeCompletionSourceLanguage(languageId) {
  return normalizeLanguageId(languageId, LANGUAGE_IDS.PLAINTEXT);
}

function getCompletionMatchPattern(languageId) {
  if (
    languageId === LANGUAGE_IDS.CSS ||
    languageId === LANGUAGE_IDS.SCSS ||
    languageId === LANGUAGE_IDS.LESS
  ) {
    return CSS_COMPLETION_MATCH_PATTERN;
  }
  if (languageId === LANGUAGE_IDS.MARKDOWN || languageId === LANGUAGE_IDS.MDX) {
    return MARKDOWN_COMPLETION_MATCH_PATTERN;
  }
  return COMPLETION_MATCH_PATTERN;
}

function getCompletionMatch(context, languageId) {
  return context.matchBefore(getCompletionMatchPattern(languageId));
}

function resolveCompletionMinPrefixLength(options) {
  const numeric = Number(options?.minPrefixLength);
  if (!Number.isFinite(numeric)) return LOCAL_COMPLETION_MIN_PREFIX_FALLBACK;
  return Math.max(1, Math.min(5, Math.round(numeric)));
}

function hasLocalCompletionTrigger(context, languageId, match, options = {}) {
  if (context.explicit) return true;
  const typed = match?.text || "";
  const minLength = Math.max(
    LOCAL_COMPLETION_IMPLICIT_MIN_LENGTH,
    resolveCompletionMinPrefixLength(options),
  );
  if (typed.length >= minLength && /[\w$-]/.test(typed)) {
    return true;
  }

  const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
  if (
    (languageId === LANGUAGE_IDS.MARKDOWN || languageId === LANGUAGE_IDS.MDX) &&
    /[#>`*]$/.test(before)
  ) {
    return true;
  }
  if (
    (languageId === LANGUAGE_IDS.CSS ||
      languageId === LANGUAGE_IDS.SCSS ||
      languageId === LANGUAGE_IDS.LESS) &&
    /[-:#.]$/.test(before)
  ) {
    return true;
  }
  return false;
}

function getLanguageCompletionItems(languageId) {
  return LANGUAGE_COMPLETION_MAP[languageId] || [];
}

function toSnippetCompletion(item) {
  const completion = {
    label: item.label,
    type: item.type || "text",
    detail: item.detail,
    info: item.info,
    boost: item.boost,
    section: item.section,
    completionOrigin: item.completionOrigin || item.section?.origin || COMPLETION_ORIGINS.language,
  };
  return item.template ? snippetCompletion(item.template, completion) : completion;
}

const EMPTY_COMPLETION_RANK_CONTEXT = Object.freeze({
  prefix: "",
  normalizedPrefix: "",
  explicit: false,
});

function createCompletionRankContext(context, languageId) {
  if (context?.normalizedPrefix !== undefined) {
    return {
      prefix: String(context.prefix || ""),
      normalizedPrefix: String(context.normalizedPrefix || "").toLowerCase(),
      explicit: Boolean(context.explicit),
    };
  }

  if (!context?.matchBefore) return EMPTY_COMPLETION_RANK_CONTEXT;
  const prefix = getCompletionPrefix(context, languageId);
  return {
    prefix,
    normalizedPrefix: prefix.toLowerCase(),
    explicit: Boolean(context.explicit),
  };
}

function getCompletionOrigin(option) {
  return option?.completionOrigin || option?.section?.origin || COMPLETION_ORIGINS.language;
}

function canonicalCompletionLabel(label) {
  return String(label || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\(\)$/, "")
    .replace(/[;:]$/, "")
    .toLowerCase();
}

function getCompletionFilterText(option) {
  const label = typeof option?.label === "object" ? option.label?.label : option?.label;
  return String(option?.filterText || label || "")
    .trim()
    .toLowerCase();
}

function hasCamelCaseCompletionMatch(label, prefix) {
  if (!prefix) return false;
  const acronym = String(label || "")
    .replace(/^[^A-Za-z_$]+/, "")
    .split(/[^A-Za-z0-9_$]+/)
    .flatMap((part) => {
      const capitals = part.match(/[A-Z]/g);
      return capitals?.length ? capitals : part.slice(0, 1);
    })
    .join("")
    .toLowerCase();
  return acronym.startsWith(prefix);
}

function hasWordBoundaryCompletionMatch(label, prefix) {
  if (!prefix) return false;
  return String(label || "")
    .split(/(?=[A-Z])|[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .some((part) => part.toLowerCase().startsWith(prefix));
}

function getCompletionMatchQuality(option, rankContext = EMPTY_COMPLETION_RANK_CONTEXT) {
  const normalizedPrefix = String(rankContext.normalizedPrefix || "");
  if (!normalizedPrefix) return 0;
  const label = typeof option?.label === "object" ? option.label?.label : option?.label;
  const normalizedLabel = canonicalCompletionLabel(label);
  const filterText = getCompletionFilterText(option);
  const candidates = [normalizedLabel, filterText].filter(Boolean);
  if (!candidates.length) return -1;
  if (candidates.some((candidate) => candidate === normalizedPrefix)) return 4;
  if (candidates.some((candidate) => candidate.startsWith(normalizedPrefix))) return 3;
  if (
    hasCamelCaseCompletionMatch(label, normalizedPrefix) ||
    hasWordBoundaryCompletionMatch(label, normalizedPrefix)
  ) {
    return 2;
  }
  if (candidates.some((candidate) => candidate.includes(normalizedPrefix))) return 1;
  return -1;
}

function getCompletionMatchBonus(matchQuality) {
  if (matchQuality >= 4) return 220;
  if (matchQuality === 3) return 140;
  if (matchQuality === 2) return 90;
  if (matchQuality === 1) return 45;
  return 0;
}

function getCompletionOriginBonus(option, rankContext) {
  const origin = getCompletionOrigin(option);
  if (origin === COMPLETION_ORIGINS.lspRecommended) return 0;
  const matchQuality = getCompletionMatchQuality(option, rankContext);

  if (origin === COMPLETION_ORIGINS.local) {
    if (matchQuality >= 4) return 720;
    if (matchQuality === 3) return 650;
    if (matchQuality === 2) return 340;
    if (matchQuality === 1) return 160;
    return 0;
  }

  if (origin === COMPLETION_ORIGINS.snippet) {
    if (matchQuality >= 4) return 600;
    if (rankContext.explicit && matchQuality === 3) return 300;
    if (matchQuality === 3) return 220;
    return 0;
  }

  if (origin === COMPLETION_ORIGINS.language || origin === COMPLETION_ORIGINS.structure) {
    if (matchQuality >= 4) return 180;
    if (matchQuality === 3) return 120;
    return 0;
  }

  if (origin === COMPLETION_ORIGINS.lsp && matchQuality >= 3) return 80;
  return 0;
}

function getCompletionMissPenalty(option, rankContext) {
  if (!rankContext.normalizedPrefix) return 0;
  const matchQuality = getCompletionMatchQuality(option, rankContext);
  if (matchQuality >= 0) return 0;
  return getCompletionOrigin(option) === COMPLETION_ORIGINS.lsp ? 80 : 160;
}

function rankCompletionOption(option, rankContext = EMPTY_COMPLETION_RANK_CONTEXT) {
  const section = option?.section;
  const sectionRank =
    typeof section === "object" && Number.isFinite(Number(section.rank))
      ? Number(section.rank)
      : 50;
  const boost = Number.isFinite(Number(option?.boost)) ? Number(option.boost) : 0;
  const deprecatedPenalty =
    option?.deprecated === true || option?.completionTags?.includes?.(LSP_COMPLETION_DEPRECATED_TAG)
      ? 55
      : 0;
  return (
    sectionRank * 100 -
    boost -
    getCompletionMatchBonus(getCompletionMatchQuality(option, rankContext)) -
    getCompletionOriginBonus(option, rankContext) +
    getCompletionMissPenalty(option, rankContext) +
    deprecatedPenalty
  );
}

function uniqueCompletionKey(option) {
  const rawLabel = typeof option?.label === "object" ? option.label?.label : option?.label;
  return canonicalCompletionLabel(rawLabel);
}

function compareCompletionTieBreak(left, right, rankContext) {
  const originPriority = (option) => {
    const origin = getCompletionOrigin(option);
    const matchQuality = getCompletionMatchQuality(option, rankContext);
    if (origin === COMPLETION_ORIGINS.lspRecommended) return 0;
    if (origin === COMPLETION_ORIGINS.local && matchQuality >= 3) return 1;
    if (origin === COMPLETION_ORIGINS.snippet && matchQuality >= 3) return 2;
    if (origin === COMPLETION_ORIGINS.lsp) return 3;
    if (origin === COMPLETION_ORIGINS.snippet) return 4;
    if (origin === COMPLETION_ORIGINS.local) return 5;
    if (origin === COMPLETION_ORIGINS.language) return 6;
    return 7;
  };

  const priorityDelta = originPriority(left) - originPriority(right);
  if (priorityDelta !== 0) return priorityDelta;
  const sortDelta = String(left?.sortText || "").localeCompare(String(right?.sortText || ""));
  if (sortDelta !== 0) return sortDelta;
  return String(left?.label || "").localeCompare(String(right?.label || ""));
}

function mergeCompletionOptions(optionGroups, rankContext = EMPTY_COMPLETION_RANK_CONTEXT) {
  const merged = new Map();
  optionGroups.flat().filter(Boolean).forEach((option) => {
    const key = uniqueCompletionKey(option);
    if (!key) return;
    const previous = merged.get(key);
    const optionRank = rankCompletionOption(option, rankContext);
    const previousRank = previous ? rankCompletionOption(previous, rankContext) : Infinity;
    if (
      !previous ||
      optionRank < previousRank ||
      (optionRank === previousRank && compareCompletionTieBreak(option, previous, rankContext) < 0)
    ) {
      merged.set(key, option);
    }
  });

  return [...merged.values()].sort((a, b) => {
    const rankDelta = rankCompletionOption(a, rankContext) - rankCompletionOption(b, rankContext);
    if (rankDelta !== 0) return rankDelta;
    return compareCompletionTieBreak(a, b, rankContext);
  });
}

function getCompletionDocumentText(context, maxChars = LOCAL_COMPLETION_MAX_TEXT) {
  const limit = Math.max(1, Math.round(Number(maxChars || LOCAL_COMPLETION_MAX_TEXT)));
  const doc = context?.state?.doc;
  if (doc?.sliceString && Number.isFinite(Number(doc.length))) {
    return doc.sliceString(0, Math.min(Number(doc.length), limit));
  }
  if (context?.state?.sliceDoc) {
    try {
      return context.state.sliceDoc(0, limit);
    } catch {
      return "";
    }
  }
  return "";
}

function getCompletionPrefix(context, languageId) {
  const match = getCompletionMatch(context, languageId);
  return String(match?.text || "").trim();
}

function shouldOfferLocalCompletionWord(word, prefix) {
  const label = String(word || "").trim();
  const normalizedLabel = label.toLowerCase();
  const normalizedPrefix = String(prefix || "").toLowerCase();
  if (label.length < 3 || RESERVED_SYMBOL_NAMES.has(normalizedLabel)) return false;
  if (normalizedPrefix && normalizedLabel === normalizedPrefix) return false;
  if (normalizedPrefix.length >= 2 && !normalizedLabel.includes(normalizedPrefix)) {
    return false;
  }
  return true;
}

function getLocalCompletionBoost(entry, prefix, index) {
  const normalizedPrefix = String(prefix || "").toLowerCase();
  const normalizedLabel = String(entry?.label || "").toLowerCase();
  const frequencyBoost = Math.min(10, Math.max(0, Number(entry?.count || 0) * 2));
  const distance = Number(entry?.distance ?? Number.POSITIVE_INFINITY);
  const distanceBoost = distance <= 120 ? 8 : distance <= 800 ? 4 : 0;
  const prefixBoost =
    normalizedPrefix && normalizedLabel === normalizedPrefix
      ? 10
      : normalizedPrefix && normalizedLabel.startsWith(normalizedPrefix)
        ? 7
        : normalizedPrefix && normalizedLabel.includes(normalizedPrefix)
          ? 3
          : 0;
  return Math.max(1, 18 - index + frequencyBoost + distanceBoost + prefixBoost);
}

function createLocalDocumentCompletions(context, languageId, options = {}) {
  const normalizedLanguageId = normalizeCompletionSourceLanguage(languageId);
  const prefix = getCompletionPrefix(context, normalizedLanguageId);
  if (!context?.explicit && prefix.length < 2) return [];

  const text = getCompletionDocumentText(
    context,
    options.maxLocalCompletionChars || LOCAL_COMPLETION_MAX_TEXT,
  );
  if (!text) return [];

  const currentPos = Number(context.pos || 0);
  const seen = new Map();
  for (const match of text.matchAll(LOCAL_COMPLETION_WORD_PATTERN)) {
    const label = match[0];
    if (!shouldOfferLocalCompletionWord(label, prefix)) continue;
    const key = label.toLowerCase();
    const previous = seen.get(key);
    const distance = Math.abs(Number(match.index || 0) - currentPos);
    if (!previous) {
      seen.set(key, {
        label,
        count: 1,
        distance,
      });
      continue;
    }
    previous.count += 1;
    previous.distance = Math.min(previous.distance, distance);
  }

  const maxItems = Math.max(
    4,
    Math.min(
      LOCAL_COMPLETION_MAX_ITEMS,
      Math.round(Number(options.maxLocalCompletionItems || LOCAL_COMPLETION_MAX_ITEMS)),
    ),
  );

  return [...seen.values()]
    .sort((a, b) => {
      const prefixDelta =
        Number(b.label.toLowerCase().startsWith(prefix.toLowerCase())) -
        Number(a.label.toLowerCase().startsWith(prefix.toLowerCase()));
      if (prefixDelta !== 0) return prefixDelta;
      if (b.count !== a.count) return b.count - a.count;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.label.localeCompare(b.label);
    })
    .slice(0, maxItems)
    .map((entry, index) => ({
      label: entry.label,
      type: "variable",
      detail: "current document",
      info: `Found ${entry.count} time${entry.count === 1 ? "" : "s"} in this file.`,
      boost: getLocalCompletionBoost(entry, prefix, index),
      sortText: `local:${String(index).padStart(3, "0")}`,
      section: LOCAL_COMPLETION_SECTION,
      completionOrigin: COMPLETION_ORIGINS.local,
    }));
}

function normalizeMarkupText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function readMarkupContent(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return normalizeMarkupText(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return normalizeMarkupText(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return "";
    seen.add(value);
    return value
      .map((item) => readMarkupContent(item, seen))
      .filter(Boolean)
      .join("\n\n");
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "";
    seen.add(value);
    if (typeof value.value === "string") {
      return normalizeMarkupText(value.value);
    }
    if ("contents" in value) {
      return readMarkupContent(value.contents, seen);
    }
    if ("documentation" in value) {
      return readMarkupContent(value.documentation, seen);
    }
  }
  return "";
}

export function readHoverText(hover) {
  return readMarkupContent(hover?.contents ?? hover);
}

const LSP_FEATURE_LABELS = Object.freeze({
  completion: "Completion",
  hover: "Hover",
  diagnostics: "Diagnostics",
  definition: "Definition",
  formatting: "Formatting",
  codeActions: "Code actions",
  rename: "Rename",
});

function normalizeLspState(value, fallback = "idle") {
  const state = String(value || "")
    .trim()
    .toLowerCase();
  if (!state) return fallback;
  if (state === "error" || state === "failed" || state === "stopped") {
    return "unavailable";
  }
  return state;
}

function getCompactLspServerLabel(label) {
  const value = String(label || "").trim();
  if (!value) return "LSP";
  if (/pyright/i.test(value)) return "Pyright";
  if (/typescript/i.test(value)) return "TS LSP";
  const firstWord = value.split(/\s+/).find(Boolean);
  return firstWord || "LSP";
}

function getLspStatusText(state, serverLabel = "LSP") {
  const label = getCompactLspServerLabel(serverLabel);
  if (state === "missing") return `${label} missing`;
  if (state === "unsupported") return "LSP unsupported";
  if (state === "disabled") return `${label} off`;
  if (state === "unavailable") return `${label} fallback`;
  if (state === "idle") return `${label} idle`;
  if (PENDING_LSP_STATES.has(state)) return `${label} starting`;
  if (ACTIVE_LSP_STATES.has(state)) return `${label} running`;
  return `${label} ${state}`;
}

function getFeatureMap(languageCapabilities, runtimeStatus = null) {
  const lspFeatures = languageCapabilities?.lsp?.features || {};
  const runtimeFeatures = runtimeStatus?.features || runtimeStatus?.serverFeatures || {};
  return Object.fromEntries(
    Object.keys(LSP_FEATURE_LABELS).map((key) => {
      if (Object.prototype.hasOwnProperty.call(runtimeFeatures, key)) {
        return [key, runtimeFeatures[key] === true];
      }
      return [key, lspFeatures[key] === true];
    }),
  );
}

function getEnabledSetting(settings, key, fallback = true) {
  return settings?.[key] === undefined ? fallback : settings[key] !== false;
}

function createLspBaseStatus({
  hasBridge,
  hasWorkspace,
  isLargeFile,
  languageCapabilities,
  lspEnabled,
  runtimeStatus,
}) {
  const server = languageCapabilities.lsp;
  const runtimeState = normalizeLspState(
    runtimeStatus?.state || runtimeStatus?.status,
    runtimeStatus ? "running" : "ready",
  );
  const runtimeMissing =
    runtimeStatus?.missing === true ||
    runtimeState === "missing" ||
    (runtimeStatus?.available === false && runtimeStatus?.canStart === false);

  if (!lspEnabled) {
    return {
      state: "disabled",
      message: "Language server support is disabled in settings.",
      canStart: false,
    };
  }
  if (!languageCapabilities.lspReady || !server.configured) {
    return {
      state: "unsupported",
      message: `No language server is configured for ${languageCapabilities.label}.`,
      canStart: false,
    };
  }
  if (isLargeFile) {
    return {
      state: "disabled",
      message: "Large file mode keeps LSP disabled for editor stability.",
      canStart: false,
    };
  }
  if (!hasWorkspace) {
    return {
      state: "idle",
      message: "Open a workspace folder to start the language server.",
      canStart: false,
    };
  }
  if (!hasBridge) {
    return {
      state: "unavailable",
      message: "Electron LSP bridge is unavailable. Local completions remain active.",
      canStart: false,
    };
  }
  if (runtimeStatus) {
    return {
      ...runtimeStatus,
      state: runtimeMissing ? "missing" : runtimeState,
      message:
        runtimeStatus.message ||
        (runtimeMissing
          ? `${server.label || languageCapabilities.label} is not available.`
          : `${server.label || languageCapabilities.label} is ${runtimeState}.`),
      canStart:
        runtimeStatus.canStart !== false &&
        !runtimeMissing &&
        !FALLBACK_LSP_STATES.has(runtimeState),
    };
  }
  return {
    state: "ready",
    message: `${server.label || languageCapabilities.label} is ready to start.`,
    canStart: true,
  };
}

export function createEditorLanguageFeatureModel(options = {}) {
  const languageCapabilities = getLanguageCapabilities(options.languageId);
  const settings = options.settings || {};
  const lspEnabled = options.lspEnabled ?? getEnabledSetting(settings, "lsp_enabled");
  const autocompleteEnabled =
    options.autocompleteEnabled ?? getEnabledSetting(settings, "autocomplete_enabled");
  const snippetsEnabled =
    autocompleteEnabled &&
    (options.snippetsEnabled ?? getEnabledSetting(settings, "autocomplete_snippets"));
  const localWordsEnabled =
    autocompleteEnabled &&
    (options.localWordsEnabled ?? getEnabledSetting(settings, "autocomplete_local_words"));
  const languageHintsEnabled =
    autocompleteEnabled &&
    (options.languageHintsEnabled ?? getEnabledSetting(settings, "autocomplete_language_hints"));
  const lspCompletionEnabled =
    autocompleteEnabled &&
    lspEnabled &&
    (options.lspCompletionEnabled ?? getEnabledSetting(settings, "autocomplete_lsp"));
  const hasWorkspace = options.hasWorkspace ?? true;
  const hasBridge = options.hasBridge ?? true;
  const isLargeFile = options.isLargeFile === true;
  const runtimeStatus = options.runtimeStatus || null;
  const features = getFeatureMap(languageCapabilities, runtimeStatus);
  const baseStatus = createLspBaseStatus({
    hasBridge,
    hasWorkspace,
    isLargeFile,
    languageCapabilities,
    lspEnabled,
    runtimeStatus,
  });
  const state = normalizeLspState(baseStatus.state);
  const active = ACTIVE_LSP_STATES.has(state);
  const pending = PENDING_LSP_STATES.has(state);
  const fallbackActive = FALLBACK_LSP_STATES.has(state) || (!active && !pending);
  const supportedFeatureNames = Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => LSP_FEATURE_LABELS[key]);
  const supportedFeatureIds = Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
  const activeFeatureIds = active ? supportedFeatureIds : [];
  const activeFeatureCount = active ? supportedFeatureNames.length : 0;
  const featureCount = supportedFeatureNames.length;
  const serverLabel = languageCapabilities.lsp.label || languageCapabilities.label;
  const envName = baseStatus.envName || languageCapabilities.lsp.envName;
  const installHint = baseStatus.installHint || languageCapabilities.lsp.installHint;
  const statusText = getLspStatusText(state, serverLabel);
  const message = baseStatus.message || "";
  const runtimeDetails = [
    envName ? `Env: ${envName}` : "",
    baseStatus.envOverride ? "Env override active" : "",
    baseStatus.path ? `PATH: ${baseStatus.path}` : "",
    baseStatus.source ? `Source: ${baseStatus.source}` : "",
    runtimeStatus?.features || runtimeStatus?.serverFeatures
      ? "Capabilities from server initialize"
      : "",
  ];
  const lspTitle = [
    `${languageCapabilities.label}: ${serverLabel}`,
    statusText,
    message,
    ...runtimeDetails,
    installHint && fallbackActive ? installHint : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const completionSources = [
    {
      id: "lsp",
      label: "LSP",
      enabled: lspCompletionEnabled,
      available: lspCompletionEnabled && active && features.completion,
      fallback: lspCompletionEnabled && (!active || !features.completion),
    },
    {
      id: "snippets",
      label: "Snippets",
      enabled: snippetsEnabled,
      available: snippetsEnabled,
      fallback: false,
    },
    {
      id: "local",
      label: "Local words",
      enabled: localWordsEnabled,
      available: localWordsEnabled,
      fallback: false,
    },
    {
      id: "language",
      label: "Language hints",
      enabled: languageHintsEnabled,
      available: languageHintsEnabled,
      fallback: false,
    },
  ];
  const availableCompletionLabels = completionSources
    .filter((source) => source.available)
    .map((source) => source.label);

  return {
    language: {
      id: languageCapabilities.id,
      label: languageCapabilities.label,
      editorGrammarId: languageCapabilities.editorGrammarId,
    },
    lsp: {
      ...baseStatus,
      state,
      label: serverLabel,
      message,
      statusText,
      shortText: statusText,
      title: lspTitle,
      serverLabel,
      envName,
      installHint,
      envOverride: baseStatus.envOverride === true,
      path: baseStatus.path || baseStatus.resolvedPath || null,
      source: baseStatus.source || null,
      configured: languageCapabilities.lsp.configured,
      enabled: lspEnabled,
      active,
      pending,
      fallbackActive,
      features,
      supportedFeatureIds,
      activeFeatureIds,
      featureCount,
      activeFeatureCount,
    },
    completions: {
      enabled: autocompleteEnabled,
      sources: completionSources,
      availableLabels: availableCompletionLabels,
      shortText: availableCompletionLabels.length
        ? `Complete ${availableCompletionLabels.join("+")}`
        : "Complete off",
      title: `Completion sources: ${
        availableCompletionLabels.length ? availableCompletionLabels.join(", ") : "none"
      }`,
    },
    actions: Object.fromEntries(
      Object.entries(features).map(([key, supported]) => [
        key,
        {
          label: LSP_FEATURE_LABELS[key],
          supported,
          active: supported && active,
          fallback: supported && !active,
        },
      ]),
    ),
    capabilityBadge: languageCapabilities.lsp.configured
      ? `Tools ${activeFeatureCount}/${featureCount}`
      : "",
    capabilityTitle: [
      `${languageCapabilities.label} LSP capabilities`,
      supportedFeatureNames.join(", ") || "No LSP features configured",
      fallbackActive && installHint ? installHint : "",
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

function resolveCompletionText(item, label) {
  const text = item?.textEdit?.newText ?? item?.insertText ?? item?.label?.label ?? label;
  return String(text || label);
}

function applyPlainCompletion(view, completion, from, to, insertText) {
  view.dispatch(
    view.state.update({
      ...insertCompletionText(view.state, insertText, from, to),
      annotations: pickedCompletion.of(completion),
    }),
  );
}

function applyCompletionTextEdit(item, insertText) {
  const range = item?.textEdit?.range || item?.textEdit?.insert || item?.textEdit?.replace;
  const isSnippet = Number(item?.insertTextFormat) === 2;

  if (!range && !isSnippet) return insertText;

  return (view, completion, from, to) => {
    const resolvedRange = lspRangeToCodeMirrorRange(view.state.doc, range);
    const changeFrom = resolvedRange?.from ?? from;
    const changeTo = resolvedRange?.to ?? to;
    if (!isSnippet) {
      applyPlainCompletion(view, completion, changeFrom, changeTo, insertText);
      return;
    }

    try {
      snippet(insertText)(view, completion, changeFrom, changeTo);
    } catch {
      applyPlainCompletion(
        view,
        completion,
        changeFrom,
        changeTo,
        stripLspSnippet(insertText),
      );
    }
  };
}

function getCompletionBoost(item, index) {
  if (item?.preselect) return 99;
  if (Number(item?.kind) === 15) return 36;
  if (item?.sortText && /^[!#0]/.test(String(item.sortText))) return 30;
  const kind = completionType(item?.kind);
  const kindBoost =
    kind === "keyword"
      ? 10
      : kind === "function" || kind === "method"
        ? 8
        : kind === "class" || kind === "interface" || kind === "type"
          ? 6
          : kind === "property"
            ? 4
            : 0;
  return Math.max(-30, kindBoost + 12 - index / 8);
}

function hasDeprecatedCompletionTag(item) {
  return (
    item?.deprecated === true ||
    (Array.isArray(item?.tags) && item.tags.includes(LSP_COMPLETION_DEPRECATED_TAG))
  );
}

function readCompletionSourceLabel(item) {
  return String(
    item?.source ||
      item?.data?.source ||
      item?.data?.sourceName ||
      item?.data?.pluginName ||
      "",
  ).trim();
}

function createLspCompletionDetail(item, kindDetail) {
  const detailParts = [
    item.detail,
    item.labelDetails?.detail,
    item.labelDetails?.description,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const sourceLabel = readCompletionSourceLabel(item);
  const segments = [
    detailParts.join(" ").trim() || kindDetail,
    sourceLabel ? `from ${sourceLabel}` : "",
    hasDeprecatedCompletionTag(item) ? "deprecated" : "",
  ].filter(Boolean);
  return segments.join(" | ");
}

function createLspCompletionInfo(item, kindDetail, documentation, insertText) {
  const detail = createLspCompletionDetail(item, kindDetail);
  const insertPreview = stripLspSnippet(insertText).trim();
  return [
    documentation,
    detail && detail !== documentation ? detail : "",
    insertPreview && insertPreview !== item.label ? `Insert: ${insertPreview}` : "",
  ]
    .filter((part) => part !== "")
    .join("\n")
    .trim() || kindDetail;
}

export function createSnippetCompletions(context, languageId, options = {}) {
  const normalizedLanguageId = normalizeCompletionSourceLanguage(languageId);
  const match = getCompletionMatch(context, normalizedLanguageId);
  if (!hasLocalCompletionTrigger(context, normalizedLanguageId, match, options)) {
    return null;
  }
  const rankContext = createCompletionRankContext(context, normalizedLanguageId);

  const languageOptions =
    options.languageHints === false
      ? []
      : getLanguageCompletionItems(normalizedLanguageId)
          .filter((item) => options.snippets !== false || !item.template)
          .map(toSnippetCompletion)
          .slice(0, options.lowPowerMode ? 32 : 72);
  const localOptions =
    options.localWords === false
      ? []
      : createLocalDocumentCompletions(
          context,
          normalizedLanguageId,
          options,
        );

  if (!languageOptions.length && !localOptions.length) return null;

  return {
    from: match?.from ?? context.pos,
    options: mergeCompletionOptions([languageOptions, localOptions], rankContext).slice(
      0,
      resolveCompletionLimit(options),
    ),
    validFor: WORD_COMPLETION_PATTERN,
  };
}

export function shouldRequestLspCompletion(context, options = {}) {
  if (context.explicit) return true;
  const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
  if (/[.:/<#@"'`-]$/.test(before)) return true;
  const word = context.matchBefore(COMPLETION_MATCH_PATTERN);
  const minLength = resolveCompletionMinPrefixLength(options);
  return String(word?.text || "").length >= minLength;
}

export function lspCompletionsToCodeMirror(context, completionList, snippetResult, options = {}) {
  const resolvedOptions = typeof options === "object" && options !== null ? options : {};
  const maxItems = resolveCompletionLimit(resolvedOptions);
  const normalizedLanguageId = normalizeCompletionSourceLanguage(resolvedOptions.languageId);
  const matchPattern = getCompletionMatchPattern(normalizedLanguageId);
  const word = context.matchBefore(matchPattern);
  const from = word ? word.from : context.pos;
  const items = Array.isArray(completionList?.items) ? completionList.items : [];
  const rankContext = createCompletionRankContext(context, normalizedLanguageId);
  const scanLimit = resolveLspCompletionScanLimit(items.length, maxItems);
  const lspOptions = items.slice(0, scanLimit).map((item, index) => {
    const label = normalizeCompletionLabel(item);
    const insertText = resolveCompletionText(item, label);
    const documentation = readMarkupContent(item.documentation).trim();
    const kindDetail = completionKindName(item.kind);
    const sortText = String(item.sortText || "");
    const recommended = item.preselect || sortText.startsWith("!");
    const deprecated = hasDeprecatedCompletionTag(item);

    return {
      label,
      type: completionType(item.kind),
      detail: createLspCompletionDetail(item, kindDetail),
      info: createLspCompletionInfo(item, kindDetail, documentation, insertText),
      apply: applyCompletionTextEdit(item, insertText),
      boost: getCompletionBoost(item, index),
      sortText,
      filterText: String(item.filterText || label),
      commitCharacters: item.commitCharacters,
      completionTags: Array.isArray(item.tags) ? item.tags.slice() : [],
      completionSource: readCompletionSourceLabel(item),
      deprecated,
      class: deprecated ? "nx-cm-completion-deprecated" : undefined,
      section: recommended
        ? COMPLETION_SECTIONS.lspRecommended
        : COMPLETION_SECTIONS.lsp,
      completionOrigin: recommended
        ? COMPLETION_ORIGINS.lspRecommended
        : COMPLETION_ORIGINS.lsp,
    };
  });
  const localOptions = Array.isArray(snippetResult?.options) ? snippetResult.options : [];

  return {
    from,
    options: mergeCompletionOptions([lspOptions, localOptions], rankContext).slice(0, maxItems),
    validFor: completionList?.isIncomplete ? undefined : matchPattern,
  };
}

