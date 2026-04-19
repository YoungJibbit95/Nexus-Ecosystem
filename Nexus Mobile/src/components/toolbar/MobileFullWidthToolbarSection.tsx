import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Search, Terminal } from "lucide-react";
import { resolveToolbarBrandSpec } from "@nexus/core";
import { Glass } from "../Glass";
import { hexToRgb } from "../../lib/utils";
import { MOBILE_TOOLBAR_LAYOUT } from "./layoutConfig";
import { MOBILE_TOOLBAR_VIEW_ITEMS } from "./viewItems";
import { FullWidthToolbarBrand } from "./ToolbarBranding";
import { SpotlightPanel } from "./SpotlightPanel";

export function MobileFullWidthToolbarSection(props: any) {
  const {
    viewportWidth,
    expanded,
    barHeight,
    isBottom,
    rgb,
    t,
    hovered,
    setHovered,
    pendingTasks,
    overdueCount,
    timeStr,
    terminalOpen,
    setTerminalOpen,
    setExpanded,
    setCmdMode,
    cmdMode,
    commandMotion,
    search,
    setSearch,
    selIdx,
    setSelIdx,
    suggestions,
    COMMANDS,
    handleKey,
    inputRef,
    setView,
  } = props;

  const fullCfg = MOBILE_TOOLBAR_LAYOUT.fullWidth;
  const fullBrand = resolveToolbarBrandSpec({
    mode: "full-width",
    width: viewportWidth,
    compact: viewportWidth < 760,
    expanded,
    platform: "mobile",
  });
  const fullCompact = viewportWidth < 920;
  const fullTight = viewportWidth < 760;
  const navItems = MOBILE_TOOLBAR_VIEW_ITEMS;
  const horizontalPadding = fullTight ? 10 : 14;
  const railGap = fullTight ? 8 : 10;
  const leftRailPx = Math.round(
    Math.max(
      fullTight ? 104 : 118,
      Math.min(viewportWidth * (fullTight ? 0.14 : 0.12), fullTight ? 132 : 162),
    ),
  );
  const rightRailPx = Math.round(
    Math.max(
      fullTight ? 168 : 186,
      Math.min(viewportWidth * (fullTight ? 0.24 : 0.2), fullTight ? 204 : 232),
    ),
  );
  const navGap = fullTight ? 3 : 4;
  const navCount = navItems.length;
  const regularPerItem = fullTight ? 74 : 80;
  const densePerItem = fullTight ? 60 : 66;
  const compactPerItem = 32;
  const centerWidth = Math.max(
    220,
    viewportWidth - (leftRailPx + rightRailPx + horizontalPadding * 2 + railGap * 2),
  );
  const neededRegular = navCount * regularPerItem + (navCount - 1) * navGap;
  const neededDense = navCount * densePerItem + (navCount - 1) * navGap;
  const neededCompact = navCount * compactPerItem + (navCount - 1) * navGap;
  const useIconOnlyNav = centerWidth < neededDense;
  const useDenseNav = !useIconOnlyNav && centerWidth < neededRegular;
  const showFullNavLabels = !useIconOnlyNav;
  const showFullTime = viewportWidth >= 1240 && centerWidth > neededRegular + 80;
  const shouldCenterNav =
    centerWidth >=
    (useIconOnlyNav ? neededCompact : useDenseNav ? neededDense : neededRegular) + 8;

  return (
    <Glass
      type="modal"
      className="nx-toolbar-surface nx-toolbar-surface--full"
      style={{
        width: "100%",
        height: barHeight ?? fullCfg.height,
        borderRadius: 0,
        flexShrink: 0,
        borderTop: isBottom ? "1px solid rgba(255,255,255,0.07)" : "none",
        borderBottom: !isBottom ? "1px solid rgba(255,255,255,0.07)" : "none",
        backdropFilter: "blur(30px) saturate(220%)",
        WebkitBackdropFilter: "blur(30px) saturate(220%)",
        display: "flex",
        alignItems: "center",
        padding: `0 ${horizontalPadding}px`,
        overflow: "visible",
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: `${leftRailPx}px minmax(0,1fr) ${rightRailPx}px`,
          alignItems: "center",
          gap: railGap,
          height: "100%",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            minWidth: 0,
            width: `${leftRailPx}px`,
            maxWidth: "100%",
            overflow: "hidden",
          }}
        >
          <FullWidthToolbarBrand
            rgb={rgb}
            t={t}
            spec={fullBrand}
            offset={fullCfg.logoOffset}
          />
        </div>

        <div
          className="nx-toolbar-view-rail"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: shouldCenterNav ? "center" : "flex-start",
            minWidth: 0,
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            height: "100%",
            padding: "0 6px",
            gap: navGap,
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView?.(item.id)}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: useIconOnlyNav
                  ? "5px 7px"
                  : useDenseNav
                    ? "5px 7px"
                    : fullTight
                      ? "5px 8px"
                      : "5px 9px",
                borderRadius: 8,
                border: "none",
                background:
                  hovered === item.id
                    ? `rgba(${hexToRgb(item.color)},0.14)`
                    : "transparent",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: showFullNavLabels ? (useDenseNav ? 4 : 5) : 0,
                color: hovered === item.id ? item.color : "inherit",
                transition: "all 0.12s",
                fontSize: useDenseNav ? 10 : 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <item.icon
                size={useDenseNav || useIconOnlyNav ? 12 : 13}
                style={{ opacity: hovered === item.id ? 1 : 0.5 }}
              />
              {showFullNavLabels ? item.label : null}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            flexShrink: 0,
            minWidth: 0,
            width: `${rightRailPx}px`,
            maxWidth: "100%",
            flexBasis: `${rightRailPx}px`,
            overflow: "hidden",
            paddingBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: pendingTasks > 0 ? "#FF9F0A" : "inherit",
              opacity: pendingTasks > 0 ? 1 : 0.55,
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
          {!fullCompact && showFullTime ? (
            <span
              style={{
                fontSize: 10,
                opacity: 0.38,
                fontFamily: "monospace",
                whiteSpace: "nowrap",
              }}
            >
              {timeStr}
            </span>
          ) : null}
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
                ? `rgba(${rgb},0.15)`
                : "rgba(255,255,255,0.05)",
              color: terminalOpen ? t.accent : "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              transform: `translate(${fullCfg.actionButtonOffset.terminal.x}px, ${fullCfg.actionButtonOffset.terminal.y}px)`,
            }}
          >
            <Terminal size={14} style={{ opacity: terminalOpen ? 1 : 0.6 }} />
          </button>
          <button
            className="nx-icon-btn"
            onClick={() => {
              setExpanded((p: boolean) => !p);
              setCmdMode(true);
            }}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 9,
              border: `1px solid rgba(${rgb},0.2)`,
              background: `rgba(${rgb},0.1)`,
              color: t.accent,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              transform: `translate(${fullCfg.actionButtonOffset.search.x}px, ${fullCfg.actionButtonOffset.search.y}px)`,
            }}
          >
            <Search size={14} />
          </button>
          <button
            className="nx-icon-btn"
            onClick={() => setView?.("settings")}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 9,
              border: `1px solid rgba(255,255,255,0.14)`,
              background: "rgba(255,255,255,0.05)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Open settings"
          >
            <MoreVertical size={14} style={{ opacity: 0.75 }} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && cmdMode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={commandMotion.transition}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              right: 12,
              width: 420,
              zIndex: 900,
            }}
          >
            <SpotlightPanel
              search={search}
              setSearch={setSearch}
              selIdx={selIdx}
              setSelIdx={setSelIdx}
              suggestions={suggestions}
              commands={COMMANDS}
              handleKey={handleKey}
              inputRef={inputRef}
              onClose={() => {
                setExpanded(false);
                setCmdMode(false);
              }}
              views={MOBILE_TOOLBAR_VIEW_ITEMS}
              setView={setView}
              rgb={rgb}
              t={t}
              compact
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Glass>
  );
}
