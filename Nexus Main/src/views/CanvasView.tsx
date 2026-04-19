import React, {
  Suspense,
  lazy,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Plus } from "lucide-react";
import {
  useCanvas,
  CanvasNode,
  CanvasConnection,
  CanvasNodeStatus,
} from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { shallow } from "zustand/shallow";
import type { MagicTemplateId } from "./canvas/CanvasMagicModal";
import { animateCanvasViewport } from "@nexus/core";
import { MiniMap } from "./canvas/components/MiniMap";
import { CanvasQuickAddMenu } from "./canvas/components/CanvasQuickAddMenu";
import { CanvasProjectPanel } from "./canvas/components/CanvasProjectPanel";
import { CanvasSidebar } from "./canvas/components/CanvasSidebar";
import { CanvasTopBar } from "./canvas/components/CanvasTopBar";
import { CanvasStage } from "./canvas/components/CanvasStage";
import {
  BOARD_LANES,
  CANVAS_NODE_OVERSCAN_MAX_PX,
  CANVAS_NODE_OVERSCAN_PX,
  QUICK_WIDGET_TYPES,
  WIDGET_TYPES,
} from "./canvas/constants";
import { parseDueDateTs } from "./canvas/layoutHelpers";
import {
  applyCanvasAutoLayout,
  buildCanvasLayoutGuides,
  type CanvasLayoutMode,
} from "./canvas/canvasAutoLayout";
import { createCanvasExportArtifacts, triggerTextDownload } from "./canvas/canvasExport";
import { useCanvasPanAndWheel } from "./canvas/useCanvasPanAndWheel";
import { useCanvasKeyboardShortcuts } from "./canvas/useCanvasKeyboardShortcuts";
import { useCanvasNodeActions } from "./canvas/useCanvasNodeActions";

const CanvasMagicModal = lazy(() =>
  import("./canvas/CanvasMagicModal").then((m) => ({ default: m.CanvasMagicModal })),
);

