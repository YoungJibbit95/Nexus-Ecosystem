import type {
  CanvasModel,
  CanvasNodeModel,
  CanvasNodeType,
  CanvasViewportModel,
} from "./canvasTypes";

export const CANVAS_NODE_SIZES: Record<CanvasNodeType, { width: number; height: number }> = {
  text: { width: 260, height: 160 },
  markdown: { width: 320, height: 240 },
  checklist: { width: 260, height: 200 },
  image: { width: 300, height: 260 },
  code: { width: 360, height: 240 },
  note: { width: 360, height: 280 },
  codefile: { width: 400, height: 320 },
  task: { width: 280, height: 220 },
  reminder: { width: 280, height: 180 },
  goal: { width: 320, height: 230 },
  milestone: { width: 320, height: 220 },
  decision: { width: 320, height: 230 },
  risk: { width: 320, height: 230 },
  project: { width: 380, height: 260 },
};

export const CANVAS_NODE_TITLES: Record<CanvasNodeType, string> = {
  text: "Text",
  markdown: "Markdown",
  checklist: "Checklist",
  image: "Image",
  code: "Code",
  note: "Notiz",
  codefile: "Code-Datei",
  task: "Task",
  reminder: "Reminder",
  goal: "Goal",
  milestone: "Milestone",
  decision: "Decision",
  risk: "Risk",
  project: "Project",
};

export const CANVAS_NODE_COLORS: Record<CanvasNodeType, string> = {
  text: "#5B8CFF",
  markdown: "#7D6BFF",
  checklist: "#30D158",
  image: "#64D2FF",
  code: "#4E8BFF",
  note: "#58C4FF",
  codefile: "#1A7BFF",
  task: "#32D74B",
  reminder: "#FF9F0A",
  goal: "#FFD60A",
  milestone: "#FF6B35",
  decision: "#AF52DE",
  risk: "#FF453A",
  project: "#00C7BE",
};

export const DEFAULT_CANVAS_VIEWPORT: CanvasViewportModel = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

const now = () => new Date().toISOString();

export const createCanvasNode = (
  id: string,
  type: CanvasNodeType,
  x = 0,
  y = 0,
  partial: Partial<CanvasNodeModel> = {},
): CanvasNodeModel => {
  const size = CANVAS_NODE_SIZES[type];
  return {
    id,
    type,
    title: CANVAS_NODE_TITLES[type],
    x,
    y,
    width: size.width,
    height: size.height,
    content: "",
    color: CANVAS_NODE_COLORS[type],
    ...partial,
  };
};

export const createCanvas = (
  id: string,
  name = "Canvas",
  partial: Partial<CanvasModel> = {},
): CanvasModel => {
  const timestamp = now();
  return {
    id,
    name,
    nodes: [],
    connections: [],
    created: timestamp,
    updated: timestamp,
    ...partial,
  };
};
