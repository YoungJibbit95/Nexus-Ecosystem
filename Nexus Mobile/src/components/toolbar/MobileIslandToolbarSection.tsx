import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Terminal } from "lucide-react";
import { resolveToolbarBrandSpec } from "@nexus/core";
import { type Theme } from "../../store/themeStore";
import { Glass } from "../Glass";
import { hexToRgb } from "../../lib/utils";
import { MOBILE_TOOLBAR_LAYOUT } from "./layoutConfig";
import { MOBILE_TOOLBAR_VIEW_ITEMS } from "./viewItems";
import {
  type MobileToolbarCommand,
  type MobileToolbarSuggestion,
} from "./mobileToolbarCommandModel";
import { IslandToolbarBrand } from "./ToolbarBranding";
import { SpotlightPanel } from "./SpotlightPanel";

type MobileToolbarSetView = ((view: any) => void) | undefined;

type MotionFamily = {
  transition: Record<string, unknown>;
};

type MotionRuntimeLike = {
  reduced?: boolean;
  quickMs?: number;
};

type MobileIslandToolbarSectionProps = {
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  cmdMode: boolean;
  setCmdMode: React.Dispatch<React.SetStateAction<boolean>>;
  isBottom: boolean;
  rgb: string;
  t: Theme;
  reducedMotion: boolean;
  toolbarMotion: MotionFamily;
  commandMotion: MotionFamily;
  motionRuntime: MotionRuntimeLike;
  viewportWidth: number;
  hovered: string | null;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
  pendingTasks: number;
  overdueCount: number;
  timeStr: string;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  selIdx: number;
  setSelIdx: React.Dispatch<React.SetStateAction<number>>;
  suggestions: MobileToolbarSuggestion[];
  commands: MobileToolbarCommand[];
  handleKey: (event: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setView: MobileToolbarSetView;
  spotlightAnchorX: string;
};

export function MobileIslandToolbarSection({
  expanded,
  setExpanded,
  cmdMode,
  setCmdMode,
  isBottom,
  rgb,
  t,
  reducedMotion,
  toolbarMotion,
  commandMotion,
  motionRuntime,
  viewportWidth,
  hovered,
  setHovered,
  pendingTasks,
  overdueCount,
  timeStr,
  terminalOpen,
  setTerminalOpen,
  search,
  setSearch,
  selIdx,
  setSelIdx,
  suggestions,
  commands,
  handleKey,
  inputRef,
  setView,
  spotlightAnchorX,
}: MobileIslandToolbarSectionProps) {
  const islandBrand = resolveToolbarBrandSpec({
    mode: "island",
    width: viewportWidth,
    compact: viewportWidth < 900,
    expanded,
    platform: "mobile",
  });
  const islandRightRailPx = expanded
    ? Math.round(
        Math.max(
          132,
          Math.min(
            viewportWidth * (viewportWidth < 900 ? 0.28 : 0.25),
            viewportWidth < 900 ? 190 : 240,
          ),
        ),
      )
    : Math.round(Math.max(120, Math.min(viewportWidth * 0.24, 170)));
  const showIslandLabelsResolved = viewportWidth >= 1060;
  const islandCompactStatus = viewportWidth < 1080;
  const showIslandTime = viewportWidth >= 1220 && !islandCompactStatus;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: isBottom ? "0 0 10px" : "10px 0 0",
        pointerEvents: "none",
        position: "relative",
      }}
    >
      <motion.div
        animate={{
          width: expanded ? "min(980px, 96vw)" : "min(460px, 94vw)",
          height: 56,
        }}
        transition={
          reducedMotion
            ? { duration: Math.max((motionRuntime.quickMs ?? 120) / 1000, 0.1) }
            : toolbarMotion.transition
        }
        onHoverStart={() => setExpanded(true)}
        onHoverEnd={() => {
          if (!cmdMode) setExpanded(false);
        }}
        style={{ pointerEvents: "auto", position: "relative" }}
      >
        <Glass
          type="modal"
          className="nx-toolbar-surface nx-toolbar-surface--island"
          glow={expanded}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: expanded ? 22 : 18,
            border: expanded
              ? `1px solid rgba(${rgb},0.4)`
              : `1px solid rgba(255,255,255,0.12)`,
            backdropFilter: "blur(30px) saturate(220%)",
            WebkitBackdropFilter: "blur(30px) saturate(220%)",
            display: "flex",
            alignItems: "center",
            overflow: "visible",
            padding: expanded ? "0 16px" : "0 18px",
            gap: 0,
            transition: "border-color 0.3s",
            boxShadow: expanded
              ? `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(${rgb},0.15)`
              : `0 8px 28px rgba(0,0,0,0.45), 0 2px 0 0 rgba(255,255,255,0.06) inset`,
          }}
        >
          <IslandToolbarBrand
            rgb={rgb}
            t={t}
            spec={islandBrand}
            offset={MOBILE_TOOLBAR_LAYOUT.island.logoOffset}
          />

          <AnimatePresence initial={false}>
            {!expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginLeft: 10,
                  transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.brandOffset.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.brandOffset.y}px)`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    opacity: 0.55,
                    letterSpacing: "0.04em",
                  }}
                >
                  Nexus
                </span>
                <div style={{ display: "flex", gap: 3, opacity: 0.25 }}>
                  {MOBILE_TOOLBAR_VIEW_ITEMS.slice(0, 5).map((v) => (
                    <v.icon key={v.id} size={9} />
                  ))}
                </div>
                {overdueCount > 0 && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#FF453A",
                      boxShadow: "0 0 6px #FF453A",
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={toolbarMotion.transition}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  gap: 8,
                  marginLeft: 8,
                  minWidth: 0,
                }}
              >
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
                    height: "100%",
                    paddingRight: 2,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {MOBILE_TOOLBAR_VIEW_ITEMS.map((item) => {
                    const iRgb = hexToRgb(item.color);
                    return (
                      <button
                        key={item.id}
                        onClick={() => item.id && setView?.(item.id)}
                        onMouseEnter={() => setHovered(item.id)}
                        onMouseLeave={() => setHovered(null)}
                        title={item.label}
                        style={{
                          position: "relative",
                          padding: "7px 9px",
                          borderRadius: 11,
                          border: "none",
                          background:
                            hovered === item.id
                              ? `rgba(${iRgb},0.2)`
                              : "transparent",
                          cursor: "pointer",
                          transition: "all 0.12s",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                          color: hovered === item.id ? item.color : "inherit",
                        }}
                      >
                        <item.icon
                          size={14}
                          style={{
                            opacity: hovered === item.id ? 1 : 0.5,
                            transition: "all 0.12s",
                          }}
                        />
                        {showIslandLabelsResolved ? (
                          <span style={{ fontSize: 11, fontWeight: 700 }}>
                            {item.label}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    width: 1,
                    height: 18,
                    background: "rgba(255,255,255,0.1)",
                    margin: "0 6px",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 7,
                    minWidth: 0,
                    width: `${islandRightRailPx}px`,
                    maxWidth: "100%",
                    flexBasis: `${islandRightRailPx}px`,
                    overflow: "hidden",
                    paddingBottom: 2,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "4px 10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      flexShrink: 0,
                      transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.statusOffset.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.statusOffset.y}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: pendingTasks > 0 ? "#FF9F0A" : "inherit",
                        opacity: pendingTasks > 0 ? 1 : 0.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      T {pendingTasks}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: overdueCount > 0 ? "#FF453A" : "inherit",
                        opacity: overdueCount > 0 ? 1 : 0.55,
                        whiteSpace: "nowrap",
                      }}
                    >
                      D {overdueCount}
                    </span>
                    {showIslandTime ? (
                      <span
                        style={{
                          fontSize: 9,
                          opacity: 0.35,
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {timeStr}
                      </span>
                    ) : null}
                  </div>

                  <button
                    className="nx-icon-btn"
                    onClick={() => setTerminalOpen(!terminalOpen)}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      borderRadius: 9,
                      border: `1px solid rgba(255,255,255,${terminalOpen ? 0.2 : 0.08})`,
                      background: terminalOpen
                        ? `rgba(${rgb},0.2)`
                        : "rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      color: terminalOpen ? t.accent : "inherit",
                      transition: "all 0.12s",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.terminal.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.terminal.y}px)`,
                    }}
                  >
                    <Terminal
                      size={14}
                      style={{ opacity: terminalOpen ? 1 : 0.4 }}
                    />
                  </button>
                  <button
                    className="nx-icon-btn"
                    onClick={() => {
                      setCmdMode(true);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      borderRadius: 9,
                      border: `1px solid rgba(${rgb},0.2)`,
                      background: `rgba(${rgb},0.1)`,
                      cursor: "pointer",
                      color: t.accent,
                      transition: "all 0.12s",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `translate(${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.search.x}px, ${MOBILE_TOOLBAR_LAYOUT.island.actionButtonOffset.search.y}px)`,
                    }}
                  >
                    <Search size={14} style={{ opacity: 0.72 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Glass>

        <AnimatePresence>
          {cmdMode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={commandMotion.transition}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 898,
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
                onClick={() => {
                  setCmdMode(false);
                  setExpanded(false);
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={
                  motionRuntime.reduced
                    ? { duration: 0.12 }
                    : commandMotion.transition
                }
                style={{
                  position: "fixed",
                  top: isBottom ? "auto" : "calc(100% + 12px)",
                  bottom: isBottom ? "calc(100% + 12px)" : "auto",
                  left: spotlightAnchorX,
                  transform: `translateX(${MOBILE_TOOLBAR_LAYOUT.spotlight.translateX})`,
                  width: MOBILE_TOOLBAR_LAYOUT.spotlight.overlayPanelWidth,
                  transformOrigin: "50% 50%",
                  zIndex: 899,
                }}
              >
                <SpotlightPanel
                  search={search}
                  setSearch={setSearch}
                  selIdx={selIdx}
                  setSelIdx={setSelIdx}
                  suggestions={suggestions}
                  commands={commands}
                  handleKey={handleKey}
                  inputRef={inputRef}
                  onClose={() => {
                    setCmdMode(false);
                    setExpanded(false);
                  }}
                  views={MOBILE_TOOLBAR_VIEW_ITEMS}
                  setView={setView}
                  rgb={rgb}
                  t={t}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
