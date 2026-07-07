import {
  DEFAULT_THEME_ID,
  getThemePresetOptions,
} from "../../theme/nexusThemeResolver.js";
import {
  collectExtensionContributions,
  loadExtensionRegistryState,
  resolveExtensions,
} from "./extensionSystem.js";

const EXTENSION_THEME_PREFIX = "extension:";

function hashString(value) {
  let hash = 0;
  const source = String(value || "");
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hueToHex(hue, saturation = 72, lightness = 58) {
  const c = (1 - Math.abs((2 * lightness) / 100 - 1)) * (saturation / 100);
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness / 100 - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function getExtensionThemeColors(themeId, extensionId) {
  const seed = hashString(`${extensionId}:${themeId}`);
  const primary = hueToHex(seed % 360, 72, 60);
  const secondary = hueToHex((seed + 42) % 360, 74, 58);
  return ["#080b12", primary, secondary];
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function createExtensionThemeSettingId(extensionId, themeId) {
  return `${EXTENSION_THEME_PREFIX}${extensionId}:${themeId}`;
}

export function parseExtensionThemeSettingId(themeId) {
  const value = String(themeId || "");
  if (!value.startsWith(EXTENSION_THEME_PREFIX)) return null;
  const [, extensionId, ...themeParts] = value.split(":");
  const contributionId = themeParts.join(":");
  if (!extensionId || !contributionId) return null;
  return { extensionId, contributionId };
}

export function isExtensionThemeSettingId(themeId) {
  return Boolean(parseExtensionThemeSettingId(themeId));
}

function createBuiltInThemeOptions() {
  return getThemePresetOptions().map((theme) => ({
    ...theme,
    label: theme.name,
    source: "built-in",
    sourceLabel: "Built-in",
    selectable: true,
  }));
}

function createActiveExtensionThemeOptions(records) {
  const contributions = collectExtensionContributions(records);
  return (contributions.themes || []).map((theme) => {
    const colors = getExtensionThemeColors(theme.id, theme.extensionId);
    return {
      id: createExtensionThemeSettingId(theme.extensionId, theme.id),
      contributionId: theme.id,
      name: normalizeString(theme.label, theme.id),
      label: normalizeString(theme.label, theme.id),
      description: theme.uiTheme || "Extension theme",
      colors,
      accent: colors[1],
      accent2: colors[2],
      source: "extension",
      sourceLabel: normalizeString(theme.extensionName, "Extension"),
      extensionId: theme.extensionId,
      extensionName: normalizeString(theme.extensionName, "Extension"),
      selectable: true,
    };
  });
}

function createUnavailableExtensionThemeOptions(records, activeIds) {
  return resolveExtensions(records)
    .filter((extension) => extension.installed && Array.isArray(extension.contributes?.themes))
    .flatMap((extension) =>
      extension.contributes.themes.map((theme) => {
        const id = createExtensionThemeSettingId(extension.id, theme.id);
        if (activeIds.has(id)) return null;
        const lifecycle = extension.lifecycleState;
        const reason =
          extension.health === "error"
            ? "Manifest fehlerhaft"
            : !extension.enabled
              ? "Extension pausiert"
              : lifecycle?.detail || "Nicht aktivierbar";
        const colors = getExtensionThemeColors(theme.id, extension.id);
        return {
          id,
          contributionId: theme.id,
          name: normalizeString(theme.label, theme.id),
          label: normalizeString(theme.label, theme.id),
          description: reason,
          colors,
          accent: colors[1],
          accent2: colors[2],
          source: "extension",
          sourceLabel: extension.displayName || "Extension",
          extensionId: extension.id,
          extensionName: extension.displayName || "Extension",
          selectable: false,
          unavailableReason: reason,
        };
      }),
    )
    .filter(Boolean);
}

export function createThemeOptionsModel(records, selectedThemeId) {
  const builtIn = createBuiltInThemeOptions();
  const extension = createActiveExtensionThemeOptions(records);
  const activeIds = new Set([...builtIn, ...extension].map((option) => option.id));
  const unavailable = createUnavailableExtensionThemeOptions(records, activeIds);
  const selectable = [...builtIn, ...extension];
  const selectedOption = selectable.find((option) => option.id === selectedThemeId) || null;
  const selectedThemeAvailable = Boolean(selectedOption);
  const fallbackThemeId = DEFAULT_THEME_ID;

  return {
    builtIn,
    extension,
    unavailable,
    options: [...builtIn, ...extension, ...unavailable],
    selectable,
    selectedOption,
    selectedThemeAvailable,
    selectedThemeId: selectedThemeAvailable ? selectedThemeId : fallbackThemeId,
    fallbackThemeId,
  };
}

export function loadThemeOptionsModel(selectedThemeId) {
  return createThemeOptionsModel(loadExtensionRegistryState().records, selectedThemeId);
}

export function normalizeThemeSelectionId(themeId, records) {
  const builtInIds = new Set(getThemePresetOptions().map((theme) => theme.id));
  if (builtInIds.has(themeId)) return themeId;
  if (!isExtensionThemeSettingId(themeId)) return DEFAULT_THEME_ID;

  const model = createThemeOptionsModel(records ?? loadExtensionRegistryState().records, themeId);
  return model.selectedThemeAvailable ? themeId : DEFAULT_THEME_ID;
}

export function createThemeSelectionPatch(option) {
  if (!option?.selectable) return null;
  const patch = {
    theme: option.id,
    background: null,
    primary_accent: option.accent,
    secondary_accent: option.accent2,
  };

  if (option.source === "extension") {
    patch.theme_extension_id = option.extensionId;
    patch.theme_contribution_id = option.contributionId;
    patch.theme_source = "extension";
    patch.theme_extension_name = option.extensionName;
  } else {
    patch.theme_extension_id = null;
    patch.theme_contribution_id = null;
    patch.theme_source = "built-in";
    patch.theme_extension_name = null;
  }

  return patch;
}
