import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
  useDeferredValue,
} from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Settings,
  Save,
  Copy,
  Pin,
  X,
  RotateCcw,
  Search,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Download,
  Clock,
  Hash,
  Eye,
  Edit3,
  Minus,
  Strikethrough,
  Maximize2,
  Minimize2,
  Wand2,
  Sparkles,
  Bell,
  Zap,
  Calendar,
  CreditCard,
  ChevronDown,
  Table,
  Upload,
  MoreHorizontal,
  ListTree,
  ArrowUpRight,
  CheckSquare2,
  AlarmClock,
  Orbit,
  Smile,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Glass } from "../components/Glass";
import { InteractiveIconButton } from "../components/render/InteractiveIconButton";
import { InteractiveActionButton } from "../components/render/InteractiveActionButton";
import { NexusMarkdown } from "../components/NexusMarkdown";
import { useApp } from "../store/appStore";
import { useCanvas } from "../store/canvasStore";
import { useTheme } from "../store/themeStore";
import { hexToRgb, fmtDt } from "../lib/utils";
import {
  NexusCodeBlock,
  NexusInlineCode,
  type NotesMagicPlanningActions,
} from "./notes/NotesMagicRenderers";
import { useNotesAnalysis } from "./notes/useNotesAnalysis";
import { useNotesDraftState } from "./notes/useNotesDraftState";
import {
  useNotesEmojiPicker,
  type NotesEmojiCategoryId,
} from "./notes/useNotesEmojiPicker";
import { NotesSettingsModal } from "./notes/NotesSettingsModal";
import {
  findNotesMagicFence,
  parseNotesReminderMagic,
  parseNotesTaskMagic,
  replaceNotesMagicFenceContent,
  serializeNotesReminderMagic,
  serializeNotesTaskMagic,
} from "./notes/notesMagicPlanning";
import { shallow } from "zustand/shallow";
import {
  buildNoteKnowledgeGraph,
  extractHeadings,
  rankNotesForQuery,
  resolveRelatedNotes,
} from "@nexus/core/notes/knowledge";

const MagicElementModal = lazy(() =>
  import("./notes/NotesMagicModal").then((m) => ({
    default: m.MagicElementModal,
  })),
);
const MAX_RENDERED_LINE_NUMBERS = 4_000;
const NOTES_IMPORT_INPUT_ID = "nx-notes-import-markdown";
const NOTES_UI_STATE_KEY = "nx-notes-ui-state-v1";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tag === "input" ||
    tag === "textarea" ||
    tag === "select"
  );
};

