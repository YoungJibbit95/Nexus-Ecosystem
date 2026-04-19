import type { CanvasNode, NodeType, Viewport } from "../../store/canvasStore";

const STARTER_PACK_TEMPLATE_SIZE = { w: 1440, h: 1080 };

const resolveStarterPackCenter = ({
  origin,
  viewport,
  canvasSize,
  existingNodes,
}: {
  origin?: { x: number; y: number };
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  existingNodes: CanvasNode[];
}) => {
  if (origin) return { x: origin.x, y: origin.y };

  const viewportCenterX = (-viewport.panX + canvasSize.w * 0.42) / viewport.zoom;
  const viewportCenterY = (-viewport.panY + canvasSize.h * 0.36) / viewport.zoom;
  if (!existingNodes.length) {
    return { x: viewportCenterX, y: viewportCenterY };
  }

  const offsets: Array<[number, number]> = [[0, 0]];
  const stepX = Math.max(560, Math.round(STARTER_PACK_TEMPLATE_SIZE.w * 0.56));
  const stepY = Math.max(420, Math.round(STARTER_PACK_TEMPLATE_SIZE.h * 0.48));
  for (let ring = 1; ring <= 8; ring += 1) {
    const points = 8 + ring * 6;
    const radiusX = stepX * ring;
    const radiusY = stepY * ring;
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      offsets.push([
        Math.round(Math.cos(angle) * radiusX),
        Math.round(Math.sin(angle) * radiusY),
      ]);
    }
  }

  const scoreAt = (centerX: number, centerY: number) => {
    const margin = 132;
    const left = centerX - STARTER_PACK_TEMPLATE_SIZE.w * 0.5 - margin;
    const top = centerY - STARTER_PACK_TEMPLATE_SIZE.h * 0.5 - margin;
    const right = centerX + STARTER_PACK_TEMPLATE_SIZE.w * 0.5 + margin;
    const bottom = centerY + STARTER_PACK_TEMPLATE_SIZE.h * 0.5 + margin;
    let score = 0;
    existingNodes.forEach((node) => {
      const nodeLeft = node.x - 64;
      const nodeTop = node.y - 64;
      const nodeRight = node.x + node.width + 64;
      const nodeBottom = node.y + node.height + 64;
      if (
        nodeLeft >= right ||
        nodeRight <= left ||
        nodeTop >= bottom ||
        nodeBottom <= top
      ) {
        return;
      }
      score += 1;
      const overlapW = Math.max(0, Math.min(right, nodeRight) - Math.max(left, nodeLeft));
      const overlapH = Math.max(0, Math.min(bottom, nodeBottom) - Math.max(top, nodeTop));
      score += (overlapW * overlapH) / (STARTER_PACK_TEMPLATE_SIZE.w * STARTER_PACK_TEMPLATE_SIZE.h + 1);
    });
    return score;
  };

  let bestX = viewportCenterX;
  let bestY = viewportCenterY;
  let bestScore = Number.POSITIVE_INFINITY;
  offsets.forEach(([dx, dy]) => {
    const candX = viewportCenterX + dx;
    const candY = viewportCenterY + dy;
    const score = scoreAt(candX, candY);
    if (score < bestScore) {
      bestScore = score;
      bestX = candX;
      bestY = candY;
    }
  });
  return {
    x: Math.round(bestX / 10) * 10,
    y: Math.round(bestY / 10) * 10,
  };
};

export const createCanvasStarterPack = ({
  origin,
  viewport,
  canvasSize,
  existingNodes,
  spawnNode,
  connectNodes,
  addChecklistItem,
  setSelectedNodeId,
  fitView,
}: {
  origin?: { x: number; y: number };
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  existingNodes: CanvasNode[];
  spawnNode: (
    type: NodeType,
    opts: {
      x: number;
      y: number;
      title?: string;
      patch?: Partial<CanvasNode>;
    },
  ) => string | null;
  connectNodes: (links: Array<[string | null, string | null]>) => void;
  addChecklistItem: (nodeId: string, text: string) => void;
  setSelectedNodeId: (id: string) => void;
  fitView: () => void;
}) => {
  const center = resolveStarterPackCenter({
    origin,
    viewport,
    canvasSize,
    existingNodes,
  });
  const centerX = center.x;
  const centerY = center.y;

  const root = spawnNode("project", {
    x: centerX,
    y: centerY,
    title: "Project Starter",
    patch: {
      color: "#5E5CE6",
      status: "doing",
      priority: "high",
      progress: 12,
      owner: "team",
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      content: "Scope, KPI, Owner, Risiken und Next Steps",
    },
  });
  const brief = spawnNode("markdown", {
    x: centerX - 450,
    y: centerY - 90,
    title: "Project Brief",
    patch: {
      color: "#64D2FF",
      content:
        "```nexus-list\nScope | Must-have Features\nPrimary KPI | Adoption + Retention\nOwner | product + engineering\n```\n\n"
        + "```nexus-steps\nDiscovery | Zielbild fixieren\nBuild | Kernumsetzung liefern\nQA | Stabilität + UX sicherstellen\n```",
    },
  });
  const sprint = spawnNode("checklist", {
    x: centerX + 430,
    y: centerY - 70,
    title: "Sprint Execution",
    patch: { color: "#30D158" },
  });
  const risk = spawnNode("risk", {
    x: centerX - 130,
    y: centerY + 320,
    title: "Primary Risk",
    patch: {
      color: "#FF453A",
      status: "blocked",
      priority: "critical",
      owner: "lead",
    },
  });
  const milestone = spawnNode("milestone", {
    x: centerX + 320,
    y: centerY + 310,
    title: "Milestone #1",
    patch: {
      color: "#FF9F0A",
      status: "todo",
      dueDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    },
  });
  connectNodes([
    [root, brief],
    [root, sprint],
    [root, risk],
    [root, milestone],
  ]);
  if (sprint) {
    addChecklistItem(sprint, "Kickoff + Scope finalisieren");
    addChecklistItem(sprint, "API + UI Integration");
    addChecklistItem(sprint, "QA + UAT");
    addChecklistItem(sprint, "Launch Gate");
  }
  if (root) setSelectedNodeId(root);
  requestAnimationFrame(() => fitView());
};
