import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Trash2,
  FolderOpen,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LANG_META = {
  js: { label: "JS", color: "#facc15" },
  jsx: { label: "JSX", color: "#61dafb" },
  ts: { label: "TS", color: "#3b82f6" },
  tsx: { label: "TSX", color: "#3b82f6" },
  py: { label: "PY", color: "#22c55e" },
  java: { label: "JAVA", color: "#f97316" },
  html: { label: "HTML", color: "#f97316" },
  css: { label: "CSS", color: "#3b82f6" },
  scss: { label: "SCSS", color: "#ec4899" },
  json: { label: "JSON", color: "#facc15" },
  md: { label: "MD", color: "#a855f7" },
};

function getExt(name) {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function getLangMeta(name) {
  const ext = getExt(name);
  return (
    LANG_META[ext] || { label: ext.toUpperCase() || "TXT", color: "#6b7280" }
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

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") onCancel();
          e.stopPropagation();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-xs text-gray-200 font-mono outline-none placeholder:text-gray-600"
        style={{
          borderBottom: "1px solid var(--primary, #8000ff)",
          paddingBottom: "1px",
        }}
        onBlur={onCancel}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const TreeItem = ({
  item,
  depth,
  activeFileId,
  onFileSelect,
  onToggleFolder,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
  files,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [creatingType, setCreatingType] = useState(null); // 'file' or 'folder'
  const [isHovered, setIsHovered] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isActive = activeFileId === item.id;
  const isFolder = item.type === "folder";
  const { color } = getLangMeta(item.name);
  const children = useMemo(
    () => files.filter((f) => f.parentId === item.id),
    [files, item.id],
  );

  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  const handleAction = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="w-full">
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (isFolder) onToggleFolder(item.id);
          else onFileSelect(item.id);
        }}
        onDoubleClick={() => setRenaming(true)}
        className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-0.5 cursor-pointer select-none transition-all relative"
        style={{
          background: isActive
            ? "rgba(var(--primary-rgb, 128,0,255), 0.12)"
            : "transparent",
          paddingLeft: `${depth * 12 + 8}px`,
        }}
      >
        {isFolder ? (
          item.isOpen ? (
            <ChevronDown size={14} className="text-gray-500" />
          ) : (
            <ChevronRight size={14} className="text-gray-500" />
          )
        ) : (
          <div className="w-3.5" />
        )}

        {isFolder ? (
          <Folder
            size={14}
            className={item.isOpen ? "text-purple-400" : "text-gray-400"}
          />
        ) : (
          <File size={14} style={{ color: color }} />
        )}

        {renaming ? (
          <InlineInput
            defaultValue={item.name}
            onConfirm={(name) => {
              onRename(item.id, name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            className={`text-xs font-mono truncate flex-1 ${isActive ? "text-white" : "text-gray-400"}`}
          >
            {item.name}
          </span>
        )}

        {isHovered && !renaming && (
          <div className="flex items-center gap-1">
            {isFolder && (
              <>
                <div
                  onClick={(e) =>
                    handleAction(e, () => setCreatingType("file"))
                  }
                  title="Neue Datei"
                >
                  <Plus size={12} className="text-gray-500 hover:text-white" />
                </div>
                <div
                  onClick={(e) =>
                    handleAction(e, () => setCreatingType("folder"))
                  }
                  title="Neuer Ordner"
                >
                  <FolderOpen
                    size={12}
                    className="text-gray-500 hover:text-white"
                  />
                </div>
              </>
            )}
            <div
              onClick={(e) =>
                handleAction(e, () => {
                  if (deleteConfirm) onDelete(item.id);
                  else setDeleteConfirm(true);
                })
              }
              title={deleteConfirm ? "Bestätigen" : "Löschen"}
            >
              <Trash2
                size={12}
                className={
                  deleteConfirm
                    ? "text-red-500"
                    : "text-gray-500 hover:text-red-400"
                }
              />
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {creatingType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}
          >
            <InlineInput
              placeholder={creatingType === "file" ? "name.js" : "ordner..."}
              onConfirm={(name) => {
                if (creatingType === "file") onCreateFile(name, item.id);
                else onCreateFolder(name, item.id);
                setCreatingType(null);
                if (!item.isOpen) onToggleFolder(item.id);
              }}
              onCancel={() => setCreatingType(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFolder && item.isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <TreeItem
                key={child.id}
                item={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onToggleFolder={onToggleFolder}
                onRename={onRename}
                onDelete={onDelete}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                files={files}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  onToggleFolder,
  workspacePath,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [rootCreatingType, setRootCreatingType] = useState(null);

  const searchRef = useRef(null);

  const rootItems = useMemo(() => files.filter((f) => !f.parentId), [files]);

  useEffect(() => {
    if (showSearch) searchRef.current?.focus();
  }, [showSearch]);

  const toggleSearch = () => {
    setShowSearch((p) => !p);
    if (showSearch) setSearchQuery("");
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#060614]/20">
      <div className="p-3 border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Explorer
          </span>
          <div className="flex items-center gap-1">
            <div onClick={toggleSearch} title="Suchen">
              <Search
                size={14}
                className="text-gray-500 cursor-pointer hover:text-white"
              />
            </div>
            <div onClick={() => setRootCreatingType("file")} title="Neue Datei">
              <Plus
                size={14}
                className="text-gray-500 cursor-pointer hover:text-white"
              />
            </div>
            <div
              onClick={() => setRootCreatingType("folder")}
              title="Neuer Ordner"
            >
              <FolderOpen
                size={14}
                className="text-gray-500 cursor-pointer hover:text-white"
              />
            </div>
          </div>
        </div>
        {workspacePath && (
          <div className="flex items-center gap-2 px-1">
            <ChevronDown size={12} className="text-gray-400 shrink-0" />
            <span className="text-[11px] font-bold text-gray-300 truncate tracking-tight">
              {workspacePath.split(/[\\/]/).pop().toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-3 pb-2"
          >
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen..."
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-purple-500/50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
        <AnimatePresence>
          {rootCreatingType && (
            <div className="px-5 py-1">
              <InlineInput
                placeholder={
                  rootCreatingType === "file" ? "name.js" : "ordner..."
                }
                onConfirm={(name) => {
                  if (rootCreatingType === "file") onCreateFile(name);
                  else onCreateFolder(name);
                  setRootCreatingType(null);
                }}
                onCancel={() => setRootCreatingType(null)}
              />
            </div>
          )}
        </AnimatePresence>

        {rootItems.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            depth={0}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onToggleFolder={onToggleFolder}
            onRename={onRenameFile}
            onDelete={onDeleteFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            files={files}
          />
        ))}

        {rootItems.length === 0 && !rootCreatingType && (
          <div className="flex flex-col items-center justify-center py-10 opacity-30">
            <FolderOpen size={32} />
            <span className="text-xs mt-2">Workspace leer</span>
          </div>
        )}
      </div>
    </div>
  );
}
