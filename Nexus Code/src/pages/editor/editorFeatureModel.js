import { HighlightStyle } from "@codemirror/language";
import {
  insertCompletionText,
  pickedCompletion,
  snippet,
  snippetCompletion,
} from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";
import { LANGUAGE_IDS, normalizeLanguageId } from "../../ide/languages/languageIds.js";

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

const COMPLETION_SECTIONS = Object.freeze({
  lspRecommended: Object.freeze({ name: "Recommended", rank: 0 }),
  lsp: Object.freeze({ name: "Language Server", rank: 8 }),
  snippets: Object.freeze({ name: "Snippets", rank: 16 }),
  local: Object.freeze({ name: "Current Document", rank: 20 }),
  language: Object.freeze({ name: "Language", rank: 24 }),
  structure: Object.freeze({ name: "Structures", rank: 32 }),
});

const STRUCTURE_COMPLETION_SECTION = COMPLETION_SECTIONS.structure;
const LANGUAGE_COMPLETION_SECTION = COMPLETION_SECTIONS.language;
const SNIPPET_COMPLETION_SECTION = COMPLETION_SECTIONS.snippets;
const LOCAL_COMPLETION_SECTION = COMPLETION_SECTIONS.local;
const LOCAL_COMPLETION_WORD_PATTERN = /[A-Za-z_$][\w$-]{2,}/g;
const LOCAL_COMPLETION_MAX_TEXT = 120_000;
const LOCAL_COMPLETION_MAX_ITEMS = 36;

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
  "catch",
  "else",
  "for",
  "if",
  "switch",
  "while",
  "with",
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
  };
  return item.template ? snippetCompletion(item.template, completion) : completion;
}

function rankCompletionOption(option) {
  const section = option?.section;
  const sectionRank =
    typeof section === "object" && Number.isFinite(Number(section.rank))
      ? Number(section.rank)
      : 50;
  const boost = Number.isFinite(Number(option?.boost)) ? Number(option.boost) : 0;
  return sectionRank * 100 - boost;
}

function uniqueCompletionKey(option) {
  return String(option?.label || "").trim().toLowerCase();
}

function mergeCompletionOptions(optionGroups) {
  const merged = new Map();
  optionGroups.flat().filter(Boolean).forEach((option) => {
    const key = uniqueCompletionKey(option);
    if (!key) return;
    const previous = merged.get(key);
    if (!previous || rankCompletionOption(option) < rankCompletionOption(previous)) {
      merged.set(key, option);
    }
  });

  return [...merged.values()].sort((a, b) => {
    const rankDelta = rankCompletionOption(a) - rankCompletionOption(b);
    if (rankDelta !== 0) return rankDelta;
    return String(a.label || "").localeCompare(String(b.label || ""));
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
      boost: Math.max(1, 18 - index),
      section: LOCAL_COMPLETION_SECTION,
    }));
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

export function createSnippetCompletions(context, languageId, options = {}) {
  const normalizedLanguageId = normalizeCompletionSourceLanguage(languageId);
  const match = getCompletionMatch(context, normalizedLanguageId);
  if (!hasLocalCompletionTrigger(context, normalizedLanguageId, match, options)) {
    return null;
  }

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
    options: mergeCompletionOptions([languageOptions, localOptions]),
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
  const maxItems = resolveCompletionLimit(options);
  const normalizedLanguageId = normalizeCompletionSourceLanguage(resolvedOptions.languageId);
  const matchPattern = getCompletionMatchPattern(normalizedLanguageId);
  const word = context.matchBefore(matchPattern);
  const from = word ? word.from : context.pos;
  const items = Array.isArray(completionList?.items) ? completionList.items : [];
  const lspOptions = items.slice(0, maxItems).map((item, index) => {
    const label = normalizeCompletionLabel(item);
    const insertText = resolveCompletionText(item, label);
    const documentation = readMarkupContent(item.documentation).trim();
    const kindDetail = completionKindName(item.kind);
    const sortText = String(item.sortText || "");
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
      sortText,
      commitCharacters: item.commitCharacters,
      section: sortText.startsWith("!")
        ? COMPLETION_SECTIONS.lspRecommended
        : COMPLETION_SECTIONS.lsp,
    };
  });
  const localOptions = Array.isArray(snippetResult?.options) ? snippetResult.options : [];

  return {
    from,
    options: mergeCompletionOptions([lspOptions, localOptions]),
    validFor: completionList?.isIncomplete ? undefined : matchPattern,
  };
}

