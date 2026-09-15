import type { DevToolsFsFile, DevToolsViewport } from "./defaultProject";

export type DevToolsBuilderSubTab = "code" | "designer" | "visual";

export type DevToolsArtifactKind =
  | "snippet"
  | "recipe"
  | "preset"
  | "component"
  | "prototype";

export type DevToolsProjectSnapshotPayload = {
  type: "project-snapshot";
  files: DevToolsFsFile[];
  activeId: string;
  viewport: DevToolsViewport;
  autoRun: boolean;
  subTab: DevToolsBuilderSubTab;
  source: "web-builder" | "visual-builder";
};

export type DevToolsSnippetPayload = {
  type: "snippet";
  language: string;
  fileName: string;
  code: string;
};

export type DevToolsRecipePayload = {
  type: "recipe";
  html: string;
  css: string;
  js: string;
};

export type DevToolsPresetPayload = {
  type: "preset";
  viewport: DevToolsViewport;
  autoRun: boolean;
  subTab: DevToolsBuilderSubTab;
};

export type DevToolsComponentPayload = {
  type: "component";
  html: string;
  css: string;
};

export type DevToolsArtifactPayload =
  | DevToolsProjectSnapshotPayload
  | DevToolsSnippetPayload
  | DevToolsRecipePayload
  | DevToolsPresetPayload
  | DevToolsComponentPayload;

export type DevToolsArtifact = {
  id: string;
  kind: DevToolsArtifactKind;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  payload: DevToolsArtifactPayload;
};

export type DevToolsArtifactDraft = Omit<
  DevToolsArtifact,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
};

export const DEVTOOLS_ARTIFACT_LIBRARY_LIMIT = 60;
export const DEVTOOLS_MAX_FILES = 48;
export const DEVTOOLS_MAX_FILE_CHARS = 256_000;
export const DEVTOOLS_MAX_BUNDLE_CHARS = 512_000;
export const DEVTOOLS_MAX_EXECUTABLE_HTML_CHARS = 900_000;
export const DEVTOOLS_PREVIEW_MAX_LOGS_PER_MESSAGE = 20;
export const DEVTOOLS_PREVIEW_MAX_LOG_CHARS = 2_000;
export const DEVTOOLS_PREVIEW_MAX_PAYLOAD_BYTES = 12_000;
export const DEVTOOLS_PREVIEW_MAX_MESSAGES_PER_SECOND = 60;
export const DEVTOOLS_PREVIEW_MAX_CONSOLE_LINES = 200;
export const DEVTOOLS_EXPORT_MAX_OUTPUT_CHARS = 1_200_000;

export type DevToolsPreviewLogLevel = "log" | "warn" | "err";

export type DevToolsPreviewMessage = {
  type: "__c__";
  logs: Array<{
    t: DevToolsPreviewLogLevel;
    m: string;
  }>;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactKeys = (value: Record<string, unknown>, expected: string[]) => {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
};

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

export const parseDevToolsPreviewMessage = (value: unknown): DevToolsPreviewMessage | null => {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["type", "logs"])) return null;
  if (value.type !== "__c__" || !Array.isArray(value.logs)) return null;
  if (value.logs.length === 0 || value.logs.length > DEVTOOLS_PREVIEW_MAX_LOGS_PER_MESSAGE) return null;

  let payloadBytes = utf8ByteLength(value.type);
  const logs: DevToolsPreviewMessage["logs"] = [];
  for (const rawLog of value.logs) {
    if (!isPlainRecord(rawLog) || !hasExactKeys(rawLog, ["t", "m"])) return null;
    if (rawLog.t !== "log" && rawLog.t !== "warn" && rawLog.t !== "err") return null;
    if (typeof rawLog.m !== "string" || rawLog.m.length > DEVTOOLS_PREVIEW_MAX_LOG_CHARS) return null;
    payloadBytes += utf8ByteLength(rawLog.t) + utf8ByteLength(rawLog.m);
    if (payloadBytes > DEVTOOLS_PREVIEW_MAX_PAYLOAD_BYTES) return null;
    logs.push({ t: rawLog.t, m: rawLog.m });
  }

  const message: DevToolsPreviewMessage = { type: "__c__", logs };
  if (utf8ByteLength(JSON.stringify(message)) > DEVTOOLS_PREVIEW_MAX_PAYLOAD_BYTES) return null;
  return message;
};

