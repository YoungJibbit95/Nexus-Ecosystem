import type { Canvas, Viewport } from "../../store/canvasStore";

const toFileSafeSlug = (value: string) =>
  (value || "canvas")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "canvas";

export const triggerTextDownload = (
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

export const createCanvasExportArtifacts = (canvas: Canvas, viewport: Viewport) => {
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
    const from = canvas.nodes.find((n) => n.id === conn.fromId);
    const to = canvas.nodes.find((n) => n.id === conn.toId);
    readable.push(
      `${index + 1}. ${from?.title || conn.fromId} -> ${to?.title || conn.toId}${conn.label ? ` (${conn.label})` : ""}`,
    );
  });
  readable.push("");
  readable.push("## Raw JSON");
  readable.push("```json");
  readable.push(JSON.stringify(jsonPayload, null, 2));
  readable.push("```");

  return {
    jsonFilename: `${baseName}.nexus-canvas.json`,
    jsonContent: JSON.stringify(jsonPayload, null, 2),
    markdownFilename: `${baseName}.nexus-canvas.md`,
    markdownContent: readable.join("\n"),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const NODE_TYPES = new Set([
  "text",
  "markdown",
  "checklist",
  "image",
  "code",
  "note",
  "codefile",
  "task",
  "reminder",
  "goal",
  "milestone",
  "decision",
  "risk",
  "project",
]);

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const next = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, next));
};

const cleanString = (value: unknown, fallback = "", maxLength = 80000) => {
  const text = typeof value === "string" ? value : value == null ? fallback : String(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const cleanColor = (value: unknown, fallback = "#5B8CFF") => {
  const text = cleanString(value, fallback, 32).trim();
  return /^#[0-9a-f]{3,8}$/i.test(text) ? text : fallback;
};

export const parseCanvasImportPayload = (payload: unknown):
  | { ok: true; canvas: Canvas; viewport?: Viewport; warnings: string[] }
  | { ok: false; message: string } => {
  const root = isRecord(payload) ? payload : null;
  if (!root) return { ok: false, message: "Canvas JSON ist kein Objekt." };
  const source = isRecord(root.canvas) ? root.canvas : root;
  const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
  if (rawNodes.length === 0) {
    return { ok: false, message: "Canvas Import enthaelt keine Nodes." };
  }

  const stamp = Date.now().toString(36);
  const idMap = new Map<string, string>();
  const warnings: string[] = [];
  const nodes = rawNodes
    .filter(isRecord)
    .slice(0, 2000)
    .map((node, index) => {
      const oldId = cleanString(node.id, `node-${index}`, 160);
      const nextId = `import-${stamp}-${index}`;
      idMap.set(oldId, nextId);
      const type = cleanString(node.type, "text", 32);
      const safeType = NODE_TYPES.has(type) ? (type as Canvas["nodes"][number]["type"]) : "text";
      if (safeType !== type) warnings.push(`Node ${oldId}: unbekannter Typ wurde zu text.`);
      const items = Array.isArray(node.items)
        ? node.items.filter(isRecord).slice(0, 240).map((item, itemIndex) => ({
            id: `import-${stamp}-${index}-item-${itemIndex}`,
            text: cleanString(item.text, "", 1000),
            done: Boolean(item.done),
          }))
        : undefined;
      return {
        id: nextId,
        type: safeType,
        title: cleanString(node.title, safeType, 180),
        x: clampNumber(node.x, index * 36, -100000, 100000),
        y: clampNumber(node.y, index * 36, -100000, 100000),
        width: clampNumber(node.width, 280, 120, 1400),
        height: clampNumber(node.height, 180, 80, 1200),
        nodeScale: clampNumber(node.nodeScale, 1, 0.5, 2),
        content: cleanString(node.content, ""),
        color: cleanColor(node.color),
        items,
        codeLang: cleanString(node.codeLang, "", 80) || undefined,
        linkedNoteId: cleanString(node.linkedNoteId, "", 160) || undefined,
        linkedCodeId: cleanString(node.linkedCodeId, "", 160) || undefined,
        linkedTaskId: cleanString(node.linkedTaskId, "", 160) || undefined,
        linkedReminderId: cleanString(node.linkedReminderId, "", 160) || undefined,
        status: ["todo", "doing", "blocked", "done"].includes(cleanString(node.status, "")) ? node.status as any : undefined,
        priority: ["low", "mid", "high", "critical"].includes(cleanString(node.priority, "")) ? node.priority as any : undefined,
        progress: typeof node.progress === "number" ? clampNumber(node.progress, 0, 0, 100) : undefined,
        dueDate: cleanString(node.dueDate, "", 80) || undefined,
        owner: cleanString(node.owner, "", 120) || undefined,
        tags: Array.isArray(node.tags) ? node.tags.map((tag) => cleanString(tag, "", 40)).filter(Boolean).slice(0, 16) : undefined,
        effort: typeof node.effort === "number" ? clampNumber(node.effort, 0, 0, 999) : undefined,
        lane: cleanString(node.lane, "", 80) || undefined,
        icon: cleanString(node.icon, "", 20) || undefined,
      } satisfies Canvas["nodes"][number];
    });

  const connections = (Array.isArray(source.connections) ? source.connections : [])
    .filter(isRecord)
    .slice(0, 5000)
    .map((conn, index) => {
      const fromId = idMap.get(cleanString(conn.fromId, "", 160));
      const toId = idMap.get(cleanString(conn.toId, "", 160));
      if (!fromId || !toId || fromId === toId) return null;
      const nextConnection: Canvas["connections"][number] = {
        id: `import-${stamp}-conn-${index}`,
        fromId,
        toId,
        color: cleanColor(conn.color, "#5B8CFF"),
        label: cleanString(conn.label, "", 120) || undefined,
      };
      return nextConnection;
    })
    .filter((conn): conn is Canvas["connections"][number] => Boolean(conn));

  const now = new Date().toISOString();
  const canvas: Canvas = {
    id: `imported-canvas-${stamp}`,
    name: `${cleanString(source.name, "Imported Canvas", 120)} Import`,
    nodes,
    connections,
    created: now,
    updated: now,
  };
  const viewport = isRecord(root.viewport)
    ? {
        panX: clampNumber(root.viewport.panX, 0, -500000, 500000),
        panY: clampNumber(root.viewport.panY, 0, -500000, 500000),
        zoom: clampNumber(root.viewport.zoom, 1, 0.15, 3),
      }
    : undefined;
  return { ok: true, canvas, viewport, warnings };
};