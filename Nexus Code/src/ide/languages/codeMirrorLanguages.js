import { StreamLanguage, LanguageDescription } from "@codemirror/language";
import {
  getEditorGrammarId,
  getLanguageDisplayName,
  LANGUAGE_IDS,
  normalizeLanguageId,
} from "./languageIds.js";

const EMPTY_EXTENSION = Object.freeze([]);
const LOAD_CACHE = new Map();

function lowerResourceName(fileName) {
  return String(fileName || "")
    .trim()
    .toLowerCase();
}

function streamGrammar(parser) {
  return parser ? StreamLanguage.define(parser) : EMPTY_EXTENSION;
}

function normalizeExtension(extension) {
  if (!extension) return EMPTY_EXTENSION;
  return Array.isArray(extension) ? extension : [extension];
}

function createMarkdownCodeLanguageDescriptions() {
  return [
    ["javascript", ["js", "jsx", "node"], ["js", "jsx", "mjs", "cjs"]],
    ["typescript", ["ts", "tsx"], ["ts", "tsx", "mts", "cts"]],
    ["python", ["py"], ["py", "pyw", "pyi"]],
    ["rust", ["rs"], ["rs"]],
    ["go", ["golang"], ["go"]],
    ["css", ["scss", "less"], ["css", "scss", "less"]],
    ["json", ["jsonc"], ["json", "jsonc"]],
    ["html", ["xml"], ["html", "htm", "xml"]],
    ["shell", ["bash", "sh", "zsh"], ["sh", "bash", "zsh"]],
    ["sql", [], ["sql"]],
  ].map(([name, alias, extensions]) =>
    LanguageDescription.of({
      name,
      alias,
      extensions,
      async load() {
        const result = await loadCodeMirrorLanguageExtension(name, `index.${extensions[0]}`);
        return result.extension[0] || EMPTY_EXTENSION;
      },
    }),
  );
}

