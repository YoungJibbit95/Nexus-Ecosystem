import { type CanvasNode, type CanvasNodePriority } from "../../../../store/canvasStore";

export const PRIORITY_OPTIONS: CanvasNodePriority[] = [
  "low",
  "mid",
  "high",
  "critical",
];

export const formatNodeMeta = (node: CanvasNode) => {
  const status = node.status ? ` · ${node.status}` : "";
  const priority = node.priority ? ` · ${node.priority}` : "";
  return `${node.type}${status}${priority}`;
};

export const scoreNodeMatch = (node: CanvasNode, rawQuery: string): number => {
  if (!rawQuery) return 0;
  const query = rawQuery.toLowerCase().trim();
  if (!query) return 0;

  const title = (node.title || "").toLowerCase();
  const tags = (node.tags || []).join(" ").toLowerCase();
  const content = (node.content || "").toLowerCase();
  const type = node.type.toLowerCase();

  let score = 0;
  if (title.includes(query)) score += 10;
  if (type.includes(query)) score += 7;
  if (tags.includes(query)) score += 6;
  if (content.includes(query)) score += 3;
  if (title.startsWith(query)) score += 3;
  return score;
};
