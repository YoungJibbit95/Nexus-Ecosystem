import { createCanvas, createCanvasNode } from "../model/canvasDefaults";
import type { CanvasModel } from "../model/canvasTypes";

export type CanvasTemplateId =
  | "project-board"
  | "mind-map"
  | "roadmap"
  | "decision-map"
  | "task-planning";

export const createCanvasTemplate = (
  id: CanvasTemplateId,
  canvasId: string,
): CanvasModel => {
  const canvas = createCanvas(canvasId, {
    "project-board": "Project Board",
    "mind-map": "Mind Map",
    roadmap: "Roadmap",
    "decision-map": "Decision Map",
    "task-planning": "Task Planning",
  }[id]);

  if (id === "mind-map") {
    return {
      ...canvas,
      nodes: [
        createCanvasNode(`${canvasId}-center`, "text", 0, 0, { title: "Central Idea" }),
        createCanvasNode(`${canvasId}-branch-1`, "markdown", 380, -140, { title: "Branch" }),
        createCanvasNode(`${canvasId}-branch-2`, "markdown", 380, 180, { title: "Branch" }),
      ],
    };
  }

  return {
    ...canvas,
    nodes: [
      createCanvasNode(`${canvasId}-todo`, "task", 0, 0, { title: "To do" }),
      createCanvasNode(`${canvasId}-doing`, "task", 340, 0, { title: "Doing" }),
      createCanvasNode(`${canvasId}-done`, "task", 680, 0, { title: "Done" }),
    ],
  };
};
