import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Blocks,
  ChevronDown,
  Clipboard,
  Command,
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
  buildExtensionHostSummary,
} from "../../pages/editor/extensionRuntimeModel.js";
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
  PanelShell,
  PanelState,
} from "./panels/PanelChrome.jsx";

const tabStyles = {
  all: "All",
  installed: "Installed",
  enabled: "Active",
  local: "Local",
};

const contributionIcons = {
  commands: Command,
  views: Eye,
  languages: Languages,
  themes: Palette,
  keybindings: Command,
  snippets: FileJson2,
};

const storageHealthLabels = {
  ok: "Registry ok",
  migrated: "Migration ready",
  default: "Defaults active",
  degraded: "Check registry",
  unavailable: "Session only",
};

const lifecycleToneStyles = {
  accent: {
    background: "rgba(103,232,249,0.085)",
    border: "rgba(103,232,249,0.2)",
    color: "#a5f3fc",
  },
  warning: {
    background: "rgba(251,191,36,0.085)",
    border: "rgba(251,191,36,0.2)",
    color: "#fde68a",
  },
  danger: {
    background: "rgba(248,113,113,0.095)",
    border: "rgba(248,113,113,0.24)",
    color: "#fecaca",
  },
  muted: {
    background: "rgba(148,163,184,0.06)",
    border: "rgba(148,163,184,0.12)",
    color: "#cbd5e1",
  },
};

const categoryToneStyles = {
  cyan: {
    background: "rgba(103,232,249,0.07)",
    border: "rgba(103,232,249,0.16)",
    color: "#a5f3fc",
  },
  violet: {
    background: "rgba(167,139,250,0.075)",
    border: "rgba(167,139,250,0.18)",
    color: "#ddd6fe",
  },
  amber: {
    background: "rgba(251,191,36,0.07)",
    border: "rgba(251,191,36,0.16)",
    color: "#fde68a",
  },
  muted: {
    background: "rgba(148,163,184,0.055)",
    border: "rgba(148,163,184,0.12)",
    color: "#cbd5e1",
  },
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
      className="relative min-h-7 min-w-0 flex-1 rounded-md px-2 py-1 text-[10px] font-semibold leading-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-400/50"
      style={{
        color: active ? "var(--nexus-text)" : "var(--nexus-muted)",
      }}
    >
      {active ? (
        <motion.span
          layoutId="extension-segment"
          className="absolute inset-0 rounded-md"
          style={{
            background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.11)",
            border: "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
          }}
        />
      ) : null}
      <span className="relative z-10 block min-w-0 break-words leading-tight" style={{ overflowWrap: "anywhere" }}>
        {children}
      </span>
    </button>
  );
}

