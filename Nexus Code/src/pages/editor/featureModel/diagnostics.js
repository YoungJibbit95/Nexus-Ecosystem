import { lspRangeToCodeMirrorRange } from "./textEdits.js";



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


export function coerceDiagnosticSummary(diagnostics, enabled) {
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
