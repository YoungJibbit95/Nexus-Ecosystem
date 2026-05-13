import type { ThemeTransferPayload } from "../views/settings/themeTransfer";

export const WORKSPACE_BACKUP_SCHEMA_VERSION = 1;
export const WORKSPACE_BACKUP_DB_NAME = "nexus-main-workspace-backups-v1";
export const WORKSPACE_BACKUP_STORE_NAME = "snapshots";
export const WORKSPACE_BACKUP_MAX_LOCAL = 8;

export type WorkspaceBackupReason = "manual" | "before-restore" | "import-preview";

export type WorkspaceBackupSnapshot = {
  schemaVersion: typeof WORKSPACE_BACKUP_SCHEMA_VERSION;
  id: string;
  label: string;
  reason: WorkspaceBackupReason;
  createdAt: string;
  appVersion: "6.0.0";
  checksum: string;
  stats: WorkspaceBackupStats;
  data: {
    app: {
      notes: unknown[];
      openNoteIds: string[];
      activeNoteId: string | null;
      codes: unknown[];
      openCodeIds: string[];
      activeCodeId: string | null;
      tasks: unknown[];
      reminders: unknown[];
      folders: unknown[];
      activities: unknown[];
    };
    canvas: {
      canvases: unknown[];
      activeCanvasId: string | null;
      viewport: unknown;
    };
    workspaces: {
      workspaces: unknown[];
      activeWorkspaceId: string | null;
    };
    workspaceFs: {
      rootPath: string;
      autoSync: boolean;
      lastSyncAt: string | null;
      lastSyncMode: string | null;
    };
    terminal: {
      history: unknown[];
      lastCommand: string;
      macros: Record<string, string[]>;
      recordingMacro: string | null;
      undoStack: string[];
      redoStack: string[];
    };
    theme?: ThemeTransferPayload;
  };
};

export type WorkspaceBackupStats = {
  notes: number;
  codes: number;
  tasks: number;
  reminders: number;
  folders: number;
  activities: number;
  canvases: number;
  canvasNodes: number;
  workspaces: number;
  macros: number;
  bytes: number;
};

export type WorkspaceBackupMeta = Pick<
  WorkspaceBackupSnapshot,
  "id" | "label" | "reason" | "createdAt" | "appVersion" | "checksum" | "stats"
>;

export type WorkspaceBackupConflict = {
  type: "note" | "code" | "task" | "reminder" | "folder" | "canvas" | "workspace";
  id: string;
  title: string;
  currentUpdated?: string;
  incomingUpdated?: string;
};

export type WorkspaceBackupPreview = {
  incoming: WorkspaceBackupStats;
  current: WorkspaceBackupStats;
  conflicts: WorkspaceBackupConflict[];
  newItems: number;
  replaceWarnings: string[];
};

