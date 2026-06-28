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
  "grid h-7 w-7 shrink-0 place-items-center rounded-md text-gray-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

const rowActionClass =
  "grid h-5 w-5 shrink-0 place-items-center rounded text-gray-500 transition hover:bg-white/10 hover:text-white";

const TREE_ROW_HEIGHT = FILE_TREE_LIMITS.rowHeight || 32;
const TREE_VIRTUALIZE_AFTER = FILE_TREE_LIMITS.virtualizeAfter || 160;
const TREE_OVERSCAN_ROWS = FILE_TREE_LIMITS.overscanRows || 14;
const TREE_MAX_RENDERED_ROWS = FILE_TREE_LIMITS.maxRenderedRows || 260;

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

function ActionIconButton({ title, onClick, disabled = false, children }) {
  return (
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
  );
}

function InlineInput({
  defaultValue = "",
  onConfirm,
  onCancel,
  placeholder = "",
}) {
  const [value, setValue] = useState(defaultValue || "");
  const inputRef = useRef(null);
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
      className="h-8 overflow-hidden"
    >
      <div
        className="flex h-8 items-center gap-2 px-2"
        style={{ paddingLeft: `${depth * 14 + 28}px` }}
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

function EmptyState({ icon, title, detail }) {
  const Icon = icon;
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-5 text-center text-gray-500">
      <Icon size={34} className={`mb-3 opacity-70 ${Icon === Loader2 ? "animate-spin" : ""}`} />
      <div className="text-xs font-semibold text-gray-300">{title}</div>
      {detail && <div className="mt-1 max-w-[220px] text-[11px] leading-5">{detail}</div>}
    </div>
  );
}

function FileBadge({ node }) {
  if (node.isFolder) return null;
  const meta = getFileMeta(node.name);
  return (
    <span
      className="ml-1 shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-bold leading-none"
      style={{ color: meta.color, background: `${meta.color}14` }}
    >
      {meta.label}
    </span>
  );
}

