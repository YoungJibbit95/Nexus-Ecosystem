import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  getEditorCommandPaletteCommands,
  groupCommandPaletteItems,
  normalizeSearchValue,
  rankCommandPaletteItems,
} from "../../pages/editor/commandPaletteModel.js";

const EMPTY_EXTENSION_COMMANDS = Object.freeze([]);
const PAGE_STEP = 6;

function KeyboardHint({ label }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
      {label}
    </span>
  );
}

export default function CommandPalette({
  isOpen,
  onClose,
  onAction,
  extensionCommands = EMPTY_EXTENSION_COMMANDS,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  const commands = useMemo(
    () =>
      getEditorCommandPaletteCommands({
        extensionCommands,
        surface: "palette",
      }),
    [extensionCommands],
  );
  const filtered = useMemo(
    () => rankCommandPaletteItems(commands, query),
    [commands, query],
  );
  const groups = useMemo(() => groupCommandPaletteItems(filtered), [filtered]);
  const normalizedQuery = normalizeSearchValue(query);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    optionRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedIndex, filtered.length]);

  const moveSelection = (delta) => {
    if (filtered.length === 0) return;
    setSelectedIndex((prev) => (prev + delta + filtered.length) % filtered.length);
  };

  const runCommand = (command) => {
    if (!command) return;
    onAction?.(command.actionId || command.id);
    onClose?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      moveSelection(PAGE_STEP);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      moveSelection(-PAGE_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(Math.max(0, filtered.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runCommand(filtered[selectedIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
    }
  };

  let visibleIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -18, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.97, y: -18, x: "-50%" }}
            transition={{
              type: "spring",
              stiffness: 330,
              damping: 32,
              mass: 0.82,
            }}
            className="fixed left-1/2 top-[12%] z-[1000] w-[min(48rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#080b14]/95 shadow-[0_28px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
            style={{ borderColor: "var(--nexus-border, rgba(255,255,255,0.12))" }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300">
                <Search size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Befehl, Dateiaktion oder Layout suchen..."
                  className="w-full bg-transparent text-base font-medium text-gray-100 outline-none placeholder:text-gray-600"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="nexus-command-palette-results"
                  aria-activedescendant={
                    filtered[selectedIndex] ? `command-palette-${filtered[selectedIndex].id}` : undefined
                  }
                />
                <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                  <span>{filtered.length} Commands</span>
                  {normalizedQuery && <span>Ranking nach Label, Keyword und Kategorie</span>}
                </div>
              </div>
            </div>

            <div
              id="nexus-command-palette-results"
              className="max-h-[460px] overflow-y-auto p-3"
              role="listbox"
            >
              {groups.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {groups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <section key={group.id} className="space-y-1.5">
                        <div className="flex items-center gap-2 px-2 py-1">
                          <span className={`size-1.5 rounded-full ${group.tone.dot}`} />
                          <GroupIcon size={13} className={group.tone.text} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">
                            {group.label}
                          </span>
                          <span className="truncate text-[11px] text-gray-600">
                            {group.description}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          {group.items.map((command) => {
                            const Icon = command.icon;
                            const index = visibleIndex;
                            const active = index === selectedIndex;
                            visibleIndex += 1;

                            return (
                              <motion.button
                                id={`command-palette-${command.id}`}
                                key={command.id}
                                ref={(node) => {
                                  optionRefs.current[index] = node;
                                }}
                                type="button"
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => runCommand(command)}
                                className={`grid min-h-[58px] w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 text-left transition-all ${
                                  active
                                    ? `${command.tone.active} border-white/15 text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]`
                                    : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.045] hover:text-gray-200"
                                }`}
                                role="option"
                                aria-selected={active}
                              >
                                <span
                                  className={`flex size-9 items-center justify-center rounded-lg border ${
                                    active
                                      ? command.tone.icon
                                      : "border-white/10 bg-white/[0.035] text-gray-500"
                                  }`}
                                >
                                  <Icon size={17} />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold">
                                    {command.label}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                                    {command.description}
                                  </span>
                                </span>
                                <span className="flex min-w-[5.5rem] justify-end">
                                  {command.shortcut ? (
                                    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-gray-400">
                                      {command.shortcut}
                                    </span>
                                  ) : (
                                    <span className={`rounded-md border px-2 py-1 text-[10px] ${command.tone.chip}`}>
                                      {command.categoryMeta.label}
                                    </span>
                                  )}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-500">
                    <Search size={22} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-300">
                      Kein Command gefunden
                    </div>
                    <div className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
                      Pruefe Schreibweise, Action-ID oder Kategorie. Extension-Commands koennen
                      dieselbe Registry nutzen.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <KeyboardHint label="Up" />
                <KeyboardHint label="Down" />
                <span>Navigieren</span>
                <KeyboardHint label="Enter" />
                <span>Auswaehlen</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyboardHint label="Home" />
                <KeyboardHint label="End" />
                <KeyboardHint label="Esc" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
