import { draftRegistry } from "@nexus/core/storage/draftRegistry";
import { persistenceRegistry } from "@nexus/core/storage/browserPersistence";
import { useCallback, useDeferredValue, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Note } from "../../store/appStore";

const NOTE_COMMIT_DEBOUNCE_MS = 4_200;
const NOTE_PREVIEW_DEBOUNCE_MS = 220;
const NOTE_UNDO_SNAPSHOT_INTERVAL_MS = 260;

const formatSavedAt = () =>
  new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

type UseNotesDraftStateOptions = {
  active?: Note;
  autosave: boolean;
  autosaveInterval: number;
  updateNote: (id: string, patch: Partial<Note>) => void;
  saveNote: (id: string) => void;
};

export function useNotesDraftState({
  active,
  autosave,
  autosaveInterval,
  updateNote,
  saveNote,
}: UseNotesDraftStateOptions) {
  const generation = useSyncExternalStore(draftRegistry.subscribe, draftRegistry.getGeneration, draftRegistry.getGeneration);
  const draftRevisionRef = useRef(0);
  const activeIdRef = useRef(active?.id);
  activeIdRef.current = active?.id;
  const loadedIdRef = useRef<string | undefined>(undefined);
  const loadedGenerationRef = useRef(generation);
  const ownCommitRef = useRef<{ id: string; content: string } | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftDirty, setDraftDirty] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const draftContentRef = useRef("");
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastUndoSnapshotAtRef = useRef(0);
  const commitTimerRef = useRef<number | null>(null);
  const pendingCommitRef = useRef<{ noteId: string; content: string } | null>(
    null,
  );
  const deferredDraftContent = useDeferredValue(previewContent);

  const markSavedNow = useCallback(async () => {
    if (await persistenceRegistry.flush()) setLastSavedAt(formatSavedAt());
  }, []);

  useEffect(() => {
    draftContentRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewContent(draftContent);
    }, NOTE_PREVIEW_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draftContent]);

  const flushPendingCommit = useCallback(() => {
    const pending = pendingCommitRef.current;
    if (!pending) return;
    pendingCommitRef.current = null;
    ownCommitRef.current = { id: pending.noteId, content: pending.content };
    updateNote(pending.noteId, { content: pending.content, dirty: true });
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  }, [updateNote]);

  const queueDraftCommit = useCallback(
    (noteId: string, content: string) => {
      pendingCommitRef.current = { noteId, content };
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
      }
      commitTimerRef.current = window.setTimeout(() => {
        flushPendingCommit();
      }, NOTE_COMMIT_DEBOUNCE_MS);
    },
    [flushPendingCommit],
  );

  const saveActiveNow = useCallback(async () => {
    if (!active) return false;
    const id = active.id;
    const revision = draftRevisionRef.current;
    const epoch = draftRegistry.getGeneration();
    const currentDraft = draftContentRef.current;
    flushPendingCommit();
    if (active.content !== currentDraft) {
      ownCommitRef.current = { id, content: currentDraft };
      updateNote(id, { content: currentDraft, dirty: true });
    }
    saveNote(id);
    const committed = await persistenceRegistry.flush();
    if (activeIdRef.current !== id || draftRevisionRef.current !== revision || draftRegistry.getGeneration() !== epoch) return committed;
    if (committed) { setDraftDirty(false); setLastSavedAt(formatSavedAt()); }
    else { updateNote(id, { dirty: true }); setDraftDirty(true); }
    return committed;
  }, [active, flushPendingCommit, saveNote, updateNote]);

  useEffect(() => {
    const replaced = loadedGenerationRef.current !== generation;
    const switched = loadedIdRef.current !== active?.id;
    if (!switched && !replaced && active?.content === draftContentRef.current) return;
    if (!switched && !replaced && ownCommitRef.current?.id === active?.id && ownCommitRef.current?.content === active?.content) return;
    if (switched && !replaced) flushPendingCommit();
    else { pendingCommitRef.current = null; if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current); }
    loadedIdRef.current = active?.id;
    loadedGenerationRef.current = generation;
    ownCommitRef.current = null;
    draftRevisionRef.current++;
    draftContentRef.current = active?.content ?? "";
    setLastSavedAt(null);
    if (!active) {
      setDraftContent("");
      setPreviewContent("");
      setDraftDirty(false);
      undoStackRef.current = [];
      redoStackRef.current = [];
      return;
    }
    setDraftContent(active.content);
    setPreviewContent(active.content);
    setDraftDirty(Boolean(active.dirty));
    undoStackRef.current = [active.content];
    redoStackRef.current = [];
    lastUndoSnapshotAtRef.current = Date.now();
  }, [active?.id, active?.content, generation, flushPendingCommit]);

  useEffect(() => {
    const unregister = draftRegistry.register(flushPendingCommit);
    const checkpoint = () => { flushPendingCommit(); persistenceRegistry.checkpoint(); };
    const visibility = () => { if (document.visibilityState === "hidden") checkpoint(); };
    window.addEventListener("beforeunload", checkpoint);
    window.addEventListener("pagehide", checkpoint);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      checkpoint(); unregister();
      window.removeEventListener("beforeunload", checkpoint);
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [flushPendingCommit]);

  useEffect(() => {
    if (!autosave || !active || !draftDirty) return;
    const timer = window.setTimeout(() => {
      saveActiveNow();
    }, autosaveInterval);
    return () => window.clearTimeout(timer);
  }, [active, autosave, autosaveInterval, draftDirty, saveActiveNow]);

  const handleChange = useCallback(
    (value: string) => {
      if (!active) return;
      draftContentRef.current = value;
      draftRevisionRef.current++;
      setDraftContent(value);
      setDraftDirty(true);
      const undoStack = undoStackRef.current;
      const last = undoStack[undoStack.length - 1];
      const nowMs = Date.now();
      const shouldCapture =
        last !== value &&
        (nowMs - lastUndoSnapshotAtRef.current >=
          NOTE_UNDO_SNAPSHOT_INTERVAL_MS ||
          Math.abs(value.length - (last?.length ?? 0)) >= 12 ||
          value.endsWith("\n"));
      if (shouldCapture) {
        if (undoStack.length >= 50) {
          undoStack.shift();
        }
        undoStack.push(value);
        lastUndoSnapshotAtRef.current = nowMs;
      }
      redoStackRef.current = [];
      queueDraftCommit(active.id, value);
    },
    [active, queueDraftCommit],
  );

  const handleUndo = useCallback(() => {
    if (!active || undoStackRef.current.length <= 1) return;
    const stack = [...undoStackRef.current];
    const last = stack.pop()!;
    redoStackRef.current = [...redoStackRef.current.slice(-50), last];
    const previous = stack[stack.length - 1] ?? "";
    undoStackRef.current = stack;
    draftContentRef.current = previous;
    draftRevisionRef.current++;
    setDraftContent(previous);
    setPreviewContent(previous);
    setDraftDirty(true);
    lastUndoSnapshotAtRef.current = Date.now();
    queueDraftCommit(active.id, previous);
  }, [active, queueDraftCommit]);

  const handleRedo = useCallback(() => {
    if (!active || redoStackRef.current.length === 0) return;
    const redo = [...redoStackRef.current];
    const next = redo.pop()!;
    redoStackRef.current = redo;
    undoStackRef.current = [...undoStackRef.current.slice(-50), next];
    draftContentRef.current = next;
    draftRevisionRef.current++;
    setDraftContent(next);
    setPreviewContent(next);
    setDraftDirty(true);
    lastUndoSnapshotAtRef.current = Date.now();
    queueDraftCommit(active.id, next);
  }, [active, queueDraftCommit]);

  return {
    draftContent,
    draftContentRef,
    draftDirty,
    previewContent,
    deferredDraftContent,
    handleChange,
    handleRedo,
    handleUndo,
    lastSavedAt,
    markSavedNow,
    saveActiveNow,
  };
}