const assertBoundedText = (value: unknown, label: string, maxChars: number) => {
  if (typeof value !== "string") throw new TypeError(`${label} must be text`);
  if (value.length > maxChars) throw new RangeError(`${label} exceeds ${maxChars} characters`);
};

const assertBoundedFiles = (files: DevToolsFsFile[]) => {
  if (!Array.isArray(files)) throw new TypeError("DevTools files must be an array");
  if (files.length > DEVTOOLS_MAX_FILES) {
    throw new RangeError(`DevTools project exceeds ${DEVTOOLS_MAX_FILES} files`);
  }
  let totalChars = 0;
  for (const file of files) {
    if (!file || typeof file !== "object") throw new TypeError("DevTools file is invalid");
    assertBoundedText(file.id, "DevTools file id", 120);
    assertBoundedText(file.name, "DevTools file name", 240);
    assertBoundedText(file.content, `DevTools file ${file.name}`, DEVTOOLS_MAX_FILE_CHARS);
    totalChars += file.content.length;
    if (totalChars > DEVTOOLS_MAX_BUNDLE_CHARS) {
      throw new RangeError(`DevTools project exceeds ${DEVTOOLS_MAX_BUNDLE_CHARS} characters`);
    }
  }
};

export const createDevToolsArtifact = (
  draft: DevToolsArtifactDraft,
): DevToolsArtifact => {
  const now = new Date().toISOString();
  const id = draft.id ?? `artifact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...draft,
    id,
    createdAt: now,
    updatedAt: now,
  };
};

export const upsertDevToolsArtifact = (
  artifacts: DevToolsArtifact[],
  artifact: DevToolsArtifact,
  limit = DEVTOOLS_ARTIFACT_LIBRARY_LIMIT,
) => {
  const next = [
    artifact,
    ...artifacts.filter((item) => item.id !== artifact.id),
  ].slice(0, Math.max(1, limit));
  return sortDevToolsArtifacts(next);
};

export const sortDevToolsArtifacts = (artifacts: DevToolsArtifact[]) =>
  [...artifacts].sort((a, b) => {
    const dateDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });

export const extractDevToolsCodeBundles = (files: DevToolsFsFile[]) => {
  assertBoundedFiles(files);
  const html = files.find((file) => file.type === "html")?.content ?? "";
  const css = files
    .filter((file) => file.type === "css")
    .map((file) => file.content)
    .join("\n");
  const js = files
    .filter((file) => file.type === "js")
    .map((file) => file.content)
    .join("\n");
  if (html.length + css.length + js.length > DEVTOOLS_MAX_BUNDLE_CHARS) {
    throw new RangeError(`DevTools bundles exceed ${DEVTOOLS_MAX_BUNDLE_CHARS} characters`);
  }
  return { html, css, js };
};

const findBodyStart = (lowerHtml: string) => {
  let fromIndex = 0;
  while (fromIndex < lowerHtml.length) {
    const index = lowerHtml.indexOf("<body", fromIndex);
    if (index < 0) return -1;
    const boundary = lowerHtml[index + 5];
    if (boundary === ">" || boundary === "/" || /\s/.test(boundary || "")) return index;
    fromIndex = index + 5;
  }
  return -1;
};

const extractBoundedBody = (html: string) => {
  const lowerHtml = html.toLowerCase();
  const bodyStart = findBodyStart(lowerHtml);
  if (bodyStart < 0) return `<body>${html}</body>`;
  const openEnd = lowerHtml.indexOf(">", bodyStart + 5);
  const closeStart = lowerHtml.lastIndexOf("</body>");
  if (openEnd < 0 || closeStart < openEnd) return `<body>${html}</body>`;
  return html.slice(bodyStart, closeStart + "</body>".length);
};

export const toExecutableDevToolsHtml = (input: {
  html: string;
  css: string;
  js: string;
  includeLogBridge?: boolean;
}) => {
  assertBoundedText(input.html, "DevTools HTML", DEVTOOLS_MAX_FILE_CHARS);
  assertBoundedText(input.css, "DevTools CSS", DEVTOOLS_MAX_FILE_CHARS);
  assertBoundedText(input.js, "DevTools JavaScript", DEVTOOLS_MAX_FILE_CHARS);
  if (input.html.length + input.css.length + input.js.length > DEVTOOLS_MAX_BUNDLE_CHARS) {
    throw new RangeError(`DevTools preview exceeds ${DEVTOOLS_MAX_BUNDLE_CHARS} input characters`);
  }
  const safeJs = input.js.replace(/<\/script>/gi, "<\\/script>");
  const safeCss = input.css.replace(/<\/style>/gi, "<\\/style>");
  const baseCss =
    "html, body { margin: 0; min-height: 100%; background: #090d1f; color: #e5e7eb; } body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }";
  const body = extractBoundedBody(input.html);
  const bridge = input.includeLogBridge
    ? `
<script>
const __max=${DEVTOOLS_PREVIEW_MAX_LOG_CHARS},__maxLogs=${DEVTOOLS_PREVIEW_MAX_LOGS_PER_MESSAGE},__logs=[],oL=console.log,oE=console.error,oW=console.warn;
const __clip=(s)=>{s=String(s);return s.length>__max?s.slice(0,__max-14)+'...[truncated]':s};
const __safe=(x,d=0)=>{try{if(typeof x==='string')return __clip(x);if(x===null||typeof x==='number'||typeof x==='boolean'||typeof x==='bigint'||typeof x==='undefined')return __clip(String(x));if(d>=2)return Array.isArray(x)?'[Array]':'[Object]';if(Array.isArray(x)){let s='[';for(let i=0;i<Math.min(x.length,20)&&s.length<__max;i++)s+=(i?', ':'')+__safe(x[i],d+1);return __clip(s+(x.length>20?', ...]':']'))}if(typeof x==='object'){let s='{',n=0;for(const k in x){if(!Object.prototype.hasOwnProperty.call(x,k))continue;s+=(n?', ':'')+__clip(k)+': '+__safe(x[k],d+1);n++;if(n>=20||s.length>=__max)break}return __clip(s+(n>=20?', ...}':'}'))}return __clip(String(x))}catch(_e){return '[unserializable]'}};
const __p=(t,a)=>{let m=a.slice(0,20).map((x)=>__safe(x)).join(' ');if(m.length>__max)m=m.slice(0,__max-14)+'...[truncated]';__logs.push({t,m});if(__logs.length>__maxLogs)__logs.shift();window.parent.postMessage({type:'__c__',logs:__logs.slice()},'*')};
console.log=(...a)=>{oL(...a);__p('log',a)};
console.error=(...a)=>{oE(...a);__p('err',a)};
console.warn=(...a)=>{oW(...a);__p('warn',a)};
try{${safeJs}}catch(e){__p('err',['ERROR: '+e.message])}
</script>`
    : `<script>\n${safeJs}\n</script>`;
  const output = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCss}\n${safeCss}</style></head>${body}${bridge}</html>`;
  if (output.length > DEVTOOLS_MAX_EXECUTABLE_HTML_CHARS) {
    throw new RangeError(`DevTools executable HTML exceeds ${DEVTOOLS_MAX_EXECUTABLE_HTML_CHARS} characters`);
  }
  return output;
};

