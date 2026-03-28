import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Code2,
  FileText,
  CheckSquare,
  Terminal,
  Search,
  Bell,
  Moon,
  GitBranch,
  Sparkles,
  Palette,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { PRESETS, useTheme } from "../store/themeStore";
import { useTerminal } from "../store/terminalStore";
import { useApp } from "../store/appStore";
import { useCanvas } from "../store/canvasStore";
import { Glass } from "./Glass";
import { hexToRgb } from "../lib/utils";
import { shallow } from "zustand/shallow";
import {
  VIEW_ITEMS,
  SPOTLIGHT_PINS_KEY,
  SPOTLIGHT_RECENTS_KEY,
  parseStoredList,
} from "./toolbar/constants";
import { StatusPill, DockLogo } from "./toolbar/ToolbarPrimitives";
import {
  FullWidthToolbarLayout,
  IslandToolbarLayout,
} from "./toolbar/ToolbarLayouts";
import type { CommandItem } from "./toolbar/types";

const CommandPanel = lazy(() =>
  import("./toolbar/CommandPanel").then((m) => ({ default: m.CommandPanel })),
);

export function NexusToolbar({
  spotlightMode: forceSpotlight,
  setView,
}: {
  spotlightMode?: boolean;
  setView?: (v: any) => void;
}) {
  const t = useTheme();
  const terminal = useTerminal(
    (s) => ({ isOpen: s.isOpen, setOpen: s.setOpen }),
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

  const toolbarMode = t.toolbar?.toolbarMode ?? "island";
  const isSpotlight = toolbarMode === "spotlight" || !!forceSpotlight;
  const isFullWidth = toolbarMode === "full-width";
  const isBottom = (t.toolbar?.position ?? "bottom") === "bottom";
  const reducedMotion = t.qol?.reducedMotion ?? false;
  const spotlightAnchorX = "30%";

  useEffect(() => {
    const el = islandRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIslandCompact(entry.contentRect.width < 910);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPinnedIds(
      parseStoredList(localStorage.getItem(SPOTLIGHT_PINS_KEY)).slice(0, 20),
    );
    setRecentIds(
      parseStoredList(localStorage.getItem(SPOTLIGHT_RECENTS_KEY)).slice(0, 20),
    );
  }, []);

  useEffect(() => {
    const syncSpotlightStorage = () => {
      setPinnedIds(
        parseStoredList(localStorage.getItem(SPOTLIGHT_PINS_KEY)).slice(0, 20),
      );
      setRecentIds(
        parseStoredList(localStorage.getItem(SPOTLIGHT_RECENTS_KEY)).slice(
          0,
          20,
        ),
      );
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
    localStorage.setItem(
      SPOTLIGHT_PINS_KEY,
      JSON.stringify(pinnedIds.slice(0, 20)),
    );
  }, [pinnedIds]);

  useEffect(() => {
    localStorage.setItem(
      SPOTLIGHT_RECENTS_KEY,
      JSON.stringify(recentIds.slice(0, 20)),
    );
  }, [recentIds]);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift" && shiftDownAt === 0) setShiftDownAt(Date.now());
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPanelOpen(true);
        setExpanded(true);
      }
      if (e.key === "Escape") {
        setPanelOpen(false);
        setExpanded(false);
        setSearch("");
      }
    };

    const up = (e: KeyboardEvent) => {
      if (e.key !== "Shift") return;
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

    window.addEventListener(
      "nx-open-spotlight",
      onOpenSpotlight as EventListener,
    );
    return () => {
      window.removeEventListener(
        "nx-open-spotlight",
        onOpenSpotlight as EventListener,
      );
    };
  }, []);

  const pendingTasks = app.tasks.filter((tk) => tk.status !== "done").length;
  const overdueReminders = app.reminders.filter(
    (r) => !r.done && new Date(r.snoozeUntil || r.datetime) < new Date(),
  ).length;

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "new-note",
        label: "New note",
        type: "command",
        color: "#30D158",
        icon: FileText,
        hint: "Create a blank note",
        keywords: ["create", "new", "note", "quick"],
        action: () => {
          app.addNote();
          setView?.("notes");
        },
      },
      {
        id: "new-task",
        label: "New task",
        type: "command",
        color: "#FF9F0A",
        icon: CheckSquare,
        hint: "Add quick todo",
        keywords: ["create", "task", "todo", "kanban"],
        action: () => {
          app.addTask("Quick Task", "todo");
          setView?.("tasks");
        },
      },
      {
        id: "new-reminder",
        label: "Reminder in 1 hour",
        type: "command",
        color: "#FF453A",
        icon: Bell,
        hint: "Set reminder quickly",
        keywords: ["create", "reminder", "alarm", "notify"],
        action: () => {
          app.addRem({
            title: "Quick Reminder",
            msg: "Created from command bar",
            datetime: new Date(Date.now() + 60 * 60000).toISOString(),
            repeat: "none",
          });
          setView?.("reminders");
        },
      },
      {
        id: "toggle-terminal",
        label: terminal.isOpen ? "Close terminal" : "Open terminal",
        type: "command",
        color: t.accent,
        icon: Terminal,
        hint: "Toggle terminal panel",
        keywords: ["console", "shell", "terminal"],
        action: () => terminal.setOpen(!terminal.isOpen),
      },
      {
        id: "toggle-theme",
        label:
          t.mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
        type: "command",
        color: t.accent2,
        icon: Moon,
        hint: "Toggle app mode",
        keywords: ["theme", "light", "dark", "appearance"],
        action: () => t.setMode(t.mode === "dark" ? "light" : "dark"),
      },
      {
        id: "toggle-reduced-motion",
        label: t.qol.reducedMotion ? "Enable animations" : "Reduce motion",
        type: "command",
        color: "#64D2FF",
        icon: Sparkles,
        hint: "Accessibility and comfort",
        keywords: ["motion", "animation", "accessibility"],
        action: () => t.setQOL({ reducedMotion: !t.qol.reducedMotion }),
      },
      {
        id: "new-canvas",
        label: "New canvas",
        type: "command",
        color: "#64D2FF",
        icon: GitBranch,
        hint: "Create visual workspace",
        keywords: ["canvas", "map", "graph", "diagram"],
        action: () => {
          addCanvas("Neue Idee");
          setView?.("canvas");
        },
      },
      {
        id: "canvas-template-mindmap",
        label: "Canvas template: Mindmap",
        type: "command",
        color: "#64D2FF",
        icon: GitBranch,
        hint: "Generate connected mindmap structure",
        keywords: ["canvas", "template", "mindmap", "project"],
        action: () => {
          if (!useCanvas.getState().canvases.length) addCanvas("Mindmap");
          setView?.("canvas");
          window.dispatchEvent(
            new CustomEvent("nx-canvas-command", {
              detail: {
                action: "template",
                template: "mindmap",
                title: "Mindmap",
                includeNotes: true,
                includeTasks: true,
              },
            }),
          );
        },
      },
      {
        id: "canvas-template-roadmap",
        label: "Canvas template: Roadmap",
        type: "command",
        color: "#30D158",
        icon: GitBranch,
        hint: "Generate roadmap and milestones",
        keywords: ["canvas", "template", "roadmap", "milestone"],
        action: () => {
          if (!useCanvas.getState().canvases.length) addCanvas("Roadmap");
          setView?.("canvas");
          window.dispatchEvent(
            new CustomEvent("nx-canvas-command", {
              detail: {
                action: "template",
                template: "roadmap",
                title: "Roadmap",
                includeNotes: true,
                includeTasks: true,
              },
            }),
          );
        },
      },
      {
        id: "canvas-auto-layout-board",
        label: "Canvas auto-layout: Board",
        type: "command",
        color: "#FF9F0A",
        icon: GitBranch,
        hint: "Arrange nodes in todo/doing/blocked/done columns",
        keywords: ["canvas", "layout", "board", "snap"],
        action: () => {
          setView?.("canvas");
          window.dispatchEvent(
            new CustomEvent("nx-canvas-command", {
              detail: { action: "layout", mode: "board" },
            }),
          );
        },
      },
      {
        id: "canvas-template-ai-project",
        label: "Canvas template: AI Project",
        type: "command",
        color: "#5E5CE6",
        icon: Sparkles,
        hint: "Generate roadmap and PM map from AI prompt",
        keywords: ["canvas", "template", "ai", "project", "generator"],
        action: () => {
          if (!useCanvas.getState().canvases.length) addCanvas("AI Project");
          setView?.("canvas");
          window.dispatchEvent(
            new CustomEvent("nx-canvas-command", {
              detail: {
                action: "template",
                template: "ai-project",
                title: "AI Project",
                includeNotes: true,
                includeTasks: true,
              },
            }),
          );
        },
      },
      {
        id: "toolbar-spotlight",
        label: "Toolbar mode: Spotlight",
        type: "command",
        color: "#64D2FF",
        icon: Search,
        hint: "Search-first command flow",
        keywords: ["toolbar", "spotlight", "layout", "mode"],
        action: () => t.setToolbar({ toolbarMode: "spotlight" }),
      },
      {
        id: "toolbar-island",
        label: "Toolbar mode: Island",
        type: "command",
        color: t.accent,
        icon: Palette,
        hint: "Compact floating dock",
        keywords: ["toolbar", "island", "dock", "layout"],
        action: () => t.setToolbar({ toolbarMode: "island" }),
      },
      {
        id: "toolbar-full",
        label: "Toolbar mode: Full-width",
        type: "command",
        color: "#5E5CE6",
        icon: Palette,
        hint: "Top or bottom utility bar",
        keywords: ["toolbar", "full", "wide", "layout"],
        action: () => t.setToolbar({ toolbarMode: "full-width" }),
      },
      {
        id: "sidebar-side",
        label:
          t.sidebarPosition === "left"
            ? "Move sidebar to right"
            : "Move sidebar to left",
        type: "command",
        color: "#8E8E93",
        icon: t.sidebarPosition === "left" ? PanelRight : PanelLeft,
        hint: "Swap shell layout side",
        keywords: ["sidebar", "left", "right", "layout"],
        action: () =>
          t.setSidebarPosition(t.sidebarPosition === "left" ? "right" : "left"),
      },
      ...VIEW_ITEMS.map((v) => ({
        id: `goto-${v.id}`,
        label: `Go to ${v.label}`,
        type: "command" as const,
        color: v.color,
        icon: v.icon,
        hint: "Switch view",
        keywords: ["goto", "view", "navigate", v.label.toLowerCase(), v.id],
        action: () => setView?.(v.id),
      })),
      ...PRESETS.slice(0, 12).map((name) => ({
        id: `preset-${name}`,
        label: `Theme: ${name}`,
        type: "command" as const,
        color: "#7D7AFF",
        icon: Palette,
        hint: "Apply visual preset",
        keywords: ["theme", "preset", "style", name.toLowerCase()],
        action: () => t.preset(name),
      })),
    ],
    [addCanvas, app, setView, terminal, t],
  );

  useEffect(() => {
    const valid = new Set(commands.map((c) => c.id));
    setPinnedIds((prev) => prev.filter((id) => valid.has(id)));
    setRecentIds((prev) => prev.filter((id) => valid.has(id)));
  }, [commands]);

  const isPinned = useCallback(
    (id: string) => pinnedIds.includes(id),
    [pinnedIds],
  );

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [id, ...prev.filter((p) => p !== id)].slice(0, 20),
    );
  }, []);

  const rememberRecent = useCallback((item: CommandItem) => {
    if (item.type !== "command") return;
    setRecentIds((prev) =>
      [item.id, ...prev.filter((id) => id !== item.id)].slice(0, 20),
    );
  }, []);

  const commandsById = useMemo(
    () => new Map(commands.map((item) => [item.id, item] as const)),
    [commands],
  );

  const pinnedCommands = useMemo(
    () =>
      pinnedIds
        .map((id) => commandsById.get(id))
        .filter(Boolean) as CommandItem[],
    [pinnedIds, commandsById],
  );

  const recentCommands = useMemo(
    () =>
      recentIds
        .map((id) => commandsById.get(id))
        .filter(Boolean) as CommandItem[],
    [recentIds, commandsById],
  );

  const commandList = useMemo(() => {
    const pinSet = new Set(pinnedIds);
    const pinned = commands.filter((item) => pinSet.has(item.id));
    const normal = commands.filter((item) => !pinSet.has(item.id));
    return [...pinned, ...normal];
  }, [commands, pinnedIds]);

  const suggestions = useMemo(() => {
    const raw = search.trim();
    if (!raw) return [] as CommandItem[];
    const q = raw.toLowerCase();
    const items: CommandItem[] = [];

    const noteMatch = raw.match(/^note:\s*(.+)$/i);
    const taskMatch = raw.match(/^task:\s*(.+)$/i);
    const reminderMatch = raw.match(/^(rem:|reminder:)\s*(.+)$/i);
    const canvasMatch = raw.match(/^canvas:\s*(.+)$/i);
    const gotoMatch = raw.match(/^(goto:|view:)\s*(.+)$/i);

    if (noteMatch?.[1]?.trim()) {
      const title = noteMatch[1].trim();
      items.push({
        id: `create-note-${title}`,
        label: `Create note: ${title}`,
        type: "command",
        color: "#30D158",
        icon: FileText,
        hint: "Prefix create",
        action: () => {
          app.addNote();
          const latest = useApp.getState().notes[0];
          if (latest?.id) useApp.getState().updateNote(latest.id, { title });
          setView?.("notes");
        },
      });
    }

    if (taskMatch?.[1]?.trim()) {
      const title = taskMatch[1].trim();
      items.push({
        id: `create-task-${title}`,
        label: `Create task: ${title}`,
        type: "command",
        color: "#FF9F0A",
        icon: CheckSquare,
        hint: "Prefix create",
        action: () => {
          app.addTask(title, "todo");
          setView?.("tasks");
        },
      });
    }

    if (reminderMatch?.[2]?.trim()) {
      const title = reminderMatch[2].trim();
      items.push({
        id: `create-reminder-${title}`,
        label: `Create reminder (+1h): ${title}`,
        type: "command",
        color: "#FF453A",
        icon: Bell,
        hint: "Prefix create",
        action: () => {
          app.addRem({
            title,
            msg: "Created from spotlight",
            datetime: new Date(Date.now() + 60 * 60000).toISOString(),
            repeat: "none",
          });
          setView?.("reminders");
        },
      });
    }

    if (canvasMatch?.[1]?.trim()) {
      const name = canvasMatch[1].trim();
      items.push({
        id: `create-canvas-${name}`,
        label: `Create canvas: ${name}`,
        type: "command",
        color: "#64D2FF",
        icon: GitBranch,
        hint: "Prefix create",
        action: () => {
          addCanvas(name);
          setView?.("canvas");
        },
      });
    }

    if (gotoMatch?.[2]?.trim()) {
      const targetQ = gotoMatch[2].trim().toLowerCase();
      const target = VIEW_ITEMS.find(
        (v) =>
          v.id.includes(targetQ) || v.label.toLowerCase().includes(targetQ),
      );
      if (target) {
        items.push({
          id: `goto-direct-${target.id}`,
          label: `Go to ${target.label}`,
          type: "command",
          color: target.color,
          icon: target.icon,
          hint: "Prefix navigation",
          action: () => setView?.(target.id),
        });
      }
    }

    app.notes
      .filter((n) => n.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((n) => {
        items.push({
          id: `note-${n.id}`,
          label: n.title || "Untitled note",
          type: "note",
          color: "#30D158",
          icon: FileText,
          hint: "Open in Notes",
          action: () => setView?.("notes"),
        });
      });

    app.tasks
      .filter((tk) => tk.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((tk) => {
        items.push({
          id: `task-${tk.id}`,
          label: tk.title,
          type: "task",
          color: "#FF9F0A",
          icon: CheckSquare,
          hint: "Open in Tasks",
          action: () => setView?.("tasks"),
        });
      });

    app.codes
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) => {
        items.push({
          id: `code-${c.id}`,
          label: c.name,
          type: "code",
          color: "#BF5AF2",
          icon: Code2,
          hint: "Open in Code",
          action: () => setView?.("code"),
        });
      });

    app.reminders
      .filter((r) => r.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((r) => {
        items.push({
          id: `rem-${r.id}`,
          label: r.title,
          type: "reminder",
          color: "#FF453A",
          icon: Bell,
          hint: "Open in Reminders",
          action: () => setView?.("reminders"),
        });
      });

    canvases
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((c) => {
        items.push({
          id: `canvas-${c.id}`,
          label: c.name,
          type: "canvas",
          color: "#64D2FF",
          icon: GitBranch,
          hint: "Open in Canvas",
          action: () => setView?.("canvas"),
        });
      });

    commands
      .filter((c) =>
        [c.label, c.hint || "", ...(c.keywords || [])]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 10)
      .forEach((c) => items.push(c));

    const deduped: CommandItem[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
    }

    return deduped.slice(0, 14);
  }, [search, app, addCanvas, commands, canvases, setView]);

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
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!list.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelIdx((p) => (p + 1) % list.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelIdx((p) => (p - 1 + list.length) % list.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        runItem(list[selIdx]);
      }
    },
    [list, selIdx, runItem],
  );

  const timeStr = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const panel = (
    <Suspense fallback={null}>
      <CommandPanel
        isBottom={isBottom}
        t={t}
        rgb={rgb}
        search={search}
        setSearch={setSearch}
        list={list}
        selIdx={selIdx}
        setSelIdx={setSelIdx}
        onClose={() => {
          setPanelOpen(false);
          setExpanded(false);
        }}
        onKeyDown={handleKey}
        inputRef={inputRef}
        setView={setView}
        onSelectItem={runItem}
        onTogglePin={togglePin}
        isPinned={isPinned}
        pinnedCommands={pinnedCommands}
        recentCommands={recentCommands}
      />
    </Suspense>
  );

  if (isSpotlight) {
    return (
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: isBottom ? "0 0 8px" : "8px 0 0",
          }}
        >
          <button
            onClick={() => {
              setPanelOpen(true);
              setExpanded(true);
            }}
            style={{
              border: `1px solid rgba(${rgb},0.3)`,
              background: `linear-gradient(135deg, rgba(${rgb},0.2), rgba(${rgb},0.08))`,
              color: t.accent,
              borderRadius: 12,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 8px 24px rgba(${rgb},0.25)`,
            }}
          >
            <Search size={14} /> Spotlight
            <span style={{ opacity: 0.65, fontWeight: 600 }}>Shift x2</span>
          </button>
        </div>

        <AnimatePresence>
          {panelOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 900,
                  background: "rgba(0,0,0,0.52)",
                  backdropFilter: "blur(7px)",
                }}
                onClick={() => {
                  setPanelOpen(false);
                  setExpanded(false);
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={
                  reducedMotion
                    ? { duration: 0.12 }
                    : { type: "spring", stiffness: 360, damping: 30 }
                }
                style={{
                  position: "fixed",
                  top: 80,
                  left: spotlightAnchorX,
                  transform: "translateX(-30%)",
                  width: "min(760px, 92vw)",
                  zIndex: 901,
                }}
              >
                {panel}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (isFullWidth) {
    return (
      <FullWidthToolbarLayout
        isBottom={isBottom}
        t={t}
        rgb={rgb}
        pendingTasks={pendingTasks}
        overdueReminders={overdueReminders}
        timeStr={timeStr}
        terminal={terminal}
        panelOpen={panelOpen}
        panel={panel}
        setPanelOpen={setPanelOpen}
        setExpanded={setExpanded}
        setView={setView}
      />
    );
  }

  return (
    <IslandToolbarLayout
      isBottom={isBottom}
      t={t}
      rgb={rgb}
      pendingTasks={pendingTasks}
      overdueReminders={overdueReminders}
      timeStr={timeStr}
      terminal={terminal}
      panelOpen={panelOpen}
      panel={panel}
      setPanelOpen={setPanelOpen}
      setExpanded={setExpanded}
      reducedMotion={reducedMotion}
      spotlightAnchorX={spotlightAnchorX}
      islandRef={islandRef}
      expanded={expanded}
      islandCompact={islandCompact}
      setView={setView}
    />
  );
}
