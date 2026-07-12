import React from "react";
import { ArrowLeft, RefreshCcw, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { SETTING_SECTIONS } from "./settingsCatalog.jsx";

export default function SettingsNavigation({
  activeSection,
  sectionMatchCounts,
  searchQuery,
  searchTerm,
  totalMatches,
  visibleSectionIds,
  shouldReduceMotion,
  motionTransition,
  onActiveSectionChange,
  onClose,
  onResetSettings,
  onSearchQueryChange,
}) {
  return (
    <motion.aside
      initial={shouldReduceMotion ? false : { x: -220, opacity: 0 }}
      animate={shouldReduceMotion ? undefined : { x: 0, opacity: 1 }}
      transition={motionTransition}
      className="nx-code-settings-nav flex w-48 shrink-0 flex-col overflow-y-auto p-3 sm:w-56 sm:p-3.5"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.004)), var(--nexus-sidebar)",
        borderRight: "1px solid rgba(156,178,226,0.075)",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="mb-4 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-gray-400 transition-colors hover:bg-white/[0.035] hover:text-gray-200"
      >
        <ArrowLeft size={16} />
        <span className="min-w-0 break-words text-sm">Zurueck</span>
      </button>

      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 break-words text-xs font-semibold uppercase leading-tight text-gray-500">
            Einstellungen
          </span>
          <button
            type="button"
            onClick={onResetSettings}
            title="Alles zuruecksetzen"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-red-400/70 transition-colors hover:border-red-300/10 hover:bg-red-500/10 hover:text-red-300"
          >
            <RefreshCcw size={13} />
          </button>
        </div>
        <div className="relative mt-3">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Settings suchen"
            className="h-9 w-full rounded-md border border-white/10 bg-white/[0.026] pl-8 pr-8 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-[rgba(var(--nexus-primary-rgb),0.38)]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              title="Suche leeren"
              className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>
        {searchTerm ? (
          <div className="mt-2 break-words text-[10px] leading-tight text-gray-500">
            {totalMatches} Treffer in {visibleSectionIds.length} Kategorien
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        {SETTING_SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id && !searchTerm;
          const count = sectionMatchCounts[section.id];
          const disabledBySearch = searchTerm && count === 0;
          return (
            <motion.button
              key={section.id}
              initial={shouldReduceMotion ? false : { x: -12, opacity: 0 }}
              animate={shouldReduceMotion ? undefined : { x: 0, opacity: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { delay: 0.04 + index * 0.02, duration: 0.18 }
              }
              whileHover={shouldReduceMotion || disabledBySearch ? undefined : { x: 4 }}
              whileTap={shouldReduceMotion || disabledBySearch ? undefined : { scale: 0.99 }}
              type="button"
              onClick={() => {
                if (!disabledBySearch) onActiveSectionChange(section.id);
              }}
              className="relative flex w-full min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left"
              style={{
                background: isActive
                  ? "rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.095)"
                  : "transparent",
                color: disabledBySearch
                  ? "#4b5563"
                  : isActive
                    ? "var(--nexus-primary, #7c8cff)"
                    : "#9ca3af",
                cursor: disabledBySearch ? "default" : "pointer",
              }}
            >
              {isActive ? (
                <motion.span
                  layoutId="settingsActiveIndicator"
                  className="absolute left-1 top-1 bottom-1 w-0.5 rounded-full"
                  style={{
                    background: "var(--nexus-primary, #7c8cff)",
                    boxShadow:
                      "0 0 6px rgba(var(--nexus-primary-rgb, 124, 140, 255), 0.28)",
                  }}
                />
              ) : null}
              <Icon size={16} className="shrink-0" />
              <span className="min-w-0 flex-1 break-words text-sm leading-tight">
                {section.label}
              </span>
              {searchTerm && count > 0 ? (
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[10px] leading-tight">
                  {count}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </motion.aside>
  );
}
