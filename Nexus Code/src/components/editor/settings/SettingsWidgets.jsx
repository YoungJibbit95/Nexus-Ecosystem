import { motion } from "framer-motion";
import {
  Check,
  Clipboard,
  Cpu,
  Gauge,
  Info,
  RefreshCcw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { NativeInput } from "../settingsShared.jsx";
import {
  getWorkbenchZonePanelIds,
  normalizeWorkbenchLayout,
} from "../../../pages/editor/workbenchDockModel.js";
import {
  TEXT_SIZE_PRESETS,
  THEME_EDITOR_RECIPES,
  WORKBENCH_BOTTOM_PANEL_SIZE_OPTIONS,
  WORKBENCH_DOCK_ACTIONS,
  WORKBENCH_LAYOUT_OPTIONS,
  WORKBENCH_SIDE_PANEL_SIZE_OPTIONS,
} from "./settingsCatalog.jsx";
import {
  formatSettingNumber,
  getNumberSetting,
  getTextPresetId,
} from "./settingsModels.js";
import { SettingsGroup, ValueBadge } from "./SettingsPrimitives.jsx";

function getLspToneClass(tone) {
  if (tone === "good") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  if (tone === "warn") return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  if (tone === "error") return "border-rose-300/20 bg-rose-300/10 text-rose-200";
  if (tone === "muted") return "border-white/[0.08] bg-white/[0.025] text-gray-500";
  return "border-sky-300/20 bg-sky-300/10 text-sky-200";
}

function getLspRowBackground(tone) {
  if (tone === "good") {
    return {
      background: "linear-gradient(135deg, rgba(34,197,94,0.07), rgba(14,165,233,0.032))",
      borderColor: "rgba(34,197,94,0.18)",
    };
  }
  if (tone === "warn") {
    return {
      background: "linear-gradient(135deg, rgba(251,191,36,0.075), rgba(148,163,184,0.025))",
      borderColor: "rgba(251,191,36,0.17)",
    };
  }
  if (tone === "error") {
    return {
      background: "linear-gradient(135deg, rgba(244,63,94,0.075), rgba(148,163,184,0.025))",
      borderColor: "rgba(244,63,94,0.18)",
    };
  }
  return {
    background: "rgba(255,255,255,0.018)",
    borderColor: "rgba(255,255,255,0.07)",
  };
}

function getLspStatusIcon(tone) {
  if (tone === "good") return Check;
  if (tone === "warn" || tone === "error") return X;
  return Info;
}

export function LspSetupPanel({ model, isRefreshing, onRefresh }) {
  const summary = model.summary;
  const detailTitles = ["Server", "Env-Var", "Install-Hint"];

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Info size={13} className="shrink-0" />
            <span className="min-w-0 break-words">PATH / Env / Retry</span>
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <p className="break-words text-sm font-semibold leading-tight text-gray-200">
              {summary.headline}
            </p>
            <ValueBadge>{summary.readyCount}/{summary.total} bereit</ValueBadge>
          </div>
          <p className="mt-1 max-w-3xl break-words text-[11px] leading-5 text-gray-500">
            {summary.message}
          </p>
          <p className="mt-1 max-w-3xl break-words text-[10px] leading-4 text-gray-600">
            {summary.caption}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[10px] font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60"
          title="PATH, Env-Overrides und Serverstatus erneut pruefen"
        >
          <RefreshCcw size={13} className={isRefreshing ? "animate-spin" : ""} />
          <span className="min-w-0 break-words">
            {isRefreshing ? "Pruefe" : "Status aktualisieren"}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {model.rows.map((row) => {
          const StatusIcon = getLspStatusIcon(row.statusTone);
          const rowStyle = getLspRowBackground(row.statusTone);
          return (
            <div
              key={row.id}
              className="grid min-w-0 gap-3 rounded-md border px-3 py-2.5"
              style={rowStyle}
              title={row.lastDiagnostic || row.statusDescription}
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words text-xs font-semibold leading-tight text-gray-200">
                      {row.languageLabel}
                    </span>
                    <span className="rounded-md border border-white/[0.08] bg-black/20 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-gray-500">
                      {row.serverLabel}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                    {row.statusDescription}
                  </p>
                </div>
                <span
                  className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight ${getLspToneClass(row.statusTone)}`}
                >
                  <StatusIcon size={12} className="shrink-0" />
                  <span className="min-w-0 break-words">{row.statusLabel}</span>
                </span>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-3">
                {row.details.map((detail, index) => (
                  <div
                    key={`${row.id}-${detailTitles[index]}`}
                    className="min-w-0 rounded-md border border-white/[0.055] bg-black/10 px-2.5 py-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase leading-tight text-gray-500">
                      <span>{detailTitles[index]}</span>
                      <span className={`rounded border px-1.5 py-0.5 normal-case ${getLspToneClass(detail.tone)}`}>
                        {detail.label}
                      </span>
                    </div>
                    {detail.code ? (
                      <code className="mt-1 block break-all text-[10px] leading-4 text-gray-400">
                        {detail.code}
                      </code>
                    ) : null}
                    <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                      {detail.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 items-start gap-2 rounded-md border border-white/[0.05] bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-500">
                <RefreshCcw size={12} className="mt-0.5 shrink-0 text-gray-500" />
                <span className="min-w-0 break-words">{row.actionHint}</span>
              </div>
              {row.lastDiagnostic ? (
                <div className="break-words rounded-md border border-white/[0.05] bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-600">
                  Diagnose: {row.lastDiagnostic}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VisualBudgetCard({ summary }) {
  const toneStyles =
    summary.tone === "warn"
      ? {
          background: "rgba(245,158,11,0.08)",
          borderColor: "rgba(245,158,11,0.2)",
          fill: "linear-gradient(90deg, #f59e0b, #ef4444)",
        }
      : summary.tone === "good"
        ? {
            background: "rgba(34,197,94,0.07)",
            borderColor: "rgba(34,197,94,0.16)",
            fill: "linear-gradient(90deg, #8b5cf6, #38bdf8)",
          }
        : {
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
            borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
            fill: "linear-gradient(90deg, var(--nexus-primary), var(--nexus-accent-2))",
          };

  return (
    <section
      className="nx-code-settings-group rounded-lg border p-4"
      style={{
        background:
          summary.tone === "warn" || summary.tone === "good"
            ? toneStyles.background
            : "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.045), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: toneStyles.borderColor,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Gauge size={13} />
            <span className="min-w-0 break-words">Visual Budget</span>
          </div>
          <div className="mt-2 break-words text-sm font-semibold text-gray-100">
            {summary.tier}
          </div>
        </div>
        <ValueBadge>{summary.score}/100</ValueBadge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/25">
        <div
          className="h-full rounded-full"
          style={{
            width: `${summary.score}%`,
            background: toneStyles.fill,
          }}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {summary.categories.map((category) => (
          <div
            key={category.id}
            className="min-w-0 rounded-md border border-white/5 bg-black/10 px-2.5 py-2 text-[10px]"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 break-words font-semibold text-gray-400">{category.label}</span>
              <span className={category.hot ? "shrink-0 font-semibold text-amber-200" : "shrink-0 text-gray-300"}>
                {category.rating}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center justify-between gap-2 text-gray-500">
              <span className="min-w-0 break-words">{category.detail}</span>
              <span className="shrink-0 text-gray-400">{category.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {summary.recommendations.map((recommendation) => (
          <div
            key={recommendation}
            className="flex min-w-0 gap-2 rounded-md bg-black/10 px-2.5 py-1.5 text-[10px] leading-4 text-gray-400"
          >
            <Zap size={11} className="mt-0.5 shrink-0 text-gray-500" />
            <span className="min-w-0 break-words">{recommendation}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LowPowerFallbackPanel({ state, onApply, onRestore }) {
  return (
    <section
      className="nx-code-settings-group rounded-lg border p-4"
      style={{
        background: state.active
          ? "rgba(34,197,94,0.055)"
          : "linear-gradient(180deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.042), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: state.active
          ? "rgba(34,197,94,0.16)"
          : "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)",
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Cpu size={13} />
            <span className="min-w-0 break-words">Low Power</span>
          </div>
          <h3 className="mt-2 break-words text-sm font-semibold text-gray-100">
            {state.title}
          </h3>
          <p className="mt-1 max-w-xl break-words text-xs leading-5 text-gray-500">
            {state.text}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold leading-tight text-gray-100"
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)",
            }}
          >
            <Zap size={13} />
            Anwenden
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300"
          >
            <RefreshCcw size={13} />
            Balanced
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {state.reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-[10px] leading-tight text-gray-400"
          >
            {reason}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {state.actions.map((action) => (
          <div
            key={action}
            className="rounded-md border border-white/5 bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-400"
          >
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ColorControl({ value, fallback, onChange, label }) {
  const current = value || fallback;
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(current)
    ? current
    : /^#[0-9a-fA-F]{3}$/.test(current)
      ? current
      : fallback;
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <input
        aria-label={label}
        type="color"
        value={pickerValue}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-white/10 bg-transparent p-1"
      />
      <NativeInput
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 bg-white/5 font-mono text-gray-300"
        style={{
          background: "var(--nexus-input-surface, rgba(255,255,255,0.04))",
          border: "1px solid rgba(156,178,226,0.1)",
        }}
      />
      {value ? (
        <button
          type="button"
          title="Preset-Wert verwenden"
          onClick={() => onChange(null)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.025] text-gray-500 transition-colors hover:bg-white/[0.052] hover:text-gray-300"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function TextPresetGrid({ settings, onApplyPreset, shouldReduceMotion }) {
  const activePresetId = getTextPresetId(settings);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TEXT_SIZE_PRESETS.map((preset) => (
        <PresetButton
          key={preset.id}
          active={activePresetId === preset.id}
          title={preset.label}
          description={preset.description}
          shouldReduceMotion={shouldReduceMotion}
          onClick={() => onApplyPreset(preset)}
        />
      ))}
    </div>
  );
}

export function ThemeEditorUtilityPanel({
  activeRecipeId,
  copyStatus,
  exportSize,
  primaryAccent,
  secondaryAccent,
  shouldReduceMotion,
  onApplyRecipe,
  onApplyBalancedVisuals,
  onApplyLowPower,
  onCopyJson,
  onResetThemeEditor,
}) {
  return (
    <SettingsGroup
      title="Presets und Austausch"
      description="Theme-Rezepte anwenden, lokale Theme-Werte exportieren oder Designwerte zuruecksetzen."
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {THEME_EDITOR_RECIPES.map((recipe) => (
            <PresetButton
              key={recipe.id}
              active={activeRecipeId === recipe.id}
              title={recipe.label}
              description={recipe.description}
              colors={recipe.colors}
              shouldReduceMotion={shouldReduceMotion}
              onClick={() => onApplyRecipe(recipe)}
            />
          ))}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-44 lg:grid-cols-1">
          <button
            type="button"
            onClick={onApplyBalancedVisuals}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <Gauge size={13} />
            <span className="min-w-0 break-words text-center">Balanced</span>
          </button>
          <button
            type="button"
            onClick={onApplyLowPower}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <Cpu size={13} />
            <span className="min-w-0 break-words text-center">Low Power</span>
          </button>
          <button
            type="button"
            onClick={onCopyJson}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold leading-tight text-gray-100 transition-colors hover:bg-white/[0.05]"
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.22)",
            }}
          >
            <Clipboard size={13} />
            <span className="min-w-0 break-words text-center">
              {copyStatus === "copied" ? "Kopiert" : copyStatus === "failed" ? "Fehler" : "Copy JSON"}
            </span>
          </button>
          <button
            type="button"
            onClick={onResetThemeEditor}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <RefreshCcw size={13} />
            <span className="min-w-0 break-words text-center">Reset Design</span>
          </button>
          <div className="rounded-md border border-white/5 bg-black/10 px-2.5 py-2 text-[10px] leading-4 text-gray-500 sm:col-span-2 lg:col-span-1">
            JSON {exportSize}; Accent {primaryAccent}; Secondary {secondaryAccent}
          </div>
        </div>
      </div>
    </SettingsGroup>
  );
}

export function PresetButton({
  active,
  title,
  description,
  badge,
  colors = [],
  onClick,
  shouldReduceMotion,
  disabled = false,
}) {
  return (
    <motion.button
      whileHover={shouldReduceMotion || disabled ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion || disabled ? undefined : { scale: 0.99 }}
      onClick={onClick}
      disabled={disabled}
      title={disabled && description ? description : title}
      className="group min-w-0 rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
      style={{
        background: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)"
          : "rgba(255,255,255,0.018)",
        borderColor: active
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.26)"
          : "rgba(156,178,226,0.065)",
        boxShadow: active
          ? "0 12px 26px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.065)"
          : "none",
      }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 break-words text-xs font-semibold leading-tight text-gray-200">
          {title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {badge ? (
            <span className="rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-gray-500">
              {badge}
            </span>
          ) : null}
          {active ? <Check size={13} style={{ color: "var(--nexus-primary)" }} /> : null}
        </span>
      </div>
      {description ? (
        <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
          {description}
        </p>
      ) : null}
      {colors.length > 0 ? (
        <div className="mt-3 flex gap-1">
          {colors.slice(0, 4).map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="h-4 w-4 rounded-full border border-white/10"
              style={{ background: color }}
            />
          ))}
        </div>
      ) : null}
    </motion.button>
  );
}

function WorkbenchSegmentedControl({
  label,
  options,
  value,
  onChange,
  getOptionLabel = (option) => option.label,
  disabled = false,
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 break-words text-[10px] font-semibold uppercase leading-tight text-gray-500">
        {label}
      </div>
      <div
        className="grid min-h-9 min-w-0 overflow-hidden rounded-md border border-white/10 bg-white/[0.025]"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const isActive = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(option.id)}
              aria-pressed={isActive}
              title={option.title || option.label}
              className={`min-w-0 px-2 py-1.5 text-[10px] font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                isActive
                  ? "bg-white/12 text-white"
                  : "text-[var(--nexus-muted)] hover:bg-white/[0.07] hover:text-gray-200"
              }`}
            >
              <span className="block min-w-0 break-words">{getOptionLabel(option)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getZonePanelSummary(layout, zone) {
  const count = getWorkbenchZonePanelIds(layout, zone).length;
  if (count === 1) return "1 Panel";
  return `${count} Panels`;
}

export function WorkbenchQuickActions({
  layout,
  activePanelId,
  activePanelLabel,
  onApplyPreset,
  onSetSidePanelSize,
  onSetBottomPanelSize,
  onDockActivePanel,
  onResetLayout,
}) {
  const normalizedLayout = normalizeWorkbenchLayout(layout);
  const activeZone = activePanelId
    ? normalizedLayout.panelZones?.[activePanelId] || null
    : null;
  const canDock = Boolean(activePanelId && onDockActivePanel);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <WorkbenchSegmentedControl
          label="Layout"
          options={WORKBENCH_LAYOUT_OPTIONS}
          value={normalizedLayout.presetId}
          onChange={onApplyPreset}
          disabled={!onApplyPreset}
          getOptionLabel={(option) => option.label}
        />
        <WorkbenchSegmentedControl
          label="Side"
          options={WORKBENCH_SIDE_PANEL_SIZE_OPTIONS}
          value={normalizedLayout.sidePanelSize}
          onChange={onSetSidePanelSize}
          disabled={!onSetSidePanelSize}
        />
        <WorkbenchSegmentedControl
          label="Bottom"
          options={WORKBENCH_BOTTOM_PANEL_SIZE_OPTIONS}
          value={normalizedLayout.bottomPanelSize}
          onChange={onSetBottomPanelSize}
          disabled={!onSetBottomPanelSize}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0 rounded-md border border-white/5 bg-white/[0.014] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="break-words text-[10px] font-semibold uppercase leading-tight text-gray-500">
                Docking
              </div>
              <div className="mt-1 break-words text-xs font-semibold text-gray-200">
                {activePanelLabel || activePanelId || "Explorer"}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              {WORKBENCH_DOCK_ACTIONS.map(({ zone, label, Icon }) => {
                const isActive = activeZone === zone;
                return (
                  <button
                    key={zone}
                    type="button"
                    disabled={!canDock}
                    onClick={() => onDockActivePanel?.(zone)}
                    aria-pressed={isActive}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      isActive
                        ? "border-white/20 bg-white/12 text-white"
                        : "border-white/10 bg-white/[0.03] text-[var(--nexus-muted)] hover:bg-white/[0.07] hover:text-gray-200"
                    }`}
                    title={`Dock ${label}`}
                  >
                    <Icon size={13} />
                    <span className="sr-only">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-gray-500 sm:grid-cols-4">
            {WORKBENCH_DOCK_ACTIONS.map(({ zone, label }) => (
              <div
                key={`${zone}-summary`}
                className="min-w-0 rounded-md border border-white/5 bg-black/10 px-2 py-1.5"
              >
                <div className="break-words font-semibold text-gray-400">{label}</div>
                <div className="break-words">{getZonePanelSummary(normalizedLayout, zone)}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!onResetLayout}
          onClick={onResetLayout}
          className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-45 xl:w-32"
          title="Workbench Layout zuruecksetzen"
        >
          <RefreshCcw size={13} />
          Reset
        </button>
      </div>
    </div>
  );
}

export function ThemePreview({
  settings,
  resolvedTheme,
  visualBudgetSummary,
  themeName,
  primaryAccent,
  secondaryAccent,
  radius,
  animationSpeed,
  shouldReduceMotion,
}) {
  const glowIntensity = getNumberSetting(settings, "glow_intensity", 28);
  const glowRadius = getNumberSetting(settings, "glow_radius", 14);
  const blurStrength = getNumberSetting(settings, "panel_blur_strength", 16);
  const fontSize = getNumberSetting(settings, "font_size", 14);
  const lineHeight = getNumberSetting(settings, "line_height", 1.6);
  const letterSpacing = getNumberSetting(settings, "letter_spacing", 0);
  const surfaceHex = resolvedTheme.colors.surfaceHex || "#11141d";
  const inputSurface = settings.custom_input_surface || resolvedTheme.colors.inputSurface || "#151924";
  const sidebarVisible = settings.sidebar_visible !== false;
  const statusVisible = settings.status_bar_visible !== false;
  const sidebarRight = settings.sidebar_position === "right";
  const cursorStyle = settings.cursor_style || "line";
  const previewShadow =
    glowIntensity > 0
      ? `0 0 ${Math.max(4, Math.round((glowRadius * glowIntensity) / 90))}px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)`
      : "none";
  const cursorShape =
    cursorStyle === "block"
      ? "h-5 w-2.5"
      : cursorStyle === "underline"
        ? "h-0.5 w-4 self-end"
        : "h-5 w-0.5";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="nx-code-settings-preview overflow-hidden rounded-lg border"
      style={{
        borderRadius: radius,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(0,0,0,0.18)",
        borderColor: "rgba(156,178,226,0.08)",
        boxShadow: previewShadow,
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3"
        style={{
          background: `linear-gradient(135deg, rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.09), rgba(var(--nexus-accent-2-rgb, 45, 212, 191), 0.04))`,
          backdropFilter: blurStrength > 0 ? `blur(${Math.min(12, blurStrength)}px)` : "none",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: primaryAccent }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: secondaryAccent }}
          />
          <span className="ml-1 min-w-0 break-words text-xs font-semibold text-gray-300">
            settings.preview.tsx
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
          <span>{themeName}</span>
          <span>{settings.word_wrap ? "Wrap" : "No Wrap"}</span>
          <span>{shouldReduceMotion ? "Motion off" : `${formatSettingNumber(animationSpeed, 2)}x motion`}</span>
        </div>
      </div>
      <div className="flex min-h-[15rem]">
        {sidebarVisible && !sidebarRight ? (
          <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-white/5 py-4">
            {[primaryAccent, secondaryAccent, "rgba(255,255,255,0.18)"].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-6 w-6 rounded-md border border-white/10"
                style={{ background: color }}
              />
            ))}
          </div>
        ) : null}
        <div className="grid min-w-0 flex-1 grid-cols-[3rem_minmax(0,1fr)] sm:grid-cols-[3.5rem_minmax(0,1fr)]">
          <div className="border-r border-white/5 px-3 py-4 text-right font-mono text-[11px] leading-6 text-gray-600">
            <div>1</div>
            <div>2</div>
            <div>3</div>
            <div>4</div>
          </div>
          <div
            className="min-w-0 px-4 py-4 font-mono text-gray-300"
            style={{
              fontFamily: settings.font_family || "JetBrains Mono",
              fontSize,
              lineHeight,
              letterSpacing,
              fontWeight: settings.font_weight || "400",
            }}
          >
            <div>
              <span style={{ color: "var(--nexus-keyword)" }}>const</span>{" "}
              <span style={{ color: "var(--nexus-variable)" }}>theme</span>{" "}
              <span style={{ color: "var(--nexus-operator)" }}>=</span>{" "}
              <span style={{ color: "var(--nexus-string)" }}>"Nexus"</span>;
            </div>
            <div>
              <span style={{ color: "var(--nexus-function)" }}>applyGlow</span>
              <span style={{ color: "var(--nexus-text)" }}>(</span>
              <span style={{ color: "var(--nexus-number)" }}>{glowIntensity}</span>
              <span style={{ color: "var(--nexus-text)" }}>)</span>;
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-gray-500">
              <span>// cursor</span>
              <span
                className={`${cursorShape} inline-block rounded-sm`}
                style={{ background: primaryAccent, boxShadow: previewShadow }}
              />
              <span>{cursorStyle}</span>
            </div>
            <div className="break-words text-gray-500">
              // blur {blurStrength}px, radius {radius}px, letter {formatSettingNumber(letterSpacing, 2)}px
            </div>
            <div
              className="mt-4 rounded-md border px-3 py-2 font-sans text-xs"
              style={{
                background: "var(--nexus-input-surface, rgba(255,255,255,0.05))",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Search size={13} className="shrink-0 text-gray-500" />
                <span className="min-w-0 break-words text-gray-400">Settings suchen: input surface, glow, low power</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 font-sans text-[10px] text-gray-500 lg:grid-cols-4">
              {visualBudgetSummary.categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-md border border-white/5 bg-black/10 px-2 py-1.5"
                >
                  <div className="break-words font-semibold text-gray-300">{category.label}</div>
                  <div className={category.hot ? "text-amber-200" : "text-gray-500"}>
                    {category.rating} / {category.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {sidebarVisible && sidebarRight ? (
          <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-l border-white/5 py-4">
            {[primaryAccent, secondaryAccent, "rgba(255,255,255,0.18)"].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-6 w-6 rounded-md border border-white/10"
                style={{ background: color }}
              />
            ))}
          </div>
        ) : null}
      </div>
      {statusVisible ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-2 text-[10px] leading-tight text-gray-500">
          <span>main.tsx</span>
          <span>Surface {surfaceHex}</span>
          <span>Input {inputSurface}</span>
          <span>{settings.lsp_enabled !== false ? "LSP ready" : "LSP off"}</span>
          <span>{settings.auto_save !== false ? "Auto Save" : "Manual Save"}</span>
        </div>
      ) : null}
    </motion.div>
  );
}