export function CanvasView() {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const {
    canvases,
    activeCanvasId,
    viewport,
    addCanvas,
    deleteCanvas,
    setActiveCanvas,
    renameCanvas,
    addNode,
    deleteConnection,
    setPan,
    setZoom,
    resetViewport,
    addConnection,
  } = useCanvas(
    (s) => ({
      canvases: s.canvases,
      activeCanvasId: s.activeCanvasId,
      viewport: s.viewport,
      addCanvas: s.addCanvas,
      deleteCanvas: s.deleteCanvas,
      setActiveCanvas: s.setActiveCanvas,
      renameCanvas: s.renameCanvas,
      addNode: s.addNode,
      deleteConnection: s.deleteConnection,
      setPan: s.setPan,
      setZoom: s.setZoom,
      resetViewport: s.resetViewport,
      addConnection: s.addConnection,
    }),
    shallow,
  );

  const canvas = useMemo(
    () => canvases.find((entry) => entry.id === activeCanvasId),
    [canvases, activeCanvasId],
  );
  useEffect(() => {
    if (canvases.length === 0) return
    if (canvas) return
    setActiveCanvas(canvases[0].id)
  }, [canvas, canvases, setActiveCanvas]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [editCanvasName, setEditCanvasName] = useState(false);
  const [showCanvasList, setShowCanvasList] = useState(true);
  const [gridMode, setGridMode] = useState<"dots" | "lines" | "none">("dots");
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [quickAddPos, setQuickAddPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMagicBuilder, setShowMagicBuilder] = useState(false);
  const [layoutMode, setLayoutMode] = useState<CanvasLayoutMode>("mindmap");
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [pmStatusFilter, setPmStatusFilter] = useState<
    "all" | CanvasNodeStatus
  >("all");
  const [focusNodeOnly, setFocusNodeOnly] = useState(false);

  const cameraAnimationCancelRef = useRef<(() => void) | null>(null);

  const projectNodes = useMemo(() => {
    if (!canvas) return [] as CanvasNode[];
    return canvas.nodes.filter(
      (node) =>
        node.type === "project" ||
        node.type === "goal" ||
        node.type === "milestone" ||
        node.type === "decision" ||
        node.type === "risk" ||
        node.type === "task" ||
        node.type === "checklist",
    );
  }, [canvas]);

  const selectedNode = useMemo(
    () => canvas?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [canvas, selectedNodeId],
  );

  const filteredProjectNodes = useMemo(() => {
    if (pmStatusFilter === "all") return projectNodes;
    return projectNodes.filter((node) => node.status === pmStatusFilter);
  }, [projectNodes, pmStatusFilter]);

  const timelineNodes = useMemo(
    () =>
      [...filteredProjectNodes]
        .filter((node) => !!node.dueDate)
        .sort((a, b) => parseDueDateTs(a.dueDate) - parseDueDateTs(b.dueDate))
        .slice(0, 8),
    [filteredProjectNodes],
  );

  const focusNodeIds = useMemo(() => {
    if (!canvas) return new Set<string>();
    if (!focusNodeOnly || !selectedNodeId) {
      return new Set(canvas.nodes.map((node) => node.id));
    }
    const linked = new Set<string>([selectedNodeId]);
    canvas.connections.forEach((conn) => {
      if (conn.fromId === selectedNodeId) linked.add(conn.toId);
      if (conn.toId === selectedNodeId) linked.add(conn.fromId);
    });
    return linked;
  }, [canvas, focusNodeOnly, selectedNodeId]);

  const visibleBounds = useMemo(() => {
    const zoom = Math.max(0.0001, viewport.zoom);
    const overscan = Math.min(
      CANVAS_NODE_OVERSCAN_MAX_PX,
      Math.max(CANVAS_NODE_OVERSCAN_PX, 560 / Math.max(0.2, zoom)),
    );
    const worldLeft = -viewport.panX / zoom;
    const worldTop = -viewport.panY / zoom;
    const worldRight = worldLeft + canvasSize.w / zoom;
    const worldBottom = worldTop + canvasSize.h / zoom;
    return {
      left: worldLeft - overscan,
      top: worldTop - overscan,
      right: worldRight + overscan,
      bottom: worldBottom + overscan,
    };
  }, [viewport.panX, viewport.panY, viewport.zoom, canvasSize.w, canvasSize.h]);

  const visibleNodes = useMemo(() => {
    if (!canvas) return [] as CanvasNode[];
    return canvas.nodes.filter((node) => {
      if (!focusNodeIds.has(node.id)) return false;
      const right = node.x + node.width;
      const bottom = node.y + node.height;
      return !(
        right < visibleBounds.left ||
        node.x > visibleBounds.right ||
        bottom < visibleBounds.top ||
        node.y > visibleBounds.bottom
      );
    });
  }, [canvas, focusNodeIds, visibleBounds]);

  const visibleNodeById = useMemo(() => {
    const map = new globalThis.Map<string, CanvasNode>();
    visibleNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [visibleNodes]);

  const visibleConnections = useMemo(() => {
    if (!canvas) return [] as CanvasConnection[];
    return canvas.connections.filter(
      (conn) =>
        visibleNodeById.has(conn.fromId) && visibleNodeById.has(conn.toId),
    );
  }, [canvas, visibleNodeById]);

  const {
    panning,
    wheelPanning,
    zoomAtPoint,
    handleCanvasMouseDown,
    handleWheel,
  } = useCanvasPanAndWheel({
    canvasRef,
    canvasSize,
    viewport,
    spaceHeld,
    setPan,
    setSelectedNodeId,
    setConnectingFrom,
    setQuickAddPos,
  });

  const reduceNodeEffects =
    (canvas?.nodes.length ?? 0) > 70 || viewport.zoom < 0.35;
  const reduceConnectionEffects =
    reduceNodeEffects ||
    panning ||
    wheelPanning ||
    (canvas?.connections.length ?? 0) > 140;
  const miniMapNodes =
    canvas && canvas.nodes.length > 320 ? visibleNodes : canvas?.nodes ?? [];

  // Track canvas size
  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, []);

  const runViewportTransition = useCallback(
    (
      nextViewport: { panX: number; panY: number; zoom: number },
      opts?: { durationMs?: number },
    ) => {
      cameraAnimationCancelRef.current?.();
      const from = useCanvas.getState().viewport;
      const cancel = animateCanvasViewport({
        from,
        to: nextViewport,
        onUpdate: (vp) => {
          useCanvas.setState({ viewport: vp });
        },
        durationMs: opts?.durationMs ?? 280,
        reducedMotion: t.qol.reducedMotion,
      });
      cameraAnimationCancelRef.current = cancel;
    },
    [t.qol.reducedMotion],
  );

  const resolveFitViewport = useCallback(() => {
    if (!canvas || canvas.nodes.length === 0) return null;
    const minX = Math.min(...canvas.nodes.map((n) => n.x));
    const maxX = Math.max(...canvas.nodes.map((n) => n.x + n.width));
    const minY = Math.min(...canvas.nodes.map((n) => n.y));
    const maxY = Math.max(...canvas.nodes.map((n) => n.y + n.height));
    const pad = 60;
    const zoom = Math.min(
      (canvasSize.w - pad * 2) / Math.max(100, maxX - minX),
      (canvasSize.h - pad * 2) / Math.max(100, maxY - minY),
      1.5,
    );
    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5;
    return {
      zoom,
      panX: canvasSize.w * 0.5 - centerX * zoom,
      panY: canvasSize.h * 0.5 - centerY * zoom,
    };
  }, [canvas, canvasSize.h, canvasSize.w]);

  const resolveFocusViewport = useCallback(
    (nodeId: string) => {
      const target = canvas?.nodes.find((node) => node.id === nodeId);
      if (!target) return null;
      const nextZoom = Math.max(0.5, Math.min(1.35, viewport.zoom));
      return {
        zoom: nextZoom,
        panX: canvasSize.w * 0.5 - (target.x + target.width * 0.5) * nextZoom,
        panY: canvasSize.h * 0.5 - (target.y + target.height * 0.5) * nextZoom,
      };
    },
    [canvas, canvasSize.h, canvasSize.w, viewport.zoom],
  );

  useEffect(
    () => () => {
      cameraAnimationCancelRef.current?.();
      cameraAnimationCancelRef.current = null;
    },
    [],
  );

  const openQuickAddMenuFromToolbar = useCallback(() => {
    setQuickAddPos((current) => {
      if (current) return null;
      const rect = canvasRef.current?.getBoundingClientRect();
      const viewportWidth = rect?.width ?? canvasSize.w;
      const viewportHeight = rect?.height ?? canvasSize.h;
      return {
        x: Math.max(24, viewportWidth * 0.5),
        y: Math.max(72, Math.min(viewportHeight * 0.24, 172)),
      };
    });
  }, [canvasSize.h, canvasSize.w]);

  const safeCreateCanvas = useCallback(() => {
    try {
      addCanvas();
      requestAnimationFrame(() => {
        const active = useCanvas.getState().activeCanvasId;
        if (!active) {
          const first = useCanvas.getState().canvases[0];
          if (first) useCanvas.getState().setActiveCanvas(first.id);
        }
      });
    } catch (error) {
      console.error("[Canvas] create canvas failed", error);
    }
  }, [addCanvas]);

  const setZoomCentered = useCallback(
    (nextZoom: number) => {
      const el = canvasRef.current;
      const vp = useCanvas.getState().viewport;
      const clamped = Math.max(0.15, Math.min(3, nextZoom));
      if (!el) {
        setZoom(clamped);
        return;
      }
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const factor = clamped / Math.max(0.0001, vp.zoom);
      zoomAtPoint(centerX, centerY, factor);
    },
    [setZoom, zoomAtPoint],
  );

  const handleStartConnect = useCallback(
    (nodeId: string) => setConnectingFrom(nodeId),
    [],
  );
  const handleEndConnect = useCallback(
    (nodeId: string) => {
      if (connectingFrom && connectingFrom !== nodeId)
        addConnection(connectingFrom, nodeId);
      setConnectingFrom(null);
    },
    [connectingFrom, addConnection],
  );

  // Fit view to all nodes
  const fitView = useCallback(() => {
    const target = resolveFitViewport();
    if (!target) {
      resetViewport();
      return;
    }
    runViewportTransition(target, { durationMs: 320 });
  }, [resetViewport, resolveFitViewport, runViewportTransition]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const target = resolveFocusViewport(nodeId);
      if (!target) return;
      runViewportTransition(target, { durationMs: 280 });
    },
    [resolveFocusViewport, runViewportTransition],
  );

  const zoomFromCenterBy = useCallback(
    (delta: number) => {
      const el = canvasRef.current;
      const vp = useCanvas.getState().viewport;
      if (!el) {
        useCanvas.getState().setZoom(vp.zoom + delta);
        return;
      }
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const nextZoom = Math.max(0.15, Math.min(3, vp.zoom + delta));
      const factor = nextZoom / Math.max(0.0001, vp.zoom);
      zoomAtPoint(centerX, centerY, factor);
    },
    [zoomAtPoint],
  );

  const exportCanvas = useCallback(() => {
    if (!canvas) return;
    const exportFiles = createCanvasExportArtifacts(canvas, viewport);
    triggerTextDownload(
      exportFiles.jsonFilename,
      exportFiles.jsonContent,
      "application/json;charset=utf-8",
    );
    triggerTextDownload(
      exportFiles.markdownFilename,
      exportFiles.markdownContent,
      "text/markdown;charset=utf-8",
    );
  }, [canvas, viewport]);

  const {
    addWidgetNode,
    createStarterPack,
    createMagicTemplate,
    handleHubQuickAction,
    duplicateSelectedNode,
    autoArrangeByStatus,
    autoLinkWikiRefs,
  } = useCanvasNodeActions({
    addNode,
    selectedNodeId,
    fitView,
    setSelectedNodeId,
    setShowMagicBuilder,
    setQuickAddPos,
    canvasSize,
    viewport,
  });

  const applyAutoLayout = useCallback(
    (mode: CanvasLayoutMode, opts?: { fitView?: boolean }) => {
      const state = useCanvas.getState();
      const active = state.getActiveCanvas();
      if (!active || active.nodes.length === 0) return;

      if (active.nodes.length === 1) {
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      applyCanvasAutoLayout({
        mode,
        nodes: [...active.nodes],
        moveNode: state.moveNode,
      });
      if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
    },
    [fitView],
  );

  useCanvasKeyboardShortcuts({
    selectedNodeId,
    setSpaceHeld,
    setConnectingFrom,
    setSelectedNodeId,
    setQuickAddPos,
    setShowMagicBuilder,
    setShowProjectPanel,
    setGridMode,
    setLayoutMode,
    applyAutoLayout,
    resetViewport,
    fitView,
    focusNode,
    zoomFromCenterBy,
    deleteSelectedNode: (nodeId) => useCanvas.getState().deleteNode(nodeId),
  });

  const layoutGuides = useMemo(
    () =>
      buildCanvasLayoutGuides({
        nodes: canvas?.nodes ?? [],
        layoutMode,
      }),
    [canvas?.nodes, layoutMode],
  );

  useEffect(() => {
    const onCanvasCommand = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {};

      if (detail.action === "focus") {
        fitView();
        return;
      }

      if (detail.action === "layout") {
        const mode = detail.mode as "mindmap" | "timeline" | "board";
        if (mode === "mindmap" || mode === "timeline" || mode === "board") {
          setLayoutMode(mode);
          applyAutoLayout(mode);
        }
        return;
      }

      if (detail.action === "template") {
        const template = detail.template as MagicTemplateId;
        if (!template) return;
        createMagicTemplate({
          template,
          title: detail.title || "Terminal Template",
          includeNotes: detail.includeNotes !== false,
          includeTasks: detail.includeTasks !== false,
        });
      }
    };
    window.addEventListener(
      "nx-canvas-command",
      onCanvasCommand as EventListener,
    );
    return () =>
      window.removeEventListener(
        "nx-canvas-command",
        onCanvasCommand as EventListener,
      );
  }, [createMagicTemplate, applyAutoLayout, fitView]);

  // Empty state
  if (canvases.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 72,
            opacity: 0.12,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "nexus-float 3s ease-in-out infinite",
          }}
        >
          ✦
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.7 }}>
          Kein Canvas vorhanden
        </div>
        <div
          style={{
            fontSize: 13,
            opacity: 0.4,
            maxWidth: 300,
            textAlign: "center",
          }}
        >
          Erstelle ein neues Canvas, um Ideen, Pläne und Mindmaps visuell zu
          organisieren.
        </div>
        <button
          onClick={safeCreateCanvas}
          className="nx-interactive nx-bounce-target"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            borderRadius: 14,
            border: "none",
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            boxShadow: `0 6px 24px rgba(${rgb}, 0.35)`,
          }}
        >
          <Plus size={20} /> Neues Canvas
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <CanvasSidebar
        visible={showCanvasList}
        mode={t.mode}
        accent={t.accent}
        rgb={rgb}
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        activeCanvas={canvas}
        addCanvas={safeCreateCanvas}
        setActiveCanvas={setActiveCanvas}
        deleteCanvas={deleteCanvas}
      />

      {/* ── Main Canvas ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CanvasTopBar
          mode={t.mode}
          accent={t.accent}
          rgb={rgb}
          canvas={canvas}
          showCanvasList={showCanvasList}
          setShowCanvasList={setShowCanvasList}
          editCanvasName={editCanvasName}
          setEditCanvasName={setEditCanvasName}
          renameCanvas={renameCanvas}
          quickWidgetTypes={QUICK_WIDGET_TYPES}
          widgets={WIDGET_TYPES}
          addWidgetNode={addWidgetNode}
          onOpenQuickAddMenu={openQuickAddMenuFromToolbar}
          createStarterPack={() => createStarterPack()}
          createMagicTemplate={createMagicTemplate}
          showProjectPanel={showProjectPanel}
          setShowProjectPanel={setShowProjectPanel}
          autoLinkWikiRefs={autoLinkWikiRefs}
          duplicateSelectedNode={duplicateSelectedNode}
          selectedNodeId={selectedNodeId}
          showMagicBuilder={showMagicBuilder}
          setShowMagicBuilder={setShowMagicBuilder}
          gridMode={gridMode}
          setGridMode={setGridMode}
          showMiniMap={showMiniMap}
          setShowMiniMap={setShowMiniMap}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          applyAutoLayout={applyAutoLayout}
          autoArrangeByStatus={autoArrangeByStatus}
          fitView={fitView}
          onFocusSelection={() =>
            selectedNodeId ? focusNode(selectedNodeId) : fitView()
          }
          viewportZoom={viewport.zoom}
          setZoomCentered={setZoomCentered}
          resetViewport={resetViewport}
          exportCanvas={exportCanvas}
          quickAddOpen={Boolean(quickAddPos)}
        />

        <CanvasStage
          canvasRef={canvasRef}
          mode={t.mode}
          accent={t.accent}
          accent2={t.accent2}
          rgb={rgb}
          connectingFrom={connectingFrom}
          setConnectingFrom={setConnectingFrom}
          spaceHeld={spaceHeld}
          panning={panning}
          wheelPanning={wheelPanning}
          gridMode={gridMode}
          viewport={viewport}
          onCanvasMouseDown={handleCanvasMouseDown}
          onCanvasWheel={handleWheel}
          setQuickAddPos={setQuickAddPos}
          layoutGuides={layoutGuides}
          reduceConnectionEffects={reduceConnectionEffects}
          visibleConnections={visibleConnections}
          visibleNodeById={visibleNodeById}
          deleteConnection={deleteConnection}
          visibleNodes={visibleNodes}
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
          handleStartConnect={handleStartConnect}
          handleEndConnect={handleEndConnect}
          onHubQuickAction={handleHubQuickAction}
          snapToGrid={snapToGrid}
          reduceNodeEffects={reduceNodeEffects}
        />

          <CanvasQuickAddMenu
            quickAddPos={quickAddPos}
            canvasSize={canvasSize}
            viewport={viewport}
            widgets={WIDGET_TYPES}
            rgb={rgb}
            accent={t.accent}
            mode={t.mode}
            addWidgetNode={addWidgetNode}
            setQuickAddPos={setQuickAddPos}
            createStarterPack={createStarterPack}
            createMagicTemplate={createMagicTemplate}
          />
          <CanvasProjectPanel
            open={showProjectPanel}
            canvas={canvas}
            accent={t.accent}
            rgb={rgb}
            mode={t.mode}
            projectNodes={projectNodes}
            selectedNode={selectedNode}
            focusNodeOnly={focusNodeOnly}
            onToggleFocusOnly={() => setFocusNodeOnly((s) => !s)}
            onClose={() => setShowProjectPanel(false)}
            lanes={BOARD_LANES}
            pmStatusFilter={pmStatusFilter}
            setPmStatusFilter={setPmStatusFilter}
            timelineNodes={timelineNodes}
            setSelectedNodeId={setSelectedNodeId}
            focusNode={focusNode}
          />

          {/* Mini-map */}
          {showMiniMap && miniMapNodes.length > 0 && (
            <MiniMap
              nodes={miniMapNodes}
              viewport={viewport}
              canvasW={canvasSize.w}
              canvasH={canvasSize.h}
            />
          )}

          {/* Zoom tooltip */}
          {viewport.zoom !== 1 && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 10,
                opacity: 0.35,
                pointerEvents: "none",
                background: "rgba(0,0,0,0.4)",
                padding: "2px 8px",
                borderRadius: 6,
                fontFamily: "monospace",
              }}
            >
              {Math.round(viewport.zoom * 100)}% · Scroll = Pan · Pinch/Ctrl + Scroll = Zoom · F = Focus · G = Grid · P = Project Panel · Render {visibleNodes.length}/{canvas?.nodes.length ?? 0}
            </div>
          )}
        </div>
      {showMagicBuilder && (
        <Suspense fallback={null}>
          <CanvasMagicModal
            open={showMagicBuilder}
            onClose={() => setShowMagicBuilder(false)}
            onCreate={createMagicTemplate}
          />
        </Suspense>
      )}
    </div>
  );
}
