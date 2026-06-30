import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  File,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FILE_TREE_LIMITS,
  createFileTreeModel,
  getFileMeta,
} from "../../pages/editor/fileTreeModel";

const actionButtonClass =
  "grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/5 bg-white/[0.025] text-gray-500 transition hover:border-white/10 hover:bg-white/10 hover:text-white focus-visible:border-cyan-300/50 focus-visible:text-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:h-3.5 [&>svg]:w-3.5";

const rowActionClass =
  "grid h-6 w-6 shrink-0 place-items-center rounded text-gray-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:h-3 [&>svg]:w-3";

const FILE_GROUP_LABELS = {
  source: "Source",
  style: "Styles",
  markup: "Markup",
  data: "Data",
  config: "Config",
  docs: "Docs",
  media: "Media",
  other: "Other",
};

const TREE_ROW_HEIGHT = FILE_TREE_LIMITS.rowHeight || 32;
const TREE_VIRTUALIZE_AFTER = FILE_TREE_LIMITS.virtualizeAfter || 160;
const TREE_OVERSCAN_ROWS = FILE_TREE_LIMITS.overscanRows || 14;
const TREE_MAX_RENDERED_ROWS = FILE_TREE_LIMITS.maxRenderedRows || 260;

function getFileNameParts(name = "") {
  const value = String(name || "");
  const index = value.lastIndexOf(".");
  if (index <= 0 || index >= value.length - 1) {
    return { base: value, suffix: "" };
  }
  return {
    base: value.slice(0, index),
    suffix: value.slice(index),
  };
}

function getFileGroupLabel(group) {
  return FILE_GROUP_LABELS[group] || "Other";
}

function getFileSection(row) {
  const node = row?.node;
  if (!node || node.isFolder) return null;
  const meta = getFileMeta(node.name);
  const extension = String(node.extension || "").trim().toLowerCase();
  const sectionId = extension || "no-extension";
  const parentKey = node.parentId || "root";

  return {
    key: `${parentKey}:file-section:${sectionId}`,
    parentKey,
    depth: row.depth,
    label: extension ? meta.label : "No Ext",
    detail: extension ? getFileGroupLabel(meta.group) : "Plain",
    color: meta.color,
  };
}

function getItemCountLabel(count) {
  return count === 1 ? "1 file" : `${count} files`;
}

function WorkspaceLabel({ workspacePath }) {
  const label = useMemo(() => {
    if (!workspacePath) return "No workspace";
    const parts = String(workspacePath).split(/[\\/]/).filter(Boolean);
    return (parts[parts.length - 1] || workspacePath).toUpperCase();
  }, [workspacePath]);

  return (
    <div className="flex min-w-0 items-center gap-2 px-1">
      <FolderOpen size={13} className="shrink-0 text-purple-300" />
      <span className="truncate text-[11px] font-bold tracking-tight text-gray-300">
        {label}
      </span>
    </div>
  );
}

function ActionIconButton({
  title,
  tooltip = title,
  onClick,
  disabled = false,
  children,
}) {
  return (
    <div className="group/tool relative grid place-items-center">
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) onClick?.(event);
        }}
        className={actionButtonClass}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#090918]/95 px-2 py-1 text-[10px] font-medium text-gray-200 opacity-0 shadow-xl transition-opacity group-hover/tool:opacity-100 group-focus-within/tool:opacity-100">
        {tooltip}
      </span>
    </div>
  );
}

function InlineInput({
  defaultValue = "",
  onConfirm,
  onCancel,
  placeholder = "",
}) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const doneRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const cancel = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel?.();
  }, [onCancel]);

  const confirm = useCallback(() => {
    if (doneRef.current) return;
    const trimmed = value.trim();
    if (!trimmed) {
      cancel();
      return;
    }
    doneRef.current = true;
    onConfirm?.(trimmed);
  }, [cancel, onConfirm, value]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") confirm();
          if (event.key === "Escape") cancel();
          event.stopPropagation();
        }}
        onBlur={cancel}
        onClick={(event) => event.stopPropagation()}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-b border-purple-500/70 bg-transparent pb-px font-mono text-xs text-gray-200 outline-none placeholder:text-gray-600"
      />
    </div>
  );
}

