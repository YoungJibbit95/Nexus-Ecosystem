import { insertCompletionText, pickedCompletion, snippet, snippetCompletion } from "@codemirror/autocomplete";
import { LANGUAGE_IDS, normalizeLanguageId } from "../../../ide/languages/languageIds.js";
import { lspRangeToCodeMirrorRange } from "./textEdits.js";
import { readMarkupContent } from "./lspMarkup.js";
import {
  COMPLETION_KIND_NAMES,
  COMPLETION_KIND_TYPES,
  COMPLETION_LIMIT_MAX,
  COMPLETION_LIMIT_MIN,
  COMPLETION_LSP_SCAN_FACTOR,
  COMPLETION_LSP_SCAN_MAX,
  COMPLETION_MATCH_PATTERN,
  COMPLETION_ORIGINS,
  COMPLETION_SECTIONS,
  CSS_COMPLETION_MATCH_PATTERN,
  LANGUAGE_COMPLETION_MAP,
  LOCAL_COMPLETION_IMPLICIT_MIN_LENGTH,
  LOCAL_COMPLETION_MAX_ITEMS,
  LOCAL_COMPLETION_MAX_TEXT,
  LOCAL_COMPLETION_MIN_PREFIX_FALLBACK,
  LOCAL_COMPLETION_SECTION,
  LOCAL_COMPLETION_WORD_PATTERN,
  LSP_COMPLETION_DEPRECATED_TAG,
  MARKDOWN_COMPLETION_MATCH_PATTERN,
  RESERVED_SYMBOL_NAMES,
  SNIPPET_PLACEHOLDER_PATTERN,
  WORD_COMPLETION_PATTERN,
} from "./completionCatalog.js";

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
