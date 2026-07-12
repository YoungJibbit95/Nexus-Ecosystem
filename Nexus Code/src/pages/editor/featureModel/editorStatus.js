import { getLanguageDisplayName, LANGUAGE_IDS, normalizeLanguageId } from "../../../ide/languages/languageIds.js";
import { coerceDiagnosticSummary } from "./diagnostics.js";

const LARGE_FILE_CHAR_THRESHOLD_DEFAULT = 220_000;
const HUGE_FILE_CHAR_THRESHOLD_DEFAULT = 650_000;
const LARGE_FILE_LINE_THRESHOLD_DEFAULT = 7_500;
const HUGE_FILE_LINE_THRESHOLD_DEFAULT = 18_000;

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

function createEditorEngineStatus(editorFallbackReason) {
  const reason = String(editorFallbackReason || "").trim();
  if (!reason) {
    return {
      label: "CodeMirror 6",
      title: "CodeMirror 6 editor",
      tone: "text-gray-500",
    };
  }

  return {
    label: "Textarea fallback",
    title: `Textarea fallback aktiv: ${reason}`,
    tone: "text-amber-400",
  };
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
  const engineStatus = createEditorEngineStatus(options.editorFallbackReason);
  return {
    language: {
      id: languageId,
      label: languageLabel,
      title: `${languageLabel} (${languageId})`,
    },
    engine: engineStatus,
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
