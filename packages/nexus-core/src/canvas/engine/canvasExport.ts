import type { CanvasModel } from "../model/canvasTypes";

export const exportCanvasAsJson = (canvas: CanvasModel) =>
  JSON.stringify({ schema: "nexus.canvas", version: 2, canvas }, null, 2);

export const exportCanvasAsMarkdown = (canvas: CanvasModel) => {
  const lines = [`# ${canvas.name}`, "", `Nodes: ${canvas.nodes.length}`, `Connections: ${canvas.connections.length}`, ""];
  canvas.nodes.forEach((node) => {
    lines.push(`## ${node.title || node.type}`);
    if (node.content) lines.push("", node.content.trim(), "");
    if (node.items?.length) {
      node.items.forEach((item) => {
        lines.push(`- [${item.done ? "x" : " "}] ${item.text}`);
      });
      lines.push("");
    }
  });
  return lines.join("\n").trimEnd();
};
