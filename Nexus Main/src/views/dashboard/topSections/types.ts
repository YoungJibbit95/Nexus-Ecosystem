import type { CaptureIntentType } from "@nexus/core";

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
  resumeLane: Array<any>;
  widgetContentBuildError: string | null;
  resetLayout: () => void;
};

