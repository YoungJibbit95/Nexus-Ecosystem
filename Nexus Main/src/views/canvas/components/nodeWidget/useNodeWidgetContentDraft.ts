import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const pendingContentRef = useRef<string | null>(null);

  const flushPendingContentCommit = useCallback(() => {
    const pending = pendingContentRef.current;
    if (pending === null) return;
    pendingContentRef.current = null;
    updateNode(node.id, { content: pending });
  }, [node.id, updateNode]);

  const scheduleContentCommit = useCallback(
    (nextContent: string) => {
      setContentDraft(nextContent);
      pendingContentRef.current = nextContent;
      if (contentCommitTimerRef.current !== null) {
        window.clearTimeout(contentCommitTimerRef.current);
      }
      contentCommitTimerRef.current = window.setTimeout(() => {
        contentCommitTimerRef.current = null;
        flushPendingContentCommit();
      }, 260);
    },
    [flushPendingContentCommit],
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
    if (pendingContentRef.current !== null) return;
    setContentDraft(node.content || "");
  }, [node.id, node.content]);

  useEffect(
    () => () => {
      if (contentCommitTimerRef.current !== null) {
        window.clearTimeout(contentCommitTimerRef.current);
        contentCommitTimerRef.current = null;
      }
      flushPendingContentCommit();
    },
    [flushPendingContentCommit],
  );

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
