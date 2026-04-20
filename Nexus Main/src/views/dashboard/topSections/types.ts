import type { CaptureIntentType } from "@nexus/core";

export type DashboardResumeEntry = {
  label: "Note" | "Code" | "Task" | "Reminder" | "Canvas";
  title: string;
  subtitle: string;
  reason: string;
  relevance: number;
  action: () => void;
};

export type DashboardTopSectionsProps = {
  t: any;
  rgb: string;
  today: string;
  greeting: string;
  pendingTasks: number;
  overdueReminders: number;
  setView?: (v: string) => void;
  editLayout: boolean;
  setEditLayout: React.Dispatch<React.SetStateAction<boolean>>;
  heroMotion: any;
  heroFramerEase: any;
  todaySummary: any;
  todayMenuOpen: boolean;
  setTodayMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  snoozeOverdue: (minutes: number) => void;
  runCaptureIntent: (type: CaptureIntentType) => void;
  captureMenuOpen: boolean;
  setCaptureMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeWorkspace: any;
  workspaceRoot: string;
  lastSyncLabel: string;
  contentMotion: any;
  contentFramerEase: any;
  resumeLane: DashboardResumeEntry[];
  widgetContentBuildError: string | null;
  resetLayout: () => void;
};
