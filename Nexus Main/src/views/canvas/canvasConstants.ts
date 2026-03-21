import {
  AlertCircle,
  Bell,
  CheckSquare,
  Code,
  FileText,
  Flag,
  GitBranch,
  Image,
  StickyNote,
  Sun,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CanvasNode, CanvasNodeStatus, NodeType } from "../../store/canvasStore";

export type CanvasWidgetType = NodeType | "sticky";
export type CanvasLayoutMode = "mindmap" | "timeline" | "board";

export const NODE_COLORS = [
  "#007AFF",
  "#FF3B30",
  "#34C759",
  "#FF9500",
  "#AF52DE",
  "#00C7BE",
  "#FF2D55",
  "#5856D6",
  "#FFCC00",
  "#64D2FF",
  "#FF6B35",
  "#30D158",
  "#BF5AF2",
  "#FF6B9E",
  "#FFE600",
] as const;

export const WIDGET_TYPES: Array<{
  type: CanvasWidgetType;
  icon: LucideIcon;
  label: string;
}> = [
  { type: "text", icon: Type, label: "Text" },
  { type: "markdown", icon: FileText, label: "Markdown" },
  { type: "checklist", icon: CheckSquare, label: "Checklist" },
  { type: "image", icon: Image, label: "Bild" },
  { type: "code", icon: Code, label: "Code" },
  { type: "sticky", icon: StickyNote, label: "Sticky" },
  { type: "note", icon: FileText, label: "Notiz" },
  { type: "codefile", icon: Code, label: "Code-Datei" },
  { type: "task", icon: CheckSquare, label: "Aufgabe" },
  { type: "reminder", icon: Bell, label: "Reminder" },
  { type: "project", icon: FileText, label: "Projekt" },
  { type: "goal", icon: Sun, label: "Goal" },
  { type: "milestone", icon: Flag, label: "Milestone" },
  { type: "decision", icon: GitBranch, label: "Decision" },
  { type: "risk", icon: AlertCircle, label: "Risk" },
];

export const QUICK_WIDGET_TYPES: CanvasWidgetType[] = [
  "text",
  "markdown",
  "checklist",
  "task",
  "note",
  "project",
  "sticky",
];

export const BOARD_LANES: Array<{
  id: CanvasNodeStatus;
  label: string;
  color: string;
}> = [
  { id: "todo", label: "To Do", color: "#8E8E93" },
  { id: "doing", label: "Doing", color: "#0A84FF" },
  { id: "blocked", label: "Blocked", color: "#FF453A" },
  { id: "done", label: "Done", color: "#30D158" },
];

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 0,
  mid: 1,
  high: 2,
  critical: 3,
};

export const CANVAS_NODE_OVERSCAN_PX = 680;
export const CANVAS_NODE_OVERSCAN_MAX_PX = 2200;

export const parseDueDateTs = (value?: string) => {
  if (!value) return 9e15;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 9e15;
};

export const timelineSortKey = (node: CanvasNode, index: number) => {
  const dueScore = parseDueDateTs(node.dueDate);
  const statusScore =
    node.status === "done"
      ? 3
      : node.status === "blocked"
        ? 2
        : node.status === "doing"
          ? 1
          : 0;
  const prioScore = PRIORITY_WEIGHT[node.priority || "mid"] ?? 1;
  return dueScore * 10 + statusScore * 2 - prioScore + index * 0.0001;
};

export const laneForNode = (
  node: CanvasNode,
  index: number,
): CanvasNodeStatus => {
  if (node.status) return node.status;
  if (typeof node.progress === "number") {
    if (node.progress >= 100) return "done";
    if (node.progress >= 20) return "doing";
  }
  if (node.type === "risk") return "blocked";
  if (node.type === "milestone" || node.type === "task") return "doing";
  if (node.type === "goal" || node.type === "project") return "doing";
  const fallback: CanvasNodeStatus[] = ["todo", "doing", "blocked", "done"];
  return fallback[index % fallback.length];
};
