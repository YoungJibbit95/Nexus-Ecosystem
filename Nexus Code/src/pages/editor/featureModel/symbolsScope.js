import { LANGUAGE_IDS, normalizeLanguageId } from "../../../ide/languages/languageIds.js";
import { RESERVED_SYMBOL_NAMES } from "./completionCatalog.js";

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
