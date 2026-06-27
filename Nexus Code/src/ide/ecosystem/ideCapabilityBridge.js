import {
  NEXUS_CODE_IDE_CAPABILITIES,
  NEXUS_CODE_IDE_LANGUAGES,
  NEXUS_CODE_IDE_STRATEGY,
} from "@nexus/core";

const STATUS_ORDER = Object.freeze({
  planned: 0,
  external: 1,
  foundation: 2,
  preview: 3,
  stable: 4,
});

const STATUS_LABELS = Object.freeze({
  planned: "geplant",
  external: "extern",
  foundation: "Fundament",
  preview: "Preview",
  stable: "stabil",
});

const PHASE_LABELS = Object.freeze({
  foundation: "Foundation",
  "ide-preview": "IDE Preview",
  "native-path": "Native Path",
});

function compareByStatus(left, right) {
  const leftScore = STATUS_ORDER[left.status] ?? 0;
  const rightScore = STATUS_ORDER[right.status] ?? 0;
  if (leftScore !== rightScore) return rightScore - leftScore;
  return left.label.localeCompare(right.label);
}

function summarizeByField(items, field) {
  return items.reduce((acc, item) => {
    const key = item[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export const IDE_CAPABILITY_STATUS_LABELS = STATUS_LABELS;
export const IDE_RELEASE_PHASE_LABELS = PHASE_LABELS;
export const NEXUS_CODE_PRODUCT_STRATEGY = NEXUS_CODE_IDE_STRATEGY;

export function getNexusCodeCapabilitySnapshot() {
  const visibleCapabilities = NEXUS_CODE_IDE_CAPABILITIES.filter(
    (capability) => capability.userVisible,
  ).sort(compareByStatus);
  const statusCounts = summarizeByField(NEXUS_CODE_IDE_CAPABILITIES, "status");
  const phaseCounts = summarizeByField(NEXUS_CODE_IDE_CAPABILITIES, "releasePhase");
  const foundationReady = NEXUS_CODE_IDE_CAPABILITIES.filter(
    (capability) =>
      capability.status === "foundation" ||
      capability.status === "preview" ||
      capability.status === "stable",
  ).length;

  return {
    product: NEXUS_CODE_IDE_STRATEGY.product,
    direction: NEXUS_CODE_IDE_STRATEGY.direction,
    licenseBoundary: NEXUS_CODE_IDE_STRATEGY.licenseBoundary,
    phaseOne: NEXUS_CODE_IDE_STRATEGY.phaseOne,
    nativePath: NEXUS_CODE_IDE_STRATEGY.nativePath,
    totalCapabilities: NEXUS_CODE_IDE_CAPABILITIES.length,
    foundationReady,
    visibleCapabilities,
    statusCounts,
    phaseCounts,
  };
}

export function getNexusCodeLanguageSnapshot() {
  const tierCounts = summarizeByField(NEXUS_CODE_IDE_LANGUAGES, "tier");
  const fullIdeLanguages = NEXUS_CODE_IDE_LANGUAGES.filter(
    (language) => language.tier === "full-ide",
  );
  const syntaxFirstLanguages = NEXUS_CODE_IDE_LANGUAGES.filter(
    (language) => language.tier === "syntax-first",
  );
  const lspNextLanguages = NEXUS_CODE_IDE_LANGUAGES.filter(
    (language) => language.tier === "lsp-next",
  );

  return {
    languages: [...NEXUS_CODE_IDE_LANGUAGES],
    tierCounts,
    fullIdeLanguages,
    syntaxFirstLanguages,
    lspNextLanguages,
    fullIdeLabel: fullIdeLanguages.map((language) => language.label).join(", "),
  };
}

export function getNexusCodeIdeReleaseSnapshot() {
  return {
    capability: getNexusCodeCapabilitySnapshot(),
    language: getNexusCodeLanguageSnapshot(),
  };
}
