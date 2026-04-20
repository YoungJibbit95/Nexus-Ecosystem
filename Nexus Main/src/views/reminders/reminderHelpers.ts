import { useEffect, useRef } from "react";
import { useApp } from "../../store/appStore";
import {
  REMINDER_TEMPLATES as CORE_REMINDER_TEMPLATES,
  REMINDER_SNOOZE_PRESETS,
  REMINDER_OVERDUE_SNOOZE_PRESETS,
  createReminderFromTemplate,
  formatReminderRepeat,
  type ReminderTemplateId,
} from "@nexus/core";

export type QuietHoursState = {
  enabled: boolean;
  start: string;
  end: string;
};

export const QUIET_HOURS_KEY = "nx-main-reminder-quiet-hours";
export const DEFAULT_QUIET_HOURS: QuietHoursState = {
  enabled: false,
  start: "22:00",
  end: "07:00",
};

export const readQuietHours = (): QuietHoursState => {
  try {
    const raw = localStorage.getItem(QUIET_HOURS_KEY);
    if (!raw) return DEFAULT_QUIET_HOURS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_QUIET_HOURS;
    return {
      enabled: Boolean(parsed.enabled),
      start:
        typeof parsed.start === "string"
          ? parsed.start
          : DEFAULT_QUIET_HOURS.start,
      end:
        typeof parsed.end === "string" ? parsed.end : DEFAULT_QUIET_HOURS.end,
    };
  } catch {
    return DEFAULT_QUIET_HOURS;
  }
};

export const isNowWithinQuietHours = (
  date: Date,
  quietHours: QuietHoursState,
): boolean => {
  if (!quietHours.enabled) return false;
  const [startH, startM] = quietHours.start.split(":").map((value) => Number(value));
  const [endH, endM] = quietHours.end.split(":").map((value) => Number(value));
  if (
    !Number.isFinite(startH) ||
    !Number.isFinite(startM) ||
    !Number.isFinite(endH) ||
    !Number.isFinite(endM)
  ) {
    return false;
  }
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
};

export const REMINDER_TEMPLATES = CORE_REMINDER_TEMPLATES;
export {
  REMINDER_SNOOZE_PRESETS,
  REMINDER_OVERDUE_SNOOZE_PRESETS,
  createReminderFromTemplate,
  formatReminderRepeat,
  type ReminderTemplateId,
};

export type Toast = {
  id: string;
  title: string;
  msg: string;
};

export function playNotifSound(freq = 880) {
  try {
    const ctx = new ((window as any).AudioContext ||
      (window as any).webkitAudioContext)();
    const play = (frequency: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.value = 0.12;
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + duration,
      );
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    play(freq, 0, 0.4);
    play(freq * 1.25, 0.25, 0.35);
  } catch {}
}

export function useChecker(
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>,
) {
  const { reminders, doneRem, snoozeRem } = useApp();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      reminders
        .filter((reminder) => !reminder.done)
        .forEach((reminder) => {
          const dueDate = new Date(reminder.snoozeUntil || reminder.datetime);
          if (dueDate <= now && !fired.current.has(reminder.id)) {
            const quietHours = readQuietHours();
            if (isNowWithinQuietHours(now, quietHours)) {
              return;
            }
            fired.current.add(reminder.id);
            playNotifSound();
            setToasts((toasts) => [
              ...toasts,
              { id: reminder.id, title: reminder.title, msg: reminder.msg },
            ]);
            try {
              (window as any).api?.notify(reminder.title, reminder.msg);
            } catch {}
          }
        });
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [reminders, setToasts]);

  const dismiss = (id: string) => {
    doneRem(id);
    fired.current.delete(id);
    setToasts((toasts) => toasts.filter((toast) => toast.id !== id));
  };
  const snooze = (id: string, minutes: number) => {
    snoozeRem(id, minutes);
    fired.current.delete(id);
    setToasts((toasts) => toasts.filter((toast) => toast.id !== id));
  };
  return { dismiss, snooze };
}
