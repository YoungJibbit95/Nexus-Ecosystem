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
  CYTHON: "cython",
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
  SASS: "sass",
  LESS: "less",
  STYLUS: "stylus",
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
  COFFEESCRIPT: "coffeescript",
  HASKELL: "haskell",
  ELM: "elm",
  JULIA: "julia",
  FORTRAN: "fortran",
  COBOL: "cobol",
  PASCAL: "pascal",
  GROOVY: "groovy",
  HAXE: "haxe",
  CRYSTAL: "crystal",
  D: "d",
  LUA: "lua",
  R: "r",
  PERL: "perl",
  SCALA: "scala",
  ELIXIR: "elixir",
  ERLANG: "erlang",
  CLOJURE: "clojure",
  COMMON_LISP: "common-lisp",
  SCHEME: "scheme",
  OCAML: "ocaml",
  FSHARP: "fsharp",
  VB: "vb",
  VBSCRIPT: "vbscript",
  APL: "apl",
  BRAINFUCK: "brainfuck",
  CYPHER: "cypher",
  DTD: "dtd",
  EBNF: "ebnf",
  EIFFEL: "eiffel",
  FORTH: "forth",
  GHERKIN: "gherkin",
  IDL: "idl",
  LIVESCRIPT: "livescript",
  MODELICA: "modelica",
  NSIS: "nsis",
  RDF: "rdf",
  OCTAVE: "octave",
  PIG: "pig",
  Q: "q",
  RPM_SPEC: "rpm-spec",
  SMALLTALK: "smalltalk",
  SIEVE: "sieve",
  LATEX: "latex",
  TEXTILE: "textile",
  VELOCITY: "velocity",
  XQUERY: "xquery",
  Z80: "z80",
  GLSL: "glsl",
  OBJECTIVE_C: "objective-c",
  VHDL: "vhdl",
  ASM: "asm",
  WASM: "wasm",
  WEBIDL: "webidl",
  TCL: "tcl",
  MATHEMATICA: "mathematica",
  SAS: "sas",
  PUPPET: "puppet",
  SYSTEMVERILOG: "systemverilog",
  VERILOG: "verilog",
  SOLIDITY: "solidity",
  ASN1: "asn1",
  HCL: "hcl",
  BICEP: "bicep",
  PROTOBUF: "protobuf",
  WGSL: "wgsl",
  VUE: "vue",
  SVELTE: "svelte",
  ASTRO: "astro",
  MDX: "mdx",
  HANDLEBARS: "handlebars",
  MUSTACHE: "mustache",
  EJS: "ejs",
  LIQUID: "liquid",
  NUNJUCKS: "nunjucks",
  NGINX: "nginx",
  PUG: "pug",
  JINJA: "jinja",
  HTTP: "http",
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
    extensions: ["js", "jsx", "mjs", "cjs", "mjsx", "cjsx", "es6", "pac"],
    filenames: [],
    aliases: ["javascript", "js", "jsx", "mjs", "cjs", "node", "nodejs", "ecmascript", "es6"],
    lspReady: true,
    languageServer: TYPESCRIPT_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.TYPESCRIPT,
    label: "TypeScript",
    extensions: ["ts", "tsx", "mts", "cts", "d.ts", "d.mts", "d.cts"],
    filenames: [],
    aliases: ["typescript", "ts", "tsx", "mts", "cts", "d.ts"],
    lspReady: true,
    languageServer: TYPESCRIPT_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.PYTHON,
    label: "Python",
    extensions: ["py", "pyw", "pyi"],
    filenames: [],
    aliases: ["python", "py"],
    lspReady: true,
    languageServer: PYTHON_LANGUAGE_SERVER,
  },
  {
    id: LANGUAGE_IDS.CYTHON,
    label: "Cython",
    extensions: ["pyx", "pxd", "pxi"],
    filenames: [],
    aliases: ["cython", "pyx"],
    editorGrammarId: "python",
  },
  {
    id: LANGUAGE_IDS.RUST,
    label: "Rust",
    extensions: ["rs"],
    filenames: [],
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
    extensions: ["cc", "cpp", "cxx", "c++", "hpp", "hh", "hxx", "h++", "ipp", "inl", "tpp", "ixx", "cppm"],
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
    extensions: ["php", "phtml", "php3", "php4", "php5", "phps", "phar"],
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
    extensions: ["html", "htm", "xhtml", "xht", "shtml"],
    filenames: [],
    aliases: ["html"],
  },
  {
    id: LANGUAGE_IDS.CSS,
    label: "CSS",
    extensions: ["css", "pcss"],
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
    id: LANGUAGE_IDS.SASS,
    label: "Sass",
    extensions: ["sass"],
    filenames: [],
    aliases: ["sass", "indented-sass"],
  },
  {
    id: LANGUAGE_IDS.LESS,
    label: "Less",
    extensions: ["less"],
    filenames: [],
    aliases: ["less"],
  },
  {
    id: LANGUAGE_IDS.STYLUS,
    label: "Stylus",
    extensions: ["styl", "stylus"],
    filenames: [],
    aliases: ["stylus", "styl"],
  },
  {
    id: LANGUAGE_IDS.JSON,
    label: "JSON",
    extensions: [
      "json",
      "json5",
      "jsonl",
      "ndjson",
      "jsonld",
      "geojson",
      "topojson",
      "webmanifest",
      "har",
      "ipynb",
      "map",
    ],
    filenames: ["package-lock.json", "composer.lock", "package.json", "manifest.json"],
    aliases: ["json", "json5", "jsonl", "ndjson", "jsonld", "geojson"],
  },
  {
    id: LANGUAGE_IDS.JSONC,
    label: "JSON with Comments",
    extensions: ["jsonc"],
    filenames: [
      "tsconfig.json",
      "jsconfig.json",
      "devcontainer.json",
      "deno.json",
      "deno.jsonc",
      "biome.json",
      "biome.jsonc",
      "turbo.json",
      "nx.json",
      ".eslintrc",
      ".eslintrc.json",
      ".babelrc",
      ".babelrc.json",
      ".swcrc",
      ".prettierrc",
      ".prettierrc.json",
      ".stylelintrc",
      ".stylelintrc.json",
      "settings.json",
      "launch.json",
      "tasks.json",
    ],
    aliases: ["jsonc", "json-with-comments"],
    editorGrammarId: "json",
  },
  {
    id: LANGUAGE_IDS.MARKDOWN,
    label: "Markdown",
    extensions: ["md", "markdown", "mdown", "mkd", "mdwn"],
    filenames: ["readme"],
    aliases: ["markdown", "md"],
  },
  {
    id: LANGUAGE_IDS.YAML,
    label: "YAML",
    extensions: ["yaml", "yml"],
    filenames: [
      ".clang-format",
      ".clang-tidy",
      ".gitlab-ci.yml",
      "docker-compose.yml",
      "docker-compose.yaml",
      "compose.yml",
      "compose.yaml",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "mkdocs.yml",
    ],
    aliases: ["yaml", "yml"],
  },
  {
    id: LANGUAGE_IDS.XML,
    label: "XML",
    extensions: ["xml", "xsd", "svg", "rss", "atom", "xaml", "plist", "csproj", "fsproj", "vbproj"],
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
    filenames: [
      ".bashrc",
      ".bash_profile",
      ".bash_login",
      ".bash_logout",
      ".zshrc",
      ".zprofile",
      ".zlogin",
      ".zlogout",
      ".zshenv",
      ".profile",
      ".kshrc",
      "pkgbuild",
      "apkbuild",
    ],
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
    filenames: ["makefile", "gnumakefile", "bsdmakefile"],
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
    filenames: ["cargo.toml", "pyproject.toml", "pipfile", "poetry.lock", "uv.lock", "pdm.lock"],
    aliases: ["toml"],
  },
  {
    id: LANGUAGE_IDS.INI,
    label: "INI",
    extensions: ["ini", "cfg", "conf", "properties"],
    filenames: [".editorconfig", ".npmrc", ".yarnrc", ".gitconfig"],
    aliases: ["ini", "config"],
  },
  {
    id: LANGUAGE_IDS.GRAPHQL,
    label: "GraphQL",
    extensions: ["graphql", "gql", "graphqls"],
    filenames: [],
    aliases: ["graphql", "gql"],
  },
  {
    id: LANGUAGE_IDS.COFFEESCRIPT,
    label: "CoffeeScript",
    extensions: ["coffee", "cson", "iced"],
    filenames: ["coffeefile"],
    aliases: ["coffeescript", "coffee"],
  },
  {
    id: LANGUAGE_IDS.HASKELL,
    label: "Haskell",
    extensions: ["hs", "lhs"],
    filenames: [],
    aliases: ["haskell", "hs"],
  },
  {
    id: LANGUAGE_IDS.ELM,
    label: "Elm",
    extensions: ["elm"],
    filenames: [],
    aliases: ["elm"],
  },
  {
    id: LANGUAGE_IDS.JULIA,
    label: "Julia",
    extensions: ["jl"],
    filenames: [],
    aliases: ["julia", "jl"],
  },
  {
    id: LANGUAGE_IDS.FORTRAN,
    label: "Fortran",
    extensions: ["f", "for", "f90", "f95", "f03", "f08"],
    filenames: [],
    aliases: ["fortran"],
  },
  {
    id: LANGUAGE_IDS.COBOL,
    label: "COBOL",
    extensions: ["cob", "cbl", "cpy"],
    filenames: [],
    aliases: ["cobol"],
  },
  {
    id: LANGUAGE_IDS.PASCAL,
    label: "Pascal",
    extensions: ["pas", "pp", "p"],
    filenames: [],
    aliases: ["pascal"],
  },
  {
    id: LANGUAGE_IDS.GROOVY,
    label: "Groovy",
    extensions: ["groovy", "gradle"],
    filenames: ["jenkinsfile", "gradlefile"],
    aliases: ["groovy", "gradle"],
  },
  {
    id: LANGUAGE_IDS.HAXE,
    label: "Haxe",
    extensions: ["hx", "hxml"],
    filenames: [],
    aliases: ["haxe", "hxml"],
  },
  {
    id: LANGUAGE_IDS.CRYSTAL,
    label: "Crystal",
    extensions: ["cr"],
    filenames: [],
    aliases: ["crystal"],
  },
  {
    id: LANGUAGE_IDS.D,
    label: "D",
    extensions: ["d", "di"],
    filenames: [],
    aliases: ["dlang"],
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
    id: LANGUAGE_IDS.ERLANG,
    label: "Erlang",
    extensions: ["erl", "hrl", "app.src"],
    filenames: ["rebar.config"],
    aliases: ["erlang", "erl"],
  },
  {
    id: LANGUAGE_IDS.CLOJURE,
    label: "Clojure",
    extensions: ["clj", "cljs", "cljc", "edn"],
    filenames: [],
    aliases: ["clojure", "clj"],
  },
  {
    id: LANGUAGE_IDS.COMMON_LISP,
    label: "Common Lisp",
    extensions: ["lisp", "lsp", "cl", "asd"],
    filenames: [],
    aliases: ["common-lisp", "commonlisp", "lisp"],
  },
  {
    id: LANGUAGE_IDS.SCHEME,
    label: "Scheme",
    extensions: ["scm", "ss", "sls", "sps"],
    filenames: [],
    aliases: ["scheme", "racket"],
  },
  {
    id: LANGUAGE_IDS.OCAML,
    label: "OCaml",
    extensions: ["ml", "mli", "mll", "mly"],
    filenames: ["dune"],
    aliases: ["ocaml", "ml"],
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
    id: LANGUAGE_IDS.VBSCRIPT,
    label: "VBScript",
    extensions: ["vbs", "vba", "asp"],
    filenames: [],
    aliases: ["vbscript", "vbs"],
  },
  {
    id: LANGUAGE_IDS.APL,
    label: "APL",
    extensions: ["apl", "dyalog"],
    filenames: [],
    aliases: ["apl"],
  },
  {
    id: LANGUAGE_IDS.BRAINFUCK,
    label: "Brainfuck",
    extensions: ["bf", "b"],
    filenames: [],
    aliases: ["brainfuck", "bf"],
  },
  {
    id: LANGUAGE_IDS.CYPHER,
    label: "Cypher",
    extensions: ["cypher", "cql"],
    filenames: [],
    aliases: ["cypher", "neo4j"],
  },
  {
    id: LANGUAGE_IDS.DTD,
    label: "DTD",
    extensions: ["dtd"],
    filenames: [],
    aliases: ["dtd"],
  },
  {
    id: LANGUAGE_IDS.EBNF,
    label: "EBNF",
    extensions: ["ebnf", "bnf"],
    filenames: [],
    aliases: ["ebnf", "bnf"],
  },
  {
    id: LANGUAGE_IDS.EIFFEL,
    label: "Eiffel",
    extensions: ["e"],
    filenames: [],
    aliases: ["eiffel"],
  },
  {
    id: LANGUAGE_IDS.FORTH,
    label: "Forth",
    extensions: ["forth", "frt", "4th"],
    filenames: [],
    aliases: ["forth"],
  },
  {
    id: LANGUAGE_IDS.GHERKIN,
    label: "Gherkin",
    extensions: ["feature"],
    filenames: [],
    aliases: ["gherkin", "cucumber"],
  },
  {
    id: LANGUAGE_IDS.IDL,
    label: "IDL",
    extensions: ["idl"],
    filenames: [],
    aliases: ["idl"],
  },
  {
    id: LANGUAGE_IDS.LIVESCRIPT,
    label: "LiveScript",
    extensions: ["ls"],
    filenames: [],
    aliases: ["livescript", "ls"],
  },
  {
    id: LANGUAGE_IDS.MODELICA,
    label: "Modelica",
    extensions: ["mo"],
    filenames: [],
    aliases: ["modelica"],
  },
  {
    id: LANGUAGE_IDS.NSIS,
    label: "NSIS",
    extensions: ["nsi", "nsh"],
    filenames: [],
    aliases: ["nsis"],
  },
  {
    id: LANGUAGE_IDS.RDF,
    label: "RDF",
    extensions: ["ttl", "nt", "nq", "trig"],
    filenames: [],
    aliases: ["rdf", "turtle", "ntriples", "sparql"],
  },
  {
    id: LANGUAGE_IDS.OCTAVE,
    label: "Octave",
    extensions: ["octave"],
    filenames: [],
    aliases: ["octave", "matlab"],
  },
  {
    id: LANGUAGE_IDS.PIG,
    label: "Pig",
    extensions: ["pig"],
    filenames: [],
    aliases: ["pig"],
  },
  {
    id: LANGUAGE_IDS.Q,
    label: "Q",
    extensions: ["q"],
    filenames: [],
    aliases: ["q", "kdb"],
  },
  {
    id: LANGUAGE_IDS.RPM_SPEC,
    label: "RPM Spec",
    extensions: ["spec"],
    filenames: [],
    aliases: ["rpm", "spec"],
  },
  {
    id: LANGUAGE_IDS.SMALLTALK,
    label: "Smalltalk",
    extensions: ["st"],
    filenames: [],
    aliases: ["smalltalk"],
  },
  {
    id: LANGUAGE_IDS.SIEVE,
    label: "Sieve",
    extensions: ["sieve", "siv"],
    filenames: [],
    aliases: ["sieve"],
  },
  {
    id: LANGUAGE_IDS.LATEX,
    label: "LaTeX",
    extensions: ["tex", "ltx", "sty", "cls"],
    filenames: [],
    aliases: ["latex", "tex"],
  },
  {
    id: LANGUAGE_IDS.TEXTILE,
    label: "Textile",
    extensions: ["textile"],
    filenames: [],
    aliases: ["textile"],
  },
  {
    id: LANGUAGE_IDS.VELOCITY,
    label: "Velocity",
    extensions: ["vm", "vtl"],
    filenames: [],
    aliases: ["velocity", "vtl"],
  },
  {
    id: LANGUAGE_IDS.XQUERY,
    label: "XQuery",
    extensions: ["xq", "xquery", "xql", "xqm"],
    filenames: [],
    aliases: ["xquery", "xq"],
  },
  {
    id: LANGUAGE_IDS.Z80,
    label: "Z80",
    extensions: ["z80"],
    filenames: [],
    aliases: ["z80"],
  },
  {
    id: LANGUAGE_IDS.GLSL,
    label: "GLSL",
    extensions: ["glsl", "vert", "frag", "geom", "tesc", "tese", "comp"],
    filenames: [],
    aliases: ["glsl", "shader"],
    editorGrammarId: "wgsl",
  },  {
    id: LANGUAGE_IDS.OBJECTIVE_C,
    label: "Objective-C",
    extensions: ["m", "mm"],
    filenames: [],
    aliases: ["objective-c", "objc"],
  },
  {
    id: LANGUAGE_IDS.VHDL,
    label: "VHDL",
    extensions: ["vhd", "vhdl"],
    filenames: [],
    aliases: ["vhdl"],
  },
  {
    id: LANGUAGE_IDS.ASM,
    label: "Assembly",
    extensions: ["asm", "s", "S"],
    filenames: [],
    aliases: ["asm", "assembly", "gas"],
  },
  {
    id: LANGUAGE_IDS.WASM,
    label: "WebAssembly",
    extensions: ["wat", "wast"],
    filenames: [],
    aliases: ["wasm", "wat", "wast"],
  },
  {
    id: LANGUAGE_IDS.WEBIDL,
    label: "Web IDL",
    extensions: ["webidl"],
    filenames: [],
    aliases: ["webidl", "web-idl"],
  },
  {
    id: LANGUAGE_IDS.TCL,
    label: "Tcl",
    extensions: ["tcl", "tm"],
    filenames: [],
    aliases: ["tcl", "tk"],
  },
  {
    id: LANGUAGE_IDS.MATHEMATICA,
    label: "Wolfram",
    extensions: ["wl", "wls", "nb"],
    filenames: [],
    aliases: ["wolfram", "mathematica"],
  },
  {
    id: LANGUAGE_IDS.SAS,
    label: "SAS",
    extensions: ["sas"],
    filenames: [],
    aliases: ["sas"],
  },
  {
    id: LANGUAGE_IDS.PUPPET,
    label: "Puppet",
    extensions: ["pp"],
    filenames: ["puppetfile"],
    aliases: ["puppet"],
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
    id: LANGUAGE_IDS.ASN1,
    label: "ASN.1",
    extensions: ["asn", "asn1"],
    filenames: [],
    aliases: ["asn1", "asn.1"],
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
    id: LANGUAGE_IDS.HANDLEBARS,
    label: "Handlebars",
    extensions: ["hbs", "handlebars"],
    filenames: [],
    aliases: ["handlebars", "hbs"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.MUSTACHE,
    label: "Mustache",
    extensions: ["mustache"],
    filenames: [],
    aliases: ["mustache"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.EJS,
    label: "EJS",
    extensions: ["ejs"],
    filenames: [],
    aliases: ["ejs"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.LIQUID,
    label: "Liquid",
    extensions: ["liquid"],
    filenames: [],
    aliases: ["liquid"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.NUNJUCKS,
    label: "Nunjucks",
    extensions: ["njk", "nunjucks"],
    filenames: [],
    aliases: ["nunjucks", "njk"],
    editorGrammarId: "html",
  },
  {
    id: LANGUAGE_IDS.NGINX,
    label: "NGINX",
    extensions: ["nginxconf"],
    filenames: ["nginx.conf", "mime.types", "fastcgi_params", "uwsgi_params", "scgi_params"],
    aliases: ["nginx", "nginxconf"],
  },
  {
    id: LANGUAGE_IDS.PUG,
    label: "Pug",
    extensions: ["pug", "jade"],
    filenames: [],
    aliases: ["pug", "jade"],
  },
  {
    id: LANGUAGE_IDS.JINJA,
    label: "Jinja",
    extensions: ["jinja", "jinja2", "j2"],
    filenames: [],
    aliases: ["jinja", "jinja2"],
  },
  {
    id: LANGUAGE_IDS.HTTP,
    label: "HTTP",
    extensions: ["http", "rest"],
    filenames: [],
    aliases: ["http", "rest"],
  },
  {
    id: LANGUAGE_IDS.CSV,
    label: "CSV",
    extensions: ["csv", "tsv", "tab", "psv"],
    filenames: [],
    aliases: ["csv", "tsv"],
  },
  {
    id: LANGUAGE_IDS.DIFF,
    label: "Diff",
    extensions: ["diff", "patch", "rej"],
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
    filenames: [
      ".env",
      ".envrc",
      ".env.local",
      ".env.development",
      ".env.production",
      ".env.test",
      ".env.staging",
      ".env.example",
      ".env.sample",
      ".env.template",
      ".env.defaults",
      ".env.dist",
    ],
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

  if (basename.startsWith(".env.")) {
    return getLanguageDefinition(LANGUAGE_IDS.ENV);
  }
  if (basename.startsWith("dockerfile.") || basename.startsWith("containerfile.")) {
    return getLanguageDefinition(LANGUAGE_IDS.DOCKERFILE);
  }
  if (basename.startsWith("makefile.")) {
    return getLanguageDefinition(LANGUAGE_IDS.MAKEFILE);
  }

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
