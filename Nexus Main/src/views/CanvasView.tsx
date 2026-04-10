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
  NodeType,
  CanvasNode,
  CanvasConnection,
  CanvasNodeStatus,
} from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { shallow } from "zustand/shallow";
import type { MagicTemplateId, MagicTemplatePayload } from "./canvas/CanvasMagicModal";
import { createMagicTemplateFromPayload } from "./canvas/magic/createMagicTemplate";
import {
  getCanvasMagicHubQuickAction,
  type CanvasMagicHubQuickActionId,
} from "@nexus/core/canvas/magicHubTemplates";
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
import { laneForNode, parseDueDateTs, timelineSortKey } from "./canvas/layoutHelpers";

const CanvasMagicModal = lazy(() =>
  import("./canvas/CanvasMagicModal").then((m) => ({ default: m.CanvasMagicModal })),
);

const toFileSafeSlug = (value: string) =>
  (value || "canvas")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "canvas";

const triggerTextDownload = (filename: string, content: string, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

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

  const [panning, setPanning] = useState(false);
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
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showMagicBuilder, setShowMagicBuilder] = useState(false);
  const [layoutMode, setLayoutMode] = useState<
    "mindmap" | "timeline" | "board"
  >("mindmap");
  const [wheelPanning, setWheelPanning] = useState(false);
  const [showProjectPanel, setShowProjectPanel] = useState(false);
  const [pmStatusFilter, setPmStatusFilter] = useState<
    "all" | CanvasNodeStatus
  >("all");
  const [focusNodeOnly, setFocusNodeOnly] = useState(false);

  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const wheelPanRaf = useRef<number>(0);
  const wheelPanDelta = useRef({ x: 0, y: 0 });
  const wheelPanReleaseTimeout = useRef<number>(0);
  const wheelZoomRaf = useRef<number>(0);
  const wheelZoomDelta = useRef(0);
  const wheelZoomPoint = useRef<{ x: number; y: number } | null>(null);
  const wheelGestureMode = useRef<"pan" | "zoom" | null>(null);
  const wheelGestureModeTimeout = useRef<number>(0);

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

  // Keyboard
  useEffect(() => {
    const zoomFromCenterBy = (delta: number) => {
      const el = canvasRef.current;
      const vp = useCanvas.getState().viewport;
      if (!el) {
        useCanvas.getState().setZoom(vp.zoom + delta);
        return;
      }
      const rect = el.getBoundingClientRect();
      const nextZoom = Math.max(0.15, Math.min(3, vp.zoom + delta));
      const worldX = (rect.width * 0.5 - vp.panX) / vp.zoom;
      const worldY = (rect.height * 0.5 - vp.panY) / vp.zoom;
      useCanvas.setState({
        viewport: {
          ...vp,
          zoom: nextZoom,
          panX: rect.width * 0.5 - worldX * nextZoom,
          panY: rect.height * 0.5 - worldY * nextZoom,
        },
      });
    };

    const fitCanvasNow = () => {
      const state = useCanvas.getState();
      const active = state.getActiveCanvas();
      if (!active || active.nodes.length === 0) {
        resetViewport();
        return;
      }
      const minX = Math.min(...active.nodes.map((n) => n.x));
      const maxX = Math.max(...active.nodes.map((n) => n.x + n.width));
      const minY = Math.min(...active.nodes.map((n) => n.y));
      const maxY = Math.max(...active.nodes.map((n) => n.y + n.height));
      const pad = 60;
      const z = Math.min(
        (canvasSize.w - pad * 2) / Math.max(100, maxX - minX),
        (canvasSize.h - pad * 2) / Math.max(100, maxY - minY),
        1.5,
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      useCanvas.setState({
        viewport: {
          ...state.viewport,
          zoom: z,
          panX: canvasSize.w * 0.5 - cx * z,
          panY: canvasSize.h * 0.5 - cy * z,
        },
      });
    };

    const focusNodeNow = (nodeId: string) => {
      const state = useCanvas.getState();
      const active = state.getActiveCanvas();
      const node = active?.nodes.find((item) => item.id === nodeId);
      if (!node) return;
      const nextZoom = Math.max(0.5, Math.min(1.35, state.viewport.zoom));
      useCanvas.setState({
        viewport: {
          ...state.viewport,
          zoom: nextZoom,
          panX: canvasSize.w * 0.5 - (node.x + node.width * 0.5) * nextZoom,
          panY: canvasSize.h * 0.5 - (node.y + node.height * 0.5) * nextZoom,
        },
      });
    };

    const onDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName;
      const isEditing =
        targetTag === "INPUT" ||
        targetTag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable;
      if (e.code === "Space" && !isEditing) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Delete" && selectedNodeId && !isEditing) {
        useCanvas.getState().deleteNode(selectedNodeId);
        setSelectedNodeId(null);
      }
      if (e.key === "Escape") {
        setConnectingFrom(null);
        setSelectedNodeId(null);
        setShowWidgetMenu(false);
        setQuickAddPos(null);
        setShowMagicBuilder(false);
        setShowProjectPanel(false);
      }
      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !isEditing) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y" && !isEditing) {
        e.preventDefault();
      }
      // Center view
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        resetViewport();
      }
      if (!isEditing && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomFromCenterBy(0.12);
      }
      if (!isEditing && e.key === "-") {
        e.preventDefault();
        zoomFromCenterBy(-0.12);
      }
      if (!isEditing && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setGridMode((g) => (g === "dots" ? "lines" : g === "lines" ? "none" : "dots"));
      }
      if (!isEditing && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (selectedNodeId) {
          focusNodeNow(selectedNodeId);
        } else {
          fitCanvasNow();
        }
      }
      if (!isEditing && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowProjectPanel((prev) => !prev);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "m" &&
        !isEditing
      ) {
        e.preventDefault();
        setShowMagicBuilder(true);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [selectedNodeId, resetViewport, canvasSize.w, canvasSize.h]);

  // Pan
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setQuickAddPos(null);
      setShowWidgetMenu(false);
      const target = e.target as HTMLElement;
      const isCanvasBackground =
        target === e.currentTarget ||
        target.id === "nexus-canvas-inner" ||
        Boolean(target.closest("#nexus-canvas-inner"));
      if (e.button === 1 || (e.button === 0 && (spaceHeld || isCanvasBackground))) {
        e.preventDefault();
        setPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX: viewport.panX,
          panY: viewport.panY,
        };
      }
      if (e.button === 0 && isCanvasBackground) {
        setSelectedNodeId(null);
        setConnectingFrom(null);
      }
    },
    [spaceHeld, viewport.panX, viewport.panY],
  );

  useEffect(() => {
    if (!panning) return;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setPan(pending.x, pending.y);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      pending = {
        x: panStart.current.panX + e.clientX - panStart.current.x,
        y: panStart.current.panY + e.clientY - panStart.current.y,
      };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onUp = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (pending) {
        setPan(pending.x, pending.y);
        pending = null;
      }
      setPanning(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [panning, setPan]);

  const applyZoomAtPoint = useCallback(
    (clientX: number, clientY: number, scaleFactor: number) => {
      const el = canvasRef.current;
      if (!el) return;
      const vp = useCanvas.getState().viewport;
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const nextZoom = Math.max(0.15, Math.min(3, vp.zoom * scaleFactor));
      if (Math.abs(nextZoom - vp.zoom) < 0.0001) return;
      const worldX = (localX - vp.panX) / vp.zoom;
      const worldY = (localY - vp.panY) / vp.zoom;
      const nextPanX = localX - worldX * nextZoom;
      const nextPanY = localY - worldY * nextZoom;
      useCanvas.setState({
        viewport: {
          ...vp,
          zoom: nextZoom,
          panX: nextPanX,
          panY: nextPanY,
        },
      });
    },
    [],
  );

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
      applyZoomAtPoint(centerX, centerY, factor);
    },
    [applyZoomAtPoint, setZoom],
  );

  // Trackpad-friendly wheel: keep gesture mode stable and zoom on a single RAF pass.
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const deltaScale =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvasSize.h : 1;
      const rawDx = e.deltaX * deltaScale;
      const rawDy = e.deltaY * deltaScale;
      const dx = Math.max(-180, Math.min(180, rawDx));
      const dy = Math.max(-180, Math.min(180, rawDy));
      if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return;

      const absRawDx = Math.abs(rawDx);
      const absRawDy = Math.abs(rawDy);
      const nearVerticalGesture = absRawDy >= absRawDx * 1.15;
      const looksLikePinch =
        absRawDy > 0 &&
        nearVerticalGesture &&
        absRawDx <= 42 &&
        absRawDy <= 96;
      let mode = wheelGestureMode.current;
      if (!mode) {
        mode = e.ctrlKey || e.metaKey || looksLikePinch ? "zoom" : "pan";
        wheelGestureMode.current = mode;
      }
      if (wheelGestureModeTimeout.current) {
        window.clearTimeout(wheelGestureModeTimeout.current);
      }
      wheelGestureModeTimeout.current = window.setTimeout(() => {
        wheelGestureMode.current = null;
      }, 180);

      if (mode === "zoom") {
        const pinchDelta = Math.max(-140, Math.min(140, dy));
        wheelZoomDelta.current += pinchDelta;
        wheelZoomPoint.current = { x: e.clientX, y: e.clientY };
        if (!wheelZoomRaf.current) {
          wheelZoomRaf.current = requestAnimationFrame(() => {
            wheelZoomRaf.current = 0;
            const delta = Math.max(-200, Math.min(200, wheelZoomDelta.current));
            wheelZoomDelta.current = 0;
            const point = wheelZoomPoint.current;
            if (!point || Math.abs(delta) < 0.02) return;
            const absPinch = Math.abs(delta);
            const sensitivity =
              absPinch <= 8 ? 0.011 : absPinch < 28 ? 0.0085 : 0.0062;
            const factor = Math.exp(-delta * sensitivity);
            applyZoomAtPoint(point.x, point.y, factor);
          });
        }
        setWheelPanning(false);
        return;
      }

      wheelPanDelta.current.x -= dx;
      wheelPanDelta.current.y -= dy;
      setWheelPanning(true);
      if (!wheelPanRaf.current) {
        wheelPanRaf.current = requestAnimationFrame(() => {
          wheelPanRaf.current = 0;
          const vp = useCanvas.getState().viewport;
          const delta = wheelPanDelta.current;
          wheelPanDelta.current = { x: 0, y: 0 };
          if (delta.x || delta.y) {
            useCanvas.setState({
              viewport: {
                ...vp,
                panX: vp.panX + delta.x,
                panY: vp.panY + delta.y,
              },
            });
          }
        });
      }

      if (wheelPanReleaseTimeout.current) {
        window.clearTimeout(wheelPanReleaseTimeout.current);
      }
      wheelPanReleaseTimeout.current = window.setTimeout(() => {
        setWheelPanning(false);
      }, 110);
    },
    [applyZoomAtPoint, canvasSize.h],
  );

  useEffect(
    () => () => {
      if (wheelPanRaf.current) {
        cancelAnimationFrame(wheelPanRaf.current);
      }
      if (wheelZoomRaf.current) {
        cancelAnimationFrame(wheelZoomRaf.current);
      }
      if (wheelPanReleaseTimeout.current) {
        window.clearTimeout(wheelPanReleaseTimeout.current);
      }
      if (wheelGestureModeTimeout.current) {
        window.clearTimeout(wheelGestureModeTimeout.current);
      }
      wheelGestureMode.current = null;
    },
    [],
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
    if (!canvas || canvas.nodes.length === 0) {
      resetViewport();
      return;
    }
    const cW = canvasSize.w,
      cH = canvasSize.h;
    const minX = Math.min(...canvas.nodes.map((n) => n.x));
    const maxX = Math.max(...canvas.nodes.map((n) => n.x + n.width));
    const minY = Math.min(...canvas.nodes.map((n) => n.y));
    const maxY = Math.max(...canvas.nodes.map((n) => n.y + n.height));
    const pad = 60;
    const z = Math.min(
      (cW - pad * 2) / (maxX - minX),
      (cH - pad * 2) / (maxY - minY),
      1.5,
    );
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;
    setZoom(z);
    setPan(cW / 2 - cx * z, cH / 2 - cy * z);
  }, [canvas, canvasSize, resetViewport, setZoom, setPan]);

  const focusNode = useCallback(
    (nodeId: string) => {
      const target = canvas?.nodes.find((node) => node.id === nodeId);
      if (!target) return;
      const nextZoom = Math.max(0.5, Math.min(1.35, viewport.zoom));
      useCanvas.setState({
        viewport: {
          ...viewport,
          zoom: nextZoom,
          panX: canvasSize.w * 0.5 - (target.x + target.width * 0.5) * nextZoom,
          panY: canvasSize.h * 0.5 - (target.y + target.height * 0.5) * nextZoom,
        },
      });
    },
    [canvas, canvasSize.w, canvasSize.h, viewport],
  );

  const exportCanvas = useCallback(() => {
    if (!canvas) return;
    const exportedAt = new Date().toISOString();
    const stamp = exportedAt.slice(0, 19).replace(/[:T]/g, "-");
    const slug = toFileSafeSlug(canvas.name);
    const baseName = `${slug}-${stamp}`;

    const jsonPayload = {
      version: 1,
      app: "nexus-canvas",
      exportedAt,
      viewport,
      canvas: {
        id: canvas.id,
        name: canvas.name,
        created: canvas.created,
        updated: canvas.updated,
        nodes: canvas.nodes,
        connections: canvas.connections,
      },
    };

    const readable: string[] = [];
    readable.push(`# Canvas Export: ${canvas.name}`);
    readable.push(`exported_at: ${exportedAt}`);
    readable.push(`canvas_id: ${canvas.id}`);
    readable.push(`nodes: ${canvas.nodes.length}`);
    readable.push(`connections: ${canvas.connections.length}`);
    readable.push("");
    readable.push("## Nodes");
    canvas.nodes.forEach((node, index) => {
      readable.push(`### ${index + 1}. ${node.title || "Untitled"} (${node.type})`);
      readable.push(`id: ${node.id}`);
      readable.push(`position: x=${Math.round(node.x)}, y=${Math.round(node.y)}`);
      readable.push(`size: w=${Math.round(node.width)}, h=${Math.round(node.height)}`);
      if (node.status) readable.push(`status: ${node.status}`);
      if (node.priority) readable.push(`priority: ${node.priority}`);
      if (typeof node.progress === "number") readable.push(`progress: ${node.progress}`);
      if (node.dueDate) readable.push(`due_date: ${node.dueDate}`);
      if (node.owner) readable.push(`owner: ${node.owner}`);
      if (node.tags?.length) readable.push(`tags: ${node.tags.join(", ")}`);
      if (node.items?.length) {
        readable.push("checklist:");
        node.items.forEach((item) => {
          readable.push(`- [${item.done ? "x" : " "}] ${item.text}`);
        });
      }
      if (node.content?.trim()) {
        readable.push("content:");
        readable.push("```text");
        readable.push(node.content.trimEnd());
        readable.push("```");
      }
      readable.push("");
    });
    readable.push("## Connections");
    canvas.connections.forEach((conn, index) => {
      const from = canvas.nodes.find((n) => n.id === conn.fromId);
      const to = canvas.nodes.find((n) => n.id === conn.toId);
      readable.push(
        `${index + 1}. ${from?.title || conn.fromId} -> ${to?.title || conn.toId}${conn.label ? ` (${conn.label})` : ""}`,
      );
    });
    readable.push("");
    readable.push("## Raw JSON");
    readable.push("```json");
    readable.push(JSON.stringify(jsonPayload, null, 2));
    readable.push("```");

    triggerTextDownload(
      `${baseName}.nexus-canvas.json`,
      JSON.stringify(jsonPayload, null, 2),
      "application/json;charset=utf-8",
    );
    triggerTextDownload(
      `${baseName}.nexus-canvas.md`,
      readable.join("\n"),
      "text/markdown;charset=utf-8",
    );
  }, [canvas, viewport]);

  const addWidgetNode = useCallback(
    (type: NodeType | "sticky", x?: number, y?: number) => {
      if (type === "sticky") {
        const state = useCanvas.getState();
        state.addNode("text", x, y);
        const c = state.getActiveCanvas();
        const last = c?.nodes[c.nodes.length - 1];
        if (last)
          state.updateNode(last.id, { color: "#FFCC00", title: "Sticky Note" });
        return;
      }
      addNode(type as NodeType, x, y);
    },
    [addNode],
  );

  const spawnNode = useCallback(
    (
      type: NodeType,
      opts: {
        x: number;
        y: number;
        title?: string;
        patch?: Partial<CanvasNode>;
      },
    ) => {
      const state = useCanvas.getState();
      state.addNode(type, opts.x, opts.y);
      const active = state.getActiveCanvas();
      const created = active?.nodes[active.nodes.length - 1];
      if (!created) return null;
      const patch: Partial<CanvasNode> = { ...(opts.patch || {}) };
      if (opts.title) patch.title = opts.title;
      if (Object.keys(patch).length) state.updateNode(created.id, patch);
      return created.id;
    },
    [],
  );

  const connectNodes = useCallback(
    (links: Array<[string | null, string | null]>) => {
      const state = useCanvas.getState();
      links.forEach(([from, to]) => {
        if (from && to) state.addConnection(from, to);
      });
    },
    [],
  );

  const createStarterPack = useCallback(
    (origin?: { x: number; y: number }) => {
      const active = useCanvas.getState().getActiveCanvas();
      const viewportCenterX = (-viewport.panX + canvasSize.w * 0.42) / viewport.zoom;
      const viewportCenterY = (-viewport.panY + canvasSize.h * 0.36) / viewport.zoom;
      const pickCenter = () => {
        if (origin) return { x: origin.x, y: origin.y };
        if (!active?.nodes.length) return { x: viewportCenterX, y: viewportCenterY };
        const templateSize = { w: 1440, h: 1080 };
        const offsets: Array<[number, number]> = [[0, 0]];
        const stepX = Math.max(560, Math.round(templateSize.w * 0.56));
        const stepY = Math.max(420, Math.round(templateSize.h * 0.48));
        for (let ring = 1; ring <= 8; ring += 1) {
          const points = 8 + ring * 6;
          const radiusX = stepX * ring;
          const radiusY = stepY * ring;
          for (let index = 0; index < points; index += 1) {
            const angle = (index / points) * Math.PI * 2;
            offsets.push([
              Math.round(Math.cos(angle) * radiusX),
              Math.round(Math.sin(angle) * radiusY),
            ]);
          }
        }
        const scoreAt = (centerX: number, centerY: number) => {
          const margin = 132;
          const left = centerX - templateSize.w * 0.5 - margin;
          const top = centerY - templateSize.h * 0.5 - margin;
          const right = centerX + templateSize.w * 0.5 + margin;
          const bottom = centerY + templateSize.h * 0.5 + margin;
          let score = 0;
          active.nodes.forEach((node) => {
            const nodeLeft = node.x - 64;
            const nodeTop = node.y - 64;
            const nodeRight = node.x + node.width + 64;
            const nodeBottom = node.y + node.height + 64;
            if (
              nodeLeft >= right ||
              nodeRight <= left ||
              nodeTop >= bottom ||
              nodeBottom <= top
            ) {
              return;
            }
            score += 1;
            const overlapW = Math.max(0, Math.min(right, nodeRight) - Math.max(left, nodeLeft));
            const overlapH = Math.max(0, Math.min(bottom, nodeBottom) - Math.max(top, nodeTop));
            score += (overlapW * overlapH) / (templateSize.w * templateSize.h + 1);
          });
          return score;
        };
        let bestX = viewportCenterX;
        let bestY = viewportCenterY;
        let bestScore = Number.POSITIVE_INFINITY;
        offsets.forEach(([dx, dy]) => {
          const candX = viewportCenterX + dx;
          const candY = viewportCenterY + dy;
          const score = scoreAt(candX, candY);
          if (score < bestScore) {
            bestScore = score;
            bestX = candX;
            bestY = candY;
          }
        });
        return {
          x: Math.round(bestX / 10) * 10,
          y: Math.round(bestY / 10) * 10,
        };
      };
      const center = pickCenter();
      const centerX = center.x;
      const centerY = center.y;
      const root = spawnNode("project", {
        x: centerX,
        y: centerY,
        title: "Project Starter",
        patch: {
          color: "#5E5CE6",
          status: "doing",
          priority: "high",
          progress: 12,
          owner: "team",
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          content: "Scope, KPI, Owner, Risiken und Next Steps",
        },
      });
      const brief = spawnNode("markdown", {
        x: centerX - 450,
        y: centerY - 90,
        title: "Project Brief",
        patch: {
          color: "#64D2FF",
          content:
            "```nexus-list\nScope | Must-have Features\nPrimary KPI | Adoption + Retention\nOwner | product + engineering\n```\n\n"
            + "```nexus-steps\nDiscovery | Zielbild fixieren\nBuild | Kernumsetzung liefern\nQA | Stabilität + UX sicherstellen\n```",
        },
      });
      const sprint = spawnNode("checklist", {
        x: centerX + 430,
        y: centerY - 70,
        title: "Sprint Execution",
        patch: { color: "#30D158" },
      });
      const risk = spawnNode("risk", {
        x: centerX - 130,
        y: centerY + 320,
        title: "Primary Risk",
        patch: {
          color: "#FF453A",
          status: "blocked",
          priority: "critical",
          owner: "lead",
        },
      });
      const milestone = spawnNode("milestone", {
        x: centerX + 320,
        y: centerY + 310,
        title: "Milestone #1",
        patch: {
          color: "#FF9F0A",
          status: "todo",
          dueDate: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
        },
      });
      connectNodes([
        [root, brief],
        [root, sprint],
        [root, risk],
        [root, milestone],
      ]);
      if (sprint) {
        const state = useCanvas.getState();
        state.addChecklistItem(sprint, "Kickoff + Scope finalisieren");
        state.addChecklistItem(sprint, "API + UI Integration");
        state.addChecklistItem(sprint, "QA + UAT");
        state.addChecklistItem(sprint, "Launch Gate");
      }
      if (root) setSelectedNodeId(root);
      requestAnimationFrame(() => fitView());
    },
    [
      canvasSize.h,
      canvasSize.w,
      connectNodes,
      fitView,
      spawnNode,
      viewport.panX,
      viewport.panY,
      viewport.zoom,
    ],
  );

  const createMagicTemplate = useCallback(
    (payload: MagicTemplatePayload) => {
      createMagicTemplateFromPayload({
        payload,
        canvasSize,
        viewport,
        spawnNode,
        connectNodes,
        fitView,
        setSelectedNodeId,
        setShowMagicBuilder,
        setQuickAddPos,
      });
    },
    [
      canvasSize,
      viewport.panX,
      viewport.panY,
      viewport.zoom,
      spawnNode,
      connectNodes,
      fitView,
    ],
  );

  const handleHubQuickAction = useCallback(
    (hubNode: CanvasNode, action: CanvasMagicHubQuickActionId) => {
      const state = useCanvas.getState();
      const target = getCanvasMagicHubQuickAction(action);
      if (!target) return;
      const nextX = hubNode.x + hubNode.width + 88;
      const nextY = hubNode.y + target.yOffset;
      state.addNode(target.nodeType as NodeType, nextX, nextY);
      const activeCanvas = state.getActiveCanvas();
      const created = activeCanvas?.nodes[activeCanvas.nodes.length - 1];
      if (!created) return;
      state.updateNode(created.id, {
        title: target.title,
        color: target.color,
        content: target.content,
        status: target.status as any,
        priority: target.priority as any,
        progress: typeof target.progress === "number" ? target.progress : 0,
      });
      state.addConnection(hubNode.id, created.id);
      setSelectedNodeId(created.id);
    },
    [],
  );


  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const state = useCanvas.getState();
    const active = state.getActiveCanvas();
    const source = active?.nodes.find((node) => node.id === selectedNodeId);
    if (!source) return;

    state.addNode(source.type, source.x + 64, source.y + 64);
    const next = state.getActiveCanvas();
    const created = next?.nodes[next.nodes.length - 1];
    if (!created) return;

    const duplicateItems = source.items?.map((item, index) => ({
      ...item,
      id: `${item.id}-copy-${index}-${Date.now().toString(36)}`,
    }));
    state.updateNode(created.id, {
      title: `${source.title} Copy`,
      width: source.width,
      height: source.height,
      color: source.color,
      content: source.content,
      items: duplicateItems,
      codeLang: source.codeLang,
      status: source.status,
      priority: source.priority,
      progress: source.progress,
      dueDate: source.dueDate,
      owner: source.owner,
      tags: source.tags ? [...source.tags] : undefined,
      effort: source.effort,
      lane: source.lane,
      icon: source.icon,
      linkedCodeId: source.linkedCodeId,
      linkedNoteId: source.linkedNoteId,
      linkedReminderId: source.linkedReminderId,
      linkedTaskId: source.linkedTaskId,
    });
    setSelectedNodeId(created.id);
  }, [selectedNodeId]);

  const autoArrangeByStatus = useCallback(() => {
    const state = useCanvas.getState();
    const active = state.getActiveCanvas();
    if (!active || active.nodes.length === 0) return;

    const order: CanvasNodeStatus[] = ["todo", "doing", "blocked", "done"];
    const counters: Record<CanvasNodeStatus, number> = {
      todo: 0,
      doing: 0,
      blocked: 0,
      done: 0,
    };
    const baseX = 120;
    const columnGap = 340;
    const baseY = 120;
    const rowGap = 240;

    active.nodes.forEach((node, index) => {
      const lane = node.status || laneForNode(node, index);
      const laneIndex = order.indexOf(lane);
      const row = counters[lane]++;
      state.moveNode(
        node.id,
        baseX + Math.max(0, laneIndex) * columnGap,
        baseY + row * rowGap,
      );
    });
    requestAnimationFrame(() => fitView());
  }, [fitView]);

  const autoLinkWikiRefs = useCallback(() => {
    const state = useCanvas.getState();
    const active = state.getActiveCanvas();
    if (!active) return;
    const byTitle = new globalThis.Map(
      active.nodes.map((node) => [node.title.trim().toLowerCase(), node.id] as const),
    );
    active.nodes.forEach((node) => {
      const content = node.content || "";
      const refs = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g)).map((m) =>
        m[1].trim().toLowerCase(),
      );
      refs.forEach((ref) => {
        const toId = byTitle.get(ref);
        if (toId && toId !== node.id) {
          state.addConnection(node.id, toId);
        }
      });
    });
  }, []);

  const applyAutoLayout = useCallback(
    (mode: "mindmap" | "timeline" | "board", opts?: { fitView?: boolean }) => {
      const state = useCanvas.getState();
      const active = state.getActiveCanvas();
      if (!active || active.nodes.length === 0) return;

      const nodes = [...active.nodes];
      if (nodes.length === 1) {
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      const minX = Math.min(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));

      if (mode === "timeline") {
        const ordered = nodes
          .map((node, index) => ({ node, index }))
          .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
          .map((entry) => entry.node);
        const startX = minX + 80;
        const baseY = minY + 80;
        ordered.forEach((n, i) => {
          const stepX = startX + i * 320;
          const stepY = baseY + (i % 2 === 0 ? 0 : 115);
          state.moveNode(n.id, stepX, stepY);
        });
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      if (mode === "board") {
        const laneIndexById = new globalThis.Map(
          BOARD_LANES.map((lane, index) => [lane.id, index] as const),
        );
        const buckets = BOARD_LANES.reduce(
          (acc, lane) => {
            acc[lane.id] = [];
            return acc;
          },
          {} as Record<CanvasNodeStatus, CanvasNode[]>,
        );

        nodes.forEach((n, i) => {
          const lane = laneForNode(n, i);
          buckets[lane].push(n);
        });

        BOARD_LANES.forEach((lane) => {
          const laneNodes = buckets[lane.id];
          const laneIndex = laneIndexById.get(lane.id) || 0;
          laneNodes.forEach((n, i) => {
            state.moveNode(n.id, minX + laneIndex * 340, minY + i * 240 + 72);
          });
        });
        if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
        return;
      }

      const root = nodes[0];
      const others = nodes.slice(1);
      const radius = Math.max(240, others.length * 40);
      others.forEach((n, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(others.length, 1);
        const x = root.x + Math.cos(angle) * radius;
        const y = root.y + Math.sin(angle) * Math.max(180, radius * 0.62);
        state.moveNode(n.id, x, y);
      });
      if (opts?.fitView !== false) requestAnimationFrame(() => fitView());
    },
    [fitView],
  );

  const layoutGuides = useMemo(() => {
    if (!canvas || canvas.nodes.length === 0 || layoutMode === "mindmap") {
      return null as
        | null
        | {
            type: "timeline";
            points: Array<{ id: string; x: number; y: number; label: string }>;
            axisY: number;
          }
        | {
            type: "board";
            lanes: Array<{
              id: CanvasNodeStatus;
              label: string;
              color: string;
              x: number;
              y: number;
              width: number;
              height: number;
            }>;
          };
    }

    const minX = Math.min(...canvas.nodes.map((n) => n.x));
    const minY = Math.min(...canvas.nodes.map((n) => n.y));
    const maxY = Math.max(...canvas.nodes.map((n) => n.y + n.height));

    if (layoutMode === "timeline") {
      const ordered = canvas.nodes
        .map((node, index) => ({ node, index }))
        .sort((a, b) => timelineSortKey(a.node, a.index) - timelineSortKey(b.node, b.index))
        .map((entry) => entry.node);
      const points = ordered.map((node, index) => ({
        id: node.id,
        x: minX + 120 + index * 320,
        y: minY + 24 + (index % 2 === 0 ? 0 : 115),
        label: node.title || `Step ${index + 1}`,
      }));
      return { type: "timeline", points, axisY: minY + 70 };
    }

    const lanes = BOARD_LANES.map((lane, laneIndex) => ({
      id: lane.id,
      label: lane.label,
      color: lane.color,
      x: minX + laneIndex * 340 - 16,
      y: minY + 20,
      width: 316,
      height: Math.max(300, maxY - minY + 260),
    }));
    return { type: "board", lanes };
  }, [canvas, layoutMode]);

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
            cursor: "pointer",
            boxShadow: `0 6px 24px rgba(${rgb}, 0.35)`,
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.04)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
          showWidgetMenu={showWidgetMenu}
          setShowWidgetMenu={setShowWidgetMenu}
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
