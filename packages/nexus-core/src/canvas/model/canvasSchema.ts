import type { CanvasNodePriority, CanvasNodeStatus, CanvasNodeType } from "./canvasTypes";

export const CANVAS_SCHEMA_VERSION = 2;

export const CANVAS_ALLOWED_NODE_TYPES = [
  "text",
  "markdown",
  "checklist",
  "image",
  "code",
  "note",
  "codefile",
  "task",
  "reminder",
  "goal",
  "milestone",
  "decision",
  "risk",
  "project",
] as const satisfies readonly CanvasNodeType[];

export const CANVAS_ALLOWED_STATUSES = [
  "todo",
  "doing",
  "blocked",
  "done",
] as const satisfies readonly CanvasNodeStatus[];

export const CANVAS_ALLOWED_PRIORITIES = [
  "low",
  "mid",
  "high",
  "critical",
] as const satisfies readonly CanvasNodePriority[];

export const CANVAS_LIMITS = {
  minZoom: 0.15,
  maxZoom: 3,
  minNodeWidth: 120,
  maxNodeWidth: 1400,
  minNodeHeight: 80,
  maxNodeHeight: 1200,
  minNodeScale: 0.5,
  maxNodeScale: 2,
  worldMin: -500000,
  worldMax: 500000,
  maxNodes: 2000,
  maxConnections: 5000,
};
