import React, { lazy, Suspense } from "react";
import {
  FullWidthToolbarLayout,
  IslandToolbarLayout,
  SpotlightToolbarLayout,
} from "./toolbar/ToolbarLayouts";
import { useNexusToolbarModel } from "./toolbar/useNexusToolbarModel";

const CommandPanel = lazy(() =>
  import("./toolbar/CommandPanel").then((m) => ({ default: m.CommandPanel })),
);

export function NexusToolbar({
  spotlightMode: forceSpotlight,
  setView,
  activeView,
}: {
  spotlightMode?: boolean;
  setView?: (v: any) => void;
  activeView?: string;
}) {
  const {
    t,
    rgb,
    terminal,
    motionRuntime,
    inputRef,
    islandRef,
    expanded,
    setExpanded,
    panelOpen,
    setPanelOpen,
    search,
    setSearch,
    selIdx,
    setSelIdx,
    isSpotlight,
    isFullWidth,
    isBottom,
    reducedMotion,
    spotlightAnchorX,
    activeToolbarView,
    pendingTasks,
    overdueReminders,
    timeStr,
    islandCompact,
    islandWidth,
    list,
    handleKey,
    runItem,
    togglePin,
    isPinned,
    pinnedCommands,
    recentCommands,
    quickActionCommands,
  } = useNexusToolbarModel({ forceSpotlight, setView, activeView });

  const panel = (
    <Suspense fallback={null}>
      <CommandPanel
        isBottom={isBottom}
        t={t}
        rgb={rgb}
        search={search}
        setSearch={setSearch}
        list={list}
        selIdx={selIdx}
        setSelIdx={setSelIdx}
        onClose={() => {
          setPanelOpen(false);
          setExpanded(false);
        }}
        onKeyDown={handleKey}
        inputRef={inputRef}
        setView={setView}
        onSelectItem={runItem}
        onTogglePin={togglePin}
        isPinned={isPinned}
        pinnedCommands={pinnedCommands}
        recentCommands={recentCommands}
        quickActions={quickActionCommands}
      />
    </Suspense>
  );

  if (isSpotlight) {
    return (
      <SpotlightToolbarLayout
        isBottom={isBottom}
        t={t}
        rgb={rgb}
        pendingTasks={pendingTasks}
        overdueReminders={overdueReminders}
        timeStr={timeStr}
        terminal={terminal}
        panelOpen={panelOpen}
        panel={panel}
        setPanelOpen={setPanelOpen}
        setExpanded={setExpanded}
        setView={setView}
        motionRuntime={motionRuntime}
        reducedMotion={reducedMotion}
        spotlightAnchorX={spotlightAnchorX}
      />
    );
  }

  if (isFullWidth) {
    return (
      <FullWidthToolbarLayout
        isBottom={isBottom}
        t={t}
        rgb={rgb}
        pendingTasks={pendingTasks}
        overdueReminders={overdueReminders}
        timeStr={timeStr}
        terminal={terminal}
        panelOpen={panelOpen}
        panel={panel}
        setPanelOpen={setPanelOpen}
        setExpanded={setExpanded}
        setView={setView}
        motionRuntime={motionRuntime}
        activeView={activeToolbarView}
      />
    );
  }

  return (
    <IslandToolbarLayout
      isBottom={isBottom}
      t={t}
      rgb={rgb}
      pendingTasks={pendingTasks}
      overdueReminders={overdueReminders}
      timeStr={timeStr}
      terminal={terminal}
      panelOpen={panelOpen}
      panel={panel}
      setPanelOpen={setPanelOpen}
      setExpanded={setExpanded}
      reducedMotion={reducedMotion}
      spotlightAnchorX={spotlightAnchorX}
      islandRef={islandRef}
      islandWidth={islandWidth}
      expanded={expanded}
      islandCompact={islandCompact}
      setView={setView}
      motionRuntime={motionRuntime}
      activeView={activeToolbarView}
    />
  );
}
