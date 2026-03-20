/**
 * nativeFS.js — Unified File System Bridge
 *
 * Abstrahiert Capacitor Filesystem für iOS & Android.
 * API ist bewusst identisch zu window.electronAPI —
 * Editor.jsx musste dadurch minimal geändert werden.
 */

const IS_NATIVE =
  typeof window !== "undefined" &&
  typeof window.Capacitor !== "undefined" &&
  window.Capacitor?.isNativePlatform?.();

// Lazy-load Capacitor plugins — nur wenn wirklich nativ
async function getFS() {
  if (!IS_NATIVE) return null;
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  return { Filesystem, Directory, Encoding };
}

async function getDialog() {
  if (!IS_NATIVE) return null;
  const { Dialog } = await import("@capacitor/dialog");
  return Dialog;
}

/** Removes leading slash from path */
function clean(p) {
  return p ? String(p).replace(/^\/+/, "") : "";
}

/**
 * Parst "documents://my/path" → { dir: Directory.Documents, path: "my/path" }
 * Fallback: Documents
 */
function parsePath(rawPath) {
  if (!IS_NATIVE) return { dir: null, path: rawPath };

  // We need Directory at call time — import it inline
  // We return the string scheme and resolve the actual Directory enum in each method
  if (typeof rawPath === "string" && rawPath.startsWith("documents://")) {
    return { scheme: "documents", path: clean(rawPath.replace("documents://", "")) };
  }
  if (typeof rawPath === "string" && rawPath.startsWith("data://")) {
    return { scheme: "data", path: clean(rawPath.replace("data://", "")) };
  }
  return { scheme: "documents", path: clean(rawPath) };
}

async function resolveDir(scheme) {
  const { Directory } = await import("@capacitor/filesystem");
  if (scheme === "data") return Directory.Data;
  return Directory.Documents; // default
}

export const nativeFS = {
  /** true wenn die App nativ auf iOS/Android läuft */
  isAvailable: IS_NATIVE,

  platform: "mobile",

  /**
   * Öffnet einen "Ordner" — auf Mobile: Dialog-Prompt für Ordnernamen
   * im Dokumente-Verzeichnis des Geräts.
   * Gibt "documents://ordnername" zurück.
   */
  async openFolder() {
    const Dialog = await getDialog();
    if (!Dialog) {
      // Browser-Fallback: simuliertes Verzeichnis
      return "documents://nexus-workspace";
    }

    const { value, cancelled } = await Dialog.prompt({
      title: "Ordner öffnen",
      message: "Ordnername im Dokumente-Verzeichnis:",
      inputPlaceholder: "mein-projekt",
      okButtonTitle: "Öffnen",
      cancelButtonTitle: "Abbrechen",
    });

    if (cancelled || !value?.trim()) return null;

    const folderName = value.trim().replace(/[/\\]/g, "-");
    const { Filesystem, Directory } = await import("@capacitor/filesystem");

    try {
      await Filesystem.mkdir({
        path: folderName,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Ordner existiert bereits — kein Fehler
    }

    return `documents://${folderName}`;
  },

  /** Liest Verzeichnisinhalt */
  async readDir(dirPath) {
    const cap = await getFS();
    if (!cap) return [];

    const { Filesystem } = cap;
    const { scheme, path } = parsePath(dirPath);
    const dir = await resolveDir(scheme);

    try {
      const result = await Filesystem.readdir({ path, directory: dir });
      return result.files.map((entry) => ({
        name: entry.name,
        path: `${dirPath}/${entry.name}`,
        isDirectory: entry.type === "directory",
      }));
    } catch (e) {
      console.error("nativeFS.readDir failed:", e);
      return [];
    }
  },

  /** Liest Dateiinhalt als UTF-8 string */
  async readFile(filePath) {
    const cap = await getFS();
    if (!cap) throw new Error("Filesystem nicht verfügbar");

    const { Filesystem, Encoding } = cap;
    const { scheme, path } = parsePath(filePath);
    const dir = await resolveDir(scheme);

    const result = await Filesystem.readFile({
      path,
      directory: dir,
      encoding: Encoding.UTF8,
    });
    return typeof result.data === "string" ? result.data : "";
  },

  /** Schreibt UTF-8 Dateiinhalt */
  async writeFile(filePath, content) {
    const cap = await getFS();
    if (!cap) return false;

    const { Filesystem, Encoding } = cap;
    const { scheme, path } = parsePath(filePath);
    const dir = await resolveDir(scheme);

    await Filesystem.writeFile({
      path,
      data: content,
      directory: dir,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return true;
  },

  /** Erstellt Verzeichnis (inkl. übergeordnete) */
  async mkdir(dirPath) {
    const cap = await getFS();
    if (!cap) return false;

    const { Filesystem } = cap;
    const { scheme, path } = parsePath(dirPath);
    const dir = await resolveDir(scheme);

    await Filesystem.mkdir({ path, directory: dir, recursive: true });
    return true;
  },

  /** Löscht Datei oder Verzeichnis */
  async delete(targetPath) {
    const cap = await getFS();
    if (!cap) return false;

    const { Filesystem } = cap;
    const { scheme, path } = parsePath(targetPath);
    const dir = await resolveDir(scheme);

    try {
      await Filesystem.deleteFile({ path, directory: dir });
    } catch {
      try {
        await Filesystem.rmdir({ path, directory: dir, recursive: true });
      } catch (e2) {
        console.error("nativeFS.delete failed:", e2);
        return false;
      }
    }
    return true;
  },

  /** Benennt Datei/Ordner um */
  async rename(oldPath, newPath) {
    const cap = await getFS();
    if (!cap) return false;

    const { Filesystem } = cap;
    const { scheme: fromScheme, path: from } = parsePath(oldPath);
    const { path: to } = parsePath(newPath);
    const dir = await resolveDir(fromScheme);

    await Filesystem.rename({ from, to, directory: dir, toDirectory: dir });
    return true;
  },
};

/** Pfad-Separator — auf Mobile immer "/" */
export const SEP = "/";