const LANGUAGE_LOADERS = Object.freeze({
  [LANGUAGE_IDS.JAVASCRIPT]: async ({ fileName }) => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ jsx: lowerResourceName(fileName).endsWith(".jsx") });
  },
  [LANGUAGE_IDS.TYPESCRIPT]: async ({ fileName }) => {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({
      typescript: true,
      jsx: lowerResourceName(fileName).endsWith(".tsx"),
    });
  },
  [LANGUAGE_IDS.JSON]: async () => {
    const { json } = await import("@codemirror/lang-json");
    return json();
  },
  [LANGUAGE_IDS.HTML]: async () => {
    const { html } = await import("@codemirror/lang-html");
    return html({ matchClosingTags: true });
  },
  [LANGUAGE_IDS.CSS]: async () => {
    const { css } = await import("@codemirror/lang-css");
    return css();
  },
  [LANGUAGE_IDS.MARKDOWN]: async () => {
    const { markdown } = await import("@codemirror/lang-markdown");
    return markdown({ codeLanguages: createMarkdownCodeLanguageDescriptions() });
  },
  [LANGUAGE_IDS.PYTHON]: async () => {
    const { python } = await import("@codemirror/lang-python");
    return python();
  },
  [LANGUAGE_IDS.GO]: async () => {
    const { go } = await import("@codemirror/legacy-modes/mode/go");
    return streamGrammar(go);
  },
  [LANGUAGE_IDS.JAVA]: async () => {
    const { java } = await import("@codemirror/lang-java");
    return java();
  },
  [LANGUAGE_IDS.CSHARP]: async () => {
    const { csharp } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(csharp);
  },
  [LANGUAGE_IDS.OBJECTIVE_C]: async () => {
    const { objectiveC } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(objectiveC);
  },
  [LANGUAGE_IDS.KOTLIN]: async () => {
    const { kotlin } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(kotlin);
  },
  [LANGUAGE_IDS.SCALA]: async () => {
    const { scala } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(scala);
  },
  [LANGUAGE_IDS.ELIXIR]: async () => {
    const { erlang } = await import("@codemirror/legacy-modes/mode/erlang");
    return streamGrammar(erlang);
  },
  [LANGUAGE_IDS.DART]: async () => {
    const { dart } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(dart);
  },
  [LANGUAGE_IDS.CPP]: async () => {
    const { cpp } = await import("@codemirror/lang-cpp");
    return cpp();
  },
  [LANGUAGE_IDS.PHP]: async () => {
    const { php } = await import("@codemirror/lang-php");
    return php();
  },
  [LANGUAGE_IDS.RUST]: async () => {
    const { rust } = await import("@codemirror/lang-rust");
    return rust();
  },
  [LANGUAGE_IDS.SQL]: async () => {
    const { sql } = await import("@codemirror/lang-sql");
    return sql();
  },
  [LANGUAGE_IDS.XML]: async () => {
    const { xml } = await import("@codemirror/lang-xml");
    return xml();
  },
  [LANGUAGE_IDS.YAML]: async () => {
    const { yaml } = await import("@codemirror/legacy-modes/mode/yaml");
    return streamGrammar(yaml);
  },
  [LANGUAGE_IDS.SHELL]: async () => {
    const { shell } = await import("@codemirror/legacy-modes/mode/shell");
    return streamGrammar(shell);
  },
  [LANGUAGE_IDS.POWERSHELL]: async () => {
    const { powerShell } = await import("@codemirror/legacy-modes/mode/powershell");
    return streamGrammar(powerShell);
  },
  [LANGUAGE_IDS.DOCKERFILE]: async () => {
    const { dockerFile } = await import("@codemirror/legacy-modes/mode/dockerfile");
    return streamGrammar(dockerFile);
  },
  [LANGUAGE_IDS.CMAKE]: async () => {
    const { cmake } = await import("@codemirror/legacy-modes/mode/cmake");
    return streamGrammar(cmake);
  },
  [LANGUAGE_IDS.TOML]: async () => {
    const { toml } = await import("@codemirror/legacy-modes/mode/toml");
    return streamGrammar(toml);
  },
  [LANGUAGE_IDS.INI]: async () => {
    const { properties } = await import("@codemirror/legacy-modes/mode/properties");
    return streamGrammar(properties);
  },
  [LANGUAGE_IDS.RUBY]: async () => {
    const { ruby } = await import("@codemirror/legacy-modes/mode/ruby");
    return streamGrammar(ruby);
  },
  [LANGUAGE_IDS.SWIFT]: async () => {
    const { swift } = await import("@codemirror/legacy-modes/mode/swift");
    return streamGrammar(swift);
  },
  [LANGUAGE_IDS.LUA]: async () => {
    const { lua } = await import("@codemirror/legacy-modes/mode/lua");
    return streamGrammar(lua);
  },
  [LANGUAGE_IDS.R]: async () => {
    const { r } = await import("@codemirror/legacy-modes/mode/r");
    return streamGrammar(r);
  },
  [LANGUAGE_IDS.PERL]: async () => {
    const { perl } = await import("@codemirror/legacy-modes/mode/perl");
    return streamGrammar(perl);
  },
  [LANGUAGE_IDS.CLOJURE]: async () => {
    const { clojure } = await import("@codemirror/legacy-modes/mode/clojure");
    return streamGrammar(clojure);
  },
  [LANGUAGE_IDS.FSHARP]: async () => {
    const { fSharp } = await import("@codemirror/legacy-modes/mode/mllike");
    return streamGrammar(fSharp);
  },
  [LANGUAGE_IDS.VB]: async () => {
    const { vb } = await import("@codemirror/legacy-modes/mode/vb");
    return streamGrammar(vb);
  },
  [LANGUAGE_IDS.GRAPHQL]: async () => {
    const { sparql } = await import("@codemirror/legacy-modes/mode/sparql");
    return streamGrammar(sparql);
  },
  [LANGUAGE_IDS.SOLIDITY]: async () => {
    const { clike } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(clike);
  },
  [LANGUAGE_IDS.HCL]: async () => {
    const { properties } = await import("@codemirror/legacy-modes/mode/properties");
    return streamGrammar(properties);
  },
  [LANGUAGE_IDS.BICEP]: async () => {
    const { clike } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(clike);
  },
  [LANGUAGE_IDS.WGSL]: async () => {
    const { shader } = await import("@codemirror/legacy-modes/mode/clike");
    return streamGrammar(shader);
  },
  [LANGUAGE_IDS.CSV]: async () => {
    const { spreadsheet } = await import("@codemirror/legacy-modes/mode/spreadsheet");
    return streamGrammar(spreadsheet);
  },
  [LANGUAGE_IDS.SYSTEMVERILOG]: async () => {
    const { verilog } = await import("@codemirror/legacy-modes/mode/verilog");
    return streamGrammar(verilog);
  },
  [LANGUAGE_IDS.PROTOBUF]: async () => {
    const { protobuf } = await import("@codemirror/legacy-modes/mode/protobuf");
    return streamGrammar(protobuf);
  },
  [LANGUAGE_IDS.DIFF]: async () => {
    const { diff } = await import("@codemirror/legacy-modes/mode/diff");
    return streamGrammar(diff);
  },
  [LANGUAGE_IDS.LOG]: async () => {
    const { shell } = await import("@codemirror/legacy-modes/mode/shell");
    return streamGrammar(shell);
  },
});

const GRAMMAR_ALIASES = Object.freeze({
  [LANGUAGE_IDS.JSONC]: LANGUAGE_IDS.JSON,
  [LANGUAGE_IDS.VUE]: LANGUAGE_IDS.HTML,
  [LANGUAGE_IDS.SVELTE]: LANGUAGE_IDS.HTML,
  [LANGUAGE_IDS.ASTRO]: LANGUAGE_IDS.HTML,
  [LANGUAGE_IDS.SCSS]: LANGUAGE_IDS.CSS,
  [LANGUAGE_IDS.LESS]: LANGUAGE_IDS.CSS,
  [LANGUAGE_IDS.MDX]: LANGUAGE_IDS.MARKDOWN,
  [LANGUAGE_IDS.C]: LANGUAGE_IDS.CPP,
  [LANGUAGE_IDS.BAT]: LANGUAGE_IDS.SHELL,
  [LANGUAGE_IDS.ENV]: LANGUAGE_IDS.SHELL,
  [LANGUAGE_IDS.MAKEFILE]: LANGUAGE_IDS.SHELL,
  [LANGUAGE_IDS.VERILOG]: LANGUAGE_IDS.SYSTEMVERILOG,
});

