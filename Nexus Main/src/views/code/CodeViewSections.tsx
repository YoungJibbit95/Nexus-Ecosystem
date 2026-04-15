import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileCode, Plus, Search, Trash2 } from "lucide-react";
import { Glass } from "../../components/Glass";
import { InteractiveIconButton } from "../../components/render/InteractiveIconButton";
import type { CodeFile } from "../../store/appStore";
import type { CodeLanguage } from "./languageRegistry";
import { getLang } from "./languageRegistry";
import { ToolBtn } from "./CodeViewPrimitives";

export function CodeExplorerSidebar({
  codes,
  activeCodeId,
  search,
  searchOpen,
  rgb,
  setSearch,
  setSearchOpen,
  setNewOpen,
  openCode,
  setCode,
  delCode,
}: {
  codes: CodeFile[];
  activeCodeId: string | null;
  search: string;
  searchOpen: boolean;
  rgb: string;
  setSearch: (value: string) => void;
  setSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openCode: (id: string) => void;
  setCode: (id: string) => void;
  delCode: (id: string) => void;
}) {
  const sideFiles = codes.filter(
    (code) => !search || code.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(0,0,0,0.14)",
      }}
    >
      <div
        style={{
          padding: "12px 10px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            opacity: 0.4,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          Explorer
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <ToolBtn
            onClick={() => setSearchOpen((state) => !state)}
            title="Search files"
            icon={<Search size={13} />}
            active={searchOpen}
          />
          <ToolBtn
            onClick={() => setNewOpen(true)}
            title="New file"
            icon={<Plus size={13} />}
          />
        </div>
      </div>

      {searchOpen ? (
        <div style={{ padding: "0 8px 8px" }}>
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter…"
            style={{
              width: "100%",
              padding: "5px 8px",
              borderRadius: 7,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              outline: "none",
              fontSize: 12,
              color: "inherit",
            }}
          />
        </div>
      ) : null}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 6px" }}>
        {sideFiles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, fontSize: 12, opacity: 0.3 }}>
            No files
          </div>
        ) : null}

        {sideFiles.map((file) => {
          const lang = getLang(file.lang);
          const active = file.id === activeCodeId;
          return (
            <div
              key={file.id}
              onClick={() => {
                openCode(file.id);
                setCode(file.id);
              }}
              className="nx-surface-row"
              data-active={active ? "true" : "false"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 8px",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 2,
                background: active ? `rgba(${rgb},0.12)` : "transparent",
                border: active ? `1px solid rgba(${rgb},0.22)` : "1px solid transparent",
                ["--nx-row-hover-bg" as any]: "rgba(255,255,255,0.05)",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: lang.color,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                  width: 26,
                  flexShrink: 0,
                }}
              >
                {lang.ext}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  opacity: active ? 1 : 0.65,
                }}
              >
                {file.dirty ? <span style={{ color: "#7aa9ff" }}>● </span> : null}
                {file.name}
              </span>
              <InteractiveIconButton
                motionId={`code-explorer-delete-${file.id}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (confirm(`Delete "${file.name}"?`)) delCode(file.id);
                }}
                intent="danger"
                idleOpacity={0.28}
                radius={4}
                style={{ padding: "2px 3px" }}
              >
                <Trash2 size={11} />
              </InteractiveIconButton>
            </div>
          );
        })}
      </div>

      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          opacity: 0.3,
        }}
      >
        {codes.length} file{codes.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export function EmptyCodeState({
  accent,
  rgb,
  setNewOpen,
}: {
  accent: string;
  rgb: string;
  setNewOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        opacity: 0.55,
      }}
    >
      <FileCode size={52} strokeWidth={1} style={{ color: accent, opacity: 0.4 }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No file open</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>Select from sidebar or create a new file</div>
      </div>
      <button
        onClick={() => setNewOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 20px",
          borderRadius: 10,
          background: accent,
          border: "none",
          cursor: "pointer",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: `0 4px 18px rgba(${rgb},0.4)`,
        }}
      >
        <Plus size={14} /> New File
      </button>
    </div>
  );
}

export function CodeNewFileModal({
  open,
  fileName,
  fileLang,
  langs,
  accent,
  setOpen,
  setFileName,
  setFileLang,
  createFile,
}: {
  open: boolean;
  fileName: string;
  fileLang: string;
  langs: CodeLanguage[];
  accent: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  setFileLang: React.Dispatch<React.SetStateAction<string>>;
  createFile: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Glass style={{ width: 420, padding: 24 }} glow>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>New File</div>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  File name
                </div>
                <input
                  autoFocus
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && createFile()}
                  placeholder="main.js"
                  style={{
                    width: "100%",
                    padding: "8px 11px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    outline: "none",
                    fontSize: 13,
                    color: "inherit",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.5,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Language
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                  {langs.filter((language) => language.id !== "plaintext").map((language) => (
                    <button
                      key={language.id}
                      onClick={() => {
                        setFileLang(language.id);
                        const base = fileName.split(".")[0] || "main";
                        setFileName(`${base}.${language.ext}`);
                      }}
                      style={{
                        padding: "7px 4px",
                        borderRadius: 8,
                        border: `1px solid ${fileLang === language.id ? language.color : "rgba(255,255,255,0.08)"}`,
                        background: fileLang === language.id ? `${language.color}22` : "transparent",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 700,
                        color: fileLang === language.id ? language.color : "inherit",
                        transition: "all 0.12s",
                      }}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={createFile}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: 9,
                    background: accent,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  Create
                </button>
              </div>
            </Glass>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
