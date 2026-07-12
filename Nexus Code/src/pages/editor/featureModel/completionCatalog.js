import { LANGUAGE_IDS } from "../../../ide/languages/languageIds.js";

export const COMPLETION_KIND_TYPES = Object.freeze({
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

export const COMPLETION_KIND_NAMES = Object.freeze({
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

export const SNIPPET_PLACEHOLDER_PATTERN = /\$\{(?:\d+:)?([^}]+)\}|\$\d+/g;
export const WORD_COMPLETION_PATTERN = /^[\w$-]*$/;
export const COMPLETION_MATCH_PATTERN = /[\w$-]*$/;
export const CSS_COMPLETION_MATCH_PATTERN = /[\w$#.:-]*$/;
export const MARKDOWN_COMPLETION_MATCH_PATTERN = /[#>`*\w$-]*$/;
export const LOCAL_COMPLETION_IMPLICIT_MIN_LENGTH = 1;
export const COMPLETION_LIMIT_MIN = 16;
export const COMPLETION_LIMIT_MAX = 240;
export const LOCAL_COMPLETION_MIN_PREFIX_FALLBACK = 2;

export const COMPLETION_ORIGINS = Object.freeze({
  lspRecommended: "lsp-recommended",
  lsp: "lsp",
  snippet: "snippet",
  local: "local",
  language: "language",
  structure: "structure",
});

export const COMPLETION_SECTIONS = Object.freeze({
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

export const STRUCTURE_COMPLETION_SECTION = COMPLETION_SECTIONS.structure;
export const LANGUAGE_COMPLETION_SECTION = COMPLETION_SECTIONS.language;
export const SNIPPET_COMPLETION_SECTION = COMPLETION_SECTIONS.snippets;
export const LOCAL_COMPLETION_SECTION = COMPLETION_SECTIONS.local;
export const LOCAL_COMPLETION_WORD_PATTERN = /[A-Za-z_$][\w$-]{2,}/g;
export const LOCAL_COMPLETION_MAX_TEXT = 120_000;
export const LOCAL_COMPLETION_MAX_ITEMS = 36;
export const COMPLETION_LSP_SCAN_FACTOR = 2;
export const COMPLETION_LSP_SCAN_MAX = 480;
export const LSP_COMPLETION_DEPRECATED_TAG = 1;

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

export const LANGUAGE_COMPLETION_MAP = Object.freeze({
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

export const RESERVED_SYMBOL_NAMES = new Set([
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
