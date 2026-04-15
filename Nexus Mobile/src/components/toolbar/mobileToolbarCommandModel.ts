import {
  Bell,
  CheckSquare,
  Code2,
  FileText,
  Moon,
  Settings,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useApp, type CodeFile, type Note, type Reminder, type Task } from "../../store/appStore";
import { MOBILE_TOOLBAR_VIEW_ITEMS } from "./viewItems";

type SetView = ((view: any) => void) | undefined;

export type MobileToolbarCommand = {
  id: string;
  label: string;
  icon: any;
  action: () => void;
};

export type MobileToolbarSuggestion = {
  type: "note" | "task" | "code" | "reminder" | "command";
  title: string;
  icon: any;
  color: string;
  action: () => void;
};

type ThemeLike = {
  accent: string;
  mode: "dark" | "light";
  preset: (name: string) => void;
  setMode: (mode: "dark" | "light") => void;
};

type BuildCommandsInput = {
  setView: SetView;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  theme: ThemeLike;
};

export function buildMobileToolbarCommands({
  setView,
  terminalOpen,
  setTerminalOpen,
  theme,
}: BuildCommandsInput): MobileToolbarCommand[] {
  return [
    {
      id: "new-note",
      label: "New Note",
      icon: FileText,
      action: () => {
        useApp.getState().addNote();
        setView?.("notes");
      },
    },
    {
      id: "new-task",
      label: "New Task",
      icon: CheckSquare,
      action: () => {
        useApp.getState().addTask("Neue Aufgabe", "todo", "", "mid");
        setView?.("tasks");
      },
    },
    {
      id: "new-reminder",
      label: "New Reminder (+1h)",
      icon: Bell,
      action: () => {
        useApp.getState().addRem({
          title: "Neue Erinnerung",
          msg: "",
          datetime: new Date(Date.now() + 3600000).toISOString(),
          repeat: "none",
        });
        setView?.("reminders");
      },
    },
    {
      id: "new-code",
      label: "New Code File",
      icon: Code2,
      action: () => {
        useApp.getState().addCode("untitled.ts", "typescript");
        setView?.("code");
      },
    },
    {
      id: "toggle-term",
      label: "Toggle Terminal",
      icon: Terminal,
      action: () => setTerminalOpen(!terminalOpen),
    },
    {
      id: "dark-mode",
      label: "Toggle Dark/Light",
      icon: Moon,
      action: () => theme.setMode(theme.mode === "dark" ? "light" : "dark"),
    },
    {
      id: "preset-mac",
      label: "Preset: macOS Dark",
      icon: Sparkles,
      action: () => theme.preset("macOS Dark"),
    },
    {
      id: "preset-ocean",
      label: "Preset: Ocean Wave",
      icon: Sparkles,
      action: () => theme.preset("Ocean Wave"),
    },
    {
      id: "preset-void",
      label: "Preset: Void",
      icon: Sparkles,
      action: () => theme.preset("Void"),
    },
    {
      id: "settings",
      label: "Open Settings",
      icon: Settings,
      action: () => setView?.("settings"),
    },
    ...MOBILE_TOOLBAR_VIEW_ITEMS.map((viewItem) => ({
      id: `go-${viewItem.id}`,
      label: `Go to ${viewItem.label}`,
      icon: viewItem.icon,
      action: () => setView?.(viewItem.id),
    })),
  ];
}

type BuildSuggestionsInput = {
  search: string;
  notes: Note[];
  tasks: Task[];
  codes: CodeFile[];
  reminders: Reminder[];
  commands: MobileToolbarCommand[];
  setView: SetView;
  accent: string;
  runTerminalCommand: (command: string) => void;
};

export function buildMobileToolbarSuggestions({
  search,
  notes,
  tasks,
  codes,
  reminders,
  commands,
  setView,
  accent,
  runTerminalCommand,
}: BuildSuggestionsInput): MobileToolbarSuggestion[] {
  if (!search.trim()) return [];

  const query = search.toLowerCase();
  const results: MobileToolbarSuggestion[] = [];
  const terminalMatch = search.match(/^(>|cmd:|term:)\s*(.+)$/i);

  if (terminalMatch?.[2]?.trim()) {
    const terminalCommand = terminalMatch[2].trim();
    results.push({
      type: "command",
      title: `Run terminal: ${terminalCommand}`,
      icon: Terminal,
      color: "#64D2FF",
      action: () => runTerminalCommand(terminalCommand),
    });
  }

  notes.forEach((note) => {
    if (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      (note.tags || []).some((tag) => tag.toLowerCase().includes(query))
    ) {
      results.push({
        type: "note",
        title: note.title || "Untitled",
        icon: FileText,
        color: "#30D158",
        action: () => setView?.("notes"),
      });
    }
  });

  tasks.forEach((task) => {
    if (
      task.title.toLowerCase().includes(query) ||
      (task.desc || "").toLowerCase().includes(query)
    ) {
      results.push({
        type: "task",
        title: task.title,
        icon: CheckSquare,
        color: "#FF9F0A",
        action: () => setView?.("tasks"),
      });
    }
  });

  codes.forEach((codeFile) => {
    if (codeFile.name.toLowerCase().includes(query)) {
      results.push({
        type: "code",
        title: codeFile.name,
        icon: Code2,
        color: "#BF5AF2",
        action: () => setView?.("code"),
      });
    }
  });

  reminders.forEach((reminder) => {
    if (reminder.title.toLowerCase().includes(query)) {
      results.push({
        type: "reminder",
        title: reminder.title,
        icon: Bell,
        color: "#FF453A",
        action: () => setView?.("reminders"),
      });
    }
  });

  commands
    .filter((command) => command.label.toLowerCase().includes(query))
    .forEach((command) => {
      results.push({
        type: "command",
        title: command.label,
        icon: command.icon,
        color: accent,
        action: command.action,
      });
    });

  return results.slice(0, 8);
}
