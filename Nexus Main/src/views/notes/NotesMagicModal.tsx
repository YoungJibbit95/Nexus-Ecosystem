import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  NOTES_MAGIC_DEFINITIONS,
  buildNotesMagicSnippet,
} from "@nexus/core/notes/magicRegistry";

export interface MagicModalProps {
  accent: string;
  accent2: string;
  onClose: () => void;
  onInsert: (snippet: string) => void;
}

export function MagicElementModal({
  accent,
  accent2,
  onClose,
  onInsert,
}: MagicModalProps) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const type = NOTES_MAGIC_DEFINITIONS.find((m) => m.id === selected);

  const handleSelect = (id: string) => {
    setSelected(id);
    const definition = NOTES_MAGIC_DEFINITIONS.find((m) => m.id === id);
    if (!definition) return;
    const defaults: Record<string, string> = {};
    definition.fields.forEach((field) => {
      defaults[field.key] = field.placeholder;
    });
    setFields(defaults);
  };

  const handleInsert = () => {
    if (!type) return;
    onInsert(buildNotesMagicSnippet(type.id, fields));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "85vh",
          background: "rgba(12,12,22,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05), 0 0 60px ${accent}18`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${accent}40, ${accent2}30)`,
                border: `1px solid ${accent}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ✦
            </div>
            <div>
              <div
                style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}
              >
                {selected ? `Magic: ${type?.label}` : "Magic Element einfügen"}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4, marginTop: 1 }}>
                {selected ? type?.desc : "Wähle ein Element aus"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "5px 10px",
              cursor: "pointer",
              color: "inherit",
              fontSize: 11,
              opacity: 0.7,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <X size={12} /> ESC
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              width: 220,
              borderRight: "1px solid rgba(255,255,255,0.07)",
              padding: 12,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                opacity: 0.3,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              Elemente
            </div>
            {NOTES_MAGIC_DEFINITIONS.map((definition) => (
              <button
                key={definition.id}
                onClick={() => handleSelect(definition.id)}
                className="nx-surface-row"
                data-active={selected === definition.id ? "true" : "false"}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: 10,
                  marginBottom: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: `1px solid ${selected === definition.id ? definition.color + "50" : "transparent"}`,
                  background:
                    selected === definition.id
                      ? `${definition.color}18`
                      : "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  ["--nx-row-hover-bg" as any]: "rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                  {definition.icon}
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                    {definition.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.4,
                      marginTop: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {definition.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              padding: 20,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {!selected ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.35,
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 48 }}>✦</div>
                <div style={{ fontSize: 13, textAlign: "center" }}>
                  Wähle links ein Element aus
                  <br />
                  und befülle es mit deinen Daten
                </div>
              </div>
            ) : type ? (
              <>
                <div
                  style={{
                    height: 3,
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${type.color}, ${type.color}44)`,
                    marginBottom: 20,
                  }}
                />

                {type.fields.map((field) => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        opacity: 0.6,
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        value={fields[field.key] ?? ""}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        rows={field.key === "rows" || field.key === "items" ? 5 : 3}
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          color: "inherit",
                          fontFamily: "'Fira Code', monospace",
                          fontSize: 12,
                          lineHeight: 1.6,
                          resize: "vertical",
                          outline: "none",
                          transition: "border-color 0.15s",
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={fields[field.key] ?? ""}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10,
                          padding: "9px 12px",
                          color: "inherit",
                          fontFamily: "inherit",
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                    )}
                  </div>
                ))}

                <div style={{ marginTop: 4, marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.4,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: 8,
                    }}
                  >
                    Vorschau
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontFamily: "'Fira Code', monospace",
                      fontSize: 11,
                      opacity: 0.65,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {buildNotesMagicSnippet(type.id, fields)}
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                <button
                  onClick={handleInsert}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#fff",
                    background: `linear-gradient(135deg, ${type.color}, ${accent2})`,
                    boxShadow: `0 4px 20px ${type.color}44`,
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{type.icon}</span>
                  In Notiz einfügen
                </button>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
