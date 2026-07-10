export const VISUAL_SMOKE_VIEWPORTS = Object.freeze([
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 1024, height: 768 },
  { id: "short-wide", width: 900, height: 512 },
  { id: "phone-portrait", width: 390, height: 900 },
]);

export const VISUAL_SMOKE_EDITOR_LANGUAGE_SURFACES = Object.freeze([
  "editor-scroll",
  "editor-javascript",
  "editor-mjs",
  "editor-jsx",
  "editor-json",
  "editor-jsonc",
  "editor-css",
  "editor-scss",
  "editor-python",
  "editor-rust",
  "editor-go",
  "editor-html",
  "editor-yaml",
  "editor-sql",
  "editor-shell",
  "editor-php",
  "editor-java",
  "editor-cpp",
  "editor-gherkin",
  "editor-rdf",
  "editor-latex",
  "editor-xquery",
  "editor-glsl",
]);

export const VISUAL_SMOKE_BASE_SURFACES = Object.freeze([
  "workbench-shell",
  "launchpad",
  "account-panel",
  "settings-panel",
  "panel-chrome",
  "github-workbench",
  "github-projects",
]);

export const VISUAL_SMOKE_SURFACES = Object.freeze([
  "workbench-shell",
  ...VISUAL_SMOKE_EDITOR_LANGUAGE_SURFACES,
  "launchpad",
  "account-panel",
  "settings-panel",
  "panel-chrome",
  "github-workbench",
  "github-projects",
]);

export function parseVisualSmokeFilter(value, allowed, label) {
  const requested = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (requested.length === 0) return allowed;

  const allowedSet = new Set(allowed);
  const unknown = requested.filter((entry) => !allowedSet.has(entry));
  if (unknown.length) {
    throw new Error(`Unknown visual smoke ${label}: ${unknown.join(", ")}`);
  }
  return requested;
}

export function createVisualSmokeScenarios({ viewportIds, surfaceIds } = {}) {
  const viewports = parseVisualSmokeFilter(
    viewportIds,
    VISUAL_SMOKE_VIEWPORTS.map((viewport) => viewport.id),
    "viewport",
  ).map((id) => VISUAL_SMOKE_VIEWPORTS.find((viewport) => viewport.id === id));

  const surfaces = parseVisualSmokeFilter(
    surfaceIds,
    VISUAL_SMOKE_SURFACES,
    "surface",
  );

  return viewports.flatMap((viewport) =>
    surfaces.map((surfaceId) => ({
      id: `${surfaceId}@${viewport.id}`,
      surfaceId,
      viewportId: viewport.id,
      width: viewport.width,
      height: viewport.height,
    })),
  );
}
