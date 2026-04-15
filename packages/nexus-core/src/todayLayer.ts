export type TodayTaskLike = {
  status?: string | null;
};

export type TodayReminderLike = {
  id: string;
  title?: string | null;
  datetime?: string | null;
  snoozeUntil?: string | null;
  done?: boolean | null;
};

export type TodayLayerSummary<TReminder extends TodayReminderLike = TodayReminderLike> = {
  openTaskCount: number;
  dueTodayCount: number;
  overdueCount: number;
  upcomingCount: number;
  soonCount: number;
  overdueReminderIds: string[];
  dueTodayReminders: TReminder[];
};

const toValidDate = (raw: unknown): Date | null => {
  if (!raw) return null;
  const next = new Date(String(raw));
  return Number.isNaN(next.getTime()) ? null : next;
};

export function computeTodayLayerSummary<
  TTask extends TodayTaskLike = TodayTaskLike,
  TReminder extends TodayReminderLike = TodayReminderLike,
>(
  tasks: TTask[],
  reminders: TReminder[],
  now = new Date(),
): TodayLayerSummary<TReminder> {
  const todayKey = now.toDateString();
  const openTaskCount = (Array.isArray(tasks) ? tasks : []).filter((task) => task?.status !== "done").length;

  const openReminders = (Array.isArray(reminders) ? reminders : []).filter((reminder): reminder is TReminder => (
    Boolean(reminder) &&
    typeof reminder === "object" &&
    !(reminder as any).done
  ));

  const dueTodayReminders = openReminders
    .filter((reminder) => {
      const date = toValidDate((reminder as any)?.snoozeUntil || (reminder as any)?.datetime);
      return Boolean(date) && date!.toDateString() === todayKey;
    })
    .sort((a, b) => {
      const aTime = toValidDate((a as any)?.snoozeUntil || (a as any)?.datetime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = toValidDate((b as any)?.snoozeUntil || (b as any)?.datetime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const overdueReminderIds = openReminders
    .filter((reminder) => {
      const date = toValidDate((reminder as any)?.snoozeUntil || (reminder as any)?.datetime);
      return Boolean(date) && date!.getTime() < now.getTime();
    })
    .map((reminder) => String((reminder as any)?.id || ""))
    .filter((id) => id.length > 0);

  const upcomingCount = openReminders.filter((reminder) => {
    const date = toValidDate((reminder as any)?.snoozeUntil || (reminder as any)?.datetime);
    return Boolean(date) && date!.getTime() >= now.getTime();
  }).length;

  const soonCount = openReminders.filter((reminder) => {
    const date = toValidDate((reminder as any)?.snoozeUntil || (reminder as any)?.datetime);
    if (!date) return false;
    const delta = date.getTime() - now.getTime();
    return delta >= 0 && delta <= 30 * 60_000;
  }).length;

  return {
    openTaskCount,
    dueTodayCount: dueTodayReminders.length,
    overdueCount: overdueReminderIds.length,
    upcomingCount,
    soonCount,
    overdueReminderIds,
    dueTodayReminders,
  };
}
