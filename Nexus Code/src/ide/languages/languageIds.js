/**
 * Central language registry for Nexus Code.
 *
 * The registry intentionally separates Nexus language ids from editor grammar
 * ids so future editor services can keep stable ids even when an engine uses a
 * fallback grammar for a file type.
 */

/**
 * @typedef {Object} LanguageDefinition
 * @property {string} id
 * @property {string} label
 * @property {string[]} extensions
 * @property {string[]} filenames
 * @property {string[]} aliases
 * @property {string} [editorGrammarId]
 * @property {boolean} [lspReady]
 * @property {LanguageServerDefinition} [languageServer]
 */

/**
 * @typedef {Object} LanguageServerDefinition
 * @property {string} label
 * @property {string} envName
 * @property {string} installHint
 * @property {Record<string, boolean>} features
 */

export const LANGUAGE_IDS = Object.freeze({
  PLAINTEXT: "plaintext",
  JAVASCRIPT: "javascript",
  TYPESCRIPT: "typescript",
  PYTHON: "python",
  RUST: "rust",
  GO: "go",
  C: "c",
  CPP: "cpp",
  CSHARP: "csharp",
  JAVA: "java",
  PHP: "php",
  RUBY: "ruby",
  SWIFT: "swift",
  KOTLIN: "kotlin",
  DART: "dart",
  HTML: "html",
  CSS: "css",
  SCSS: "scss",
  LESS: "less",
  JSON: "json",
  JSONC: "jsonc",
  MARKDOWN: "markdown",
  YAML: "yaml",
  XML: "xml",
  SQL: "sql",
  SHELL: "shell",
  POWERSHELL: "powershell",
  BAT: "bat",
  DOCKERFILE: "dockerfile",
  MAKEFILE: "makefile",
  CMAKE: "cmake",
  TOML: "toml",
  INI: "ini",
  GRAPHQL: "graphql",
  LUA: "lua",
  R: "r",
  PERL: "perl",
  SCALA: "scala",
  ELIXIR: "elixir",
  CLOJURE: "clojure",
  FSHARP: "fsharp",
  VB: "vb",
  OBJECTIVE_C: "objective-c",
  SYSTEMVERILOG: "systemverilog",
  VERILOG: "verilog",
  SOLIDITY: "solidity",
  HCL: "hcl",
  BICEP: "bicep",
  PROTOBUF: "protobuf",
  WGSL: "wgsl",
  VUE: "vue",
  SVELTE: "svelte",
  ASTRO: "astro",
  MDX: "mdx",
  CSV: "csv",
  DIFF: "diff",
  LOG: "log",
  ENV: "dotenv",
});

export const LSP_FEATURES = Object.freeze({
  completion: true,
  hover: true,
  diagnostics: true,
  definition: true,
  formatting: true,
  codeActions: true,
  rename: true,
});

const TYPESCRIPT_LANGUAGE_SERVER = Object.freeze({
  label: "TypeScript Language Server",
  envName: "NEXUS_LSP_TYPESCRIPT",
  installHint:
    "Install with npm install -g typescript typescript-language-server or set NEXUS_LSP_TYPESCRIPT.",
  features: LSP_FEATURES,
});

const PYTHON_LANGUAGE_SERVER = Object.freeze({
  label: "Pyright",
  envName: "NEXUS_LSP_PYTHON",
  installHint:
    "Install Pyright manually with pip install pyright or npm install -g pyright, or set NEXUS_LSP_PYTHON to a custom command.",
  features: LSP_FEATURES,
});

const RUST_LANGUAGE_SERVER = Object.freeze({
  label: "rust-analyzer",
  envName: "NEXUS_LSP_RUST",
  installHint:
    "Install rust-analyzer with rustup component add rust-analyzer or set NEXUS_LSP_RUST to a custom command.",
  features: LSP_FEATURES,
});

const GO_LANGUAGE_SERVER = Object.freeze({
  label: "gopls",
  envName: "NEXUS_LSP_GO",
  installHint:
    "Install with go install golang.org/x/tools/gopls@latest or set NEXUS_LSP_GO to a custom command.",
  features: LSP_FEATURES,
});