const DEVTOOLS_SECRET_KEY_PATTERN = /authorization|cookie|password|passwd|secret|token|api.?key|ingest.?key|private.?key|client.?secret/i;
const DEVTOOLS_PEM_BEGIN_PREFIX = "-----BEGIN ";
const DEVTOOLS_PEM_SUFFIX = "-----";
const DEVTOOLS_BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/gi;
const DEVTOOLS_JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const DEVTOOLS_QUOTED_SECRET_PATTERN = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|ingest[_-]?key|client[_-]?secret|password|passwd|secret|authorization)\s*[:=]\s*)(["'`])[^\r\n"'`]{1,4096}\2/gi;
const DEVTOOLS_UNQUOTED_SECRET_PATTERN = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|ingest[_-]?key|client[_-]?secret|password|passwd|secret|authorization)\s*[:=]\s*)[^\s,;}\]]{4,}/gi;

const isPrivateKeyPemLabel = (value: string) => {
  if (!value.endsWith("PRIVATE KEY") || value.length > 64) return false;
  for (const character of value) {
    if (character !== " " && (character < "A" || character > "Z")) return false;
  }
  return true;
};

const redactPrivateKeyBlocks = (value: string) => {
  let cursor = 0;
  let searchFrom = 0;
  let output = "";

  while (searchFrom < value.length) {
    const begin = value.indexOf(DEVTOOLS_PEM_BEGIN_PREFIX, searchFrom);
    if (begin < 0) break;
    const labelStart = begin + DEVTOOLS_PEM_BEGIN_PREFIX.length;
    const headerEnd = value.indexOf(DEVTOOLS_PEM_SUFFIX, labelStart);
    if (headerEnd < 0) break;
    const label = value.slice(labelStart, headerEnd);
    if (!isPrivateKeyPemLabel(label)) {
      searchFrom = headerEnd + DEVTOOLS_PEM_SUFFIX.length;
      continue;
    }

    const endMarker = `-----END ${label}-----`;
    const blockEnd = value.indexOf(endMarker, headerEnd + DEVTOOLS_PEM_SUFFIX.length);
    output += `${value.slice(cursor, begin)}[REDACTED PRIVATE KEY]`;
    if (blockEnd < 0) {
      cursor = value.length;
      searchFrom = value.length;
      break;
    }
    cursor = blockEnd + endMarker.length;
    searchFrom = cursor;
  }

  return cursor === 0 ? value : `${output}${value.slice(cursor)}`;
};

