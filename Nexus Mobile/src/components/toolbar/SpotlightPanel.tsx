import React from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { shallow } from "zustand/shallow";
import { Glass } from "../Glass";
import { useApp } from "../../store/appStore";
import { hexToRgb } from "../../lib/utils";

export function SpotlightPanel({
  search,
  setSearch,
  selIdx,
  setSelIdx,
  suggestions,
  commands,
  handleKey,
  inputRef,
  onClose,
  views,
  setView,
  rgb,
  t,
  compact,
}: any) {
  const { notes, tasks, reminders, codes } = useApp(
    (s) => ({
      notes: s.notes,
      tasks: s.tasks,
      reminders: s.reminders,
      codes: s.codes,
    }),
    shallow,
  );
  const list = search ? suggestions : commands;
  return (
    <Glass
      type="modal"
      glow
      disablePulse
      performanceProfile="balanced"
      style={{
        borderRadius: compact ? 14 : 20,
        border: `1px solid rgba(${rgb},0.35)`,
        backdropFilter: "blur(36px) saturate(230%)",
        WebkitBackdropFilter: "blur(36px) saturate(230%)",
        boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(${rgb},0.1), 0 0 40px rgba(${rgb},0.12)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: compact ? "11px 14px" : "14px 18px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: `linear-gradient(135deg,rgba(${rgb},0.28),rgba(${rgb},0.1))`,
            border: `1px solid rgba(${rgb},0.35)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Search size={14} style={{ color: t.accent }} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelIdx(0);
          }}
          onKeyDown={handleKey}
          placeholder={search ? "Suchen…" : "Befehl oder suchen…"}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: compact ? 14 : 16,
            fontWeight: 600,
            color: "inherit",
            letterSpacing: "-0.01em",
          }}
        />
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7,
            padding: "3px 9px",
            cursor: "pointer",
            color: "inherit",
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            gap: 3,
            opacity: 0.6,
          }}
        >
          <X size={10} /> ESC
        </button>
      </div>

      {!search && !compact && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "8px 10px 4px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: `Notes ${notes.length}`, c: "#30D158" },
              {
                label: `Tasks ${tasks.filter((x: any) => x.status !== "done").length}`,
                c: "#FF9F0A",
              },
              {
                label: `Reminders ${reminders.filter((x: any) => !x.done).length}`,
                c: "#FF453A",
              },
              { label: `Code ${codes.length}`, c: "#BF5AF2" },
            ].map((s) => (
              <span
                key={s.label}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 12,
                  background: `rgba(${hexToRgb(s.c)},0.12)`,
                  border: `1px solid rgba(${hexToRgb(s.c)},0.25)`,
                  color: s.c,
                }}
              >
                {s.label}
              </span>
            ))}
          </div>
          <div
            style={{
              fontSize: 9,
              opacity: 0.3,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginBottom: 6,
              paddingLeft: 4,
            }}
          >
            Schnell-Navigation
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {views.map((v: any) => (
              <button
                key={v.id}
                onClick={() => {
                  setView?.(v.id);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 9,
                  background: `rgba(${hexToRgb(v.color)},0.1)`,
                  border: `1px solid rgba(${hexToRgb(v.color)},0.2)`,
                  cursor: "pointer",
                  color: v.color,
                  fontSize: 11,
                  fontWeight: 700,
                  transition: "all 0.12s",
                }}
              >
                <v.icon size={11} /> {v.label}
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 8,
              padding: "6px 8px",
              fontSize: 10,
              opacity: 0.45,
              borderRadius: 8,
              border: "1px dashed rgba(255,255,255,0.18)",
            }}
          >
            Tipp: Suche nach Inhalt, z. B. Notiztitel, Task-Text oder Befehl wie{" "}
            <code style={{ fontSize: 10 }}>preset</code>,{" "}
            <code style={{ fontSize: 10 }}>new</code>.
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "5px 8px",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {list.map((item: any, i: number) => {
            const iRgb = item.color ? hexToRgb(item.color) : rgb;
            return (
              <button
                key={i}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                onMouseEnter={() => setSelIdx(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: selIdx === i ? `rgba(${iRgb},0.12)` : "transparent",
                  border: `1px solid ${selIdx === i ? `rgba(${iRgb},0.25)` : "transparent"}`,
                  color: "inherit",
                  textAlign: "left",
                  transition: "all 0.1s",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    flexShrink: 0,
                    background:
                      selIdx === i
                        ? `rgba(${iRgb},0.2)`
                        : "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <item.icon
                    size={14}
                    style={{
                      color: selIdx === i ? item.color || t.accent : "inherit",
                      opacity: selIdx === i ? 1 : 0.5,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {item.title || item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.35,
                      textTransform: "capitalize",
                    }}
                  >
                    {item.type || "command"}
                  </div>
                </div>
                {selIdx === i && (
                  <ArrowRight
                    size={12}
                    style={{ color: item.color || t.accent, opacity: 0.6 }}
                  />
                )}
              </button>
            );
          })}
          <div
            style={{
              padding: "5px 12px 2px",
              fontSize: 9,
              opacity: 0.22,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{list.length} items</span>
            <span>↑↓ navigate · Enter select</span>
          </div>
        </div>
      )}
    </Glass>
  );
}
