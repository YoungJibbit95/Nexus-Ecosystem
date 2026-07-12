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

export const VISUAL_SMOKE_RELEASE_SURFACES = Object.freeze([
  ...VISUAL_SMOKE_BASE_SURFACES,
  "editor-scroll",
  "editor-jsx",
  "editor-json",
  "editor-rust",
  "editor-glsl",
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

const ALL_VIEWPORT_IDS = VISUAL_SMOKE_VIEWPORTS.map((viewport) => viewport.id);

export const VISUAL_SMOKE_PRESETS = Object.freeze({
  full: Object.freeze({
    label: "Full matrix",
    viewportIds: Object.freeze([...ALL_VIEWPORT_IDS]),
    surfaceIds: Object.freeze([...VISUAL_SMOKE_SURFACES]),
  }),
  release: Object.freeze({
    label: "Release QA",
    viewportIds: Object.freeze([...ALL_VIEWPORT_IDS]),
    surfaceIds: Object.freeze([...VISUAL_SMOKE_RELEASE_SURFACES]),
  }),
  focused: Object.freeze({
    label: "Focused QA",
    viewportIds: Object.freeze(["desktop", "short-wide"]),
    surfaceIds: Object.freeze(["launchpad", "editor-rust", "editor-glsl"]),
  }),
});

export function normalizeVisualSmokePreset(value) {
  const presetId = String(value || "full").trim().toLowerCase() || "full";
  if (!VISUAL_SMOKE_PRESETS[presetId]) {
    throw new Error(
      `Unknown visual smoke preset: ${presetId}. Expected one of ${Object.keys(
        VISUAL_SMOKE_PRESETS,
      ).join(", ")}`,
    );
  }
  return presetId;
}

function splitFilterTokens(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueInOrder(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function parseVisualSmokeFilter(value, defaults, label, allowed = defaults) {
  const requested = String(value || "")
    ? uniqueInOrder(splitFilterTokens(value))
    : [];
  if (requested.length === 0) return [...defaults];

  const allowedSet = new Set(allowed);
  const unknown = requested.filter((entry) => !allowedSet.has(entry));
  if (unknown.length) {
    throw new Error(`Unknown visual smoke ${label}: ${unknown.join(", ")}`);
  }
  return requested;
}

function createCoverageSummary(viewports, surfaces) {
  const baseSurfaceSet = new Set(VISUAL_SMOKE_BASE_SURFACES);
  const editorSurfaceSet = new Set(VISUAL_SMOKE_EDITOR_LANGUAGE_SURFACES);
  const viewportIds = viewports.map((viewport) => viewport.id);
  return {
    viewportCount: viewportIds.length,
    surfaceCount: surfaces.length,
    scenarioCount: viewportIds.length * surfaces.length,
    totalViewportCount: VISUAL_SMOKE_VIEWPORTS.length,
    totalSurfaceCount: VISUAL_SMOKE_SURFACES.length,
    totalBaseSurfaceCount: VISUAL_SMOKE_BASE_SURFACES.length,
    totalEditorLanguageSurfaceCount: VISUAL_SMOKE_EDITOR_LANGUAGE_SURFACES.length,
    baseSurfaceCount: surfaces.filter((surface) => baseSurfaceSet.has(surface)).length,
    editorLanguageSurfaceCount: surfaces.filter((surface) => editorSurfaceSet.has(surface))
      .length,
    fullViewportCoverage: viewportIds.length === VISUAL_SMOKE_VIEWPORTS.length,
    fullSurfaceCoverage: surfaces.length === VISUAL_SMOKE_SURFACES.length,
  };
}

export function createVisualSmokePlan({ preset, viewportIds, surfaceIds } = {}) {
  const presetId = normalizeVisualSmokePreset(preset);
  const presetConfig = VISUAL_SMOKE_PRESETS[presetId];
  const viewports = parseVisualSmokeFilter(
    viewportIds,
    presetConfig.viewportIds,
    "viewport",
    ALL_VIEWPORT_IDS,
  ).map((id) => VISUAL_SMOKE_VIEWPORTS.find((viewport) => viewport.id === id));

  const surfaces = parseVisualSmokeFilter(
    surfaceIds,
    presetConfig.surfaceIds,
    "surface",
    VISUAL_SMOKE_SURFACES,
  );

  const scenarios = viewports.flatMap((viewport) =>
    surfaces.map((surfaceId) => ({
      id: `${surfaceId}@${viewport.id}`,
      surfaceId,
      viewportId: viewport.id,
      width: viewport.width,
      height: viewport.height,
    })),
  );

  return {
    presetId,
    presetLabel: presetConfig.label,
    viewportIds: viewports.map((viewport) => viewport.id),
    surfaceIds: surfaces,
    viewports,
    surfaces,
    scenarios,
    coverageSummary: createCoverageSummary(viewports, surfaces),
    isFullMatrix:
      viewports.length === VISUAL_SMOKE_VIEWPORTS.length &&
      surfaces.length === VISUAL_SMOKE_SURFACES.length,
  };
}

export function createVisualSmokeScenarios(options = {}) {
  return createVisualSmokePlan(options).scenarios;
}
