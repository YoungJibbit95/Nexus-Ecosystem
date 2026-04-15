import {
  Bell,
  CheckSquare,
  Code2,
  FileText,
  GitBranch,
  Moon,
  Palette,
  PanelLeft,
  PanelRight,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";
import { createCaptureIntent, parseCaptureIntentFromQuery, type CaptureIntent } from "@nexus/core";
import { PRESETS } from "../../store/themeStore";
import { VIEW_ITEMS } from "./constants";
import type { CommandItem } from "./types";

type ThemeLike = {
  accent: string;
  accent2: string;
  mode: "dark" | "light";
  qol: { reducedMotion: boolean };
  sidebarPosition: "left" | "right";
  setMode: (mode: "dark" | "light") => void;
  setQOL: (patch: { reducedMotion?: boolean }) => void;
  setToolbar: (patch: { toolbarMode: "spotlight" | "island" | "full-width" }) => void;
  setSidebarPosition: (position: "left" | "right") => void;
  preset: (name: string) => void;
};

type TerminalLike = {
  isOpen: boolean;
  setOpen: (value: boolean) => void;
};

type ToolbarAppLike = {
  notes: Array<any>;
  tasks: Array<any>;
  codes: Array<any>;
  reminders: Array<any>;
  addNote: () => void;
  addTask: (title?: string, status?: string) => void;
  addRem: (payload: { title: string; msg: string; datetime: string; repeat: string }) => void;
  addCode: (name?: string, language?: string) => void;
};

type BuildToolbarCommandsInput = {
  t: ThemeLike;
  terminal: TerminalLike;
  app: ToolbarAppLike;
  canvases: Array<any>;
  addCanvas: (name?: string) => void;
  runCaptureIntent: (intent: CaptureIntent) => void;
  setView?: (view: any) => void;
};

export function buildToolbarCommands({
  t,
  terminal,
  app,
  canvases,
  addCanvas,
  runCaptureIntent,
  setView,
}: BuildToolbarCommandsInput): CommandItem[] {
  return [
    {
      id: "new-note",
      label: "New note",
      type: "command",
      color: "#30D158",
      icon: FileText,
      hint: "Create a blank note",
      keywords: ["create", "new", "note", "quick"],
      action: () => {
        runCaptureIntent(createCaptureIntent("note", { title: "Quick Note", targetView: "notes" }));
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
        runCaptureIntent(createCaptureIntent("task", { title: "Quick Task", targetView: "tasks" }));
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
        runCaptureIntent(createCaptureIntent("reminder", { title: "Quick Reminder", targetView: "reminders" }));
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
      label: t.mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
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
        runCaptureIntent(createCaptureIntent("canvas", { title: "Neue Idee", targetView: "canvas" }));
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
        if (!canvases.length) addCanvas("Mindmap");
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
        if (!canvases.length) addCanvas("Roadmap");
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
        if (!canvases.length) addCanvas("AI Project");
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
  ];
}

type BuildToolbarSuggestionsInput = {
  search: string;
  commands: CommandItem[];
  app: ToolbarAppLike;
  canvases: Array<any>;
  setView?: (view: any) => void;
  runCaptureIntent: (intent: CaptureIntent) => void;
  runTerminalCommand: (command: string) => void;
};

export function buildToolbarSuggestions({
  search,
  commands,
  app,
  canvases,
  setView,
  runCaptureIntent,
  runTerminalCommand,
}: BuildToolbarSuggestionsInput) {
  const raw = search.trim();
  if (!raw) return [] as CommandItem[];
  const q = raw.toLowerCase();
  const items: CommandItem[] = [];

  const gotoMatch = raw.match(/^(goto:|view:)\s*(.+)$/i);
  const terminalMatch = raw.match(/^(>|cmd:|term:)\s*(.+)$/i);
  const captureIntent = parseCaptureIntentFromQuery(raw);
  if (captureIntent) {
    const captureLabel = captureIntent.title?.trim() || "Quick Capture";
    const iconByType = {
      note: FileText,
      task: CheckSquare,
      reminder: Bell,
      code: Code2,
      canvas: GitBranch,
    } as const;
    const colorByType = {
      note: "#30D158",
      task: "#FF9F0A",
      reminder: "#FF453A",
      code: "#BF5AF2",
      canvas: "#64D2FF",
    } as const;
    items.push({
      id: `capture-${captureIntent.type}-${captureLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: `Capture ${captureIntent.type}: ${captureLabel}`,
      type: "command",
      color: colorByType[captureIntent.type],
      icon: iconByType[captureIntent.type],
      hint: "Shared capture intent",
      action: () => runCaptureIntent(captureIntent),
    });
  }

  if (gotoMatch?.[2]?.trim()) {
    const targetQ = gotoMatch[2].trim().toLowerCase();
    const target = VIEW_ITEMS.find(
      (view) => view.id.includes(targetQ) || view.label.toLowerCase().includes(targetQ),
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

  if (terminalMatch?.[2]?.trim()) {
    const terminalCommand = terminalMatch[2].trim();
    const terminalCommandId =
      terminalCommand
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 48) || "run";
    items.push({
      id: `terminal-cmd-${terminalCommandId}`,
      label: `Run terminal: ${terminalCommand}`,
      type: "command",
      color: "#64D2FF",
      icon: Terminal,
      hint: "Execute Nexus terminal command",
      action: () => runTerminalCommand(terminalCommand),
    });
  }

  app.notes
    .filter((note) => note.title.toLowerCase().includes(q))
    .slice(0, 4)
    .forEach((note) => {
      items.push({
        id: `note-${note.id}`,
        label: note.title || "Untitled note",
        type: "note",
        color: "#30D158",
        icon: FileText,
        hint: "Open in Notes",
        action: () => setView?.("notes"),
      });
    });

  app.tasks
    .filter((task) => task.title.toLowerCase().includes(q))
    .slice(0, 4)
    .forEach((task) => {
      items.push({
        id: `task-${task.id}`,
        label: task.title,
        type: "task",
        color: "#FF9F0A",
        icon: CheckSquare,
        hint: "Open in Tasks",
        action: () => setView?.("tasks"),
      });
    });

  app.codes
    .filter((code) => code.name.toLowerCase().includes(q))
    .slice(0, 4)
    .forEach((code) => {
      items.push({
        id: `code-${code.id}`,
        label: code.name,
        type: "code",
        color: "#BF5AF2",
        icon: Code2,
        hint: "Open in Code",
        action: () => setView?.("code"),
      });
    });

  app.reminders
    .filter((reminder) => reminder.title.toLowerCase().includes(q))
    .slice(0, 4)
    .forEach((reminder) => {
      items.push({
        id: `rem-${reminder.id}`,
        label: reminder.title,
        type: "reminder",
        color: "#FF453A",
        icon: Bell,
        hint: "Open in Reminders",
        action: () => setView?.("reminders"),
      });
    });

  canvases
    .filter((canvas) => canvas.name.toLowerCase().includes(q))
    .slice(0, 3)
    .forEach((canvas) => {
      items.push({
        id: `canvas-${canvas.id}`,
        label: canvas.name,
        type: "canvas",
        color: "#64D2FF",
        icon: GitBranch,
        hint: "Open in Canvas",
        action: () => setView?.("canvas"),
      });
    });

  commands
    .filter((command) =>
      [command.label, command.hint || "", ...(command.keywords || [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
    .slice(0, 10)
    .forEach((command) => items.push(command));

  const deduped: CommandItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped.slice(0, 14);
}
