import React, { useEffect, useState } from "react";
import { Sparkles, Wand2, X } from "lucide-react";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";

export type MagicTemplateId =
  | "mindmap"
  | "roadmap"
  | "sprint"
  | "risk-matrix"
  | "decision-flow"
  | "meeting-hub"
  | "delivery-map"
  | "ai-project";

export type MagicTemplatePayload = {
  template: MagicTemplateId;
  title: string;
  includeNotes: boolean;
  includeTasks: boolean;
  aiPrompt?: string;
  aiDepth?: "light" | "balanced" | "deep";
};

const MAGIC_TEMPLATES: {
  id: MagicTemplateId;
  label: string;
  desc: string;
  icon: string;
  color: string;
}[] = [
  {
    id: "mindmap",
    label: "Mindmap Core",
    desc: "Großes Hub-Widget als zentraler Startpunkt für Mindmaps.",
    icon: "🧠",
    color: "#64D2FF",
  },
  {
    id: "roadmap",
    label: "Project Roadmap",
    desc: "Ein zentrales Roadmap-Widget mit Planung, Timeline und KPIs.",
    icon: "🗺️",
    color: "#30D158",
  },
  {
    id: "sprint",
    label: "Sprint Planner",
    desc: "Sprint-Hub mit Kanban, Steps und Checklist in einer Node.",
    icon: "🏁",
    color: "#FF9F0A",
  },
  {
    id: "risk-matrix",
    label: "Risk Matrix",
    desc: "Risikohub als zentrale Matrix-Node für Mitigations.",
    icon: "⚠️",
    color: "#FF453A",
  },
  {
    id: "decision-flow",
    label: "Decision Flow",
    desc: "Decision-Hub mit Optionen, Kriterien und Ausführungspfad.",
    icon: "🌿",
    color: "#BF5AF2",
  },
  {
    id: "meeting-hub",
    label: "Meeting Hub",
    desc: "Meeting als ein großes Hub-Widget für Agenda und Actions.",
    icon: "🗓️",
    color: "#64D2FF",
  },
  {
    id: "delivery-map",
    label: "Delivery Map",
    desc: "Delivery-Hub mit Backlog/Build/QA/Launch als zentrale Node.",
    icon: "🚚",
    color: "#30D158",
  },
  {
    id: "ai-project",
    label: "AI Project Generator",
    desc: "Prompt erzeugt ein einzelnes AI-Hub-Widget als Startpunkt.",
    icon: "🤖",
    color: "#5E5CE6",
  },
];

export function CanvasMagicModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: MagicTemplatePayload) => void;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const [template, setTemplate] = useState<MagicTemplateId>("mindmap");
  const [title, setTitle] = useState("Neues Projekt");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDepth, setAiDepth] = useState<"light" | "balanced" | "deep">(
    "balanced",
  );

  useEffect(() => {
    if (!open) return;
    setTemplate("mindmap");
    setTitle("Neues Projekt");
    setIncludeNotes(true);
    setIncludeTasks(true);
    setAiPrompt("");
    setAiDepth("balanced");
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 650,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(7px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "min(820px, 94vw)",
          maxHeight: "86vh",
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            t.mode === "dark" ? "rgba(9,11,20,0.95)" : "rgba(245,248,255,0.95)",
          boxShadow: `0 32px 90px rgba(0,0,0,0.65), 0 0 40px rgba(${rgb},0.2)`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: `linear-gradient(135deg, rgba(${rgb},0.14), rgba(${hexToRgb(t.accent2)},0.08))`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid rgba(${rgb},0.35)`,
                background: `rgba(${rgb},0.2)`,
              }}
            >
              <Wand2 size={16} style={{ color: t.accent }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                }}
              >
                Canvas Magic Builder
              </div>
              <div style={{ fontSize: 11, opacity: 0.55 }}>
                Projekt-, Mindmap- und PM-Strukturen in 1 Klick
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "inherit",
              borderRadius: 8,
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <X size={12} /> Esc
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {MAGIC_TEMPLATES.map((item) => {
              const active = item.id === template;
              return (
                <button
                  key={item.id}
                  onClick={() => setTemplate(item.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 12,
                    cursor: "pointer",
                    padding: "11px 12px",
                    border: `1px solid ${active ? item.color : "rgba(255,255,255,0.12)"}`,
                    background: active
                      ? `${item.color}22`
                      : "rgba(255,255,255,0.03)",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: active ? item.color : undefined,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 7,
                }}
              >
                Name
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Projektname..."
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "8px 10px",
                  color: "inherit",
                  outline: "none",
                  fontSize: 12,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    opacity: 0.75,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    style={{ accentColor: t.accent }}
                  />
                  Notiz-Sektion im Hub ergänzen
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    opacity: 0.75,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeTasks}
                    onChange={(e) => setIncludeTasks(e.target.checked)}
                    style={{ accentColor: t.accent }}
                  />
                  Task-Checklist im Hub ergänzen
                </label>
              </div>

              {template === "ai-project" && (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      opacity: 0.5,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      marginTop: 10,
                      marginBottom: 6,
                    }}
                  >
                    AI Prompt
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="z. B. Multi-Platform Note-App mit AI Search, Sync und Team-Collab..."
                    rows={4}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "8px 10px",
                      color: "inherit",
                      outline: "none",
                      fontSize: 12,
                      lineHeight: 1.5,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <select
                      value={aiDepth}
                      onChange={(e) =>
                        setAiDepth(
                          e.target.value as "light" | "balanced" | "deep",
                        )
                      }
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        padding: "7px 9px",
                        color: "inherit",
                        outline: "none",
                        fontSize: 12,
                      }}
                    >
                      <option value="light">Depth: Light (schnell)</option>
                      <option value="balanced">
                        Depth: Balanced (Standard)
                      </option>
                      <option value="deep">Depth: Deep (umfangreich)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 7,
                }}
              >
                Output
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.55, opacity: 0.82 }}>
                {template === "ai-project"
                  ? "Erzeugt ein großes AI-Hub-Widget aus deinem Prompt. Danach kannst du normale Nodes gezielt anhängen."
                  : "Erzeugt ein einzelnes großes Hub-Widget mit Magic-Markdown-Struktur als zentralen Canvas-Anker."}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: `rgba(${rgb},0.15)`,
                    border: `1px solid rgba(${rgb},0.3)`,
                  }}
                >
                  Hub First
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: `rgba(${hexToRgb(t.accent2)},0.15)`,
                    border: `1px solid rgba(${hexToRgb(t.accent2)},0.3)`,
                  }}
                >
                  Magic Blocks
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  Attach More Nodes
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: 12,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.13)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={() =>
              onCreate({
                template,
                title: title.trim() || "Neues Projekt",
                includeNotes,
                includeTasks,
                aiPrompt: aiPrompt.trim(),
                aiDepth,
              })
            }
            style={{
              borderRadius: 9,
              border: "none",
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              color: "#fff",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: `0 8px 24px rgba(${rgb},0.35)`,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Sparkles size={13} /> Struktur erzeugen
          </button>
        </div>
      </div>
    </div>
  );
}
