import type { CanvasNode, NodeType } from "../../../store/canvasStore";
import type { MagicTemplatePayload } from "../CanvasMagicModal";
import {
  CANVAS_MAGIC_HUB_TEMPLATES,
  buildCanvasMagicHubMarkdown,
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
  const meta = CANVAS_MAGIC_HUB_TEMPLATES[params.payload.template];
  const title = params.payload.title?.trim() || meta.label;
  const rootId = params.spawnNode("markdown", {
    x: center.x - 380,
    y: center.y - 300,
    title,
    patch: {
      width: 760,
      height: 600,
      color: meta.color,
      content: buildCanvasMagicHubMarkdown(params.payload),
      tags: ["magic-hub", `preset:${params.payload.template}`],
    },
  });
  finalizeTemplate(params, rootId);
}