function OverflowRow({ row }) {
  return (
    <div
      className="flex h-8 items-center gap-2 px-2 text-[11px] text-amber-300/80"
      style={{ paddingLeft: `${row.depth * 14 + 28}px` }}
    >
      <AlertTriangle size={13} className="shrink-0" />
      <span className="truncate">
        {row.overflowCount || "More"} items hidden to keep the tree responsive.
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
}) {
  const { node, depth, childCount, isOpen, hasChildren } = row;
  const isActive = activeFileId === node.id;
  const isFolder = node.isFolder;
  const isRenaming = renamingId === node.id;
  const isDeleting = deleteConfirmId === node.id;
  const isBusy = busyId === node.id;
  const indent = depth * 14 + 8;
  const meta = getFileMeta(node.name);

  const handleOpen = () => {
    if (isFolder) onToggleFolder?.(node.id);
    else onFileSelect?.(node.id);
  };

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={isFolder ? isOpen : undefined}
        aria-selected={isActive}
        tabIndex={0}
        onClick={handleOpen}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onStartRename(node.id);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
          }
          if (event.key === "F2") {
            event.preventDefault();
            onStartRename(node.id);
          }
        }}
        className="group relative flex h-8 min-w-0 cursor-pointer select-none items-center gap-1.5 rounded-md px-2 text-xs outline-none transition hover:bg-white/[0.06] focus:bg-white/[0.08]"
        style={{
          paddingLeft: `${indent}px`,
          background: isActive
            ? "rgba(var(--primary-rgb, 128, 0, 255), 0.15)"
            : undefined,
        }}
      >
        <div className="grid h-4 w-4 shrink-0 place-items-center">
          {isFolder && hasChildren && (
            isOpen ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )
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
            <span
              className={`min-w-0 flex-1 truncate font-mono ${
                isActive ? "text-white" : "text-gray-400"
              }`}
            >
              {node.name}
            </span>
            {isFolder && childCount > 0 && (
              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                {childCount}
              </span>
            )}
            <FileBadge node={node} />
          </>
        )}

        {!isRenaming && (
          <div className="ml-1 hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex">
            {isFolder && (
              <>
                <button
                  type="button"
                  title="New file"
                  aria-label="New file"
                  className={rowActionClass}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartCreate("file", node.id, !isOpen);
                  }}
                >
                  <FilePlus2 size={12} />
                </button>
                <button
                  type="button"
                  title="New folder"
                  aria-label="New folder"
                  className={rowActionClass}
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartCreate("folder", node.id, !isOpen);
                  }}
                >
                  <FolderPlus size={12} />
                </button>
              </>
            )}
            <button
              type="button"
              title={isDeleting ? "Confirm delete" : "Delete"}
              aria-label={isDeleting ? "Confirm delete" : "Delete"}
              disabled={isBusy}
              className={`${rowActionClass} ${isDeleting ? "text-red-400" : "hover:text-red-300"}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(node.id);
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
  const [creating, setCreating] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const searchRef = useRef(null);
  const treeViewportRef = useRef(null);
  const virtualFrameRef = useRef(0);
  const pendingScrollRestoreRef = useRef(null);
  const [treeViewport, setTreeViewport] = useState({
    height: 0,
    scrollTop: 0,
  });

  const fileList = Array.isArray(files) ? files : [];
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

  useEffect(() => {
    if (!deleteConfirmId) return undefined;
    const timer = window.setTimeout(() => setDeleteConfirmId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [deleteConfirmId]);

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
    setLocalError("");
    pendingScrollRestoreRef.current = treeViewportRef.current?.scrollTop || 0;
    setRefreshing(true);
    try {
      await Promise.resolve(onRefresh?.());
      setRefreshNonce((value) => value + 1);
    } catch (refreshError) {
      setLocalError(refreshError?.message || "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleCollapseAll = useCallback(() => {
    const openFolders = fileList.filter((item) => item?.type === "folder" && item?.isOpen);
    openFolders.slice(0, 500).forEach((folder) => onToggleFolder?.(folder.id));
    setCreating(null);
    setRenamingId(null);
  }, [fileList, onToggleFolder]);

  const handleStartCreate = useCallback(
    (type, parentId = null, shouldOpenParent = false) => {
      if (shouldOpenParent && parentId) onToggleFolder?.(parentId);
      setCreating({ type, parentId });
    },
    [onToggleFolder],
  );

  const toggleSearch = useCallback(() => {
    setShowSearch((visible) => {
      if (visible) setSearchQuery("");
      return !visible;
    });
  }, []);

  const treeItems = useMemo(() => {
    const items = [];
    if (creating?.parentId === null) {
      items.push({
        id: `creation:root:${creating.type}`,
        kind: "creation",
        depth: 0,
        type: creating.type,
        parentId: null,
      });
    }

    for (const row of model.rows) {
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

  const virtualWindow = useMemo(() => {
    const totalRows = treeItems.length;
    const shouldVirtualize = totalRows > TREE_VIRTUALIZE_AFTER;

    if (!shouldVirtualize) {
      return {
        isVirtualized: false,
        items: treeItems,
        topSpacer: 0,
        bottomSpacer: 0,
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
      items: treeItems.slice(startIndex, endIndex),
      topSpacer: startIndex * TREE_ROW_HEIGHT,
      bottomSpacer: Math.max(0, (totalRows - endIndex) * TREE_ROW_HEIGHT),
      renderedRows: endIndex - startIndex,
      totalRows,
    };
  }, [treeItems, treeViewport.height, treeViewport.scrollTop]);

  const visibleError = localError || error;
  const hasTreeItems = treeItems.length > 0;
  const isInitialLoading = isLoading && !hasTreeItems;
  const isRefreshingTree = (isLoading || refreshing) && hasTreeItems;
  const isEmpty = !isLoading && !visibleError && fileList.length === 0 && !creating;
  const isSearchEmpty = !isLoading && !visibleError && fileList.length > 0 && model.rows.length === 0 && !creating;
  const isErrorEmpty = !isLoading && Boolean(visibleError) && !hasTreeItems;
  const isBounded = model.stats.hiddenByRowLimit > 0 || model.stats.hiddenByChildLimit > 0;

  return (
    <div className="flex h-full w-full flex-col bg-[#060614]/20 text-gray-200">
      <div className="border-b border-white/5 bg-white/[0.04] p-3">
        <div className="mb-2 flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-[8rem] flex-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Explorer
            </div>
            <div className="mt-1 text-[10px] text-gray-600">
              {model.stats.files} files / {model.stats.folders} folders / {model.stats.visibleRows} rows
            </div>
          </div>
          <div className="flex max-w-[10rem] shrink-0 flex-wrap items-center justify-end gap-1">
            <ActionIconButton title="Search" onClick={toggleSearch}>
              {showSearch ? <X size={14} /> : <Search size={14} />}
            </ActionIconButton>
            <ActionIconButton title="New file" onClick={() => setCreating({ type: "file", parentId: null })}>
              <FilePlus2 size={14} />
            </ActionIconButton>
            <ActionIconButton title="New folder" onClick={() => setCreating({ type: "folder", parentId: null })}>
              <FolderPlus size={14} />
            </ActionIconButton>
            <ActionIconButton title="Refresh tree" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
            </ActionIconButton>
            <ActionIconButton title="Collapse folders" onClick={handleCollapseAll}>
              <ChevronsDownUp size={14} />
            </ActionIconButton>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <WorkspaceLabel workspacePath={workspacePath} />
          {virtualWindow.isVirtualized && (
            <span className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
              {virtualWindow.renderedRows}/{virtualWindow.totalRows}
            </span>
          )}
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

      {isRefreshingTree && (
        <div className="flex items-center gap-2 border-b border-cyan-400/10 bg-cyan-500/10 px-3 py-1.5 text-[10px] text-cyan-100/80">
          <Loader2 size={12} className="shrink-0 animate-spin" />
          <span className="min-w-0 truncate">Refreshing workspace entries.</span>
        </div>
      )}

      {isBounded && (
        <div className="border-b border-amber-400/10 bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-200/80">
          Tree capped at {model.stats.visibleRows} visible rows for responsiveness.
        </div>
      )}

      <div
        ref={treeViewportRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 py-1"
        role="tree"
        aria-busy={isLoading || refreshing}
      >
        {isInitialLoading && (
          <EmptyState icon={Loader2} title="Loading tree" detail="Reading workspace entries." />
        )}

        {isErrorEmpty && (
          <EmptyState
            icon={AlertTriangle}
            title="Tree unavailable"
            detail="The workspace tree could not be read. Try refresh after the error clears."
          />
        )}

        {!isInitialLoading && isEmpty && (
          <EmptyState
            icon={FolderOpen}
            title={workspacePath ? "Workspace is empty" : "Open a workspace"}
            detail={workspacePath ? "Create a file or folder to start." : "Select a folder to populate the explorer."}
          />
        )}

        {!isInitialLoading && isSearchEmpty && (
          <EmptyState icon={Search} title="No matches" detail="Try a shorter name, extension, or folder term." />
        )}

        {!isInitialLoading && hasTreeItems && (
          <div className="pb-2">
            {virtualWindow.topSpacer > 0 && (
              <div aria-hidden="true" style={{ height: `${virtualWindow.topSpacer}px` }} />
            )}
            {virtualWindow.items.map((item) => {
              if (item.kind === "creation") {
                return (
                  <CreationRow
                    key={item.id}
                    depth={item.depth}
                    type={item.type}
                    onConfirm={(name) => handleCreateConfirm(name, item.parentId)}
                    onCancel={() => setCreating(null)}
                  />
                );
              }

              if (item.kind === "overflow") {
                return <OverflowRow key={item.id} row={item.row} />;
              }

              return (
                <TreeRow
                  key={item.id}
                  row={item.row}
                  activeFileId={activeFileId}
                  renamingId={renamingId}
                  deleteConfirmId={deleteConfirmId}
                  busyId={busyId}
                  onToggleFolder={onToggleFolder}
                  onFileSelect={onFileSelect}
                  onStartCreate={handleStartCreate}
                  onStartRename={setRenamingId}
                  onRenameConfirm={handleRenameConfirm}
                  onDelete={handleDelete}
                />
              );
            })}
            {virtualWindow.bottomSpacer > 0 && (
              <div aria-hidden="true" style={{ height: `${virtualWindow.bottomSpacer}px` }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
