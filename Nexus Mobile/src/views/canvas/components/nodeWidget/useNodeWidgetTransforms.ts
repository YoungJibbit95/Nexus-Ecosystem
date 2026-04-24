import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useCanvas, type CanvasNode } from "../../../../store/canvasStore";

export const useNodeWidgetTransforms = ({
  node,
  onSelect,
  moveNode,
  resizeNode,
  updateNode,
}: {
  node: CanvasNode;
  onSelect: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  resizeNode: (id: string, width: number, height: number) => void;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
}) => {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [scalingNode, setScalingNode] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [scalePreview, setScalePreview] = useState<{
    x: number;
    width: number;
    height: number;
    scale: number;
  } | null>(null);

  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const dragTouchIdRef = useRef<number | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const scaleStart = useRef({
    x: 0,
    y: 0,
    right: 0,
    w: 0,
    h: 0,
    scale: 1,
  });

  const handleNodeWheelCapture = useCallback((event: ReactWheelEvent) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey || event.altKey) {
      event.preventDefault();
    }
  }, []);

  const handleDragStart = useCallback(
    (e: ReactMouseEvent) => {
      if ((e.target as HTMLElement).closest(".node-interactive")) return;
      e.stopPropagation();
      onSelect(node.id);
      setDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        nodeX: node.x,
        nodeY: node.y,
      };
    },
    [node.id, node.x, node.y, onSelect],
  );

  const handleDragTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if ((e.target as HTMLElement).closest(".node-interactive")) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.stopPropagation();
      onSelect(node.id);
      setDragging(true);
      dragTouchIdRef.current = touch.identifier;
      dragStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        nodeX: node.x,
        nodeY: node.y,
      };
    },
    [node.id, node.x, node.y, onSelect],
  );

  useEffect(() => {
    if (!dragging) return;
    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setDragPreview(pending);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      pending = {
        x: dragStart.current.nodeX + (e.clientX - dragStart.current.x) / zoom,
        y: dragStart.current.nodeY + (e.clientY - dragStart.current.y) / zoom,
      };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dragTouchIdRef.current === null) return;
      const touch = Array.from(e.touches).find(
        (entry) => entry.identifier === dragTouchIdRef.current,
      );
      if (!touch) return;
      e.preventDefault();
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      pending = {
        x: dragStart.current.nodeX + (touch.clientX - dragStart.current.x) / zoom,
        y: dragStart.current.nodeY + (touch.clientY - dragStart.current.y) / zoom,
      };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const finishDrag = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      const finalPos = pending || dragPreview;
      if (finalPos) moveNode(node.id, finalPos.x, finalPos.y);
      pending = null;
      setDragPreview(null);
      setDragging(false);
      dragTouchIdRef.current = null;
    };

    const onUp = () => {
      finishDrag();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (dragTouchIdRef.current === null) return;
      const ended = Array.from(e.changedTouches).some(
        (entry) => entry.identifier === dragTouchIdRef.current,
      );
      if (ended || e.touches.length === 0) {
        finishDrag();
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [dragging, dragPreview, moveNode, node.id]);

  const handleResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: node.width,
        h: node.height,
      };
    },
    [node.height, node.width],
  );

  useEffect(() => {
    if (!resizing) return;
    let raf = 0;
    let pending: { width: number; height: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setResizePreview(pending);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      const nextWidth = Math.max(
        160,
        resizeStart.current.w + (e.clientX - resizeStart.current.x) / zoom,
      );
      const nextHeight = Math.max(
        80,
        resizeStart.current.h + (e.clientY - resizeStart.current.y) / zoom,
      );
      pending = { width: nextWidth, height: nextHeight };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onUp = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      const finalSize = pending || resizePreview;
      if (finalSize) resizeNode(node.id, finalSize.width, finalSize.height);
      pending = null;
      setResizePreview(null);
      setResizing(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [node.id, resizeNode, resizePreview, resizing]);

  const handleScaleResizeStart = useCallback(
    (e: ReactMouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const startScale = Math.max(0.65, Math.min(2.4, node.nodeScale || 1));
      scaleStart.current = {
        x: e.clientX,
        y: e.clientY,
        right: node.x + node.width,
        w: node.width,
        h: node.height,
        scale: startScale,
      };
      setScalingNode(true);
    },
    [node.height, node.nodeScale, node.width, node.x],
  );

  useEffect(() => {
    if (!scalingNode) return;
    let raf = 0;
    let pending: { x: number; width: number; height: number; scale: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      setScalePreview(pending);
      pending = null;
    };

    const onMove = (e: MouseEvent) => {
      const zoom = useCanvas.getState().viewport?.zoom || 1;
      const deltaX = (scaleStart.current.x - e.clientX) / zoom;
      const deltaY = (e.clientY - scaleStart.current.y) / zoom;
      const growth = Math.max(deltaX, deltaY);
      const nextScale = Math.max(0.65, Math.min(2.4, scaleStart.current.scale + growth / 260));
      const factor = nextScale / Math.max(0.001, scaleStart.current.scale);
      const nextWidth = Math.max(160, scaleStart.current.w * factor);
      const nextHeight = Math.max(80, scaleStart.current.h * factor);
      const nextX = scaleStart.current.right - nextWidth;
      pending = { x: nextX, width: nextWidth, height: nextHeight, scale: nextScale };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    const onUp = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      const finalState = pending || scalePreview;
      if (finalState) {
        updateNode(node.id, {
          x: finalState.x,
          width: finalState.width,
          height: finalState.height,
          nodeScale: finalState.scale,
        });
      }
      pending = null;
      setScalePreview(null);
      setScalingNode(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [node.id, scalePreview, scalingNode, updateNode]);

  return {
    dragging,
    resizing,
    scalingNode,
    dragPreview,
    resizePreview,
    scalePreview,
    handleNodeWheelCapture,
    handleDragStart,
    handleDragTouchStart,
    handleResizeStart,
    handleScaleResizeStart,
  };
};
