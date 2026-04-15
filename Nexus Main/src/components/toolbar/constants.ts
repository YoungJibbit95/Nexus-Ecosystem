import {
  BarChart3,
  FileText,
  Code2,
  CheckSquare,
  Bell,
  GitBranch,
  HardDrive,
  Wrench,
  Settings,
  Sparkles,
  Info,
} from "lucide-react";

export const VIEW_ITEMS = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard", color: "#007AFF" },
  { id: "notes", icon: FileText, label: "Notes", color: "#30D158" },
  { id: "code", icon: Code2, label: "Code", color: "#BF5AF2" },
  { id: "tasks", icon: CheckSquare, label: "Tasks", color: "#FF9F0A" },
  { id: "reminders", icon: Bell, label: "Reminders", color: "#FF453A" },
  { id: "canvas", icon: GitBranch, label: "Canvas", color: "#64D2FF" },
  { id: "files", icon: HardDrive, label: "Files", color: "#5E5CE6" },
  { id: "devtools", icon: Wrench, label: "DevTools", color: "#FF6B35" },
  { id: "flux", icon: Sparkles, label: "Flux", color: "#B084FF" },
  { id: "settings", icon: Settings, label: "Settings", color: "#8E8E93" },
  { id: "info", icon: Info, label: "Info", color: "#64D2FF" },
] as const;

export type ViewId = (typeof VIEW_ITEMS)[number]["id"];

export const SPOTLIGHT_PINS_KEY = "nx-spotlight-pins-v1";
export const SPOTLIGHT_RECENTS_KEY = "nx-spotlight-recents-v1";

export const parseStoredList = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
};