const CLANGD_LANGUAGE_SERVER = Object.freeze({
  label: "clangd",
  envName: "NEXUS_LSP_CLANGD",
  installHint: "Install clangd from LLVM or set NEXUS_LSP_CLANGD to a custom command.",
  features: LSP_FEATURES,
});

/** @type {LanguageDefinition[]} */
const definitions = [
  {
    id: LANGUAGE_IDS.PLAINTEXT,
    label: "Plain Text",
    extensions: ["txt", "text"],
    filenames: [],
    aliases: ["text", "plaintext"],
  },
  {
    id: LANGUAGE_IDS.JAVASCRIPT,
    label: "JavaScript",
    extensions: ["js", "jsx", "mjs", "cjs"],
    filenames: [],
    aliases: ["javascript", "js", "node"],
    lspReady: true,
    languageServer: TYPESCRIPT_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.TYPESCRIPT,
    label: "TypeScript",
    extensions: ["ts", "tsx", "mts", "cts", "d.ts"],
    filenames: [],
    aliases: ["typescript", "ts"],
    lspReady: true,
    languageServer: TYPESCRIPT_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.PYTHON,
    label: "Python",
    extensions: ["py", "pyw", "pyi"],
    filenames: ["pyproject.toml"],
    aliases: ["python", "py"],
    lspReady: true,
    languageServer: PYTHON_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.RUST,
    label: "Rust",
    extensions: ["rs"],
    filenames: ["cargo.toml", "cargo.lock"],
    aliases: ["rust", "rs"],
    lspReady: true,
    languageServer: RUST_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.GO,
    label: "Go",
    extensions: ["go"],
    filenames: ["go.mod", "go.sum", "go.work"],
    aliases: ["go", "golang"],
    lspReady: true,
    languageServer: GO_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.C,
    label: "C",
    extensions: ["c", "h"],
    filenames: [],
    aliases: ["c"],
    lspReady: true,
    languageServer: CLANGD_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.CPP,
    label: "C++",
    extensions: ["cc", "cpp", "cxx", "c++", "hpp", "hh", "hxx", "ipp"],
    filenames: [],
    aliases: ["cpp", "c++", "cplusplus"],
    lspReady: true,
    languageServer: CLANGD_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.CSHARP,
    label: "C#",
    extensions: ["cs", "csx"],
    filenames: [],
    aliases: ["csharp", "c#"],
  },
  {
    id: LANGUAGE_IDS.JAVA,
    label: "Java",
    extensions: ["java"],
    filenames: [],
    aliases: ["java"],
  },
  {
    id: LANGUAGE_IDS.PHP,
    label: "PHP",
    extensions: ["php", "phtml"],
    filenames: [],
    aliases: ["php"],
  },
  {
    id: LANGUAGE_IDS.RUBY,
    label: "Ruby",
    extensions: ["rb", "erb"],
    filenames: ["gemfile", "rakefile"],
    aliases: ["ruby", "rb"],
  },
  {
    id: LANGUAGE_IDS.SWIFT,
    label: "Swift",
    extensions: ["swift"],
    filenames: [],
    aliases: ["swift"],
  },
  {
    id: LANGUAGE_IDS.KOTLIN,
    label: "Kotlin",
    extensions: ["kt", "kts"],
    filenames: [],
    aliases: ["kotlin", "kt"],
  },
  {
    id: LANGUAGE_IDS.DART,
    label: "Dart",
    extensions: ["dart"],
    filenames: [],
    aliases: ["dart", "flutter"],
  },
  {
    id: LANGUAGE_IDS.HTML,
    label: "HTML",
    extensions: ["html", "htm", "xhtml"],
    filenames: [],
    aliases: ["html"],
  },
  {
    id: LANGUAGE_IDS.CSS,
    label: "CSS",
    extensions: ["css"],
    filenames: [],
    aliases: ["css"],
  },
  {
    id: LANGUAGE_IDS.SCSS,
    label: "SCSS",
    extensions: ["scss"],
    filenames: [],
    aliases: ["scss", "sass"],
  },
  {
    id: LANGUAGE_IDS.LESS,
    label: "Less",
    extensions: ["less"],
    filenames: [],
    aliases: ["less"],
  },
  {
    id: LANGUAGE_IDS.JSON,
    label: "JSON",
    extensions: ["json"],
    filenames: ["package-lock.json", "composer.lock"],
    aliases: ["json"],
  },
  {
    id: LANGUAGE_IDS.JSONC,
    label: "JSON with Comments",
    extensions: ["jsonc"],
    filenames: ["tsconfig.json", "jsconfig.json", ".eslintrc", ".babelrc"],
    aliases: ["jsonc"],
    editorGrammarId: "json",
  },
  {
    id: LANGUAGE_IDS.MARKDOWN,
    label: "Markdown",
    extensions: ["md", "markdown", "mdown"],
    filenames: ["readme"],
    aliases: ["markdown", "md"],
  },
  {
    id: LANGUAGE_IDS.YAML,
    label: "YAML",
    extensions: ["yaml", "yml"],
    filenames: [],
    aliases: ["yaml", "yml"],
  },
  {
    id: LANGUAGE_IDS.XML,
    label: "XML",
    extensions: ["xml", "xsd", "svg"],
    filenames: [],
    aliases: ["xml"],
  },
  {
    id: LANGUAGE_IDS.SQL,
    label: "SQL",
    extensions: ["sql"],
    filenames: [],
    aliases: ["sql", "mysql", "pgsql"],
  },
  {
    id: LANGUAGE_IDS.SHELL,
    label: "Shell",
    extensions: ["sh", "bash", "zsh", "fish", "ksh"],
    filenames: [".bashrc", ".zshrc", ".profile"],
    aliases: ["shell", "bash", "sh"],
  },
  {
    id: LANGUAGE_IDS.POWERSHELL,
    label: "PowerShell",
    extensions: ["ps1", "psm1", "psd1"],
    filenames: [],
    aliases: ["powershell", "ps1"],
  },
  {
    id: LANGUAGE_IDS.BAT,
    label: "Batch",
    extensions: ["bat", "cmd"],
    filenames: [],
    aliases: ["bat", "batch", "cmd"],
  },
  {
    id: LANGUAGE_IDS.DOCKERFILE,
    label: "Dockerfile",
    extensions: ["dockerfile"],
    filenames: ["dockerfile", "containerfile"],
    aliases: ["dockerfile", "docker"],
  },
  {
    id: LANGUAGE_IDS.MAKEFILE,
    label: "Makefile",
    extensions: ["mk", "mak"],
    filenames: ["makefile", "gnumakefile"],
    aliases: ["makefile", "make"],
  },
  {
    id: LANGUAGE_IDS.CMAKE,
    label: "CMake",
    extensions: ["cmake"],
    filenames: ["cmakelists.txt"],
    aliases: ["cmake"],
  },
  {
    id: LANGUAGE_IDS.TOML,
    label: "TOML",
    extensions: ["toml"],
    filenames: [],
    aliases: ["toml"],
  },
  {
    id: LANGUAGE_IDS.INI,
    label: "INI",
    extensions: ["ini", "cfg", "conf", "properties"],
    filenames: [".editorconfig"],
    aliases: ["ini", "config"],
  },
  {
    id: LANGUAGE_IDS.GRAPHQL,
    label: "GraphQL",
    extensions: ["graphql", "gql"],
    filenames: [],
    aliases: ["graphql", "gql"],
  },
  {
    id: LANGUAGE_IDS.LUA,
    label: "Lua",
    extensions: ["lua"],
    filenames: [],
    aliases: ["lua"],
  },
  {
    id: LANGUAGE_IDS.R,
    label: "R",
    extensions: ["r", "rmd"],
    filenames: [],
    aliases: ["r", "rscript"],
  },
  {
    id: LANGUAGE_IDS.PERL,
    label: "Perl",
    extensions: ["pl", "pm", "perl"],
    filenames: [],
    aliases: ["perl", "pl"],
  },
  {
    id: LANGUAGE_IDS.SCALA,
    label: "Scala",
    extensions: ["scala", "sc"],
    filenames: [],
    aliases: ["scala"],
  },
  {
    id: LANGUAGE_IDS.ELIXIR,
    label: "Elixir",
    extensions: ["ex", "exs"],
    filenames: ["mix.exs"],
    aliases: ["elixir", "ex"],
  },
  {
    id: LANGUAGE_IDS.CLOJURE,
    label: "Clojure",
    extensions: ["clj", "cljs", "cljc", "edn"],
    filenames: [],
    aliases: ["clojure", "clj"],
  },
  {
    id: LANGUAGE_IDS.FSHARP,
    label: "F#",
    extensions: ["fs", "fsi", "fsx"],
    filenames: [],
    aliases: ["fsharp", "f#"],
  },
  {
    id: LANGUAGE_IDS.VB,
    label: "Visual Basic",
    extensions: ["vb", "vbs"],
    filenames: [],
    aliases: ["vb", "visualbasic"],
  },
  {
    id: LANGUAGE_IDS.OBJECTIVE_C,
    label: "Objective-C",
    extensions: ["m", "mm"],
    filenames: [],
    aliases: ["objective-c", "objc"],
  },
  {
    id: LANGUAGE_IDS.SYSTEMVERILOG,
    label: "SystemVerilog",
    extensions: ["sv", "svh"],
    filenames: [],
    aliases: ["systemverilog", "sv"],
  },
  {
    id: LANGUAGE_IDS.VERILOG,
    label: "Verilog",
    extensions: ["v", "vh"],
    filenames: [],
    aliases: ["verilog"],
    editorGrammarId: "systemverilog",
  },
  {
    id: LANGUAGE_IDS.SOLIDITY,
    label: "Solidity",
    extensions: ["sol"],
    filenames: [],
    aliases: ["solidity", "sol"],
  },
  {
    id: LANGUAGE_IDS.HCL,
    label: "HCL",
    extensions: ["hcl", "tf", "tfvars"],
    filenames: [],
    aliases: ["hcl", "terraform"],
  },
  {
    id: LANGUAGE_IDS.BICEP,
    label: "Bicep",
    extensions: ["bicep"],
    filenames: [],
    aliases: ["bicep"],
  },
  {
    id: LANGUAGE_IDS.PROTOBUF,
    label: "Protocol Buffers",
    extensions: ["proto"],
    filenames: [],
    aliases: ["protobuf", "proto"],
  },
  {
    id: LANGUAGE_IDS.WGSL,
    label: "WGSL",
    extensions: ["wgsl"],
    filenames: [],
    aliases: ["wgsl"],
  },
  {
    id: LANGUAGE_IDS.VUE,
    label: "Vue",
    extensions: ["vue"],
    filenames: [],
    aliases: ["vue"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.SVELTE,
    label: "Svelte",
    extensions: ["svelte"],
    filenames: [],
    aliases: ["svelte"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.ASTRO,
    label: "Astro",
    extensions: ["astro"],
    filenames: [],
    aliases: ["astro"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.MDX,
    label: "MDX",
    extensions: ["mdx"],
    filenames: [],
    aliases: ["mdx"],
    editorGrammarId: "markdown",
  },
  {
    id: LANGUAGE_IDS.CSV,
    label: "CSV",
    extensions: ["csv", "tsv"],
    filenames: [],
    aliases: ["csv", "tsv"],
  },
  {
    id: LANGUAGE_IDS.DIFF,
    label: "Diff",
    extensions: ["diff", "patch"],
    filenames: [],
    aliases: ["diff", "patch"],
  },
  {
    id: LANGUAGE_IDS.LOG,
    label: "Log",
    extensions: ["log"],
    filenames: [],
    aliases: ["log"],
  },
  {
    id: LANGUAGE_IDS.ENV,
    label: "Environment",
    extensions: ["env"],
    filenames: [".env", ".env.local", ".env.development", ".env.production"],
    aliases: ["env", "dotenv"],
    editorGrammarId: "shell",
  },
].map((definition) => Object.freeze(definition));

export const LANGUAGE_DEFINITIONS = Object.freeze(definitions);

const LANGUAGE_BY_ID = new Map();
const LANGUAGE_BY_ALIAS = new Map();
const LANGUAGE_BY_FILENAME = new Map();
const LANGUAGE_BY_EXTENSION = new Map();

for (const definition of LANGUAGE_DEFINITIONS) {
  LANGUAGE_BY_ID.set(definition.id, definition);
  LANGUAGE_BY_ALIAS.set(definition.id.toLowerCase(), definition);
  for (const alias of definition.aliases) {
    LANGUAGE_BY_ALIAS.set(alias.toLowerCase(), definition);
  }
  for (const filename of definition.filenames) {
    LANGUAGE_BY_FILENAME.set(filename.toLowerCase(), definition);
  }
  for (const extension of definition.extensions) {
    LANGUAGE_BY_EXTENSION.set(extension.toLowerCase().replace(/^\./, ""), definition);
  }
}

const EXTENSION_MATCHERS = [...LANGUAGE_BY_EXTENSION.entries()].sort(
  ([left], [right]) => right.length - left.length,
);

export const LSP_READY_LANGUAGE_IDS = Object.freeze(
  LANGUAGE_DEFINITIONS.filter((definition) => definition.lspReady).map(
    (definition) => definition.id,
  ),
);

function toCleanPath(value) {
  return String(value || "")
    .trim()
    .replace(/[?#].*$/, "")
    .replace(/\\/g, "/");
}

export function getFileBasename(resourcePath) {
  const cleanPath = toCleanPath(resourcePath);
  if (!cleanPath) return "";
  const parts = cleanPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

export function getFileExtension(resourcePath) {
  const basename = getFileBasename(resourcePath);
  if (!basename || (basename.startsWith(".") && basename.indexOf(".", 1) < 0)) {
    return "";
  }
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === basename.length - 1) return "";
  return basename.slice(dotIndex + 1).toLowerCase();
}

export function normalizeLanguageId(languageId, fallback = LANGUAGE_IDS.PLAINTEXT) {
  if (!languageId) return fallback;
  const normalized = String(languageId).trim().toLowerCase();
  return LANGUAGE_BY_ALIAS.get(normalized)?.id || fallback;
}

export function getLanguageDefinition(languageId) {
  return LANGUAGE_BY_ID.get(normalizeLanguageId(languageId)) || LANGUAGE_BY_ID.get(LANGUAGE_IDS.PLAINTEXT);
}

export function getLanguageDisplayName(languageId) {
  return getLanguageDefinition(languageId)?.label || "Plain Text";
}

export function getEditorGrammarId(languageId) {
  const definition = getLanguageDefinition(languageId);
  return definition?.editorGrammarId || definition?.id || LANGUAGE_IDS.PLAINTEXT;
}

export function isLspReadyLanguage(languageId) {
  return LSP_READY_LANGUAGE_IDS.includes(normalizeLanguageId(languageId));
}

export function getLanguageCapabilities(languageId) {
  const definition = getLanguageDefinition(languageId);
  const languageServer = definition?.languageServer || null;
  const features = languageServer?.features || {};

  return {
    id: definition?.id || LANGUAGE_IDS.PLAINTEXT,
    label: definition?.label || "Plain Text",
    editorGrammarId: getEditorGrammarId(definition?.id),
    lspReady: definition?.lspReady === true,
    lsp: {
      configured: Boolean(languageServer),
      label: languageServer?.label || null,
      envName: languageServer?.envName || null,
      installHint: languageServer?.installHint || null,
      features: { ...features },
    },
  };
}

export function detectLanguageDefinition(resourcePath, fallback = LANGUAGE_IDS.PLAINTEXT) {
  const basename = getFileBasename(resourcePath).toLowerCase();
  if (!basename) return getLanguageDefinition(fallback);

  const exactMatch = LANGUAGE_BY_FILENAME.get(basename);
  if (exactMatch) return exactMatch;

  for (const [extension, definition] of EXTENSION_MATCHERS) {
    if (basename === extension || basename.endsWith(`.${extension}`)) {
      return definition;
    }
  }

  return getLanguageDefinition(fallback);
}

export function detectLanguageId(resourcePath, fallback = LANGUAGE_IDS.PLAINTEXT) {
  return detectLanguageDefinition(resourcePath, fallback)?.id || fallback;
}

export function detectEditorGrammarId(resourcePath, fallback = LANGUAGE_IDS.PLAINTEXT) {
  return getEditorGrammarId(detectLanguageId(resourcePath, fallback));
}

export function listLanguageDefinitions() {
  return [...LANGUAGE_DEFINITIONS];
}

export function listLanguageIds() {
  return LANGUAGE_DEFINITIONS.map((definition) => definition.id);
}
