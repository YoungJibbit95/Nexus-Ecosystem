import { useCallback } from "react";
import type { MagicTemplatePayload } from "./CanvasMagicModal";
import type { CanvasNode, CanvasNodeStatus, NodeType, Viewport } from "../../store/canvasStore";
import { useCanvas } from "../../store/canvasStore";
import { createMagicTemplateFromPayload } from "./magic/createMagicTemplate";
import {
  getCanvasMagicHubQuickAction,
  type CanvasMagicHubQuickActionId,
} from "@nexus/core/canvas/magicHubTemplates";
import { laneForNode } from "./layoutHelpers";
import { createCanvasStarterPack } from "./canvasStarterPack";

export const useCanvasNodeActions = ({
  addNode,
  selectedNodeId,
  fitView,
  setSelectedNodeId,
  setShowMagicBuilder,
  setQuickAddPos,
  canvasSize,
  viewport,
}: {
  addNode: (type: NodeType, x?: number, y?: number) => void;
  selectedNodeId: string | null;
  fitView: () => void;
  setSelectedNodeId: (id: string | null) => void;
  setShowMagicBuilder: (value: boolean) => void;
  setQuickAddPos: (value: { x: number; y: number } | null) => void;
  canvasSize: { w: number; h: number };
  viewport: Viewport;
}) => {
  const addWidgetNode = useCallback(
    (type: NodeType | "sticky", x?: number, y?: number) => {
      if (type === "sticky") {
        const state = useCanvas.getState();
        state.addNode("text", x, y);
        const c = state.getActiveCanvas();
        const last = c?.nodes[c.nodes.length - 1];
        if (last) {
          state.updateNode(last.id, { color: "#FFCC00", title: "Sticky Note" });
        }
        return;
      }
      addNode(type as NodeType, x, y);
    },
    [addNode],
  );

  const spawnNode = useCallback(
    (
      type: NodeType,
      opts: {
        x: number;
        y: number;
        title?: string;
        patch?: Partial<CanvasNode>;
      },
    ) => {
      const state = useCanvas.getState();
      state.addNode(type, opts.x, opts.y);
      const active = state.getActiveCanvas();
      const created = active?.nodes[active.nodes.length - 1];
      if (!created) return null;
      const patch: Partial<CanvasNode> = { ...(opts.patch || {}) };
      if (opts.title) patch.title = opts.title;
      if (Object.keys(patch).length) state.updateNode(created.id, patch);
      return created.id;
    },
    [],
  );

  const connectNodes = useCallback((links: Array<[string | null, string | null]>) => {
    const state = useCanvas.getState();
    links.forEach(([from, to]) => {
      if (from && to) state.addConnection(from, to);
    });
  }, []);

  const createStarterPack = useCallback(
    (origin?: { x: number; y: number }) => {
      const state = useCanvas.getState();
      createCanvasStarterPack({
        origin,
        viewport,
        canvasSize,
        existingNodes: state.getActiveCanvas()?.nodes ?? [],
        spawnNode,
        connectNodes,
        addChecklistItem: state.addChecklistItem,
        setSelectedNodeId,
        fitView,
      });
    },
    [canvasSize, connectNodes, fitView, setSelectedNodeId, spawnNode, viewport],
  );

  const createMagicTemplate = useCallback(
    (payload: MagicTemplatePayload) => {
      createMagicTemplateFromPayload({
        payload,
        canvasSize,
        viewport,
        spawnNode,
        connectNodes,
        addChecklistItem: useCanvas.getState().addChecklistItem,
        fitView,
        setSelectedNodeId,
        setShowMagicBuilder,
        setQuickAddPos,
      });
    },
    [
      canvasSize,
      connectNodes,
      fitView,
      setQuickAddPos,
      setSelectedNodeId,
      setShowMagicBuilder,
      spawnNode,
      viewport,
    ],
  );

  const handleHubQuickAction = useCallback(
    (hubNode: CanvasNode, action: CanvasMagicHubQuickActionId) => {
      const state = useCanvas.getState();
      const target = getCanvasMagicHubQuickAction(action);
      if (!target) return;
      const nextX = hubNode.x + hubNode.width + 88;
      const nextY = hubNode.y + target.yOffset;
      state.addNode(target.nodeType as NodeType, nextX, nextY);
      const activeCanvas = state.getActiveCanvas();
      const created = activeCanvas?.nodes[activeCanvas.nodes.length - 1];
      if (!created) return;
      state.updateNode(created.id, {
        title: target.title,
        color: target.color,
        content: target.content,
        status: target.status as any,
        priority: target.priority as any,
        progress: typeof target.progress === "number" ? target.progress : 0,
      });
      state.addConnection(hubNode.id, created.id);
      setSelectedNodeId(created.id);
    },
    [setSelectedNodeId],
  );

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const state = useCanvas.getState();
    const active = state.getActiveCanvas();
    const source = active?.nodes.find((node) => node.id === selectedNodeId);
    if (!source) return;

    state.addNode(source.type, source.x + 64, source.y + 64);
    const next = state.getActiveCanvas();
    const created = next?.nodes[next.nodes.length - 1];
    if (!created) return;

    const duplicateItems = source.items?.map((item, index) => ({
      ...item,
      id: `${item.id}-copy-${index}-${Date.now().toString(36)}`,
    }));
    state.updateNode(created.id, {
      title: `${source.title} Copy`,
      width: source.width,
      height: source.height,
      color: source.color,
      content: source.content,
      items: duplicateItems,
      codeLang: source.codeLang,
      status: source.status,
      priority: source.priority,
      progress: source.progress,
      dueDate: source.dueDate,
      owner: source.owner,
      tags: source.tags ? [...source.tags] : undefined,
      effort: source.effort,
      lane: source.lane,
      icon: source.icon,
      linkedCodeId: source.linkedCodeId,
      linkedNoteId: source.linkedNoteId,
      linkedReminderId: source.linkedReminderId,
      linkedTaskId: source.linkedTaskId,
    });
    setSelectedNodeId(created.id);
  }, [selectedNodeId, setSelectedNodeId]);

  const autoArrangeByStatus = useCallback(() => {
    const state = useCanvas.getState();
    const active = state.getActiveCanvas();
    if (!active || active.nodes.length === 0) return;

    const order: CanvasNodeStatus[] = ["todo", "doing", "blocked", "done"];
    const counters: Record<CanvasNodeStatus, number> = {
      todo: 0,
      doing: 0,
      blocked: 0,
      done: 0,
    };
    const baseX = 120;
    const columnGap = 340;
    const baseY = 120;
    const rowGap = 240;

    active.nodes.forEach((node, index) => {
      const lane = node.status || laneForNode(node, index);
      const laneIndex = order.indexOf(lane);
      const row = counters[lane]++;
      state.moveNode(
        node.id,
        baseX + Math.max(0, laneIndex) * columnGap,
        baseY + row * rowGap,
      );
    });
    requestAnimationFrame(() => fitView());
  }, [fitView]);

  const autoLinkWikiRefs = useCallback(() => {
    const state = useCanvas.getState();
    const active = state.getActiveCanvas();
    if (!active) return;
    const byTitle = new globalThis.Map(
      active.nodes.map((node) => [node.title.trim().toLowerCase(), node.id] as const),
    );
    active.nodes.forEach((node) => {
      const content = node.content || "";
      const refs = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) =>
        m[1].trim().toLowerCase(),
      );
      refs.forEach((ref) => {
        const toId = byTitle.get(ref);
        if (toId && toId !== node.id) {
          state.addConnection(node.id, toId);
        }
      });
    });
  }, []);

  return {
    addWidgetNode,
    spawnNode,
    connectNodes,
    createStarterPack,
    createMagicTemplate,
    handleHubQuickAction,
    duplicateSelectedNode,
    autoArrangeByStatus,
    autoLinkWikiRefs,
  };
};
