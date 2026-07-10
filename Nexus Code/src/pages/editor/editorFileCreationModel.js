const LANGUAGE_EXTENSIONS = Object.freeze({
  typescript: "ts",
  javascript: "js",
  python: "py",
  html: "html",
  css: "css",
  json: "json",
  markdown: "md",
  rust: "rs",
  go: "go",
});

export function getLanguageExtension(languageId, fallback = "txt") {
  const normalized = String(languageId || "").toLowerCase();
  return LANGUAGE_EXTENSIONS[normalized] || normalized || fallback;
}

export function getNextUntitledName(files, extension = "txt") {
  const ext = String(extension || "txt").replace(/^\./, "") || "txt";
  const existingNames = new Set(
    (Array.isArray(files) ? files : [])
      .filter((file) => file?.type === "file")
      .map((file) => String(file.name || "").toLowerCase()),
  );
  let index = 1;
  while (index < 1000) {
    const candidate =
      index === 1 ? `untitled.${ext}` : `untitled-${index}.${ext}`;
    if (!existingNames.has(candidate.toLowerCase())) return candidate;
    index += 1;
  }
  return `untitled-${Date.now()}.${ext}`;
}
