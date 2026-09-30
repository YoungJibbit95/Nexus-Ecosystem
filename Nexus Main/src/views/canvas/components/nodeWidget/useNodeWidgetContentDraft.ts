import { draftRegistry } from "@nexus/core/storage/draftRegistry";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CanvasNode } from "../../../../store/canvasStore";

export const useNodeWidgetContentDraft = ({
  node,
  updateNode,
}: {
  node: CanvasNode;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
}) => {
  const [contentDraft, setContentDraft] = useState(node.content || "");
  const contentCommitTimerRef = useRef<number | null>(null);
  const pendingContentRef = useRef<{ nodeId: string; content: string; generation: number } | null>(null);
  const generation = useSyncExternalStore(draftRegistry.subscribe, draftRegistry.getGeneration, draftRegistry.getGeneration);
  const loadedNodeIdRef = useRef(node.id);
  const loadedGenerationRef = useRef(generation);

  const cancelContentCommitTimer = useCallback(() => {
    if (contentCommitTimerRef.current === null) return;
    window.clearTimeout(contentCommitTimerRef.current);
    contentCommitTimerRef.current = null;
  }, []);

  const discardPendingContentCommit = useCallback(() => {
    pendingContentRef.current = null;
    cancelContentCommitTimer();
  }, [cancelContentCommitTimer]);

  const flushPendingContentCommit = useCallback(() => {
    const pending = pendingContentRef.current;
    if (pending === null) return;
    pendingContentRef.current = null;
    cancelContentCommitTimer();
    if (pending.generation !== draftRegistry.getGeneration()) return;
    updateNode(pending.nodeId, { content: pending.content });
  }, [cancelContentCommitTimer, updateNode]);

  const scheduleContentCommit = useCallback(
    (nextContent: string) => {
      setContentDraft(nextContent);
      pendingContentRef.current = { nodeId: node.id, content: nextContent, generation: draftRegistry.getGeneration() };
      cancelContentCommitTimer();
      contentCommitTimerRef.current = window.setTimeout(() => {
        contentCommitTimerRef.current = null;
        flushPendingContentCommit();
      }, 260);
    },
    [cancelContentCommitTimer, flushPendingContentCommit, node.id],
  );

  const commitNodePatch = useCallback(
    (id: string, patch: Partial<CanvasNode>) => {
      if (id !== node.id) {
        updateNode(id, patch);
        return;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "content")) {
        const nextContent = String((patch as { content?: unknown }).content ?? "");
        scheduleContentCommit(nextContent);
        const { content: _content, ...rest } = patch;
        if (Object.keys(rest).length > 0) {
          updateNode(id, rest);
        }
        return;
      }
      updateNode(id, patch);
    },
    [node.id, scheduleContentCommit, updateNode],
  );

  useEffect(() => {
    const replaced = loadedGenerationRef.current !== generation;
    const switched = loadedNodeIdRef.current !== node.id;
    if (replaced && pendingContentRef.current?.generation !== generation) discardPendingContentCommit();
    else if (switched) flushPendingContentCommit();
    loadedGenerationRef.current = generation;
    loadedNodeIdRef.current = node.id;
    if (pendingContentRef.current !== null) return;
    setContentDraft(node.content || "");
  }, [discardPendingContentCommit, flushPendingContentCommit, generation, node.id, node.content]);

  useEffect(() => {
    const unregister = draftRegistry.register(flushPendingContentCommit);
    // Clear refs synchronously: a replacement must win even before React renders.
    const unsubscribe = draftRegistry.subscribe(discardPendingContentCommit);
    return () => {
      unregister();
      unsubscribe();
      flushPendingContentCommit();
      cancelContentCommitTimer();
    };
  }, [cancelContentCommitTimer, discardPendingContentCommit, flushPendingContentCommit]);

  const nodeForRender = useMemo(
    () =>
      node.content === contentDraft
        ? node
        : {
            ...node,
            content: contentDraft,
          },
    [contentDraft, node],
  );

  return {
    contentDraft,
    setContentDraft,
    nodeForRender,
    commitNodePatch,
  };
};
