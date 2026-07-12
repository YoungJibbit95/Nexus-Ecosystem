import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CircleOff,
  Download,
  FolderOpen,
  Grid3x3,
  HardDrive,
  Info,
  Layers,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { calculateNexusViewQuality } from "@nexus/core";
import { useApp } from "../store/appStore";
import { useCanvas } from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { useWorkspaces, type Workspace } from "../store/workspaceStore";
import { hexToRgb } from "../lib/utils";
import { InteractiveActionButton } from "../components/render/InteractiveActionButton";
import { AssignModal, FileCard, WorkspaceModal } from "./files/FilesUiParts";
import {
  TYPE_META,
  type FileItem,
  type ItemType,
  type SmartViewMode,
  type ViewMode,
} from "./files/filesTypes";
import { useWorkspaceSync } from "./files/useWorkspaceSync";
import "./files/FilesView.css";
import "./files/FilesViewPolish.css";

type FilesViewProps = {
  setView?: (view: string) => void;
};

const TYPE_FILTERS = ["all", "note", "code", "task", "reminder", "canvas"] as const;

const SMART_VIEWS: Array<{ id: SmartViewMode; label: string }> = [
  { id: "workspace", label: "Workspace" },
  { id: "all", label: "All" },
  { id: "recent", label: "Recent 7d" },
  { id: "pinned", label: "Pinned" },
  { id: "unassigned", label: "Unassigned" },
];

