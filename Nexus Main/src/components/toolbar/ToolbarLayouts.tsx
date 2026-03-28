import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Terminal } from "lucide-react";
import { Glass } from "../Glass";
import { hexToRgb } from "../../lib/utils";
import { VIEW_ITEMS } from "./constants";
import { DockLogo, StatusPill } from "./ToolbarPrimitives";

type ToolbarTheme = any;

type TerminalState = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

type FullWidthToolbarLayoutProps = {
  isBottom: boolean;
  t: ToolbarTheme;
  rgb: string;
  pendingTasks: number;
  overdueReminders: number;
  timeStr: string;
  terminal: TerminalState;
  panelOpen: boolean;
  panel: React.ReactNode;
  setPanelOpen: (open: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setView?: (v: any) => void;
};

export function FullWidthToolbarLayout(props: FullWidthToolbarLayoutProps) {
  const {
    isBottom,
    t,
    rgb,
    pendingTasks,
    overdueReminders,
    timeStr,
    terminal,
    panelOpen,
    panel,
    setPanelOpen,
    setExpanded,
    setView,
  } = props;

  return (
      <div style={{ position: "relative", width: "100%" }}>
        <Glass
          type="modal"
          style={{
            width: "100%",
            height: t.toolbar?.height ?? 44,
            borderRadius: 0,
            borderTop: isBottom
              ? "1px solid rgba(255,255,255,0.08)"
              : undefined,
            borderBottom: !isBottom
              ? "1px solid rgba(255,255,255,0.08)"
              : undefined,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 12px",
          }}
        >
          <DockLogo t={t} rgb={rgb} compact />
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(255,255,255,0.1)",
              margin: "0 6px",
            }}
          />

          <div
            className="nx-toolbar-view-rail"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              maxWidth: "52vw",
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 2,
            }}
          >
            {VIEW_ITEMS.map((item) => {
              const itemRgb = hexToRgb(item.color);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setView?.(item.id)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "5px 9px",
                    background: "transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    color: "inherit",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `rgba(${itemRgb},0.16)`;
                    e.currentTarget.style.color = item.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "inherit";
                  }}
                >
                  <Icon size={12} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          <StatusPill
            label="Tasks"
            value={pendingTasks}
            color={pendingTasks ? "#ff9f0a" : undefined}
          />
          <StatusPill
            label="Due"
            value={overdueReminders}
            color={overdueReminders ? "#ff453a" : undefined}
          />
          <StatusPill label="Time" value={timeStr} color={t.accent} mono />

          <button
            onClick={() => terminal.setOpen(!terminal.isOpen)}
            style={{
              border: `1px solid ${terminal.isOpen ? `rgba(${rgb},0.28)` : "rgba(255,255,255,0.09)"}`,
              background: terminal.isOpen
                ? `rgba(${rgb},0.15)`
                : "rgba(255,255,255,0.05)",
              borderRadius: 8,
              cursor: "pointer",
              color: terminal.isOpen ? t.accent : "inherit",
              padding: "5px 9px",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Terminal size={12} /> Terminal
          </button>
          <button
            onClick={() => {
              setPanelOpen(true);
              setExpanded(true);
            }}
            style={{
              border: `1px solid rgba(${rgb},0.3)`,
              background: `rgba(${rgb},0.12)`,
              color: t.accent,
              borderRadius: 8,
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Search size={12} /> Search
          </button>
        </Glass>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              style={{
                position: "absolute",
                right: 14,
                bottom: isBottom ? "calc(100% + 8px)" : undefined,
                top: !isBottom ? "calc(100% + 8px)" : undefined,
                width: "min(680px, 94vw)",
                zIndex: 910,
              }}
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}

type IslandToolbarLayoutProps = {
  isBottom: boolean;
  t: ToolbarTheme;
  rgb: string;
  pendingTasks: number;
  overdueReminders: number;
  timeStr: string;
  terminal: TerminalState;
  panelOpen: boolean;
  panel: React.ReactNode;
  setPanelOpen: (open: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  reducedMotion: boolean;
  spotlightAnchorX: string;
  islandRef: React.RefObject<HTMLDivElement>;
  expanded: boolean;
  islandCompact: boolean;
  setView?: (v: any) => void;
};

export function IslandToolbarLayout(props: IslandToolbarLayoutProps) {
  const {
    isBottom,
    t,
    rgb,
    pendingTasks,
    overdueReminders,
    timeStr,
    terminal,
    panelOpen,
    panel,
    setPanelOpen,
    setExpanded,
    reducedMotion,
    spotlightAnchorX,
    islandRef,
    expanded,
    islandCompact,
    setView,
  } = props;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: isBottom ? "0 0 10px" : "10px 0 0",
      }}
    >
      <motion.div
        ref={islandRef}
        animate={{
          width: expanded ? "min(1120px, 98vw)" : "min(520px, 94vw)",
          height: expanded ? 74 : 56,
        }}
        transition={
          reducedMotion
            ? { duration: 0.12 }
            : { type: "spring", stiffness: 300, damping: 32, mass: 0.9 }
        }
        style={{
          position: "relative",
          animation:
            expanded && !reducedMotion
              ? "nexus-dock-breathe 3.8s ease-in-out infinite"
              : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: expanded ? -10 : -6,
            borderRadius: expanded ? 34 : 28,
            background: `conic-gradient(from 0deg, ${t.accent}, ${t.accent2}, ${t.accent})`,
            filter: `blur(${expanded ? 24 : 16}px)`,
            opacity: expanded ? 0.55 : 0.28,
            animation: reducedMotion
              ? undefined
              : "nexus-gradient-shift 8s ease infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: expanded ? -2 : 0,
            borderRadius: expanded ? 28 : 22,
            border: `1px solid rgba(${rgb},${expanded ? 0.5 : 0.3})`,
            boxShadow: `0 0 ${expanded ? 28 : 14}px rgba(${rgb},${expanded ? 0.35 : 0.2})`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 90,
            borderRadius: 999,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
            mixBlendMode: "screen",
            pointerEvents: "none",
            animation: reducedMotion
              ? undefined
              : "nexus-shine-sweep 4.8s ease-in-out infinite",
          }}
        />

        <Glass
          type="modal"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: expanded ? 26 : 22,
            display: "flex",
            alignItems: "center",
            padding: expanded ? "0 14px" : "0 14px",
            gap: expanded ? 10 : 8,
            overflow: "hidden",
            border: `1px solid rgba(${rgb},${expanded ? 0.22 : 0.14})`,
            background: t.mode === "dark"
              ? "linear-gradient(135deg, rgba(12,14,22,0.86), rgba(18,20,32,0.72))"
              : "linear-gradient(135deg, rgba(255,255,255,0.86), rgba(242,246,255,0.78))",
          }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => {
            if (!panelOpen) setExpanded(false);
          }}
        >
          <DockLogo t={t} rgb={rgb} compact={!expanded} />

          {!expanded && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Nexus Island
                </span>
                <span style={{ fontSize: 10, opacity: 0.55 }}>⌘K</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <StatusPill
                  label="Tasks"
                  value={pendingTasks}
                  color={pendingTasks ? "#ff9f0a" : undefined}
                />
                <StatusPill
                  label="Due"
                  value={overdueReminders}
                  color={overdueReminders ? "#ff453a" : undefined}
                />
                <span style={{ fontSize: 10, opacity: 0.55, fontFamily: "monospace" }}>
                  {timeStr}
                </span>
              </div>
            </div>
          )}

          {expanded && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: islandCompact ? 4 : 6,
                    minWidth: 0,
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "hidden",
                    paddingBottom: 2,
                  }}
                  className="nx-toolbar-view-rail"
                >
                  {VIEW_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const iRgb = hexToRgb(item.color);
                    return (
                      <button
                        key={item.id}
                        onClick={() => setView?.(item.id)}
                        title={item.label}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: islandCompact ? 0 : 6,
                          whiteSpace: "nowrap",
                          border: "none",
                          borderRadius: 10,
                          background: "transparent",
                          padding: islandCompact ? "6px 7px" : "6px 9px",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "inherit",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `rgba(${iRgb},0.16)`;
                          e.currentTarget.style.color = item.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "inherit";
                        }}
                      >
                        <Icon size={13} />
                        {!islandCompact && item.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                  }}
                >
                  {islandCompact ? (
                    <>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: pendingTasks ? "#ff9f0a" : "inherit",
                          opacity: pendingTasks ? 1 : 0.6,
                        }}
                      >
                        T {pendingTasks}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: overdueReminders ? "#ff453a" : "inherit",
                          opacity: overdueReminders ? 1 : 0.6,
                        }}
                      >
                        D {overdueReminders}
                      </span>
                    </>
                  ) : (
                    <>
                      <StatusPill
                        label="Tasks"
                        value={pendingTasks}
                        color={pendingTasks ? "#ff9f0a" : undefined}
                      />
                      <StatusPill
                        label="Due"
                        value={overdueReminders}
                        color={overdueReminders ? "#ff453a" : undefined}
                      />
                    </>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      opacity: 0.55,
                      fontFamily: "monospace",
                    }}
                  >
                    {timeStr}
                  </span>
                </div>
              </div>

              <button
                onClick={() => terminal.setOpen(!terminal.isOpen)}
                style={{
                  border: `1px solid ${terminal.isOpen ? `rgba(${rgb},0.35)` : "rgba(255,255,255,0.09)"}`,
                  borderRadius: 11,
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: terminal.isOpen ? t.accent : "inherit",
                  background: terminal.isOpen
                    ? `rgba(${rgb},0.2)`
                    : "rgba(255,255,255,0.04)",
                }}
              >
                <Terminal
                  size={16}
                  style={{ opacity: terminal.isOpen ? 1 : 0.56 }}
                />
              </button>
              <button
                onClick={() => {
                  setPanelOpen(true);
                  setExpanded(true);
                }}
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 11,
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "inherit",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <Search size={16} style={{ opacity: 0.62 }} />
              </button>
            </>
          )}
        </Glass>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={
                reducedMotion
                  ? { duration: 0.12 }
                  : { type: "spring", stiffness: 340, damping: 30 }
              }
              style={{
                position: "absolute",
                left: spotlightAnchorX,
                transform: "translateX(-30%)",
                top: isBottom ? undefined : "calc(100% + 12px)",
                bottom: isBottom ? "calc(100% + 12px)" : undefined,
                width: "min(700px, 92vw)",
                zIndex: 920,
              }}
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
