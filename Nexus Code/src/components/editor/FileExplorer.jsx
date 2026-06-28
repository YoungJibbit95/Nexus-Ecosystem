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
  "grid h-6 w-6 shrink-0 place-items-center rounded-md text-gray-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

const rowActionClass =
  "grid h-5 w-5 shrink-0 place-items-center rounded text-gray-500 transition hover:bg-white/10 hover:text-white";

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
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
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
      className="flex h-7 items-center gap-2 px-2 text-[11px] text-amber-300/80"
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
  creating,
  renamingId,
  deleteConfirmId,
  busyId,
  onToggleFolder,
  onFileSelect,
  onStartCreate,
  onStartRename,
  onRenameConfirm,
  onDelete,
  onCancelCreate,
  onCreateConfirm,
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

      <AnimatePresence>
        {creating?.parentId === node.id && (
          <CreationRow
            depth={depth + 1}
            type={creating.type}
            onConfirm={(name) => onCreateConfirm(name, node.id)}
            onCancel={onCancelCreate}
          />
        )}
      </AnimatePresence>
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

  const fileList = Array.isArray(files) ? files : [];
  const model = useMemo(
    () => createFileTreeModel(fileList, {
      query: searchQuery,
      maxRows: FILE_TREE_LIMITS.maxRows,
      maxChildrenPerFolder: FILE_TREE_LIMITS.maxChildrenPerFolder,
    }),
    [fileList, refreshNonce, searchQuery],
  );

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    if (!deleteConfirmId) return undefined;
    const timer = window.setTimeout(() => setDeleteConfirmId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [deleteConfirmId]);

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

  const visibleError = localError || error;
  const hasRows = model.rows.length > 0;
  const isEmpty = !isLoading && !visibleError && fileList.length === 0;
  const isSearchEmpty = !isLoading && !visibleError && fileList.length > 0 && !hasRows;
  const isBounded = model.stats.hiddenByRowLimit > 0 || model.stats.hiddenByChildLimit > 0;

  return (
    <div className="flex h-full w-full flex-col bg-[#060614]/20 text-gray-200">
      <div className="border-b border-white/5 bg-white/[0.04] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Explorer
            </div>
            <div className="mt-1 text-[10px] text-gray-600">
              {model.stats.files} files / {model.stats.folders} folders
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
        <WorkspaceLabel workspacePath={workspacePath} />
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
          <button
            type="button"
            aria-label="Dismiss error"
            title="Dismiss error"
            onClick={() => setLocalError("")}
            className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-white/10"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {isBounded && (
        <div className="border-b border-amber-400/10 bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-200/80">
          Tree capped at {model.stats.visibleRows} visible rows for responsiveness.
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1 custom-scrollbar" role="tree">
        <AnimatePresence>
          {creating?.parentId === null && (
            <CreationRow
              depth={0}
              type={creating.type}
              onConfirm={(name) => handleCreateConfirm(name, null)}
              onCancel={() => setCreating(null)}
            />
          )}
        </AnimatePresence>

        {isLoading && (
          <EmptyState icon={Loader2} title="Loading tree" detail="Reading workspace entries." />
        )}

        {!isLoading && isEmpty && (
          <EmptyState
            icon={FolderOpen}
            title={workspacePath ? "Workspace is empty" : "Open a workspace"}
            detail={workspacePath ? "Create a file or folder to start." : "Select a folder to populate the explorer."}
          />
        )}

        {!isLoading && isSearchEmpty && (
          <EmptyState icon={Search} title="No matches" detail="Try a shorter name, extension, or folder term." />
        )}

        {!isLoading && hasRows && (
          <div className="pb-2">
            {model.rows.map((row) => (
              row.kind === "overflow" ? (
                <OverflowRow key={row.id} row={row} />
              ) : (
                <TreeRow
                  key={row.id}
                  row={row}
                  activeFileId={activeFileId}
                  creating={creating}
                  renamingId={renamingId}
                  deleteConfirmId={deleteConfirmId}
                  busyId={busyId}
                  onToggleFolder={onToggleFolder}
                  onFileSelect={onFileSelect}
                  onStartCreate={handleStartCreate}
                  onStartRename={setRenamingId}
                  onRenameConfirm={handleRenameConfirm}
                  onDelete={handleDelete}
                  onCancelCreate={() => setCreating(null)}
                  onCreateConfirm={handleCreateConfirm}
                />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
