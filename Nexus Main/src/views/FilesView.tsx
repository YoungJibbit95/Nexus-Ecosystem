import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Download,
  FolderOpen,
  Grid3x3,
  Layers,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useApp } from "../store/appStore";
import { useCanvas } from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { useWorkspaces, type Workspace } from "../store/workspaceStore";
import { hexToRgb } from "../lib/utils";
import { InteractiveActionButton } from "../components/render/InteractiveActionButton";
import {
  AssignModal,
  FileCard,
  WorkspaceModal,
} from "./files/FilesUiParts";
import type { FileItem, ItemType, ViewMode } from "./files/filesTypes";
import { useWorkspaceSync } from "./files/useWorkspaceSync";

export function FilesView() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const { notes, codes, tasks, reminders } = useApp();
  const { canvases } = useCanvas();
  const { workspaces, activeWorkspaceId, setActive } = useWorkspaces();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [tab, setTab] = useState<"all" | "workspaces">("all");
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [editWs, setEditWs] = useState<Workspace | null>(null);
  const [assignItem, setAssignItem] = useState<FileItem | null>(null);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const {
    workspaceRoot,
    autoSync,
    setAutoSync,
    syncing,
    syncMsg,
    loadingWorkspace,
    selectWorkspaceRoot,
    importWorkspaceFromDisk,
    exportWorkspaceToDisk,
  } = useWorkspaceSync({
    notes,
    codes,
    tasks,
    reminders,
    canvases,
    workspaces,
    activeWorkspaceId,
  });

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  const allItems = useMemo((): FileItem[] => {
    const items: FileItem[] = [];
    notes.forEach((note) => {
      items.push({
        id: note.id,
        title: note.title || "Untitled",
        type: "note",
        updated: note.updated || note.created,
        preview: note.content?.slice(0, 80),
      });
    });
    codes.forEach((code) => {
      items.push({
        id: code.id,
        title: code.name,
        type: "code",
        updated: code.updated || code.created,
        preview: `${code.lang} · ${(code.content || "").split("\n").length} lines`,
        lang: code.lang,
      });
    });
    tasks.forEach((task) => {
      items.push({
        id: task.id,
        title: task.title,
        type: "task",
        updated: task.updated || task.created,
        preview: task.desc?.slice(0, 60),
        priority: task.priority,
        status: task.status,
      });
    });
    reminders.forEach((reminder) => {
      items.push({
        id: reminder.id,
        title: reminder.title,
        type: "reminder",
        updated: reminder.datetime,
        preview: reminder.msg?.slice(0, 60),
      });
    });
    return items.sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    );
  }, [notes, codes, tasks, reminders]);

  const filtered = useMemo(() => {
    let items = allItems;
    if (typeFilter !== "all") items = items.filter((item) => item.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.preview?.toLowerCase().includes(q),
      );
    }
    if (onlyUnassigned) {
      items = items.filter(
        (item) =>
          !workspaces.some((workspace) =>
            (workspace[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id),
          ),
      );
    }
    return items;
  }, [allItems, onlyUnassigned, search, typeFilter, workspaces]);

  const wsItems = useMemo(() => {
    if (!activeWs) return filtered;
    return filtered.filter((item) => {
      const key = `${item.type}Ids` as keyof Workspace;
      return (activeWs[key] as string[]).includes(item.id);
    });
  }, [activeWs, filtered]);

  const displayItems = tab === "workspaces" && activeWs ? wsItems : filtered;

  const wsItemCount = (workspace: Workspace) =>
    workspace.noteIds.length +
    workspace.codeIds.length +
    workspace.taskIds.length +
    workspace.reminderIds.length;

  const getItemWsColor = (item: FileItem) => {
    const workspace = workspaces.find((entry) =>
      (entry[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id),
    );
    return workspace?.color;
  };

  const unassignedCount = useMemo(
    () =>
      allItems.filter(
        (item) =>
          !workspaces.some((workspace) =>
            (workspace[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id),
          ),
      ).length,
    [allItems, workspaces],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 12px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Files & Workspaces</div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>
              {allItems.length} Items · {workspaces.length} Workspaces
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <InteractiveActionButton
              onClick={() => setNewWsOpen(true)}
              motionId="files-create-workspace"
              areaHint={96}
              radius={10}
              style={{
                border: `1px solid rgba(${rgb},0.3)`,
                background: `rgba(${rgb},0.14)`,
                color: t.accent,
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={13} /> Workspace
            </InteractiveActionButton>
            <div style={{ position: "relative" }}>
              <InteractiveActionButton
                onClick={() => setHeaderMenuOpen((prev) => !prev)}
                motionId="files-workspace-flow-menu"
                areaHint={92}
                radius={10}
                selected={headerMenuOpen}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.05)",
                  color: "inherit",
                  borderRadius: 10,
                  padding: "7px 9px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <FolderOpen size={12} /> Workspace Flow <MoreHorizontal size={12} />
              </InteractiveActionButton>
              {headerMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 60,
                    minWidth: 210,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(17,20,31,0.96)",
                    backdropFilter: "blur(12px)",
                    padding: 6,
                    boxShadow: "0 14px 38px rgba(0,0,0,0.35)",
                  }}
                >
                  <InteractiveActionButton
                    onClick={() => {
                      void selectWorkspaceRoot();
                      setHeaderMenuOpen(false);
                    }}
                    motionId="files-workspace-select-root"
                    areaHint={76}
                    radius={8}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "none", borderRadius: 8, background: "transparent", color: "inherit", cursor: "pointer", fontSize: 12, fontWeight: 650 }}
                  >
                    <FolderOpen size={12} /> Workspace Ordner wählen
                  </InteractiveActionButton>
                  <InteractiveActionButton
                    onClick={() => {
                      void importWorkspaceFromDisk();
                      setHeaderMenuOpen(false);
                    }}
                    disabled={loadingWorkspace || syncing}
                    motionId="files-workspace-import"
                    areaHint={76}
                    radius={8}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "none", borderRadius: 8, background: "transparent", color: "inherit", cursor: loadingWorkspace || syncing ? "not-allowed" : "pointer", opacity: loadingWorkspace || syncing ? 0.5 : 1, fontSize: 12, fontWeight: 650 }}
                  >
                    <Upload size={12} /> Import workspace
                  </InteractiveActionButton>
                  <InteractiveActionButton
                    onClick={() => {
                      void exportWorkspaceToDisk();
                      setHeaderMenuOpen(false);
                    }}
                    disabled={loadingWorkspace || syncing}
                    motionId="files-workspace-export"
                    areaHint={76}
                    radius={8}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "none", borderRadius: 8, background: "transparent", color: "inherit", cursor: loadingWorkspace || syncing ? "not-allowed" : "pointer", opacity: loadingWorkspace || syncing ? 0.5 : 1, fontSize: 12, fontWeight: 650 }}
                  >
                    <Download size={12} /> Export workspace
                  </InteractiveActionButton>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              fontSize: 10,
            }}
          >
            Workspace: {activeWs ? `${activeWs.icon} ${activeWs.name}` : "All Files"}
          </span>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 999,
              border: `1px solid rgba(${rgb},0.28)`,
              background: `rgba(${rgb},0.12)`,
              color: t.accent,
              fontSize: 10,
            }}
          >
            Root: {workspaceRoot || "not selected"}
          </span>
          <button
            onClick={() => setAutoSync(!autoSync)}
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: `1px solid ${autoSync ? `rgba(${rgb},0.34)` : "rgba(255,255,255,0.14)"}`,
              background: autoSync ? `rgba(${rgb},0.12)` : "rgba(255,255,255,0.04)",
              color: autoSync ? t.accent : "inherit",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Auto-Sync: {autoSync ? "On" : "Off"}
          </button>
          {syncMsg ? (
            <span style={{ color: t.accent, fontWeight: 700, fontSize: 11 }}>
              {syncMsg}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            width: 270,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 12px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 1 }}>Workspaces</div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>
                {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 12px" }}>
            <InteractiveActionButton
              onClick={() => {
                setActive(null);
                setTab("all");
              }}
              motionId="files-workspace-all-files"
              selected={!activeWorkspaceId}
              areaHint={120}
              radius={10}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 10px",
                borderRadius: 10,
                marginBottom: 4,
                background: !activeWorkspaceId ? `rgba(${rgb},0.12)` : "transparent",
                border: !activeWorkspaceId
                  ? `1px solid rgba(${rgb},0.2)`
                  : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.12s",
                color: "inherit",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🗂️
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: !activeWorkspaceId ? t.accent : "inherit" }}>
                  All Files
                </div>
                <div style={{ fontSize: 10, opacity: 0.45 }}>{allItems.length} items</div>
              </div>
            </InteractiveActionButton>

            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                opacity: 0.35,
                textTransform: "uppercase",
                letterSpacing: 1,
                padding: "8px 4px 4px",
              }}
            >
              My Workspaces
            </div>

            {workspaces.map((ws) => (
              <div key={ws.id} style={{ marginBottom: 8 }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActive(ws.id);
                    setTab("workspaces");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActive(ws.id);
                      setTab("workspaces");
                    }
                  }}
                  style={{ width: "100%", color: "inherit", cursor: "pointer" }}
                >
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 10,
                      background: activeWorkspaceId === ws.id ? `${ws.color}18` : "transparent",
                      border:
                        activeWorkspaceId === ws.id
                          ? `1px solid ${ws.color}44`
                          : "1px solid transparent",
                    }}
                  >
                    {activeWorkspaceId === ws.id ? (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 3,
                          height: "60%",
                          borderRadius: 2,
                          background: ws.color,
                          boxShadow: `0 0 8px ${ws.color}`,
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: `${ws.color}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        border: `1px solid ${ws.color}33`,
                      }}
                    >
                      {ws.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: activeWorkspaceId === ws.id ? ws.color : "inherit",
                        }}
                      >
                        {ws.name}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.45 }}>{wsItemCount(ws)} items</div>
                    </div>
                    <InteractiveActionButton
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditWs(ws);
                      }}
                      motionId={`files-workspace-edit-${ws.id}`}
                      areaHint={44}
                      radius={6}
                      style={{
                        border: "none",
                        background: "none",
                        color: "inherit",
                        opacity: 0.45,
                        cursor: "pointer",
                        padding: "3px 6px",
                        borderRadius: 6,
                      }}
                    >
                      ✎
                    </InteractiveActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
              background: "rgba(0,0,0,0.1)",
            }}
          >
            {activeWs ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ fontSize: 20 }}>{activeWs.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: activeWs.color }}>{activeWs.name}</div>
                  {activeWs.description ? (
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{activeWs.description}</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>All Files</div>
            )}

            <div style={{ position: "relative" }}>
              <Search
                size={12}
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search…"
                style={{
                  padding: "6px 10px 6px 28px",
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  outline: "none",
                  fontSize: 12,
                  color: "inherit",
                  width: 220,
                }}
              />
            </div>

            <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
              {(["all", "note", "code", "task", "reminder"] as const).map((filter) => (
                <InteractiveActionButton
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  motionId={`files-type-filter-${filter}`}
                  selected={typeFilter === filter}
                  areaHint={58}
                  radius={8}
                  style={{
                    padding: "5px 9px",
                    background: typeFilter === filter ? t.accent : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                    color: typeFilter === filter ? "#fff" : "inherit",
                    opacity: typeFilter === filter ? 1 : 0.5,
                    transition: "all 0.12s",
                    textTransform: "capitalize",
                  }}
                >
                  {filter}
                </InteractiveActionButton>
              ))}
            </div>

            <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
              <InteractiveActionButton
                onClick={() => setViewMode("grid")}
                motionId="files-view-mode-grid"
                selected={viewMode === "grid"}
                areaHint={50}
                radius={8}
                style={{
                  padding: "5px 8px",
                  background: viewMode === "grid" ? t.accent : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: viewMode === "grid" ? "#fff" : "inherit",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.12s",
                }}
              >
                <Grid3x3 size={13} />
              </InteractiveActionButton>
              <InteractiveActionButton
                onClick={() => setViewMode("list")}
                motionId="files-view-mode-list"
                selected={viewMode === "list"}
                areaHint={50}
                radius={8}
                style={{
                  padding: "5px 8px",
                  background: viewMode === "list" ? t.accent : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: viewMode === "list" ? "#fff" : "inherit",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.12s",
                }}
              >
                <List size={13} />
              </InteractiveActionButton>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.05)",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <strong>{unassignedCount}</strong> <span style={{ opacity: 0.6 }}>unassigned</span>
            </span>
            <InteractiveActionButton
              onClick={() => setOnlyUnassigned((state) => !state)}
              motionId="files-only-unassigned-toggle"
              selected={onlyUnassigned}
              areaHint={82}
              radius={8}
              style={{
                padding: "5px 9px",
                borderRadius: 8,
                border: `1px solid ${onlyUnassigned ? t.accent : "rgba(255,255,255,0.14)"}`,
                background: onlyUnassigned ? `rgba(${rgb},0.14)` : "rgba(255,255,255,0.06)",
                color: onlyUnassigned ? t.accent : "inherit",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {onlyUnassigned ? "Show all" : "Only unassigned"}
            </InteractiveActionButton>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "6px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(0,0,0,0.05)",
              flexShrink: 0,
            }}
          >
            {[
              { label: "Notes", val: notes.length, color: "#007AFF" },
              { label: "Code", val: codes.length, color: "#BF5AF2" },
              { label: "Tasks", val: tasks.length, color: "#FF9F0A" },
              { label: "Reminders", val: reminders.length, color: "#FF453A" },
            ].map((entry) => (
              <div key={entry.label} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: entry.color }} />
                <span style={{ opacity: 0.5 }}>{entry.label}</span>
                <span style={{ fontWeight: 700, color: entry.color }}>{entry.val}</span>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, opacity: 0.4 }}>
              {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {displayItems.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "60%",
                  gap: 12,
                  opacity: 0.4,
                }}
              >
                <Layers size={48} strokeWidth={1} style={{ color: t.accent, opacity: 0.4 }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {activeWs ? `No files in "${activeWs.name}"` : "No files yet"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {activeWs
                      ? "Add files to this workspace via the ⋮ menu on any file"
                      : "Create notes, code files, tasks, or reminders to see them here"}
                  </div>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10 }}>
                {displayItems.map((item) => (
                  <FileCard
                    key={item.id}
                    item={item}
                    viewMode="grid"
                    onAssign={() => setAssignItem(item)}
                    wsColor={getItemWsColor(item)}
                  />
                ))}
              </div>
            ) : (
              <div>
                {displayItems.map((item) => (
                  <FileCard
                    key={item.id}
                    item={item}
                    viewMode="list"
                    onAssign={() => setAssignItem(item)}
                    wsColor={getItemWsColor(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {newWsOpen ? <WorkspaceModal key="new" onClose={() => setNewWsOpen(false)} /> : null}
        {editWs ? <WorkspaceModal key={editWs.id} ws={editWs} onClose={() => setEditWs(null)} /> : null}
        {assignItem ? <AssignModal key={assignItem.id} item={assignItem} onClose={() => setAssignItem(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
