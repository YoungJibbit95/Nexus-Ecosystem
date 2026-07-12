import React from "react";
import {
  Code2,
  Cpu,
  Eye,
  Gauge,
  GitBranch,
  Keyboard,
  Palette,
  Package,
  PanelLeft,
  Search,
  Settings2,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

/* Lightweight native replacements for the UI-kit components. */

import {
  NativeSelect,
  NativeSlider,
  NativeSwitch,
  backgrounds,
  fonts,
  themes,
  visualPerformanceProfiles,
} from './settingsShared';
import { resolveNexusTheme } from '../../theme/nexusThemeResolver.js';
import { DEFAULT_SETTINGS } from '../../pages/editor/editorShared.jsx';
import {
  createThemeOptionsModel,
  createThemeSelectionPatch,
} from '../../pages/editor/themeOptionsModel.js';
import { createLspSetupModel } from '../../pages/editor/lspSetupModel.js';
import {
  createExtensionEventDetail,
  installExtension,
  loadExtensionRegistryState,
  saveExtensionRegistry,
  setExtensionEnabled,
} from '../../pages/editor/extensionSystem.js';
import { normalizeWorkbenchLayout } from '../../pages/editor/workbenchDockModel.js';
import {
  KEYBINDING_SETTING_KEY,
  createKeybindingSettingsModel,
  normalizeKeybindingOverrideMap,
  normalizeKeybindingShortcut,
} from '../../pages/editor/keybindingModel.js';
import {
  SECTION_IDS,
  SETTING_SECTIONS,
  WORKBENCH_QUICK_ACTION_SETTING_IDS,
} from './settings/settingsCatalog.jsx';
import {
  buildLowPowerState,
  buildPerformanceHints,
  buildThemeEditorResetPatch,
  buildVisualBudgetSummary,
  clampNumber,
  countSectionMatches,
  createThemeExportPayload,
  createThemeTokenList,
  formatJsonSize,
  formatSettingNumber,
  getNumberSetting,
  getSearchResults,
  getThemeEditorRecipeId,
  isVisibleSetting,
  normalizeSearch,
  resolveVisualProfileId,
} from './settings/settingsModels.js';
import {
  PerformanceHintList,
  SearchResultSummary,
  SettingRow,
  SettingsGroup,
  SettingsHeader,
  ThemeTokenGrid,
  ValueBadge,
} from './settings/SettingsPrimitives.jsx';
import KeybindingManager from './settings/KeybindingManager.jsx';
import SettingsNavigation from './settings/SettingsNavigation.jsx';
import { useLspSetupState } from './settings/useLspSetupState.js';
import {
  ColorControl,
  LowPowerFallbackPanel,
  LspSetupPanel,
  PresetButton,
  TextPresetGrid,
  ThemeEditorUtilityPanel,
  ThemePreview,
  VisualBudgetCard,
  WorkbenchQuickActions,
} from './settings/SettingsWidgets.jsx';

export default function SettingsPanel({
  settings,
  onSettingsChange,
  onResetSettings,
  onClose,
  themeOptionsModel,
  workbenchLayout,
  activeWorkbenchPanelId = "explorer",
  activeWorkbenchPanelLabel = "Explorer",
  onApplyWorkbenchLayoutPreset,
  onSetSidePanelSize,
  onSetBottomPanelSize,
  onDockActivePanel,
  onResetWorkbenchLayout,
}) {
  const [activeSection, setActiveSection] = React.useState("theme-editor");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [keybindingSearchQuery, setKeybindingSearchQuery] = React.useState("");
  const [keybindingCategory, setKeybindingCategory] = React.useState("all");
  const [copyStatus, setCopyStatus] = React.useState("idle");
  const {
    servers: lspServers,
    state: lspSetupState,
    refresh: refreshLspServers,
  } = useLspSetupState();
  const prefersReducedMotion = useReducedMotion();
  const resolvedTheme = React.useMemo(
    () => resolveNexusTheme(settings),
    [settings],
  );
  const effectiveThemeOptionsModel = React.useMemo(() => {
    if (themeOptionsModel?.options) return themeOptionsModel;
    return {
      builtIn: themes.map((theme) => ({
        ...theme,
        label: theme.name,
        source: "built-in",
        sourceLabel: "Built-in",
        selectable: true,
      })),
      extension: [],
      unavailable: [],
      options: themes,
      selectable: themes,
      selectedThemeAvailable: true,
      selectedThemeId: settings.theme,
      fallbackThemeId: DEFAULT_SETTINGS.theme,
    };
  }, [settings.theme, themeOptionsModel]);
  const searchTerm = normalizeSearch(searchQuery);
  const activeThemeId = effectiveThemeOptionsModel.selectable.some(
    (theme) => theme.id === settings.theme,
  )
    ? settings.theme
    : effectiveThemeOptionsModel.selectedThemeId || resolvedTheme.id;
  const primaryAccent = resolvedTheme.colors.primary;
  const secondaryAccent = resolvedTheme.colors.secondary;
  const visualProfileId = resolveVisualProfileId(settings);
  const themeEditorRecipeId = React.useMemo(
    () => getThemeEditorRecipeId(settings),
    [settings],
  );
  const reducedBySetting = settings.reduce_motion === true;
  const animationsEnabled = settings.animations_enabled !== false;
  const animationSpeed = clampNumber(settings.animation_speed, 0.5, 1.8, 1);
  const shouldReduceMotion =
    prefersReducedMotion ||
    reducedBySetting ||
    !animationsEnabled ||
    visualProfileId === "performance";
  const motionTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.22 / animationSpeed, ease: [0.22, 1, 0.36, 1] };
  const radius = getNumberSetting(settings, "ui_radius", 10);
  const letterSpacing = clampNumber(settings.letter_spacing, 0, 1.5, 0);
  const scopedThemeVars = React.useMemo(() => {
    const cssVars = resolvedTheme.cssVars;
    const radiusXs = Math.max(4, radius - 6);
    const radiusSm = Math.max(6, radius - 4);
    const radiusLg = radius + 4;
    const radiusXl = radius + 8;
    return {
      ...cssVars,
      "--nexus-primary": cssVars["--nexus-primary"],
      "--nexus-primary-rgb": cssVars["--nexus-primary-rgb"],
      "--nexus-primary-hsl": cssVars["--nexus-primary-hsl"],
      "--nexus-primary-foreground": cssVars["--nexus-primary-foreground"],
      "--nexus-accent-2": cssVars["--nexus-accent-2"],
      "--nexus-accent-2-rgb": cssVars["--nexus-accent-2-rgb"],
      "--nexus-accent-2-hsl": cssVars["--nexus-accent-2-hsl"],
      "--nexus-accent-glow": cssVars["--nexus-accent-glow"],
      "--nexus-comment": cssVars["--nexus-comment"],
      "--nexus-keyword": cssVars["--nexus-keyword"],
      "--nexus-string": cssVars["--nexus-string"],
      "--nexus-number": cssVars["--nexus-number"],
      "--nexus-function": cssVars["--nexus-function"],
      "--nexus-variable": cssVars["--nexus-variable"],
      "--nexus-type": cssVars["--nexus-type"],
      "--nexus-operator": cssVars["--nexus-operator"],
      "--primary-rgb": cssVars["--primary-rgb"],
      "--nexus-settings-radius": `${radius}px`,
      "--nexus-radius-xs": `${radiusXs}px`,
      "--nexus-radius-sm": `${radiusSm}px`,
      "--nexus-radius-md": `${radius}px`,
      "--nexus-radius-lg": `${radiusLg}px`,
      "--nexus-radius-xl": `${radiusXl}px`,
      "--nexus-radius-2xl": `${radiusXl + 4}px`,
    };
  }, [resolvedTheme, radius]);
  const themeTokens = React.useMemo(
    () => createThemeTokenList(resolvedTheme),
    [resolvedTheme],
  );

  const sectionMatchCounts = React.useMemo(
    () =>
      Object.fromEntries(
        SECTION_IDS.map((sectionId) => [
          sectionId,
          countSectionMatches(sectionId, searchTerm),
        ]),
      ),
    [searchTerm],
  );

  const visibleSectionIds = React.useMemo(() => {
    if (!searchTerm) return [activeSection];
    return SETTING_SECTIONS
      .filter((section) => sectionMatchCounts[section.id] > 0)
      .map((section) => section.id);
  }, [activeSection, searchTerm, sectionMatchCounts]);

  const activeMeta =
    SETTING_SECTIONS.find((section) => section.id === activeSection) ||
    SETTING_SECTIONS[0];
  const totalMatches = Object.values(sectionMatchCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const searchResults = React.useMemo(
    () => getSearchResults(searchTerm),
    [searchTerm],
  );
  const lspSetupModel = React.useMemo(
    () => createLspSetupModel(lspServers, lspSetupState),
    [lspServers, lspSetupState],
  );
  const keybindingPlatform =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "")
      ? "mac"
      : "default";
  const keybindingOverrides = React.useMemo(
    () => normalizeKeybindingOverrideMap(settings[KEYBINDING_SETTING_KEY]),
    [settings],
  );
  const keybindingModel = React.useMemo(
    () =>
      createKeybindingSettingsModel({
        overrides: keybindingOverrides,
        query: keybindingSearchQuery || searchQuery,
        category: keybindingCategory,
        platform: keybindingPlatform,
      }),
    [keybindingCategory, keybindingOverrides, keybindingPlatform, keybindingSearchQuery, searchQuery],
  );
  const performanceHints = React.useMemo(
    () => buildPerformanceHints(settings, visualProfileId, lspServers, shouldReduceMotion),
    [lspServers, settings, shouldReduceMotion, visualProfileId],
  );
  const visualBudgetSummary = React.useMemo(
    () => buildVisualBudgetSummary(settings, visualProfileId, shouldReduceMotion),
    [settings, shouldReduceMotion, visualProfileId],
  );
  const themeExportPayload = React.useMemo(
    () => createThemeExportPayload(settings, resolvedTheme, visualBudgetSummary),
    [resolvedTheme, settings, visualBudgetSummary],
  );
  const themeExportSize = React.useMemo(
    () => formatJsonSize(themeExportPayload),
    [themeExportPayload],
  );
  const lowPowerState = React.useMemo(
    () => buildLowPowerState(settings, visualProfileId, prefersReducedMotion, shouldReduceMotion),
    [prefersReducedMotion, settings, shouldReduceMotion, visualProfileId],
  );
  const normalizedWorkbenchLayout = React.useMemo(
    () => normalizeWorkbenchLayout(workbenchLayout),
    [workbenchLayout],
  );
  const showWorkbenchQuickActions = React.useMemo(
    () =>
      WORKBENCH_QUICK_ACTION_SETTING_IDS.some((settingId) =>
        isVisibleSetting(settingId, "workbench", searchTerm),
      ),
    [searchTerm],
  );

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    Object.entries(scopedThemeVars).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  }, [scopedThemeVars]);

  const updateSetting = React.useCallback(
    (key, value) => {
      const next = { ...settings, [key]: value };
      if (
        key !== "visual_performance_profile" &&
        visualPerformanceProfiles.some((profile) =>
          Object.prototype.hasOwnProperty.call(profile.settings, key),
        )
      ) {
        next.visual_performance_profile = "custom";
      }
      onSettingsChange(next);
    },
    [onSettingsChange, settings],
  );

  const updateSettings = React.useCallback(
    (patch) => {
      const next = { ...settings, ...patch };
      if (
        Object.keys(patch).some((key) =>
          visualPerformanceProfiles.some((profile) =>
            Object.prototype.hasOwnProperty.call(profile.settings, key),
          ),
        )
      ) {
        next.visual_performance_profile = patch.visual_performance_profile || "custom";
      }
      onSettingsChange(next);
    },
    [onSettingsChange, settings],
  );

  const updateKeybindingOverrides = React.useCallback(
    (nextOverrides) => {
      updateSetting(KEYBINDING_SETTING_KEY, normalizeKeybindingOverrideMap(nextOverrides));
    },
    [updateSetting],
  );

  const setKeybindingOverride = React.useCallback(
    (bindingId, value) => {
      const normalized = normalizeKeybindingShortcut(value);
      const next = { ...keybindingOverrides };
      if (normalized) {
        next[bindingId] = normalized;
      } else {
        delete next[bindingId];
      }
      updateKeybindingOverrides(next);
    },
    [keybindingOverrides, updateKeybindingOverrides],
  );

  const resetKeybinding = React.useCallback(
    (bindingId) => {
      const next = { ...keybindingOverrides };
      delete next[bindingId];
      updateKeybindingOverrides(next);
    },
    [keybindingOverrides, updateKeybindingOverrides],
  );

  const applyThemeOption = React.useCallback(
    (theme) => {
      const patch = createThemeSelectionPatch(theme);
      if (!patch) return false;
      onSettingsChange({ ...settings, ...patch });
      return true;
    },
    [onSettingsChange, settings],
  );

  const dispatchExtensionRegistryChange = React.useCallback((records, diagnostics = []) => {
    if (typeof window === "undefined" || typeof window.CustomEvent !== "function") return;
    const detail = createExtensionEventDetail(records);
    if (diagnostics.length > 0) {
      detail.diagnostics = [...(detail.diagnostics || []), ...diagnostics];
    }
    window.dispatchEvent(new window.CustomEvent("nx-code-extensions-changed", { detail }));
  }, []);

  const activateExtensionTheme = React.useCallback(
    (theme) => {
      if (!theme?.activationAction || !theme.extensionId) return;
      const registryState = loadExtensionRegistryState();
      const nextRecords =
        theme.activationAction === "install"
          ? installExtension(registryState.records, theme.extensionId)
          : setExtensionEnabled(registryState.records, theme.extensionId, true);
      const saveResult = saveExtensionRegistry(nextRecords);
      dispatchExtensionRegistryChange(nextRecords, [
        ...(registryState.diagnostics || []),
        ...(registryState.migrations || []),
        ...(saveResult.diagnostics || []),
      ]);

      const nextModel = createThemeOptionsModel(nextRecords, theme.id);
      const enabledTheme = nextModel.selectable.find((option) => option.id === theme.id);
      applyThemeOption(enabledTheme);
    },
    [applyThemeOption, dispatchExtensionRegistryChange],
  );

  const applyVisualProfile = React.useCallback(
    (profile) => {
      onSettingsChange({ ...settings, ...profile.settings });
    },
    [onSettingsChange, settings],
  );

  const applyTextPreset = React.useCallback(
    (preset) => {
      updateSettings(preset.settings);
    },
    [updateSettings],
  );

  const applyLowPowerFallback = React.useCallback(() => {
    const performanceProfile = visualPerformanceProfiles.find(
      (profile) => profile.id === "performance",
    );
    updateSettings({
      ...(performanceProfile?.settings || {}),
      reduce_motion: true,
      animations_enabled: false,
      animation_speed: 0.75,
      minimap: false,
      smooth_caret: false,
      cursor_glow: false,
      icon_glow: false,
      panel_glow_outline: false,
      glow_renderer: "css",
      panel_background_mode: "blur",
      panel_blur_strength: 8,
      glow_intensity: 12,
      glow_radius: 8,
      visual_performance_profile: "performance",
    });
  }, [updateSettings]);

  const restoreBalancedVisuals = React.useCallback(() => {
    const balancedProfile = visualPerformanceProfiles.find(
      (profile) => profile.id === "balanced",
    );
    updateSettings({
      ...(balancedProfile?.settings || {}),
      reduce_motion: false,
      animations_enabled: true,
      animation_speed: 1,
      minimap: true,
      visual_performance_profile: "balanced",
    });
  }, [updateSettings]);

  const applyThemeEditorRecipe = React.useCallback(
    (recipe) => {
      updateSettings(recipe.settings);
    },
    [updateSettings],
  );

  const resetThemeEditor = React.useCallback(() => {
    updateSettings(buildThemeEditorResetPatch());
  }, [updateSettings]);

  const copyThemeJson = React.useCallback(async () => {
    const json = JSON.stringify(themeExportPayload, null, 2);
    try {
      const clipboard =
        typeof navigator !== "undefined" ? navigator.clipboard : null;
      if (!clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await clipboard.writeText(json);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  }, [themeExportPayload]);

  const renderIfVisible = (sectionId, render) =>
    visibleSectionIds.includes(sectionId) ? render() : null;

  const renderLspSetup = () =>
    isVisibleSetting("lsp_setup", "editor", searchTerm) ? (
      <SettingsGroup
        title="LSP Setup"
        description="PATH-Erkennung, Env-Overrides und Statusdiagnose ohne Auto-Installation."
      >
        <LspSetupPanel
          model={lspSetupModel}
          isRefreshing={lspSetupState.loading}
          onRefresh={refreshLspServers}
        />
      </SettingsGroup>
    ) : null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motionTransition}
      className="nx-code-settings-panel flex-1 flex overflow-hidden rounded-xl border border-white/5 min-w-0"
      style={{
        ...scopedThemeVars,
        background:
          "radial-gradient(circle at 14% 0%, rgba(var(--nexus-primary-rgb), 0.04), transparent 22rem), linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), var(--nexus-panel-surface)",
        backdropFilter: "var(--nexus-settings-filter, blur(12px) saturate(110%))",
        WebkitBackdropFilter:
          "var(--nexus-settings-filter, blur(12px) saturate(110%))",
        borderColor: "rgba(156,178,226,0.095)",
        borderRadius: `min(16px, ${Math.max(10, radius + 5)}px)`,
      }}
    >
      <SettingsNavigation
        activeSection={activeSection}
        sectionMatchCounts={sectionMatchCounts}
        searchQuery={searchQuery}
        searchTerm={searchTerm}
        totalMatches={totalMatches}
        visibleSectionIds={visibleSectionIds}
        shouldReduceMotion={shouldReduceMotion}
        motionTransition={motionTransition}
        onActiveSectionChange={setActiveSection}
        onClose={onClose}
        onResetSettings={onResetSettings}
        onSearchQueryChange={setSearchQuery}
      />

      <motion.main
        key={searchTerm ? "search-results" : activeSection}
        initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
        transition={motionTransition}
        className="nx-code-settings-content min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 xl:p-6"
      >
        {searchTerm && visibleSectionIds.length === 0 ? (
          <div className="flex h-full min-h-[22rem] items-center justify-center">
            <div className="max-w-sm text-center">
              <Search size={28} className="mx-auto text-gray-600" />
              <h2 className="mt-4 text-lg font-semibold text-gray-300">
                Keine Settings gefunden
              </h2>
              <p className="mt-2 break-words text-sm leading-6 text-gray-500">
                Probiere Begriffe wie Font, Glow, Diagnostics, Workbench oder
                Motion.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!searchTerm ? (
              <SettingsHeader
                title={activeMeta.label}
                eyebrow={activeMeta.eyebrow}
                description={activeMeta.description}
                icon={activeMeta.icon}
              />
            ) : (
              <SettingsHeader
                title="Suchergebnisse"
                eyebrow="Settings"
                description={`Gefiltert nach "${searchQuery}". Es werden passende Kategorien und Controls angezeigt.`}
                icon={Search}
              />
            )}

            {searchTerm ? (
              <SearchResultSummary
                query={searchQuery}
                totalMatches={totalMatches}
                sectionMatchCounts={sectionMatchCounts}
                results={searchResults}
                onOpenSetting={(result) => {
                  setActiveSection(result.section);
                  setSearchQuery("");
                }}
              />
            ) : null}

            {renderIfVisible("theme-editor", () => (
              <section key="theme-editor" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Theme Editor"
                    eyebrow="Design"
                    description="Die wichtigsten Design- und Editor-Regler an einem Ort."
                    icon={Palette}
                  />
                ) : null}
                <ThemePreview
                  settings={settings}
                  resolvedTheme={resolvedTheme}
                  visualBudgetSummary={visualBudgetSummary}
                  themeName={resolvedTheme.name}
                  primaryAccent={primaryAccent}
                  secondaryAccent={secondaryAccent}
                  radius={radius}
                  animationSpeed={animationSpeed}
                  shouldReduceMotion={shouldReduceMotion}
                />
                <ThemeEditorUtilityPanel
                  activeRecipeId={themeEditorRecipeId}
                  copyStatus={copyStatus}
                  exportSize={themeExportSize}
                  primaryAccent={primaryAccent}
                  secondaryAccent={secondaryAccent}
                  shouldReduceMotion={shouldReduceMotion}
                  onApplyRecipe={applyThemeEditorRecipe}
                  onApplyBalancedVisuals={restoreBalancedVisuals}
                  onApplyLowPower={applyLowPowerFallback}
                  onCopyJson={copyThemeJson}
                  onResetThemeEditor={resetThemeEditor}
                />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <VisualBudgetCard summary={visualBudgetSummary} />
                  <LowPowerFallbackPanel
                    state={lowPowerState}
                    onApply={applyLowPowerFallback}
                    onRestore={restoreBalancedVisuals}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup
                    title="Theme Tokens"
                    description="Direkte Farben und Oberflaechenwerte fuer Nexus Code."
                  >
                    <SettingRow
                      id="primary_accent"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Primaerfarbe"
                      description="Wirkt auf Cursor, aktive Settings, Buttons und Glow."
                    >
                      <ColorControl
                        label="Primaerfarbe"
                        value={settings.primary_accent}
                        fallback={primaryAccent}
                        onChange={(value) => updateSetting("primary_accent", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="secondary_accent"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Sekundaerfarbe"
                      description="Zweiter Ton fuer Gradients, Switches und Akzentpaare."
                    >
                      <ColorControl
                        label="Sekundaerfarbe"
                        value={settings.secondary_accent}
                        fallback={secondaryAccent}
                        onChange={(value) => updateSetting("secondary_accent", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="custom_surface"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Custom Surface"
                      description="Optionaler Panel-/Editor-Surface-Hexwert; leer entspricht dem Preset."
                    >
                      <ColorControl
                        label="Custom Surface"
                        value={settings.custom_surface}
                        fallback={resolvedTheme.colors.surfaceHex || "#11141d"}
                        onChange={(value) => updateSetting("custom_surface", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="custom_input_surface"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title="Input Surface"
                      description="Farbwert fuer Search-, Select- und Textfeld-Flaechen."
                    >
                      <ColorControl
                        label="Input Surface"
                        value={settings.custom_input_surface}
                        fallback={resolvedTheme.colors.inputSurface || "#151924"}
                        onChange={(value) => updateSetting("custom_input_surface", value)}
                      />
                    </SettingRow>
                    <ThemeTokenGrid tokens={themeTokens} />
                    <SettingRow
                      id="ui_radius"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Roundness / Radius: ${radius}px`}
                      description="Gespeicherter Radius fuer Theme-Editor und kuenftige UI-Anbindung."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[radius]}
                          onValueChange={([value]) => updateSetting("ui_radius", value)}
                          min={4}
                          max={24}
                          step={1}
                        />
                        <ValueBadge>{radius}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup
                    title="Glass und Glow"
                    description="Die sichtbaren Performance-sensiblen Design-Regler."
                  >
                    <SettingRow
                      id="glow_intensity"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Glow Intensitaet: ${settings.glow_intensity ?? 28}%`}
                      description="Steuert globale Accent-Leuchtkraft im Theme Resolver."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.glow_intensity ?? 28]}
                          onValueChange={([value]) => updateSetting("glow_intensity", value)}
                          min={0}
                          max={100}
                          step={5}
                        />
                        <ValueBadge>{settings.glow_intensity ?? 28}%</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="panel_blur_strength"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Blur Intensitaet: ${settings.panel_blur_strength ?? 16}px`}
                      description="Backdrop-Blur fuer Panels und Settings-Oberflaechen."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.panel_blur_strength ?? 16]}
                          onValueChange={([value]) => updateSetting("panel_blur_strength", value)}
                          min={0}
                          max={32}
                          step={2}
                        />
                        <ValueBadge>{settings.panel_blur_strength ?? 16}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="glow_radius"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Glow Radius: ${settings.glow_radius ?? 14}px`}
                      description="Ausbreitung des Accent-Glow."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.glow_radius ?? 14]}
                          onValueChange={([value]) => updateSetting("glow_radius", value)}
                          min={0}
                          max={64}
                          step={2}
                        />
                        <ValueBadge>{settings.glow_radius ?? 14}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>
                </div>

                <SettingsGroup
                  title="Editor Essentials"
                  description="Die VS-Code-artigen Editor-Optionen direkt im Theme Editor."
                >
                  <div className="mb-3">
                    <TextPresetGrid
                      settings={settings}
                      onApplyPreset={applyTextPreset}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    <SettingRow
                      id="font_family"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Editor Font"
                      description="Monospace-Familie fuer CodeMirror."
                    >
                      <NativeSelect
                        value={settings.font_family || "JetBrains Mono"}
                        onValueChange={(value) => updateSetting("font_family", value)}
                        className="w-48"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="font_size"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Font Size: ${settings.font_size || 14}px`}
                      description="Schriftgroesse im Editor."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.font_size || 14]}
                          onValueChange={([value]) => updateSetting("font_size", value)}
                          min={10}
                          max={28}
                          step={1}
                        />
                        <ValueBadge>{settings.font_size || 14}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="line_height"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Line Height: ${settings.line_height || 1.6}`}
                      description="Zeilenabstand in relativer Einheit."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.line_height || 1.6]}
                          onValueChange={([value]) => updateSetting("line_height", value)}
                          min={1.2}
                          max={2.5}
                          step={0.05}
                        />
                        <ValueBadge>{settings.line_height || 1.6}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="letter_spacing"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Letter Spacing: ${formatSettingNumber(letterSpacing, 2)}px`}
                      description="Wird direkt im CodeMirror Theme angewendet."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[letterSpacing]}
                          onValueChange={([value]) => updateSetting("letter_spacing", value)}
                          min={0}
                          max={1.5}
                          step={0.05}
                        />
                        <ValueBadge>{formatSettingNumber(letterSpacing, 2)}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="word_wrap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Word Wrap"
                      description="Lange Zeilen im Editor umbrechen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.word_wrap || false}
                        onCheckedChange={(value) => updateSetting("word_wrap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="minimap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Minimap"
                      description="Editor-Uebersicht aktiv lassen, wenn verfuegbar."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.minimap !== false}
                        onCheckedChange={(value) => updateSetting("minimap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="validation_decorations"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Diagnostics"
                      description="Lint-Gutter und Inline-Diagnostics anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.validation_decorations !== false}
                        onCheckedChange={(value) =>
                          updateSetting("validation_decorations", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete"
                      description="Language Server fuer Vorschlaege und Hover verwenden."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="reduce_motion"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Reduce Motion"
                      description="Reduziert Panel-Animation und setzt den Caret ruhig."
                      compact
                    >
                      <NativeSwitch
                        checked={reducedBySetting}
                        onCheckedChange={(value) =>
                          updateSettings({
                            reduce_motion: value,
                            smooth_caret: value ? false : true,
                          })
                        }
                      />
                    </SettingRow>
                  </div>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("editor", () => (
              <section key="editor" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Editor"
                    eyebrow="Text"
                    description="Typing, Layout, Hilfen und Cursor-Verhalten."
                    icon={Code2}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Typography" description="Editor-Schrift und Zeilenmetrik.">
                    <TextPresetGrid
                      settings={settings}
                      onApplyPreset={applyTextPreset}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                    <SettingRow
                      id="font_family"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Schriftfamilie"
                      description="Primare Monospace-Schrift."
                    >
                      <NativeSelect
                        value={settings.font_family || "JetBrains Mono"}
                        onValueChange={(value) => updateSetting("font_family", value)}
                        className="w-48"
                      >
                        {fonts.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="font_size"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Schriftgroesse: ${settings.font_size || 14}px`}
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.font_size || 14]}
                          onValueChange={([value]) => updateSetting("font_size", value)}
                          min={10}
                          max={28}
                          step={1}
                        />
                        <ValueBadge>{settings.font_size || 14}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="line_height"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Zeilenhoehe: ${settings.line_height || 1.6}`}
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.line_height || 1.6]}
                          onValueChange={([value]) => updateSetting("line_height", value)}
                          min={1.2}
                          max={2.5}
                          step={0.05}
                        />
                        <ValueBadge>{settings.line_height || 1.6}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="letter_spacing"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Letter Spacing: ${formatSettingNumber(letterSpacing, 2)}px`}
                      description="Feintuning fuer dichte Monospace-Schriften."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[letterSpacing]}
                          onValueChange={([value]) => updateSetting("letter_spacing", value)}
                          min={0}
                          max={1.5}
                          step={0.05}
                        />
                        <ValueBadge>{formatSettingNumber(letterSpacing, 2)}px</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="font_weight"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Schriftstaerke"
                      description="Codegewicht fuer bessere Lesbarkeit."
                    >
                      <NativeSelect
                        value={String(settings.font_weight || "400")}
                        onValueChange={(value) => updateSetting("font_weight", value)}
                        className="w-32"
                      >
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                      </NativeSelect>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Intelligence" description="Autocomplete, Snippets, lokale Woerter und Language Server.">
                    <SettingRow
                      id="autocomplete_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete aktiv"
                      description="Vorschlaege beim Tippen und ueber den Shortcut anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_enabled !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_lsp"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="LSP als Quelle"
                      description="Kontextnahe Vorschlaege vom Language Server nutzen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_lsp !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_lsp", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Language Server Engine"
                      description="Hover, Diagnostics und serverbasierte Features starten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_snippets"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Snippets"
                      description="Mehrzeilige Vorlagen fuer Funktionen, Klassen, SQL, HTML, Shell und mehr."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_snippets !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_snippets", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_language_hints"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Sprach-Hints"
                      description="Keywords und Standardstrukturen lokal anbieten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_language_hints !== false}
                        onCheckedChange={(value) =>
                          updateSetting("autocomplete_language_hints", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_local_words"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Datei-Woerter"
                      description="Symbole und Woerter aus der aktuellen Datei als Vorschlaege."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_local_words !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_local_words", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_min_chars"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Trigger nach: ${settings.autocomplete_min_chars || 2} Zeichen`}
                      description="Hoeher ist ruhiger, niedriger fuehlt sich schneller an."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.autocomplete_min_chars || 2]}
                          onValueChange={([value]) => updateSetting("autocomplete_min_chars", value)}
                          min={1}
                          max={5}
                          step={1}
                        />
                        <ValueBadge>{settings.autocomplete_min_chars || 2}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_max_items"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Vorschlagslimit: ${settings.autocomplete_max_items || 120}`}
                      description="Mehr Treffer sind hilfreicher, aber auf sehr grossen Dateien schwerer."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.autocomplete_max_items || 120]}
                          onValueChange={([value]) => updateSetting("autocomplete_max_items", value)}
                          min={24}
                          max={180}
                          step={12}
                        />
                        <ValueBadge>{settings.autocomplete_max_items || 120}</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Editor Verhalten" description="Sichtbarkeit und Eingabehilfen.">
                    <SettingRow
                      id="word_wrap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Word Wrap"
                      description="Lange Zeilen umbrechen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.word_wrap || false}
                        onCheckedChange={(value) => updateSetting("word_wrap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="minimap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Minimap"
                      description="Kompakte Uebersicht anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.minimap !== false}
                        onCheckedChange={(value) => updateSetting("minimap", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="validation_decorations"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Diagnostics"
                      description="Inline-Fehler und Lint-Gutter."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.validation_decorations !== false}
                        onCheckedChange={(value) =>
                          updateSetting("validation_decorations", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="tab_size"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title={`Tab-Groesse: ${settings.tab_size || 4}`}
                      description="Spaces pro Tab."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.tab_size || 4]}
                          onValueChange={([value]) => updateSetting("tab_size", value)}
                          min={2}
                          max={10}
                          step={1}
                        />
                        <ValueBadge>{settings.tab_size || 4}</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="render_whitespace"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Whitespace anzeigen"
                      description="Unsichtbare Zeichen im Editor markieren."
                    >
                      <NativeSelect
                        value={settings.render_whitespace || "none"}
                        onValueChange={(value) => updateSetting("render_whitespace", value)}
                        className="w-36"
                      >
                        <option value="none">Keine</option>
                        <option value="boundary">Grenzen</option>
                        <option value="all">Alle</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="bracket_colorization"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Klammerfarben"
                      description="Bracket Colorization aktivieren."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.bracket_colorization !== false}
                        onCheckedChange={(value) =>
                          updateSetting("bracket_colorization", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="format_on_paste"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Beim Einfuegen formatieren"
                      description="Format-on-paste fuer unterstuetzte Sprachen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.format_on_paste !== false}
                        onCheckedChange={(value) => updateSetting("format_on_paste", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="line_numbers"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Zeilennummern"
                      description="Line numbers im Gutter anzeigen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.line_numbers !== false}
                        onCheckedChange={(value) => updateSetting("line_numbers", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="sticky_scroll"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Sticky Scroll"
                      description="Fixierten Kontext aktivieren."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.sticky_scroll || false}
                        onCheckedChange={(value) => updateSetting("sticky_scroll", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>
                </div>
                {renderLspSetup()}
              </section>
            ))}

            {renderIfVisible("workbench", () => (
              <section key="workbench" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Workbench"
                    eyebrow="Shell"
                    description="Nexus-Code-Arbeitsflaeche, Panels und Ablenkungsgrad."
                    icon={PanelLeft}
                  />
                ) : null}
                {showWorkbenchQuickActions ? (
                  <SettingsGroup
                    title="Layout und Docking"
                    description="Schnelle Workbench-Aktionen fuer Shell, Snap-Zonen und kompakte Panels."
                  >
                    <WorkbenchQuickActions
                      layout={normalizedWorkbenchLayout}
                      activePanelId={activeWorkbenchPanelId}
                      activePanelLabel={activeWorkbenchPanelLabel}
                      onApplyPreset={onApplyWorkbenchLayoutPreset}
                      onSetSidePanelSize={onSetSidePanelSize}
                      onSetBottomPanelSize={onSetBottomPanelSize}
                      onDockActivePanel={onDockActivePanel}
                      onResetLayout={onResetWorkbenchLayout}
                    />
                  </SettingsGroup>
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Layout" description="Primary Shell und Statusflaechen.">
                    <SettingRow
                      id="sidebar_position"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Sidebar Position"
                      description="Activity Rail links oder rechts."
                    >
                      <NativeSelect
                        value={settings.sidebar_position || "left"}
                        onValueChange={(value) => updateSetting("sidebar_position", value)}
                        className="w-32"
                      >
                        <option value="left">Links</option>
                        <option value="right">Rechts</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="sidebar_visible"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Sidebar anzeigen"
                      description="Activity Rail und Side Panel sichtbar halten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.sidebar_visible !== false}
                        onCheckedChange={(value) => updateSetting("sidebar_visible", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="status_bar_visible"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Statusleiste anzeigen"
                      description="Sprache, Workspace und Problemstatus unten halten."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.status_bar_visible !== false}
                        onCheckedChange={(value) =>
                          updateSetting("status_bar_visible", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="zen_mode"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Zen Mode"
                      description="Fokussierte Oberflaeche ohne Zusatzrauschen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.zen_mode || false}
                        onCheckedChange={(value) => updateSetting("zen_mode", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="auto_save"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Auto Save"
                      description="Aenderungen ueber die bestehende Storage-Pipeline sichern."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.auto_save !== false}
                        onCheckedChange={(value) => updateSetting("auto_save", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Panels" description="Glass-Style fuer Workbench-Container.">
                    <SettingRow
                      id="panel_background_mode"
                      sectionId="workbench"
                      searchQuery={searchTerm}
                      title="Panel Background"
                      description="Blur, Fake Glass oder intensiver Glass Shader."
                    >
                      <NativeSelect
                        value={settings.panel_background_mode || "blur"}
                        onValueChange={(value) => updateSetting("panel_background_mode", value)}
                        className="w-40"
                      >
                        <option value="blur">Blur</option>
                        <option value="fake-glass">Fake Glass</option>
                        <option value="glass-shader">Glass Shader</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="ui_radius"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`UI Radius: ${radius}px`}
                      description="Gespeicherte Roundness fuer das Nexus-Design."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[radius]}
                          onValueChange={([value]) => updateSetting("ui_radius", value)}
                          min={4}
                          max={24}
                          step={1}
                        />
                        <ValueBadge>{radius}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>
                </div>
              </section>
            ))}

            {renderIfVisible("keybindings", () => (
              <section key="keybindings" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Keybindings"
                    eyebrow="Shortcuts"
                    description="Command-Shortcuts durchsuchen, lokal ueberschreiben und Konflikte erkennen."
                    icon={Keyboard}
                  />
                ) : null}
                <SettingsGroup
                  title="Shortcuts"
                  description="Overrides bleiben lokal im Settings-Objekt und koennen pro Binding oder komplett zurueckgesetzt werden."
                >
                  <SettingRow
                    id="keybindings_manager"
                    sectionId="keybindings"
                    searchQuery={searchTerm}
                    title="Keybinding Manager"
                    description="Standard-Shortcuts, Overrides, Kategorien und Konflikte in einer kompakten Liste."
                  >
                    <KeybindingManager
                      model={keybindingModel}
                      overrides={keybindingOverrides}
                      search={keybindingSearchQuery}
                      category={keybindingCategory}
                      onSearchChange={setKeybindingSearchQuery}
                      onCategoryChange={setKeybindingCategory}
                      onSetOverride={setKeybindingOverride}
                      onResetBinding={resetKeybinding}
                      onResetAll={() => updateKeybindingOverrides({})}
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("terminal", () => (
              <section key="terminal" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Terminal"
                    eyebrow="Shell"
                    description="Terminal-Defaults fuer neue Sessions."
                    icon={Terminal}
                  />
                ) : null}
                <SettingsGroup title="Terminal Defaults" description="Sichere, kleine Defaults fuer das integrierte Terminal.">
                  <SettingRow
                    id="terminal_default_profile"
                    sectionId="terminal"
                    searchQuery={searchTerm}
                    title="Default Profile"
                    description="Profil fuer neue Terminal-Sessions."
                  >
                    <NativeSelect
                      value={settings.terminal_default_profile || "system"}
                      onValueChange={(value) => updateSetting("terminal_default_profile", value)}
                      className="w-44"
                    >
                      <option value="system">System Default</option>
                      <option value="powershell">PowerShell</option>
                      <option value="bash">Bash</option>
                      <option value="cmd">Command Prompt</option>
                    </NativeSelect>
                  </SettingRow>
                  <SettingRow
                    id="terminal_confirm_kill"
                    sectionId="terminal"
                    searchQuery={searchTerm}
                    title="Kill bestaetigen"
                    description="Vor dem Beenden laufender Prozesse nachfragen."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.terminal_confirm_kill !== false}
                      onCheckedChange={(value) => updateSetting("terminal_confirm_kill", value)}
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("git", () => (
              <section key="git" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Git/GitHub"
                    eyebrow="Source"
                    description="Source-Control- und Review-nahe Defaults."
                    icon={GitBranch}
                  />
                ) : null}
                <SettingsGroup title="Source Control" description="Ruhige Defaults fuer lokale Repos und GitHub-Workbench.">
                  <SettingRow
                    id="git_auto_fetch"
                    sectionId="git"
                    searchQuery={searchTerm}
                    title="Auto Fetch"
                    description="Repository-Status automatisch aktualisieren."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.git_auto_fetch === true}
                      onCheckedChange={(value) => updateSetting("git_auto_fetch", value)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="git_smart_commit"
                    sectionId="git"
                    searchQuery={searchTerm}
                    title="Smart Commit"
                    description="Commit-Aktionen fuer eindeutige Aenderungen vorbereiten."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.git_smart_commit !== false}
                      onCheckedChange={(value) => updateSetting("git_smart_commit", value)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="github_pr_notifications"
                    sectionId="git"
                    searchQuery={searchTerm}
                    title="GitHub PR Hinweise"
                    description="Review- und Pull-Request-Signale im GitHub-Panel anzeigen."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.github_pr_notifications !== false}
                      onCheckedChange={(value) => updateSetting("github_pr_notifications", value)}
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("extensions", () => (
              <section key="extensions" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Extensions"
                    eyebrow="Runtime"
                    description="Extension-Management fuer die IDE-Workbench."
                    icon={Package}
                  />
                ) : null}
                <SettingsGroup title="Extension Runtime" description="Kompakte Controls fuer Updates und Empfehlungen.">
                  <SettingRow
                    id="extensions_auto_update"
                    sectionId="extensions"
                    searchQuery={searchTerm}
                    title="Auto Update"
                    description="Installierte Extensions automatisch aktuell halten."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.extensions_auto_update !== false}
                      onCheckedChange={(value) => updateSetting("extensions_auto_update", value)}
                    />
                  </SettingRow>
                  <SettingRow
                    id="extensions_recommendations"
                    sectionId="extensions"
                    searchQuery={searchTerm}
                    title="Recommendations"
                    description="Workspace-nahe Extension-Empfehlungen anzeigen."
                    compact
                  >
                    <NativeSwitch
                      checked={settings.extensions_recommendations !== false}
                      onCheckedChange={(value) =>
                        updateSetting("extensions_recommendations", value)
                      }
                    />
                  </SettingRow>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("theme", () => (
              <section key="theme" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Theme"
                    eyebrow="Presets"
                    description="Theme- und Hintergrundvorlagen."
                    icon={Sparkles}
                  />
                ) : null}
                <SettingsGroup title="Theme Presets" description="Nexus-Farbwelten mit Live-Akzent.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {effectiveThemeOptionsModel.selectable.map((theme) => (
                      <PresetButton
                        key={theme.id}
                        active={activeThemeId === theme.id}
                        title={theme.name}
                        badge={theme.source === "extension" ? theme.sourceLabel : undefined}
                        description={theme.source === "extension" ? theme.description : undefined}
                        colors={theme.colors}
                        shouldReduceMotion={shouldReduceMotion}
                        onClick={() => applyThemeOption(theme)}
                      />
                    ))}
                  </div>
                  {effectiveThemeOptionsModel.unavailable.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {effectiveThemeOptionsModel.unavailable.map((theme) => {
                        const canActivateTheme =
                          theme.canActivate === true && Boolean(theme.activationAction);
                        const stateBadge =
                          theme.unavailableState === "error"
                            ? "Blocked"
                            : theme.unavailableState === "removed"
                              ? "Removed"
                              : "Paused";
                        return (
                          <PresetButton
                            key={theme.id}
                            active={false}
                            disabled={!canActivateTheme}
                            title={theme.name}
                            badge={theme.activationLabel || stateBadge}
                            description={theme.unavailableReason || theme.description}
                            colors={theme.colors}
                            shouldReduceMotion={shouldReduceMotion}
                            onClick={
                              canActivateTheme
                                ? () => activateExtensionTheme(theme)
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </SettingsGroup>
                <SettingsGroup title="Hintergrund" description="Preset-Hintergruende oder Theme-Standard.">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <PresetButton
                      active={!settings.background}
                      title="Standard"
                      description="Vom aktiven Theme"
                      colors={[primaryAccent, secondaryAccent, resolvedTheme.colors.surface]}
                      shouldReduceMotion={shouldReduceMotion}
                      onClick={() => updateSetting("background", null)}
                    />
                    {backgrounds.map((background) => (
                      <PresetButton
                        key={background.id}
                        active={settings.background === background.id}
                        title={background.name}
                        colors={background.colors}
                        shouldReduceMotion={shouldReduceMotion}
                        onClick={() => updateSetting("background", background.id)}
                      />
                    ))}
                  </div>
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("performance", () => (
              <section key="performance" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Performance"
                    eyebrow="Budget"
                    description="Kosten von visuellen Effekten und Sprachfeatures."
                    icon={Gauge}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <VisualBudgetCard summary={visualBudgetSummary} />
                  <LowPowerFallbackPanel
                    state={lowPowerState}
                    onApply={applyLowPowerFallback}
                    onRestore={restoreBalancedVisuals}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Visual Performance" description="Schnelle Profile fuer Effektbudget.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {visualPerformanceProfiles.map((profile) => (
                        <PresetButton
                          key={profile.id}
                          active={visualProfileId === profile.id}
                          title={profile.label}
                          description={profile.description}
                          colors={[primaryAccent, secondaryAccent]}
                          shouldReduceMotion={shouldReduceMotion}
                          onClick={() => applyVisualProfile(profile)}
                        />
                      ))}
                    </div>
                    <SettingRow
                      id="glow_renderer"
                      sectionId="performance"
                      searchQuery={searchTerm}
                      title="Glow Renderer"
                      description="CSS ist stabil, Intensiv reserviert mehr visuelles Budget."
                    >
                      <NativeSelect
                        value={settings.glow_renderer || "css"}
                        onValueChange={(value) => updateSetting("glow_renderer", value)}
                        className="w-36"
                      >
                        <option value="css">CSS</option>
                        <option value="three">Intensiv</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="panel_glow_outline"
                      sectionId="performance"
                      searchQuery={searchTerm}
                      title="Panel Glow Outline"
                      description="Leuchtende Kante fuer Workbench-Panels und Settings."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.panel_glow_outline === true}
                        onCheckedChange={(value) => updateSetting("panel_glow_outline", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="panel_blur_strength"
                      sectionId="theme-editor"
                      searchQuery={searchTerm}
                      title={`Panel Blur: ${settings.panel_blur_strength ?? 16}px`}
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[settings.panel_blur_strength ?? 16]}
                          onValueChange={([value]) => updateSetting("panel_blur_strength", value)}
                          min={0}
                          max={32}
                          step={2}
                        />
                        <ValueBadge>{settings.panel_blur_strength ?? 16}px</ValueBadge>
                      </div>
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Language Features" description="Performance-relevante Editor-Dienste.">
                    <SettingRow
                      id="autocomplete_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Autocomplete"
                      description="Lokale Vorschlaege und Snippets beim Schreiben."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_enabled !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="autocomplete_lsp"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="LSP Suggestions"
                      description="Language Server als Completion-Quelle nutzen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.autocomplete_lsp !== false}
                        onCheckedChange={(value) => updateSetting("autocomplete_lsp", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="lsp_enabled"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Language Server"
                      description="Vorschlaege, Hover und Diagnose ueber installierte LSPs."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.lsp_enabled !== false}
                        onCheckedChange={(value) => updateSetting("lsp_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="validation_decorations"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Diagnostics"
                      description="Lint-Gutter und inline Markierungen."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.validation_decorations !== false}
                        onCheckedChange={(value) =>
                          updateSetting("validation_decorations", value)
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="minimap"
                      sectionId="editor"
                      searchQuery={searchTerm}
                      title="Minimap"
                      description="Auf kleineren Viewports automatisch zurueckhaltend."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.minimap !== false}
                        onCheckedChange={(value) => updateSetting("minimap", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>
                </div>
                <SettingsGroup
                  title="Live Budget Hinweise"
                  description="Schnelle Diagnose aus deinen aktuellen Visual- und Language-Settings."
                >
                  <PerformanceHintList hints={performanceHints} />
                </SettingsGroup>
              </section>
            ))}

            {renderIfVisible("animations", () => (
              <section key="animations" className="space-y-5">
                {searchTerm ? (
                  <SettingsHeader
                    title="Animations"
                    eyebrow="Motion"
                    description="Bewegung und Cursor-Gefuehl im Nexus Design."
                    icon={Zap}
                  />
                ) : null}
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <SettingsGroup title="Motion" description="Accessibility und Microinteraction-Budget.">
                    <SettingRow
                      id="reduce_motion"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Reduce Motion"
                      description="Reduziert Settings-Animationen und setzt den Caret ruhig."
                      compact
                    >
                      <NativeSwitch
                        checked={reducedBySetting}
                        onCheckedChange={(value) =>
                          updateSettings({
                            reduce_motion: value,
                            smooth_caret: value ? false : true,
                          })
                        }
                      />
                    </SettingRow>
                    <SettingRow
                      id="animations_enabled"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Animationen"
                      description="Mikroanimationen in diesem Settings-Erlebnis."
                      compact
                    >
                      <NativeSwitch
                        checked={animationsEnabled}
                        onCheckedChange={(value) => updateSetting("animations_enabled", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="animation_speed"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title={`Animation Speed: ${formatSettingNumber(animationSpeed, 2)}x`}
                      description="Steuert die Settings-Transition und die Live-Preview."
                    >
                      <div className="flex min-w-[12rem] items-center gap-3">
                        <NativeSlider
                          value={[animationSpeed]}
                          onValueChange={([value]) => updateSetting("animation_speed", value)}
                          min={0.5}
                          max={1.8}
                          step={0.1}
                        />
                        <ValueBadge>{formatSettingNumber(animationSpeed, 2)}x</ValueBadge>
                      </div>
                    </SettingRow>
                    <SettingRow
                      id="smooth_caret"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Sanfte Cursor-Animation"
                      description="Wirkt auch auf das globale visuelle Effektbudget."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.smooth_caret !== false}
                        onCheckedChange={(value) => updateSetting("smooth_caret", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="animated_typing"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Animated Typing"
                      description="Aktive Schreibzeile poppt kurz weich auf, ohne Layout zu verschieben."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.animated_typing === true}
                        onCheckedChange={(value) => updateSetting("animated_typing", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="typing_animation_style"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Typing Style"
                      description="Soft bleibt ruhig, Lift bewegt minimal, Glow betont Licht."
                    >
                      <NativeSelect
                        value={settings.typing_animation_style || "soft"}
                        onValueChange={(value) => updateSetting("typing_animation_style", value)}
                        className="w-36"
                      >
                        <option value="soft">Soft</option>
                        <option value="lift">Lift</option>
                        <option value="glow">Glow</option>
                        <option value="off">Aus</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="typing_glow"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Typing Glow"
                      description="Kurzer Lichtimpuls auf der aktiven Zeile beim Schreiben."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.typing_glow === true}
                        onCheckedChange={(value) => updateSetting("typing_glow", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="text_glow"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Text Glow"
                      description="Subtiler Glow auf Editor-Text; bei kleinen Screens automatisch ruhiger."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.text_glow === true}
                        onCheckedChange={(value) => updateSetting("text_glow", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>

                  <SettingsGroup title="Cursor und Glow" description="Kleine Bewegungs- und Lichtdetails.">
                    <SettingRow
                      id="cursor_blinking"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Cursor-Blinken"
                    >
                      <NativeSelect
                        value={settings.cursor_blinking || "solid"}
                        onValueChange={(value) => updateSetting("cursor_blinking", value)}
                        className="w-36"
                      >
                        <option value="solid">Fest</option>
                        <option value="blink">Blinken</option>
                        <option value="smooth">Sanft</option>
                        <option value="phase">Phase</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="cursor_style"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Cursor-Stil"
                    >
                      <NativeSelect
                        value={settings.cursor_style || "line"}
                        onValueChange={(value) => updateSetting("cursor_style", value)}
                        className="w-36"
                      >
                        <option value="line">Linie</option>
                        <option value="block">Block</option>
                        <option value="underline">Unterstrichen</option>
                      </NativeSelect>
                    </SettingRow>
                    <SettingRow
                      id="cursor_glow"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Cursor-Glow"
                      description="Leuchtender Cursor im Editor."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.cursor_glow === true}
                        onCheckedChange={(value) => updateSetting("cursor_glow", value)}
                      />
                    </SettingRow>
                    <SettingRow
                      id="icon_glow"
                      sectionId="animations"
                      searchQuery={searchTerm}
                      title="Icon Glow"
                      description="Leuchtende Icons in der Shell."
                      compact
                    >
                      <NativeSwitch
                        checked={settings.icon_glow || false}
                        onCheckedChange={(value) => updateSetting("icon_glow", value)}
                      />
                    </SettingRow>
                  </SettingsGroup>
                </div>
              </section>
            ))}

            <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-5 text-xs leading-tight text-gray-500 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-2">
                <Settings2 size={14} />
                <span className="min-w-0 break-words">Storage: bestehende Nexus-Code-Pipeline</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Cpu size={14} />
                <span className="min-w-0 break-words">Profil: {visualProfileId}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <Eye size={14} />
                <span className="min-w-0 break-words">Motion: {shouldReduceMotion ? "reduziert" : "aktiv"}</span>
              </div>
            </div>
          </div>
        )}
      </motion.main>
    </motion.div>
  );
}
