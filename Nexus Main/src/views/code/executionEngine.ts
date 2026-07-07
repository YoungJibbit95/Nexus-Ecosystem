export type CodeExecutionFile = {
  lang: string;
  content: string;
  name?: string;
};

type NativeExecutionResult = {
  ok: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  runtime?: string;
  timeout?: boolean;
  unsupported?: boolean;
};

type RuntimeHelp = {
  label: string;
  runtime: string;
  command: (fileName: string) => string;
  bridgeSupported?: boolean;
  note?: string;
};

type NativeAttempt =
  | { status: "unavailable"; reason: string }
  | { status: "unsupported"; reason: string }
  | { status: "handled"; output: string };

type TypeScriptTranspileResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

const LOCAL_JS_TIMEOUT_MS = 3_000;
const MAX_LOCAL_OUTPUT_CHARS = 80_000;

const RUNTIME_HELP: Record<string, RuntimeHelp> = {
  javascript: {
    label: "JavaScript",
    runtime: "Node.js or Nexus local worker",
    bridgeSupported: true,
    command: (fileName) => `node ${fileName}`,
  },
  typescript: {
    label: "TypeScript",
    runtime: "tsx or Node.js with type stripping",
    bridgeSupported: true,
    command: (fileName) => `tsx ${fileName}`,
    note: "The renderer fallback transpiles TypeScript without type checking.",
  },
  python: {
    label: "Python",
    runtime: "Python 3",
    bridgeSupported: true,
    command: (fileName) => `python ${fileName}`,
  },
  bash: {
    label: "Bash",
    runtime: "bash",
    bridgeSupported: true,
    command: (fileName) => `bash ${fileName}`,
  },
  cpp: {
    label: "C++",
    runtime: "g++ or clang++",
    command: (fileName) => `g++ -std=c++17 ${fileName} -o main && ./main`,
  },
  c: {
    label: "C",
    runtime: "gcc or clang",
    command: (fileName) => `gcc ${fileName} -o main && ./main`,
  },
  java: {
    label: "Java",
    runtime: "JDK",
    command: (fileName) => `javac ${fileName} && java ${classNameFromFile(fileName)}`,
  },
  rust: {
    label: "Rust",
    runtime: "rustc",
    command: (fileName) => `rustc ${fileName} -o main && ./main`,
  },
  go: {
    label: "Go",
    runtime: "Go toolchain",
    command: (fileName) => `go run ${fileName}`,
  },
  sql: {
    label: "SQL",
    runtime: "database connection",
    command: (fileName) => `Run ${fileName} in a configured SQL connection`,
    note: "Nexus Main does not attach snippets to a database automatically.",
  },
  html: {
    label: "HTML",
    runtime: "browser preview",
    command: () => "Use the Preview tab",
  },
  css: {
    label: "CSS",
    runtime: "browser preview",
    command: () => "Use the Preview tab",
  },
  markdown: {
    label: "Markdown",
    runtime: "Markdown preview",
    command: () => "Use the Preview tab",
  },
  json: {
    label: "JSON",
    runtime: "JSON parser",
    command: (fileName) => `Parse ${fileName}`,
  },
  plaintext: {
    label: "Text",
    runtime: "none",
    command: () => "No command",
  },
};

const EXT_BY_LANG: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  bash: "sh",
  cpp: "cpp",
  c: "c",
  java: "java",
  rust: "rs",
  go: "go",
  sql: "sql",
  html: "html",
  css: "css",
  markdown: "md",
  json: "json",
  plaintext: "txt",
};