type SnapshotSources = {
  app: any;
  canvas: any;
  workspaces: any;
  workspaceFs: any;
  terminal: any;
  theme?: ThemeTransferPayload;
  label?: string;
  reason?: WorkspaceBackupReason;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const strArr = (value: unknown): string[] => arr(value).filter((item): item is string => typeof item === "string");
const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

export const hashWorkspaceBackupText = (text: string) => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const nowIso = () => new Date().toISOString();

const makeId = () => `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const itemTitle = (item: unknown) => {
  if (!isRecord(item)) return "Untitled";
  return String(item.title || item.name || item.id || "Untitled");
};

const itemUpdated = (item: unknown) => {
  if (!isRecord(item)) return undefined;
  const updated = item.updated || item.lastSaved || item.lastAccessed || item.created;
  return typeof updated === "string" ? updated : undefined;
};

const countCanvasNodes = (canvases: unknown[]) =>
  canvases.reduce<number>((total, canvas) => total + (isRecord(canvas) ? arr(canvas.nodes).length : 0), 0);

const buildStats = (data: WorkspaceBackupSnapshot["data"], bytes = 0): WorkspaceBackupStats => ({
  notes: data.app.notes.length,
  codes: data.app.codes.length,
  tasks: data.app.tasks.length,
  reminders: data.app.reminders.length,
  folders: data.app.folders.length,
  activities: data.app.activities.length,
  canvases: data.canvas.canvases.length,
  canvasNodes: countCanvasNodes(data.canvas.canvases),
  workspaces: data.workspaces.workspaces.length,
  macros: Object.keys(data.terminal.macros || {}).length,
  bytes,
});

export const createWorkspaceBackupSnapshot = ({
  app,
  canvas,
  workspaces,
  workspaceFs,
  terminal,
  theme,
  label,
  reason = "manual",
}: SnapshotSources): WorkspaceBackupSnapshot => {
  const data: WorkspaceBackupSnapshot["data"] = {
    app: {
      notes: arr(app?.notes),
      openNoteIds: strArr(app?.openNoteIds),
      activeNoteId: stringOrNull(app?.activeNoteId),
      codes: arr(app?.codes),
      openCodeIds: strArr(app?.openCodeIds),
      activeCodeId: stringOrNull(app?.activeCodeId),
      tasks: arr(app?.tasks),
      reminders: arr(app?.reminders),
      folders: arr(app?.folders),
      activities: arr(app?.activities),
    },
    canvas: {
      canvases: arr(canvas?.canvases),
      activeCanvasId: stringOrNull(canvas?.activeCanvasId),
      viewport: isRecord(canvas?.viewport) ? canvas.viewport : { panX: 0, panY: 0, zoom: 1 },
    },
    workspaces: {
      workspaces: arr(workspaces?.workspaces),
      activeWorkspaceId: stringOrNull(workspaces?.activeWorkspaceId),
    },
    workspaceFs: {
      rootPath: typeof workspaceFs?.rootPath === "string" ? workspaceFs.rootPath : "",
      autoSync: Boolean(workspaceFs?.autoSync),
      lastSyncAt: stringOrNull(workspaceFs?.lastSyncAt),
      lastSyncMode: stringOrNull(workspaceFs?.lastSyncMode),
    },
    terminal: {
      history: arr(terminal?.history).slice(-140),
      lastCommand: typeof terminal?.lastCommand === "string" ? terminal.lastCommand : "",
      macros: isRecord(terminal?.macros) ? (terminal.macros as Record<string, string[]>) : {},
      recordingMacro: stringOrNull(terminal?.recordingMacro),
      undoStack: strArr(terminal?.undoStack).slice(-120),
      redoStack: strArr(terminal?.redoStack).slice(-120),
    },
    theme,
  };

  const base = {
    schemaVersion: WORKSPACE_BACKUP_SCHEMA_VERSION as typeof WORKSPACE_BACKUP_SCHEMA_VERSION,
    id: makeId(),
    label: label?.trim() || `Nexus Backup ${new Date().toLocaleString()}`,
    reason,
    createdAt: nowIso(),
    appVersion: "6.0.0" as const,
    checksum: "",
    stats: buildStats(data),
    data,
  };
  const withoutChecksum = { ...base, checksum: "" };
  const checksum = hashWorkspaceBackupText(stableJson(withoutChecksum));
  const withChecksum = { ...base, checksum };
  return {
    ...withChecksum,
    stats: buildStats(data, stableJson(withChecksum).length),
  };
};

export const parseWorkspaceBackupSnapshot = (raw: unknown) => {
  if (!isRecord(raw)) return { ok: false as const, message: "Backup JSON object expected." };
  if (raw.schemaVersion !== WORKSPACE_BACKUP_SCHEMA_VERSION) {
    return { ok: false as const, message: "Unsupported backup schema version." };
  }
  if (!isRecord(raw.data) || !isRecord(raw.data.app) || !isRecord(raw.data.canvas)) {
    return { ok: false as const, message: "Backup data is incomplete." };
  }
  const snapshot = raw as WorkspaceBackupSnapshot;
  const normalized = {
    ...snapshot,
    appVersion: "6.0.0" as const,
    stats: buildStats(snapshot.data, stableJson(snapshot).length),
  };
  return { ok: true as const, snapshot: normalized };
};

const idMap = (items: unknown[]) => {
  const map = new Map<string, unknown>();
  items.forEach((item) => {
    if (isRecord(item) && typeof item.id === "string") map.set(item.id, item);
  });
  return map;
};

const collectConflicts = (
  type: WorkspaceBackupConflict["type"],
  current: unknown[],
  incoming: unknown[],
): { conflicts: WorkspaceBackupConflict[]; newItems: number } => {
  const currentById = idMap(current);
  let newItems = 0;
  const conflicts: WorkspaceBackupConflict[] = [];
  incoming.forEach((item) => {
    if (!isRecord(item) || typeof item.id !== "string") return;
    const existing = currentById.get(item.id);
    if (!existing) {
      newItems += 1;
      return;
    }
    if (hashWorkspaceBackupText(stableJson(existing)) !== hashWorkspaceBackupText(stableJson(item))) {
      conflicts.push({
        type,
        id: item.id,
        title: itemTitle(item),
        currentUpdated: itemUpdated(existing),
        incomingUpdated: itemUpdated(item),
      });
    }
  });
  return { conflicts, newItems };
};

export const createWorkspaceBackupPreview = (
  snapshot: WorkspaceBackupSnapshot,
  current: Pick<SnapshotSources, "app" | "canvas" | "workspaces" | "workspaceFs" | "terminal" | "theme">,
): WorkspaceBackupPreview => {
  const currentSnapshot = createWorkspaceBackupSnapshot({ ...current, reason: "import-preview", label: "current" });
  const groups = [
    collectConflicts("note", currentSnapshot.data.app.notes, snapshot.data.app.notes),
    collectConflicts("code", currentSnapshot.data.app.codes, snapshot.data.app.codes),
    collectConflicts("task", currentSnapshot.data.app.tasks, snapshot.data.app.tasks),
    collectConflicts("reminder", currentSnapshot.data.app.reminders, snapshot.data.app.reminders),
    collectConflicts("folder", currentSnapshot.data.app.folders, snapshot.data.app.folders),
    collectConflicts("canvas", currentSnapshot.data.canvas.canvases, snapshot.data.canvas.canvases),
    collectConflicts("workspace", currentSnapshot.data.workspaces.workspaces, snapshot.data.workspaces.workspaces),
  ];
  return {
    incoming: snapshot.stats,
    current: currentSnapshot.stats,
    conflicts: groups.flatMap((group) => group.conflicts).slice(0, 40),
    newItems: groups.reduce((total, group) => total + group.newItems, 0),
    replaceWarnings: [
      "Restore replaces local Notes, Code files, Tasks, Reminders, Canvas boards and Workspace mappings.",
      "Auth/session tokens, passwords and API credentials are not part of backups.",
      "A before-restore backup is created automatically before applying imported data.",
    ],
  };
};

const openBackupDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(WORKSPACE_BACKUP_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_BACKUP_STORE_NAME)) {
        db.createObjectStore(WORKSPACE_BACKUP_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

const txStore = (db: IDBDatabase, mode: IDBTransactionMode) =>
  db.transaction(WORKSPACE_BACKUP_STORE_NAME, mode).objectStore(WORKSPACE_BACKUP_STORE_NAME);

export const listWorkspaceBackups = async (): Promise<WorkspaceBackupMeta[]> => {
  const db = await openBackupDb();
  return new Promise((resolve, reject) => {
    const request = txStore(db, "readonly").getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve(
        (request.result as WorkspaceBackupSnapshot[])
          .map(({ data: _data, ...meta }) => meta)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    };
  });
};

export const readWorkspaceBackup = async (id: string): Promise<WorkspaceBackupSnapshot | null> => {
  const db = await openBackupDb();
  return new Promise((resolve, reject) => {
    const request = txStore(db, "readonly").get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as WorkspaceBackupSnapshot | undefined) || null);
    };
  });
};

export const deleteWorkspaceBackup = async (id: string) => {
  const db = await openBackupDb();
  await new Promise<void>((resolve, reject) => {
    const request = txStore(db, "readwrite").delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  db.close();
};

export const saveWorkspaceBackup = async (snapshot: WorkspaceBackupSnapshot) => {
  const db = await openBackupDb();
  await new Promise<void>((resolve, reject) => {
    const request = txStore(db, "readwrite").put(snapshot);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
  db.close();

  const all = await listWorkspaceBackups();
  await Promise.all(all.slice(WORKSPACE_BACKUP_MAX_LOCAL).map((backup) => deleteWorkspaceBackup(backup.id)));
  return snapshot;
};

export const downloadWorkspaceBackup = (snapshot: WorkspaceBackupSnapshot) => {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `nexus-workspace-backup-${snapshot.createdAt.slice(0, 10)}-${snapshot.checksum}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};