const resolveReminderDatetime = (value: string) => {
  const trimmed = value.trim();
  const parsed = trimmed ? new Date(trimmed) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
};
export function NotesView() {
  const {
    notes,
    activeNoteId,
    tasks,
    reminders,
    addNote,
    updateNote,
    delNote,
    setNote,
    saveNote,
    addTask,
    updateTask,
    addRem,
  } = useApp(
    (s) => ({
      notes: s.notes,
      activeNoteId: s.activeNoteId,
      tasks: s.tasks,
      reminders: s.reminders,
      addNote: s.addNote,
      updateNote: s.updateNote,
      delNote: s.delNote,
      setNote: s.setNote,
      saveNote: s.saveNote,
      addTask: s.addTask,
      updateTask: s.updateTask,
      addRem: s.addRem,
    }),
    shallow,
  );
  const { addCanvas } = useCanvas(
    (s) => ({
      addCanvas: s.addCanvas,
    }),
    shallow,
  );
  const [mode, setMode] = useState<"edit" | "split" | "preview">("edit");
  const [splitEditorRatio, setSplitEditorRatio] = useState(46);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<"updated" | "title" | "created">(
    "updated",
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [showMagic, setShowMagic] = useState(false);
  const [notesHeaderMenuOpen, setNotesHeaderMenuOpen] = useState(false);
  const [notesBlocksMenuOpen, setNotesBlocksMenuOpen] = useState(false);
  const [notesEmojiMenuOpen, setNotesEmojiMenuOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiCategory, setEmojiCategory] =
    useState<NotesEmojiCategoryId>("smileys");
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [quickSwitchQuery, setQuickSwitchQuery] = useState("");
  const [quickSwitchCursor, setQuickSwitchCursor] = useState(0);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredQuickSwitchQuery = useDeferredValue(quickSwitchQuery);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const quickSwitchInputRef = useRef<HTMLInputElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  // Save selection before magic menu opens so we can restore it on insert
  const savedSel = useRef<{ start: number; end: number } | null>(null);
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const active = useMemo(
    () => notes.find((n) => n.id === activeNoteId) ?? notes[0],
    [notes, activeNoteId],
  );
  const {
    draftContent,
    draftContentRef,
    draftDirty,
    deferredDraftContent,
    handleChange,
    handleRedo,
    handleUndo,
    lastSavedAt,
    markSavedNow,
    saveActiveNow,
  } = useNotesDraftState({
    active,
    autosave: t.editor.autosave,
    autosaveInterval: t.editor.autosaveInterval,
    updateNote,
    saveNote,
  });
  const analysis = useNotesAnalysis(
    deferredDraftContent,
    MAX_RENDERED_LINE_NUMBERS,
  );

  const [localSettings, setLocalSettings] = useState({
    fontSize: t.notes.fontSize,
    fontFamily: t.notes.fontFamily,
    lineHeight: t.notes.lineHeight,
    mode: t.notes.mode,
    autosave: t.editor.autosave,
    autosaveInterval: t.editor.autosaveInterval,
    wordWrap: t.editor.wordWrap,
    lineNumbers: t.editor.lineNumbers,
    minimap: t.editor.minimap,
    cursorAnimation: t.editor.cursorAnimation,
    tabSize: t.editor.tabSize,
    compactMode: t.visual.compactMode,
    panelRadius: t.visual.panelRadius,
    shadowDepth: t.visual.shadowDepth,
    spacingDensity: t.visual.spacingDensity as
      | "comfortable"
      | "compact"
      | "spacious",
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTES_UI_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed)) return;
      if (
        parsed.mode === "edit" ||
        parsed.mode === "split" ||
        parsed.mode === "preview"
      ) {
        setMode(parsed.mode);
      }
      if (
        parsed.sortBy === "updated" ||
        parsed.sortBy === "title" ||
        parsed.sortBy === "created"
      ) {
        setSortBy(parsed.sortBy);
      }
      const parsedTagFilter = parsed.tagFilter;
      if (typeof parsedTagFilter === "string" || parsedTagFilter === null) {
        setTagFilter(parsedTagFilter as string | null);
      }
      if (typeof parsed.focusMode === "boolean") {
        setFocusMode(parsed.focusMode);
      }
      if (typeof parsed.showSearch === "boolean") {
        setShowSearch(parsed.showSearch);
      }
      if (typeof parsed.searchQuery === "string") {
        setSearchQuery(parsed.searchQuery);
      }
      if (typeof parsed.splitEditorRatio === "number") {
        setSplitEditorRatio(Math.max(30, Math.min(72, parsed.splitEditorRatio)));
      }
    } catch {
      // Ignore malformed persisted UI state.
    }
  }, []);

  useEffect(() => {
    const payload = {
      mode,
      sortBy,
      tagFilter,
      focusMode,
      showSearch,
      searchQuery,
      splitEditorRatio,
    };
    try {
      window.localStorage.setItem(NOTES_UI_STATE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures.
    }
  }, [focusMode, mode, searchQuery, showSearch, sortBy, splitEditorRatio, tagFilter]);

  const syncLineNumberScroll = useCallback(
    (target?: HTMLTextAreaElement | null) => {
      const area = target ?? editorRef.current;
      const lineNumbersEl = lineNumbersRef.current;
      if (!area || !lineNumbersEl) return;
      lineNumbersEl.style.transform = `translateY(${-area.scrollTop}px)`;
    },
    [],
  );

  const handleSplitResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const grid = event.currentTarget.closest(
        ".nx-notes-editor-grid",
      ) as HTMLElement | null;
      if (!grid) return;
      event.preventDefault();
      const pointerId = event.pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const rect = grid.getBoundingClientRect();
        if (rect.width <= 0) return;
        const next = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        setSplitEditorRatio(Math.max(30, Math.min(72, next)));
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [],
  );

  const rememberEditorSelection = useCallback(() => {
    const textarea = editorRef.current;
    if (!textarea) return;
    savedSel.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }, []);

  useEffect(() => {
    syncLineNumberScroll();
  }, [draftContent, syncLineNumberScroll]);

  const saveAsFile = () => {
    if (!active) return;
    const blob = new Blob([draftContentRef.current], {
      type: "text/markdown;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = active.title.replace(/\s/g, "_") + ".md";
    link.click();
    URL.revokeObjectURL(link.href);
    saveActiveNow();
  };

  const importMarkdownFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      const rawContent = await file.text();
      const headingMatch = rawContent.match(/^#\s+(.+?)\s*$/m);
      const fallbackTitle = file.name.replace(/\.md$/i, "") || "Imported Note";
      const title = headingMatch?.[1]?.trim() || fallbackTitle;
      addNote();
      const createdId = useApp.getState().activeNoteId;
      if (!createdId) return;
      updateNote(createdId, {
        title,
        content: rawContent,
        tags: ["imported"],
      });
      saveNote(createdId);
      setNote(createdId);
      markSavedNow();
    },
    [addNote, markSavedNow, saveNote, setNote, updateNote],
  );

  // ── Insert format helper — uses saved selection if textarea lost focus ──
  const normalizeMarkdownInsert = useCallback((text: string) => {
    const blockLanguages = [
      "nexus-callout",
      "nexus-alert",
      "nexus-kanban",
      "nexus-timeline",
      "nexus-card",
      "nexus-details",
      "nexus-task",
      "nexus-reminder",
    ];
    if (blockLanguages.some((lang) => text.includes(`\`\`\`${lang}`))) {
      return `\n${text.trim()}\n`;
    }
    return text;
  }, []);

  const insertFormat = useCallback(
    (prefix: string, suffix: string = "", placeholder: string = "") => {
      if (!active) return;
      const ta = editorRef.current;
      const currentContent = draftContentRef.current;
      // Use saved selection (from magic menu open) or current selection
      const sel = savedSel.current;
      const start = sel?.start ?? ta?.selectionStart ?? currentContent.length;
      const end = sel?.end ?? ta?.selectionEnd ?? currentContent.length;
      savedSel.current = null;

      const selected = currentContent.substring(start, end) || placeholder;
      const before = currentContent.substring(0, start);
      const after = currentContent.substring(end);
      const inserted = normalizeMarkdownInsert(prefix + selected + suffix);
      const newContent = before + inserted + after;
      handleChange(newContent);

      // Restore focus + cursor
      setTimeout(() => {
        if (!ta) return;
        ta.focus();
        const cursorStart = start + normalizeMarkdownInsert(prefix).length;
        ta.selectionStart = cursorStart;
        ta.selectionEnd = cursorStart + selected.length;
      }, 10);
    },
    [active, normalizeMarkdownInsert],
  );

  const insertPlainText = useCallback(
    (text: string) => {
      if (!active) return;
      const ta = editorRef.current;
      const currentContent = draftContentRef.current;
      const sel = savedSel.current;
      const start = sel?.start ?? ta?.selectionStart ?? currentContent.length;
      const end = sel?.end ?? ta?.selectionEnd ?? currentContent.length;
      savedSel.current = null;

      const newContent =
        currentContent.substring(0, start) +
        text +
        currentContent.substring(end);
      handleChange(newContent);

      setTimeout(() => {
        if (!ta) return;
        const nextCursor = start + text.length;
        ta.focus();
        ta.selectionStart = nextCursor;
        ta.selectionEnd = nextCursor;
      }, 10);
    },
    [active],
  );

  // Save cursor position before magic menu opens
  const handleMagicOpen = () => {
    rememberEditorSelection();
    setNotesEmojiMenuOpen(false);
    setNotesBlocksMenuOpen(false);
    setShowMagic(true);
  };

  const handleEmojiMenuOpen = () => {
    rememberEditorSelection();
    setNotesEmojiMenuOpen((open) => !open);
    setNotesBlocksMenuOpen(false);
    setShowMagic(false);
  };

  useEffect(() => {
    if (!notesEmojiMenuOpen && !notesBlocksMenuOpen) return;
    const handleDismiss = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest?.(
          ".nx-notes-emoji-menu, .nx-notes-blocks-menu, [data-notes-popover-trigger]",
        )
      ) {
        return;
      }
      setNotesEmojiMenuOpen(false);
      setNotesBlocksMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotesEmojiMenuOpen(false);
      setNotesBlocksMenuOpen(false);
    };
    window.addEventListener("mousedown", handleDismiss);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleDismiss);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [notesBlocksMenuOpen, notesEmojiMenuOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "b") {
          e.preventDefault();
          insertFormat("**", "**", "fett");
        } else if (e.key === "i") {
          e.preventDefault();
          insertFormat("*", "*", "kursiv");
        } else if (e.key === "s") {
          e.preventDefault();
          if (active) saveActiveNow();
        } else if (e.key === "z") {
          e.preventDefault();
          handleUndo();
        } else if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        } else if (e.key === "k") {
          e.preventDefault();
          insertFormat("[", "](url)", "Link-Text");
        }
      }
      if (e.key === "Tab") {
        e.preventDefault();
        insertFormat("  ", "");
      }
    },
    [insertFormat, active, handleUndo, handleRedo, saveActiveNow],
  );

  const stats = active
    ? { words: analysis.words, chars: analysis.chars, lines: analysis.lines }
    : { words: 0, chars: 0, lines: 0 };
  const noteStats = active
    ? {
        words: analysis.words,
        links: analysis.links,
        tasks: analysis.tasks,
        readMins: analysis.readMins,
      }
    : {
        words: 0,
        links: 0,
        tasks: 0,
        readMins: 1,
      };

  const searchRanked = useMemo(
    () =>
      rankNotesForQuery(notes, deferredSearchQuery, 320).map(
        (entry) => entry.note,
      ),
    [notes, deferredSearchQuery],
  );

  const filteredNotes = useMemo(() => {
    let result = deferredSearchQuery ? searchRanked : notes;
    if (tagFilter) result = result.filter((n) => n.tags.includes(tagFilter));
    result = [...result].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "created")
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });
    return [
      ...result.filter((n) => n.pinned),
      ...result.filter((n) => !n.pinned),
    ];
  }, [notes, deferredSearchQuery, searchRanked, tagFilter, sortBy]);

  const knowledgeGraph = useMemo(() => buildNoteKnowledgeGraph(notes), [notes]);
  const activeHeadings = useMemo(
    () => extractHeadings(draftContent, 4),
    [draftContent],
  );
  const activeIncoming = useMemo(
    () => (active ? knowledgeGraph.incomingByNoteId.get(active.id) || [] : []),
    [knowledgeGraph, active?.id],
  );
  const activeOutgoing = useMemo(
    () =>
      active
        ? (knowledgeGraph.outgoingByNoteId.get(active.id) || []).filter(
            (edge) => Boolean(edge.targetId),
          )
        : [],
    [knowledgeGraph, active?.id],
  );
  const activeUnresolved = useMemo(
    () =>
      active ? knowledgeGraph.unresolvedByNoteId.get(active.id) || [] : [],
    [knowledgeGraph, active?.id],
  );
  const activeRelatedNotes = useMemo(
    () => (active ? resolveRelatedNotes(active.id, knowledgeGraph, 6) : []),
    [knowledgeGraph, active?.id],
  );
  const quickSwitchResults = useMemo(
    () => rankNotesForQuery(notes, deferredQuickSwitchQuery, 12),
    [notes, deferredQuickSwitchQuery],
  );
  const { activeEmojiGroup, emojiGroups, emojiResults } = useNotesEmojiPicker(
    emojiCategory,
    emojiQuery,
  );

  const lineNumbersText = active ? analysis.lineNumbersText : "1";

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  const openQuickSwitch = useCallback(() => {
    setShowQuickSwitch(true);
    setQuickSwitchQuery("");
    setQuickSwitchCursor(0);
    requestAnimationFrame(() => {
      quickSwitchInputRef.current?.focus();
      quickSwitchInputRef.current?.select();
    });
  }, []);

  const closeQuickSwitch = useCallback(() => {
    setShowQuickSwitch(false);
    setQuickSwitchQuery("");
    setQuickSwitchCursor(0);
  }, []);

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if (showQuickSwitch) return;
      const editable = isEditableTarget(event.target);
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        openQuickSwitch();
        return;
      }
      if (editable) return;
      if (key === "f") {
        event.preventDefault();
        setShowSearch(true);
        return;
      }
      if (key === "1") {
        event.preventDefault();
        setMode("edit");
        return;
      }
      if (key === "2") {
        event.preventDefault();
        setMode("split");
        return;
      }
      if (key === "3") {
        event.preventDefault();
        setMode("preview");
      }
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown);
    };
  }, [openQuickSwitch, showQuickSwitch]);

  useEffect(() => {
    if (!showQuickSwitch) return;
    setQuickSwitchCursor((cursor) => {
      if (quickSwitchResults.length === 0) return 0;
      return Math.min(cursor, quickSwitchResults.length - 1);
    });
  }, [showQuickSwitch, quickSwitchResults.length]);

  const jumpToHeading = useCallback(
    (index: number) => {
      if (mode === "preview") {
        setMode("split");
      }
      requestAnimationFrame(() => {
        const textarea = editorRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.selectionStart = index;
        textarea.selectionEnd = index;
        const contentBefore = draftContentRef.current.slice(0, index);
        const line = (contentBefore.match(/\n/g)?.length ?? 0) + 1;
        const lineHeightPx = t.notes.fontSize * t.notes.lineHeight;
        textarea.scrollTop = Math.max(0, (line - 4) * lineHeightPx);
        syncLineNumberScroll(textarea);
      });
    },
    [mode, syncLineNumberScroll, t.notes.fontSize, t.notes.lineHeight],
  );

  const focusMagicFenceInEditor = useCallback(
    (lang: string, content: string) => {
      const range = findNotesMagicFence(draftContentRef.current, lang, content);
      if (!range) return;
      if (mode === "preview") {
        setMode("split");
      }
      window.setTimeout(() => {
        requestAnimationFrame(() => {
          const textarea = editorRef.current;
          if (!textarea) return;
          textarea.focus();
          textarea.selectionStart = range.start;
          textarea.selectionEnd = range.end;
          const contentBefore = draftContentRef.current.slice(0, range.start);
          const line = (contentBefore.match(/\n/g)?.length ?? 0) + 1;
          const lineHeightPx = t.notes.fontSize * t.notes.lineHeight;
          textarea.scrollTop = Math.max(0, (line - 4) * lineHeightPx);
          syncLineNumberScroll(textarea);
        });
      }, 0);
    },
    [mode, syncLineNumberScroll, t.notes.fontSize, t.notes.lineHeight],
  );

  const insertWorkflowTemplate = useCallback(
    (kind: "daily" | "meeting" | "project") => {
      if (!active) return;
      const templates: Record<typeof kind, string> = {
        daily: `\n## Daily Focus\n- Top 3 Prioritäten\n- Blocker\n- Heute erledigt\n\n## Review\n- Was lief gut?\n- Was verbessern?\n`,
        meeting: `\n## Meeting\n- Ziel\n- Teilnehmer\n- Entscheidungen\n- Action Items\n`,
        project: `\n## Projekt Plan\n- Scope\n- Milestones\n- Risiken\n- Nächste Schritte\n\n## Tasks\n- [ ] \n`,
      };
      handleChange(`${draftContentRef.current}${templates[kind]}`);
    },
    [active, handleChange],
  );

  const insertWikilink = useCallback(
    (title: string) => {
      if (!title) return;
      insertFormat(`[[${title}]]`, "", "");
    },
    [insertFormat],
  );

  const convertNoteToTask = useCallback(() => {
    if (!active) return;
    const state = useApp.getState();
    const beforeTaskIds = new Set(state.tasks.map((task) => task.id));
    const summary = draftContentRef.current
      .replace(/[#*`\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    addTask(active.title || "Notiz Aufgabe", "todo", summary, "mid");
    const afterState = useApp.getState();
    const created = afterState.tasks.find(
      (task) => !beforeTaskIds.has(task.id),
    );
    if (!created) return;
    updateTask(created.id, {
      linkedNoteId: active.id,
      notes: `Erstellt aus Notiz: ${active.title}`,
    });
  }, [active, addTask, updateTask]);

  const convertNoteToReminder = useCallback(() => {
    if (!active) return;
    const reminderAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    addRem({
      title: active.title || "Note Reminder",
      msg: draftContentRef.current.slice(0, 220),
      datetime: reminderAt,
      repeat: "none",
      linkedNoteId: active.id,
    });
  }, [active, addRem]);

  const createLinkedTaskFromMagic = useCallback(
    (content: string) => {
      if (!active) return;
      const payload = parseNotesTaskMagic(content);
      if (payload.linkedTaskId) return;

      const beforeTaskIds = new Set(
        useApp.getState().tasks.map((task) => task.id),
      );
      addTask(payload.title, payload.status, payload.desc, payload.priority);

      const created = useApp
        .getState()
        .tasks.find((task) => !beforeTaskIds.has(task.id));
      if (!created) return;

      updateTask(created.id, {
        deadline: payload.deadline?.trim() || undefined,
        linkedNoteId: active.id,
        notes: `Erstellt aus Notes Magic: ${active.title || "Untitled"}`,
        tags: Array.from(new Set([...(created.tags || []), "notes"])),
      });

      const nextBlock = serializeNotesTaskMagic({
        ...payload,
        linkedTaskId: created.id,
      });
      const nextContent = replaceNotesMagicFenceContent(
        draftContentRef.current,
        "nexus-task",
        content,
        nextBlock,
      );
      if (nextContent !== draftContentRef.current) {
        handleChange(nextContent);
      }
    },
    [active, addTask, handleChange, updateTask],
  );

  const createLinkedReminderFromMagic = useCallback(
    (content: string) => {
      if (!active) return;
      const payload = parseNotesReminderMagic(content);
      if (payload.linkedReminderId) return;

      const beforeReminderIds = new Set(
        useApp.getState().reminders.map((reminder) => reminder.id),
      );
      const datetime = resolveReminderDatetime(payload.datetime);

      addRem({
        title: payload.title,
        msg: payload.msg,
        datetime,
        repeat: payload.repeat,
        linkedNoteId: active.id,
        linkedTaskId: payload.linkedTaskId,
      });

      const created = useApp
        .getState()
        .reminders.find((reminder) => !beforeReminderIds.has(reminder.id));
      if (!created) return;

      const nextBlock = serializeNotesReminderMagic({
        ...payload,
        datetime: created.datetime,
        linkedReminderId: created.id,
      });
      const nextContent = replaceNotesMagicFenceContent(
        draftContentRef.current,
        "nexus-reminder",
        content,
        nextBlock,
      );
      if (nextContent !== draftContentRef.current) {
        handleChange(nextContent);
      }
    },
    [active, addRem, handleChange],
  );

  const convertNoteToCanvas = useCallback(() => {
    if (!active) return;
    const beforeCanvases = new Set(
      useCanvas.getState().canvases.map((canvas) => canvas.id),
    );
    addCanvas(`${active.title || "Notiz"} Canvas`);
    const stateAfterCanvas = useCanvas.getState();
    const createdCanvas = stateAfterCanvas.canvases.find(
      (canvas) => !beforeCanvases.has(canvas.id),
    );
    if (!createdCanvas) return;
    const captureNewNode = (
      type: "note" | "markdown",
      x: number,
      y: number,
    ) => {
      const beforeNodeIds = new Set(
        (useCanvas.getState().getActiveCanvas()?.nodes || []).map(
          (node) => node.id,
        ),
      );
      useCanvas.getState().addNode(type, x, y);
      const createdNode = (
        useCanvas.getState().getActiveCanvas()?.nodes || []
      ).find((node) => !beforeNodeIds.has(node.id));
      return createdNode?.id || null;
    };
    const noteNodeId = captureNewNode("note", 140, 120);
    if (noteNodeId) {
      useCanvas.getState().updateNode(noteNodeId, {
        title: active.title || "Notiz",
        linkedNoteId: active.id,
        content: draftContentRef.current.slice(0, 1200),
      });
    }
    const markdownNodeId = captureNewNode("markdown", 560, 120);
    if (markdownNodeId) {
      useCanvas.getState().updateNode(markdownNodeId, {
        title: `Kontext: ${active.title || "Notiz"}`,
        linkedNoteId: active.id,
        content: draftContentRef.current,
      });
    }
  }, [active, addCanvas]);

  useEffect(() => {
    if (!showQuickSwitch) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isQuickSwitchInput = target === quickSwitchInputRef.current;
      if (isEditableTarget(target) && !isQuickSwitchInput) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeQuickSwitch();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setQuickSwitchCursor((cursor) => {
          if (quickSwitchResults.length === 0) return 0;
          return (cursor + 1) % quickSwitchResults.length;
        });
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setQuickSwitchCursor((cursor) => {
          if (quickSwitchResults.length === 0) return 0;
          return (
            (cursor - 1 + quickSwitchResults.length) % quickSwitchResults.length
          );
        });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selected = quickSwitchResults[quickSwitchCursor];
        if (!selected) return;
        setNote(selected.note.id);
        closeQuickSwitch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    closeQuickSwitch,
    quickSwitchCursor,
    quickSwitchResults,
    setNote,
    showQuickSwitch,
  ]);

  const handleApplySettings = () => {
    t.setNotes({
      fontSize: localSettings.fontSize,
      fontFamily: localSettings.fontFamily,
      lineHeight: localSettings.lineHeight,
      mode: localSettings.mode,
    });
    t.setEditor({
      autosave: localSettings.autosave,
      autosaveInterval: localSettings.autosaveInterval,
      wordWrap: localSettings.wordWrap,
      lineNumbers: localSettings.lineNumbers,
      minimap: localSettings.minimap,
      cursorAnimation: localSettings.cursorAnimation,
      tabSize: localSettings.tabSize,
    });
    t.setVisual({
      compactMode: localSettings.compactMode,
      panelRadius: localSettings.panelRadius,
      shadowDepth: localSettings.shadowDepth,
      spacingDensity: localSettings.spacingDensity,
    });
    setShowSettings(false);
  };

  const modeLabel =
    mode === "edit" ? "Edit" : mode === "split" ? "Split" : "Preview";
  const saveStatusLabel = draftDirty
    ? "Ungespeichert"
    : lastSavedAt
      ? `Gespeichert ${lastSavedAt}`
      : "Bereit";
  const autosaveLabel = t.editor.autosave
    ? `Auto ${Math.round(t.editor.autosaveInterval / 1000)}s`
    : "Auto aus";

  // Small formatting button
  const FmtBtn = ({
    icon: Icon,
    tooltip,
    action,
  }: {
    icon: any;
    tooltip: string;
    action: () => void;
  }) => (
    <InteractiveIconButton
      type="button"
      motionId={`notes-fmt-${tooltip.replace(/\s+/g, "-").toLowerCase()}`}
      onClick={action}
      onMouseDown={(event) => {
        event.preventDefault();
        rememberEditorSelection();
      }}
      title={tooltip}
      idleOpacity={0.68}
      radius={999}
      style={{
        padding: "4px",
        color: t.accent,
      }}
    >
      <Icon size={13} />
    </InteractiveIconButton>
  );

  // ReactMarkdown components — passed accent via closure
  const magicPlanningActions = useMemo<NotesMagicPlanningActions>(
    () => ({
      tasks,
      reminders,
      onCreateTask: createLinkedTaskFromMagic,
      onCreateReminder: createLinkedReminderFromMagic,
    }),
    [createLinkedReminderFromMagic, createLinkedTaskFromMagic, reminders, tasks],
  );

  const mdComponents = useMemo(
    () => ({
      code({ className, children }: any) {
        // In react-markdown v9, fenced code blocks get className='language-xxx'
        if (className?.startsWith("language-")) {
          const lang = className.replace("language-", "");
          const raw = Array.isArray(children)
            ? children.join("")
            : String(children ?? "");
          const content = raw.replace(/\n$/, "");
          const renderedBlock = (
            <NexusCodeBlock
              className={className}
              accent={t.accent}
              planning={magicPlanningActions}
            >
              {children}
            </NexusCodeBlock>
          );
          if (lang.startsWith("nexus-")) {
            const editBlock = () => focusMagicFenceInEditor(lang, content);
            return (
              <div
                className="nx-notes-magic-preview"
                role="button"
                tabIndex={0}
                title="Magic Element bearbeiten"
                onClick={(event) => {
                  const target = event.target as HTMLElement | null;
                  if (
                    target?.closest?.(
                      "button, a, input, textarea, select, summary",
                    )
                  ) {
                    return;
                  }
                  editBlock();
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  editBlock();
                }}
                style={{
                  position: "relative",
                  outline: "none",
                  borderRadius: 12,
                }}
              >
                <button
                  type="button"
                  className="nx-notes-magic-edit"
                  aria-label="Magic Element bearbeiten"
                  onClick={(event) => {
                    event.stopPropagation();
                    editBlock();
                  }}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    zIndex: 2,
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    border: `1px solid rgba(${rgb},0.28)`,
                    background: "rgba(10,12,22,0.72)",
                    color: t.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    opacity: 0.9,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "0 8px",
                  }}
                >
                  <Edit3 size={11} />
                  Edit
                </button>
                {renderedBlock}
              </div>
            );
          }
          return renderedBlock;
        }
        return <NexusInlineCode accent={t.accent}>{children}</NexusInlineCode>;
      },
    }),
    [focusMagicFenceInEditor, magicPlanningActions, rgb, t.accent],
  );

  return (
    <div
      className="nx-notes-v6 nx-release-view flex h-full gap-2 p-2 relative"
      style={{ minHeight: 0 }}
    >
      {/* ── SIDEBAR ── */}
      {!focusMode && (
        <Glass
          className="nx-notes-sidebar flex flex-col shrink-0"
          style={{ width: 302, overflow: "hidden", minHeight: 0 }}
        >
          {/* Header */}
          <div
            className="nx-notes-sidebar-header flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
              Notes
            </span>
            <div className="flex gap-1.5" style={{ position: "relative" }}>
              <InteractiveActionButton
                onClick={() => setShowSearch(!showSearch)}
                title="Suchen"
                motionId="notes-sidebar-toggle-search"
                selected={showSearch}
                areaHint={46}
                radius={7}
                style={{
                  padding: "5px",
                  borderRadius: 7,
                  border: "none",
                  background: showSearch ? `rgba(${rgb},0.12)` : "transparent",
                  color: showSearch ? t.accent : "inherit",
                  display: "flex",
                }}
              >
                <Search size={14} />
              </InteractiveActionButton>
              <InteractiveActionButton
                onClick={addNote}
                title="Neue Notiz"
                motionId="notes-sidebar-add"
                areaHint={46}
                radius={7}
                style={{
                  padding: "5px",
                  borderRadius: 7,
                  border: "none",
                  background: `rgba(${rgb},0.16)`,
                  color: t.accent,
                  display: "flex",
                }}
              >
                <Plus size={14} />
              </InteractiveActionButton>
              <InteractiveActionButton
                onClick={() => setNotesHeaderMenuOpen((open) => !open)}
                title="Mehr"
                motionId="notes-sidebar-menu"
                selected={notesHeaderMenuOpen}
                areaHint={46}
                radius={7}
                style={{
                  padding: "5px",
                  borderRadius: 7,
                  border: "none",
                  background: notesHeaderMenuOpen
                    ? `rgba(${rgb},0.12)`
                    : "transparent",
                  color: notesHeaderMenuOpen ? t.accent : "inherit",
                  display: "flex",
                }}
              >
                <MoreHorizontal size={14} />
              </InteractiveActionButton>
              {notesHeaderMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 40,
                    minWidth: 170,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(17,20,31,0.96)",
                    backdropFilter: "blur(12px)",
                    padding: 6,
                    boxShadow: "0 14px 34px rgba(0,0,0,0.35)",
                  }}
                >
                  <InteractiveActionButton
                    onClick={() => {
                      document.getElementById(NOTES_IMPORT_INPUT_ID)?.click();
                      setNotesHeaderMenuOpen(false);
                    }}
                    motionId="notes-import-markdown"
                    className="nx-menu-item"
                    areaHint={72}
                    radius={8}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    <Upload size={12} /> Markdown importieren
                  </InteractiveActionButton>
                  <InteractiveActionButton
                    onClick={() => {
                      openQuickSwitch();
                      setNotesHeaderMenuOpen(false);
                    }}
                    motionId="notes-quick-switch"
                    className="nx-menu-item"
                    areaHint={72}
                    radius={8}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    <Search size={12} /> Quick Switch (Ctrl/Cmd+P)
                  </InteractiveActionButton>
                  <InteractiveActionButton
                    onClick={() => {
                      setShowSettings(true);
                      setNotesHeaderMenuOpen(false);
                    }}
                    motionId="notes-open-settings"
                    className="nx-menu-item"
                    areaHint={72}
                    radius={8}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    <Settings size={12} /> Einstellungen
                  </InteractiveActionButton>
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.08)",
                      margin: "6px 4px",
                    }}
                  />
                  <InteractiveActionButton
                    onClick={() => {
                      convertNoteToTask();
                      setNotesHeaderMenuOpen(false);
                    }}
                    motionId="notes-convert-task"
                    className="nx-menu-item"
                    areaHint={72}
                    radius={8}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    <CheckSquare2 size={12} /> Als Task erstellen
                  </InteractiveActionButton>
                  <InteractiveActionButton
                    onClick={() => {
                      convertNoteToReminder();
                      setNotesHeaderMenuOpen(false);
                    }}
                    motionId="notes-convert-reminder"
                    className="nx-menu-item"
                    areaHint={72}
                    radius={8}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    <AlarmClock size={12} /> Als Reminder planen
                  </InteractiveActionButton>
                  <InteractiveActionButton
                    onClick={() => {
                      convertNoteToCanvas();
                      setNotesHeaderMenuOpen(false);
                    }}
                    motionId="notes-convert-canvas"
                    className="nx-menu-item"
                    areaHint={72}
                    radius={8}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    <Orbit size={12} /> In Canvas abbilden
                  </InteractiveActionButton>
                </div>
              ) : null}
            </div>
          </div>

          {showSearch && (
            <div
              className="nx-notes-sidebar-search px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <input
                autoFocus
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  outline: "none",
                  color: "inherit",
                }}
              />
            </div>
          )}

          {allTags.length > 0 && (
            <div
              className="nx-notes-sidebar-tags px-4 py-3 shrink-0 flex flex-wrap gap-1.5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {allTags.slice(0, 8).map((tag) => (
                <InteractiveActionButton
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  motionId={`notes-tag-filter-${tag}`}
                  selected={tagFilter === tag}
                  areaHint={52}
                  radius={20}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontSize: 10,
                    border: "none",
                    cursor: "pointer",
                    background:
                      tagFilter === tag
                        ? `rgba(${rgb},0.25)`
                        : "rgba(255,255,255,0.06)",
                    color: tagFilter === tag ? t.accent : "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  #{tag}
                </InteractiveActionButton>
              ))}
            </div>
          )}

          <div
            className="nx-notes-sidebar-sort px-4 py-3 shrink-0 flex gap-1.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {(["updated", "title", "created"] as const).map((s) => (
              <InteractiveActionButton
                key={s}
                onClick={() => setSortBy(s)}
                motionId={`notes-sort-${s}`}
                selected={sortBy === s}
                areaHint={52}
                radius={6}
                style={{
                  padding: "4px 9px",
                  borderRadius: 7,
                  fontSize: 10.5,
                  border: "none",
                  cursor: "pointer",
                  background:
                    sortBy === s ? `rgba(${rgb},0.15)` : "transparent",
                  color: sortBy === s ? t.accent : "inherit",
                  transition: "all 0.15s",
                }}
              >
                {s === "updated" ? "Aktuell" : s === "title" ? "A-Z" : "Neu"}
              </InteractiveActionButton>
            ))}
          </div>

          {/* Scrollable list — overflow-y:auto always shows scrollbar when needed */}
          <div
            className="nx-notes-list"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "12px",
              minHeight: 0,
            }}
          >
            {filteredNotes.map((n) => (
              <div
                key={n.id}
                onClick={() => setNote(n.id)}
                role="button"
                tabIndex={0}
                className="group nx-surface-row nx-notes-list-row"
                data-active={n.id === activeNoteId ? "true" : "false"}
                style={{
                  padding: "13px 14px",
                  borderRadius: 14,
                  cursor: "pointer",
                  marginBottom: 9,
                  background:
                    n.id === activeNoteId
                      ? "rgba(255,255,255,0.1)"
                      : "transparent",
                  borderLeft: `2px solid ${n.id === activeNoteId ? t.accent : "transparent"}`,
                  position: "relative",
                  ["--nx-row-hover-bg" as any]: "rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="nx-notes-list-excerpt"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    fontWeight: 650,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {n.dirty && (
                      <span
                        style={{ color: t.accent, fontSize: 7, flexShrink: 0 }}
                      >
                        ●
                      </span>
                    )}
                    {n.title}
                  </span>
                  {n.pinned && (
                    <Pin size={9} style={{ color: "#FFCC00", flexShrink: 0 }} />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.54,
                    marginTop: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {n.content.replace(/[#*`]/g, "").slice(0, 64)}…
                </div>
                {n.tags.length > 0 && (
                  <div
                    className="nx-notes-list-tags"
                    style={{
                      display: "flex",
                      gap: 5,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {n.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9.5,
                          padding: "2px 7px",
                          borderRadius: 10,
                          background: `rgba(${rgb},0.12)`,
                          color: t.accent,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    display: "flex",
                    gap: 2,
                    opacity: 0,
                    transition: "opacity 0.15s",
                  }}
                  className="group-hover:opacity-100"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNote(n.id, { pinned: !n.pinned });
                    }}
                    className="nx-interactive nx-bounce-target"
                    style={{
                      padding: 3,
                      borderRadius: 5,
                      border: "none",
                      background: "rgba(255,255,255,0.1)",
                      display: "flex",
                    }}
                  >
                    <Pin
                      size={9}
                      style={{ color: n.pinned ? "#FFCC00" : undefined }}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      delNote(n.id);
                    }}
                    className="nx-interactive nx-bounce-target"
                    style={{
                      padding: 3,
                      borderRadius: 5,
                      border: "none",
                      background: "rgba(255,69,58,0.15)",
                      color: "#FF453A",
                      display: "flex",
                    }}
                  >
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.35,
                  textAlign: "center",
                  padding: "24px 0",
                }}
              >
                {searchQuery ? "Keine Ergebnisse" : "Keine Notizen"}
              </div>
            )}
          </div>
        </Glass>
      )}

      {/* ── MAIN PANEL ── */}
      {active ? (
        <div
          className="nx-notes-main flex-1 flex flex-col gap-2"
          style={{ minHeight: 0, overflow: "visible" }}
        >
          {/* Compact workbar */}
          <Glass className="nx-notes-workbar nx-notes-editor-header nx-notes-unified-status-action shrink-0">
            <div className="nx-notes-workbar-main">
              <input
                className="nx-notes-title-input flex-1 bg-transparent outline-none font-semibold"
                style={{ fontSize: 14, minWidth: 0 }}
                value={active.title}
                onChange={(e) => updateNote(active.id, { title: e.target.value })}
                placeholder="Notiztitel..."
              />
              <div className="nx-notes-editor-meta" aria-live="polite">
                <span
                  data-state={draftDirty ? "dirty" : "saved"}
                  title={saveStatusLabel}
                >
                  {saveStatusLabel}
                </span>
                <span>{autosaveLabel}</span>
                <span>{modeLabel}</span>
                <span title={`Erstellt ${fmtDt(new Date(active.created))}`}>
                  {fmtDt(new Date(active.created))}
                </span>
              </div>
              <div className="nx-notes-mode-actions flex gap-0.5 items-center shrink-0">
              {/* View mode */}
              {(["edit", "split", "preview"] as const).map((m) => (
                <InteractiveActionButton
                  key={m}
                  onClick={() => setMode(m)}
                  title={
                    m === "edit"
                      ? "Nur Editor"
                      : m === "split"
                        ? "Editor und Vorschau"
                        : "Nur Vorschau"
                  }
                  motionId={`notes-mode-${m}`}
                  selected={mode === m}
                  areaHint={54}
                  radius={7}
                  style={{
                    top: "3px",
                    padding: "4px 8px",
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    background:
                      mode === m ? `rgba(${rgb},0.18)` : "transparent",
                    color: mode === m ? t.accent : "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {m === "edit" ? (
                    <Edit3 size={13} />
                  ) : m === "preview" ? (
                    <Eye size={13} />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700 }}>SPLIT</span>
                  )}
                </InteractiveActionButton>
              ))}
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: "rgba(255,255,255,0.1)",
                  margin: "0 4px",
                }}
              />
              {[
                { icon: RotateCcw, tip: "Undo (Ctrl+Z)", action: handleUndo },
                {
                  icon: RotateCcw,
                  tip: "Redo (Ctrl+Y)",
                  action: handleRedo,
                  flip: true,
                },
                {
                  icon: Search,
                  tip: "Quick Switch (Ctrl/Cmd+P)",
                  action: openQuickSwitch,
                },
                {
                  icon: Copy,
                  tip: "Kopieren",
                  action: () => navigator.clipboard.writeText(draftContent),
                },
                { icon: Download, tip: "Download .md", action: saveAsFile },
                {
                  icon: Save,
                  tip: "Speichern (Ctrl+S)",
                  action: saveActiveNow,
                  accent: draftDirty,
                },
              ].map(
                ({ icon: Icon, tip, action, flip, accent: useAccent }: any) => (
                  <InteractiveActionButton
                    key={tip}
                    onClick={action}
                    title={tip}
                    motionId={`notes-top-action-${tip.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                    selected={Boolean(useAccent)}
                    areaHint={44}
                    radius={7}
                    style={{
                      padding: "5px",
                      borderRadius: 7,
                      border: "none",
                      background: "transparent",
                      color: useAccent ? t.accent : "inherit",
                      display: "flex",
                    }}
                  >
                    <Icon
                      size={13}
                      style={{ transform: flip ? "scaleX(-1)" : undefined }}
                    />
                  </InteractiveActionButton>
                ),
              )}
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: "rgba(255,255,255,0.1)",
                  margin: "0 4px",
                }}
              />
              <InteractiveActionButton
                onClick={() => setFocusMode(!focusMode)}
                title="Focus Mode"
                motionId="notes-focus-mode"
                selected={focusMode}
                areaHint={46}
                radius={7}
                style={{
                  padding: "5px",
                  borderRadius: 7,
                  border: "none",
                  background: focusMode ? `rgba(${rgb},0.15)` : "transparent",
                  color: focusMode ? t.accent : "inherit",
                  display: "flex",
                }}
              >
                {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </InteractiveActionButton>
              </div>
            </div>

            <div className="nx-notes-workbar-tools">
          <div className="nx-notes-command-strip shrink-0">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "nowrap",
              }}
            >
              {[
                { label: "Words", val: noteStats.words },
                { label: "Chars", val: stats.chars },
                { label: "Lines", val: stats.lines },
                { label: "Read", val: `${noteStats.readMins}m` },
                { label: "Links", val: noteStats.links },
                { label: "Tasks", val: noteStats.tasks },
              ].map((entry) => (
                <span key={entry.label} className="nx-notes-stat-pill">
                  <strong style={{ fontWeight: 800 }}>{entry.val}</strong>{" "}
                  <span style={{ opacity: 0.6 }}>{entry.label}</span>
                </span>
              ))}
              <div className="nx-notes-strip-actions">
                <InteractiveActionButton
                  onClick={openQuickSwitch}
                  motionId="notes-workflow-switch"
                  areaHint={62}
                  radius={999}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: `1px solid rgba(${rgb},0.22)`,
                    background: `rgba(${rgb},0.1)`,
                    color: t.accent,
                    fontSize: 10,
                    fontWeight: 760,
                    cursor: "pointer",
                  }}
                >
                  <ArrowUpRight size={11} /> Jump
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => insertWorkflowTemplate("daily")}
                  motionId="notes-workflow-daily"
                  areaHint={56}
                  radius={999}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: `1px solid rgba(${rgb},0.2)`,
                    background: `rgba(${rgb},0.08)`,
                    color: t.accent,
                    fontSize: 10,
                    fontWeight: 760,
                    cursor: "pointer",
                  }}
                >
                  Daily
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={convertNoteToTask}
                  motionId="notes-workflow-task"
                  areaHint={62}
                  radius={999}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.035)",
                    color: "inherit",
                    fontSize: 10,
                    fontWeight: 760,
                    cursor: "pointer",
                  }}
                >
                  <CheckSquare2 size={11} /> Task
                </InteractiveActionButton>
              </div>
            </div>
            {(activeHeadings.length > 0 ||
              activeOutgoing.length > 0 ||
              activeIncoming.length > 0 ||
              activeUnresolved.length > 0 ||
              activeRelatedNotes.length > 0) && (
              <div className="nx-notes-context-strip">
                {activeHeadings.slice(0, 4).map((heading) => (
                  <InteractiveActionButton
                    key={heading.id}
                    onClick={() => jumpToHeading(heading.index)}
                    motionId={`notes-heading-${heading.id}`}
                    areaHint={68}
                    radius={999}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.04)",
                      fontSize: 10,
                      cursor: "pointer",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`Zu Abschnitt springen: ${heading.text}`}
                  >
                    <ListTree size={10} /> {heading.text}
                  </InteractiveActionButton>
                ))}
                {activeOutgoing.slice(0, 4).map((edge) => (
                  <InteractiveActionButton
                    key={`out-${edge.sourceId}-${edge.targetId}-${edge.targetTitle}`}
                    onClick={() => edge.targetId && setNote(edge.targetId)}
                    motionId={`notes-outgoing-${edge.targetId || edge.targetTitle}`}
                    areaHint={68}
                    radius={999}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: `1px solid rgba(${rgb},0.28)`,
                      background: `rgba(${rgb},0.1)`,
                      color: t.accent,
                      fontSize: 10,
                      cursor: "pointer",
                      maxWidth: 170,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`Verlinkte Notiz öffnen: ${edge.targetTitle}`}
                  >
                    ↗ {edge.targetTitle}
                  </InteractiveActionButton>
                ))}
                {activeIncoming.slice(0, 4).map((edge) => (
                  <InteractiveActionButton
                    key={`in-${edge.sourceId}-${edge.targetTitle}`}
                    onClick={() => setNote(edge.sourceId)}
                    motionId={`notes-backlink-${edge.sourceId}`}
                    areaHint={68}
                    radius={999}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      fontSize: 10,
                      cursor: "pointer",
                      maxWidth: 170,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`Backlink öffnen: ${edge.sourceTitle}`}
                  >
                    ← {edge.sourceTitle}
                  </InteractiveActionButton>
                ))}
                {activeRelatedNotes.slice(0, 3).map((related) => (
                  <InteractiveActionButton
                    key={`rel-${related.id}`}
                    onClick={() => setNote(related.id)}
                    motionId={`notes-related-${related.id}`}
                    areaHint={68}
                    radius={999}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      fontSize: 10,
                      cursor: "pointer",
                      maxWidth: 170,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`Verwandte Notiz öffnen: ${related.title}`}
                  >
                    ≈ {related.title}
                  </InteractiveActionButton>
                ))}
                {activeUnresolved.slice(0, 3).map((edge) => (
                  <InteractiveActionButton
                    key={`missing-${edge.targetTitle}`}
                    onClick={() => insertWikilink(edge.targetTitle)}
                    motionId={`notes-unresolved-${edge.targetTitle}`}
                    areaHint={68}
                    radius={999}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 999,
                      border: "1px dashed rgba(255,159,10,0.45)",
                      background: "rgba(255,159,10,0.1)",
                      color: "#FF9F0A",
                      fontSize: 10,
                      cursor: "pointer",
                      maxWidth: 170,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`Nicht aufgelöster Wikilink: ${edge.targetTitle}. Klicken um einzufügen.`}
                  >
                    ? {edge.targetTitle}
                  </InteractiveActionButton>
                ))}
              </div>
            )}
          </div>

          {/* Formatting toolbar */}
          {(mode === "edit" || mode === "split") && (
            <div
              className="nx-notes-format-toolbar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "0 4px",
                flexWrap: "wrap",
                opacity: 1,
              }}
            >
              <FmtBtn
                icon={Heading}
                tooltip="H2"
                action={() => insertFormat("\n## ", "", "Überschrift")}
              />
              <FmtBtn
                icon={Bold}
                tooltip="Fett (Ctrl+B)"
                action={() => insertFormat("**", "**", "fett")}
              />
              <FmtBtn
                icon={Italic}
                tooltip="Kursiv (Ctrl+I)"
                action={() => insertFormat("*", "*", "kursiv")}
              />
              <FmtBtn
                icon={Strikethrough}
                tooltip="Durchgestrichen"
                action={() => insertFormat("~~", "~~", "text")}
              />
              <FmtBtn
                icon={Code}
                tooltip="Inline Code"
                action={() => insertFormat("`", "`", "code")}
              />
              <FmtBtn
                icon={Link}
                tooltip="Link (Ctrl+K)"
                action={() => insertFormat("[", "](url)", "Text")}
              />
              <FmtBtn
                icon={Quote}
                tooltip="Zitat"
                action={() => insertFormat("\n> ", "", "Zitat")}
              />
              <FmtBtn
                icon={List}
                tooltip="Liste"
                action={() => insertFormat("\n- ", "", "Eintrag")}
              />
              <FmtBtn
                icon={ListOrdered}
                tooltip="Num. Liste"
                action={() => insertFormat("\n1. ", "", "Eintrag")}
              />
              <FmtBtn
                icon={Table}
                tooltip="Tabelle"
                action={() =>
                  insertFormat(
                    "\n| Kopf | Kopf |\n| --- | --- |\n| Zelle | Zelle |\n",
                  )
                }
              />
              <FmtBtn
                icon={Minus}
                tooltip="Trennlinie"
                action={() => insertFormat("\n---\n", "")}
              />
              <div data-notes-popover-trigger="blocks" style={{ position: "relative" }}>
                <InteractiveActionButton
                  type="button"
                  onClick={() => {
                    setNotesBlocksMenuOpen((open) => !open);
                    setNotesEmojiMenuOpen(false);
                    setShowMagic(false);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    rememberEditorSelection();
                  }}
                  motionId="notes-blocks-menu"
                  selected={notesBlocksMenuOpen}
                  areaHint={64}
                  radius={999}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: `1px solid rgba(${rgb},0.2)`,
                    background: notesBlocksMenuOpen
                      ? `rgba(${rgb},0.12)`
                      : "rgba(255,255,255,0.035)",
                    color: notesBlocksMenuOpen ? t.accent : "inherit",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    fontWeight: 760,
                  }}
                >
                  <Sparkles size={11} /> Blocks
                </InteractiveActionButton>
                {notesBlocksMenuOpen && typeof document !== "undefined"
                  ? createPortal(
                      <div className="nx-notes-blocks-menu" role="menu">
                    {[
                      {
                        icon: Bell,
                        label: "Callout",
                        action: () =>
                          insertFormat(
                            "\n```nexus-callout\ninfo | Hinweis\nKurzinfo oder Entscheidung notieren.\n```\n",
                          ),
                      },
                      {
                        icon: Zap,
                        label: "Kanban",
                        action: () =>
                          insertFormat(
                            "\n```nexus-kanban\nBacklog | Aufgabe sammeln\nDoing | Umsetzung\nReview | QA/Abnahme\nDone | Fertig\n```\n",
                          ),
                      },
                      {
                        icon: CheckSquare2,
                        label: "Task",
                        action: () =>
                          insertFormat(
                            "\n```nexus-task\nNeue Task | todo | mid | \nBeschreibung oder Done-Kriterium...\n```\n",
                          ),
                      },
                      {
                        icon: AlarmClock,
                        label: "Reminder",
                        action: () =>
                          insertFormat(
                            "\n```nexus-reminder\nFollow-up | +1h | none\nWoran soll Nexus erinnern?\n```\n",
                          ),
                      },
                      {
                        icon: Calendar,
                        label: "Timeline",
                        action: () =>
                          insertFormat(
                            "\n```nexus-timeline\nHeute | Kickoff\nMorgen | Umsetzung\nDiese Woche | Review\n```\n",
                          ),
                      },
                      {
                        icon: CreditCard,
                        label: "Card",
                        action: () =>
                          insertFormat(
                            "\n```nexus-card\nhttps://images.unsplash.com/photo-1618005182384?w=600 | Titel | Kurze Beschreibung\n```\n",
                          ),
                      },
                    ].map((entry) => {
                      const Icon = entry.icon;
                      return (
                        <InteractiveActionButton
                          type="button"
                          key={entry.label}
                          onClick={() => {
                            entry.action();
                            setNotesBlocksMenuOpen(false);
                          }}
                          motionId={`notes-block-${entry.label.toLowerCase()}`}
                          areaHint={64}
                          radius={9}
                          style={{
                            width: "100%",
                            border: "none",
                            borderRadius: 9,
                            background: "transparent",
                            color: "inherit",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <Icon size={12} /> {entry.label}
                        </InteractiveActionButton>
                      );
                    })}
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
              <FmtBtn
                icon={ChevronDown}
                tooltip="Details/Toggle"
                action={() =>
                  insertFormat(
                    "\n```nexus-details\nMehr anzeigen\nDetails hier ergaenzen...\n```\n",
                  )
                }
              />
              <div data-notes-popover-trigger="emoji" style={{ position: "relative" }}>
                <InteractiveActionButton
                  type="button"
                  onClick={handleEmojiMenuOpen}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    rememberEditorSelection();
                  }}
                  motionId="notes-emoji-menu"
                  selected={notesEmojiMenuOpen}
                  areaHint={64}
                  radius={999}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: `1px solid rgba(${rgb},0.2)`,
                    background: notesEmojiMenuOpen
                      ? `rgba(${rgb},0.14)`
                      : "rgba(255,255,255,0.035)",
                    color: notesEmojiMenuOpen ? t.accent : "inherit",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 10,
                    fontWeight: 760,
                  }}
                  title="Emoji Picker"
                >
                  <Smile size={11} /> Emojis
                </InteractiveActionButton>
                {notesEmojiMenuOpen && typeof document !== "undefined"
                  ? createPortal(
                      <div className="nx-notes-emoji-menu" role="dialog" aria-label="Emoji Library">
                    <div className="nx-notes-emoji-menu-head">
                      <div>
                        <strong>Emoji Library</strong>
                        <span>
                          {emojiResults.length} sichtbar /{" "}
                          {emojiGroups.length} Kategorien
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotesEmojiMenuOpen(false)}
                        aria-label="Emoji-Menue schliessen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="nx-notes-emoji-search">
                      <Search size={11} />
                      <input
                        value={emojiQuery}
                        onChange={(event) => setEmojiQuery(event.target.value)}
                        placeholder="Suche: rakete, todo, herz, bug, money..."
                      />
                    </div>
                    <div className="nx-notes-emoji-cats">
                      {emojiGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          data-active={
                            emojiCategory === group.id ? "true" : "false"
                          }
                          onClick={() => {
                            setEmojiCategory(group.id);
                            setEmojiQuery("");
                          }}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                    <div className="nx-notes-emoji-grid">
                      {emojiResults.map((emoji) => (
                        <button
                          key={`${emojiCategory}-${emoji}`}
                          type="button"
                          onClick={() => insertPlainText(emoji)}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                      </div>,
                      document.body,
                    )
                  : null}
              </div>

              <div
                style={{
                  width: 1,
                  height: 14,
                  background: "rgba(255,255,255,0.1)",
                  margin: "0 4px",
                }}
              />

              {/* ✦ Magic Button */}
              <div style={{ position: "relative" }}>
                <InteractiveActionButton
                  onClick={handleMagicOpen}
                  motionId="notes-open-magic"
                  selected={showMagic}
                  areaHint={64}
                  radius={999}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 999,
                    border: `1px solid ${t.accent}${showMagic ? "50" : "26"}`,
                    background: showMagic
                      ? `linear-gradient(135deg, ${t.accent}24, ${t.accent2}22)`
                      : `linear-gradient(135deg, ${t.accent}12, ${t.accent2}10)`,
                    color: t.accent,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: showMagic ? `0 0 12px ${t.accent}22` : "none",
                    transition: "all 0.18s ease",
                  }}
                >
                  <Wand2
                    size={11}
                    style={{
                      transform: showMagic
                        ? "rotate(10deg) scale(1.08)"
                        : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                  Magic
                </InteractiveActionButton>
              </div>

              <div style={{ flex: 1 }} />

              {/* Tags */}
              <div className="nx-notes-toolbar-tags" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Hash size={10} style={{ opacity: 0.35 }} />
                {active.tags.map((tag) => (
                  <InteractiveActionButton
                    key={tag}
                    onClick={() =>
                      updateNote(active.id, {
                        tags: active.tags.filter((t) => t !== tag),
                      })
                    }
                    motionId={`notes-remove-tag-${tag}`}
                    areaHint={46}
                    radius={20}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 20,
                      cursor: "pointer",
                      border: "none",
                      background: `rgba(${rgb},0.12)`,
                      color: t.accent,
                      transition: "opacity 0.15s",
                    }}
                    title="Klicken zum Entfernen"
                  >
                    {tag} ×
                  </InteractiveActionButton>
                ))}
                {editingTags ? (
                  <input
                    autoFocus
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTag.trim()) {
                        if (!active.tags.includes(newTag.trim()))
                          updateNote(active.id, {
                            tags: [...active.tags, newTag.trim()],
                          });
                        setNewTag("");
                        setEditingTags(false);
                      }
                      if (e.key === "Escape") {
                        setEditingTags(false);
                        setNewTag("");
                      }
                    }}
                    onBlur={() => {
                      setEditingTags(false);
                      setNewTag("");
                    }}
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 20,
                      width: 70,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      outline: "none",
                      color: "inherit",
                    }}
                    placeholder="tag..."
                  />
                ) : (
                  <InteractiveActionButton
                    onClick={() => setEditingTags(true)}
                    motionId="notes-add-tag"
                    className="nx-icon-fade"
                    areaHint={40}
                    radius={14}
                    style={{
                      fontSize: 10,
                      ["--nx-idle-opacity" as any]: 0.4,
                      background: "none",
                      border: "none",
                      color: "inherit",
                    }}
                  >
                    + Tag
                  </InteractiveActionButton>
                )}
              </div>
            </div>
          )}
            </div>
          </Glass>

          {/* ── EDITOR / PREVIEW ── */}

          <div
            className="nx-notes-editor-grid"
            style={{
              display: "flex",
              gap: 7,
              flex: 1,
              minHeight: 0,
              overflow: "visible",
              "--nx-notes-editor-flex":
                mode === "split" ? `0 0 ${splitEditorRatio}%` : undefined,
              "--nx-notes-preview-flex":
                mode === "split" ? `0 0 ${100 - splitEditorRatio}%` : undefined,
            } as React.CSSProperties}
          >
            {/* Editor */}
            {(mode === "edit" || mode === "split") && (
              <Glass
                className="nx-notes-editor-pane flex-1 flex flex-col"
                style={{
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                {t.editor.lineNumbers ? (
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="nx-notes-line-numbers"
                      style={{
                        flexShrink: 0,
                        paddingTop: 20,
                        paddingBottom: 20,
                        paddingLeft: 10,
                        paddingRight: 6,
                        textAlign: "right",
                        userSelect: "none",
                        fontSize: t.notes.fontSize - 1,
                        lineHeight: `${t.notes.lineHeight * t.notes.fontSize}px`,
                        fontFamily: "'Fira Code', monospace",
                        opacity: 0.18,
                        width: 36,
                        overflowY: "hidden",
                      }}
                    >
                      <pre
                        ref={lineNumbersRef}
                        style={{
                          margin: 0,
                          whiteSpace: "pre",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          lineHeight: "inherit",
                          willChange: "transform",
                        }}
                      >
                        {lineNumbersText}
                      </pre>
                    </div>
                    <textarea
                      ref={editorRef}
                      style={{
                        flex: 1,
                        background: "transparent",
                        resize: "none",
                        outline: "none",
                        padding: "16px 14px 16px 4px",
                        overflowY: "auto",
                        overflowX: "hidden",
                        minHeight: 0,
                        fontSize: t.notes.fontSize,
                        fontFamily: `"${t.notes.fontFamily}", ui-monospace, Menlo, monospace`,
                        lineHeight: t.notes.lineHeight,
                        tabSize: t.editor.tabSize,
                        whiteSpace: t.editor.wordWrap ? "pre-wrap" : "pre",
                        overflowWrap: t.editor.wordWrap
                          ? "break-word"
                          : "normal",
                        color: "inherit",
                        border: "none",
                      }}
                      value={draftContent}
                      onChange={(e) => handleChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onScroll={(e) => syncLineNumberScroll(e.currentTarget)}
                    />
                  </div>
                ) : (
                  <textarea
                    ref={editorRef}
                    style={{
                      flex: 1,
                      background: "transparent",
                      resize: "none",
                      outline: "none",
                      padding: 16,
                      overflowY: "auto",
                      overflowX: "hidden",
                      minHeight: 0,
                      fontSize: t.notes.fontSize,
                      fontFamily: `"${t.notes.fontFamily}", ui-monospace, Menlo, monospace`,
                      lineHeight: t.notes.lineHeight,
                      tabSize: t.editor.tabSize,
                      whiteSpace: t.editor.wordWrap ? "pre-wrap" : "pre",
                      overflowWrap: t.editor.wordWrap ? "break-word" : "normal",
                      color: "inherit",
                      border: "none",
                    }}
                    value={draftContent}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                )}
              </Glass>
            )}

            {mode === "split" && (
              <div
                className="nx-notes-split-resizer"
                role="separator"
                aria-label="Editor und Preview Breite anpassen"
                aria-orientation="vertical"
                title="Ziehen, um Editor und Preview breiter oder schmaler zu machen"
                onPointerDown={handleSplitResizePointerDown}
                onDoubleClick={() => setSplitEditorRatio(46)}
              >
                <span />
              </div>
            )}

            {/* Preview — always has a visible scrollbar */}
            {(mode === "preview" || mode === "split") && (
              <Glass
                className="nx-notes-preview-pane flex-1 flex flex-col"
                style={{
                  minHeight: 0,
                  overflow: "visible",
                  background: `linear-gradient(150deg, rgba(${rgb},0.32), rgba(${hexToRgb(t.accent2)},0.2) 58%, rgba(255,255,255,0.03))`,
                }}
                glow
                gradient
              >
                {/* The scrollable div is direct child of the Glass content wrapper (which is flex-col) */}
                <div
                  className="nx-notes-preview-scroll"
                  style={{
                    flex: 1,
                    overflowY: "scroll",
                    overflowX: "hidden",
                    padding: 16,
                    minHeight: 0,
                  }}
                >
                  <NexusMarkdown
                    content={deferredDraftContent}
                    components={mdComponents}
                  />
                </div>
              </Glass>
            )}
          </div>

          {/* Status bar */}
          <div
            className="nx-notes-status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "2px 8px",
              fontSize: 10,
              flexShrink: 0,
            }}
          >
            <span style={{ opacity: 0.44 }}>{stats.words} W</span>
            <span style={{ opacity: 0.44 }}>{stats.chars} Z</span>
            <span style={{ opacity: 0.44 }}>{stats.lines} L</span>
            <div className="nx-notes-status-tags">
              <Hash size={10} style={{ opacity: 0.45 }} />
              {active.tags.map((tag) => (
                <InteractiveActionButton
                  key={tag}
                  onClick={() =>
                    updateNote(active.id, {
                      tags: active.tags.filter((t) => t !== tag),
                    })
                  }
                  motionId={`notes-remove-tag-status-${tag}`}
                  areaHint={46}
                  radius={20}
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 20,
                    cursor: "pointer",
                    border: `1px solid rgba(${rgb},0.18)`,
                    background: `rgba(${rgb},0.1)`,
                    color: t.accent,
                    transition: "opacity 0.15s",
                  }}
                  title="Tag entfernen"
                >
                  {tag} x
                </InteractiveActionButton>
              ))}
              {editingTags ? (
                <input
                  autoFocus
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTag.trim()) {
                      if (!active.tags.includes(newTag.trim()))
                        updateNote(active.id, {
                          tags: [...active.tags, newTag.trim()],
                        });
                      setNewTag("");
                      setEditingTags(false);
                    }
                    if (e.key === "Escape") {
                      setEditingTags(false);
                      setNewTag("");
                    }
                  }}
                  onBlur={() => {
                    setEditingTags(false);
                    setNewTag("");
                  }}
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 20,
                    width: 78,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                    color: "inherit",
                  }}
                  placeholder="tag..."
                />
              ) : (
                <InteractiveActionButton
                  onClick={() => setEditingTags(true)}
                  motionId="notes-add-tag-status"
                  className="nx-icon-fade"
                  areaHint={46}
                  radius={14}
                  style={{
                    fontSize: 10,
                    ["--nx-idle-opacity" as any]: 0.58,
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "inherit",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}
                >
                  + Tag
                </InteractiveActionButton>
              )}
            </div>
            <div style={{ flex: 1 }} />
            {draftDirty && (
              <span style={{ color: t.accent, opacity: 1 }}>
                ● Ungespeichert
              </span>
            )}
            {lastSavedAt && !draftDirty && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.44 }}>
                <Clock size={9} /> {lastSavedAt}
              </span>
            )}
            <span style={{ opacity: 0.44 }}>{fmtDt(new Date(active.created))}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.2,
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 32 }}>📝</div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Keine Notiz ausgewählt
          </div>
          <InteractiveActionButton
            onClick={addNote}
            motionId="notes-empty-add"
            areaHint={96}
            radius={20}
            style={{
              marginTop: 8,
              padding: "8px 18px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              background: `rgba(${rgb},0.2)`,
              color: t.accent,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            + Neue Notiz
          </InteractiveActionButton>
        </div>
      )}

      {showQuickSwitch &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2600,
              background: "rgba(5, 8, 18, 0.55)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: "12vh",
            }}
            onClick={closeQuickSwitch}
          >
            <Glass
              className="flex flex-col"
              style={{
                width: "min(680px, calc(100vw - 44px))",
                maxHeight: "66vh",
                overflow: "hidden",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                style={{
                  padding: "12px 12px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <input
                  ref={quickSwitchInputRef}
                  value={quickSwitchQuery}
                  onChange={(event) => {
                    setQuickSwitchQuery(event.target.value);
                    setQuickSwitchCursor(0);
                  }}
                  placeholder="Quick Switch: Notiztitel, Tag oder Inhalt..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid rgba(${rgb},0.28)`,
                    background: `rgba(${rgb},0.08)`,
                    color: "inherit",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ overflowY: "auto", maxHeight: "52vh", padding: 8 }}>
                {quickSwitchResults.length > 0 ? (
                  quickSwitchResults.map((result, index) => (
                    <InteractiveActionButton
                      key={result.note.id}
                      onMouseEnter={() => setQuickSwitchCursor(index)}
                      onClick={() => {
                        setNote(result.note.id);
                        closeQuickSwitch();
                      }}
                      motionId={`notes-quick-switch-row-${result.note.id}`}
                      selected={index === quickSwitchCursor}
                      areaHint={72}
                      radius={10}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        background:
                          index === quickSwitchCursor
                            ? `rgba(${rgb},0.16)`
                            : "rgba(255,255,255,0.04)",
                        padding: "9px 10px",
                        marginBottom: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 3,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            index === quickSwitchCursor ? t.accent : "inherit",
                        }}
                      >
                        {result.note.title || "Untitled"}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.66,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                        }}
                      >
                        {result.preview}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          opacity: 0.52,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {result.reason}
                      </span>
                    </InteractiveActionButton>
                  ))
                ) : (
                  <div
                    style={{ fontSize: 12, opacity: 0.5, padding: "10px 4px" }}
                  >
                    Keine passenden Notizen gefunden.
                  </div>
                )}
              </div>
            </Glass>
          </div>,
          document.body,
        )}

      <NotesSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        theme={{ mode: t.mode, accent: t.accent, accent2: t.accent2 }}
        localSettings={localSettings}
        setLocalSettings={setLocalSettings}
        onApply={handleApplySettings}
      />

      {/* ══════════════════════════════════════
          ✦ MAGIC ELEMENT BUILDER MODAL
          Rendered at top level — always above everything
      ══════════════════════════════════════ */}
      <input
        id={NOTES_IMPORT_INPUT_ID}
        type="file"
        accept=".md,text/markdown"
        onChange={importMarkdownFile}
        style={{ display: "none" }}
      />
      <AnimatePresence>
        {showMagic && (
          <Suspense fallback={null}>
            <MagicElementModal
              accent={t.accent}
              accent2={t.accent2}
              onClose={() => setShowMagic(false)}
              onInsert={(snippet) => {
                insertFormat(snippet);
                setShowMagic(false);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
