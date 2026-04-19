import type { CanvasNode, CanvasNodeStatus } from "../../store/canvasStore";
import { BOARD_LANES } from "./constants";
import { laneForNode, timelineSortKey } from "./layoutHelpers";

export type CanvasLayoutMode = "mindmap" | "timeline" | "board";

export type CanvasLayoutGuides =
  | null
  | {
      type: "timeline";
      points: Array<{ id: string; x: number; y: number; label: string }>;
      axisY: number;
    }
  | {
      type: "board";
      lanes: Array<{
        id: CanvasNodeStatus;
        label: string;
        color: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    };

export const applyCanvasAutoLayout = ({
  mode,
  nodes,
  moveNode,
}: {
  mode: CanvasLayoutMode;
  nodes: CanvasNode[];
  moveNode: (id: string, x: number, y: number) => void;
}) => {
  if (nodes.length <= 1) return;

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));

  if (mode === "timeline") {
    const ordered = nodes
      .map((node, index) => ({ node, index }))
      .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
      .map((entry) => entry.node);
    const startX = minX + 80;
    const baseY = minY + 80;
    ordered.forEach((n, i) => {
      const stepX = startX + i * 320;
      const stepY = baseY + (i % 2 === 0 ? 0 : 115);
      moveNode(n.id, stepX, stepY);
    });
    return;
  }

  if (mode === "board") {
    const laneIndexById = new globalThis.Map(
      BOARD_LANES.map((lane, index) => [lane.id, index] as const),
    );
    const buckets = BOARD_LANES.reduce(
      (acc, lane) => {
        acc[lane.id] = [];
        return acc;
      },
      {} as Record<CanvasNodeStatus, CanvasNode[]>,
    );

    nodes.forEach((n, i) => {
      const lane = laneForNode(n, i);
      buckets[lane].push(n);
    });

    BOARD_LANES.forEach((lane) => {
      const laneNodes = buckets[lane.id];
      const laneIndex = laneIndexById.get(lane.id) || 0;
      laneNodes.forEach((n, i) => {
        moveNode(n.id, minX + laneIndex * 340, minY + i * 240 + 72);
      });
    });
    return;
  }

  const root = nodes[0];
  const others = nodes.slice(1);
  const radius = Math.max(240, others.length * 40);
  others.forEach((n, i) => {
    const angle = (Math.PI * 2 * i) / Math.max(others.length, 1);
    const x = root.x + Math.cos(angle) * radius;
    const y = root.y + Math.sin(angle) * Math.max(180, radius * 0.62);
    moveNode(n.id, x, y);
  });
};

export const buildCanvasLayoutGuides = ({
  nodes,
  layoutMode,
}: {
  nodes: CanvasNode[];
  layoutMode: CanvasLayoutMode;
}): CanvasLayoutGuides => {
  if (nodes.length === 0 || layoutMode === "mindmap") {
    return null;
  }

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));

  if (layoutMode === "timeline") {
    const ordered = nodes
      .map((node, index) => ({ node, index }))
      .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
      .map((entry) => entry.node);
    const points = ordered.map((node, index) => ({
      id: node.id,
      x: minX + 120 + index * 320,
      y: minY + 24 + (index % 2 === 0 ? 0 : 115),
      label: node.title || `Step ${index + 1}`,
    }));
    return { type: "timeline", points, axisY: minY + 70 };
  }

  return {
    type: "board",
    lanes: BOARD_LANES.map((lane, laneIndex) => ({
      id: lane.id,
      label: lane.label,
      color: lane.color,
      x: minX + laneIndex * 340 - 16,
      y: minY + 20,
      width: 316,
      height: Math.max(300, maxY - minY + 260),
    })),
  };
};
