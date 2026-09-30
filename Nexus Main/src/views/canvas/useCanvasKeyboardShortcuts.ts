import { useEffect } from "react";
import { canHandleViewKeyboardEvent, isEditableShortcutTarget, useActiveViewCommandScope } from "../../app/ViewCommandScope";

export const useCanvasKeyboardShortcuts = ({
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
  openProjectSearch,
  resetViewport,
  fitView,
  focusNode,
  zoomFromCenterBy,
  deleteSelectedNode,
  undo,
  redo,
}: {
  selectedNodeId: string | null;
  setSpaceHeld: (value: boolean) => void;
  setConnectingFrom: (value: string | null) => void;
  setSelectedNodeId: (value: string | null) => void;
  setQuickAddPos: (value: { x: number; y: number } | null) => void;
  setShowMagicBuilder: (value: boolean) => void;
  setShowProjectPanel: (value: boolean | ((prev: boolean) => boolean)) => void;
  setGridMode: (value: "dots" | "lines" | "none" | ((prev: "dots" | "lines" | "none") => "dots" | "lines" | "none")) => void;
  setLayoutMode: (value: "mindmap" | "timeline" | "board") => void;
  applyAutoLayout: (
    mode: "mindmap" | "timeline" | "board",
    opts?: { fitView?: boolean },
  ) => void;
  openProjectSearch: () => void;
  resetViewport: () => void;
  fitView: () => void;
  focusNode: (nodeId: string) => void;
  zoomFromCenterBy: (delta: number) => void;
  deleteSelectedNode: (nodeId: string) => void;
  undo: () => void;
  redo: () => void;
}) => {
  const activeCommandScope = useActiveViewCommandScope();
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (!canHandleViewKeyboardEvent(e, activeCommandScope) || e.altKey) return;
      const isEditing = isEditableShortcutTarget(e.target);
      if (isEditing) return;
      if (e.key === "Escape") {
        setConnectingFrom(null);
        setSelectedNodeId(null);
        setQuickAddPos(null);
        setShowMagicBuilder(false);
        setShowProjectPanel(false);
      }
      const commandKey = e.ctrlKey || e.metaKey;
      const historyKey = e.key.toLowerCase();
      if (commandKey && !isEditing && historyKey === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (commandKey && !isEditing && historyKey === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p" && !isEditing) {
        e.preventDefault();
        openProjectSearch();
        return;
      }
      if (commandKey && !e.shiftKey && e.key === "0") {
        resetViewport();
        return;
      }
      if (commandKey && !e.shiftKey && historyKey === "m") {
        e.preventDefault();
        setShowMagicBuilder(true);
        return;
      }
      if (!commandKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomFromCenterBy(0.12);
        return;
      }
      if (commandKey || e.shiftKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Delete" && selectedNodeId) {
        deleteSelectedNode(selectedNodeId);
        setSelectedNodeId(null);
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
          focusNode(selectedNodeId);
        } else {
          fitView();
        }
      }
      if (!isEditing && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowProjectPanel((prev) => !prev);
      }
      if (!isEditing && (e.key === "1" || e.key === "2" || e.key === "3")) {
        const mode = e.key === "1" ? "mindmap" : e.key === "2" ? "timeline" : "board";
        setLayoutMode(mode);
        applyAutoLayout(mode);
      }
    };

    const onUp = (e: KeyboardEvent) => {
      if (!activeCommandScope) return;
      if (e.code === "Space") setSpaceHeld(false);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      setSpaceHeld(false);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [
    activeCommandScope,
    applyAutoLayout,
    deleteSelectedNode,
    fitView,
    focusNode,
    openProjectSearch,
    redo,
    resetViewport,
    selectedNodeId,
    setConnectingFrom,
    setGridMode,
    setLayoutMode,
    setQuickAddPos,
    setSelectedNodeId,
    setShowMagicBuilder,
    setShowProjectPanel,
    setSpaceHeld,
    undo,
    zoomFromCenterBy,
  ]);
};
