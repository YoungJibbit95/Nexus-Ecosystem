import React, { useEffect, useMemo, useState } from "react";
import { safeJsonParse } from "@nexus/core/settings";
import { Download, RotateCcw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useApp } from "../../store/appStore";
import { useCanvas } from "../../store/canvasStore";
import { useTerminal } from "../../store/terminalStore";
import { useTheme } from "../../store/themeStore";
import { useWorkspaceFs } from "../../store/workspaceFsStore";
import { useWorkspaces } from "../../store/workspaceStore";
import {
  createWorkspaceBackupPreview,
  createWorkspaceBackupSnapshot,
  deleteWorkspaceBackup,
  downloadWorkspaceBackup,
  listWorkspaceBackups,
  parseWorkspaceBackupSnapshot,
  readWorkspaceBackup,
  saveWorkspaceBackup,
  type WorkspaceBackupMeta,
  type WorkspaceBackupPreview,
  type WorkspaceBackupSnapshot,
} from "../../app/workspaceBackup";
import { applyThemeTransferPayload, buildThemeTransferPayload } from "./themeTransfer";
import { ModuleCard, Row } from "./SettingsPrimitives";

type PreviewState = {
  source: "file" | "local";
  snapshot: WorkspaceBackupSnapshot;
  preview: WorkspaceBackupPreview;
};

type SettingsBackupRestorePanelProps = {
  toast: (text: string) => void;
};

const buttonStyle = (accent?: string): React.CSSProperties => ({
  borderRadius: 11,
  border: accent ? `1px solid ${accent}55` : "1px solid rgba(255,255,255,0.12)",
  background: accent ? `${accent}20` : "rgba(255,255,255,0.04)",
  color: accent || "inherit",
  padding: "10px 11px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 780,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
});

