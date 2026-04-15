import React, { useState } from "react";
import {
  AlarmClock,
  AlertCircle,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Glass } from "../../components/Glass";
import { InteractiveIconButton } from "../../components/render/InteractiveIconButton";
import { SurfaceHighlight } from "../../components/render/SurfaceHighlight";
import { NexusMarkdown } from "../../components/NexusMarkdown";
import { useApp, type Reminder } from "../../store/appStore";
import { useTheme } from "../../store/themeStore";
import { hexToRgb } from "../../lib/utils";
import { useInteractiveSurfaceMotion } from "../../render/useInteractiveSurfaceMotion";
import { useRenderSurfaceBudget } from "../../render/useRenderSurfaceBudget";
import { useSurfaceMotionRuntime } from "../../render/useSurfaceMotionRuntime";
import type { Toast } from "./reminderHelpers";

export function ToastCard({
  toast,
  onDone,
  onSnooze,
}: {
  toast: Toast;
  onDone: () => void;
  onSnooze: (minutes: number) => void;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const toastDecision = useRenderSurfaceBudget({
    id: `reminder-toast-${toast.id}`,
    surfaceClass: "utility-surface",
    effectClass: "status-highlight",
    interactionState: "active",
    visibilityState: "visible",
    budgetPriority: "high",
    areaHint: 120,
    motionClassHint: "status",
    transformOwnerHint: "surface",
    filterOwnerHint: "none",
    opacityOwnerHint: "surface",
  });
  const toastRuntime = useSurfaceMotionRuntime(toastDecision, { family: "status" });
  const toastTransition = {
    duration: Math.max(0.12, toastRuntime.timings.regularMs / 1000),
    ease: toastRuntime.timings.framerEase,
  };
  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={toastTransition}
      style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, width: 360 }}
    >
      <Glass
        type="modal"
        glow
        style={{
          padding: 16,
          borderLeft: `3px solid ${t.accent}`,
          boxShadow: `0 16px 50px rgba(0,0,0,0.5), 0 0 24px rgba(${rgb},0.18)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: `rgba(${rgb},0.15)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BellRing size={18} style={{ color: t.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{toast.title}</div>
            {toast.msg && (
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>{toast.msg}</div>
            )}
          </div>
          <InteractiveIconButton
            motionId={`toast-dismiss-${toast.id}`}
            onClick={onDone}
            idleOpacity={0.4}
            radius={5}
            style={{ padding: 3, flexShrink: 0 }}
          >
            <X size={15} />
          </InteractiveIconButton>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button
            onClick={onDone}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              background: t.accent,
              border: "none",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Check size={12} /> Dismiss
          </button>
          {[5, 15, 60].map((minutes) => (
            <button
              key={minutes}
              onClick={() => onSnooze(minutes)}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "inherit",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {minutes < 60 ? `${minutes}m` : "1h"}
            </button>
          ))}
        </div>
      </Glass>
    </motion.div>
  );
}

export function ReminderModal({
  reminder,
  onClose,
}: {
  reminder?: Reminder;
  onClose: () => void;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const { addRem, updateReminder } = useApp();

  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  const defaultDT = now.toISOString().slice(0, 16);

  const [title, setTitle] = useState(reminder?.title ?? "");
  const [msg, setMsg] = useState(reminder?.msg ?? "");
  const [datetime, setDatetime] = useState(
    reminder?.datetime ? reminder.datetime.slice(0, 16) : defaultDT,
  );
  const [repeat, setRepeat] = useState<Reminder["repeat"]>(reminder?.repeat ?? "none");
  const [tab, setTab] = useState<"basic" | "notes">("basic");
  const [notes, setNotes] = useState((reminder as any)?.notes ?? "");

  const modalDecision = useRenderSurfaceBudget({
    id: `reminders-modal-${reminder?.id ?? "new"}`,
    surfaceClass: "modal-surface",
    effectClass: "backdrop",
    interactionState: "active",
    visibilityState: "visible",
    budgetPriority: "high",
    areaHint: 220,
    motionClassHint: "sheet",
    transformOwnerHint: "surface",
    filterOwnerHint: "surface",
    opacityOwnerHint: "surface",
  });
  const modalRuntime = useSurfaceMotionRuntime(modalDecision, { family: "sheet" });
  const overlayTransition = {
    duration: Math.max(0.12, modalRuntime.timings.quickMs / 1000),
    ease: modalRuntime.timings.framerEase,
  };
  const panelTransition = {
    duration: Math.max(0.16, modalRuntime.timings.regularMs / 1000),
    ease: modalRuntime.timings.framerEase,
  };
  const panelInitial =
    modalRuntime.allowEntry && modalRuntime.capability !== "static-safe"
      ? { scale: 0.94, y: 16, opacity: 0.78 }
      : { scale: 0.985, y: 6, opacity: 0.9 };

  const repeats: { id: Reminder["repeat"]; label: string }[] = [
    { id: "none", label: "Once" },
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
  ];

  const save = () => {
    if (!title.trim()) return;
    if (reminder) {
      updateReminder(
        reminder.id,
        {
          title,
          msg,
          datetime: new Date(datetime).toISOString(),
          repeat,
          notes,
        } as any,
      );
    } else {
      addRem({ title, msg, datetime: new Date(datetime).toISOString(), repeat });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={overlayTransition}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={panelInitial}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={panelInitial}
        transition={panelTransition}
        onClick={(event) => event.stopPropagation()}
        style={{ width: 440, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        <Glass glow style={{ padding: 0, display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: `rgba(${rgb},0.15)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell size={15} style={{ color: t.accent }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800 }}>
                {reminder ? "Edit Reminder" : "New Reminder"}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: 0.4,
                color: "inherit",
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              padding: "0 20px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            {(["basic", "notes"] as const).map((nextTab) => (
              <button
                key={nextTab}
                onClick={() => setTab(nextTab)}
                style={{
                  padding: "8px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: tab === nextTab ? t.accent : "inherit",
                  opacity: tab === nextTab ? 1 : 0.45,
                  borderBottom: `2px solid ${tab === nextTab ? t.accent : "transparent"}`,
                  marginBottom: -1,
                }}
              >
                {nextTab}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {tab === "basic" && (
              <div style={{ padding: "16px 20px" }}>
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Reminder title…"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    outline: "none",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "inherit",
                    marginBottom: 12,
                  }}
                />
                <textarea
                  value={msg}
                  onChange={(event) => setMsg(event.target.value)}
                  placeholder="Additional details… (optional)"
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                    fontSize: 13,
                    color: "inherit",
                    resize: "none",
                    fontFamily: "inherit",
                    marginBottom: 14,
                  }}
                />
                <input
                  type="datetime-local"
                  value={datetime}
                  onChange={(event) => setDatetime(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    outline: "none",
                    fontSize: 13,
                    color: "inherit",
                    colorScheme: t.mode === "dark" ? "dark" : "light",
                    marginBottom: 12,
                  }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {repeats.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setRepeat(entry.id)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border: `1px solid ${repeat === entry.id ? t.accent : "rgba(255,255,255,0.1)"}`,
                        background:
                          repeat === entry.id
                            ? `rgba(${rgb},0.15)`
                            : "rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        color: repeat === entry.id ? t.accent : "inherit",
                        transition: "all 0.12s",
                      }}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "notes" && (
              <div style={{ display: "flex", flexDirection: "column", height: 280 }}>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Markdown notes…"
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    color: "inherit",
                    resize: "none",
                    fontFamily: "'Fira Code',monospace",
                    lineHeight: 1.6,
                  }}
                />
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 20px 16px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: 9,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                fontSize: 13,
                color: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              style={{
                flex: 2,
                padding: 9,
                borderRadius: 9,
                background: t.accent,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                boxShadow: `0 2px 14px rgba(${rgb},0.4)`,
              }}
            >
              {reminder ? "Save Changes" : "Create Reminder"}
            </button>
          </div>
        </Glass>
      </motion.div>
    </motion.div>
  );
}

export function ReminderCard({
  r,
  onEdit,
  now,
}: {
  r: Reminder;
  onEdit: () => void;
  now: Date;
}) {
  const t = useTheme();
  const rgb = hexToRgb(t.accent);
  const { doneRem, delRem, snoozeRem } = useApp();
  const dt = new Date(r.snoozeUntil || r.datetime);
  const isPast = dt < now && !r.done;
  const isSoon = !isPast && dt.getTime() - now.getTime() < 30 * 60000;
  const hasnotes = !!(r as any).notes;
  const [expanded, setExpanded] = useState(false);
  const cardDecision = useRenderSurfaceBudget({
    id: `reminder-card-${r.id}`,
    surfaceClass: "panel-surface",
    effectClass: "status-highlight",
    interactionState: expanded ? "active" : "idle",
    visibilityState: "visible",
    budgetPriority: isPast ? "high" : "normal",
    areaHint: 132,
    motionClassHint: "content",
    transformOwnerHint: "surface",
    filterOwnerHint: "none",
    opacityOwnerHint: "surface",
  });
  const cardRuntime = useSurfaceMotionRuntime(cardDecision, { family: "content" });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const interaction = useInteractiveSurfaceMotion({
    id: `reminders-card-hover-${r.id}`,
    hovered,
    focused,
    selected: expanded || isPast,
    pressed,
    surfaceClass: "panel-surface",
    effectClass: "status-highlight",
    budgetPriority: isPast ? "high" : "normal",
    areaHint: 136,
    family: "content",
  });
  const cardTransition = {
    duration: Math.max(0.12, cardRuntime.timings.quickMs / 1000),
    ease: cardRuntime.timings.framerEase,
  };
  const statusColor = r.done ? "#30d158" : isPast ? "#ff453a" : isSoon ? "#ff9f0a" : t.accent;
  const statusIcon = r.done ? (
    <CheckCircle2 size={14} />
  ) : isPast ? (
    <AlertCircle size={14} />
  ) : isSoon ? (
    <AlarmClock size={14} />
  ) : (
    <Bell size={14} />
  );

  const fmtDt = (date: Date) => {
    const today = date.toDateString() === now.toDateString();
    const tomorrow =
      new Date(now.getTime() + 86400000).toDateString() === date.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (today) return `Today ${timeStr}`;
    if (tomorrow) return `Tomorrow ${timeStr}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${timeStr}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={cardTransition}
    >
      <motion.div
        className="nx-motion-managed"
        animate={interaction.content.animate}
        transition={interaction.content.transition}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => {
          setFocused(false);
          setPressed(false);
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
      >
        <Glass
          glow={isSoon && !r.done}
          style={{
            padding: "12px 16px",
            marginBottom: 8,
            opacity: r.done ? 0.55 : 1,
            borderLeft: `2px solid ${statusColor}`,
            transition: "all 0.15s",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={10}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 10,
                border: `1px solid rgba(${rgb},0.22)`,
                background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.18), rgba(${rgb},0.06) 68%, rgba(${rgb},0.02) 100%)`,
              }}
            />
          </SurfaceHighlight>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <button
              onClick={() => doneRem(r.id)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: `2px solid ${r.done ? statusColor : "rgba(255,255,255,0.2)"}`,
                background: r.done ? statusColor : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
                color: r.done ? "#fff" : "inherit",
                transition: "all 0.15s",
              }}
            >
              {r.done && <Check size={12} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: r.done ? 0.5 : 1,
                    textDecoration: r.done ? "line-through" : undefined,
                    lineHeight: 1.4,
                  }}
                >
                  {r.title}
                </span>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {hasnotes && (
                    <InteractiveIconButton
                      motionId={`reminder-expand-${r.id}`}
                      intent="accent"
                      idleOpacity={0.5}
                      radius={4}
                      onClick={() => setExpanded((state) => !state)}
                    >
                      <motion.span
                        aria-hidden="true"
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={cardRuntime.framer.transformTransition}
                        style={{ display: "inline-flex" }}
                      >
                        <ChevronDown size={12} />
                      </motion.span>
                    </InteractiveIconButton>
                  )}
                  <InteractiveIconButton
                    motionId={`reminder-edit-${r.id}`}
                    onClick={onEdit}
                    idleOpacity={0.3}
                    radius={4}
                  >
                    <Edit3 size={12} />
                  </InteractiveIconButton>
                  <InteractiveIconButton
                    motionId={`reminder-del-${r.id}`}
                    onClick={() => delRem(r.id)}
                    intent="danger"
                    idleOpacity={0.3}
                    radius={4}
                  >
                    <Trash2 size={12} />
                  </InteractiveIconButton>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 7 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    color: statusColor,
                    fontWeight: 600,
                  }}
                >
                  {statusIcon} {fmtDt(dt)}
                </span>
                {r.repeat !== "none" && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 10,
                      background: `rgba(${rgb},0.12)`,
                      color: t.accent,
                    }}
                  >
                    <Repeat size={9} /> {r.repeat}
                  </span>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {expanded && hasnotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: Math.max(0.14, cardRuntime.timings.regularMs / 1000),
                  ease: cardRuntime.timings.framerEase,
                }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <NexusMarkdown content={(r as any).notes} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isPast && !r.done && (
            <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
              {[5, 15, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => snoozeRem(r.id, minutes)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 7,
                    border: "1px solid rgba(255,159,10,0.2)",
                    background: "rgba(255,159,10,0.08)",
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#ff9f0a",
                  }}
                >
                  Snooze {minutes < 60 ? `${minutes}m` : "1h"}
                </button>
              ))}
            </div>
          )}
        </Glass>
      </motion.div>
    </motion.div>
  );
}
