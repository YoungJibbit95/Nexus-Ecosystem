const FILES_INDEX_STORAGE_KEY = "nexus-code-files-index-v2";
const LEGACY_FILES_STORAGE_KEY = "nexus-code-files";

<<<<<<< HEAD
=======
export const WELCOME_WORKSPACE_ITEMS = Object.freeze([
  {
    id: "workspace",
    label: "Workspace",
    title: "Open local folder",
    detail: "Tree, terminal cwd and Git context",
  },
  {
    id: "drafts",
    label: "Recent",
    title: "Resume local drafts",
    detail: "Stored scratch files stay close",
  },
  {
    id: "shell",
    label: "Shell",
    title: "Tune the workbench",
    detail: "Theme, editor and runtime surface",
  },
]);

>>>>>>> 04ddd4b79c332ffc5e621dc5fdeeed1214eea803
function canReadLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function readJsonFromStorage(key) {
  if (!canReadLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getShortPathLabel(value) {
  const parts = String(value || "")
    .split(/[\\/]/)
    .filter(Boolean);

  if (parts.length <= 2) return parts.join(" / ");
  return parts.slice(-2).join(" / ");
}

function normalizeRecentFile(file, index) {
  const rawName = file?.name || file?.path || file?.fsPath || "";
  const name = String(rawName).split(/[\\/]/).filter(Boolean).pop();
  const fileName = name || `Draft ${index + 1}`;
  const sourcePath = file?.fsPath || file?.path || "";
  const language = file?.language || file?.languageId || file?.type || "text";
  const detail = sourcePath ? getShortPathLabel(sourcePath) : String(language);

  return {
    id: String(file?.id || `${fileName}-${index}`),
    name: fileName,
    detail,
<<<<<<< HEAD
    meta: sourcePath ? "project" : "draft",
=======
    meta: sourcePath ? "workspace" : "draft",
>>>>>>> 04ddd4b79c332ffc5e621dc5fdeeed1214eea803
  };
}

export function getWelcomeRecentFiles(limit = 3) {
  const indexedFiles = readJsonFromStorage(FILES_INDEX_STORAGE_KEY);
  const legacyFiles = readJsonFromStorage(LEGACY_FILES_STORAGE_KEY);
  const files = Array.isArray(indexedFiles)
    ? indexedFiles
    : Array.isArray(legacyFiles)
      ? legacyFiles
      : [];

  return files
    .filter((file) => file && file.type !== "folder")
    .map(normalizeRecentFile)
    .slice(0, limit);
}
