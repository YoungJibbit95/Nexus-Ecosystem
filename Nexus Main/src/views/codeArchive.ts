export function codeDownloadName(value: unknown): string {
  const base = String(value || "untitled.txt").split(/[\\/]/).pop() || "untitled.txt";
  const safe = base.replace(/[<>:"|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "");
  return !safe || /^\.+$/.test(safe) ? "untitled.txt" : /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe) ? "_" + safe : safe;
}

export function buildCodeArchive(codes: readonly unknown[], folders: readonly unknown[] = []): string {
  return JSON.stringify({ format: "nexus-code-archive", version: 1, exportedAt: new Date().toISOString(), codes, folders }, null, 2);
}

export function downloadCodeArchiveFile(name: string, content: string, type = "application/octet-stream"): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = codeDownloadName(name);
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
