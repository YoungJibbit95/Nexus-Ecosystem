export type ReminderRepeat = "none" | "daily" | "weekly" | "monthly";

export type ReminderTemplateId = "standup" | "followup" | "break" | "review";

export type ReminderTemplate = {
  id: ReminderTemplateId;
  label: string;
  title: string;
  msg: string;
  offsetMinutes: number;
  repeat: ReminderRepeat;
};

export const REMINDER_TEMPLATES: readonly ReminderTemplate[] = [
  {
    id: "standup",
    label: "Standup",
    title: "Daily Standup",
    msg: "Status, Blocker, Next Step",
    offsetMinutes: 10,
    repeat: "daily",
  },
  {
    id: "followup",
    label: "Follow-up",
    title: "Follow-up",
    msg: "Ruckmeldung prufen und nachste Aktion planen",
    offsetMinutes: 120,
    repeat: "none",
  },
  {
    id: "break",
    label: "Break",
    title: "Break Reminder",
    msg: "Kurz aufstehen, trinken, resetten",
    offsetMinutes: 45,
    repeat: "none",
  },
  {
    id: "review",
    label: "Review",
    title: "Review Block",
    msg: "Review-Slot fur offene Tasks und Notes",
    offsetMinutes: 180,
    repeat: "weekly",
  },
] as const;

export const REMINDER_FILTERS = ["upcoming", "soon", "overdue", "all", "done"] as const;
export type ReminderFilter = (typeof REMINDER_FILTERS)[number];

export const REMINDER_SNOOZE_PRESETS = [5, 15, 30, 60] as const;
export const REMINDER_OVERDUE_SNOOZE_PRESETS = [15, 60, 180] as const;

const buildStandupDate = (baseDate: Date): string => {
  const due = new Date(baseDate.getTime());
  due.setHours(9, 30, 0, 0);
  if (due.getTime() <= baseDate.getTime()) {
    due.setDate(due.getDate() + 1);
  }
  return due.toISOString();
};

export const createReminderFromTemplate = (
  templateId: ReminderTemplateId,
  baseDate = new Date(),
): {
  template: ReminderTemplate;
  datetime: string;
  title: string;
  msg: string;
  repeat: ReminderRepeat;
} | null => {
  const template = REMINDER_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) return null;

  const datetime =
    template.id === "standup"
      ? buildStandupDate(baseDate)
      : new Date(baseDate.getTime() + template.offsetMinutes * 60_000).toISOString();

  return {
    template,
    datetime,
    title: template.title,
    msg: template.msg,
    repeat: template.repeat,
  };
};

export const formatReminderRepeat = (repeat: ReminderRepeat): string => {
  switch (repeat) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return "One-time";
  }
};
