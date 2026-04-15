import type { Reminder } from "../store/appStore";

type PermissionState = "granted" | "denied" | "prompt" | "unknown";

type LocalNotificationsPluginLike = {
  checkPermissions?: () => Promise<any>;
  requestPermissions?: () => Promise<any>;
  schedule?: (payload: any) => Promise<any>;
  cancel?: (payload: any) => Promise<any>;
};

export type ReminderPermissionSync = {
  nativeAvailable: boolean;
  permission: PermissionState;
  canSchedule: boolean;
};

export type ReminderScheduleResult = {
  ok: boolean;
  mode: "native" | "fallback";
  notificationId: number | null;
  reason?: string;
};

export type ReminderHealthStatus = {
  nativeAvailable: boolean;
  permission: PermissionState;
  fallback: boolean;
  scheduled: number;
  nextReminderAt: string | null;
  lastRescheduleAt: string | null;
  lastRescheduleReason: string | null;
};

let scheduledNotificationIds = new Set<number>();
let cachedPermission: PermissionState = "unknown";
let cachedNativeAvailable = false;
let cachedFallback = true;
let lastRescheduleAt: string | null = null;
let lastRescheduleReason: string | null = null;
let lastNextReminderAt: string | null = null;

const getLocalNotificationsPlugin = (): LocalNotificationsPluginLike | null => {
  if (typeof window === "undefined") return null;
  const plugin = (window as any)?.Capacitor?.Plugins?.LocalNotifications;
  if (!plugin) return null;
  if (typeof plugin.schedule !== "function" || typeof plugin.cancel !== "function") {
    return null;
  }
  return plugin as LocalNotificationsPluginLike;
};

const resolvePermissionState = (payload: any): PermissionState => {
  const value = String(
    payload?.display ?? payload?.notifications ?? payload?.localNotifications ?? payload?.permission ?? "unknown",
  ).toLowerCase();
  if (value.includes("granted")) return "granted";
  if (value.includes("denied")) return "denied";
  if (value.includes("prompt")) return "prompt";
  return "unknown";
};

const hashReminderId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 1_000_000_000;
};