const scrubDevToolsExportString = (value: string) => redactPrivateKeyBlocks(value)
  .replace(DEVTOOLS_BEARER_PATTERN, "Bearer [REDACTED]")
  .replace(DEVTOOLS_JWT_PATTERN, "[REDACTED JWT]")
  .replace(DEVTOOLS_QUOTED_SECRET_PATTERN, "$1$2[REDACTED]$2")
  .replace(DEVTOOLS_UNQUOTED_SECRET_PATTERN, "$1[REDACTED]");

export const sanitizeDevToolsArtifactForExport = <T,>(value: T): T => {
  let visitedNodes = 0;
  let totalStringChars = 0;

  const visit = (current: unknown, key: string, depth: number): unknown => {
    visitedNodes += 1;
    if (visitedNodes > 4_000) throw new RangeError("DevTools export contains too many values");
    if (depth > 16) throw new RangeError("DevTools export nesting is too deep");
    if (current == null || typeof current === "boolean" || typeof current === "number") return current;
    if (typeof current === "string") {
      assertBoundedText(current, "DevTools export string", DEVTOOLS_MAX_FILE_CHARS);
      totalStringChars += current.length;
      if (totalStringChars > DEVTOOLS_EXPORT_MAX_OUTPUT_CHARS) {
        throw new RangeError("DevTools export input is too large");
      }
      return DEVTOOLS_SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : scrubDevToolsExportString(current);
    }
    if (Array.isArray(current)) {
      if (current.length > DEVTOOLS_MAX_FILES * 4) throw new RangeError("DevTools export array is too large");
      return current.map((item) => visit(item, key, depth + 1));
    }
    if (!isPlainRecord(current)) throw new TypeError("DevTools export contains a non-serializable value");
    const keys = Object.keys(current);
    if (keys.length > 128) throw new RangeError("DevTools export object has too many fields");
    const result: Record<string, unknown> = {};
    for (const childKey of keys) {
      assertBoundedText(childKey, "DevTools export field", 120);
      result[childKey] = visit(current[childKey], childKey, depth + 1);
    }
    return result;
  };

  return visit(value, "", 0) as T;
};

export const serializeDevToolsArtifactForExport = (value: unknown) => {
  const sanitized = sanitizeDevToolsArtifactForExport(value);
  const output = JSON.stringify(sanitized, null, 2);
  if (output.length > DEVTOOLS_EXPORT_MAX_OUTPUT_CHARS) {
    throw new RangeError(`DevTools export exceeds ${DEVTOOLS_EXPORT_MAX_OUTPUT_CHARS} characters`);
  }
  return output;
};

export const summarizeDevToolsArtifact = (artifact: DevToolsArtifact) => {
  const payload = artifact.payload;
  if (payload.type === "project-snapshot") {
    return `${payload.files.length} files · ${payload.viewport}`;
  }
  if (payload.type === "snippet") {
    return `${payload.language.toUpperCase()} snippet`;
  }
  if (payload.type === "recipe") {
    return "HTML/CSS/JS recipe";
  }
  if (payload.type === "component") {
    return "Component snippet";
  }
  return `${payload.viewport} preset`;
};

export const formatDevToolsArtifactKind = (kind: DevToolsArtifactKind) => {
  if (kind === "snippet") return "Snippet";
  if (kind === "recipe") return "Recipe";
  if (kind === "preset") return "Preset";
  if (kind === "component") return "Component";
  return "Prototype";
};

