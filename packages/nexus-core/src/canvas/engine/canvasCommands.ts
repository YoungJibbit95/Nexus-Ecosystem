import { createCanvasNode } from "../model/canvasDefaults";
import type {
  CanvasCommandResult,
  CanvasConnectionModel,
  CanvasModel,
  CanvasNodeModel,
  CanvasNodeType,
} from "../model/canvasTypes";
import { CANVAS_LIMITS } from "../model/canvasSchema";

const now = () => new Date().toISOString();

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const touch = (canvas: CanvasModel, patch: Partial<CanvasModel>): CanvasModel => ({
  ...canvas,
  ...patch,
  updated: now(),
});

export const addCanvasNodeCommand = (
  canvas: CanvasModel,
  id: string,
  type: CanvasNodeType,
  x = 0,
  y = 0,
  partial: Partial<CanvasNodeModel> = {},
): CanvasCommandResult => {
  const node = createCanvasNode(id, type, x, y, partial);
  return {
    canvas: touch(canvas, { nodes: [...canvas.nodes, node] }),
    selection: { nodeIds: [node.id], connectionIds: [] },
  };
};

export const updateCanvasNodeCommand = (
  canvas: CanvasModel,
  nodeId: string,
  patch: Partial<CanvasNodeModel>,
): CanvasCommandResult => ({
  canvas: touch(canvas, {
    nodes: canvas.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...patch,
            width: patch.width === undefined ? node.width : clamp(patch.width, CANVAS_LIMITS.minNodeWidth, CANVAS_LIMITS.maxNodeWidth),
            height: patch.height === undefined ? node.height : clamp(patch.height, CANVAS_LIMITS.minNodeHeight, CANVAS_LIMITS.maxNodeHeight),
          }
        : node,
    ),
  }),
});

export const deleteCanvasNodeCommand = (
  canvas: CanvasModel,
  nodeId: string,
): CanvasCommandResult => ({
  canvas: touch(canvas, {
    nodes: canvas.nodes.filter((node) => node.id !== nodeId),
    connections: canvas.connections.filter(
      (connection) => connection.fromId !== nodeId && connection.toId !== nodeId,
    ),
  }),
  selection: { nodeIds: [], connectionIds: [] },
});

export const addCanvasConnectionCommand = (
  canvas: CanvasModel,
  connection: CanvasConnectionModel,
): CanvasCommandResult => {
  const duplicate = canvas.connections.some(
    (item) => item.fromId === connection.fromId && item.toId === connection.toId,
  );
  if (duplicate || connection.fromId === connection.toId) return { canvas };
  return {
    canvas: touch(canvas, { connections: [...canvas.connections, connection] }),
    selection: { nodeIds: [], connectionIds: [connection.id] },
  };
};

export const deleteCanvasConnectionCommand = (
  canvas: CanvasModel,
  connectionId: string,
): CanvasCommandResult => ({
  canvas: touch(canvas, {
    connections: canvas.connections.filter((connection) => connection.id !== connectionId),
  }),
  selection: { nodeIds: [], connectionIds: [] },
});