const resolveReminderDate = (reminder: Reminder): Date | null => {
  const raw = reminder.snoozeUntil || reminder.datetime;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const scheduleNativeNotification = async (
  plugin: LocalNotificationsPluginLike,
  reminder: Reminder,
): Promise<ReminderScheduleResult> => {
  const at = resolveReminderDate(reminder);
  if (!at) {
    return {
      ok: false,
      mode: "fallback",
      notificationId: null,
      reason: "INVALID_REMINDER_DATE",
    };
  }
  if (at.getTime() <= Date.now()) {
    return {
      ok: false,
      mode: "fallback",
      notificationId: null,
      reason: "REMINDER_IN_PAST",
    };
  }

  const notificationId = hashReminderId(reminder.id);
  try {
    await plugin.cancel?.({ notifications: [{ id: notificationId }] });
  } catch {
    // best effort
  }

  await plugin.schedule?.({
    notifications: [
      {
        id: notificationId,
        title: reminder.title || "Reminder",
        body: reminder.msg || "",
        schedule: { at, allowWhileIdle: true },
        extra: { reminderId: reminder.id },
      },
    ],
  });
  scheduledNotificationIds.add(notificationId);

  return {
    ok: true,
    mode: "native",
    notificationId,
  };
};

export const mobileReminderService = {
  async syncPermissions(): Promise<ReminderPermissionSync> {
    const plugin = getLocalNotificationsPlugin();
    if (!plugin) {
      cachedPermission = "unknown";
      cachedNativeAvailable = false;
      cachedFallback = true;
      return { nativeAvailable: false, permission: "unknown", canSchedule: false };
    }

    try {
      const current = await plugin.checkPermissions?.();
      let permission = resolvePermissionState(current);

      if (permission !== "granted" && typeof plugin.requestPermissions === "function") {
        const requested = await plugin.requestPermissions();
        permission = resolvePermissionState(requested);
      }

      cachedPermission = permission;
      cachedNativeAvailable = true;
      cachedFallback = permission !== "granted";
      return {
        nativeAvailable: true,
        permission,
        canSchedule: permission === "granted",
      };
    } catch {
      cachedPermission = "unknown";
      cachedNativeAvailable = true;
      cachedFallback = true;
      return { nativeAvailable: true, permission: "unknown", canSchedule: false };
    }
  },

  async schedule(reminder: Reminder): Promise<ReminderScheduleResult> {
    const plugin = getLocalNotificationsPlugin();
    if (!plugin) {
      cachedFallback = true;
      return { ok: false, mode: "fallback", notificationId: null, reason: "PLUGIN_UNAVAILABLE" };
    }

    if (cachedPermission !== "granted") {
      const permission = await this.syncPermissions();
      if (!permission.canSchedule) {
        cachedFallback = true;
        return { ok: false, mode: "fallback", notificationId: null, reason: "PERMISSION_UNAVAILABLE" };
      }
    }

    try {
      cachedFallback = false;
      return await scheduleNativeNotification(plugin, reminder);
    } catch {
      cachedFallback = true;
      return { ok: false, mode: "fallback", notificationId: null, reason: "SCHEDULE_FAILED" };
    }
  },

  async cancel(reminderId: string): Promise<void> {
    const plugin = getLocalNotificationsPlugin();
    if (!plugin) return;
    const notificationId = hashReminderId(reminderId);
    try {
      await plugin.cancel?.({ notifications: [{ id: notificationId }] });
    } catch {
      // best effort
    } finally {
      scheduledNotificationIds.delete(notificationId);
    }
  },

  async rescheduleFromStore(reminders: Reminder[]): Promise<{
    nativeAvailable: boolean;
    scheduled: number;
    fallback: boolean;
    reason?: string;
    nextReminderAt?: string | null;
  }> {
    const plugin = getLocalNotificationsPlugin();
    if (!plugin) {
      scheduledNotificationIds.clear();
      cachedNativeAvailable = false;
      cachedFallback = true;
      lastRescheduleReason = "PLUGIN_UNAVAILABLE";
      lastRescheduleAt = new Date().toISOString();
      lastNextReminderAt = null;
      return { nativeAvailable: false, scheduled: 0, fallback: true, reason: "PLUGIN_UNAVAILABLE", nextReminderAt: null };
    }

    const permission = await this.syncPermissions();
    if (!permission.canSchedule) {
      scheduledNotificationIds.clear();
      cachedNativeAvailable = true;
      cachedFallback = true;
      lastRescheduleReason = permission.permission === "denied" ? "PERMISSION_DENIED" : "PERMISSION_UNAVAILABLE";
      lastRescheduleAt = new Date().toISOString();
      lastNextReminderAt = null;
      return {
        nativeAvailable: true,
        scheduled: 0,
        fallback: true,
        reason: lastRescheduleReason,
        nextReminderAt: null,
      };
    }

    try {
      if (scheduledNotificationIds.size > 0) {
        await plugin.cancel?.({
          notifications: Array.from(scheduledNotificationIds).map((id) => ({ id })),
        });
      }
    } catch {
      // best effort
    } finally {
      scheduledNotificationIds.clear();
    }

    let scheduled = 0;
    let nextReminderAt: string | null = null;
    const pending = reminders.filter((reminder) => !reminder.done);
    for (const reminder of pending) {
      const result = await scheduleNativeNotification(plugin, reminder);
      if (result.ok) scheduled += 1;
      if (result.ok) {
        const reminderDate = resolveReminderDate(reminder);
        const reminderIso = reminderDate ? reminderDate.toISOString() : null;
        if (!nextReminderAt || (reminderIso && reminderIso < nextReminderAt)) {
          nextReminderAt = reminderIso;
        }
      }
    }

    cachedNativeAvailable = true;
    cachedFallback = false;
    lastRescheduleAt = new Date().toISOString();
    lastRescheduleReason = pending.length === 0 ? "NO_OPEN_REMINDERS" : "OK";
    lastNextReminderAt = nextReminderAt;

    return {
      nativeAvailable: true,
      scheduled,
      fallback: false,
      reason: lastRescheduleReason,
      nextReminderAt,
    };
  },

  getStatus(): ReminderHealthStatus {
    return {
      nativeAvailable: cachedNativeAvailable,
      permission: cachedPermission,
      fallback: cachedFallback,
      scheduled: scheduledNotificationIds.size,
      nextReminderAt: lastNextReminderAt,
      lastRescheduleAt,
      lastRescheduleReason,
    };
  },

  async openSystemSettings(): Promise<boolean> {
    try {
      const appPlugin = (window as any)?.Capacitor?.Plugins?.App;
      if (appPlugin && typeof appPlugin.openSettings === "function") {
        await appPlugin.openSettings();
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  },
};
