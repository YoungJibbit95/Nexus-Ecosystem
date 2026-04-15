import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Search,
} from "lucide-react";
import { useTheme } from "../store/themeStore";
import { useTerminal } from "../store/terminalStore";
import { useApp } from "../store/appStore";
import { Glass } from "./Glass";
import { hexToRgb } from "../lib/utils";
import { shallow } from "zustand/shallow";
import { buildMotionRuntime, getMotionFamilyRuntime } from "../lib/motionEngine";
import { resolveToolbarBrandSpec } from "@nexus/core";
import {
  MOBILE_TOOLBAR_LAYOUT,
} from "./toolbar/layoutConfig";
import { MOBILE_TOOLBAR_VIEW_ITEMS } from "./toolbar/viewItems";
import {
  IslandToolbarBrand,
  SpotlightToolbarBrand,
} from "./toolbar/ToolbarBranding";
import { SpotlightPanel } from "./toolbar/SpotlightPanel";
import { MobileFullWidthToolbarSection } from "./toolbar/MobileFullWidthToolbarSection";
import {
  buildMobileToolbarCommands,
  buildMobileToolbarSuggestions,
} from "./toolbar/mobileToolbarCommandModel";

export function NexusToolbar({
  spotlightMode: forceSpotlight,
  setView,
}: {
  spotlightMode?: boolean;
  setView?: (v: any) => void;
}) {
  const t = useTheme();
  const { terminalOpen, setTerminalOpen } = useTerminal(
    (s) => ({
      terminalOpen: s.isOpen,
      setTerminalOpen: s.setOpen,
      executeCommand: s.executeCommand,
    }),
    shallow,
  );
  const { notes, tasks, codes, reminders } = useApp(
    (s) => ({
      notes: s.notes,
      tasks: s.tasks,
      codes: s.codes,
      reminders: s.reminders,
    }),
    shallow,
  );
  const rgb = hexToRgb(t.accent);

  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [lastShift, setLastShift] = useState(0);
  const [shiftDown, setShiftDown] = useState(0);
  const [search, setSearch] = useState("");
  const [selIdx, setSelIdx] = useState(0);
  const [time, setTime] = useState(new Date());
  const [cmdMode, setCmdMode] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 920,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const toolbarMode = t.toolbar?.toolbarMode ?? "island";
  const isSpotlight = toolbarMode === "spotlight" || !!forceSpotlight;
  const isFullWidth = toolbarMode === "full-width";
  const isBottom = (t.toolbar?.position ?? "bottom") === "bottom";
  const barHeight = t.toolbar?.height ?? 44;
  const reducedMotion = t.qol?.reducedMotion ?? false;
  const spotlightAnchorX = MOBILE_TOOLBAR_LAYOUT.spotlight.anchorX;
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t]);
  const toolbarMotion = useMemo(
    () => getMotionFamilyRuntime(motionRuntime, "toolbar"),
    [motionRuntime],
  );
  const commandMotion = useMemo(
    () => getMotionFamilyRuntime(motionRuntime, "command"),
    [motionRuntime],
  );

  // Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  // Double-shift
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift" && shiftDown === 0) setShiftDown(Date.now());
      if (e.key === "Escape") {
        setExpanded(false);
        setCmdMode(false);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key !== "Shift") return;
      const now = Date.now();
      if (now - shiftDown < 250 && now - lastShift < 350)
        setExpanded((p) => !p);
      setLastShift(now);
      setShiftDown(0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [lastShift, shiftDown]);

  useEffect(() => {
    if (expanded && (isSpotlight || cmdMode))
      setTimeout(() => inputRef.current?.focus(), 80);
    if (!expanded) {
      setSearch("");
      setSelIdx(0);
      setCmdMode(false);
    }
  }, [expanded, isSpotlight, cmdMode]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth || 920);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const COMMANDS = useMemo(
    () =>
      buildMobileToolbarCommands({
        setView,
        terminalOpen,
        setTerminalOpen,
        theme: t,
      }),
    [setView, terminalOpen, setTerminalOpen, t],
  );

  const runTerminalCommand = useCallback(
    (rawCommand: string) => {
      const normalized = String(rawCommand || "").trim();
      if (!normalized) return;
      const terminalState = useTerminal.getState();
      terminalState.setOpen(true);
      terminalState.executeCommand(normalized, {
        setView: (nextView: any) => setView?.(nextView),
        t: useTheme.getState(),
        app: useApp.getState(),
      });
    },
    [setView],
  );

  const suggestions = useMemo(
    () =>
      buildMobileToolbarSuggestions({
        search,
        notes,
        tasks,
        codes,
        reminders,
        commands: COMMANDS,
        setView,
        accent: t.accent,
        runTerminalCommand,
      }),
    [
      search,
      notes,
      tasks,
      codes,
      reminders,
      COMMANDS,
      setView,
      t.accent,
      runTerminalCommand,
    ],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      const list = search ? suggestions : COMMANDS;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelIdx((p) => (p + 1) % Math.max(list.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelIdx((p) => (p - 1 + list.length) % Math.max(list.length, 1));
      } else if (e.key === "Enter" && list[selIdx]) {
        list[selIdx].action();
        setExpanded(false);
      } else if (e.key === "Escape") setExpanded(false);
    },
    [suggestions, COMMANDS, selIdx, search],
  );

  const overdueCount = reminders.filter(
    (r) => !r.done && new Date(r.snoozeUntil || r.datetime) < new Date(),
  ).length;
  const pendingTasks = tasks.filter((tk) => tk.status !== "done").length;
  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Spotlight mode ────────────────────────────────────────────────────
  if (isSpotlight)
    return (
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={commandMotion.transition}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 899,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)",
              }}
              onClick={() => setExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={
                motionRuntime.reduced
                  ? { duration: 0.12 }
                  : commandMotion.transition
              }
              style={{
                position: "fixed",
                top: MOBILE_TOOLBAR_LAYOUT.spotlight.panelTopPx,
                left: spotlightAnchorX,
                transform: `translateX(${MOBILE_TOOLBAR_LAYOUT.spotlight.translateX})`,
                width: MOBILE_TOOLBAR_LAYOUT.spotlight.panelWidth,
                transformOrigin: "50% 50%",
                zIndex: 900,
              }}
            >
              <SpotlightPanel
                search={search}
                setSearch={setSearch}
                selIdx={selIdx}
                setSelIdx={setSelIdx}
                suggestions={suggestions}
                commands={COMMANDS}
                handleKey={handleKey}
                inputRef={inputRef}
                onClose={() => setExpanded(false)}
                views={MOBILE_TOOLBAR_VIEW_ITEMS}
                setView={setView}
                rgb={rgb}
                t={t}
              />
            </motion.div>
          </>
        )}
        {!expanded && (
          <div style={{ display: "flex", justifyContent: "center", padding: isBottom ? "0 0 8px" : "8px 0 0" }}>
            <button
              onClick={() => setExpanded(true)}
              style={{
                border: `1px solid rgba(${rgb},0.3)`,
                background: `linear-gradient(135deg, rgba(${rgb},0.2), rgba(${rgb},0.08))`,
                color: t.accent,
                borderRadius: 12,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: `0 8px 24px rgba(${rgb},0.25)`,
                whiteSpace: "nowrap",
              }}
            >
              <SpotlightToolbarBrand t={t} rgb={rgb} />
              <span style={{ opacity: 0.68, fontWeight: 600 }}>Shift x2</span>
            </button>
          </div>
        )}
      </AnimatePresence>
    );

  // ── Full-width bar ────────────────────────────────────────────────────
  if (isFullWidth) {
    return (
      <MobileFullWidthToolbarSection
        viewportWidth={viewportWidth}
        expanded={expanded}
        barHeight={barHeight}
        isBottom={isBottom}
        rgb={rgb}
        t={t}
        hovered={hovered}
        setHovered={setHovered}
        pendingTasks={pendingTasks}
        overdueCount={overdueCount}
        timeStr={timeStr}
        terminalOpen={terminalOpen}
        setTerminalOpen={setTerminalOpen}
        setExpanded={setExpanded}
        setCmdMode={setCmdMode}
        cmdMode={cmdMode}
        commandMotion={commandMotion}
        search={search}
        setSearch={setSearch}
        selIdx={selIdx}
        setSelIdx={setSelIdx}
        suggestions={suggestions}
        COMMANDS={COMMANDS}
        handleKey={handleKey}
        inputRef={inputRef}
        setView={setView}
      />
    );
  }

  // ── Island mode ───────────────────────────────────────────────────────
  const islandBrand = resolveToolbarBrandSpec({
    mode: "island",
    width: viewportWidth,
    compact: viewportWidth < 900,
    expanded,
    platform: "mobile",
  });
  const islandRightRailPx = expanded
    ? Math.round(
        Math.max(
          132,
          Math.min(
            viewportWidth * (viewportWidth < 900 ? 0.28 : 0.25),
            viewportWidth < 900 ? 190 : 240,
          ),
        ),
      )
    : Math.round(Math.max(120, Math.min(viewportWidth * 0.24, 170)));
  const showIslandLabelsResolved = viewportWidth >= 1060;
  const islandNavItems = MOBILE_TOOLBAR_VIEW_ITEMS;
  const islandCompactStatus = viewportWidth < 1080;
  const showIslandTime = viewportWidth >= 1220 && !islandCompactStatus;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: isBottom ? "0 0 10px" : "10px 0 0",
        pointerEvents: "none",
        position: "relative",
      }}
    >
      <motion.div
        animate={{
          width: expanded ? "min(980px, 96vw)" : "min(460px, 94vw)",
          height: 56,
        }}
        transition={
          reducedMotion
            ? { duration: Math.max(motionRuntime.quickMs / 1000, 0.1) }
            : toolbarMotion.transition
        }
        onHoverStart={() => setExpanded(true)}
        onHoverEnd={() => {
          if (!cmdMode) setExpanded(false);
        }}
        style={{ pointerEvents: "auto", position: "relative" }}
      >
        <Glass
          type="modal"
          glow={expanded}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: expanded ? 22 : 18,
            border: expanded
              ? `1px solid rgba(${rgb},0.4)`
              : `1px solid rgba(255,255,255,0.12)`,
            backdropFilter: "blur(30px) saturate(220%)",
            WebkitBackdropFilter: "blur(30px) saturate(220%)",
            display: "flex",
            alignItems: "center",
            overflow: "visible",
            padding: expanded ? "0 16px" : "0 18px",
            gap: 0,
            transition: "border-color 0.3s",
            boxShadow: expanded
              ? `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(${rgb},0.15)`
              : `0 8px 28px rgba(0,0,0,0.45), 0 2px 0 0 rgba(255,255,255,0.06) inset`,
          }}
        >
          {/* Logo */}
          <IslandToolbarBrand
            rgb={rgb}
            t={t}
            spec={islandBrand}
            offset={MOBILE_TOOLBAR_LAYOUT.island.logoOffset}
          />

          {/* Collapsed preview */}
          <AnimatePresence initial={false}>
            {!expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginLeft: 10,
                  transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.brandOffset.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.brandOffset.y}px)`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    opacity: 0.55,
                    letterSpacing: "0.04em",
                  }}
                >
                  Nexus
                </span>
                <div style={{ display: "flex", gap: 3, opacity: 0.25 }}>
                  {MOBILE_TOOLBAR_VIEW_ITEMS.slice(0, 5).map((v) => (
                    <v.icon key={v.id} size={9} />
                  ))}
                </div>
                {overdueCount > 0 && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#FF453A",
                      boxShadow: "0 0 6px #FF453A",
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded tools */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={toolbarMotion.transition}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  gap: 8,
                  marginLeft: 8,
                  minWidth: 0,
                }}
              >
                <div
                  className="nx-toolbar-view-rail"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 0,
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "hidden",
                    height: "100%",
                    paddingRight: 2,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {islandNavItems.map((item) => {
                    const iRgb = hexToRgb(item.color);
                    return (
                      <button
                        key={item.id}
                        onClick={() => item.id && setView?.(item.id)}
                        onMouseEnter={() => setHovered(item.id)}
                        onMouseLeave={() => setHovered(null)}
                        title={item.label}
                        style={{
                          position: "relative",
                          padding: "7px 9px",
                          borderRadius: 11,
                          border: "none",
                          background:
                            hovered === item.id
                              ? `rgba(${iRgb},0.2)`
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.12s",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                          color: hovered === item.id ? item.color : "inherit",
                        }}
                      >
                        <item.icon
                          size={14}
                          style={{
                            opacity: hovered === item.id ? 1 : 0.5,
                            transition: "all 0.12s",
                          }}
                        />
                        {showIslandLabelsResolved ? (
                          <span style={{ fontSize: 11, fontWeight: 700 }}>
                            {item.label}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: "rgba(255,255,255,0.1)",
                    margin: "0 6px",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 7,
                    minWidth: 0,
                    width: `${islandRightRailPx}px`,
                    maxWidth: "100%",
                    flexBasis: `${islandRightRailPx}px`,
                    overflow: "hidden",
                    paddingBottom: 2,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  {/* Stats */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "4px 10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      flexShrink: 0,
                      transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.statusOffset.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.statusOffset.y}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: pendingTasks > 0 ? "#FF9F0A" : "inherit",
                        opacity: pendingTasks > 0 ? 1 : 0.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      T {pendingTasks}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: overdueCount > 0 ? "#FF453A" : "inherit",
                        opacity: overdueCount > 0 ? 1 : 0.55,
                        whiteSpace: "nowrap",
                      }}
                    >
                      D {overdueCount}
                    </span>
                    {showIslandTime ? (
                      <span
                        style={{
                          fontSize: 9,
                          opacity: 0.35,
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {timeStr}
                      </span>
                    ) : null}
                  </div>

                  {/* Terminal + Search */}
                  <button
                    className="nx-icon-btn"
                    onClick={() => setTerminalOpen(!terminalOpen)}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      borderRadius: 9,
                      border: `1px solid rgba(255,255,255,${terminalOpen ? 0.2 : 0.08})`,
                      background: terminalOpen
                        ? `rgba(${rgb},0.2)`
                        : "rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      color: terminalOpen ? t.accent : "inherit",
                      transition: "all 0.12s",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.terminal.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.terminal.y}px)`,
                    }}
                  >
                    <Terminal
                      size={14}
                      style={{ opacity: terminalOpen ? 1 : 0.4 }}
                    />
                  </button>
                  <button
                    className="nx-icon-btn"
                    onClick={() => {
                      setCmdMode(true);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      borderRadius: 9,
                      border: `1px solid rgba(${rgb},0.2)`,
                      background: `rgba(${rgb},0.1)`,
                      cursor: "pointer",
                      color: t.accent,
                      transition: "all 0.12s",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.search.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.search.y}px)`,
                    }}
                  >
                    <Search size={14} style={{ opacity: 0.72 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Glass>

        {/* Command palette overlay when search is triggered from island */}
        <AnimatePresence>
          {cmdMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={commandMotion.transition}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 898,
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
                onClick={() => {
                  setCmdMode(false);
                  setExpanded(false);
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={
                  motionRuntime.reduced
                    ? { duration: 0.12 }
                    : commandMotion.transition
                }
                style={{
                  position: "fixed",
                  top: isBottom ? "auto" : "calc(100% + 12px)",
                  bottom: isBottom ? "calc(100% + 12px)" : "auto",
                  left: spotlightAnchorX,
                  transform: `translateX(${MOBILE_TOOLBAR_LAYOUT.spotlight.translateX})`,
                  width: MOBILE_TOOLBAR_LAYOUT.spotlight.overlayPanelWidth,
                  transformOrigin: "50% 50%",
                  zIndex: 899,
                }}
              >
                <SpotlightPanel
                  search={search}
                  setSearch={setSearch}
                  selIdx={selIdx}
                  setSelIdx={setSelIdx}
                  suggestions={suggestions}
                  commands={COMMANDS}
                  handleKey={handleKey}
                  inputRef={inputRef}
                  onClose={() => {
                    setCmdMode(false);
                    setExpanded(false);
                  }}
                  views={MOBILE_TOOLBAR_VIEW_ITEMS}
                  setView={setView}
                  rgb={rgb}
                  t={t}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
