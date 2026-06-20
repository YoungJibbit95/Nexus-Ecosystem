import type { CanvasNodeModel } from "../model/canvasTypes";

export const snapCanvasValue = (value: number, gridSize = 8) =>
  Math.round(value / gridSize) * gridSize;

export const snapCanvasNode = (
  node: CanvasNodeModel,
  gridSize = 8,
): CanvasNodeModel => ({
  ...node,
  x: snapCanvasValue(node.x, gridSize),
  y: snapCanvasValue(node.y, gridSize),
  width: Math.max(gridSize * 8, snapCanvasValue(node.width, gridSize)),
  height: Math.max(gridSize * 6, snapCanvasValue(node.height, gridSize)),
});

export const layoutCanvasNodesInGrid = (
  nodes: CanvasNodeModel[],
  columns = 3,
  gap = 48,
): CanvasNodeModel[] =>
  nodes.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...node,
      x: column * (node.width + gap),
      y: row * (node.height + gap),
    };
  });
