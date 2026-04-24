import type { CanvasNode, NodeType } from "../../../store/canvasStore";
import type { MagicTemplatePayload } from "../CanvasMagicModal";
import {
  buildCanvasMagicTemplate,
  normalizeCanvasMagicTemplatePayload,
} from "@nexus/core/canvas/magicHubTemplates";

type SpawnNodeFn = (
  type: NodeType,
  options?: {
    x?: number;
    y?: number;
    title?: string;
    patch?: Partial<CanvasNode>;
  },
) => string | null;

type ConnectNodesFn = (
  pairs: Array<[string | null | undefined, string | null | undefined]>,
) => void;

type CreateMagicTemplateParams = {
  payload: MagicTemplatePayload;
  canvasSize: { w: number; h: number };
  viewport: { panX: number; panY: number; zoom: number };
  spawnNode: SpawnNodeFn;
  connectNodes: ConnectNodesFn;
  addChecklistItem?: (nodeId: string, text: string) => void;
  fitView: () => void;
  setSelectedNodeId: (id: string | null) => void;
  setShowMagicBuilder: (value: boolean) => void;
  setQuickAddPos: (value: { x: number; y: number } | null) => void;
};

const getViewportCenter = (params: CreateMagicTemplateParams) => {
  const centerX = (-params.viewport.panX + params.canvasSize.w * 0.5) / params.viewport.zoom;
  const centerY = (-params.viewport.panY + params.canvasSize.h * 0.45) / params.viewport.zoom;
  return {
    x: Math.round(centerX / 20) * 20,
    y: Math.round(centerY / 20) * 20,
  };
};

const finalizeTemplate = (params: CreateMagicTemplateParams, rootId: string | null) => {
  params.setSelectedNodeId(rootId);
  params.setShowMagicBuilder(false);
  params.setQuickAddPos(null);
  window.setTimeout(() => params.fitView(), 80);
};

export function createMagicTemplateFromPayload(params: CreateMagicTemplateParams) {
  const center = getViewportCenter(params);
  const payload = normalizeCanvasMagicTemplatePayload(params.payload);
  let template: ReturnType<typeof buildCanvasMagicTemplate>;
  try {
    template = buildCanvasMagicTemplate(payload);
  } catch (error) {
    console.error("[Canvas Magic] template build failed, falling back to mindmap", {
      error,
      payload,
    });
    const fallbackPayload = normalizeCanvasMagicTemplatePayload({
      ...params.payload,
      template: "mindmap",
      title: "Mindmap Core",
    });
    template = buildCanvasMagicTemplate(fallbackPayload);
  }

  if (template.kind === "ai-project") {
    const graph = template.graph;
    const idMap = new globalThis.Map<string, string | null>();
    graph.nodes.forEach((node) => {
      const createdId = params.spawnNode(node.type as NodeType, {
        x: center.x + node.x,
        y: center.y + node.y,
        title: node.title,
        patch: {
          width: node.width,
          height: node.height,
          color: node.color,
          content: node.content,
          status: node.meta?.status,
          priority: node.meta?.priority,
          progress: node.meta?.progress,
          dueDate: node.meta?.dueDate,
          owner: node.meta?.owner,
          tags: node.meta?.tags ? [...node.meta.tags] : undefined,
        },
      });
      if (createdId && node.checklistItems?.length && params.addChecklistItem) {
        node.checklistItems.forEach((item) =>
          params.addChecklistItem?.(createdId, item),
        );
      }
      idMap.set(node.id, createdId);
    });
    params.connectNodes(
      graph.links.map((entry) => [idMap.get(entry.from), idMap.get(entry.to)]),
    );
    const rootId = idMap.get(graph.rootId) ?? null;
    finalizeTemplate(params, rootId);
    return;
  }

  const rootId = params.spawnNode("markdown", {
    x: center.x - 380,
    y: center.y - 300,
    title: template.title,
    patch: {
      width: 760,
      height: 600,
      color: template.meta.color,
      content: template.markdown,
      tags: ["magic-hub", `preset:${template.templateId}`],
    },
  });
  finalizeTemplate(params, rootId);
}
