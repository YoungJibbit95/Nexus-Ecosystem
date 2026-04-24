import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useTheme } from "../store/themeStore";
import { useTerminal } from "../store/terminalStore";
import { useApp } from "../store/appStore";
import { hexToRgb } from "../lib/utils";
import { shallow } from "zustand/shallow";
import { buildMotionRuntime, getMotionFamilyRuntime } from "../lib/motionEngine";
import {
  MOBILE_TOOLBAR_LAYOUT,
} from "./toolbar/layoutConfig";
import { MobileFullWidthToolbarSection } from "./toolbar/MobileFullWidthToolbarSection";
import { MobileSpotlightToolbarSection } from "./toolbar/MobileSpotlightToolbarSection";
import { MobileIslandToolbarSection } from "./toolbar/MobileIslandToolbarSection";
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
  const barHeight = MOBILE_TOOLBAR_LAYOUT.fullWidth.height;
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

  if (isSpotlight) {
    return (
      <MobileSpotlightToolbarSection
        expanded={expanded}
        setExpanded={setExpanded}
        isBottom={isBottom}
        rgb={rgb}
        t={t}
        commandMotion={commandMotion}
        motionRuntime={motionRuntime}
        spotlightAnchorX={spotlightAnchorX}
        search={search}
        setSearch={setSearch}
        selIdx={selIdx}
        setSelIdx={setSelIdx}
        suggestions={suggestions}
        commands={COMMANDS}
        handleKey={handleKey}
        inputRef={inputRef}
        setView={setView}
      />
    );
  }

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

  return (
    <MobileIslandToolbarSection
      expanded={expanded}
      setExpanded={setExpanded}
      cmdMode={cmdMode}
      setCmdMode={setCmdMode}
      isBottom={isBottom}
      rgb={rgb}
      t={t}
      reducedMotion={reducedMotion}
      toolbarMotion={toolbarMotion}
      commandMotion={commandMotion}
      motionRuntime={motionRuntime}
      viewportWidth={viewportWidth}
      hovered={hovered}
      setHovered={setHovered}
      pendingTasks={pendingTasks}
      overdueCount={overdueCount}
      timeStr={timeStr}
      terminalOpen={terminalOpen}
      setTerminalOpen={setTerminalOpen}
      search={search}
      setSearch={setSearch}
      selIdx={selIdx}
      setSelIdx={setSelIdx}
      suggestions={suggestions}
      commands={COMMANDS}
      handleKey={handleKey}
      inputRef={inputRef}
      setView={setView}
      spotlightAnchorX={spotlightAnchorX}
    />
  );
}
