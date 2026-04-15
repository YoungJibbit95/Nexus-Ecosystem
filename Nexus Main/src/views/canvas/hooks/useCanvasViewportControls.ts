import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useCanvas, type Viewport } from "../../../store/canvasStore";

export function useCanvasViewportControls({
  canvasRef,
  viewport,
  connectingFrom,
  setSelectedNodeId,
  setConnectingFrom,
  setShowWidgetMenu,
  setQuickAddPos,
  setPan,
  setZoom,
  addConnection,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  connectingFrom: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setConnectingFrom: (id: string | null) => void;
  setShowWidgetMenu: (show: boolean) => void;
  setQuickAddPos: (pos: { x: number; y: number } | null) => void;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  addConnection: (fromId: string, toId: string) => void;
}) {
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [wheelPanning, setWheelPanning] = useState(false);

  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const wheelPanRaf = useRef<number>(0);
  const wheelPanDelta = useRef({ x: 0, y: 0 });
  const wheelPanReleaseTimeout = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, [canvasRef]);

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

    const onMove = (event: MouseEvent) => {
      pending = {
        x: panStart.current.panX + event.clientX - panStart.current.x,
        y: panStart.current.panY + event.clientY - panStart.current.y,
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
      const element = canvasRef.current;
      if (!element) return;
      const currentViewport = useCanvas.getState().viewport;
      const rect = element.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const nextZoom = Math.max(0.15, Math.min(3, currentViewport.zoom * scaleFactor));
      if (Math.abs(nextZoom - currentViewport.zoom) < 0.0001) return;
      const worldX = (localX - currentViewport.panX) / currentViewport.zoom;
      const worldY = (localY - currentViewport.panY) / currentViewport.zoom;
      useCanvas.setState({
        viewport: {
          ...currentViewport,
          zoom: nextZoom,
          panX: localX - worldX * nextZoom,
          panY: localY - worldY * nextZoom,
        },
      });
    },
    [canvasRef],
  );

  const setZoomCentered = useCallback(
    (nextZoom: number) => {
      const element = canvasRef.current;
      const currentViewport = useCanvas.getState().viewport;
      const clamped = Math.max(0.15, Math.min(3, nextZoom));
      if (!element) {
        setZoom(clamped);
        return;
      }
      const rect = element.getBoundingClientRect();
      const factor = clamped / Math.max(0.0001, currentViewport.zoom);
      applyZoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [applyZoomAtPoint, canvasRef, setZoom],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".nx-canvas-node")) {
        if (event.ctrlKey || event.metaKey || event.altKey) {
          event.preventDefault();
        }
        return;
      }
      event.preventDefault();
      const deltaScale =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvasSize.h : 1;
      const rawDx = event.deltaX * deltaScale;
      const rawDy = event.deltaY * deltaScale;
      const dx = Math.max(-180, Math.min(180, rawDx));
      const dy = Math.max(-180, Math.min(180, rawDy));
      if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return;

      const isZoomGesture = event.ctrlKey || event.metaKey || event.altKey;
      if (isZoomGesture) {
        const pinchDelta = Math.max(-120, Math.min(120, dy));
        const sensitivity = Math.abs(pinchDelta) < 16 ? 0.0105 : 0.0085;
        const factor = Math.exp(-pinchDelta * sensitivity);
        applyZoomAtPoint(event.clientX, event.clientY, factor);
        setWheelPanning(false);
        return;
      }

      wheelPanDelta.current.x -= dx;
      wheelPanDelta.current.y -= dy;
      setWheelPanning(true);

      if (!wheelPanRaf.current) {
        wheelPanRaf.current = requestAnimationFrame(() => {
          wheelPanRaf.current = 0;
          const currentViewport = useCanvas.getState().viewport;
          const delta = wheelPanDelta.current;
          wheelPanDelta.current = { x: 0, y: 0 };
          if (delta.x || delta.y) {
            useCanvas.setState({
              viewport: {
                ...currentViewport,
                panX: currentViewport.panX + delta.x,
                panY: currentViewport.panY + delta.y,
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
      if (wheelPanRaf.current) cancelAnimationFrame(wheelPanRaf.current);
      if (wheelPanReleaseTimeout.current) {
        window.clearTimeout(wheelPanReleaseTimeout.current);
      }
    },
    [],
  );

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent) => {
      setQuickAddPos(null);
      setShowWidgetMenu(false);
      const target = event.target as HTMLElement;
      const isInsideNode = Boolean(target.closest(".nx-canvas-node"));
      const isCanvasBackground =
        !isInsideNode &&
        (target === event.currentTarget ||
          target.id === "nexus-canvas-inner" ||
          Boolean(target.closest("#nexus-canvas-inner")));
      if (
        event.button === 1 ||
        (event.button === 0 &&
          ((spaceHeld && !isInsideNode) || isCanvasBackground))
      ) {
        event.preventDefault();
        setPanning(true);
        panStart.current = {
          x: event.clientX,
          y: event.clientY,
          panX: viewport.panX,
          panY: viewport.panY,
        };
      }
      if (event.button === 0 && isCanvasBackground) {
        setSelectedNodeId(null);
        setConnectingFrom(null);
      }
    },
    [
      setQuickAddPos,
      setShowWidgetMenu,
      setSelectedNodeId,
      setConnectingFrom,
      spaceHeld,
      viewport.panX,
      viewport.panY,
    ],
  );

  const handleStartConnect = useCallback(
    (nodeId: string) => setConnectingFrom(nodeId),
    [setConnectingFrom],
  );

  const handleEndConnect = useCallback(
    (nodeId: string) => {
      if (connectingFrom && connectingFrom !== nodeId) {
        addConnection(connectingFrom, nodeId);
      }
      setConnectingFrom(null);
    },
    [addConnection, connectingFrom, setConnectingFrom],
  );

  return {
    applyZoomAtPoint,
    canvasSize,
    handleCanvasMouseDown,
    handleEndConnect,
    handleStartConnect,
    handleWheel,
    panning,
    setSpaceHeld,
    setZoomCentered,
    spaceHeld,
    wheelPanning,
  };
}
