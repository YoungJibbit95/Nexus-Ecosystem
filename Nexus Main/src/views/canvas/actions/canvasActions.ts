import type {
  Canvas,
  CanvasNode,
  CanvasNodeStatus,
  NodeType,
  Viewport,
} from "../../../store/canvasStore";
import { useCanvas } from "../../../store/canvasStore";
import {
  BOARD_LANES,
  type CanvasLayoutMode,
  type CanvasWidgetType,
  laneForNode,
  timelineSortKey,
} from "../canvasConstants";

const toFileSafeSlug = (value: string) =>
  (value || "canvas")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "canvas";

const triggerTextDownload = (
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export function exportCanvasData(canvas: Canvas | undefined, viewport: Viewport) {
  if (!canvas) return;

  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.slice(0, 19).replace(/[:T]/g, "-");
  const slug = toFileSafeSlug(canvas.name);
  const baseName = `${slug}-${stamp}`;

  const jsonPayload = {
    version: 1,
    app: "nexus-canvas",
    exportedAt,
    viewport,
    canvas: {
      id: canvas.id,
      name: canvas.name,
      created: canvas.created,
      updated: canvas.updated,
      nodes: canvas.nodes,
      connections: canvas.connections,
    },
  };

  const readable: string[] = [];
  readable.push(`# Canvas Export: ${canvas.name}`);
  readable.push(`exported_at: ${exportedAt}`);
  readable.push(`canvas_id: ${canvas.id}`);
  readable.push(`nodes: ${canvas.nodes.length}`);
  readable.push(`connections: ${canvas.connections.length}`);
  readable.push("");
  readable.push("## Nodes");
  canvas.nodes.forEach((node, index) => {
    readable.push(`### ${index + 1}. ${node.title || "Untitled"} (${node.type})`);
    readable.push(`id: ${node.id}`);
    readable.push(`position: x=${Math.round(node.x)}, y=${Math.round(node.y)}`);
    readable.push(`size: w=${Math.round(node.width)}, h=${Math.round(node.height)}`);
    if (node.status) readable.push(`status: ${node.status}`);
    if (node.priority) readable.push(`priority: ${node.priority}`);
    if (typeof node.progress === "number") readable.push(`progress: ${node.progress}`);
    if (node.dueDate) readable.push(`due_date: ${node.dueDate}`);
    if (node.owner) readable.push(`owner: ${node.owner}`);
    if (node.tags?.length) readable.push(`tags: ${node.tags.join(", ")}`);
    if (node.items?.length) {
      readable.push("checklist:");
      node.items.forEach((item) => {
        readable.push(`- [${item.done ? "x" : " "}] ${item.text}`);
      });
    }
    if (node.content?.trim()) {
      readable.push("content:");
      readable.push("```text");
      readable.push(node.content.trimEnd());
      readable.push("```");
    }
    readable.push("");
  });
  readable.push("## Connections");
  canvas.connections.forEach((conn, index) => {
    const from = canvas.nodes.find((node) => node.id === conn.fromId);
    const to = canvas.nodes.find((node) => node.id === conn.toId);
    readable.push(
      `${index + 1}. ${from?.title || conn.fromId} -> ${to?.title || conn.toId}${conn.label ? ` (${conn.label})` : ""}`,
    );
  });
  readable.push("");
  readable.push("## Raw JSON");
  readable.push("```json");
  readable.push(JSON.stringify(jsonPayload, null, 2));
  readable.push("```");

  triggerTextDownload(
    `${baseName}.nexus-canvas.json`,
    JSON.stringify(jsonPayload, null, 2),
    "application/json;charset=utf-8",
  );
  triggerTextDownload(
    `${baseName}.nexus-canvas.md`,
    readable.join("\n"),
    "text/markdown;charset=utf-8",
  );
}

export function addWidgetNode(type: CanvasWidgetType, x?: number, y?: number) {
  if (type === "sticky") {
    const state = useCanvas.getState();
    state.addNode("text", x, y);
    const canvas = state.getActiveCanvas();
    const created = canvas?.nodes[canvas.nodes.length - 1];
    if (created) {
      state.updateNode(created.id, { color: "#FFCC00", title: "Sticky Note" });
    }
    return created?.id ?? null;
  }

  useCanvas.getState().addNode(type as NodeType, x, y);
  const canvas = useCanvas.getState().getActiveCanvas();
  return canvas?.nodes[canvas.nodes.length - 1]?.id ?? null;
}

export function duplicateCanvasNode(
  node: CanvasNode,
  options?: {
    offsetX?: number;
    offsetY?: number;
    titleSuffix?: string;
  },
) {
  const state = useCanvas.getState();
  state.addNode(
    node.type,
    node.x + (options?.offsetX ?? 64),
    node.y + (options?.offsetY ?? 64),
  );

  const canvas = state.getActiveCanvas();
  const created = canvas?.nodes[canvas.nodes.length - 1];
  if (!created) return null;

  state.updateNode(created.id, {
    title: `${node.title}${options?.titleSuffix ?? " Copy"}`,
    width: node.width,
    height: node.height,
    content: node.content,
    color: node.color,
    items: node.items?.map((item, index) => ({
      ...item,
      id: `${item.id}-copy-${index}-${Date.now().toString(36)}`,
    })),
    codeLang: node.codeLang,
    linkedNoteId: node.linkedNoteId,
    linkedCodeId: node.linkedCodeId,
    linkedTaskId: node.linkedTaskId,
    linkedReminderId: node.linkedReminderId,
    status: node.status,
    priority: node.priority,
    progress: node.progress,
    dueDate: node.dueDate,
    owner: node.owner,
    tags: node.tags ? [...node.tags] : undefined,
    effort: node.effort,
    lane: node.lane,
    icon: node.icon,
  });

  return created.id;
}

export function duplicateSelectedCanvasNode(
  selectedNodeId: string | null,
  setSelectedNodeId: (id: string | null) => void,
) {
  if (!selectedNodeId) return;
  const state = useCanvas.getState();
  const canvas = state.getActiveCanvas();
  const source = canvas?.nodes.find((node) => node.id === selectedNodeId);
  if (!source) return;

  const createdId = duplicateCanvasNode(source);
  if (createdId) setSelectedNodeId(createdId);
}

export function autoArrangeByStatus(fitView: () => void) {
  const state = useCanvas.getState();
  const canvas = state.getActiveCanvas();
  if (!canvas || canvas.nodes.length === 0) return;

  const order: CanvasNodeStatus[] = ["todo", "doing", "blocked", "done"];
  const counters: Record<CanvasNodeStatus, number> = {
    todo: 0,
    doing: 0,
    blocked: 0,
    done: 0,
  };

  canvas.nodes.forEach((node, index) => {
    const lane = node.status || laneForNode(node, index);
    const laneIndex = order.indexOf(lane);
    const row = counters[lane]++;
    state.moveNode(
      node.id,
      120 + Math.max(0, laneIndex) * 340,
      120 + row * 240,
    );
  });

  requestAnimationFrame(() => fitView());
}

export function autoLinkWikiRefs() {
  const state = useCanvas.getState();
  const canvas = state.getActiveCanvas();
  if (!canvas) return;

  const byTitle = new globalThis.Map(
    canvas.nodes.map((node) => [node.title.trim().toLowerCase(), node.id] as const),
  );

  canvas.nodes.forEach((node) => {
    const refs = Array.from((node.content || "").matchAll(/\[\[([^\]]+)\]\]/g)).map(
      (match) => match[1].trim().toLowerCase(),
    );
    refs.forEach((ref) => {
      const toId = byTitle.get(ref);
      if (toId && toId !== node.id) state.addConnection(node.id, toId);
    });
  });
}