const OUTPUT_PATTERNS: Record<string, RegExp> = {
  javascript: /\bconsole\.(log|warn|error|info|table|dir)\s*\(/g,
  typescript: /\bconsole\.(log|warn|error|info|table|dir)\s*\(/g,
  python: /\bprint\s*\(/g,
  bash: /^\s*echo\b/gm,
  cpp: /\b(cout\s*<<|printf\s*\()/g,
  c: /\bprintf\s*\(/g,
  java: /\bSystem\.out\.print(?:ln)?\s*\(/g,
  rust: /\bprintln!\s*\(/g,
  go: /\bfmt\.Print(?:ln|f)?\s*\(/g,
  sql: /\b(select|insert|update|delete|create|alter|drop)\b/gi,
};

function classNameFromFile(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return baseName || "Main";
}

function normalizeLang(lang: string): string {
  return String(lang || "plaintext").trim().toLowerCase();
}

function getRuntimeHelp(lang: string): RuntimeHelp {
  return RUNTIME_HELP[lang] ?? {
    label: lang || "Unknown",
    runtime: "external runtime",
    command: (fileName) => `Run ${fileName} with the matching runtime`,
  };
}

function getDisplayFileName(file: CodeExecutionFile, lang: string): string {
  const name = file.name?.trim();
  if (name) return name;
  const ext = EXT_BY_LANG[lang] ?? "txt";
  return `snippet.${ext}`;
}

function countMatches(code: string, pattern: RegExp): number {
  const matches = code.match(pattern);
  return matches ? matches.length : 0;
}

function buildStaticSummary(lang: string, code: string): string[] {
  const trimmed = code.trim();
  const lines = trimmed ? code.split(/\r?\n/).length : 0;
  const outputPattern = OUTPUT_PATTERNS[lang];
  const outputStatements = outputPattern ? countMatches(code, outputPattern) : 0;
  const imports = countMatches(
    code,
    /^\s*(import|from|#include|using|package|require\s*\(|use\s+|mod\s+)/gm,
  );
  const functions = countMatches(
    code,
    /\b(function|def|class|fn|func)\b|=>|\bmain\s*\(/g,
  );

  return [
    `Static scan: ${lines} line${lines === 1 ? "" : "s"}, ${code.length} characters`,
    `Output statements detected: ${outputStatements}`,
    `Imports/includes detected: ${imports}`,
    `Functions/classes detected: ${functions}`,
    "No stdout was simulated.",
  ];
}

function formatNativeResult(lang: string, result: NativeExecutionResult): string {
  const help = getRuntimeHelp(lang);
  const runtime = result.runtime ? `Runtime: ${result.runtime}` : `Runtime: ${help.runtime}`;
  const exitCode =
    typeof result.exitCode === "number" ? `Exit code: ${result.exitCode}` : null;
  const output = (result.output || "").trimEnd();
  const error = (result.error || "").trim();
  const status = result.ok ? "[run]" : "[error]";
  const title = result.ok
    ? `${status} ${help.label} executed`
    : `${status} ${help.label} execution failed`;
  const details = [
    title,
    runtime,
    exitCode,
    result.timeout ? "Timed out: yes" : null,
  ].filter(Boolean) as string[];
  const body: string[] = [];

  if (output) {
    body.push("Output:", output);
  }
  if (error) {
    body.push("Error:", error);
  }
  if (!output && !error) {
    body.push(result.ok ? "Process exited successfully." : "Process exited without output.");
  }

  return [...details, "", ...body].join("\n");
}

async function tryNativeExecution(file: CodeExecutionFile, lang: string): Promise<NativeAttempt> {
  const api = window.api?.code?.execute;
  if (!api) {
    return {
      status: "unavailable",
      reason: "Native execution bridge is not available in this session.",
    };
  }

  try {
    const result = await api({
      lang,
      code: file.content,
      fileName: file.name,
    });

    if (!result || result.unsupported) {
      return {
        status: "unsupported",
        reason:
          result?.error ||
          `The Nexus Main execution bridge does not provide a ${getRuntimeHelp(lang).label} runtime.`,
      };
    }

    return {
      status: "handled",
      output: formatNativeResult(lang, result),
    };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "Native execution bridge failed.",
    };
  }
}

function hasModuleSyntax(code: string): boolean {
  return /^\s*(import|export)\s+(?!\()/m.test(code);
}

function buildWorkerSource(code: string): string {
  const userCode = JSON.stringify(`"use strict";\n${code}\n`);
  return `
const formatValue = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "undefined") return "undefined";
  if (typeof value === "function") return "[Function " + (value.name || "anonymous") + "]";
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
const blocked = (name) => () => {
  throw new Error(name + " is disabled in the Nexus local snippet runner");
};
const sendLine = (line) => self.postMessage({ type: "line", line });
const runnerConsole = {};
for (const level of ["log", "info", "warn", "error", "dir", "table"]) {
  runnerConsole[level] = (...args) => sendLine(args.map(formatValue).join(" "));
}
try {
  self.fetch = blocked("fetch");
  self.XMLHttpRequest = undefined;
  self.WebSocket = undefined;
  self.EventSource = undefined;
  self.importScripts = blocked("importScripts");
} catch {}
(async () => {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction(
      "console",
      "fetch",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "importScripts",
      "Worker",
      "SharedWorker",
      "document",
      "window",
      ${userCode},
    );
    const result = await fn(
      runnerConsole,
      blocked("fetch"),
      undefined,
      undefined,
      undefined,
      blocked("importScripts"),
      undefined,
      undefined,
      undefined,
      undefined,
    );
    if (typeof result !== "undefined") sendLine(formatValue(result));
    self.postMessage({ type: "done", ok: true });
  } catch (error) {
    self.postMessage({
      type: "done",
      ok: false,
      error: error && (error.stack || error.message) ? error.stack || error.message : String(error),
    });
  }
})();
`;
}

function runJavaScriptWorker(code: string, lang: string, nativeReason?: string): Promise<string> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    let outputChars = 0;
    let truncated = false;
    let settled = false;
    const blob = new Blob([buildWorkerSource(code)], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    let worker: Worker;

    try {
      worker = new Worker(url);
    } catch (error) {
      URL.revokeObjectURL(url);
      const help = getRuntimeHelp(lang);
      resolve(
        [
          `[error] ${help.label} local worker failed`,
          "Runtime: browser Worker sandbox",
          nativeReason ? `Native bridge: ${nativeReason}` : null,
          "",
          "Error:",
          error instanceof Error ? error.message : "Worker could not be created.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      return;
    }

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    const appendLine = (line: string) => {
      if (truncated) return;
      const text = String(line);
      outputChars += text.length + 1;
      if (outputChars > MAX_LOCAL_OUTPUT_CHARS) {
        truncated = true;
        lines.push("... output truncated ...");
        return;
      }
      lines.push(text);
    };

    const finish = (ok: boolean, error?: string, timedOut = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      const help = getRuntimeHelp(lang);
      const status = ok ? "[run]" : "[error]";
      const effectiveError = error || (timedOut ? `Execution timed out after ${LOCAL_JS_TIMEOUT_MS}ms.` : undefined);
      const header = [
        ok
          ? `${status} ${help.label} executed in local worker`
          : `${status} ${help.label} local worker failed`,
        "Runtime: browser Worker sandbox",
        nativeReason ? `Native bridge: ${nativeReason}` : null,
        timedOut ? `Timed out after ${LOCAL_JS_TIMEOUT_MS}ms` : null,
      ].filter(Boolean) as string[];

      if (effectiveError) {
        resolve([...header, "", "Error:", effectiveError].join("\n"));
        return;
      }

      resolve([...header, "", ...(lines.length ? lines : ["Process exited successfully."])].join("\n"));
    };

    const timeout = window.setTimeout(() => finish(false, undefined, true), LOCAL_JS_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<{ type: string; line?: string; ok?: boolean; error?: string }>) => {
      const message = event.data;
      if (!message || settled) return;
      if (message.type === "line") {
        appendLine(message.line ?? "");
        return;
      }
      if (message.type === "done") {
        window.clearTimeout(timeout);
        finish(Boolean(message.ok), message.error);
      }
    };

    worker.onerror = (event) => {
      window.clearTimeout(timeout);
      finish(false, event.message || "Worker execution failed.");
    };
  });
}

async function transpileTypeScript(code: string): Promise<TypeScriptTranspileResult> {
  try {
    const ts = await import("typescript");
    const result = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        isolatedModules: true,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      },
      reportDiagnostics: true,
    });

    const blockingDiagnostics = (result.diagnostics || []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    if (blockingDiagnostics.length) {
      return {
        ok: false,
        error: blockingDiagnostics
          .slice(0, 3)
          .map((diagnostic) => {
            const text = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            return diagnostic.code ? `TS${diagnostic.code}: ${text}` : text;
          })
          .join("\n"),
      };
    }

    return { ok: true, code: result.outputText };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "TypeScript transpiler is unavailable.",
    };
  }
}

async function runLocalJavaScript(
  file: CodeExecutionFile,
  lang: "javascript" | "typescript",
  nativeReason?: string,
): Promise<string> {
  if (hasModuleSyntax(file.content)) {
    return buildRuntimeNotice(file, lang, "Local worker fallback cannot run module import/export syntax.", nativeReason);
  }

  if (lang === "javascript") {
    return runJavaScriptWorker(file.content, lang, nativeReason);
  }

  const transpiled = await transpileTypeScript(file.content);
  if (transpiled.ok === false) {
    return buildRuntimeNotice(file, lang, `TypeScript could not be transpiled: ${transpiled.error}`, nativeReason);
  }
  if (hasModuleSyntax(transpiled.code)) {
    return buildRuntimeNotice(file, lang, "Transpiled output still contains module syntax.", nativeReason);
  }

  return runJavaScriptWorker(transpiled.code, lang, nativeReason);
}

function runJSON(code: string): string {
  try {
    const parsed = JSON.parse(code);
    const shape = Array.isArray(parsed)
      ? `Array[${parsed.length}]`
      : parsed && typeof parsed === "object"
        ? `Object{${Object.keys(parsed).length} keys}`
        : typeof parsed;

    return ["[ok] JSON parsed successfully", `Shape: ${shape}`, "", JSON.stringify(parsed, null, 2)].join("\n");
  } catch (error) {
    return [
      "[error] JSON parse failed",
      error instanceof Error ? error.message : "Invalid JSON.",
    ].join("\n");
  }
}

function runPreviewNotice(file: CodeExecutionFile, lang: string): string {
  const help = getRuntimeHelp(lang);
  const code = file.content;
  const previewFacts: Record<string, string> = {
    html: `HTML tags detected: ${countMatches(code, /<[a-z][^>]*>/gi)}`,
    css: `CSS rules detected: ${countMatches(code, /\{[^}]*\}/g)}`,
    markdown: `Headings detected: ${countMatches(code, /^#{1,6}\s/gm)}`,
    plaintext: `Characters: ${code.length}`,
  };

  return [
    "[preview] Not a compiler target",
    `Language: ${help.label} (${lang})`,
    `Open: ${help.command(getDisplayFileName(file, lang))}`,
    previewFacts[lang] ?? "Preview is available in the editor.",
  ].join("\n");
}

function buildRuntimeNotice(
  file: CodeExecutionFile,
  lang: string,
  reason: string,
  nativeReason?: string,
): string {
  const help = getRuntimeHelp(lang);
  const fileName = getDisplayFileName(file, lang);
  const details = [
    "[not-run] Snippet was not executed",
    `Language: ${help.label} (${lang})`,
    `Runtime needed: ${help.runtime}`,
    "Expected command:",
    `  ${help.command(fileName)}`,
    `Status: ${reason}`,
    nativeReason && nativeReason !== reason ? `Native bridge: ${nativeReason}` : null,
    help.note ? `Note: ${help.note}` : null,
    "",
    ...buildStaticSummary(lang, file.content),
  ].filter(Boolean) as string[];

  return details.join("\n");
}

export function isCodeExecutionFailure(result: string): boolean {
  return /^\[(error|not-run)\]/i.test(result.trim());
}

export async function executeCode(file: CodeExecutionFile): Promise<string> {
  const lang = normalizeLang(file.lang);

  if (lang === "json") {
    return runJSON(file.content);
  }
  if (["html", "css", "markdown", "plaintext"].includes(lang)) {
    return runPreviewNotice(file, lang);
  }

  const native = await tryNativeExecution(file, lang);
  if (native.status === "handled") {
    return native.output;
  }

  if (lang === "javascript" || lang === "typescript") {
    return runLocalJavaScript(file, lang, native.reason);
  }

  const nativeHelp = getRuntimeHelp(lang).bridgeSupported
    ? native.reason
    : "Nexus Main does not bundle this compiler/runtime in the snippet runner.";

  return buildRuntimeNotice(file, lang, nativeHelp, native.reason);
}
