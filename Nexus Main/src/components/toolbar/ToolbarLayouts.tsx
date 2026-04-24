import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Glass } from "../Glass";
import { VIEW_ITEMS, type ViewId } from "./constants";
import { TOOLBAR_LAYOUT_CONFIG } from "./layoutConfig";
import {
  FullWidthToolbarBrand,
  IslandToolbarBrand,
  SpotlightToolbarBrand,
  ToolbarCommandTrigger,
  ToolbarNavChip,
  ToolbarOverflowButton,
  ToolbarStatusCluster,
  ToolbarTerminalButton,
} from "./ToolbarPrimitives";
import { getMotionFamilyRuntime } from "../../lib/motionEngine";

type ToolbarTheme = any;

type TerminalState = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

type SharedLayoutProps = {
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
  activeView?: ViewId;
};

type IslandToolbarLayoutProps = SharedLayoutProps & {
  reducedMotion: boolean;
  spotlightAnchorX: string;
  islandRef: React.RefObject<HTMLDivElement>;
  islandWidth: number;
  expanded: boolean;
  islandCompact: boolean;
};

type SpotlightToolbarLayoutProps = SharedLayoutProps & {
  reducedMotion: boolean;
  spotlightAnchorX: string;
};

const useElementWidth = () => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => setWidth(node.clientWidth || 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

export function FullWidthToolbarLayout(props: SharedLayoutProps) {
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
    activeView,
  } = props;

  const fullCfg = TOOLBAR_LAYOUT_CONFIG.fullWidth;
  const { ref, width } = useElementWidth();
  const navItems = VIEW_ITEMS;
  const measuredWidth =
    width > 0
      ? width
      : typeof window !== "undefined"
        ? window.innerWidth
        : 1280;
  const compactShell = measuredWidth < 900;
  const horizontalPadding = compactShell ? 10 : 14;
  const railGap = compactShell ? 8 : 12;
  const leftRailPx = Math.round(
    Math.max(
      compactShell ? 112 : 124,
      Math.min(
        measuredWidth * (compactShell ? 0.12 : 0.11),
        compactShell ? 144 : 168,
      ),
    ),
  );
  const rightRailPx = Math.round(
    Math.max(
      compactShell ? 176 : 190,
      Math.min(
        measuredWidth * (compactShell ? 0.19 : 0.16),
        compactShell ? 210 : 234,
      ),
    ),
  );
  const gridReserved =
    leftRailPx + rightRailPx + horizontalPadding * 2 + railGap * 2;
  const centerWidth = Math.max(260, measuredWidth - gridReserved);
  const navGap = 5;
  const navCount = navItems.length;
  const regularPerItem = 86;
  const densePerItem = 70;
  const compactPerItem = 34;
  const neededRegular = navCount * regularPerItem + (navCount - 1) * navGap;
  const neededDense = navCount * densePerItem + (navCount - 1) * navGap;
  const neededCompact = navCount * compactPerItem + (navCount - 1) * navGap;
  const navCompact = centerWidth < neededDense;
  const navDense = !navCompact && centerWidth < neededRegular;
  const statusCompact = compactShell || centerWidth < neededRegular + 90;
  const showStatusTime = !statusCompact && measuredWidth >= 1560;
  const shouldCenterNav =
    centerWidth >=
    (navCompact ? neededCompact : navDense ? neededDense : neededRegular) + 12;
  const brandCompact = compactShell || measuredWidth < 1220;
  const commandMotion = getMotionFamilyRuntime(motionRuntime, "command");

  return (
    <div
      ref={ref}
      style={{ position: "relative", width: "100%", overflow: "visible" }}
    >
      <Glass
        type="modal"
        className="nx-toolbar-surface nx-toolbar-surface--full"
        disablePulse
        style={{
          width: "100%",
          height: fullCfg.height,
          borderRadius: 0,
          borderTop: isBottom ? "1px solid rgba(255,255,255,0.08)" : undefined,
          borderBottom: !isBottom
            ? "1px solid rgba(255,255,255,0.08)"
            : undefined,
          padding: `0 ${horizontalPadding}px`,
          overflow: "visible",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: `${leftRailPx}px minmax(0,1fr) ${rightRailPx}px`,
            alignItems: "center",
            gap: railGap,
            minWidth: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              width: `${leftRailPx}px`,
              maxWidth: "100%",
              flexBasis: `${leftRailPx}px`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              overflow: "hidden",
            }}
          >
            <FullWidthToolbarBrand
              t={t}
              rgb={rgb}
              compact={brandCompact}
              offset={fullCfg.logoOffset}
            />
          </div>

          <div
            className="nx-toolbar-view-rail"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: shouldCenterNav ? "center" : "flex-start",
              gap: navGap,
              minWidth: 0,
              flex: 1,
              overflowX: "auto",
              overflowY: "hidden",
              height: "100%",
              padding: "0 8px",
              overscrollBehaviorX: "contain",
            }}
          >
            {navItems.map((item) => (
              <ToolbarNavChip
                key={item.id}
                label={item.label}
                color={item.color}
                icon={item.icon}
                compact={navCompact}
                dense={navDense}
                active={activeView === item.id}
                onClick={() => setView?.(item.id)}
              />
            ))}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: compactShell ? 6 : 8,
              minWidth: 0,
              width: `${rightRailPx}px`,
              maxWidth: "100%",
              flexBasis: `${rightRailPx}px`,
              flexShrink: 0,
              overflow: "hidden",
              paddingBottom: 2,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: statusCompact ? 8 : 10,
                padding: "0 2px",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: statusCompact ? 10 : 11,
                  fontWeight: 800,
                  color: pendingTasks > 0 ? "#ff9f0a" : "inherit",
                  opacity: pendingTasks > 0 ? 1 : 0.58,
                  whiteSpace: "nowrap",
                }}
              >
                {statusCompact ? `T ${pendingTasks}` : `Tasks ${pendingTasks}`}
              </span>
              <span
                style={{
                  fontSize: statusCompact ? 10 : 11,
                  fontWeight: 800,
                  color: overdueReminders > 0 ? "#ff453a" : "inherit",
                  opacity: overdueReminders > 0 ? 1 : 0.58,
                  whiteSpace: "nowrap",
                }}
              >
                {statusCompact
                  ? `D ${overdueReminders}`
                  : `Due ${overdueReminders}`}
              </span>
              {showStatusTime ? (
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.44,
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeStr}
                </span>
              ) : null}
            </div>

            <ToolbarTerminalButton
              t={t}
              active={terminal.isOpen}
              onClick={() => terminal.setOpen(!terminal.isOpen)}
              offset={fullCfg.actionButtonOffset.terminal}
            />

            <ToolbarCommandTrigger
              t={t}
              condensed={compactShell || statusCompact}
              onClick={() => {
                setPanelOpen(true);
                setExpanded(true);
              }}
            />

            <ToolbarOverflowButton
              t={t}
              onClick={() => {
                if (setView) {
                  setView("settings");
                  setPanelOpen(false);
                  setExpanded(false);
                  return;
                }
                setPanelOpen(true);
                setExpanded(true);
              }}
            />
          </div>
        </div>
      </Glass>

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={commandMotion.transition}
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
    islandWidth,
    expanded,
    islandCompact,
    setView,
    motionRuntime,
    activeView,
  } = props;

  const islandCfg = TOOLBAR_LAYOUT_CONFIG.island;
  const width = islandWidth > 0 ? islandWidth : expanded ? 980 : 620;
  const statusRailPx = expanded
    ? Math.round(
        Math.max(
          islandCompact ? 146 : 166,
          Math.min(
            width * (islandCompact ? 0.22 : 0.2),
            islandCompact ? 200 : 228,
          ),
        ),
      )
    : Math.round(Math.max(146, Math.min(width * 0.22, 210)));
  const visibleNavItems = VIEW_ITEMS;
  const compactStatus = !expanded || islandCompact || width < 1220;
  const showIslandTime = expanded && !compactStatus && width >= 1320;
  const toolbarMotion = getMotionFamilyRuntime(motionRuntime, "toolbar");
  const commandMotion = getMotionFamilyRuntime(motionRuntime, "command");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: isBottom ? "0 0 1px" : "1px 0 0",
      }}
    >
      <motion.div
        ref={islandRef}
        animate={{
          width: expanded ? islandCfg.expandedWidth : islandCfg.collapsedWidth,
          height: expanded
            ? islandCfg.expandedHeight
            : islandCfg.collapsedHeight,
        }}
        transition={
          reducedMotion
            ? {
                duration: Math.max((motionRuntime?.quickMs ?? 120) / 1000, 0.1),
              }
            : toolbarMotion.transition
        }
        style={{ position: "relative" }}
      >
        <Glass
          type="modal"
          className="nx-toolbar-surface nx-toolbar-surface--island"
          disablePulse
          style={{
            width: "100%",
            height: "100%",
            borderRadius: expanded ? 22 : 18,
            padding: expanded
              ? islandCfg.glassPaddingExpanded
              : islandCfg.glassPaddingCollapsed,
            overflow: "visible",
            border: `1px solid rgba(${rgb},${expanded ? 0.26 : 0.16})`,
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
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              gridTemplateColumns: "auto minmax(0,1fr) auto",
              alignItems: "center",
              columnGap: expanded
                ? islandCfg.glassGapExpanded
                : islandCfg.glassGapCollapsed,
              minWidth: 0,
            }}
          >
            <IslandToolbarBrand
              t={t}
              rgb={rgb}
              compact={islandCompact}
              offset={islandCfg.brandOffset}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: expanded ? 6 : 10,
                minWidth: 0,
                flex: 1,
              }}
            >
              {expanded ? (
                <div
                  className="nx-toolbar-view-rail"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                    overflowX: "auto",
                    overflowY: "hidden",
                    height: "100%",
                    paddingRight: 12,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {visibleNavItems.map((item) => (
                    <ToolbarNavChip
                      key={item.id}
                      label={item.label}
                      color={item.color}
                      icon={item.icon}
                      compact={false}
                      dense
                      active={activeView === item.id}
                      onClick={() => setView?.(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      marginLeft: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "none",
                      opacity: 0.82,
                    }}
                  >
                    Hover to expand
                  </span>
                  {/*<span style={{ fontSize: 10, opacity: 0.55 }}>Shift x2</span>*/}
                </div>
              )}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 5,
                flexShrink: 0,
                minWidth: 0,
                width: `${statusRailPx}px`,
                maxWidth: "100%",
                flexBasis: `${statusRailPx}px`,
                overflow: "hidden",
                paddingBottom: 2,
                position: "relative",
                zIndex: 2,
              }}
            >
              <ToolbarStatusCluster
                t={t}
                pendingTasks={pendingTasks}
                overdueReminders={overdueReminders}
                timeStr={timeStr}
                compact={compactStatus}
                showTime={showIslandTime}
                offset={islandCfg.statusOffset}
              />

              <ToolbarTerminalButton
                t={t}
                active={terminal.isOpen}
                onClick={() => terminal.setOpen(!terminal.isOpen)}
                offset={islandCfg.actionButtonOffset.terminal}
              />

              <ToolbarCommandTrigger
                t={t}
                condensed={compactStatus}
                onClick={() => {
                  setPanelOpen(true);
                  setExpanded(true);
                }}
              />
            </div>
          </div>
        </Glass>

        <AnimatePresence>
          {panelOpen && (
            <div
              style={{
                position: "fixed",
                left: spotlightAnchorX,
                transform: `translateX(${TOOLBAR_LAYOUT_CONFIG.spotlight.translateX})`,
                top: TOOLBAR_LAYOUT_CONFIG.spotlight.panelTopPx,
                bottom: undefined,
                width: "min(700px, 86vw)",
                zIndex: 920,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={
                  motionRuntime?.reduced
                    ? { duration: 0.12 }
                    : commandMotion.transition
                }
                style={{ width: "100%" }}
              >
                {panel}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function SpotlightToolbarLayout(props: SpotlightToolbarLayoutProps) {
  const {
    isBottom,
    t,
    rgb,
    panelOpen,
    panel,
    setPanelOpen,
    setExpanded,
    motionRuntime,
    reducedMotion,
    spotlightAnchorX,
  } = props;
  const commandMotion = getMotionFamilyRuntime(motionRuntime, "command");

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: isBottom ? "0 0 8px" : "8px 0 0",
        }}
      >
        <button
          onClick={() => {
            setPanelOpen(true);
            setExpanded(true);
          }}
          style={{
            border: `1px solid rgba(${rgb},0.3)`,
            background: `linear-gradient(135deg, rgba(${rgb},0.2), rgba(${rgb},0.08))`,
            color: t.accent,
            borderRadius: 12,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: `0 8px 24px rgba(${rgb},0.25)`,
            whiteSpace: "nowrap",
          }}
        >
          <SpotlightToolbarBrand t={t} rgb={rgb} />
          <span style={{ opacity: 0.68, fontWeight: 600 }}>Shift x2</span>
        </button>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={commandMotion.transition}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 900,
                background: "rgba(0,0,0,0.52)",
                backdropFilter: "blur(7px)",
              }}
              onClick={() => {
                setPanelOpen(false);
                setExpanded(false);
              }}
            />
            <div
              style={{
                position: "fixed",
                top: TOOLBAR_LAYOUT_CONFIG.spotlight.panelTopPx,
                left: spotlightAnchorX,
                transform: `translateX(${TOOLBAR_LAYOUT_CONFIG.spotlight.translateX})`,
                width: TOOLBAR_LAYOUT_CONFIG.spotlight.panelWidth,
                zIndex: 901,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={
                  reducedMotion ? { duration: 0.12 } : commandMotion.transition
                }
                style={{ width: "100%", transformOrigin: "50% 50%" }}
              >
                {panel}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