export function applyAutoLayout(
  mode: CanvasLayoutMode,
  fitView: () => void,
  opts?: { fitView?: boolean },
) {
  const state = useCanvas.getState();
  const canvas = state.getActiveCanvas();
  if (!canvas || canvas.nodes.length === 0) return;

  const nodes = [...canvas.nodes];
  if (nodes.length === 1) {
    if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
    return;
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));

  if (mode === "timeline") {
    const ordered = nodes
      .map((node, index) => ({ node, index }))
      .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
      .map((entry) => entry.node);

    ordered.forEach((node, index) => {
      state.moveNode(
        node.id,
        minX + 80 + index * 320,
        minY + 80 + (index % 2 === 0 ? 0 : 115),
      );
    });

    if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
    return;
  }

  if (mode === "board") {
    const buckets = BOARD_LANES.reduce(
      (acc, lane) => {
        acc[lane.id] = [];
        return acc;
      },
      {} as Record<CanvasNodeStatus, CanvasNode[]>,
    );

    nodes.forEach((node, index) => {
      const lane = laneForNode(node, index);
      buckets[lane].push(node);
    });

    BOARD_LANES.forEach((lane, laneIndex) => {
      buckets[lane.id].forEach((node, index) => {
        state.moveNode(node.id, minX + laneIndex * 340, minY + index * 240 + 72);
      });
    });

    if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
    return;
  }

  const root = nodes[0];
  const others = nodes.slice(1);
  const radius = Math.max(240, others.length * 40);
  others.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(others.length, 1);
    state.moveNode(
      node.id,
      root.x + Math.cos(angle) * radius,
      root.y + Math.sin(angle) * Math.max(180, radius * 0.62),
    );
  });

  if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
}