const miniStat = (label: string, value: number | string) => (
  <div
    key={label}
    style={{
      borderRadius: 11,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.035)",
      padding: "8px 9px",
      minWidth: 92,
    }}
  >
    <div style={{ fontSize: 10, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6 }}>
      {label}
    </div>
    <div style={{ fontSize: 16, fontWeight: 900 }}>{value}</div>
  </div>
);

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function SettingsBackupRestorePanel({ toast }: SettingsBackupRestorePanelProps) {
  const t = useTheme();
  const counts = {
    notes: useApp((state) => state.notes.length),
    codes: useApp((state) => state.codes.length),
    tasks: useApp((state) => state.tasks.length),
    reminders: useApp((state) => state.reminders.length),
    canvases: useCanvas((state) => state.canvases.length),
    workspaces: useWorkspaces((state) => state.workspaces.length),
    macros: useTerminal((state) => Object.keys(state.macros).length),
  };
  const [backups, setBackups] = useState<WorkspaceBackupMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  const [labelDraft, setLabelDraft] = useState("");

  const currentSources = () => ({
    app: useApp.getState(),
    canvas: useCanvas.getState(),
    workspaces: useWorkspaces.getState(),
    workspaceFs: useWorkspaceFs.getState(),
    terminal: useTerminal.getState(),
    theme: buildThemeTransferPayload(useTheme.getState()),
  });

  const reloadBackups = async () => {
    try {
      setBackups(await listWorkspaceBackups());
    } catch (error) {
      console.warn("[backup] list failed", error);
    }
  };

  useEffect(() => {
    void reloadBackups();
  }, []);

  const currentStats = useMemo(
    () => [
      miniStat("Notes", counts.notes),
      miniStat("Tasks", counts.tasks),
      miniStat("Reminders", counts.reminders),
      miniStat("Code", counts.codes),
      miniStat("Canvas", counts.canvases),
      miniStat("Workspaces", counts.workspaces),
      miniStat("Macros", counts.macros),
    ],
    [counts.notes, counts.tasks, counts.reminders, counts.codes, counts.canvases, counts.workspaces, counts.macros],
  );

  const createBackup = async (download: boolean) => {
    setBusy(true);
    try {
      const snapshot = createWorkspaceBackupSnapshot({
        ...currentSources(),
        label: labelDraft || undefined,
        reason: "manual",
      });
      await saveWorkspaceBackup(snapshot);
      if (download) downloadWorkspaceBackup(snapshot);
      setLabelDraft("");
      await reloadBackups();
      toast(download ? "Backup gespeichert und exportiert" : "Lokales Backup gespeichert");
    } catch (error) {
      console.error("[backup] create failed", error);
      toast("Backup fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const showPreview = (snapshot: WorkspaceBackupSnapshot, source: PreviewState["source"]) => {
    setPreviewState({
      source,
      snapshot,
      preview: createWorkspaceBackupPreview(snapshot, currentSources()),
    });
  };

  const importBackupFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast("Nur JSON-Backups erlaubt");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast("Backup ist groesser als 25MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = safeJsonParse<unknown>(String(reader.result || "{}"), null);
      if (!data) {
        toast("Backup JSON konnte nicht gelesen werden");
        return;
      }
      const parsed = parseWorkspaceBackupSnapshot(data);
      if (!parsed.ok) {
        toast(parsed.message);
        return;
      }
      showPreview(parsed.snapshot, "file");
      toast("Import kann geprueft werden");
    };
    reader.readAsText(file);
  };

  const applySnapshot = async (snapshot: WorkspaceBackupSnapshot) => {
    if (!window.confirm("Workspace wirklich aus Backup wiederherstellen? Vorher wird automatisch ein Safety-Backup erstellt.")) {
      return;
    }
    setBusy(true);
    try {
      const safety = createWorkspaceBackupSnapshot({
        ...currentSources(),
        label: `Before restore ${new Date().toLocaleString()}`,
        reason: "before-restore",
      });
      await saveWorkspaceBackup(safety);
      useApp.setState(snapshot.data.app as any);
      useCanvas.setState(snapshot.data.canvas as any);
      useWorkspaces.setState(snapshot.data.workspaces as any);
      useWorkspaceFs.setState(snapshot.data.workspaceFs as any);
      useTerminal.setState(snapshot.data.terminal as any);
      if (snapshot.data.theme) {
        applyThemeTransferPayload(useTheme.getState(), snapshot.data.theme, { includeReleaseFrozen: false });
      }
      setPreviewState(null);
      await reloadBackups();
      toast("Workspace wiederhergestellt");
    } catch (error) {
      console.error("[backup] restore failed", error);
      toast("Wiederherstellung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const openLocalPreview = async (id: string) => {
    const snapshot = await readWorkspaceBackup(id);
    if (!snapshot) {
      toast("Backup nicht gefunden");
      await reloadBackups();
      return;
    }
    showPreview(snapshot, "local");
  };

  const exportLocalBackup = async (id: string) => {
    const snapshot = await readWorkspaceBackup(id);
    if (!snapshot) {
      toast("Backup nicht gefunden");
      return;
    }
    downloadWorkspaceBackup(snapshot);
  };

  const removeLocalBackup = async (id: string) => {
    if (!window.confirm("Lokales Backup wirklich loeschen?")) return;
    await deleteWorkspaceBackup(id);
    await reloadBackups();
    toast("Backup geloescht");
  };

  return (
    <ModuleCard
      title="Backup und Restore"
      desc="Workspace sichern, lokale Versionen behalten und Importe vor dem Anwenden pruefen."
    >
      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(48,209,88,0.26)",
          background: "rgba(48,209,88,0.07)",
          padding: "9px 10px",
          fontSize: 11,
          lineHeight: 1.45,
          marginBottom: 10,
        }}
      >
        <strong>Sicherheit:</strong> Backups enthalten Workspace-Daten, Canvas,
        Workspaces, Terminal-Makros und Theme. Login-Tokens, Passwoerter und
        API-Secrets werden nicht exportiert.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {currentStats}
      </div>
      <Row>
        <input
          value={labelDraft}
          onChange={(event) => setLabelDraft(event.target.value)}
          placeholder="Optionaler Backup-Name"
          style={{
            minWidth: 220,
            borderRadius: 11,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit",
            fontSize: 12,
            padding: "10px 11px",
            outline: "none",
          }}
        />
        <button disabled={busy} onClick={() => void createBackup(false)} style={buttonStyle(t.accent)}>
          <ShieldCheck size={13} /> Lokal sichern
        </button>
        <button disabled={busy} onClick={() => void createBackup(true)} style={buttonStyle()}>
          <Download size={13} /> Backup exportieren
        </button>
        <label style={buttonStyle()}>
          <Upload size={13} /> Backup importieren
          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importBackupFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </Row>

      {previewState ? (
        <div
          style={{
            marginTop: 12,
            borderRadius: 14,
            border: `1px solid ${t.accent}55`,
            background: `${t.accent}12`,
            padding: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 850, color: t.accent, textTransform: "uppercase" }}>
                Import Preview
              </div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>{previewState.snapshot.label}</div>
              <div style={{ fontSize: 10, opacity: 0.62 }}>
                {previewState.source === "file" ? "Datei-Import" : "Lokales Backup"} · {previewState.snapshot.createdAt} · {previewState.snapshot.checksum}
              </div>
            </div>
            <button disabled={busy} onClick={() => void applySnapshot(previewState.snapshot)} style={buttonStyle("#30d158")}>
              <RotateCcw size={13} /> Restore anwenden
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {miniStat("Incoming Notes", previewState.preview.incoming.notes)}
            {miniStat("Incoming Tasks", previewState.preview.incoming.tasks)}
            {miniStat("Canvas Nodes", previewState.preview.incoming.canvasNodes)}
            {miniStat("New IDs", previewState.preview.newItems)}
            {miniStat("Conflicts", previewState.preview.conflicts.length)}
            {miniStat("Size", formatBytes(previewState.snapshot.stats.bytes))}
          </div>
          <div style={{ display: "grid", gap: 4, marginTop: 10, fontSize: 11, opacity: 0.74 }}>
            {previewState.preview.replaceWarnings.map((warning) => (
              <div key={warning}>- {warning}</div>
            ))}
          </div>
          {previewState.preview.conflicts.length > 0 ? (
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {previewState.preview.conflicts.slice(0, 8).map((conflict) => (
                <div
                  key={`${conflict.type}-${conflict.id}`}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(255,159,10,0.28)",
                    background: "rgba(255,159,10,0.07)",
                    padding: "7px 9px",
                    fontSize: 11,
                  }}
                >
                  <strong>{conflict.type}</strong> · {conflict.title}
                  <span style={{ opacity: 0.55 }}> · {conflict.id}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 850 }}>Lokale Backup-Versionen</div>
        {backups.length === 0 ? (
          <div style={{ fontSize: 11, opacity: 0.62 }}>Noch keine lokalen Backups vorhanden.</div>
        ) : (
          backups.map((backup) => (
            <div
              key={backup.id}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.035)",
                padding: "8px 9px",
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{backup.label}</div>
                <div style={{ fontSize: 10, opacity: 0.58 }}>
                  {backup.reason} · {backup.createdAt} · {backup.stats.notes} notes · {backup.stats.tasks} tasks · {backup.stats.canvases} canvases
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => void openLocalPreview(backup.id)} style={buttonStyle(t.accent)}>
                  Pruefen
                </button>
                <button onClick={() => void exportLocalBackup(backup.id)} style={buttonStyle()}>
                  <Download size={12} /> Export
                </button>
                <button onClick={() => void removeLocalBackup(backup.id)} style={buttonStyle("#ff453a")}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </ModuleCard>
  );
}
