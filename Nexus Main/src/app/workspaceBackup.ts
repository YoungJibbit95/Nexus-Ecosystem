import type { ThemeTransferPayload } from "../views/settings/themeTransfer";
import { validateWorkspaceBackupData } from "./workspaceBackupValidation";
import { preparePlanningDocument } from "../../../packages/nexus-core/src/planning/formats";
import type { PlanningDocument } from "../../../packages/nexus-core/src/planning/domain";
import { prepareReminderPortable, type ReminderPortableState } from "../../../packages/nexus-core/src/reminders/reminderDomain";

export const WORKSPACE_BACKUP_SCHEMA_VERSION = 2;
export const WORKSPACE_BACKUP_DB_NAME = "nexus-main-workspace-backups-v1";
export const WORKSPACE_BACKUP_STORE_NAME = "snapshots";
export const WORKSPACE_BACKUP_MAX_LOCAL = 8;

export type WorkspaceBackupReason = "manual" | "before-restore" | "import-preview";

export type WorkspaceBackupSnapshot = {
  schemaVersion: 1 | 2;
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
    planning?: PlanningDocument;
    reminderOccurrences?: ReminderPortableState;
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
  planning?: PlanningDocument;
  reminderOccurrences?: ReminderPortableState;
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
  planning,
  reminderOccurrences,
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
    ...(planning === undefined ? {} : { planning: preparePlanningDocument(planning) }),
    ...(reminderOccurrences === undefined ? {} : { reminderOccurrences: prepareReminderPortable(reminderOccurrences) }),
  };

  const detachedData = JSON.parse(JSON.stringify(data)) as WorkspaceBackupSnapshot["data"];
  const base = {
    schemaVersion: (planning === undefined ? 1 : WORKSPACE_BACKUP_SCHEMA_VERSION) as 1 | 2,
    id: makeId(),
    label: label?.trim() || `Nexus Backup ${new Date().toLocaleString()}`,
    reason,
    createdAt: nowIso(),
    appVersion: "6.0.0" as const,
    checksum: "",
    stats: buildStats(detachedData),
    data: detachedData,
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
  try {
    if (!isRecord(raw)) throw new Error("Backup JSON object expected.");
    if (raw.schemaVersion !== 1 && raw.schemaVersion !== WORKSPACE_BACKUP_SCHEMA_VERSION) throw new Error("Unsupported backup schema version.");
    for (const key of ["id", "label", "createdAt", "appVersion", "checksum"]) {
      if (typeof raw[key] !== "string" || !raw[key]) throw new Error(`Invalid backup metadata: ${key}`);
    }
    if (!["manual", "before-restore", "import-preview"].includes(String(raw.reason))) throw new Error("Invalid backup reason.");
    if (!isRecord(raw.stats)) throw new Error("Backup statistics are missing.");
    validateWorkspaceBackupData(raw.data, raw.schemaVersion);
    const snapshot = raw as WorkspaceBackupSnapshot;
    // Schema 1 computed the checksum before filling the informational byte count.
    const base = { ...snapshot, checksum: "", stats: { ...snapshot.stats, bytes: 0 } };
    const checksums = [hashWorkspaceBackupText(stableJson(base))];
    // Earlier writers included an undefined optional theme before JSON export.
    if (snapshot.schemaVersion === 1 && !Object.prototype.hasOwnProperty.call(snapshot.data, "theme")) {
      checksums.push(hashWorkspaceBackupText(stableJson({ ...base, data: { ...base.data, theme: undefined } })));
    }
    if (!checksums.includes(snapshot.checksum)) throw new Error("Backup checksum mismatch; no data was changed.");
    const normalized = JSON.parse(JSON.stringify(snapshot)) as WorkspaceBackupSnapshot;
    normalized.stats = buildStats(normalized.data, stableJson(normalized).length);
    return { ok: true as const, snapshot: normalized };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Invalid backup data." };
  }
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
  current: Pick<SnapshotSources, "app" | "canvas" | "workspaces" | "workspaceFs" | "terminal" | "theme" | "planning">,
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
      snapshot.schemaVersion === 2
        ? "Version 2 also replaces fixed events, work blocks, duration estimates and explicit availability."
        : "Version 1 contains no planning. Existing planning is retained; links to replaced tasks may require repair.",
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

const mutateBackup = async (apply: (store: IDBObjectStore) => void) => {
  const db = await openBackupDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(WORKSPACE_BACKUP_STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("Backup transaction failed"));
      apply(tx.objectStore(WORKSPACE_BACKUP_STORE_NAME));
    });
  } finally { db.close(); }
};

export const deleteWorkspaceBackup = (id: string) => mutateBackup(store => { store.delete(id); });

export const saveWorkspaceBackup = async (snapshot: WorkspaceBackupSnapshot) => {
  const parsed = parseWorkspaceBackupSnapshot(snapshot);
  if (!parsed.ok) throw new Error(parsed.message);
  await mutateBackup(store => { store.put(parsed.snapshot); });
  const all = await listWorkspaceBackups();
  await Promise.all(all.slice(WORKSPACE_BACKUP_MAX_LOCAL).map((backup) => deleteWorkspaceBackup(backup.id)));
  return parsed.snapshot;
};

export const downloadWorkspaceBackup = (snapshot: WorkspaceBackupSnapshot) => {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexus-workspace-backup-${snapshot.createdAt.slice(0, 10)}-${snapshot.checksum}.json`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 0);
};
