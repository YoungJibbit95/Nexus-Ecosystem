import { useEffect } from "react";

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
  resetViewport,
  fitView,
  focusNode,
  zoomFromCenterBy,
  deleteSelectedNode,
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
  resetViewport: () => void;
  fitView: () => void;
  focusNode: (nodeId: string) => void;
  zoomFromCenterBy: (delta: number) => void;
  deleteSelectedNode: (nodeId: string) => void;
}) => {
  useEffect(() => {
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
        deleteSelectedNode(selectedNodeId);
        setSelectedNodeId(null);
      }
      if (e.key === "Escape") {
        setConnectingFrom(null);
        setSelectedNodeId(null);
        setQuickAddPos(null);
        setShowMagicBuilder(false);
        setShowProjectPanel(false);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "y") && !isEditing) {
        e.preventDefault();
      }
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
          focusNode(selectedNodeId);
        } else {
          fitView();
        }
      }
      if (!isEditing && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setShowProjectPanel((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m" && !isEditing) {
        e.preventDefault();
        setShowMagicBuilder(true);
      }
      if (!isEditing && (e.key === "1" || e.key === "2" || e.key === "3")) {
        const mode = e.key === "1" ? "mindmap" : e.key === "2" ? "timeline" : "board";
        setLayoutMode(mode);
        applyAutoLayout(mode);
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
  }, [
    applyAutoLayout,
    deleteSelectedNode,
    fitView,
    focusNode,
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
    zoomFromCenterBy,
  ]);
};
