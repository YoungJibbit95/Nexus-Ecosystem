import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_WIDGETS,
  LAYOUT_STORAGE_KEY,
  SNAP_ROW_HEIGHT,
  clampX,
  cloneDefaultWidgets,
  getSnapRowLimit,
  normalizeLayout,
  reorderLayoutByGrid,
  type GridCell,
  type Widget,
  type WidgetId,
} from "./dashboardLayout";
import { buildPresetLayout, isSameLayout, type LayoutPreset } from "./dashboardViewUtils";

export type PointerDragState = {
  widgetId: WidgetId;
  pointerId: number;
  originCell: GridCell;
  targetCell: GridCell;
  targetWidgetId: WidgetId | null;
  clientX: number;
  clientY: number;
  span: 1 | 2;
};

export function useDashboardLayoutEditing(editLayout: boolean) {
  const [widgets, setWidgets] = useState<Widget[]>(cloneDefaultWidgets());
  const [layoutLocked, setLayoutLocked] = useState(false);
  const [layoutHistory, setLayoutHistory] = useState<Widget[][]>([]);
  const [layoutFuture, setLayoutFuture] = useState<Widget[][]>([]);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [dragState, setDragState] = useState<PointerDragState | null>(null);
  const [hoverWidgetId, setHoverWidgetId] = useState<WidgetId | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<PointerDragState | null>(null);

  useEffect(() => {
    if (!editLayout) return;
    setHoverWidgetId(null);
  }, [editLayout]);

  useEffect(() => {
    if (!editLayout) {
      setPresetMenuOpen(false);
      setDragState(null);
      dragPreviewRef.current = null;
    }
  }, [editLayout]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Widget[];
      if (!Array.isArray(parsed)) return;
      const incoming = parsed
        .filter((w) => DEFAULT_WIDGETS.some((d) => d.id === w.id))
        .map((w) => ({
          ...w,
          span: (w.span === 2 ? 2 : 1) as 1 | 2,
          visible: w.visible !== false,
        }));

      const merged = cloneDefaultWidgets().map((base) => {
        const found = incoming.find((i) => i.id === base.id);
        return found ? { ...base, ...found } : base;
      });
      const normalized = normalizeLayout(merged);
      setWidgets(
        normalized.some((widget) => widget.visible)
          ? normalized
          : normalizeLayout(cloneDefaultWidgets()),
      );
    } catch {
      // Ignore corrupt localStorage layout payloads.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(normalizeLayout(widgets)));
    } catch {
      // Ignore localStorage write failures.
    }
  }, [widgets]);

  const commitLayout = useCallback(
    (mutate: (current: Widget[]) => Widget[]) => {
      if (layoutLocked) return;
      setWidgets((currentWidgets) => {
        const current = normalizeLayout(currentWidgets);
        const next = normalizeLayout(mutate(current));
        if (isSameLayout(current, next)) return currentWidgets;
        setLayoutHistory((history) => {
          if (history[0] && isSameLayout(history[0], current)) return history;
          return [current, ...history].slice(0, 24);
        });
        setLayoutFuture([]);
        return next;
      });
    },
    [layoutLocked],
  );

  const undoLayoutChange = useCallback(() => {
    if (layoutLocked) return;
    setLayoutHistory((history) => {
      if (history.length === 0) return history;
      const [previous, ...rest] = history;
      setWidgets((currentWidgets) => {
        const current = normalizeLayout(currentWidgets);
        setLayoutFuture((future) => [current, ...future].slice(0, 24));
        return normalizeLayout(previous);
      });
      return rest;
    });
  }, [layoutLocked]);

  const redoLayoutChange = useCallback(() => {
    if (layoutLocked) return;
    setLayoutFuture((future) => {
      if (future.length === 0) return future;
      const [next, ...rest] = future;
      setWidgets((currentWidgets) => {
        const current = normalizeLayout(currentWidgets);
        setLayoutHistory((history) => [current, ...history].slice(0, 24));
        return normalizeLayout(next);
      });
      return rest;
    });
  }, [layoutLocked]);

  const setSpan = useCallback(
    (id: WidgetId, span: 1 | 2) => {
      commitLayout((current) =>
        current.map((widget) =>
          widget.id === id ? { ...widget, span, x: clampX(widget.x, span) } : widget,
        ),
      );
    },
    [commitLayout],
  );

  const toggleWidget = useCallback(
    (id: WidgetId) => {
      commitLayout((current) =>
        current.map((widget) =>
          widget.id === id ? { ...widget, visible: !widget.visible } : widget,
        ),
      );
    },
    [commitLayout],
  );

  const resetLayout = useCallback(() => {
    commitLayout(() => cloneDefaultWidgets());
  }, [commitLayout]);

  const applyLayoutPreset = useCallback(
    (preset: LayoutPreset) => {
      commitLayout((current) => buildPresetLayout(preset, current));
      setPresetMenuOpen(false);
    },
    [commitLayout],
  );

  const clearDragState = useCallback(() => {
    setDragState(null);
    dragPreviewRef.current = null;
  }, []);

  const setWidgetGrid = useCallback(
    (id: WidgetId, cell: GridCell, originCell?: GridCell) => {
      commitLayout((current) => {
        const dragged = current.find((widget) => widget.id === id);
        if (!dragged) return current;
        const maxRow = getSnapRowLimit(current.filter((widget) => widget.visible).length);
        const nextCell = {
          x: clampX(cell.x, dragged.span),
          y: Math.max(1, Math.min(maxRow, Math.floor(cell.y))),
        } as GridCell;
        const safeOrigin = originCell ?? { x: dragged.x, y: dragged.y };
        const occupant = current.find((widget) => {
          if (!widget.visible || widget.id === id) return false;
          if (widget.y !== nextCell.y) return false;
          if (widget.span === 2) return true;
          return widget.x === nextCell.x;
        });

        return reorderLayoutByGrid(
          current.map((widget) => {
            if (widget.id === id) {
              return { ...widget, x: nextCell.x, y: nextCell.y };
            }
            if (occupant && widget.id === occupant.id) {
              return {
                ...widget,
                x: clampX(safeOrigin.x, widget.span),
                y: Math.max(1, Math.min(maxRow, safeOrigin.y)),
              };
            }
            return widget;
          }),
        );
      });
    },
    [commitLayout],
  );

  const resolveGridCellFromPointer = useCallback(
    (clientX: number, clientY: number, span: 1 | 2): GridCell | null => {
      if (!gridRef.current) return null;
      const bounds = gridRef.current.getBoundingClientRect();
      if (
        clientX < bounds.left
        || clientX > bounds.right
        || clientY < bounds.top
        || clientY > bounds.bottom
      ) {
        return null;
      }
      const relX = clientX - bounds.left;
      const relY = clientY - bounds.top;
      const visibleCount = normalizeLayout(widgets).filter((widget) => widget.visible).length;
      const maxRow = getSnapRowLimit(visibleCount);
      const rowStep = SNAP_ROW_HEIGHT + 16;
      const x = clampX(relX > bounds.width / 2 ? 2 : 1, span);
      const y = Math.max(1, Math.min(maxRow, Math.floor(relY / rowStep) + 1));
      return { x, y };
    },
    [widgets],
  );

  const beginPointerDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, widgetId: WidgetId) => {
      if (!editLayout || layoutLocked || event.button !== 0) return;
      const current = normalizeLayout(widgets);
      const dragged = current.find((widget) => widget.id === widgetId && widget.visible);
      if (!dragged) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const originCell: GridCell = { x: dragged.x, y: dragged.y };
      const initialCell =
        resolveGridCellFromPointer(event.clientX, event.clientY, dragged.span) ?? originCell;
      const nextDrag: PointerDragState = {
        widgetId,
        pointerId: event.pointerId,
        originCell,
        targetCell: initialCell,
        targetWidgetId: null,
        clientX: event.clientX,
        clientY: event.clientY,
        span: dragged.span,
      };
      dragPreviewRef.current = nextDrag;
      setDragState(nextDrag);
    },
    [editLayout, layoutLocked, resolveGridCellFromPointer, widgets],
  );

  useEffect(() => {
    if (!editLayout || !dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const targetElement = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-dashboard-widget-id]") as HTMLElement | null;
      const targetWidgetId = (targetElement?.dataset.dashboardWidgetId as WidgetId | undefined) ?? null;
      const current = normalizeLayout(widgets);
      const targetWidget =
        targetWidgetId && targetWidgetId !== dragState.widgetId
          ? current.find((widget) => widget.id === targetWidgetId)
          : null;
      const pointerCell = targetWidget
        ? ({
            x: clampX(targetWidget.x, dragState.span),
            y: targetWidget.y,
          } as GridCell)
        : resolveGridCellFromPointer(event.clientX, event.clientY, dragState.span) ?? dragState.targetCell;
      const nextDrag: PointerDragState = {
        ...dragState,
        clientX: event.clientX,
        clientY: event.clientY,
        targetCell: pointerCell,
        targetWidgetId: targetWidget?.id ?? null,
      };
      dragPreviewRef.current = nextDrag;
      setDragState(nextDrag);
    };

    const handlePointerEnd = () => {
      const committed = dragPreviewRef.current ?? dragState;
      if (committed) {
        setWidgetGrid(committed.widgetId, committed.targetCell, committed.originCell);
      }
      clearDragState();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [clearDragState, dragState, editLayout, resolveGridCellFromPointer, setWidgetGrid, widgets]);

  const orderedWidgets = useMemo(() => normalizeLayout(widgets), [widgets]);
  const visibleWidgets = useMemo(() => orderedWidgets.filter((w) => w.visible), [orderedWidgets]);
  const hiddenWidgets = useMemo(() => orderedWidgets.filter((w) => !w.visible), [orderedWidgets]);
  const draggedWidget = dragState
    ? (orderedWidgets.find((w) => w.id === dragState.widgetId) ?? null)
    : null;
  const dropCell = dragState?.targetCell ?? null;
  const dragWidgetId = dragState?.widgetId ?? null;

  return {
    widgets,
    gridRef,
    layoutLocked,
    setLayoutLocked,
    layoutHistory,
    layoutFuture,
    presetMenuOpen,
    setPresetMenuOpen,
    dragState,
    hoverWidgetId,
    setHoverWidgetId,
    orderedWidgets,
    visibleWidgets,
    hiddenWidgets,
    draggedWidget,
    dropCell,
    dragWidgetId,
    beginPointerDrag,
    setSpan,
    toggleWidget,
    resetLayout,
    undoLayoutChange,
    redoLayoutChange,
    applyLayoutPreset,
  };
}
