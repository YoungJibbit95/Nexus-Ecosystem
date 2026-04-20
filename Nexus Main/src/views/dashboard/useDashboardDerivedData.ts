import { useCallback, useMemo } from "react";
import {
  Activity,
  Bell,
  CheckSquare,
  Code,
  FileText,
  Zap,
} from "lucide-react";
import {
  computeTodayLayerSummary,
  createCaptureIntent,
  type CaptureIntentType,
} from "@nexus/core";

type DashboardEntity = Record<string, any>;

type UseDashboardDerivedDataInput = {
  notes: DashboardEntity[];
  tasks: DashboardEntity[];
  codes: DashboardEntity[];
  canvases: DashboardEntity[];
  activeCanvasId: string | null | undefined;
  reminders: DashboardEntity[];
  activities: DashboardEntity[];
  workspaces: DashboardEntity[];
  activeWorkspaceId: string | null | undefined;
  workspaceRoot: string | null;
  lastSyncAt: string | null;
  lastSyncMode: string | null;
  setView?: (view: string) => void;
  addNote: () => void;
  addTask: (title?: string, status?: string, desc?: string, prio?: string) => void;
  addRem: (payload: { title: string; msg?: string; datetime: string; repeat?: string }) => void;
  addCode: (name?: string, language?: string) => void;
  addCanvas: (name?: string) => void;
  updateReminder: (id: string, patch: Record<string, any>) => void;
  accent: string;
  accent2: string;
};

type ResumeEntry = {
  label: "Note" | "Code" | "Task" | "Reminder" | "Canvas";
  title: string;
  subtitle: string;
  reason: string;
  relevance: number;
  action: () => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const buildDailySeries = (
  entries: DashboardEntity[],
  dateSelector: (entry: DashboardEntity) => unknown,
): number[] => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start = end - DAY_MS * 6;
  const buckets = Array.from({ length: 7 }, () => 0);
  entries.forEach((entry) => {
    const raw = dateSelector(entry);
    const ts = raw ? new Date(String(raw)).getTime() : NaN;
    if (!Number.isFinite(ts)) return;
    const dayIndex = Math.floor((ts - start) / DAY_MS);
    if (dayIndex < 0 || dayIndex > 6) return;
    buckets[dayIndex] += 1;
  });
  return buckets;
};

