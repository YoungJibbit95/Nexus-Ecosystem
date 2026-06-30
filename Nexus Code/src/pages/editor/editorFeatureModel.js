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
    id: "open-github-issues",
    actionId: "open-github-issues",
    label: "GitHub Issues anzeigen",
    description: "Oeffne Issues mit Status, Labels und Bearbeitungsaktionen.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["github", "issues", "bugs", "tasks", "tickets"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 81,
  }),
  Object.freeze({
    id: "open-pull-requests",
    actionId: "open-pull-requests",
    label: "Pull Requests anzeigen",
    description: "Oeffne PRs, Checks und Review-nahe Aktionen.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["github", "pull request", "pr", "review", "checks"]),
    surfaces: Object.freeze(["palette", "spotlight"]),
    priority: 80,
  }),
  Object.freeze({
    id: "open-github-projects",
    actionId: "open-github-projects",
    label: "GitHub Projects anzeigen",
    description: "Oeffne Project Boards und verknuepfte Issues oder PRs.",
    category: "source-control",
    shortcut: "",
    keywords: Object.freeze(["github", "projects", "board", "planning", "project"]),
    surfaces: Object.freeze(["palette"]),
    priority: 79,
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
const COMPLETION_MATCH_PATTERN = /[\w$-]*$/;
const CSS_COMPLETION_MATCH_PATTERN = /[\w$#.:-]*$/;
const MARKDOWN_COMPLETION_MATCH_PATTERN = /[#>`*\w$-]*$/;
const LOCAL_COMPLETION_IMPLICIT_MIN_LENGTH = 1;

const COMPLETION_SECTIONS = Object.freeze({
  lspRecommended: Object.freeze({ name: "Recommended", rank: 0 }),
  lsp: Object.freeze({ name: "Language Server", rank: 8 }),
  snippets: Object.freeze({ name: "Snippets", rank: 16 }),
  language: Object.freeze({ name: "Language", rank: 24 }),
  structure: Object.freeze({ name: "Structures", rank: 32 }),
});

const STRUCTURE_COMPLETION_SECTION = COMPLETION_SECTIONS.structure;
const LANGUAGE_COMPLETION_SECTION = COMPLETION_SECTIONS.language;
const SNIPPET_COMPLETION_SECTION = COMPLETION_SECTIONS.snippets;

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

const LANGUAGE_COMPLETION_MAP = Object.freeze({
  [LANGUAGE_IDS.JAVASCRIPT]: JAVASCRIPT_COMPLETIONS,
  [LANGUAGE_IDS.TYPESCRIPT]: TYPESCRIPT_COMPLETIONS,
  [LANGUAGE_IDS.PYTHON]: PYTHON_COMPLETIONS,
  [LANGUAGE_IDS.RUST]: RUST_COMPLETIONS,
  [LANGUAGE_IDS.GO]: GO_COMPLETIONS,
  [LANGUAGE_IDS.CSS]: CSS_COMPLETIONS,
  [LANGUAGE_IDS.SCSS]: CSS_COMPLETIONS,
  [LANGUAGE_IDS.LESS]: CSS_COMPLETIONS,
  [LANGUAGE_IDS.JSON]: JSON_COMPLETIONS,
  [LANGUAGE_IDS.JSONC]: JSON_COMPLETIONS,
  [LANGUAGE_IDS.MARKDOWN]: MARKDOWN_COMPLETIONS,
  [LANGUAGE_IDS.MDX]: MARKDOWN_COMPLETIONS,
});

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

function hasLocalCompletionTrigger(context, languageId, match) {
  if (context.explicit) return true;
  const typed = match?.text || "";
  if (typed.length >= LOCAL_COMPLETION_IMPLICIT_MIN_LENGTH && /[\w$-]/.test(typed)) {
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
  if (!hasLocalCompletionTrigger(context, normalizedLanguageId, match)) return null;

  const languageOptions = getLanguageCompletionItems(normalizedLanguageId)
    .map(toSnippetCompletion)
    .slice(0, options.lowPowerMode ? 32 : 56);

  if (!languageOptions.length) return null;

  return {
    from: match?.from ?? context.pos,
    options: languageOptions,
    validFor: WORD_COMPLETION_PATTERN,
  };
}

export function shouldRequestLspCompletion(context) {
  if (context.explicit) return true;
  const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
  return /[.\w$:/<#@"'`-]$/.test(before);
}

export function lspCompletionsToCodeMirror(context, completionList, snippetResult, options = {}) {
  const maxItems =
    typeof options === "number"
      ? options
      : options.lowPowerMode
        ? 72
        : Number(options.maxItems || 120);
  const word = context.matchBefore(COMPLETION_MATCH_PATTERN);
  const from = word ? word.from : context.pos;
  const items = completionList?.items || [];
  const lspOptions = items.slice(0, maxItems).map((item, index) => {
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
      sortText: item.sortText,
      commitCharacters: item.commitCharacters,
      section: item.sortText?.startsWith("!")
        ? COMPLETION_SECTIONS.lspRecommended
        : COMPLETION_SECTIONS.lsp,
    };
  });
  const localOptions = Array.isArray(snippetResult?.options) ? snippetResult.options : [];

  return {
    from,
    options: mergeCompletionOptions([lspOptions, localOptions]),
    validFor: completionList?.isIncomplete ? undefined : WORD_COMPLETION_PATTERN,
  };
}

