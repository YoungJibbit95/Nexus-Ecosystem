import React from "react";
import { AlertTriangle, Check, Keyboard, RefreshCcw, Search } from "lucide-react";
import { NativeInput, NativeSelect } from "../settingsShared.jsx";
import {
  normalizeKeybindingShortcut,
  validateKeybindingShortcut,
} from "../../../pages/editor/keybindingModel.js";
import { ValueBadge } from "./SettingsPrimitives.jsx";

export default function KeybindingManager({
  model,
  overrides,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onSetOverride,
  onResetBinding,
  onResetAll,
}) {
  const [drafts, setDrafts] = React.useState({});
  const [viewMode, setViewMode] = React.useState("all");
  React.useEffect(() => {
    setDrafts(
      Object.fromEntries(
        model.rows.map((row) => [row.id, row.override || row.defaultShortcut || ""]),
      ),
    );
  }, [model.rows, overrides]);

  const commitDraft = React.useCallback(
    (row) => {
      const validation = validateKeybindingShortcut(drafts[row.id]);
      if (!validation.ok) return;
      onSetOverride(row.id, validation.normalized);
      setDrafts((current) => ({
        ...current,
        [row.id]: validation.normalized || row.defaultShortcut,
      }));
    },
    [drafts, onSetOverride],
  );

  const modeCounts = React.useMemo(
    () => ({
      all: model.rows.length,
      custom: model.rows.filter((row) => row.isCustomized).length,
      conflicts: model.rows.filter((row) => row.hasConflict).length,
      defaults: model.rows.filter((row) => !row.isCustomized).length,
    }),
    [model.rows],
  );
  const viewModes = [
    { id: "all", label: "Alle", count: modeCounts.all },
    { id: "custom", label: "Overrides", count: modeCounts.custom },
    { id: "conflicts", label: "Konflikte", count: modeCounts.conflicts },
    { id: "defaults", label: "Defaults", count: modeCounts.defaults },
  ];
  const displayRows = React.useMemo(() => {
    if (viewMode === "custom") return model.rows.filter((row) => row.isCustomized);
    if (viewMode === "conflicts") return model.rows.filter((row) => row.hasConflict);
    if (viewMode === "defaults") return model.rows.filter((row) => !row.isCustomized);
    return model.rows;
  }, [model.rows, viewMode]);

  return (
    <div className="space-y-3">
      <div
        className="rounded-md border px-3 py-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(var(--nexus-primary-rgb,124,140,255),0.07), rgba(255,255,255,0.014))",
          borderColor: "rgba(var(--nexus-primary-rgb,124,140,255),0.16)",
        }}
      >
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-tight text-gray-500">
              <Keyboard size={13} className="shrink-0" />
              <span className="min-w-0 break-words">Shortcut Map</span>
            </div>
            <p className="mt-1 break-words text-sm font-semibold text-gray-100">
              {model.totalCount} Commands, {model.overrideCount} lokale Overrides
            </p>
            <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
              Defaults bleiben sichtbar; leere Overrides fallen beim Speichern auf den Default zurueck.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] leading-tight sm:min-w-[18rem]">
            <ValueBadge>{model.visibleCount} sichtbar</ValueBadge>
            <ValueBadge>{model.visibleOverrideCount} gefiltert</ValueBadge>
            <ValueBadge>{model.visibleConflictCount}/{model.conflictCount} Konflikte</ValueBadge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_13rem_auto]">
        <div className="relative min-w-0">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <NativeInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Command, Shortcut oder Kategorie suchen"
            className="h-9 w-full pl-8"
          />
        </div>
        <NativeSelect
          value={category}
          onValueChange={onCategoryChange}
          className="h-9 w-full"
        >
          <option value="all">Alle Kategorien</option>
          {model.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.count})
            </option>
          ))}
        </NativeSelect>
        <button
          type="button"
          onClick={onResetAll}
          disabled={model.overrideCount === 0}
          className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: "rgba(255,255,255,0.026)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <RefreshCcw size={13} />
          <span className="min-w-0 break-words">Alle zuruecksetzen</span>
        </button>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
        {viewModes.map((mode) => {
          const active = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              aria-pressed={active}
              className={`inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] font-semibold leading-tight transition-colors ${
                active
                  ? "text-white"
                  : "text-gray-500 hover:bg-white/[0.045] hover:text-gray-300"
              }`}
              style={{
                background: active
                  ? "rgba(var(--nexus-primary-rgb,124,140,255),0.12)"
                  : "rgba(255,255,255,0.022)",
                borderColor: active
                  ? "rgba(var(--nexus-primary-rgb,124,140,255),0.24)"
                  : "rgba(255,255,255,0.075)",
              }}
            >
              <span>{mode.label}</span>
              <span className="rounded border border-white/10 bg-black/15 px-1.5 py-0.5 text-[9px] text-gray-400">
                {mode.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {displayRows.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-white/[0.018] px-3 py-4 text-xs text-gray-500">
            Keine Keybindings fuer diese Suche oder diesen Filter.
          </div>
        ) : (
          displayRows.map((row) => {
            const draft = drafts[row.id] ?? row.override ?? row.defaultShortcut;
            const normalizedDraft = normalizeKeybindingShortcut(draft);
            const validation = validateKeybindingShortcut(draft);
            const isClearingOverride = !String(draft || "").trim() && row.isCustomized;
            const isChanged =
              normalizedDraft !== normalizeKeybindingShortcut(row.override || row.defaultShortcut);
            return (
              <div
                key={row.id}
                className="grid min-w-0 grid-cols-1 gap-3 rounded-md border px-3 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)_auto]"
                style={{
                  background: row.hasConflict
                    ? "rgba(245,158,11,0.07)"
                    : "rgba(255,255,255,0.014)",
                  borderColor: row.hasConflict
                    ? "rgba(245,158,11,0.18)"
                    : "rgba(156,178,226,0.055)",
                }}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words text-xs font-semibold text-gray-200">
                      {row.label}
                    </span>
                    <span className="rounded border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[10px] leading-tight text-gray-500">
                      {row.category}
                    </span>
                    {row.isCustomized ? (
                      <span className="rounded border border-[rgba(var(--nexus-primary-rgb),0.22)] bg-[rgba(var(--nexus-primary-rgb),0.08)] px-1.5 py-0.5 text-[10px] leading-tight text-[var(--nexus-primary)]">
                        Override
                      </span>
                    ) : null}
                    {row.hasConflict ? (
                      <span className="rounded border border-amber-300/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] leading-tight text-amber-200">
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Konflikt
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <code className="mt-1 block break-all text-[10px] leading-4 text-gray-500">
                    {row.command}
                  </code>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-1.5 text-[10px] leading-tight">
                    <span className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-gray-400">
                      Effektiv: {row.effectiveShortcut || "nicht gesetzt"}
                    </span>
                    <span className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-gray-500">
                      Default: {row.defaultShortcut || "nicht gesetzt"}
                    </span>
                    <span className="rounded border border-white/10 bg-white/[0.025] px-1.5 py-1 text-gray-500">
                      When: {row.when || "global"}
                    </span>
                  </div>
                  {row.hasConflict && row.conflictLabels?.length ? (
                    <p className="mt-1 break-words text-[10px] leading-4 text-amber-200/80">
                      Konflikt mit: {row.conflictLabels.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <NativeInput
                    value={draft}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }))
                    }
                    onBlur={() => commitDraft(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitDraft(row);
                    }}
                    placeholder="z.B. Ctrl+Shift+P"
                    className={`h-9 w-full font-mono ${
                      validation.ok ? "" : "border-red-400/40"
                    }`}
                  />
                  {!validation.ok ? (
                    <p className="mt-1 break-words text-[10px] leading-4 text-red-300/80">
                      {validation.reason}
                    </p>
                  ) : isClearingOverride ? (
                    <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                      Leer speichern setzt dieses Binding auf den Default zurueck.
                    </p>
                  ) : isChanged ? (
                    <p className="mt-1 break-words text-[10px] leading-4 text-gray-500">
                      Wird als {validation.normalized || row.defaultShortcut || "nicht gesetzt"} gespeichert.
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => commitDraft(row)}
                    disabled={!validation.ok || !isChanged}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold text-gray-300 transition-colors hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.026)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Check size={12} />
                    Setzen
                  </button>
                  <button
                    type="button"
                    onClick={() => onResetBinding(row.id)}
                    disabled={!row.isCustomized}
                    title="Binding zuruecksetzen"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold text-gray-400 transition-colors hover:bg-white/[0.045] hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.026)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <RefreshCcw size={12} />
                    Reset
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