export function useDashboardDerivedData({
  notes,
  tasks,
  codes,
  canvases,
  activeCanvasId,
  reminders,
  activities,
  workspaces,
  activeWorkspaceId,
  workspaceRoot,
  lastSyncAt,
  lastSyncMode,
  setView,
  addNote,
  addTask,
  addRem,
  addCode,
  addCanvas,
  updateReminder,
  accent,
  accent2,
}: UseDashboardDerivedDataInput) {
  const doneTasks = useMemo(
    () => tasks.filter((task) => task.status === "done").length,
    [tasks],
  );
  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done").length,
    [tasks],
  );
  const overdueReminders = useMemo(
    () =>
      reminders.filter(
        (reminder) =>
          !reminder.done &&
          new Date(reminder.snoozeUntil || reminder.datetime) < new Date(),
      ).length,
    [reminders],
  );
  const pinnedNotes = useMemo(
    () => notes.filter((note) => note.pinned).length,
    [notes],
  );

  const recentActivity = useMemo(() => [...activities].slice(0, 8), [activities]);

  const noteSpark = useMemo(
    () => buildDailySeries(notes, (note) => note.updated || note.created),
    [notes],
  );

  const taskSpark = useMemo(
    () =>
      buildDailySeries(
        tasks.filter((task) => task.status === "done"),
        (task) => task.updated || task.created,
      ),
    [tasks],
  );

  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
        .slice(0, 4),
    [notes],
  );

  const urgentReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => !reminder.done)
        .sort(
          (a, b) =>
            new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
        )
        .slice(0, 4),
    [reminders],
  );

  const resumeLane = useMemo(() => {
    const nowTs = Date.now();
    const priorityRank: Record<string, number> = {
      critical: 0,
      high: 1,
      mid: 2,
      low: 3,
    };
    const lastNote = [...notes].sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    )[0];
    const lastCode = [...codes].sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
    )[0];
    const nextReminder = reminders
      .filter((reminder) => !reminder.done)
      .sort(
        (a, b) =>
          new Date(a.snoozeUntil || a.datetime).getTime()
          - new Date(b.snoozeUntil || b.datetime).getTime(),
      )[0];
    const focusTask = tasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => {
        const aDue = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
        const aOverdue = Number.isFinite(aDue) && aDue < nowTs;
        const bOverdue = Number.isFinite(bDue) && bDue < nowTs;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        const aPrio = priorityRank[a.priority] ?? 10;
        const bPrio = priorityRank[b.priority] ?? 10;
        if (aPrio !== bPrio) return aPrio - bPrio;
        if (aDue !== bDue) return aDue - bDue;
        return (
          new Date(b.updated || b.created || 0).getTime()
          - new Date(a.updated || a.created || 0).getTime()
        );
      })[0];
    const activeCanvas =
      canvases.find((canvas) => canvas.id === activeCanvasId)
      || [...canvases].sort(
        (a, b) =>
          new Date(b.updated || b.created || 0).getTime()
          - new Date(a.updated || a.created || 0).getTime(),
      )[0];

    const entries: ResumeEntry[] = [
      lastNote
        ? {
            label: "Note",
            title: lastNote.title || "Untitled",
            subtitle: `${new Date(lastNote.updated || lastNote.created).toLocaleString()}${lastNote.tags?.[0] ? ` · #${lastNote.tags[0]}` : ""}`,
            reason: "Zuletzt bearbeitet",
            relevance: 60,
            action: () => setView?.("notes"),
          }
        : null,
      lastCode
        ? {
            label: "Code",
            title: lastCode.name,
            subtitle: `${new Date(lastCode.updated || lastCode.created).toLocaleString()}${lastCode.lang ? ` · ${lastCode.lang}` : ""}`,
            reason: "Letzte aktive Datei",
            relevance: 55,
            action: () => setView?.("code"),
          }
        : null,
      nextReminder
        ? {
            label: "Reminder",
            title: nextReminder.title,
            subtitle: new Date(nextReminder.snoozeUntil || nextReminder.datetime).toLocaleString(),
            reason:
              new Date(nextReminder.snoozeUntil || nextReminder.datetime).getTime() < nowTs
                ? "Überfällig"
                : "Als Nächstes fällig",
            relevance:
              new Date(nextReminder.snoozeUntil || nextReminder.datetime).getTime() < nowTs
                ? 100
                : 78,
            action: () => setView?.("reminders"),
          }
        : null,
      focusTask
        ? {
            label: "Task",
            title: focusTask.title,
            subtitle:
              focusTask.deadline
                ? `Deadline ${new Date(focusTask.deadline).toLocaleDateString()}`
                : `Priorität ${focusTask.priority || "mid"}`,
            reason:
              focusTask.deadline && new Date(focusTask.deadline).getTime() < nowTs
                ? "Blockiert Fokus durch Überfälligkeit"
                : "Nächster Fokus-Task",
            relevance:
              focusTask.deadline && new Date(focusTask.deadline).getTime() < nowTs
                ? 94
                : 72 - (priorityRank[focusTask.priority] ?? 2) * 4,
            action: () => setView?.("tasks"),
          }
        : null,
      activeCanvas
        ? {
            label: "Canvas",
            title: activeCanvas.name || "Canvas",
            subtitle: `${activeCanvas.nodes?.length || 0} Nodes · ${new Date(activeCanvas.updated || activeCanvas.created).toLocaleString()}`,
            reason: "Letzter visueller Arbeitskontext",
            relevance: 50,
            action: () => setView?.("canvas"),
          }
        : null,
    ].filter(
      (entry): entry is ResumeEntry => Boolean(entry),
    );
    return entries.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }, [activeCanvasId, canvases, codes, notes, reminders, setView, tasks]);

  const tasksByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag";
    return "Guten Abend";
  }, []);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  const actIcon = useCallback((type: string) => {
    const map: Record<string, any> = {
      note: FileText,
      code: Code,
      task: CheckSquare,
      reminder: Bell,
      system: Zap,
    };
    return map[type] || Activity;
  }, []);

  const actColor = useCallback(
    (type: string) => {
      const map: Record<string, string> = {
        note: accent,
        code: "#30D158",
        task: "#FF9F0A",
        reminder: "#FF453A",
        system: accent2,
      };
      return map[type] || accent;
    },
    [accent, accent2],
  );

  const todaySummary = useMemo(
    () => computeTodayLayerSummary(tasks as any[], reminders as any[], new Date()),
    [tasks, reminders],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null,
    [activeWorkspaceId, workspaces],
  );

  const runCaptureIntent = useCallback(
    (intentType: CaptureIntentType) => {
      const intent = createCaptureIntent(intentType);
      switch (intent.type) {
        case "note": {
          addNote();
          setView?.(intent.targetView || "notes");
          break;
        }
        case "task": {
          addTask(
            intent.title || "Quick Task",
            "todo",
            "Erstellt via Quick Capture",
            "mid",
          );
          setView?.(intent.targetView || "tasks");
          break;
        }
        case "reminder": {
          const inFifteenMinutes = new Date(Date.now() + 15 * 60_000).toISOString();
          addRem({
            title: intent.title || "Quick Reminder",
            msg: "Erstellt via Quick Capture",
            datetime: inFifteenMinutes,
            repeat: "none",
          });
          setView?.(intent.targetView || "reminders");
          break;
        }
        case "code": {
          addCode("quick-note.ts", "typescript");
          setView?.(intent.targetView || "code");
          break;
        }
        case "canvas": {
          addCanvas(intent.title || "Quick Canvas");
          setView?.(intent.targetView || "canvas");
          break;
        }
        default:
          break;
      }
    },
    [addCanvas, addCode, addNote, addRem, addTask, setView],
  );

  const snoozeOverdue = useCallback(
    (minutes: number) => {
      if (todaySummary.overdueReminderIds.length === 0) return;
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      todaySummary.overdueReminderIds.forEach((reminderId) => {
        updateReminder(reminderId, { snoozeUntil: until });
      });
    },
    [todaySummary.overdueReminderIds, updateReminder],
  );

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return "noch keine Synchronisation";
    const modeLabel =
      lastSyncMode === "runtime-import"
        ? "Runtime Import"
        : lastSyncMode === "runtime-export"
          ? "Runtime Export"
          : lastSyncMode === "import"
            ? "Import"
            : lastSyncMode === "export"
              ? "Export"
              : "Sync";
    return `${modeLabel} · ${new Date(lastSyncAt).toLocaleString()}`;
  }, [lastSyncAt, lastSyncMode]);

  return {
    doneTasks,
    pendingTasks,
    overdueReminders,
    pinnedNotes,
    recentActivity,
    noteSpark,
    taskSpark,
    recentNotes,
    urgentReminders,
    resumeLane,
    tasksByStatus,
    greeting,
    today,
    actIcon,
    actColor,
    todaySummary,
    activeWorkspace,
    workspaceRoot,
    runCaptureIntent,
    snoozeOverdue,
    lastSyncLabel,
  };
}
