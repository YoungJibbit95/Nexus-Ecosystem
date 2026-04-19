import { type CanvasNodeStatus } from "../../../../store/canvasStore";

export type BoardLane = {
  id: CanvasNodeStatus;
  label: string;
  color: string;
};