function resolveGrammarId(languageId) {
  const normalizedLanguageId = normalizeLanguageId(languageId);
  const editorGrammarId = normalizeLanguageId(
    getEditorGrammarId(normalizedLanguageId),
    normalizedLanguageId,
  );
  return GRAMMAR_ALIASES[editorGrammarId] || editorGrammarId;
}

function getGrammarSupportKind(grammarId) {
  if (LANGUAGE_LOADERS[grammarId]) return "native";
  return "plaintext";
}

function createLanguageSupportMetadata({ languageId, grammarId, hasLoader }) {
  const isAliasFallback = languageId !== grammarId;
  const grammarLabel = getLanguageDisplayName(grammarId);
  const languageLabel = getLanguageDisplayName(languageId);

  if (!hasLoader) {
    return {
      supportLevel: "plaintext",
      statusLabel: "Plain Text fallback",
      statusDescription: `${languageLabel} hat noch keine CodeMirror-Grammatik und wird als Plain Text angezeigt.`,
      grammarLabel,
      grammarSource: "none",
      isAliasFallback,
      fallbackReason: "missing-loader",
    };
  }

  if (isAliasFallback) {
    return {
      supportLevel: "alias",
      statusLabel: `${grammarLabel}-Fallback`,
      statusDescription: `${languageLabel} nutzt die ${grammarLabel}-Grammatik fuer Syntax-Highlighting.`,
      grammarLabel,
      grammarSource: "alias",
      isAliasFallback,
      fallbackReason: "grammar-alias",
    };
  }

  return {
    supportLevel: getGrammarSupportKind(grammarId),
    statusLabel: "Syntax-Highlighting bereit",
    statusDescription: `${languageLabel} nutzt eine direkte CodeMirror-Grammatik.`,
    grammarLabel,
    grammarSource: "direct",
    isAliasFallback,
    fallbackReason: null,
  };
}

export function getCodeMirrorLanguageSupportDescriptor(languageId, fileName = "") {
  const normalizedLanguageId = normalizeLanguageId(languageId);
  const grammarId = resolveGrammarId(normalizedLanguageId);
  const loader = LANGUAGE_LOADERS[grammarId] || null;
  const lowerName = lowerResourceName(fileName);
  const variant =
    grammarId === LANGUAGE_IDS.JAVASCRIPT && lowerName.endsWith(".jsx")
      ? "jsx"
      : grammarId === LANGUAGE_IDS.TYPESCRIPT && lowerName.endsWith(".tsx")
        ? "tsx"
        : "default";
  const metadata = createLanguageSupportMetadata({
    languageId: normalizedLanguageId,
    grammarId,
    hasLoader: Boolean(loader),
  });

  return Object.freeze({
    key: `${grammarId}:${variant}`,
    languageId: normalizedLanguageId,
    grammarId,
    label: getLanguageDisplayName(normalizedLanguageId),
    ...metadata,
    loaded: false,
    status: loader ? "loading" : "fallback",
    extension: EMPTY_EXTENSION,
    hasLoader: Boolean(loader),
  });
}

export function createCodeMirrorLanguageFallback(languageId, fileName = "") {
  return getCodeMirrorLanguageSupportDescriptor(languageId, fileName);
}

export async function loadCodeMirrorLanguageExtension(languageId, fileName = "") {
  const descriptor = getCodeMirrorLanguageSupportDescriptor(languageId, fileName);
  const loader = LANGUAGE_LOADERS[descriptor.grammarId];
  if (!loader) {
    return {
      ...descriptor,
      loaded: false,
      status: "fallback",
      extension: EMPTY_EXTENSION,
    };
  }

  const cacheKey = descriptor.key;
  if (!LOAD_CACHE.has(cacheKey)) {
    LOAD_CACHE.set(
      cacheKey,
      loader({ ...descriptor, fileName })
        .then((extension) => ({
          ...descriptor,
          loaded: true,
          status: "ready",
          extension: normalizeExtension(extension),
        }))
        .catch((error) => ({
          ...descriptor,
          loaded: false,
          status: "fallback",
          statusLabel: "Syntax-Fallback aktiv",
          statusDescription: `${descriptor.label} konnte nicht geladen werden und wird ohne Sprachgrammatik angezeigt.`,
          fallbackReason: "load-error",
          extension: EMPTY_EXTENSION,
          error,
        })),
    );
  }

  return LOAD_CACHE.get(cacheKey);
}
