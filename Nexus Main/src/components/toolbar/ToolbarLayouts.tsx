import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Terminal } from "lucide-react";
import { Glass } from "../Glass";
import { hexToRgb } from "../../lib/utils";
import { VIEW_ITEMS } from "./constants";
import { TOOLBAR_LAYOUT_CONFIG, SPOTLIGHT_POP_TRANSITION } from "./layoutConfig";
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
  motionRuntime: any;
};

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
  motionRuntime: any;
};

function ViewRailButton({
  label,
  color,
  icon: Icon,
  compact,
  onClick,
}: {
  label: string;
  color: string;
  icon: any;
  compact?: boolean;
  onClick: () => void;
}) {
  const itemRgb = hexToRgb(color);
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0 : 6,
        whiteSpace: "nowrap",
        border: "none",
        borderRadius: 10,
        background: "transparent",
        padding: compact ? "6px 7px" : "6px 9px",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        color: "inherit",
      }}
      onPointerEnter={(e) => {
        e.currentTarget.style.background = `rgba(${itemRgb},0.16)`;
        e.currentTarget.style.color = color;
        e.currentTarget.style.transform = "translateX(1px) scale(1.03)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "inherit";
        e.currentTarget.style.transform = "translateX(0) scale(1)";
      }}
    >
      <Icon size={13} />
      {!compact && label}
      <AnimatePresence>
        {compact && hovered ? (
          <motion.span
            initial={{ opacity: 0, x: 8, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1.04 }}
            exit={{ opacity: 0, x: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              top: "50%",
              left: "calc(100% + 8px)",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              borderRadius: 8,
              border: `1px solid rgba(${itemRgb},0.4)`,
              background: `linear-gradient(180deg, rgba(${itemRgb},0.2), rgba(${itemRgb},0.1))`,
              color,
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 8px",
              zIndex: 40,
              boxShadow: `0 10px 22px rgba(${itemRgb},0.22)`,
            }}
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}

function IconActionButton({
  active,
  rgb,
  color,
  title,
  offset,
  children,
  onClick,
}: {
  active?: boolean;
  rgb: string;
  color?: string;
  title: string;
  offset?: { x?: number; y?: number };
  children: React.ReactNode;
  onClick: () => void;
}) {
  const x = offset?.x ?? 0;
  const y = offset?.y ?? 0;
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        border: `1px solid ${active ? `rgba(${rgb},0.35)` : "rgba(255,255,255,0.1)"}`,
        borderRadius: 10,
        cursor: "pointer",
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color || "inherit",
        background: active ? `rgba(${rgb},0.2)` : "rgba(255,255,255,0.04)",
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {children}
    </button>
  );
}

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
    motionRuntime,
  } = props;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <Glass
        type="modal"
        disablePulse
        style={{
          width: "100%",
          height: t.toolbar?.height ?? 44,
          borderRadius: 0,
          borderTop: isBottom ? "1px solid rgba(255,255,255,0.08)" : undefined,
          borderBottom: !isBottom
            ? "1px solid rgba(255,255,255,0.08)"
            : undefined,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
          <DockLogo
            t={t}
            rgb={rgb}
            compact
            offset={TOOLBAR_LAYOUT_CONFIG.island.logoOffset}
          />
            <div
              style={{
                width: 1,
                height: 18,
                background: "rgba(255,255,255,0.1)",
              }}
            />
          </div>

          <div
            className="nx-toolbar-view-rail"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              minWidth: 0,
              flex: 1,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 2,
            }}
          >
            {VIEW_ITEMS.map((item) => (
              <ViewRailButton
                key={item.id}
                label={item.label}
                color={item.color}
                icon={item.icon}
                onClick={() => setView?.(item.id)}
              />
            ))}
          </div>

          <div
            className="nx-toolbar-right-rail"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 2,
              maxWidth: "54vw",
            }}
          >
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
                border: `1px solid ${
                  terminal.isOpen
                    ? `rgba(${rgb},0.28)`
                    : "rgba(255,255,255,0.09)"
                }`,
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
                whiteSpace: "nowrap",
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
                whiteSpace: "nowrap",
              }}
            >
              <Search size={12} /> Search
            </button>
          </div>
        </div>
      </Glass>

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={motionRuntime?.pageTransition}
            style={{
              position: "absolute",
              right: 12,
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
    motionRuntime,
  } = props;

  const compactMode = islandCompact;

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
          width: expanded
            ? TOOLBAR_LAYOUT_CONFIG.island.expandedWidth
            : TOOLBAR_LAYOUT_CONFIG.island.collapsedWidth,
          height: expanded
            ? TOOLBAR_LAYOUT_CONFIG.island.expandedHeight
            : TOOLBAR_LAYOUT_CONFIG.island.collapsedHeight,
        }}
        transition={
          reducedMotion
            ? {
                duration: Math.max((motionRuntime?.quickMs ?? 120) / 1000, 0.1),
              }
            : (motionRuntime?.spring ?? {
                type: "spring",
                stiffness: 280,
                damping: 30,
                mass: 0.92,
              })
        }
        style={{ position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            inset: expanded ? -7 : -5,
            borderRadius: expanded ? 28 : 24,
            background: `radial-gradient(circle at 20% 20%, rgba(${rgb},0.38), transparent 62%)`,
            filter: `blur(${expanded ? 16 : 10}px)`,
            opacity: expanded ? 0.8 : 0.5,
            pointerEvents: "none",
          }}
        />

        <Glass
          type="modal"
          disablePulse
          style={{
            width: "100%",
            height: "100%",
            borderRadius: expanded ? 24 : 20,
            display: "flex",
            alignItems: "center",
            padding: expanded
              ? TOOLBAR_LAYOUT_CONFIG.island.glassPaddingExpanded
              : TOOLBAR_LAYOUT_CONFIG.island.glassPaddingCollapsed,
            gap: expanded
              ? TOOLBAR_LAYOUT_CONFIG.island.glassGapExpanded
              : TOOLBAR_LAYOUT_CONFIG.island.glassGapCollapsed,
            overflow: "visible",
            border: `1px solid rgba(${rgb},${expanded ? 0.24 : 0.16})`,
            background:
              t.mode === "dark"
                ? "linear-gradient(135deg, rgba(12,14,22,0.88), rgba(18,20,32,0.76))"
                : "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(243,247,255,0.82))",
          }}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => {
            if (!panelOpen) setExpanded(false);
          }}
        >
          <DockLogo
            t={t}
            rgb={rgb}
            compact={!expanded}
            offset={TOOLBAR_LAYOUT_CONFIG.island.logoOffset}
          />

          {!expanded && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: TOOLBAR_LAYOUT_CONFIG.island.collapsedContentGap,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                  transform: `translate(${TOOLBAR_LAYOUT_CONFIG.island.brandOffset.x}px, ${TOOLBAR_LAYOUT_CONFIG.island.brandOffset.y}px)`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Nexus Island
                </span>
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.55,
                    whiteSpace: "nowrap",
                  }}
                >
                  ⌘K
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  transform: `translate(${TOOLBAR_LAYOUT_CONFIG.island.statusOffset.x}px, ${TOOLBAR_LAYOUT_CONFIG.island.statusOffset.y}px)`,
                }}
              >
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
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.55,
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                  }}
                >
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
                  gap: 8,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  className="nx-toolbar-view-rail"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: compactMode
                      ? TOOLBAR_LAYOUT_CONFIG.island.expandedViewRailGapCompact
                      : TOOLBAR_LAYOUT_CONFIG.island.expandedViewRailGapRegular,
                    minWidth: 0,
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "hidden",
                    paddingBottom: 2,
                  }}
                >
                  {VIEW_ITEMS.map((item) => (
                    <ViewRailButton
                      key={item.id}
                      label={item.label}
                      color={item.color}
                      icon={item.icon}
                      compact={compactMode}
                      onClick={() => setView?.(item.id)}
                    />
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                    transform: `translate(${TOOLBAR_LAYOUT_CONFIG.island.statusOffset.x}px, ${TOOLBAR_LAYOUT_CONFIG.island.statusOffset.y}px)`,
                  }}
                >
                  {compactMode ? (
                    <>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: pendingTasks ? "#ff9f0a" : "inherit",
                          opacity: pendingTasks ? 1 : 0.6,
                          whiteSpace: "nowrap",
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
                          whiteSpace: "nowrap",
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    {timeStr}
                  </span>
                </div>
              </div>

              <IconActionButton
                active={terminal.isOpen}
                rgb={rgb}
                color={terminal.isOpen ? t.accent : undefined}
                title="Terminal"
                offset={TOOLBAR_LAYOUT_CONFIG.island.actionButtonOffset.terminal}
                onClick={() => terminal.setOpen(!terminal.isOpen)}
              >
                <Terminal
                  size={16}
                  style={{ opacity: terminal.isOpen ? 1 : 0.56 }}
                />
              </IconActionButton>

              <IconActionButton
                rgb={rgb}
                title="Search"
                offset={TOOLBAR_LAYOUT_CONFIG.island.actionButtonOffset.search}
                onClick={() => {
                  setPanelOpen(true);
                  setExpanded(true);
                }}
              >
                <Search size={16} style={{ opacity: 0.72 }} />
              </IconActionButton>
            </>
          )}
        </Glass>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={
                motionRuntime?.reduced
                  ? { duration: 0.12 }
                  : (motionRuntime?.spring ?? SPOTLIGHT_POP_TRANSITION)
              }
              style={{
                position: "absolute",
                left: spotlightAnchorX,
                transform: `translateX(${TOOLBAR_LAYOUT_CONFIG.spotlight.translateX})`,
                top: isBottom ? undefined : "calc(100% + 12px)",
                bottom: isBottom ? "calc(100% + 12px)" : undefined,
                width: "min(700px, 86vw)",
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
