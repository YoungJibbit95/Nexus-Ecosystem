import React from "react";
import {
  Search,
  Keyboard,
  Command,
  Clock,
  Pin,
  ArrowRight,
} from "lucide-react";
import { Glass } from "../Glass";
import { hexToRgb } from "../../lib/utils";
import { VIEW_ITEMS } from "./constants";
import type { CommandItem } from "./types";

export function CommandPanel({
  isBottom,
  t,
  rgb,
  search,
  setSearch,
  list,
  selIdx,
  setSelIdx,
  onClose,
  onKeyDown,
  inputRef,
  setView,
  onSelectItem,
  onTogglePin,
  isPinned,
  pinnedCommands,
  recentCommands,
}: {
  isBottom: boolean;
  t: any;
  rgb: string;
  search: string;
  setSearch: (v: string) => void;
  list: CommandItem[];
  selIdx: number;
  setSelIdx: (v: number) => void;
  onClose: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  setView?: (v: any) => void;
  onSelectItem: (item: CommandItem) => void;
  onTogglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  pinnedCommands: CommandItem[];
  recentCommands: CommandItem[];
}) {
  return (
    <Glass
      type="modal"
      glow
      style={{
        borderRadius: 18,
        border: `1px solid rgba(${rgb},0.32)`,
        boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 30px rgba(${rgb},0.2)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid rgba(${rgb},0.32)`,
            background: `rgba(${rgb},0.14)`,
          }}
        >
          <Search size={14} style={{ color: t.accent }} />
        </div>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelIdx(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search commands... (note:, task:, rem:, canvas:)"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 15,
            fontWeight: 650,
            color: "inherit",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            opacity: 0.5,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          <Keyboard size={11} />
          ↑↓ Enter
        </div>
        <button
          onClick={onClose}
          style={{
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 700,
            color: "inherit",
            padding: "3px 8px",
            cursor: "pointer",
          }}
        >
          ESC
        </button>
      </div>

      {!search && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "8px 12px 6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: 0.48,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            <Command size={11} />
            Quick navigation
            <Clock size={11} style={{ marginLeft: 8 }} />
            Shift x2
          </div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}
          >
            {[
              { label: "note:", value: "note: " },
              { label: "task:", value: "task: " },
              { label: "rem:", value: "rem: " },
              { label: "canvas:", value: "canvas: " },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setSearch(item.value);
                  setSelIdx(0);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "inherit",
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  padding: "3px 7px",
                  cursor: "pointer",
                  opacity: 0.72,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}
          >
            {VIEW_ITEMS.slice(0, 8).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setView?.(v.id);
                  onClose();
                }}
                style={{
                  border: `1px solid rgba(${hexToRgb(v.color)},0.25)`,
                  background: `rgba(${hexToRgb(v.color)},0.12)`,
                  color: v.color,
                  borderRadius: 9,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "5px 9px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <v.icon size={11} /> {v.label}
              </button>
            ))}
          </div>

          {pinnedCommands.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.5,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Pinned Commands
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {pinnedCommands.slice(0, 6).map((item) => (
                  <button
                    key={`pin-${item.id}`}
                    onClick={() => onSelectItem(item)}
                    style={{
                      border: `1px solid rgba(${hexToRgb(item.color || t.accent)},0.25)`,
                      background: `rgba(${hexToRgb(item.color || t.accent)},0.1)`,
                      color: item.color || t.accent,
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 8px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Pin size={10} /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {recentCommands.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.5,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Recent Commands
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {recentCommands.slice(0, 6).map((item) => (
                  <button
                    key={`recent-${item.id}`}
                    onClick={() => onSelectItem(item)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.05)",
                      color: "inherit",
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 8px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Clock size={10} /> {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          maxHeight: 360,
          overflowY: "auto",
          padding: "6px 8px",
        }}
      >
        {list.length === 0 && (
          <div
            style={{
              padding: "18px 12px",
              opacity: 0.4,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            No results
          </div>
        )}

        {list.map((item, i) => {
          const iRgb = hexToRgb(item.color || t.accent);
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => {
                onSelectItem(item);
              }}
              onMouseEnter={() => setSelIdx(i)}
              style={{
                width: "100%",
                border: `1px solid ${selIdx === i ? `rgba(${iRgb},0.26)` : "transparent"}`,
                background: selIdx === i ? `rgba(${iRgb},0.12)` : "transparent",
                borderRadius: 10,
                cursor: "pointer",
                color: "inherit",
                textAlign: "left",
                padding: "8px 9px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    selIdx === i
                      ? `rgba(${iRgb},0.2)`
                      : "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  size={13}
                  style={{
                    color: selIdx === i ? item.color || t.accent : "inherit",
                    opacity: selIdx === i ? 1 : 0.6,
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 650,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    opacity: 0.38,
                    textTransform: "capitalize",
                  }}
                >
                  {item.type}
                  {item.hint ? ` · ${item.hint}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {item.type === "command" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(item.id);
                    }}
                    title={isPinned(item.id) ? "Unpin command" : "Pin command"}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: isPinned(item.id)
                        ? `rgba(${iRgb},0.2)`
                        : "rgba(255,255,255,0.05)",
                      color: isPinned(item.id)
                        ? item.color || t.accent
                        : "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <Pin
                      size={11}
                      fill={isPinned(item.id) ? item.color || t.accent : "none"}
                    />
                  </button>
                )}
                {selIdx === i && (
                  <ArrowRight
                    size={12}
                    style={{ color: item.color || t.accent, opacity: 0.68 }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "7px 11px",
          fontSize: 10,
          opacity: 0.42,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{list.length} results</span>
        <span>
          {pinnedCommands.length} pinned ·{" "}
          {isBottom ? "Bottom toolbar mode" : "Top toolbar mode"}
        </span>
      </div>
    </Glass>
  );
}
