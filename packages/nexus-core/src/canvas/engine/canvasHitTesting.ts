import type { CanvasNodeModel, CanvasViewportModel } from "../model/canvasTypes";

export interface CanvasPoint {
  x: number;
  y: number;
}

export const screenToCanvasPoint = (
  point: CanvasPoint,
  viewport: CanvasViewportModel,
): CanvasPoint => ({
  x: (point.x - viewport.panX) / viewport.zoom,
  y: (point.y - viewport.panY) / viewport.zoom,
});

export const canvasToScreenPoint = (
  point: CanvasPoint,
  viewport: CanvasViewportModel,
): CanvasPoint => ({
  x: point.x * viewport.zoom + viewport.panX,
  y: point.y * viewport.zoom + viewport.panY,
});

export const hitTestCanvasNode = (node: CanvasNodeModel, point: CanvasPoint) =>
  point.x >= node.x &&
  point.x <= node.x + node.width &&
  point.y >= node.y &&
  point.y <= node.y + node.height;

export const getNodesInSelectionRect = (
  nodes: CanvasNodeModel[],
  rect: { x: number; y: number; width: number; height: number },
) => {
  const x1 = Math.min(rect.x, rect.x + rect.width);
  const x2 = Math.max(rect.x, rect.x + rect.width);
  const y1 = Math.min(rect.y, rect.y + rect.height);
  const y2 = Math.max(rect.y, rect.y + rect.height);

  return nodes.filter((node) => {
    const nodeX2 = node.x + node.width;
    const nodeY2 = node.y + node.height;
    return node.x <= x2 && nodeX2 >= x1 && node.y <= y2 && nodeY2 >= y1;
  });
};
