function normalizeMarkupText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function readMarkupContent(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return normalizeMarkupText(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return normalizeMarkupText(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return "";
    seen.add(value);
    return value
      .map((item) => readMarkupContent(item, seen))
      .filter(Boolean)
      .join("\n\n");
  }
  if (typeof value === "object") {
    if (seen.has(value)) return "";
    seen.add(value);
    if (typeof value.value === "string") {
      return normalizeMarkupText(value.value);
    }
    if ("contents" in value) {
      return readMarkupContent(value.contents, seen);
    }
    if ("documentation" in value) {
      return readMarkupContent(value.documentation, seen);
    }
  }
  return "";
}

export function readHoverText(hover) {
  return readMarkupContent(hover?.contents ?? hover);
}
