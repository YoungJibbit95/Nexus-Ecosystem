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
