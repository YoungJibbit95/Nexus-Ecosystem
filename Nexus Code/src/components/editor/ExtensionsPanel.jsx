import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Blocks,
  ChevronDown,
  Clipboard,
  Command,
  Database,
  Download,
  Eye,
  FileJson2,
  Filter,
  Languages,
  ListChecks,
  PackageCheck,
  Palette,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  EXTENSION_CATEGORIES,
  EXTENSION_CONTRIBUTION_FILTERS,
  EXTENSION_SOURCES,
  EXTENSION_STATE_FILTERS,
  createDefaultExtensionRecords,
  createExtensionEventDetail,
  createExtensionRuntimeSnapshot,
  filterExtensions,
  formatContributionPreview,
  getExtensionStats,
  getExtensionRuntimeOverview,
  installExtension,
  loadExtensionRegistryState,
  resolveExtensions,
  saveExtensionRegistry,
  setExtensionEnabled,
  uninstallExtension,
} from "../../pages/editor/extensionSystem";
import {
  PanelActionButton,
  PanelBadge,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelMetric,
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

const tabStyles = {
  all: "Alle",
  installed: "Installiert",
  enabled: "Aktiv",
  local: "Lokal",
};

const contributionIcons = {
  commands: Command,
  views: Eye,
  languages: Languages,
  themes: Palette,
};

const storageHealthLabels = {
  ok: "Registry ok",
  migrated: "Migration bereit",
  default: "Defaults aktiv",
  degraded: "Registry pruefen",
  unavailable: "Nur Sitzung",
};

async function writeClipboardText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function getMessageTone(level) {
  if (level === "error") {
    return {
      icon: "text-red-300",
      text: "text-red-200",
      background: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.22)",
    };
  }

  if (level === "info") {
    return {
      icon: "text-sky-300",
      text: "text-sky-200",
      background: "rgba(56,189,248,0.08)",
      border: "rgba(56,189,248,0.18)",
    };
  }

  return {
    icon: "text-amber-300",
    text: "text-amber-200",
    background: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
  };
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-7 rounded-md px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/60"
      style={{
        color: active ? "var(--nexus-text)" : "var(--nexus-muted)",
      }}
    >
      {active ? (
        <motion.span
          layoutId="extension-segment"
          className="absolute inset-0 rounded-md"
          style={{
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.16)",
            border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)",
          }}
        />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function SelectFilter({ icon: Icon, value, options, onChange, title }) {
  return (
    <label
      className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2"
      style={{
        background: "rgba(255,255,255,0.035)",
        borderColor: "var(--nexus-border)",
      }}
      title={title}
    >
      <Icon size={12} className="shrink-0 text-[var(--nexus-muted)]" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[var(--nexus-text)] outline-none"
        style={{ colorScheme: "dark" }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SystemMessage({ message }) {
  const tone = getMessageTone(message.level);
  return (
    <div
      className="flex min-w-0 items-start gap-2 rounded-md border px-2 py-1.5"
      style={{
        background: tone.background,
        borderColor: tone.border,
      }}
    >
      <AlertTriangle
        size={12}
        className={`mt-0.5 shrink-0 ${tone.icon}`}
      />
      <div className="min-w-0">
        <p className={`truncate text-[10px] font-semibold ${tone.text}`}>
          {message.message}
        </p>
        {message.detail ? (
          <p className="truncate text-[10px] text-[var(--nexus-muted)]">{message.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onClick, disabled }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={onClick}
      className="relative h-5 w-9 shrink-0 rounded-full outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-purple-500/60 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: checked
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.35)"
          : "rgba(255,255,255,0.08)",
        border: checked
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.42)"
          : "1px solid rgba(255,255,255,0.12)",
      }}
      title={checked ? "Extension pausieren" : "Extension aktivieren"}
    >
      <motion.span
        layout
        className="absolute top-0.5 h-4 w-4 rounded-full"
        animate={{ left: checked ? 17 : 2 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        style={{
          background: checked ? "var(--nexus-primary, #7c8cff)" : "#6b7280",
          boxShadow: checked ? "0 0 10px rgba(124,140,255,0.34)" : "none",
        }}
      />
    </button>
  );
}

function ContributionOverview({ overview, stats, storageHealth }) {
  const activationTypes = Object.entries(overview.activation.byType);
  const healthLabel = storageHealthLabels[storageHealth] || storageHealthLabels.default;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {overview.contributionPoints.map((point) => {
          const Icon = contributionIcons[point.point] || ListChecks;
          return (
            <div
              key={point.point}
              className="min-w-0 rounded-md border px-2 py-1.5"
              style={{
                background: "rgba(255,255,255,0.026)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-gray-300">
                  <Icon size={11} className="shrink-0 text-[var(--nexus-muted)]" />
                  <span className="truncate">{point.label}</span>
                </span>
                <span className="font-mono text-[11px] text-[var(--nexus-text)]">
                  {point.count}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[9px] text-[var(--nexus-muted)]">
                {point.items.slice(0, 2).join(", ") || "Noch keine aktiven Beitraege"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div
          className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5"
          style={{
            background: "rgba(255,255,255,0.024)",
            borderColor: "rgba(255,255,255,0.055)",
          }}
        >
          <Activity size={12} className="shrink-0 text-[var(--nexus-muted)]" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-300">
              {stats.activationEvents} Activation Events
            </p>
            <p className="truncate text-[9px] text-[var(--nexus-muted)]">
              {activationTypes.map(([type, entries]) => `${type} ${entries.length}`).join(", ") ||
                "keine aktiven Trigger"}
            </p>
          </div>
        </div>

        <div
          className="flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5"
          style={{
            background: "rgba(255,255,255,0.024)",
            borderColor: "rgba(255,255,255,0.055)",
          }}
        >
          <Database size={12} className="shrink-0 text-[var(--nexus-muted)]" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-gray-300">{healthLabel}</p>
            <p className="truncate text-[9px] text-[var(--nexus-muted)]">
              {stats.errors > 0 ? `${stats.errors} Fehlerzustand` : "Manifest-Index stabil"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivationEventList({ events }) {
  if (!events.length) {
    return (
      <p className="rounded border border-white/[0.05] bg-white/[0.025] px-1.5 py-1 text-[10px] text-[var(--nexus-muted)]">
        Keine Aktivierungsereignisse deklariert.
      </p>
    );
  }

  return (
    <div className="grid gap-1">
      {events.slice(0, 4).map((event) => (
        <div
          key={event.id}
          className="flex min-w-0 items-center justify-between gap-2 rounded border border-white/[0.05] bg-white/[0.025] px-1.5 py-1 text-[10px]"
        >
          <span className="min-w-0 truncate text-gray-300">{event.label}</span>
          <span className="shrink-0 rounded bg-white/[0.04] px-1 text-[9px] uppercase text-[var(--nexus-muted)]">
            {event.type}
          </span>
        </div>
      ))}
    </div>
  );
}

function ContributionDetailList({ summaries }) {
  if (!summaries.length) {
    return (
      <p className="rounded border border-white/[0.05] bg-white/[0.025] px-1.5 py-1 text-[10px] text-[var(--nexus-muted)]">
        Dieses Manifest deklariert keine Contributions.
      </p>
    );
  }

  return (
    <div className="grid gap-1">
      {summaries.map((summary) => (
        <div
          key={summary.point}
          className="grid min-w-0 grid-cols-[6.5rem_1fr] gap-2 rounded border border-white/[0.05] bg-white/[0.025] px-1.5 py-1 text-[10px]"
        >
          <span className="truncate font-semibold text-gray-300">{summary.label}</span>
          <span className="min-w-0 truncate text-gray-500">
            {formatContributionPreview(summary, 4)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ExtensionCard({ extension, onInstall, onRemove, onToggleEnabled, index }) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const manifestIssues = [...extension.manifestErrors, ...extension.manifestWarnings];
  const runtimeIssue =
    extension.lastError &&
    !manifestIssues.some((issue) => issue.message === extension.lastError)
      ? {
          level: "error",
          code: "runtime.lastError",
          message: extension.lastError,
          detail: extension.disabledReason || "Runtime state recorded in extension registry.",
        }
      : null;
  const visibleIssues = runtimeIssue ? [...manifestIssues, runtimeIssue] : manifestIssues;
  const manifestBlocked = extension.manifestErrors.length > 0;
  const primaryContributions = extension.contributionSummary
    .filter((summary) => summary.primary)
    .slice(0, 4);
  const statusLabel = manifestBlocked
    ? "Blockiert"
    : !extension.installed
      ? "Verfuegbar"
      : extension.enabled
        ? "Aktiv"
        : "Pausiert";

  const runAction = (action) => {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      action();
      setBusy(false);
    }, 180);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, height: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18), duration: 0.2 }}
      className="group rounded-md p-2.5"
      style={{
        background: extension.installed
          ? "rgba(255,255,255,0.034)"
          : "rgba(255,255,255,0.024)",
        border: extension.enabled
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)"
          : "1px solid rgba(255,255,255,0.065)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold"
          style={{
            background: `${extension.iconColor}18`,
            borderColor: `${extension.iconColor}40`,
            color: extension.iconColor,
          }}
        >
          {extension.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="min-w-0 truncate text-xs font-semibold text-[var(--nexus-text)]">
              {extension.displayName}
            </h3>
            {extension.verified ? (
              <BadgeCheck size={12} className="shrink-0 text-sky-400" />
            ) : null}
            {extension.updateAvailable && extension.installed ? (
              <span className="shrink-0 rounded border border-amber-400/25 bg-amber-400/10 px-1 text-[9px] font-semibold text-amber-300">
                Update
              </span>
            ) : null}
            {manifestBlocked ? (
              <span className="shrink-0 rounded border border-red-400/25 bg-red-400/10 px-1 text-[9px] font-semibold text-red-300">
                Manifest
              </span>
            ) : extension.manifestWarnings.length > 0 ? (
              <span className="shrink-0 rounded border border-amber-400/25 bg-amber-400/10 px-1 text-[9px] font-semibold text-amber-300">
                Warnung
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--nexus-muted)]">
            <span className="truncate">{extension.publisher}</span>
            <span>v{extension.version}</span>
            <span className="uppercase">{extension.source}</span>
            <span>{statusLabel}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400">
            {extension.description}
          </p>
        </div>

        <ToggleSwitch
          checked={extension.enabled}
          disabled={!extension.installed || busy || manifestBlocked}
          onClick={() => runAction(() => onToggleEnabled(extension.id, !extension.enabled))}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {extension.capabilities.slice(0, 3).map((capability) => (
          <span
            key={capability}
            className="rounded border border-white/[0.07] bg-white/[0.035] px-1.5 py-0.5 text-[9px] text-gray-400"
          >
            {capability}
          </span>
        ))}
        {primaryContributions.map((summary) => (
          <span
            key={summary.point}
            title={formatContributionPreview(summary, 4)}
            className="rounded border border-sky-400/15 bg-sky-400/10 px-1.5 py-0.5 text-[9px] text-sky-200"
          >
            {summary.label}: {summary.count}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-medium text-[var(--nexus-muted)] transition-colors hover:bg-white/[0.05] hover:text-gray-200"
        >
          <ChevronDown
            size={11}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          Manifest
        </button>

        {extension.installed ? (
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-1 text-[10px] text-emerald-300 sm:flex">
              <PackageCheck size={11} />
              {extension.enabled ? "Aktiv" : "Pausiert"}
            </span>
            {extension.updateAvailable ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => onInstall(extension.id))}
                className="flex h-7 items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 text-[10px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/15 disabled:opacity-50"
              >
                {busy ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                Update
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => onRemove(extension.id))}
              className="flex h-7 items-center gap-1 rounded-md border border-red-400/20 bg-red-400/10 px-2 text-[10px] font-semibold text-red-300 transition-colors hover:bg-red-400/15 disabled:opacity-50"
            >
              {busy ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Entfernen
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || manifestBlocked}
            onClick={() => runAction(() => onInstall(extension.id))}
            className="flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:opacity-50"
            title={manifestBlocked ? "Installation blockiert: Manifest fehlerhaft" : "Installieren"}
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.14)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)",
              color: "var(--nexus-primary, #7c8cff)",
            }}
          >
            {busy ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
            Installieren
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 rounded-md p-2"
              style={{
                background: "rgba(0,0,0,0.22)",
                border: "1px solid rgba(255,255,255,0.055)",
              }}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[var(--nexus-muted)]">
                <FileJson2 size={11} />
                {extension.manifest.name}
              </div>
              <div className="grid gap-1 text-[10px] text-gray-400">
                <div className="truncate">
                  engine: {extension.manifest.engines?.nexusCode || "unbekannt"}
                </div>
                <div className="truncate">
                  activation:{" "}
                  {extension.activationSummary.map((event) => event.label).join(", ") || "manual"}
                </div>
                <div className="truncate">
                  contributes:{" "}
                  {extension.contributionSummary
                    .map((summary) => `${summary.label} ${summary.count}`)
                    .join(", ") || "none"}
                </div>
                {extension.localPath ? (
                  <div className="truncate">path: {extension.localPath}</div>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2">
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[var(--nexus-muted)]">
                    <ListChecks size={11} />
                    Contributions
                  </div>
                  <ContributionDetailList summaries={extension.contributionSummary.slice(0, 6)} />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[var(--nexus-muted)]">
                    <Activity size={11} />
                    Activation
                  </div>
                  <ActivationEventList events={extension.activationSummary} />
                </div>
              </div>
              {visibleIssues.length > 0 ? (
                <div className="mt-2 grid gap-1">
                  {visibleIssues.slice(0, 3).map((issue) => (
                    <div
                      key={`${issue.code}-${issue.message}`}
                      className={`rounded border px-1.5 py-1 text-[10px] ${
                        issue.level === "error"
                          ? "border-red-400/20 bg-red-400/10 text-red-200"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      <span className="font-semibold">{issue.message}</span>
                      {issue.detail ? (
                        <span className="ml-1 text-[var(--nexus-muted)]">{issue.detail}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

export default function ExtensionsPanel({ onInstalledChange }) {
  const [initialRegistryState] = useState(() => loadExtensionRegistryState());
  const [records, setRecords] = useState(() => initialRegistryState.records);
  const [registryMessages] = useState(() => [
    ...initialRegistryState.diagnostics,
    ...initialRegistryState.migrations,
  ]);
  const [saveStatus, setSaveStatus] = useState(null);
  const [storageHealth, setStorageHealth] = useState(
    () => initialRegistryState.storageHealth || "default",
  );
  const [persistReason, setPersistReason] = useState(() =>
    initialRegistryState.needsPersist ? "migration" : null,
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [contribution, setContribution] = useState("all");
  const [quickTab, setQuickTab] = useState("all");
  const [hostActionStatus, setHostActionStatus] = useState(null);

  const extensions = useMemo(() => resolveExtensions(records), [records]);
  const stats = useMemo(() => getExtensionStats(records), [records]);
  const runtimeOverview = useMemo(() => getExtensionRuntimeOverview(records), [records]);
  const runtimeSnapshot = useMemo(() => createExtensionRuntimeSnapshot(records), [records]);
  const updateableIds = useMemo(
    () =>
      extensions
        .filter(
          (extension) =>
            extension.installed &&
            extension.updateAvailable &&
            extension.manifestErrors.length === 0,
        )
        .map((extension) => extension.id),
    [extensions],
  );
  const storageMessages = useMemo(
    () => [...registryMessages, ...(saveStatus?.diagnostics || [])],
    [registryMessages, saveStatus],
  );

  const filteredExtensions = useMemo(() => {
    const tabState =
      quickTab === "installed" ? "installed" : quickTab === "enabled" ? "enabled" : stateFilter;
    const tabSource = quickTab === "local" ? "local" : source;
    return filterExtensions(extensions, {
      query,
      category,
      source: tabSource,
      state: tabState,
      contribution,
    });
  }, [category, contribution, extensions, query, quickTab, source, stateFilter]);

  useEffect(() => {
    const detail = createExtensionEventDetail(records);
    onInstalledChange?.(detail.installed);
    window.dispatchEvent(new CustomEvent("nx-code-extensions-changed", { detail }));
  }, [onInstalledChange, records]);

  useEffect(() => {
    if (!persistReason) return;
    const saveResult = saveExtensionRegistry(records);
    setSaveStatus(saveResult.diagnostics.length > 0 ? saveResult : null);
    setStorageHealth(saveResult.ok ? "ok" : "degraded");
    setPersistReason(null);
  }, [persistReason, records]);

  const applyRecords = (updater) => {
    setPersistReason("user");
    setRecords((current) => updater(current));
  };

  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setSource("all");
    setStateFilter("all");
    setContribution("all");
    setQuickTab("all");
  };

  const installAllUpdates = () => {
    if (updateableIds.length === 0) return;
    applyRecords((current) =>
      updateableIds.reduce((nextRecords, id) => installExtension(nextRecords, id), current),
    );
  };

  const copyRuntimeSnapshot = async () => {
    const payload = JSON.stringify(runtimeSnapshot, null, 2);
    try {
      const copied = await writeClipboardText(payload);
      setHostActionStatus(
        copied
          ? "Runtime snapshot copied."
          : "Clipboard unavailable; snapshot was generated but not copied.",
      );
    } catch (error) {
      setHostActionStatus(error?.message || "Snapshot could not be copied.");
    }
  };

  const resetRegistryToDefaults = () => {
    const confirmed =
      typeof window === "undefined" ||
      window.confirm("Extension-Registry auf die Nexus Code Defaults zuruecksetzen?");
    if (!confirmed) return;
    setRecords(createDefaultExtensionRecords());
    setPersistReason("reset");
    setStorageHealth("default");
    setHostActionStatus("Bundled default extensions restored.");
  };

  return (
    <PanelShell ariaLabel="Extensions">
      <PanelHeader
        icon={Blocks}
        title="Extensions"
        subtitle="Manifest registry, activation plan and extension host"
        status={
          stats.updates > 0 ? (
            <PanelBadge tone="warning">{stats.updates} Update</PanelBadge>
          ) : (
            <PanelBadge tone={stats.errors > 0 ? "danger" : "success"}>
              {stats.errors > 0 ? "Issues" : "Host Ready"}
            </PanelBadge>
          )
        }
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <PanelActionButton
              icon={Clipboard}
              onClick={copyRuntimeSnapshot}
              tone="muted"
              title="Runtime Snapshot als JSON kopieren"
            >
              Copy plan
            </PanelActionButton>
            <PanelActionButton
              icon={RotateCcw}
              onClick={resetRegistryToDefaults}
              tone="muted"
              title="Registry auf gebundelte Nexus Code Defaults zuruecksetzen"
            >
              Reset
            </PanelActionButton>
            {updateableIds.length > 0 ? (
            <PanelActionButton
              icon={RefreshCw}
              onClick={installAllUpdates}
              tone="warning"
              title="Alle verfuegbaren Extension-Updates installieren"
            >
              Update
            </PanelActionButton>
            ) : null}
          </div>
        }
      >
        <div className="grid grid-cols-4 gap-1.5">
          <PanelMetric label="Gesamt" value={stats.total} tone="muted" />
          <PanelMetric label="Aktiv" value={stats.enabled} tone={stats.enabled ? "success" : "muted"} />
          <PanelMetric label="Lokal" value={stats.local} tone={stats.local ? "accent" : "muted"} />
          <PanelMetric label="Fehler" value={stats.errors} tone={stats.errors ? "danger" : "muted"} />
        </div>

        <ContributionOverview
          overview={runtimeOverview}
          stats={stats}
          storageHealth={storageHealth}
        />

        {storageMessages.length > 0 ? (
          <div className="mt-2 grid gap-1">
            {storageMessages.slice(0, 2).map((message, index) => (
              <SystemMessage key={`${message.code}-${index}`} message={message} />
            ))}
            {storageMessages.length > 2 ? (
              <div className="truncate rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-[var(--nexus-muted)]">
                +{storageMessages.length - 2} weitere Registry-Hinweise
              </div>
            ) : null}
          </div>
        ) : null}

        {hostActionStatus ? (
          <div className="mt-2 rounded-md border border-white/[0.06] bg-white/[0.035] px-2 py-1 text-[10px] text-[var(--nexus-muted)]">
            {hostActionStatus}
          </div>
        ) : null}

        <div
          className="mt-3 flex gap-0.5 rounded-lg p-0.5"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {Object.entries(tabStyles).map(([id, label]) => (
            <SegmentButton key={id} active={quickTab === id} onClick={() => setQuickTab(id)}>
              {label}
            </SegmentButton>
          ))}
        </div>
      </PanelHeader>

      <div className="shrink-0 space-y-2 border-b border-white/[0.05] px-3 py-2.5">
        <div
          className="flex h-8 items-center gap-2 rounded-md border px-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: query
              ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.34)"
              : "var(--nexus-border)",
          }}
        >
          <Search size={13} className="shrink-0 text-[var(--nexus-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Plugin, Capability oder Manifest suchen"
            className="min-w-0 flex-1 bg-transparent text-xs text-[var(--nexus-text)] outline-none placeholder:text-[var(--nexus-muted)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded p-0.5 text-[var(--nexus-muted)] hover:bg-white/[0.07] hover:text-gray-200"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <SelectFilter
            icon={Filter}
            value={category}
            options={EXTENSION_CATEGORIES}
            onChange={setCategory}
            title="Kategorie"
          />
          <SelectFilter
            icon={SlidersHorizontal}
            value={stateFilter}
            options={EXTENSION_STATE_FILTERS}
            onChange={(value) => {
              setStateFilter(value);
              if (value !== "all") setQuickTab("all");
            }}
            title="Status"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <SelectFilter
            icon={PackageCheck}
            value={source}
            options={EXTENSION_SOURCES}
            onChange={(value) => {
              setSource(value);
              if (value !== "all") setQuickTab("all");
            }}
            title="Quelle"
          />
          <SelectFilter
            icon={FileJson2}
            value={contribution}
            options={EXTENSION_CONTRIBUTION_FILTERS}
            onChange={(value) => {
              setContribution(value);
              if (value !== "all") setQuickTab("all");
            }}
            title="Contribution"
          />
        </div>
      </div>

      <PanelBody className="space-y-2 px-3 py-2.5">
        <AnimatePresence mode="popLayout">
          {filteredExtensions.map((extension, index) => (
            <ExtensionCard
              key={extension.id}
              extension={extension}
              index={index}
              onInstall={(id) => applyRecords((current) => installExtension(current, id))}
              onRemove={(id) => applyRecords((current) => uninstallExtension(current, id))}
              onToggleEnabled={(id, enabled) =>
                applyRecords((current) => setExtensionEnabled(current, id, enabled))
              }
            />
          ))}
        </AnimatePresence>

        {filteredExtensions.length === 0 ? (
          <PanelState
            icon={Power}
            title="Keine Extensions gefunden"
            detail="Die Registry ist aktiv, aber die aktuellen Filter blenden alle Manifeste aus."
            actionLabel="Filter zuruecksetzen"
            onAction={clearFilters}
          />
        ) : null}
      </PanelBody>

      <PanelFooter>
        <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--nexus-muted)]">
          <span className="truncate">{filteredExtensions.length} sichtbare Module</span>
          <span className="truncate">
            {stats.errors > 0 ? `${stats.errors} fehlerhaft` : `${stats.disabled} pausiert`}
          </span>
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
