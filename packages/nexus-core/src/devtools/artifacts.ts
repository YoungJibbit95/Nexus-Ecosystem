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

export const extractDevToolsCodeBundles = (files: DevToolsFsFile[]) => ({
  html: files.find((file) => file.type === "html")?.content ?? "",
  css: files
    .filter((file) => file.type === "css")
    .map((file) => file.content)
    .join("\n"),
  js: files
    .filter((file) => file.type === "js")
    .map((file) => file.content)
    .join("\n"),
});

export const toExecutableDevToolsHtml = (input: {
  html: string;
  css: string;
  js: string;
  includeLogBridge?: boolean;
}) => {
  const safeJs = input.js.replace(/<\/script>/gi, "<\\/script>");
  const baseCss =
    "html, body { margin: 0; min-height: 100%; background: #090d1f; color: #e5e7eb; } body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }";
  const body =
    input.html.match(/<body[^>]*>[\s\S]*<\/body>/i)?.[0] ??
    `<body>${input.html}</body>`;
  const bridge = input.includeLogBridge
    ? `
<script>
const __logs=[],oL=console.log,oE=console.error,oW=console.warn;
const __p=(t,a)=>{__logs.push({t,m:a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')});window.parent.postMessage({type:'__c__',logs:__logs},'*')};
console.log=(...a)=>{oL(...a);__p('log',a)};
console.error=(...a)=>{oE(...a);__p('err',a)};
console.warn=(...a)=>{oW(...a);__p('warn',a)};
try{${safeJs}}catch(e){__p('err',['ERROR: '+e.message])}
</script>`
    : `<script>\n${safeJs}\n</script>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCss}\n${input.css}</style></head>${body}${bridge}</html>`;
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

