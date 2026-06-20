import type { CanvasConnectionModel, CanvasNodeModel } from "../model/canvasTypes";

export const canConnectCanvasNodes = (
  fromId: string,
  toId: string,
  connections: CanvasConnectionModel[],
) =>
  fromId !== toId &&
  !connections.some((connection) => connection.fromId === fromId && connection.toId === toId);

export const getCanvasConnectionPath = (
  from: CanvasNodeModel,
  to: CanvasNodeModel,
) => {
  const startX = from.x + from.width;
  const startY = from.y + from.height / 2;
  const endX = to.x;
  const endY = to.y + to.height / 2;
  const controlOffset = Math.max(80, Math.abs(endX - startX) * 0.45);
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
};
