import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { type CaptureIntent } from "@nexus/core";
import { shallow } from "zustand/shallow";
import { useTheme } from "../../store/themeStore";
import { useTerminal } from "../../store/terminalStore";
import { useApp } from "../../store/appStore";
import { useCanvas } from "../../store/canvasStore";
import { hexToRgb } from "../../lib/utils";
import { buildMotionRuntime } from "../../lib/motionEngine";
import {
  VIEW_ITEMS,
  SPOTLIGHT_PINS_KEY,
  SPOTLIGHT_RECENTS_KEY,
  parseStoredList,
  type ViewId,
} from "./constants";
import { TOOLBAR_LAYOUT_CONFIG } from "./layoutConfig";
import type { CommandItem } from "./types";
import { buildToolbarCommands, buildToolbarSuggestions } from "./toolbarCommandModel";

type SetView = ((view: any) => void) | undefined;

type UseNexusToolbarModelArgs = {
  forceSpotlight?: boolean;
  setView?: (view: any) => void;
  activeView?: string;
};

export function useNexusToolbarModel({
  forceSpotlight,
  setView,
  activeView,
}: UseNexusToolbarModelArgs) {
  const t = useTheme();
  const terminal = useTerminal(
    (s) => ({
      isOpen: s.isOpen,
      setOpen: s.setOpen,
      executeCommand: s.executeCommand,
    }),
    shallow,
  );
  const app = useApp(
    (s) => ({
      notes: s.notes,
      tasks: s.tasks,
      codes: s.codes,
      reminders: s.reminders,
      addNote: s.addNote,
      addTask: s.addTask,
      addRem: s.addRem,
      addCode: s.addCode,
    }),
    shallow,
  );
  const canvases = useCanvas((s) => s.canvases);
  const addCanvas = useCanvas((s) => s.addCanvas);

  const rgb = hexToRgb(t.accent);

  const [expanded, setExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selIdx, setSelIdx] = useState(0);
  const [lastShift, setLastShift] = useState(0);
  const [shiftDownAt, setShiftDownAt] = useState(0);
  const [time, setTime] = useState(new Date());
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const [islandCompact, setIslandCompact] = useState(false);
  const [islandWidth, setIslandWidth] = useState(0);

  const toolbarMode = t.toolbar?.toolbarMode ?? "island";
  const isSpotlight = toolbarMode === "spotlight" || !!forceSpotlight;
  const isFullWidth = toolbarMode === "full-width";
  const isBottom = (t.toolbar?.position ?? "bottom") === "bottom";
  const reducedMotion = t.qol?.reducedMotion ?? false;
  const spotlightAnchorX = TOOLBAR_LAYOUT_CONFIG.spotlight.anchorX;
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t]);
  const activeToolbarView = useMemo(
    () =>
      activeView && VIEW_ITEMS.some((item) => item.id === activeView)
        ? (activeView as ViewId)
        : undefined,
    [activeView],
  );

  useEffect(() => {
    const element = islandRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = Math.round(entry.contentRect.width || 0);
        setIslandWidth(nextWidth);
        setIslandCompact(nextWidth < 910);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPinnedIds(parseStoredList(localStorage.getItem(SPOTLIGHT_PINS_KEY)).slice(0, 20));
    setRecentIds(parseStoredList(localStorage.getItem(SPOTLIGHT_RECENTS_KEY)).slice(0, 20));
  }, []);

  useEffect(() => {
    const syncSpotlightStorage = () => {
      setPinnedIds(parseStoredList(localStorage.getItem(SPOTLIGHT_PINS_KEY)).slice(0, 20));
      setRecentIds(parseStoredList(localStorage.getItem(SPOTLIGHT_RECENTS_KEY)).slice(0, 20));
    };
    window.addEventListener(
      "nx-spotlight-storage-updated",
      syncSpotlightStorage as EventListener,
    );
    return () => {
      window.removeEventListener(
        "nx-spotlight-storage-updated",
        syncSpotlightStorage as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SPOTLIGHT_PINS_KEY, JSON.stringify(pinnedIds.slice(0, 20)));
  }, [pinnedIds]);

  useEffect(() => {
    localStorage.setItem(SPOTLIGHT_RECENTS_KEY, JSON.stringify(recentIds.slice(0, 20)));
  }, [recentIds]);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "Shift" && shiftDownAt === 0) setShiftDownAt(Date.now());
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPanelOpen(true);
        setExpanded(true);
      }
      if (event.key === "Escape") {
        setPanelOpen(false);
        setExpanded(false);
        setSearch("");
      }
    };

    const up = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;
      const now = Date.now();
      if (now - shiftDownAt < 260 && now - lastShift < 360) {
        const next = !panelOpen;
        setPanelOpen(next);
        setExpanded(next);
      }
      setLastShift(now);
      setShiftDownAt(0);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [lastShift, shiftDownAt, panelOpen]);

  useEffect(() => {
    if (panelOpen) {
      setTimeout(() => inputRef.current?.focus(), 90);
    } else {
      setSearch("");
      setSelIdx(0);
    }
  }, [panelOpen]);

  useEffect(() => {
    const onOpenSpotlight = (event: Event) => {
      const custom = event as CustomEvent<{ query?: string }>;
      setPanelOpen(true);
      setExpanded(true);
      if (typeof custom.detail?.query === "string") {
        setSearch(custom.detail.query);
        setSelIdx(0);
      }
    };

    window.addEventListener("nx-open-spotlight", onOpenSpotlight as EventListener);
    return () => {
      window.removeEventListener("nx-open-spotlight", onOpenSpotlight as EventListener);
    };
  }, []);

  const pendingTasks = app.tasks.filter((task) => task.status !== "done").length;
  const overdueReminders = app.reminders.filter(
    (reminder) => !reminder.done && new Date(reminder.snoozeUntil || reminder.datetime) < new Date(),
  ).length;

  const runCaptureIntent = useCallback(
    (intent: CaptureIntent) => {
      switch (intent.type) {
        case "note": {
          app.addNote();
          const latest = useApp.getState().notes[0];
          const title = intent.title?.trim();
          if (latest?.id && title) {
            useApp.getState().updateNote(latest.id, { title });
          }
          setView?.((intent.targetView || "notes") as any);
          return;
        }
        case "task": {
          app.addTask(intent.title?.trim() || "Quick Task", "todo");
          setView?.((intent.targetView || "tasks") as any);
          return;
        }
        case "reminder": {
          app.addRem({
            title: intent.title?.trim() || "Quick Reminder",
            msg: "Created from command bar",
            datetime: new Date(Date.now() + 60 * 60000).toISOString(),
            repeat: "none",
          });
          setView?.((intent.targetView || "reminders") as any);
          return;
        }
        case "code": {
          const baseName = (intent.title?.trim() || "quick-snippet")
            .replace(/\s+/g, "-")
            .toLowerCase();
          const hasExt = /\.[a-z0-9]+$/i.test(baseName);
          app.addCode(hasExt ? baseName : `${baseName}.ts`, "typescript");
          setView?.((intent.targetView || "code") as any);
          return;
        }
        case "canvas": {
          addCanvas(intent.title?.trim() || "Neue Idee");
          setView?.((intent.targetView || "canvas") as any);
          return;
        }
        default:
          return;
      }
    },
    [addCanvas, app, setView],
  );

  const commands: CommandItem[] = useMemo(
    () =>
      buildToolbarCommands({
        t,
        terminal,
        app,
        canvases,
        addCanvas,
        runCaptureIntent,
        setView,
      }),
    [addCanvas, app, canvases, runCaptureIntent, setView, terminal, t],
  );

  useEffect(() => {
    const valid = new Set(commands.map((command) => command.id));
    setPinnedIds((prev) => prev.filter((id) => valid.has(id)));
    setRecentIds((prev) => prev.filter((id) => valid.has(id)));
  }, [commands]);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id)
        ? prev.filter((entry) => entry !== id)
        : [id, ...prev.filter((entry) => entry !== id)].slice(0, 20),
    );
  }, []);

  const rememberRecent = useCallback((item: CommandItem) => {
    if (item.type !== "command") return;
    setRecentIds((prev) => [item.id, ...prev.filter((id) => id !== item.id)].slice(0, 20));
  }, []);

  const runTerminalCommand = useCallback(
    (rawCommand: string) => {
      const normalized = String(rawCommand || "").trim();
      if (!normalized) return;
      terminal.setOpen(true);
      terminal.executeCommand(normalized, {
        setView: (nextView: any) => setView?.(nextView),
        t: useTheme.getState(),
        app: useApp.getState(),
      });
    },
    [setView, terminal],
  );

  const commandsById = useMemo(
    () => new Map(commands.map((item) => [item.id, item] as const)),
    [commands],
  );

  const pinnedCommands = useMemo(
    () => pinnedIds.map((id) => commandsById.get(id)).filter(Boolean) as CommandItem[],
    [pinnedIds, commandsById],
  );

  const recentCommands = useMemo(
    () => recentIds.map((id) => commandsById.get(id)).filter(Boolean) as CommandItem[],
    [recentIds, commandsById],
  );

  const quickActionCommands = useMemo(() => {
    const wanted = [
      "new-note",
      "new-task",
      "new-reminder",
      "new-canvas",
      "toggle-terminal",
      "toggle-theme",
    ];
    const list: CommandItem[] = [];
    for (const id of wanted) {
      const item = commandsById.get(id);
      if (item) list.push(item);
    }
    return list;
  }, [commandsById]);

  const commandList = useMemo(() => {
    const pinSet = new Set(pinnedIds);
    const pinned = commands.filter((item) => pinSet.has(item.id));
    const normal = commands.filter((item) => !pinSet.has(item.id));
    return [...pinned, ...normal];
  }, [commands, pinnedIds]);

  const suggestions = useMemo(
    () =>
      buildToolbarSuggestions({
        search,
        commands,
        app,
        canvases,
        setView,
        runCaptureIntent,
        runTerminalCommand,
      }),
    [search, commands, app, canvases, setView, runCaptureIntent, runTerminalCommand],
  );

  const list = search ? suggestions : commandList;

  const runItem = useCallback(
    (item?: CommandItem) => {
      if (!item) return;
      item.action();
      rememberRecent(item);
      setPanelOpen(false);
      setExpanded(false);
    },
    [rememberRecent],
  );

  const handleKey = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!list.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelIdx((prev) => (prev + 1) % list.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelIdx((prev) => (prev - 1 + list.length) % list.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        runItem(list[selIdx]);
      }
    },
    [list, selIdx, runItem],
  );

  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    t,
    rgb,
    terminal,
    motionRuntime,
    inputRef,
    islandRef,
    expanded,
    setExpanded,
    panelOpen,
    setPanelOpen,
    search,
    setSearch,
    selIdx,
    setSelIdx,
    isSpotlight,
    isFullWidth,
    isBottom,
    reducedMotion,
    spotlightAnchorX,
    activeToolbarView,
    pendingTasks,
    overdueReminders,
    timeStr,
    islandCompact,
    islandWidth,
    list,
    handleKey,
    runItem,
    togglePin,
    isPinned,
    pinnedCommands,
    recentCommands,
    quickActionCommands,
    setView: setView as SetView,
  };
}
