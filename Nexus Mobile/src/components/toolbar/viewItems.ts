import {
  BarChart3,
  Bell,
  CheckSquare,
  Code2,
  FileText,
  GitBranch,
  HardDrive,
  Info,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";

export const MOBILE_TOOLBAR_VIEW_ITEMS = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard", color: "#007AFF" },
  { id: "notes", icon: FileText, label: "Notes", color: "#30D158" },
  { id: "code", icon: Code2, label: "Code", color: "#BF5AF2" },
  { id: "tasks", icon: CheckSquare, label: "Tasks", color: "#FF9F0A" },
  { id: "reminders", icon: Bell, label: "Reminders", color: "#FF453A" },
  { id: "canvas", icon: GitBranch, label: "Canvas", color: "#64D2FF" },
  { id: "files", icon: HardDrive, label: "Files", color: "#5E5CE6" },
  { id: "devtools", icon: Wrench, label: "DevTools", color: "#FF6B35" },
  { id: "flux", icon: Sparkles, label: "Flux", color: "#B084FF" },
  { id: "settings", icon: Settings, label: "Settings", color: "#888888" },
  { id: "info", icon: Info, label: "Info", color: "#64D2FF" },
] as const;

export type MobileToolbarViewItem = (typeof MOBILE_TOOLBAR_VIEW_ITEMS)[number];
