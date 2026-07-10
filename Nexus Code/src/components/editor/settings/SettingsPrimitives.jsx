import { Info, Search } from "lucide-react";
import { NativeLabel } from "../settingsShared.jsx";
import { SETTING_SECTIONS } from "./settingsCatalog.jsx";
import { isVisibleSetting } from "./settingsModels.js";

export function SettingsHeader({ title, eyebrow, description, icon: Icon }) {
  return (
    <div className="nx-code-settings-header flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-[var(--nexus-accent-2,#38bdf8)]">
          <Icon size={13} className="shrink-0 opacity-80" />
          <span className="min-w-0 break-words">{eyebrow}</span>
        </div>
        <h2 className="mt-1.5 break-words text-[1.55rem] font-semibold leading-tight text-gray-100 sm:text-[1.75rem]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export function SettingsGroup({ title, description, children }) {
  return (
    <section
      className="nx-code-settings-group min-w-0 rounded-lg border px-3.5 py-3.5 sm:px-4 sm:py-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: "rgba(156,178,226,0.075)",
      }}
    >
      <div className="mb-3 flex min-w-0 flex-col gap-1">
        <h3 className="break-words text-sm font-semibold leading-tight text-gray-200">
          {title}
        </h3>
        {description ? (
          <p className="break-words text-xs leading-5 text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function SettingRow({
  id,
  sectionId,
  searchQuery,
  title,
  description,
  children,
  compact = false,
}) {
  if (!isVisibleSetting(id, sectionId, searchQuery)) return null;
  return (
    <div
      className={`nx-code-settings-row min-w-0 rounded-md border px-3 py-3 ${
        compact ? "sm:items-center" : "sm:items-start"
      }`}
      style={{
        background: "rgba(255,255,255,0.014)",
        borderColor: "rgba(156,178,226,0.055)",
      }}
    >
      <div className="min-w-0 flex-1">
        <NativeLabel className="block whitespace-normal break-words leading-5 text-gray-300">
          {title}
        </NativeLabel>
        {description ? (
          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
            {description}
          </p>
        ) : null}
      </div>
      <div className="nx-code-settings-control min-w-0 w-full shrink-0">
        {children}
      </div>
    </div>
  );
}

export function ValueBadge({ children }) {
  return (
    <span
      className="inline-flex min-w-12 justify-center rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight text-gray-300"
      style={{
        background: "rgba(255,255,255,0.032)",
        borderColor: "rgba(156,178,226,0.08)",
      }}
    >
      {children}
    </span>
  );
}

export function SearchResultSummary({
  query,
  totalMatches,
  sectionMatchCounts,
  results,
  onOpenSetting,
}) {
  const matchedSections = SETTING_SECTIONS.filter(
    (section) => sectionMatchCounts[section.id] > 0,
  );

  return (
    <section
      className="nx-code-settings-group rounded-lg border p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.006)), rgba(0,0,0,0.16)",
        borderColor: "rgba(156,178,226,0.075)",
      }}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
            <Search size={13} />
            <span className="min-w-0 break-words">Result Hints</span>
          </div>
          <p className="mt-2 break-words text-sm text-gray-300">
            {totalMatches} Treffer fuer "{query}"
          </p>
          <p className="mt-1 break-words text-xs leading-5 text-gray-500">
            Oeffne einen Treffer direkt oder nutze die Kategorien links als gefilterte Karte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {matchedSections.map((section) => (
            <span
              key={section.id}
              className="rounded-md border px-2 py-1 text-[10px] font-medium leading-tight text-gray-400"
              style={{
                background: "rgba(255,255,255,0.035)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              {section.label} {sectionMatchCounts[section.id]}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {results.map((result) => (
          <button
            key={`${result.section}-${result.id}`}
            type="button"
            onClick={() => onOpenSetting(result)}
            className="min-w-0 rounded-md border p-3 text-left transition-colors hover:bg-white/[0.04]"
            style={{
              background: "rgba(255,255,255,0.018)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-xs font-semibold text-gray-200">
                {result.label}
              </span>
              <span className="shrink-0 rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[10px] leading-tight text-gray-500">
                {result.sectionLabel}
              </span>
            </div>
            <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
              {result.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

export function ThemeTokenGrid({ tokens }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {tokens.map((token) => (
        <div
          key={token.varName}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border px-2.5 py-2"
          style={{
            background: "rgba(255,255,255,0.018)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="h-6 w-6 shrink-0 rounded-md border border-white/10"
            style={{ background: token.value }}
          />
          <div className="min-w-0 flex-1">
            <div className="break-words text-xs font-medium text-gray-300">
              {token.label}
            </div>
            <code className="block break-all text-[10px] text-gray-500">
              {token.varName}
            </code>
          </div>
          <code className="max-w-full break-all text-[10px] text-gray-500 sm:ml-auto sm:max-w-[8rem] sm:shrink-0">
            {token.value}
          </code>
        </div>
      ))}
    </div>
  );
}

export function PerformanceHintList({ hints }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {hints.map((hint) => (
        <div
          key={`${hint.title}-${hint.text}`}
          className="flex min-w-0 gap-3 rounded-md border px-3 py-2.5"
          style={{
            background:
              hint.tone === "warn"
                ? "rgba(245,158,11,0.08)"
                : hint.tone === "good"
                  ? "rgba(34,197,94,0.07)"
                  : "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.08)",
            borderColor:
              hint.tone === "warn"
                ? "rgba(245,158,11,0.18)"
                : hint.tone === "good"
                  ? "rgba(34,197,94,0.16)"
                  : "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.18)",
          }}
        >
          <Info size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <div className="break-words text-xs font-semibold text-gray-200">
              {hint.title}
            </div>
            <p className="mt-0.5 break-words text-[10px] leading-4 text-gray-500">
              {hint.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
