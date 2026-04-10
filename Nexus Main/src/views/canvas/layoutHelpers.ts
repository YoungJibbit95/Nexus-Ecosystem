import type { CanvasNode, CanvasNodeStatus } from "../../store/canvasStore";

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 0,
  mid: 1,
  high: 2,
  critical: 3,
};

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

export const laneForNode = (node: CanvasNode, index: number): CanvasNodeStatus => {
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