function SelectFilter({ icon: Icon, value, options, onChange, title }) {
  return (
    <label
      className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border px-2"
      style={{
        background: "rgba(255,255,255,0.024)",
        borderColor: "rgba(156,170,210,0.065)",
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
        <p className={`break-words text-[10px] font-semibold ${tone.text}`} style={{ overflowWrap: "anywhere" }}>
          {message.message}
        </p>
        {message.detail ? (
          <p className="break-words text-[10px] text-[var(--nexus-muted)]" style={{ overflowWrap: "anywhere" }}>
            {message.detail}
          </p>
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
          ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)"
          : "rgba(255,255,255,0.07)",
        border: checked
          ? "1px solid rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.42)"
          : "1px solid rgba(255,255,255,0.12)",
      }}
      title={checked ? "Pause extension" : "Activate extension"}
    >
      <motion.span
        layout
        className="absolute top-0.5 h-4 w-4 rounded-full"
        animate={{ left: checked ? 17 : 2 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        style={{
          background: checked ? "var(--nexus-primary, #7c8cff)" : "#6b7280",
          boxShadow: checked ? "0 0 8px rgba(124,140,255,0.22)" : "none",
        }}
      />
    </button>
  );
}

function Pill({ children, tone = "muted", title, category = false }) {
  const styleSource = category ? categoryToneStyles : lifecycleToneStyles;
  const toneStyle = styleSource[tone] || styleSource.muted;

  return (
    <span
      title={title}
      className="inline-flex min-w-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold"
      style={{
        background: toneStyle.background,
        borderColor: toneStyle.border,
        color: toneStyle.color,
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </span>
  );
}

function ContributionOverview({ overview, storageHealth, hostSummary }) {
  const healthLabel = storageHealthLabels[storageHealth] || storageHealthLabels.default;
  const activePoints = overview.contributionPoints
    .filter((point) => point.count > 0)
    .slice(0, 4);
  const activationTypes = hostSummary.activationTypes
    .map((entry) => `${entry.type} ${entry.count}`)
    .slice(0, 3);

  return (
    <div className="rounded-md border border-white/[0.035] bg-black/[0.1] px-2.5 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-[var(--nexus-muted)]">
        <span className="font-semibold text-gray-300">{hostSummary.enabledCount} active</span>
        <span>{hostSummary.contributionCount} contributions</span>
        <span>{hostSummary.activationEventCount} triggers</span>
        <span>{hostSummary.blockedCount} blocked</span>
        <span>{healthLabel}</span>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
        {activePoints.length > 0 ? (
          activePoints.map((point) => {
            const Icon = contributionIcons[point.point] || ListChecks;
            return (
              <span
                key={point.point}
                className="inline-flex min-w-0 items-center gap-1 rounded-md border border-sky-300/15 bg-sky-300/[0.055] px-1.5 py-0.5 text-[9px] text-sky-200"
              >
                <Icon size={10} className="shrink-0" />
                <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
                  {point.label} {point.count}
                </span>
              </span>
            );
          })
        ) : (
          <span className="text-[9px] text-[var(--nexus-muted)]">No active contributions</span>
        )}
        <span className="min-w-0 break-words text-[9px] text-[var(--nexus-muted)]" style={{ overflowWrap: "anywhere" }}>
          {activationTypes.join(", ") || "no active triggers"}
        </span>
      </div>
    </div>
  );
}

function ActivationEventList({ events }) {
  if (!events.length) {
    return (
      <p className="rounded border border-white/[0.05] bg-white/[0.025] px-1.5 py-1 text-[10px] text-[var(--nexus-muted)]">
        No activation events declared.
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
          <span className="min-w-0 break-words text-gray-300" style={{ overflowWrap: "anywhere" }}>
            {event.label}
          </span>
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
        This manifest declares no contributions.
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
          <span className="break-words font-semibold text-gray-300" style={{ overflowWrap: "anywhere" }}>
            {summary.label}
          </span>
          <span className="min-w-0 break-words text-gray-500" style={{ overflowWrap: "anywhere" }}>
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
  const lifecycle = extension.lifecycleState || {
    label: extension.enabled ? "Active" : extension.installed ? "Paused" : "Available",
    tone: extension.enabled ? "accent" : "muted",
    detail: "",
  };
  const category = extension.categoryInfo || {
    shortLabel: extension.category || "Tools",
    label: extension.category || "Tools",
    tone: "muted",
  };
  const primaryContributions = extension.contributionSummary
    .filter((summary) => summary.primary)
    .slice(0, 1);
  const visibleCapabilities = [
    ...extension.capabilities.slice(0, 2),
    ...extension.contributionSummary.slice(0, 2).map((summary) => `${summary.label} ${summary.count}`),
  ].slice(0, 4);

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
      className="nx-code-extension-row group rounded-md p-2"
      style={{
        background: extension.installed
          ? "linear-gradient(180deg, rgba(15,23,42,0.34), rgba(2,6,23,0.18))"
          : "rgba(255,255,255,0.012)",
        border: extension.enabled
          ? "1px solid rgba(103,232,249,0.11)"
          : "1px solid rgba(255,255,255,0.036)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold"
          style={{
            background: `${extension.iconColor}18`,
            borderColor: `${extension.iconColor}40`,
            color: extension.iconColor,
          }}
        >
          {extension.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 break-words text-xs font-semibold leading-snug text-[var(--nexus-text)]" style={{ overflowWrap: "anywhere" }}>
              {extension.displayName}
            </h3>
            {extension.verified ? (
              <BadgeCheck size={12} className="shrink-0 text-sky-400" />
            ) : null}
            <Pill tone={lifecycle.tone} title={lifecycle.detail}>{lifecycle.label}</Pill>
            <Pill tone={category.tone} title={category.label} category>{category.shortLabel}</Pill>
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--nexus-muted)]">
            <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>{extension.publisher}</span>
            <span>v{extension.version}</span>
            <span>{extension.source}</span>
            {extension.manifestWarnings.length > 0 && !manifestBlocked ? <span>warnings</span> : null}
          </div>
          <p
            className="mt-1 break-words text-[11px] leading-snug text-gray-400"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {extension.description}
          </p>
        </div>

        <ToggleSwitch
          checked={extension.enabled}
          disabled={!extension.installed || busy || manifestBlocked}
          onClick={() => runAction(() => onToggleEnabled(extension.id, !extension.enabled))}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {visibleCapabilities.map((capability) => (
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
        {lifecycle.detail ? (
          <span className="rounded-md border border-white/[0.04] bg-white/[0.018] px-1.5 py-0.5 text-[9px] text-gray-500">
            {lifecycle.detail}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-medium text-[var(--nexus-muted)] transition-colors hover:bg-white/[0.05] hover:text-gray-200"
        >
          <ChevronDown
            size={11}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          Details
        </button>

        {extension.installed ? (
          <div className="flex items-center gap-1.5">
            {extension.updateAvailable ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => onInstall(extension.id))}
                className="flex h-7 items-center gap-1 rounded-md border border-amber-400/[0.18] bg-amber-400/[0.08] px-2 text-[10px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/[0.12] disabled:opacity-50"
              >
                {busy ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                Update
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => onRemove(extension.id))}
              className="flex h-7 items-center gap-1 rounded-md border border-red-400/[0.18] bg-red-400/[0.08] px-2 text-[10px] font-semibold text-red-300 transition-colors hover:bg-red-400/[0.12] disabled:opacity-50"
            >
              {busy ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || manifestBlocked}
            onClick={() => runAction(() => onInstall(extension.id))}
            className="flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors disabled:opacity-50"
            title={manifestBlocked ? "Install blocked: manifest has errors" : "Install"}
            style={{
              background: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.11)",
              borderColor: "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.2)",
              color: "var(--nexus-primary, #7c8cff)",
            }}
          >
            {busy ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
            Install
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
                <div className="break-words" style={{ overflowWrap: "anywhere" }}>
                  engine: {extension.manifest.engines?.nexusCode || "unbekannt"}
                </div>
                <div className="break-words" style={{ overflowWrap: "anywhere" }}>
                  activation:{" "}
                  {extension.activationSummary.map((event) => event.label).join(", ") || "manual"}
                </div>
                <div className="break-words" style={{ overflowWrap: "anywhere" }}>
                  contributes:{" "}
                  {extension.contributionSummary
                    .map((summary) => `${summary.label} ${summary.count}`)
                    .join(", ") || "none"}
                </div>
                <div className="break-words" style={{ overflowWrap: "anywhere" }}>
                  contract: manifest v{extension.manifest.manifestVersion || 0}, host{" "}
                  {extension.lifecycleState?.activationReady ? "activation-ready" : "activation-gated"}
                </div>
                {extension.localPath ? (
                  <div className="break-words" style={{ overflowWrap: "anywhere" }}>
                    path: {extension.localPath}
                  </div>
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
  const hostSummary = useMemo(
    () =>
      buildExtensionHostSummary({
        extensions,
        records,
        stats,
        runtime: runtimeOverview,
        storageHealth,
      }),
    [extensions, records, runtimeOverview, stats, storageHealth],
  );
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
    setHostActionStatus(
      saveResult.ok
        ? `Registry saved (${persistReason}).`
        : "Registry save failed; changes are kept in memory.",
    );
    setPersistReason(null);
  }, [persistReason, records]);

  const applyRecords = (updater, statusMessage) => {
    setRecords((current) => {
      const next = updater(current);
      if (next === current) {
        setHostActionStatus("No registry change was applied.");
        return current;
      }
      setPersistReason("user");
      if (statusMessage) setHostActionStatus(statusMessage);
      return next;
    });
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
      `${updateableIds.length} extension update${updateableIds.length === 1 ? "" : "s"} queued.`,
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
    window.confirm("Reset the extension registry to the Nexus Code defaults?");
    if (!confirmed) return;
    setRecords(createDefaultExtensionRecords());
    setPersistReason("reset");
    setStorageHealth("default");
    setHostActionStatus("Bundled default extensions restored.");
  };

  return (
    <PanelShell ariaLabel="Extensions" className="nx-code-extensions-panel">
      <PanelHeader
        icon={Blocks}
        title="Extensions"
        subtitle={`${stats.installed} installed`}
        status={
          stats.updates > 0 ? (
            <PanelBadge tone="warning">{stats.updates} Update</PanelBadge>
          ) : (
            <PanelBadge tone={stats.errors > 0 ? "danger" : "muted"}>
              {stats.errors > 0 ? "Issues" : "Ready"}
            </PanelBadge>
          )
        }
      />

      <div className="shrink-0 space-y-2 border-b border-white/[0.035] px-3 py-2">
        <ContributionOverview
          overview={runtimeOverview}
          storageHealth={storageHealth}
          hostSummary={hostSummary}
        />

        {storageMessages.length > 0 ? (
          <div className="grid gap-1">
            {storageMessages.slice(0, 2).map((message, index) => (
              <SystemMessage key={`${message.code}-${index}`} message={message} />
            ))}
            {storageMessages.length > 2 ? (
              <div className="break-words rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-[var(--nexus-muted)]" style={{ overflowWrap: "anywhere" }}>
                +{storageMessages.length - 2} more registry notices
              </div>
            ) : null}
          </div>
        ) : null}

        {hostActionStatus ? (
          <div className="break-words rounded-md border border-white/[0.06] bg-white/[0.026] px-2 py-1 text-[10px] text-[var(--nexus-muted)]" style={{ overflowWrap: "anywhere" }}>
            {hostActionStatus}
          </div>
        ) : null}

        <div
          className="flex gap-0.5 rounded-md p-0.5"
          style={{ background: "rgba(255,255,255,0.024)" }}
        >
          {Object.entries(tabStyles).map(([id, label]) => (
            <SegmentButton key={id} active={quickTab === id} onClick={() => setQuickTab(id)}>
              {label}
            </SegmentButton>
          ))}
        </div>

        <div
          className="flex h-8 items-center gap-2 rounded-md border px-2"
          style={{
            background: "rgba(255,255,255,0.026)",
            borderColor: query
              ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.24)"
              : "rgba(156,170,210,0.065)",
          }}
        >
          <Search size={13} className="shrink-0 text-[var(--nexus-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search plugin, capability, or manifest"
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
            title="Category"
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
            title="Source"
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

      <PanelBody className="space-y-1.5 px-3 py-2">
        <AnimatePresence mode="popLayout">
          {filteredExtensions.map((extension, index) => (
            <ExtensionCard
              key={extension.id}
              extension={extension}
              index={index}
              onInstall={(id) => applyRecords(
                (current) => installExtension(current, id),
                `${extension.displayName} installed and enabled.`,
              )}
              onRemove={(id) => applyRecords(
                (current) => uninstallExtension(current, id),
                `${extension.displayName} removed from the active registry.`,
              )}
              onToggleEnabled={(id, enabled) =>
                applyRecords(
                  (current) => setExtensionEnabled(current, id, enabled),
                  `${extension.displayName} ${enabled ? "enabled" : "disabled"}.`,
                )
              }
            />
          ))}
        </AnimatePresence>

        {filteredExtensions.length === 0 ? (
          <PanelState
            icon={stats.errors > 0 ? AlertTriangle : Power}
            title={stats.errors > 0 ? "No matching manifests" : "No extensions found"}
            detail={
              stats.errors > 0
                ? "The host has blocked manifests, but none match the active filters."
                : "The registry is active, but the current filters hide every manifest."
            }
            actionLabel="Reset filters"
            onAction={clearFilters}
          />
        ) : null}
      </PanelBody>

      <PanelFooter>
        <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--nexus-muted)]">
          <span className="min-w-0 break-words" style={{ overflowWrap: "anywhere" }}>
            {filteredExtensions.length} visible modules
          </span>
          <span className="min-w-0 break-words text-right" style={{ overflowWrap: "anywhere" }}>
            {stats.errors > 0 ? `${stats.errors} blocked` : `${stats.disabled} paused`}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <PanelActionButton
            icon={Clipboard}
            onClick={copyRuntimeSnapshot}
            tone="muted"
            title="Copy runtime snapshot JSON"
          >
            Copy
          </PanelActionButton>
          <PanelActionButton
            icon={RotateCcw}
            onClick={resetRegistryToDefaults}
            tone="muted"
            title="Reset registry to bundled Nexus Code defaults"
          >
            Reset
          </PanelActionButton>
          {updateableIds.length > 0 ? (
            <PanelActionButton
              icon={RefreshCw}
              onClick={installAllUpdates}
              tone="warning"
              title="Install all available extension updates"
              className="col-span-2"
            >
              Install updates
            </PanelActionButton>
          ) : null}
        </div>
      </PanelFooter>
    </PanelShell>
  );
}
