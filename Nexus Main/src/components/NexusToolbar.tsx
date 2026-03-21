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

  const toolbarMode = t.toolbar?.toolbarMode ?? "island";
  const isSpotlight = toolbarMode === "spotlight" || !!forceSpotlight;
  const isFullWidth = toolbarMode === "full-width";
  const isBottom = (t.toolbar?.position ?? "bottom") === "bottom";
  const reducedMotion = t.qol?.reducedMotion ?? false;
  const spotlightAnchorX = "30%";

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
      <div style={{ position: "relative", width: "100%" }}>
        <Glass
          type="modal"
          style={{
            width: "100%",
            height: t.toolbar?.height ?? 44,
            borderRadius: 0,
            borderTop: isBottom
              ? "1px solid rgba(255,255,255,0.08)"
              : undefined,
            borderBottom: !isBottom
              ? "1px solid rgba(255,255,255,0.08)"
              : undefined,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 12px",
          }}
        >
          <DockLogo t={t} rgb={rgb} compact />
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(255,255,255,0.1)",
              margin: "0 6px",
            }}
          />

          <div
            className="nx-toolbar-view-rail"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              maxWidth: "52vw",
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 2,
            }}
          >
            {VIEW_ITEMS.map((item) => {
              const itemRgb = hexToRgb(item.color);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView?.(item.id)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "5px 9px",
                    background: "transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    color: "inherit",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `rgba(${itemRgb},0.16)`;
                    e.currentTarget.style.color = item.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "inherit";
                  }}
                >
                  <Icon size={12} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          <StatusPill
            label="Tasks"
            value={pendingTasks}
            color={pendingTasks ? "#ff9f0a" : undefined}
          />
          <StatusPill
            label="Due"
            value={overdueReminders}
            color={overdueReminders ? "#ff453a" : undefined}
          />
          <StatusPill label="Time" value={timeStr} color={t.accent} mono />

          <button
            onClick={() => terminal.setOpen(!terminal.isOpen)}
            style={{
              border: `1px solid ${terminal.isOpen ? `rgba(${rgb},0.28)` : "rgba(255,255,255,0.09)"}`,
              background: terminal.isOpen
                ? `rgba(${rgb},0.15)`
                : "rgba(255,255,255,0.05)",
              borderRadius: 8,
              cursor: "pointer",
              color: terminal.isOpen ? t.accent : "inherit",
              padding: "5px 9px",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Terminal size={12} /> Terminal
          </button>
          <button
            onClick={() => {
              setPanelOpen(true);
              setExpanded(true);
            }}
            style={{
              border: `1px solid rgba(${rgb},0.3)`,
              background: `rgba(${rgb},0.12)`,
              color: t.accent,
              borderRadius: 8,
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Search size={12} /> Search
          </button>
        </Glass>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                position: "absolute",
                right: 14,
                bottom: isBottom ? "calc(100% + 8px)" : undefined,
                top: !isBottom ? "calc(100% + 8px)" : undefined,
                width: "min(680px, 94vw)",
                zIndex: 910,
              }}
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: isBottom ? "0 0 10px" : "10px 0 0",
      }}
    >
      <motion.div
        animate={{
          width: expanded ? "min(1060px, 96vw)" : "min(500px, 94vw)",
          height: expanded ? 74 : 56,
        }}
        transition={
          reducedMotion
            ? { duration: 0.12 }
            : { type: "spring", stiffness: 300, damping: 32, mass: 0.9 }
        }
        style={{
          position: "relative",
          animation:
            expanded && !reducedMotion
              ? "nexus-dock-breathe 3.8s ease-in-out infinite"
              : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: expanded ? -10 : -6,
            borderRadius: expanded ? 34 : 28,
            background: `conic-gradient(from 0deg, ${t.accent}, ${t.accent2}, ${t.accent})`,
            filter: `blur(${expanded ? 24 : 16}px)`,
            opacity: expanded ? 0.55 : 0.28,
            animation: reducedMotion
              ? undefined
              : "nexus-gradient-shift 8s ease infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: expanded ? -2 : 0,
            borderRadius: expanded ? 28 : 22,
            border: `1px solid rgba(${rgb},${expanded ? 0.5 : 0.3})`,
            boxShadow: `0 0 ${expanded ? 28 : 14}px rgba(${rgb},${expanded ? 0.35 : 0.2})`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 90,
            borderRadius: 999,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
            mixBlendMode: "screen",
            pointerEvents: "none",
            animation: reducedMotion
              ? undefined
              : "nexus-shine-sweep 4.8s ease-in-out infinite",
          }}
        />

        <Glass
          type="modal"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: expanded ? 26 : 22,
            display: "flex",
            alignItems: "center",
            padding: expanded ? "0 14px" : "0 14px",
            gap: expanded ? 10 : 8,
            overflow: "hidden",
            border: `1px solid rgba(${rgb},${expanded ? 0.22 : 0.14})`,
            background: t.mode === "dark"
              ? "linear-gradient(135deg, rgba(12,14,22,0.86), rgba(18,20,32,0.72))"
              : "linear-gradient(135deg, rgba(255,255,255,0.86), rgba(242,246,255,0.78))",
          }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => {
            if (!panelOpen) setExpanded(false);
          }}
        >
          <DockLogo t={t} rgb={rgb} compact={!expanded} />

          {!expanded && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Nexus Island
                </span>
                <span style={{ fontSize: 10, opacity: 0.55 }}>⌘K</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusPill
                  label="Tasks"
                  value={pendingTasks}
                  color={pendingTasks ? "#ff9f0a" : undefined}
                />
                <StatusPill
                  label="Due"
                  value={overdueReminders}
                  color={overdueReminders ? "#ff453a" : undefined}
                />
                <span style={{ fontSize: 10, opacity: 0.55, fontFamily: "monospace" }}>
                  {timeStr}
                </span>
              </div>
            </div>
          )}

          {expanded && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "hidden",
                    paddingBottom: 2,
                  }}
                  className="nx-toolbar-view-rail"
                >
                  {VIEW_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const iRgb = hexToRgb(item.color);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setView?.(item.id)}
                        title={item.label}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                          border: "none",
                          borderRadius: 10,
                          background: "transparent",
                          padding: "6px 9px",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "inherit",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `rgba(${iRgb},0.16)`;
                          e.currentTarget.style.color = item.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "inherit";
                        }}
                      >
                        <Icon size={13} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  <StatusPill
                    label="Tasks"
                    value={pendingTasks}
                    color={pendingTasks ? "#ff9f0a" : undefined}
                  />
                  <StatusPill
                    label="Due"
                    value={overdueReminders}
                    color={overdueReminders ? "#ff453a" : undefined}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      opacity: 0.55,
                      fontFamily: "monospace",
                    }}
                  >
                    {timeStr}
                  </span>
                </div>
              </div>

              <button
                onClick={() => terminal.setOpen(!terminal.isOpen)}
                style={{
                  border: `1px solid ${terminal.isOpen ? `rgba(${rgb},0.35)` : "rgba(255,255,255,0.09)"}`,
                  borderRadius: 11,
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: terminal.isOpen ? t.accent : "inherit",
                  background: terminal.isOpen
                    ? `rgba(${rgb},0.2)`
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <Terminal
                  size={16}
                  style={{ opacity: terminal.isOpen ? 1 : 0.56 }}
                />
              </button>
              <button
                onClick={() => {
                  setPanelOpen(true);
                  setExpanded(true);
                }}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 11,
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "inherit",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <Search size={16} style={{ opacity: 0.62 }} />
              </button>
            </>
          )}
        </Glass>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={
                reducedMotion
                  ? { duration: 0.12 }
                  : { type: "spring", stiffness: 340, damping: 30 }
              }
              style={{
                position: "absolute",
                left: spotlightAnchorX,
                transform: "translateX(-30%)",
                top: isBottom ? undefined : "calc(100% + 12px)",
                bottom: isBottom ? "calc(100% + 12px)" : undefined,
                width: "min(700px, 92vw)",
                zIndex: 920,
              }}
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