function CreationRow({ depth, type, onConfirm, onCancel }) {
  const isFolder = type === "folder";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="overflow-hidden"
      style={{ height: TREE_ROW_HEIGHT }}
    >
      <div
        className="flex h-full items-center gap-2 px-2"
        style={{ paddingLeft: `${depth * 12 + 24}px` }}
      >
        {isFolder ? (
          <FolderPlus size={14} className="shrink-0 text-purple-300" />
        ) : (
          <FilePlus2 size={14} className="shrink-0 text-cyan-300" />
        )}
        <InlineInput
          placeholder={isFolder ? "folder-name" : "file-name.ext"}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    </motion.div>
  );
}

function StateActionButton({ icon: Icon, children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick?.(event);
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[10px] font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
}

function EmptyState({ icon, title, detail, children }) {
  const Icon = icon;
  return (
    <div className="flex h-full min-h-[190px] flex-col items-center justify-center px-5 text-center text-gray-500">
      <Icon size={30} className={`mb-2.5 opacity-70 ${Icon === Loader2 ? "animate-spin" : ""}`} />
      <div className="text-xs font-semibold text-gray-300">{title}</div>
      {detail && <div className="mt-1 max-w-[220px] text-[11px] leading-4">{detail}</div>}
      {children && <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}

function LoadingState() {
  const rows = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="px-2 py-2" aria-label="Loading tree">
      <div className="mb-3 flex items-center gap-2 px-2 text-[11px] text-gray-400">
        <Loader2 size={13} className="shrink-0 animate-spin text-cyan-200" />
        <span className="truncate">Reading workspace entries.</span>
      </div>
      {rows.map((row) => (
        <div
          key={row}
          className="flex items-center gap-2 rounded-md px-2"
          style={{
            height: TREE_ROW_HEIGHT,
            paddingLeft: `${(row % 3) * 12 + 10}px`,
          }}
        >
          <span className="h-3.5 w-3.5 shrink-0 rounded bg-white/[0.07]" />
          <span
            className="h-2.5 rounded bg-white/[0.06]"
            style={{ width: `${58 + ((row * 17) % 34)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function ExtensionSectionRow({ section }) {
  return (
    <div
      className="flex items-center gap-2 px-2 text-[10px] text-gray-500"
      style={{
        height: TREE_ROW_HEIGHT,
        paddingLeft: `${section.depth * 12 + 24}px`,
      }}
      role="presentation"
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: section.color }}
      />
      <span className="shrink-0 font-bold uppercase tracking-wider text-gray-400">
        {section.label}
      </span>
      <span className="min-w-0 truncate text-[9px] text-gray-600">
        {section.detail}
      </span>
      <span className="h-px min-w-[12px] flex-1 bg-white/[0.06]" />
      <span className="shrink-0 rounded border border-white/5 bg-white/[0.025] px-1.5 py-0.5 text-[9px] font-semibold text-gray-600">
        {getItemCountLabel(section.count)}
      </span>
    </div>
  );
}

function FileNameLabel({ node, isActive }) {
  const { base, suffix } = getFileNameParts(node.name);
  const textClass = isActive ? "text-white" : "text-gray-400";

  return (
    <span
      className={`flex min-w-0 flex-1 items-baseline font-mono leading-none ${textClass}`}
      title={node.name}
    >
      <span className="min-w-0 truncate">{base || node.name}</span>
      {suffix && (
        <span className="shrink-0 text-gray-500 group-hover:text-gray-300">
          {suffix}
        </span>
      )}
    </span>
  );
}

function FileBadge({ node }) {
  if (node.isFolder) return null;
  const meta = getFileMeta(node.name);
  return (
    <span
      className="ml-1 shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-bold leading-none"
      style={{ color: meta.color, background: `${meta.color}14` }}
      title={`${meta.label} / ${getFileGroupLabel(meta.group)}`}
    >
      {meta.label}
    </span>
  );
}

function OverflowRow({ row }) {
  return (
    <div
      className="flex items-center gap-2 px-2 text-[11px] text-amber-300/80"
      style={{
        height: TREE_ROW_HEIGHT,
        paddingLeft: `${row.depth * 12 + 24}px`,
      }}
    >
      <AlertTriangle size={13} className="shrink-0" />
      <span className="truncate">
        {row.overflowCount || "More"} items hidden for responsiveness.
      </span>
    </div>
  );
}

function TreeRow({
  row,
  activeFileId,
  renamingId,
  deleteConfirmId,
  busyId,
  onToggleFolder,
  onFileSelect,
  onStartCreate,
  onStartRename,
  onRenameConfirm,
  onDelete,
  treeLocked = false,
}) {
  const { node, depth, childCount, isOpen, hasChildren, isMatch } = row;
  const isActive = activeFileId === node.id;
  const isFolder = node.isFolder;
  const isRenaming = renamingId === node.id;
  const isDeleting = deleteConfirmId === node.id;
  const isBusy = busyId === node.id;
  const indent = depth * 12 + 6;
  const meta = getFileMeta(node.name);
  const rowTitle = node.fsPath || node.path || node.name;
  const canMutate = !treeLocked && !isBusy;

  const handleOpen = () => {
    if (isFolder) {
      if (!treeLocked) onToggleFolder?.(node.id);
      return;
    }
    onFileSelect?.(node.id);
  };

  return (
    <>
      <div
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={isFolder ? isOpen : undefined}
        aria-selected={isActive}
        aria-busy={isBusy || undefined}
        tabIndex={0}
        title={rowTitle}
        onClick={handleOpen}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (canMutate) onStartRename(node.id);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
          }
          if (event.key === "F2") {
            event.preventDefault();
            if (canMutate) onStartRename(node.id);
          }
        }}
        className={`nx-code-file-tree-row group relative flex min-w-0 select-none items-center gap-1.5 overflow-hidden rounded-md px-2 text-[11px] outline-none transition hover:bg-white/[0.06] focus:bg-white/[0.08] ${
          treeLocked && isFolder ? "cursor-wait" : "cursor-pointer"
        }`}
        style={{
          height: TREE_ROW_HEIGHT,
          paddingLeft: `${indent}px`,
          paddingRight: !isRenaming ? (isFolder ? "5.75rem" : "2.5rem") : undefined,
          background: isActive
            ? "rgba(var(--primary-rgb, 128, 0, 255), 0.15)"
            : isMatch
              ? "rgba(34, 211, 238, 0.08)"
            : undefined,
          boxShadow: isMatch ? "inset 2px 0 rgba(34, 211, 238, 0.45)" : undefined,
          contain: "layout paint style",
        }}
      >
        <div className="grid h-4 w-4 shrink-0 place-items-center">
          {isBusy ? (
            <Loader2 size={12} className="animate-spin text-cyan-200" />
          ) : isFolder && hasChildren ? (
            isOpen ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )
          ) : (
            null
          )}
        </div>

        {isFolder ? (
          isOpen ? (
            <FolderOpen size={15} className="shrink-0 text-purple-300" />
          ) : (
            <Folder size={15} className="shrink-0 text-gray-400" />
          )
        ) : (
          <File size={15} className="shrink-0" style={{ color: meta.color }} />
        )}

        {isRenaming ? (
          <InlineInput
            defaultValue={node.name}
            onConfirm={(name) => onRenameConfirm(node.id, name)}
            onCancel={() => onStartRename(null)}
          />
        ) : (
          <>
            {isFolder ? (
              <span
                className={`min-w-0 flex-1 truncate font-medium leading-none ${
                  isActive ? "text-white" : isOpen ? "text-purple-100" : "text-gray-400"
                }`}
                title={node.name}
              >
                {node.name}
              </span>
            ) : (
              <FileNameLabel node={node} isActive={isActive} />
            )}
            {isFolder && childCount > 0 && (
              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                {childCount}
              </span>
            )}
            <FileBadge node={node} />
          </>
        )}

        {!isRenaming && (
          <div className="pointer-events-none absolute right-1 top-1/2 flex h-6 -translate-y-1/2 items-center justify-end gap-0.5 rounded bg-[#080817]/95 px-0.5 opacity-0 shadow-[0_0_12px_rgba(0,0,0,0.35)] transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            {isFolder && (
              <>
                <button
                  type="button"
                  title="New file in folder"
                  aria-label="New file in folder"
                  disabled={!canMutate}
                  className={rowActionClass}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (canMutate) onStartCreate("file", node.id, !isOpen);
                  }}
                >
                  <FilePlus2 size={12} />
                </button>
                <button
                  type="button"
                  title="New folder in folder"
                  aria-label="New folder in folder"
                  disabled={!canMutate}
                  className={rowActionClass}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (canMutate) onStartCreate("folder", node.id, !isOpen);
                  }}
                >
                  <FolderPlus size={12} />
                </button>
              </>
            )}
            <button
              type="button"
              title={isDeleting ? "Click again to delete" : "Delete"}
              aria-label={isDeleting ? "Click again to delete" : "Delete"}
              disabled={!canMutate}
              className={`${rowActionClass} ${isDeleting ? "text-red-400" : "hover:text-red-300"}`}
              onClick={(event) => {
                event.stopPropagation();
                if (canMutate) onDelete(node.id);
              }}
            >
              {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </button>
          </div>
        )}
      </div>

    </>
  );
}

export default function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  onToggleFolder,
  onRefresh,
  workspacePath,
  isLoading = false,
  error = "",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [creating, setCreating] = useState(
    /** @type {{ type: "file" | "folder", parentId: string | null } | null} */ (null),
  );
  const [renamingId, setRenamingId] = useState(/** @type {string | null} */ (null));
  const [deleteConfirmId, setDeleteConfirmId] = useState(
    /** @type {string | null} */ (null),
  );
  const [busyId, setBusyId] = useState(/** @type {string | null} */ (null));
  const [refreshing, setRefreshing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const searchRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const treeViewportRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const virtualFrameRef = useRef(0);
  const pendingScrollRestoreRef = useRef(null);
  const refreshRequestRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const collapseFrameRef = useRef(0);
  const [treeViewport, setTreeViewport] = useState({
    height: 0,
    scrollTop: 0,
  });

  const fileList = Array.isArray(files) ? files : [];
  const hasWorkspace = String(workspacePath || "").trim().length > 0;
  const model = useMemo(
    () => createFileTreeModel(fileList, {
      query: searchQuery,
      maxRows: FILE_TREE_LIMITS.maxRows,
      maxChildrenPerFolder: FILE_TREE_LIMITS.maxChildrenPerFolder,
    }),
    [fileList, refreshNonce, searchQuery],
  );

  const syncTreeViewport = useCallback(() => {
    const element = treeViewportRef.current;
    if (!element) return;
    const nextHeight = element.clientHeight || 0;
    const nextScrollTop = element.scrollTop || 0;
    setTreeViewport((current) => (
      current.height === nextHeight && current.scrollTop === nextScrollTop
        ? current
        : { height: nextHeight, scrollTop: nextScrollTop }
    ));
  }, []);

  const scheduleTreeViewportSync = useCallback(() => {
    if (typeof window === "undefined") {
      syncTreeViewport();
      return;
    }
    if (virtualFrameRef.current) return;
    virtualFrameRef.current = window.requestAnimationFrame(() => {
      virtualFrameRef.current = 0;
      syncTreeViewport();
    });
  }, [syncTreeViewport]);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    const element = treeViewportRef.current;
    if (!element) return undefined;

    syncTreeViewport();
    element.addEventListener("scroll", scheduleTreeViewportSync, { passive: true });

    const resizeObserver = typeof window.ResizeObserver === "function"
      ? new window.ResizeObserver(scheduleTreeViewportSync)
      : null;
    resizeObserver?.observe(element);

    return () => {
      element.removeEventListener("scroll", scheduleTreeViewportSync);
      resizeObserver?.disconnect();
      if (virtualFrameRef.current) {
        window.cancelAnimationFrame(virtualFrameRef.current);
        virtualFrameRef.current = 0;
      }
    };
  }, [scheduleTreeViewportSync, syncTreeViewport]);

  useEffect(() => () => {
    refreshRequestRef.current += 1;
    refreshInFlightRef.current = false;
    if (typeof window !== "undefined" && collapseFrameRef.current) {
      window.cancelAnimationFrame(collapseFrameRef.current);
      collapseFrameRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (!deleteConfirmId) return undefined;
    const timer = window.setTimeout(() => setDeleteConfirmId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [deleteConfirmId]);

  useEffect(() => {
    if (hasWorkspace) return;
    setCreating(null);
    setRenamingId(null);
    setDeleteConfirmId(null);
    setLocalError("");
  }, [hasWorkspace]);

  useEffect(() => {
    if (pendingScrollRestoreRef.current == null || isLoading || refreshing) return;
    const element = treeViewportRef.current;
    if (!element) return;
    const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
    element.scrollTop = Math.min(pendingScrollRestoreRef.current, maxScrollTop);
    pendingScrollRestoreRef.current = null;
    syncTreeViewport();
  }, [isLoading, model.rows.length, refreshing, syncTreeViewport]);

  const runAction = useCallback(async (id, action) => {
    setLocalError("");
    setBusyId(id || "tree");
    try {
      await Promise.resolve(action());
    } catch (actionError) {
      setLocalError(actionError?.message || "Explorer action failed.");
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleToggleFolder = useCallback(
    (id) => {
      if (!id || isLoading || refreshing) return;
      runAction(id, async () => {
        await onToggleFolder?.(id);
      });
    },
    [isLoading, onToggleFolder, refreshing, runAction],
  );

  const handleCreateConfirm = useCallback(
    (name, parentId = null) => {
      const type = creating?.type;
      if (!type) return;
      runAction(parentId || "root", async () => {
        if (type === "folder") await onCreateFolder?.(name, parentId);
        else await onCreateFile?.(name, parentId);
        setCreating(null);
      });
    },
    [creating?.type, onCreateFile, onCreateFolder, runAction],
  );

  const handleRenameConfirm = useCallback(
    (id, name) => {
      runAction(id, async () => {
        await onRenameFile?.(id, name);
        setRenamingId(null);
      });
    },
    [onRenameFile, runAction],
  );

  const handleDelete = useCallback(
    (id) => {
      if (deleteConfirmId !== id) {
        setDeleteConfirmId(id);
        return;
      }
      runAction(id, async () => {
        await onDeleteFile?.(id);
        setDeleteConfirmId(null);
      });
    },
    [deleteConfirmId, onDeleteFile, runAction],
  );

  const handleRefresh = useCallback(async () => {
    if (!hasWorkspace) {
      setLocalError("");
      return;
    }
    if (refreshInFlightRef.current) return;
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    refreshInFlightRef.current = true;
    setLocalError("");
    pendingScrollRestoreRef.current = treeViewportRef.current?.scrollTop || 0;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh?.());
      if (requestId === refreshRequestRef.current) {
        setRefreshNonce((value) => value + 1);
      }
    } catch (refreshError) {
      if (requestId === refreshRequestRef.current) {
        setLocalError(refreshError?.message || "Refresh failed.");
      }
    } finally {
      if (requestId === refreshRequestRef.current) {
        refreshInFlightRef.current = false;
        setRefreshing(false);
      }
    }
  }, [hasWorkspace, onRefresh]);

  const handleCollapseAll = useCallback(() => {
    if (!hasWorkspace || isLoading || refreshing) return;
    const openFolders = fileList
      .filter((item) => item?.type === "folder" && item?.isOpen)
      .map((folder) => folder.id)
      .filter(Boolean);
    if (openFolders.length === 0) return;
    if (collapseFrameRef.current) {
      window.cancelAnimationFrame(collapseFrameRef.current);
      collapseFrameRef.current = 0;
    }

    let index = 0;
    setBusyId("tree-collapse");
    const flushBatch = () => {
      const nextIndex = Math.min(index + 40, openFolders.length);
      for (; index < nextIndex; index += 1) {
        onToggleFolder?.(openFolders[index]);
      }
      if (index < openFolders.length) {
        collapseFrameRef.current = window.requestAnimationFrame(flushBatch);
        return;
      }
      collapseFrameRef.current = 0;
      setBusyId(null);
    };

    collapseFrameRef.current = window.requestAnimationFrame(flushBatch);
    setCreating(null);
    setRenamingId(null);
  }, [fileList, hasWorkspace, isLoading, onToggleFolder, refreshing]);

  const handleStartCreate = useCallback(
    (type, parentId = null, shouldOpenParent = false) => {
      if (!hasWorkspace || isLoading || refreshing) return;
      if (shouldOpenParent && parentId) onToggleFolder?.(parentId);
      setCreating({ type, parentId });
    },
    [hasWorkspace, isLoading, onToggleFolder, refreshing],
  );

  const toggleSearch = useCallback(() => {
    setShowSearch((visible) => {
      if (visible) setSearchQuery("");
      return !visible;
    });
  }, []);

  const treeItems = useMemo(() => {
    const items = [];
    const sectionCounts = new Map();

    for (const row of model.rows) {
      if (row.kind !== "node") continue;
      const section = getFileSection(row);
      if (!section) continue;
      const current = sectionCounts.get(section.key) || { ...section, count: 0 };
      current.count += 1;
      sectionCounts.set(section.key, current);
    }

    if (creating?.parentId === null) {
      items.push({
        id: `creation:root:${creating.type}`,
        kind: "creation",
        depth: 0,
        type: creating.type,
        parentId: null,
      });
    }

    const lastSectionByParent = new Map();

    for (const row of model.rows) {
      const section = row.kind === "node" ? getFileSection(row) : null;
      if (section && lastSectionByParent.get(section.parentKey) !== section.key) {
        const countedSection = sectionCounts.get(section.key) || { ...section, count: 1 };
        items.push({
          id: `section:${section.key}`,
          kind: "section",
          section: countedSection,
        });
        lastSectionByParent.set(section.parentKey, section.key);
      }

      items.push({
        id: row.id,
        kind: row.kind === "overflow" ? "overflow" : "node",
        row,
      });

      if (creating?.parentId === row.node?.id) {
        items.push({
          id: `creation:${row.node.id}:${creating.type}`,
          kind: "creation",
          depth: row.depth + 1,
          type: creating.type,
          parentId: row.node.id,
        });
      }
    }

    return items;
  }, [creating?.parentId, creating?.type, model.rows]);

  useEffect(() => {
    scheduleTreeViewportSync();
  }, [scheduleTreeViewportSync, treeItems.length]);

  const virtualWindow = useMemo(() => {
    const totalRows = treeItems.length;
    const shouldVirtualize = totalRows > TREE_VIRTUALIZE_AFTER;

    if (!shouldVirtualize) {
      return {
        isVirtualized: false,
        items: treeItems.map((item, index) => ({
          item,
          index,
          offsetY: index * TREE_ROW_HEIGHT,
        })),
        totalHeight: totalRows * TREE_ROW_HEIGHT,
        startIndex: 0,
        renderedRows: totalRows,
        totalRows,
      };
    }

    const viewportHeight = Math.max(treeViewport.height || 0, TREE_ROW_HEIGHT * 8);
    const visibleCapacity = Math.ceil(viewportHeight / TREE_ROW_HEIGHT);
    const renderCount = Math.min(
      TREE_MAX_RENDERED_ROWS,
      visibleCapacity + TREE_OVERSCAN_ROWS * 2,
    );
    const maxStartIndex = Math.max(0, totalRows - renderCount);
    const startIndex = Math.max(
      0,
      Math.min(
        maxStartIndex,
        Math.floor(treeViewport.scrollTop / TREE_ROW_HEIGHT) - TREE_OVERSCAN_ROWS,
      ),
    );
    const endIndex = Math.min(totalRows, startIndex + renderCount);

    return {
      isVirtualized: true,
      items: treeItems.slice(startIndex, endIndex).map((item, offset) => {
        const index = startIndex + offset;
        return {
          item,
          index,
          offsetY: index * TREE_ROW_HEIGHT,
        };
      }),
      totalHeight: totalRows * TREE_ROW_HEIGHT,
      startIndex,
      renderedRows: endIndex - startIndex,
      totalRows,
    };
  }, [treeItems, treeViewport.height, treeViewport.scrollTop]);

  const visibleError = localError || error;
  const hasTreeItems = treeItems.length > 0;
  const isInitialLoading = isLoading && !hasTreeItems;
  const isRefreshingTree = (isLoading || refreshing) && hasTreeItems;
  const isMissingWorkspace = !isLoading && !visibleError && !hasWorkspace && !creating;
  const isEmpty = !isLoading && !visibleError && hasWorkspace && fileList.length === 0 && !creating;
  const isSearchEmpty = !isLoading && !visibleError && fileList.length > 0 && model.rows.length === 0 && !creating;
  const isErrorEmpty = !isLoading && Boolean(visibleError) && !hasTreeItems;
  const isBounded = model.stats.hiddenByRowLimit > 0 || model.stats.hiddenByChildLimit > 0;
  const canEditTree = hasWorkspace && !isLoading && !refreshing;
  const treeLocked = isLoading || refreshing;

  return (
    <div className="flex h-full w-full flex-col bg-[#060614]/20 text-gray-200">
      <div className="nx-code-explorer-header border-b border-white/5 bg-white/[0.04] px-3 py-3">
        <div className="nx-code-explorer-heading flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Explorer
            </div>
            <div className="mt-1 flex h-4 min-w-0 items-center gap-2 text-[10px] text-gray-600">
              <span className="min-w-0 truncate">
                {model.stats.folders} folders / {model.stats.files} files / {model.stats.visibleRows} rows
              </span>
              {isRefreshingTree && (
                <span className="inline-flex shrink-0 items-center gap-1 text-cyan-200/80">
                  <Loader2 size={10} className="animate-spin" />
                  Refresh
                </span>
              )}
            </div>
          </div>
          {virtualWindow.isVirtualized && (
            <span className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
              {virtualWindow.renderedRows}/{virtualWindow.totalRows}
            </span>
          )}
        </div>
        <div className="nx-code-explorer-workspace mt-2 min-w-0">
          <WorkspaceLabel workspacePath={workspacePath} />
        </div>
        <div
          className="nx-code-explorer-toolbar mt-3 grid grid-cols-5 justify-items-center gap-1"
          role="toolbar"
          aria-label="Explorer actions"
        >
          <ActionIconButton
            title={showSearch ? "Close search" : "Search files"}
            onClick={toggleSearch}
          >
            {showSearch ? <X size={16} /> : <Search size={16} />}
          </ActionIconButton>
          <ActionIconButton
            title="New file"
            tooltip="New file"
            onClick={() => handleStartCreate("file", null)}
            disabled={!canEditTree}
          >
            <FilePlus2 size={16} />
          </ActionIconButton>
          <ActionIconButton
            title="New folder"
            tooltip="New folder"
            onClick={() => handleStartCreate("folder", null)}
            disabled={!canEditTree}
          >
            <FolderPlus size={16} />
          </ActionIconButton>
          <ActionIconButton
            title={refreshing ? "Refreshing tree" : "Refresh tree"}
            tooltip={refreshing ? "Refreshing" : "Refresh tree"}
            onClick={handleRefresh}
            disabled={!hasWorkspace || isLoading || refreshing}
          >
            <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
          </ActionIconButton>
          <ActionIconButton
            title="Collapse all folders"
            tooltip="Collapse folders"
            onClick={handleCollapseAll}
            disabled={!hasWorkspace || treeLocked || fileList.length === 0}
          >
            <ChevronsDownUp size={16} />
          </ActionIconButton>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-b border-white/5 px-3 py-2"
          >
            <div className="flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2">
              <Search size={13} className="shrink-0 text-gray-500" />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search files"
                className="min-w-0 flex-1 bg-transparent text-xs text-gray-200 outline-none placeholder:text-gray-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  title="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="grid h-5 w-5 place-items-center rounded text-gray-500 hover:bg-white/10 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {visibleError && (
        <div className="m-2 flex items-start gap-2 rounded-md border border-red-400/20 bg-red-500/10 p-2 text-[11px] leading-5 text-red-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">{visibleError}</span>
          {hasWorkspace && (
            <button
              type="button"
              aria-label="Retry refresh"
              title="Retry refresh"
              disabled={isLoading || refreshing}
              onClick={handleRefresh}
              className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCcw size={12} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
          {localError && (
            <button
              type="button"
              aria-label="Dismiss error"
              title="Dismiss error"
              onClick={() => setLocalError("")}
              className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-white/10"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {isBounded && (
        <div className="border-b border-amber-400/10 bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-200/80">
          Tree capped at {model.stats.visibleRows} visible rows for responsiveness.
        </div>
      )}

      <div
        ref={treeViewportRef}
        className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-1"
        role="tree"
        aria-busy={isLoading || refreshing}
      >
        {isRefreshingTree && (
          <div className="pointer-events-none absolute right-2 top-2 z-20 inline-flex h-7 items-center gap-2 rounded-md border border-cyan-300/15 bg-[#07101e]/90 px-2 text-[10px] font-medium text-cyan-100/85 shadow-xl">
            <Loader2 size={12} className="shrink-0 animate-spin" />
            <span>Refreshing</span>
          </div>
        )}

        {isInitialLoading && (
          <LoadingState />
        )}

        {isErrorEmpty && (
          <EmptyState
            icon={AlertTriangle}
            title="Tree unavailable"
            detail="The workspace tree could not be read. Try refresh after the error clears."
          >
            {hasWorkspace && (
              <StateActionButton
                icon={RefreshCcw}
                onClick={handleRefresh}
                disabled={isLoading || refreshing}
              >
                Refresh
              </StateActionButton>
            )}
          </EmptyState>
        )}

        {!isInitialLoading && isMissingWorkspace && (
          <EmptyState
            icon={FolderOpen}
            title="Open a workspace"
            detail="Select a folder to populate the explorer."
          />
        )}

        {!isInitialLoading && isEmpty && (
          <EmptyState
            icon={FolderOpen}
            title="Workspace is empty"
            detail="Create a file or folder to start."
          >
            <StateActionButton icon={FilePlus2} onClick={() => handleStartCreate("file", null)}>
              New file
            </StateActionButton>
            <StateActionButton icon={FolderPlus} onClick={() => handleStartCreate("folder", null)}>
              New folder
            </StateActionButton>
          </EmptyState>
        )}

        {!isInitialLoading && isSearchEmpty && (
          <EmptyState icon={Search} title="No matches" detail="Try a shorter name, extension, or folder term.">
            <StateActionButton icon={X} onClick={() => setSearchQuery("")}>
              Clear search
            </StateActionButton>
          </EmptyState>
        )}

        {!isInitialLoading && hasTreeItems && (
          <div
            className="relative"
            style={{ height: `${virtualWindow.totalHeight + 8}px` }}
          >
            {virtualWindow.items.map(({ item, offsetY }) => {
              const rowStyle = {
                height: TREE_ROW_HEIGHT,
                transform: `translateY(${offsetY}px)`,
              };

              if (item.kind === "creation") {
                return (
                  <div
                    key={item.id}
                    className="absolute left-0 right-0"
                    style={rowStyle}
                  >
                    <CreationRow
                      depth={item.depth}
                      type={item.type}
                      onConfirm={(name) => handleCreateConfirm(name, item.parentId)}
                      onCancel={() => setCreating(null)}
                    />
                  </div>
                );
              }

              if (item.kind === "section") {
                return (
                  <div
                    key={item.id}
                    className="absolute left-0 right-0"
                    style={rowStyle}
                  >
                    <ExtensionSectionRow section={item.section} />
                  </div>
                );
              }

              if (item.kind === "overflow") {
                return (
                  <div
                    key={item.id}
                    className="absolute left-0 right-0"
                    style={rowStyle}
                  >
                    <OverflowRow row={item.row} />
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="absolute left-0 right-0"
                  style={rowStyle}
                >
                  <TreeRow
                    row={item.row}
                    activeFileId={activeFileId}
                    renamingId={renamingId}
                    deleteConfirmId={deleteConfirmId}
                    busyId={busyId}
                    onToggleFolder={handleToggleFolder}
                    onFileSelect={onFileSelect}
                    onStartCreate={handleStartCreate}
                    onStartRename={setRenamingId}
                    onRenameConfirm={handleRenameConfirm}
                    onDelete={handleDelete}
                    treeLocked={treeLocked}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