const formatRelativeTime = (iso: string) => {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "unknown";
  const delta = Math.max(0, Date.now() - ms) / 1000;
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export function FilesView({ setView }: FilesViewProps = {}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const {
    notes,
    codes,
    tasks,
    reminders,
    folders,
    openNote,
    setNote,
    openCode,
    setCode,
  } = useApp();
  const { canvases, setActiveCanvas } = useCanvas();
  const { workspaces, activeWorkspaceId, setActive } = useWorkspaces();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ItemType>("all");
  const [smartView, setSmartView] = useState<SmartViewMode>("workspace");
  const [folderFilter, setFolderFilter] = useState<"all" | "none" | string>(
    "all",
  );
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tab, setTab] = useState<"all" | "workspaces">("workspaces");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [newWsOpen, setNewWsOpen] = useState(false);
  const [editWs, setEditWs] = useState<Workspace | null>(null);
  const [assignItem, setAssignItem] = useState<FileItem | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [headerMenuRect, setHeaderMenuRect] = useState<DOMRect | null>(null);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const headerMenuOverlayRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
  const workspaceScopeActive = Boolean(
    activeWs && tab === "workspaces" && smartView === "workspace",
  );
  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const allItems = useMemo((): FileItem[] => {
    const items: FileItem[] = [];
    notes.forEach((note) => {
      items.push({
        id: note.id,
        title: note.title || "Untitled",
        type: "note",
        updated: note.updated || note.created,
        preview: note.content?.slice(0, 120),
        folderId: note.folderId ?? null,
        pinned: Boolean(note.pinned),
      });
    });
    codes.forEach((code) => {
      items.push({
        id: code.id,
        title: code.name,
        type: "code",
        updated: code.updated || code.created,
        preview: `${code.lang} - ${(code.content || "").split("\n").length} lines`,
        lang: code.lang,
        folderId: code.folderId ?? null,
        pinned: Boolean(code.pinned),
      });
    });
    tasks.forEach((task) => {
      items.push({
        id: task.id,
        title: task.title,
        type: "task",
        updated: task.updated || task.created,
        preview: task.desc?.slice(0, 100),
        priority: task.priority,
        status: task.status,
        folderId: task.folderId ?? null,
      });
    });
    reminders.forEach((reminder) => {
      items.push({
        id: reminder.id,
        title: reminder.title,
        type: "reminder",
        updated: reminder.datetime,
        preview: reminder.msg?.slice(0, 100),
        folderId: reminder.folderId ?? null,
      });
    });
    canvases.forEach((canvas) => {
      items.push({
        id: canvas.id,
        title: canvas.name || "Untitled Canvas",
        type: "canvas",
        updated: canvas.updated || canvas.created,
        preview: `${canvas.nodes.length} nodes - ${canvas.connections.length} links`,
      });
    });
    return items.sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    );
  }, [canvases, codes, notes, reminders, tasks]);

  const itemInWorkspace = useCallback((workspace: Workspace, item: FileItem) => {
    const key = `${item.type}Ids` as keyof Workspace;
    return ((workspace[key] as string[]) || []).includes(item.id);
  }, []);

  const isItemAssigned = useCallback(
    (item: FileItem) =>
      workspaces.some((workspace) => itemInWorkspace(workspace, item)),
    [itemInWorkspace, workspaces],
  );

  const getItemWorkspaces = useCallback(
    (item: FileItem) =>
      workspaces.filter((workspace) => itemInWorkspace(workspace, item)),
    [itemInWorkspace, workspaces],
  );

  const getItemPrimaryWorkspace = useCallback(
    (item: FileItem) => getItemWorkspaces(item)[0],
    [getItemWorkspaces],
  );

  const workspaceScopedItems = useMemo(
    () =>
      workspaceScopeActive && activeWs
        ? allItems.filter((item) => itemInWorkspace(activeWs, item))
        : allItems,
    [activeWs, allItems, itemInWorkspace, workspaceScopeActive],
  );

  const folderOptions = useMemo(() => {
    const used = new Set(
      allItems
        .map((item) => item.folderId)
        .filter((folderId): folderId is string => Boolean(folderId)),
    );
    return folders
      .filter((folder) => used.has(folder.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allItems, folders]);

  const displayItems = useMemo(() => {
    let items = allItems;

    if (workspaceScopeActive && activeWs) {
      items = items.filter((item) => itemInWorkspace(activeWs, item));
    }

    if (typeFilter !== "all") {
      items = items.filter((item) => item.type === typeFilter);
    }
    if (folderFilter === "none") {
      items = items.filter((item) => !item.folderId);
    } else if (folderFilter !== "all") {
      items = items.filter((item) => item.folderId === folderFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.preview?.toLowerCase().includes(q),
      );
    }

    if (smartView === "recent") {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      items = items.filter(
        (item) => new Date(item.updated).getTime() >= cutoff,
      );
    }
    if (smartView === "pinned") {
      items = items.filter((item) => item.pinned);
    }
    if (smartView === "unassigned") {
      items = items.filter((item) => !isItemAssigned(item));
    }

    return items;
  }, [
    activeWs,
    allItems,
    folderFilter,
    isItemAssigned,
    itemInWorkspace,
    search,
    smartView,
    tab,
    typeFilter,
    workspaceScopeActive,
  ]);

  const wsItemCount = useCallback(
    (workspace: Workspace) =>
      workspace.noteIds.length +
      workspace.codeIds.length +
      workspace.taskIds.length +
      workspace.reminderIds.length +
      workspace.canvasIds.length,
    [],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<ItemType, number> = {
      note: 0,
      code: 0,
      task: 0,
      reminder: 0,
      canvas: 0,
    };
    workspaceScopedItems.forEach((item) => {
      counts[item.type] += 1;
    });
    return counts;
  }, [workspaceScopedItems]);

  const unassignedCount = useMemo(
    () => allItems.filter((item) => !isItemAssigned(item)).length,
    [allItems, isItemAssigned],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (typeFilter !== "all") count += 1;
    if (folderFilter !== "all") count += 1;
    if (smartView !== "workspace") count += 1;
    if (tab !== "workspaces") count += 1;
    return count;
  }, [folderFilter, search, smartView, tab, typeFilter]);

  const staleItemCount = useMemo(() => {
    const staleAfterMs = 30 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    return allItems.filter(
      (item) => nowMs - new Date(item.updated).getTime() > staleAfterMs,
    ).length;
  }, [allItems]);

  const fileQuality = useMemo(
    () =>
      calculateNexusViewQuality({
        totalItems: allItems.length,
        visibleItems: displayItems.length,
        searchActive: Boolean(search.trim()),
        filtersActive: activeFilterCount,
        staleItems: staleItemCount,
        synced: !syncing,
        workspaceReady: Boolean(workspaceRoot) || !autoSync,
      }),
    [
      activeFilterCount,
      allItems.length,
      autoSync,
      displayItems.length,
      search,
      staleItemCount,
      syncing,
      workspaceRoot,
    ],
  );

  const selectedItem = useMemo(
    () => displayItems.find((item) => item.id === selectedItemId) ?? null,
    [displayItems, selectedItemId],
  );

  const selectedMeta = selectedItem ? TYPE_META[selectedItem.type] : null;
  const selectedWorkspaces = selectedItem ? getItemWorkspaces(selectedItem) : [];
  const selectedFolder =
    selectedItem?.folderId ? folderById.get(selectedItem.folderId) : null;

  const resetFileFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setFolderFilter("all");
    setSmartView(activeWs ? "workspace" : "all");
    setTab(activeWs ? "workspaces" : "all");
  }, [activeWs]);

  useEffect(() => {
    if (activeWorkspaceId) {
      setTab("workspaces");
      setSmartView((prev) => (prev === "all" ? "workspace" : prev));
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (displayItems.length === 0) {
      setSelectedItemId(null);
      return;
    }
    if (!selectedItemId || !displayItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(displayItems[0].id);
    }
  }, [displayItems, selectedItemId]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const updateMenuRect = () => {
      const rect = headerMenuRef.current?.getBoundingClientRect();
      setHeaderMenuRect(rect ?? null);
    };
    updateMenuRect();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !headerMenuRef.current?.contains(target) &&
        !headerMenuOverlayRef.current?.contains(target)
      ) {
        setHeaderMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHeaderMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [headerMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        newWsOpen ||
        Boolean(editWs) ||
        Boolean(assignItem)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      const cmd = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (cmd && key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (isEditable) return;

      if (key === "1") {
        event.preventDefault();
        setTypeFilter("all");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        setTypeFilter("note");
        return;
      }
      if (key === "3") {
        event.preventDefault();
        setTypeFilter("code");
        return;
      }
      if (key === "4") {
        event.preventDefault();
        setTypeFilter("task");
        return;
      }
      if (key === "5") {
        event.preventDefault();
        setTypeFilter("reminder");
        return;
      }
      if (key === "6") {
        event.preventDefault();
        setTypeFilter("canvas");
        return;
      }
      if (key === "g") {
        event.preventDefault();
        setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
        return;
      }
      if (key === "r") {
        event.preventDefault();
        setSmartView("recent");
        return;
      }
      if (key === "u") {
        event.preventDefault();
        setSmartView("unassigned");
        return;
      }
      if (key === "w") {
        event.preventDefault();
        setSmartView(activeWs ? "workspace" : "all");
        setTab(activeWs ? "workspaces" : "all");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeWs, assignItem, editWs, newWsOpen]);

  const openItem = useCallback(
    (item: FileItem) => {
      if (item.type === "note") {
        openNote(item.id);
        setNote(item.id);
        setView?.("notes");
        return;
      }
      if (item.type === "code") {
        openCode(item.id);
        setCode(item.id);
        setView?.("code");
        return;
      }
      if (item.type === "task") {
        setView?.("tasks");
        return;
      }
      if (item.type === "reminder") {
        setView?.("reminders");
        return;
      }
      setActiveCanvas(item.id);
      setView?.("canvas");
    },
    [openCode, openNote, setActiveCanvas, setCode, setNote, setView],
  );

  const selectWorkspace = (workspaceId: string) => {
    setActive(workspaceId);
    setTab("workspaces");
    setSmartView("workspace");
    setSelectedItemId(null);
  };

  const showAllFiles = () => {
    setActive(null);
    setTab("all");
    setSmartView("all");
    setSelectedItemId(null);
  };

  const scopedWorkspace = workspaceScopeActive ? activeWs : undefined;
  const workspaceLabel = scopedWorkspace ? scopedWorkspace.name : "All Files";
  const scopeItemCount = scopedWorkspace
    ? wsItemCount(scopedWorkspace)
    : allItems.length;
  const handleAutoSyncToggle = useCallback(async () => {
    if (autoSync) {
      setAutoSync(false);
      return;
    }
    if (!workspaceRoot) {
      const selectedRoot = await selectWorkspaceRoot();
      if (!selectedRoot) return;
    }
    setAutoSync(true);
  }, [autoSync, selectWorkspaceRoot, setAutoSync, workspaceRoot]);
  const syncStateLabel = syncing
    ? "Syncing"
    : workspaceRoot
      ? "Connected"
      : "No folder";
  const DetailsIcon = selectedMeta?.icon ?? Info;
  const flowMenuLeft =
    typeof window === "undefined" || !headerMenuRect
      ? 16
      : Math.max(12, Math.min(window.innerWidth - 256, headerMenuRect.right - 248));
  const flowMenuTop =
    typeof window === "undefined" || !headerMenuRect
      ? 72
      : Math.max(12, Math.min(window.innerHeight - 154, headerMenuRect.bottom + 8));
  const workspaceFlowMenu =
    headerMenuOpen && headerMenuRect && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={headerMenuOverlayRef}
            className="nx-files-menu nx-files-flow-menu nx-files-flow-menu--floating"
            style={{ top: flowMenuTop, left: flowMenuLeft }}
            role="menu"
            aria-label="Workspace Flow"
          >
            <InteractiveActionButton
              onClick={() => {
                void selectWorkspaceRoot();
                setHeaderMenuOpen(false);
              }}
              className="nx-files-menu-button"
              motionId="files-workspace-select-root"
              areaHint={76}
              radius={7}
            >
              <FolderOpen size={13} /> Workspace folder waehlen
            </InteractiveActionButton>
            <InteractiveActionButton
              onClick={() => {
                void importWorkspaceFromDisk();
                setHeaderMenuOpen(false);
              }}
              disabled={loadingWorkspace || syncing}
              className="nx-files-menu-button"
              motionId="files-workspace-import"
              areaHint={76}
              radius={7}
            >
              <Upload size={13} /> Import workspace
            </InteractiveActionButton>
            <InteractiveActionButton
              onClick={() => {
                void exportWorkspaceToDisk();
                setHeaderMenuOpen(false);
              }}
              disabled={loadingWorkspace || syncing}
              className="nx-files-menu-button"
              motionId="files-workspace-export"
              areaHint={76}
              radius={7}
            >
              <Download size={13} /> Export workspace
            </InteractiveActionButton>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="nx-files-v6 nx-release-view"
      data-files-mode={t.mode}
      data-explorer-collapsed={explorerCollapsed ? "true" : "false"}
      data-details-collapsed={detailsCollapsed ? "true" : "false"}
      style={
        {
          "--files-accent": t.accent,
          "--files-accent-rgb": rgb,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        } as React.CSSProperties
      }
    >
      <div className="nx-files-header nx-release-toolbar">
        <div className="nx-files-titlebar">
          <div className="nx-files-heading">
            <div className="nx-files-kicker">Bibliothek und Workspace-Dateien</div>
            <div className="nx-files-title-row">
              <HardDrive size={18} />
              <h2>Files</h2>
            </div>
            <p>
              {scopedWorkspace
                ? `${scopeItemCount} Dateien sind ${scopedWorkspace.name} zugeordnet`
                : `${allItems.length} lokale Nexus-Inhalte in deiner Bibliothek`}
            </p>
          </div>

          <div className="nx-files-header-actions">
            <InteractiveActionButton
              onClick={() => setNewWsOpen(true)}
              className="nx-files-action nx-files-action--primary"
              motionId="files-create-workspace"
              areaHint={96}
              radius={8}
            >
              <Plus size={14} /> Workspace
            </InteractiveActionButton>
            <div ref={headerMenuRef} className="nx-files-menu-anchor">
              <InteractiveActionButton
                onClick={() => setHeaderMenuOpen((prev) => !prev)}
                className="nx-files-action"
                motionId="files-workspace-flow-menu"
                areaHint={92}
                radius={8}
                selected={headerMenuOpen}
              >
                <FolderOpen size={14} /> Workspace Flow <MoreHorizontal size={14} />
              </InteractiveActionButton>
            </div>
          </div>
        </div>

        <div className="nx-files-statusbar">
          <button
            type="button"
            className="nx-files-status-pill nx-files-status-pill--strong"
            onClick={() => {
              setTab(activeWs ? "workspaces" : "all");
              setSmartView(activeWs ? "workspace" : "all");
            }}
          >
            <Layers size={12} /> Ansicht: {scopedWorkspace ? workspaceLabel : "Gesamte Bibliothek"}
          </button>
          <button
            type="button"
            className="nx-files-status-pill"
            onClick={() => void selectWorkspaceRoot()}
            title={workspaceRoot || "Workspace folder waehlen"}
          >
            <HardDrive size={12} /> Ordner-Sync: {workspaceRoot || "nicht verbunden"}
          </button>
          <button
            type="button"
            className="nx-files-status-pill"
            onClick={() => void handleAutoSyncToggle()}
            aria-pressed={autoSync}
            title="Auto-Sync umschalten"
          >
            <RefreshCw size={12} /> Auto-Sync: {autoSync ? "An" : "Aus"}
          </button>
          <span className="nx-files-status-pill">
            {workspaceRoot ? <CheckCircle2 size={12} /> : <CircleOff size={12} />}
            {syncMsg || syncStateLabel}
          </span>
        </div>
      </div>

      <div className="nx-files-body">
        {!explorerCollapsed ? (
          <aside id="nx-files-explorer" className="nx-files-sidebar">
            <div className="nx-files-sidebar-head">
              <div>
                <div className="nx-files-sidebar-title">Explorer</div>
                <div className="nx-files-sidebar-meta">
                  {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                </div>
              </div>
              <InteractiveActionButton
                onClick={() => setNewWsOpen(true)}
                className="nx-files-icon-action"
                motionId="files-sidebar-create-workspace"
                aria-label="New workspace"
                areaHint={42}
                radius={8}
              >
                <Plus size={14} />
              </InteractiveActionButton>
            </div>

            <div className="workspace-tree">
              <button
                type="button"
                className={`workspace-tree-item ${!activeWorkspaceId ? "is-active" : ""}`}
                onClick={showAllFiles}
              >
                <span className="workspace-tree-icon">
                  <Layers size={15} />
                </span>
                <span className="workspace-tree-copy">
                  <span>Gesamte Bibliothek</span>
                  <small>{allItems.length} Inhalte</small>
                </span>
              </button>

              <div className="workspace-tree-section">Arbeitsbereiche</div>
              {workspaces.map((ws) => {
                const active = activeWorkspaceId === ws.id;
                return (
                  <div
                    key={ws.id}
                    className={`workspace-tree-item workspace-tree-item--workspace ${
                      active ? "is-active" : ""
                    }`}
                    style={{ "--workspace-color": ws.color } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      className="workspace-tree-select"
                      onClick={() => selectWorkspace(ws.id)}
                      aria-pressed={active}
                    >
                      <span className="workspace-tree-icon workspace-tree-icon--emoji">
                        {ws.icon}
                      </span>
                      <span className="workspace-tree-copy">
                        <span>{ws.name}</span>
                        <small>{wsItemCount(ws)} files</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="workspace-tree-edit"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditWs(ws);
                      }}
                      aria-label={`Edit ${ws.name}`}
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        ) : null}

        <main className="nx-files-main">
          <section className="nx-files-toolbar nx-release-strip">
            <div className="nx-files-context">
              <span
                className="nx-files-context-icon"
                style={{
                  color: activeWs?.color || t.accent,
                  background: activeWs ? `${activeWs.color}1f` : undefined,
                }}
              >
                {activeWs ? activeWs.icon : <Layers size={16} />}
              </span>
              <div>
                <strong>{workspaceLabel}</strong>
                <span>
                  {scopedWorkspace
                    ? `${scopedWorkspace.name} zeigt nur zugeordnete Inhalte. Die Bibliothek bleibt unverändert.`
                    : "Die Bibliothek zeigt alle lokalen Notes, Code-Dateien, Tasks, Reminder und Canvas-Dokumente."}
                </span>
              </div>
            </div>

            <div className="nx-files-toolbar-controls">
              <label className="nx-files-search">
                <Search size={13} />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="In dieser Ansicht suchen"
                  aria-label="Files durchsuchen"
                />
              </label>

              <select
                className="nx-files-select"
                value={folderFilter}
                onChange={(event) => setFolderFilter(event.target.value)}
                aria-label="Ordnerfilter"
              >
                <option value="all">Alle Ordner</option>
                <option value="none">Ohne Ordner</option>
                {folderOptions.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>

              <div className="nx-files-view-switcher" aria-label="View mode">
                <InteractiveActionButton
                  onClick={() => setViewMode("list")}
                  className="nx-files-toggle"
                  motionId="files-view-mode-list"
                  selected={viewMode === "list"}
                  aria-label="List view"
                  areaHint={42}
                  radius={7}
                >
                  <List size={14} />
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => setViewMode("grid")}
                  className="nx-files-toggle"
                  motionId="files-view-mode-grid"
                  selected={viewMode === "grid"}
                  aria-label="Grid view"
                  areaHint={42}
                  radius={7}
                >
                  <Grid3x3 size={14} />
                </InteractiveActionButton>
              </div>

              <div className="nx-files-layout-switcher" aria-label="Panel visibility">
                <InteractiveActionButton
                  onClick={() => setExplorerCollapsed((prev) => !prev)}
                  className="nx-files-layout-toggle"
                  motionId="files-toggle-explorer"
                  selected={!explorerCollapsed}
                  aria-pressed={!explorerCollapsed}
                  aria-controls="nx-files-explorer"
                  title={explorerCollapsed ? "Show Explorer" : "Hide Explorer"}
                  areaHint={58}
                  radius={7}
                >
                  <FolderOpen size={13} />
                  <span>Explorer</span>
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => setDetailsCollapsed((prev) => !prev)}
                  className="nx-files-layout-toggle"
                  motionId="files-toggle-details"
                  selected={!detailsCollapsed}
                  aria-pressed={!detailsCollapsed}
                  aria-controls="nx-files-detail-pane"
                  title={detailsCollapsed ? "Show Details" : "Hide Details"}
                  areaHint={58}
                  radius={7}
                >
                  <Info size={13} />
                  <span>Details</span>
                </InteractiveActionButton>
              </div>
            </div>
          </section>

          <section className="nx-files-filter-strip">
            <div className="nx-files-chip-group">
              <span className="nx-files-chip-label">
                <SlidersHorizontal size={12} /> Type
              </span>
              {TYPE_FILTERS.map((filter) => (
                <InteractiveActionButton
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className="nx-files-filter-chip"
                  motionId={`files-type-filter-${filter}`}
                  selected={typeFilter === filter}
                  aria-label={`Filter ${filter}`}
                  areaHint={58}
                  radius={7}
                >
                  {filter === "all" ? "All" : TYPE_META[filter].label}
                  {filter !== "all" ? (
                    <span>{typeCounts[filter]}</span>
                  ) : (
                    <span>{workspaceScopedItems.length}</span>
                  )}
                </InteractiveActionButton>
              ))}
            </div>

            <div className="nx-files-chip-group">
              {SMART_VIEWS.map((entry) => (
                <InteractiveActionButton
                  key={entry.id}
                  onClick={() => {
                    setSmartView(entry.id);
                    setTab(entry.id === "workspace" ? "workspaces" : "all");
                  }}
                  className="nx-files-filter-chip"
                  motionId={`files-smart-view-${entry.id}`}
                  selected={smartView === entry.id}
                  areaHint={78}
                  radius={7}
                >
                  {entry.label}
                  {entry.id === "unassigned" ? <span>{unassignedCount}</span> : null}
                </InteractiveActionButton>
              ))}
              {activeFilterCount > 0 || displayItems.length === 0 ? (
                <button
                  type="button"
                  className="nx-files-reset-button"
                  onClick={resetFileFilters}
                >
                  Reset
                </button>
              ) : null}
            </div>
          </section>

          <details className="nx-files-quality-strip nx-view-quality-strip">
            <summary>
              <span className={`nx-view-quality-badge nx-view-quality-badge--${fileQuality.tone}`}>
                Bibliotheksstatus
              </span>
              <span>{displayItems.length} sichtbar · {workspaceScopedItems.length} im Bereich</span>
            </summary>
            <div className="nx-files-quality-details">
              <span>{fileQuality.summary}</span>
              <span className="nx-files-quality-metric">Qualitaet <strong>{fileQuality.score}%</strong></span>
              <span className="nx-files-quality-metric">Aelter <strong>{staleItemCount}</strong></span>
            </div>
          </details>

          <div className="nx-files-workbench">
            <section className="nx-files-content-grid">
              {displayItems.length === 0 ? (
                <div className="nx-files-empty">
                  <Layers size={44} strokeWidth={1.5} />
                  <div>
                    <h3>
                      {scopedWorkspace
                        ? `Noch keine Inhalte in ${scopedWorkspace.name}`
                        : allItems.length === 0
                          ? "Deine Nexus-Bibliothek ist leer"
                          : "Keine Inhalte passen zu dieser Ansicht"}
                    </h3>
                    <p>
                      {scopedWorkspace
                        ? "Wechsle zur gesamten Bibliothek und ordne Inhalte ueber das Kartenmenue diesem Workspace zu."
                        : allItems.length === 0
                          ? "Erstelle oder importiere eine Note, Aufgabe, Code-Datei, Erinnerung oder Canvas."
                          : "Leere Suche und Filter, um den Rest der Bibliothek zu sehen."}
                    </p>
                  </div>
                  <div className="nx-files-empty-actions">
                    <button type="button" onClick={resetFileFilters}>
                      Reset filters
                    </button>
                    <button type="button" onClick={() => setNewWsOpen(true)}>
                      New workspace
                    </button>
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="nx-files-card-grid">
                  {displayItems.map((item) => {
                    const itemWorkspace = getItemPrimaryWorkspace(item);
                    return (
                      <FileCard
                        key={item.id}
                        item={item}
                        viewMode="grid"
                        selected={selectedItem?.id === item.id}
                        onSelect={() => setSelectedItemId(item.id)}
                        onAssign={() => setAssignItem(item)}
                        onOpen={openItem}
                        wsColor={itemWorkspace?.color}
                        wsName={itemWorkspace?.name}
                        folderName={
                          item.folderId ? folderById.get(item.folderId)?.name : undefined
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="nx-files-list">
                  {displayItems.map((item) => {
                    const itemWorkspace = getItemPrimaryWorkspace(item);
                    return (
                      <FileCard
                        key={item.id}
                        item={item}
                        viewMode="list"
                        selected={selectedItem?.id === item.id}
                        onSelect={() => setSelectedItemId(item.id)}
                        onAssign={() => setAssignItem(item)}
                        onOpen={openItem}
                        wsColor={itemWorkspace?.color}
                        wsName={itemWorkspace?.name}
                        folderName={
                          item.folderId ? folderById.get(item.folderId)?.name : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {!detailsCollapsed ? (
              <aside id="nx-files-detail-pane" className="nx-files-detail-pane">
              {selectedItem && selectedMeta ? (
                <>
                  <div className="nx-files-detail-head">
                    <span
                      className="nx-files-detail-icon"
                      style={
                        {
                          "--files-type-color": selectedMeta.color,
                        } as React.CSSProperties
                      }
                    >
                      <DetailsIcon size={18} />
                    </span>
                    <div>
                      <div className="nx-files-detail-label">Selected file</div>
                      <h3>{selectedItem.title}</h3>
                    </div>
                  </div>

                  <div className="nx-files-detail-actions">
                    <button type="button" onClick={() => openItem(selectedItem)}>
                      Open
                    </button>
                    <button type="button" onClick={() => setAssignItem(selectedItem)}>
                      Add to workspace
                    </button>
                  </div>

                  <dl className="nx-files-detail-list">
                    <div>
                      <dt>Type</dt>
                      <dd>{selectedMeta.label}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>
                        {formatDateTime(selectedItem.updated)}
                        <span>{formatRelativeTime(selectedItem.updated)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Folder</dt>
                      <dd>{selectedFolder?.name || "No folder"}</dd>
                    </div>
                    <div>
                      <dt>Workspaces</dt>
                      <dd>
                        {selectedWorkspaces.length > 0
                          ? selectedWorkspaces.map((workspace) => workspace.name).join(", ")
                          : "Unassigned"}
                      </dd>
                    </div>
                    {selectedItem.lang ? (
                      <div>
                        <dt>Language</dt>
                        <dd>{selectedItem.lang}</dd>
                      </div>
                    ) : null}
                    {selectedItem.status ? (
                      <div>
                        <dt>Status</dt>
                        <dd>{selectedItem.status}</dd>
                      </div>
                    ) : null}
                    {selectedItem.priority ? (
                      <div>
                        <dt>Priority</dt>
                        <dd>{selectedItem.priority}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="nx-files-preview">
                    <div className="nx-files-detail-label">Preview</div>
                    <p>{selectedItem.preview || "No preview available."}</p>
                  </div>
                </>
              ) : (
                <div className="nx-files-detail-empty">
                  <Info size={28} />
                  <h3>No file selected</h3>
                  <p>Select a file to inspect metadata and workspace actions.</p>
                </div>
              )}
              </aside>
            ) : null}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {newWsOpen ? (
          <WorkspaceModal key="new" onClose={() => setNewWsOpen(false)} />
        ) : null}
        {editWs ? (
          <WorkspaceModal
            key={editWs.id}
            ws={editWs}
            onClose={() => setEditWs(null)}
          />
        ) : null}
        {assignItem ? (
          <AssignModal
            key={assignItem.id}
            item={assignItem}
            onClose={() => setAssignItem(null)}
          />
        ) : null}
      </AnimatePresence>
      {workspaceFlowMenu}
    </div>
  );
}
