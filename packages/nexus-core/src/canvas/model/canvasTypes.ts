export type CanvasNodeType =
  | "text"
  | "markdown"
  | "checklist"
  | "image"
  | "code"
  | "note"
  | "codefile"
  | "task"
  | "reminder"
  | "goal"
  | "milestone"
  | "decision"
  | "risk"
  | "project";

export type CanvasNodeStatus = "todo" | "doing" | "blocked" | "done";
export type CanvasNodePriority = "low" | "mid" | "high" | "critical";

export interface CanvasChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CanvasNodeModel {
  id: string;
  type: CanvasNodeType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeScale?: number;
  content: string;
  color?: string;
  items?: CanvasChecklistItem[];
  codeLang?: string;
  linkedNoteId?: string;
  linkedCodeId?: string;
  linkedTaskId?: string;
  linkedReminderId?: string;
  status?: CanvasNodeStatus;
  priority?: CanvasNodePriority;
  progress?: number;
  dueDate?: string;
  owner?: string;
  tags?: string[];
  effort?: number;
  lane?: string;
  icon?: string;
}

export interface CanvasConnectionModel {
  id: string;
  fromId: string;
  toId: string;
  color?: string;
  label?: string;
}

export interface CanvasModel {
  id: string;
  name: string;
  nodes: CanvasNodeModel[];
  connections: CanvasConnectionModel[];
  created: string;
  updated: string;
}

export interface CanvasViewportModel {
  panX: number;
  panY: number;
  zoom: number;
}

export interface CanvasSelectionModel {
  nodeIds: string[];
  connectionIds: string[];
}

export interface CanvasSnapshot {
  canvas: CanvasModel;
  viewport: CanvasViewportModel;
  selection: CanvasSelectionModel;
}

export interface CanvasCommandResult {
  canvas: CanvasModel;
  selection?: CanvasSelectionModel;
}
