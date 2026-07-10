export function extractRgbTuple(value) {
  if (!value || typeof value !== "string") return null;
  const hexMatch = value.match(/#([0-9a-fA-F]{6})/);
  if (hexMatch) {
    const hex = hexMatch[1];
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  const rgbMatch = value.match(
    /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i,
  );
  if (rgbMatch) {
    return [
      Number.parseFloat(rgbMatch[1]),
      Number.parseFloat(rgbMatch[2]),
      Number.parseFloat(rgbMatch[3]),
    ];
  }
  return null;
}

export function relativeLuminance(rgb) {
  if (!rgb) return 0;
  const channels = rgb.map((value) => {
    const normalized = Math.max(0, Math.min(255, value)) / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(foreground, background) {
  const fgLum = relativeLuminance(foreground);
  const bgLum = relativeLuminance(background);
  const light = Math.max(fgLum, bgLum);
  const dark = Math.min(fgLum, bgLum);
  return (light + 0.05) / (dark + 0.05);
}

export function getReadableColor(preferred, background, muted = false) {
  const bgRgb = extractRgbTuple(background);
  const fgRgb = extractRgbTuple(preferred);
  if (!bgRgb) return preferred;
  const backgroundIsDark = relativeLuminance(bgRgb) < 0.34;
  const fallback = muted
    ? backgroundIsDark
      ? "#94a3b8"
      : "#4b5563"
    : backgroundIsDark
      ? "#f3f4f6"
      : "#111827";
  if (!fgRgb) return fallback;
  const minContrast = muted ? 2.5 : 4.2;
  return contrastRatio(fgRgb, bgRgb) >= minContrast ? preferred : fallback;
}

export function pickReadableSurface(...values) {
  for (const value of values) {
    if (extractRgbTuple(value)) return value;
  }
  return values.find((value) => Boolean(String(value || "").trim())) || "#0b1020";
}

export function toRgbaColor(value, alpha = 1) {
  const rgb = extractRgbTuple(value);
  if (!rgb) return `rgba(128, 0, 255, ${alpha})`;
  const [r, g, b] = rgb.map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel))),
  );
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ensureReadableEditorTextColor(preferred, background) {
  const bgRgb = extractRgbTuple(background);
  const fgRgb = extractRgbTuple(preferred);
  if (!bgRgb) return "#f3f4f6";
  const bgLum = relativeLuminance(bgRgb);
  if (bgLum < 0.72) return "#f3f4f6";
  if (fgRgb && relativeLuminance(fgRgb) > 0.42) return preferred;
  return "#111827";
}
