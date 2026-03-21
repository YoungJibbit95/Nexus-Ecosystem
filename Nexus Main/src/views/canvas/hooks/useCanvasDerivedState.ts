import { useMemo } from "react";
import type {
  Canvas,
  CanvasConnection,
  CanvasNode,
  CanvasNodeStatus,
  Viewport,
} from "../../../store/canvasStore";
import {
  BOARD_LANES,
  CANVAS_NODE_OVERSCAN_MAX_PX,
  CANVAS_NODE_OVERSCAN_PX,
  type CanvasLayoutMode,
  parseDueDateTs,
  timelineSortKey,
} from "../canvasConstants";

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

export function useCanvasDerivedState({
  canvas,
  selectedNodeId,
  pmStatusFilter,
  focusNodeOnly,
  viewport,
  canvasSize,
  panning,
  wheelPanning,
  layoutMode,
}: {
  canvas: Canvas | undefined;
  selectedNodeId: string | null;
  pmStatusFilter: "all" | CanvasNodeStatus;
  focusNodeOnly: boolean;
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  panning: boolean;
  wheelPanning: boolean;
  layoutMode: CanvasLayoutMode;
}) {
  const projectNodes = useMemo(() => {
    if (!canvas) return [] as CanvasNode[];
    return canvas.nodes.filter(
      (node) =>
        node.type === "project" ||
        node.type === "goal" ||
        node.type === "milestone" ||
        node.type === "decision" ||
        node.type === "risk" ||
        node.type === "task" ||
        node.type === "checklist",
    );
  }, [canvas]);

  const selectedNode = useMemo(
    () => canvas?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [canvas, selectedNodeId],
  );

  const filteredProjectNodes = useMemo(() => {
    if (pmStatusFilter === "all") return projectNodes;
    return projectNodes.filter((node) => node.status === pmStatusFilter);
  }, [pmStatusFilter, projectNodes]);

  const timelineNodes = useMemo(
    () =>
      [...filteredProjectNodes]
        .filter((node) => !!node.dueDate)
        .sort((a, b) => parseDueDateTs(a.dueDate) - parseDueDateTs(b.dueDate))
        .slice(0, 8),
    [filteredProjectNodes],
  );

  const focusNodeIds = useMemo(() => {
    if (!canvas) return new Set<string>();
    if (!focusNodeOnly || !selectedNodeId) {
      return new Set(canvas.nodes.map((node) => node.id));
    }
    const linked = new Set<string>([selectedNodeId]);
    canvas.connections.forEach((conn) => {
      if (conn.fromId === selectedNodeId) linked.add(conn.toId);
      if (conn.toId === selectedNodeId) linked.add(conn.fromId);
    });
    return linked;
  }, [canvas, focusNodeOnly, selectedNodeId]);

  const visibleBounds = useMemo(() => {
    const zoom = Math.max(0.0001, viewport.zoom);
    const overscan = Math.min(
      CANVAS_NODE_OVERSCAN_MAX_PX,
      Math.max(CANVAS_NODE_OVERSCAN_PX, 560 / Math.max(0.2, zoom)),
    );
    const worldLeft = -viewport.panX / zoom;
    const worldTop = -viewport.panY / zoom;
    const worldRight = worldLeft + canvasSize.w / zoom;
    const worldBottom = worldTop + canvasSize.h / zoom;
    return {
      left: worldLeft - overscan,
      top: worldTop - overscan,
      right: worldRight + overscan,
      bottom: worldBottom + overscan,
    };
  }, [canvasSize.h, canvasSize.w, viewport.panX, viewport.panY, viewport.zoom]);

  const visibleNodes = useMemo(() => {
    if (!canvas) return [] as CanvasNode[];
    return canvas.nodes.filter((node) => {
      if (!focusNodeIds.has(node.id)) return false;
      const right = node.x + node.width;
      const bottom = node.y + node.height;
      return !(
        right < visibleBounds.left ||
        node.x > visibleBounds.right ||
        bottom < visibleBounds.top ||
        node.y > visibleBounds.bottom
      );
    });
  }, [canvas, focusNodeIds, visibleBounds]);

  const visibleNodeById = useMemo(() => {
    const map = new globalThis.Map<string, CanvasNode>();
    visibleNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [visibleNodes]);

  const visibleConnections = useMemo(() => {
    if (!canvas) return [] as CanvasConnection[];
    return canvas.connections.filter(
      (conn) =>
        visibleNodeById.has(conn.fromId) && visibleNodeById.has(conn.toId),
    );
  }, [canvas, visibleNodeById]);

  const reduceNodeEffects =
    (canvas?.nodes.length ?? 0) > 70 || viewport.zoom < 0.35;
  const reduceConnectionEffects =
    reduceNodeEffects ||
    panning ||
    wheelPanning ||
    (canvas?.connections.length ?? 0) > 140;
  const miniMapNodes =
    canvas && canvas.nodes.length > 320 ? visibleNodes : canvas?.nodes ?? [];

  const layoutGuides = useMemo((): CanvasLayoutGuides => {
    if (!canvas || canvas.nodes.length === 0 || layoutMode === "mindmap") {
      return null;
    }

    const minX = Math.min(...canvas.nodes.map((node) => node.x));
    const minY = Math.min(...canvas.nodes.map((node) => node.y));
    const maxY = Math.max(...canvas.nodes.map((node) => node.y + node.height));

    if (layoutMode === "timeline") {
      const ordered = canvas.nodes
        .map((node, index) => ({ node, index }))
        .sort(
          (a, b) =>
            timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index),
        )
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
  }, [canvas, layoutMode]);

  return {
    layoutGuides,
    miniMapNodes,
    projectNodes,
    reduceConnectionEffects,
    reduceNodeEffects,
    selectedNode,
    timelineNodes,
    visibleConnections,
    visibleNodeById,
    visibleNodes,
  };
}
