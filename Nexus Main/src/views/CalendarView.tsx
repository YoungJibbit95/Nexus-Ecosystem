import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GripVertical,
  ListFilter,
  Maximize2,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Glass } from "../components/Glass";
import { useApp, type Reminder, type Task } from "../store/appStore";
import { useTheme } from "../store/themeStore";
import { hexToRgb } from "../lib/utils";
import { mapIcsImport, type IcsImportMode } from "./calendar/icsImport";

type CalendarItemType = "task" | "reminder";
type CalendarDensity = "comfortable" | "compact";
type CalendarDisplayMode = "day" | "week" | "month";
type CalendarDayPlanVariant = "sidebar" | "window";
type CalendarTypeFilter = "all" | CalendarItemType;
type CalendarPriorityFilter = "all" | Task["priority"];

type CalendarDropBase = {
  id: string;
  dateKey: string;
  datetime: string;
};

export type CalendarTaskDropPayload = CalendarDropBase & {
  type: "task";
  item: Task;
};

export type CalendarReminderDropPayload = CalendarDropBase & {
  type: "reminder";
  item: Reminder;
};

export type CalendarViewProps = {
  setView?: (viewId: string) => void;
  onTaskDrop?: (payload: CalendarTaskDropPayload) => void;
  onReminderDrop?: (payload: CalendarReminderDropPayload) => void;
  onImportClick?: () => void;
};

type CalendarItem = {
  id: string;
  type: CalendarItemType;
  title: string;
  description: string;
  date: Date;
  dateKey: string;
  priority?: Task["priority"];
  done: boolean;
  formLabel: string;
  timeLabel: string;
  source: Task | Reminder;
};

type DragItem = Partial<Task & Reminder> & {
  id?: string;
  itemType?: CalendarItemType;
  calendarType?: CalendarItemType;
};

type CalendarDropHandler = (
  item: DragItem,
  dateKey: string,
  timeValue?: string,
) => void;

const DND_TYPES = {
  calendarItem: "NX_CALENDAR_ITEM",
  task: "TASK",
  reminder: "REMINDER",
} as const;

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  low: "#30d158",
  mid: "#ffd60a",
  high: "#ff453a",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Niedrig",
  mid: "Mittel",
  high: "Hoch",
};

const TYPE_LABEL: Record<CalendarItemType, string> = {
  task: "Aufgabe",
  reminder: "Erinnerung",
};

const VIEW_LABEL: Record<CalendarDisplayMode, string> = {
  day: "Tag",
  week: "Woche",
  month: "Monat",
};

const PREVIOUS_PERIOD_LABEL: Record<CalendarDisplayMode, string> = {
  day: "Vorheriger Tag",
  week: "Vorherige Woche",
  month: "Vorheriger Monat",
};

const NEXT_PERIOD_LABEL: Record<CalendarDisplayMode, string> = {
  day: "Naechster Tag",
  week: "Naechste Woche",
  month: "Naechster Monat",
};

const REPEAT_LABEL: Record<Reminder["repeat"], string> = {
  none: "Einmalig",
  daily: "Taeglich",
  weekly: "Woechentlich",
  monthly: "Monatlich",
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const HOUR_MARKS = Array.from({ length: 24 }, (_, hour) => hour);

const pad2 = (value: number) => String(value).padStart(2, "0");

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const fromDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
};

const getDaysInMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const isValidDate = (date: Date) => Number.isFinite(date.getTime());

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

const formatMonthTitle = (date: Date) =>
  date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

const formatSelectedDate = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("de-DE", { month: "short", day: "numeric" });

const formatWeekdayShort = (date: Date) =>
  date.toLocaleDateString("de-DE", { weekday: "short" });

const formatDayTitle = (date: Date) =>
  date.toLocaleDateString("de-DE", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (date: Date) =>
  date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

const formatHour = (hour: number) =>
  new Date(2026, 0, 1, hour, 0, 0).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

const combineDateAndTime = (dateKey: string, timeValue: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();
};

const moveDateKeepingTime = (
  dateKey: string,
  previousDate: string | undefined,
  fallbackTime: string,
) => {
  const previous = parseDate(previousDate);
  if (!previous) return combineDateAndTime(dateKey, fallbackTime);

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    previous.getHours(),
    previous.getMinutes(),
    previous.getSeconds(),
    previous.getMilliseconds(),
  ).toISOString();
};

const getMonthDays = (viewMonth: Date) => {
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
};

const getWeekDays = (date: Date) => {
  const mondayOffset = (date.getDay() + 6) % 7;
  const weekStart = addDays(date, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
};

const formatWeekTitle = (weekDays: Date[]) => {
  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  if (!first || !last) return "";
  const firstLabel = first.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
  });
  const lastLabel = last.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${firstLabel} - ${lastLabel}`;
};

const isTaskDone = (task: Task) => task.status === "done";

const getReminderDate = (reminder: Reminder) =>
  parseDate(reminder.snoozeUntil || reminder.datetime);

const getTaskDate = (task: Task) => parseDate(task.deadline);

const getRepeatLabel = (reminder: Reminder) => {
  if (reminder.done) return "Erledigt";
  if (reminder.snoozeUntil) return "Spaeter";
  return REPEAT_LABEL[reminder.repeat] || reminder.repeat;
};

const taskFormLabel = (task: Task) => {
  if (task.status === "done") return "Erledigt";
  if (task.status === "doing") return "Aktiv";
  return "Offen";
};

const resolveDraggedType = (item: DragItem): CalendarItemType | null => {
  if (item.itemType === "task" || item.calendarType === "task") return "task";
  if (item.itemType === "reminder" || item.calendarType === "reminder") {
    return "reminder";
  }
  if ("datetime" in item || "repeat" in item || "linkedTaskId" in item) {
    return "reminder";
  }
  if ("priority" in item || "status" in item || "deadline" in item) return "task";
  return null;
};

const buildItems = (tasks: Task[], reminders: Reminder[]) => {
  const taskItems: CalendarItem[] = tasks
    .map((task) => {
      const date = getTaskDate(task);
      if (!date) return null;
      return {
        id: task.id,
        type: "task" as const,
        title: task.title,
        description: task.desc || task.notes || "",
        date,
        dateKey: toDateKey(date),
        priority: task.priority,
        done: isTaskDone(task),
        formLabel: taskFormLabel(task),
        timeLabel: formatTime(date),
        source: task,
      };
    })
    .filter(Boolean) as CalendarItem[];

  const reminderItems: CalendarItem[] = reminders
    .map((reminder) => {
      const date = getReminderDate(reminder);
      if (!date) return null;
      return {
        id: reminder.id,
        type: "reminder" as const,
        title: reminder.title,
        description: reminder.msg || reminder.notes || "",
        date,
        dateKey: toDateKey(date),
        done: reminder.done,
        formLabel: getRepeatLabel(reminder),
        timeLabel: formatTime(date),
        source: reminder,
      };
    })
    .filter(Boolean) as CalendarItem[];

  return [...taskItems, ...reminderItems].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    if (a.type !== b.type) return a.type === "reminder" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
};

const groupByDateKey = (items: CalendarItem[]) => {
  const grouped = new Map<string, CalendarItem[]>();
  items.forEach((item) => {
    const list = grouped.get(item.dateKey) || [];
    list.push(item);
    grouped.set(item.dateKey, list);
  });
  return grouped;
};

const countItemsByType = (items: CalendarItem[]) => ({
  tasks: items.filter((item) => item.type === "task").length,
  reminders: items.filter((item) => item.type === "reminder").length,
});

const countOpenHighPriority = (items: CalendarItem[]) =>
  items.filter((item) => item.type === "task" && item.priority === "high" && !item.done)
    .length;

const isItemOverdue = (item: CalendarItem) =>
  !item.done && item.date.getTime() < Date.now();

const getCalendarStatusClass = (item: CalendarItem, overdue: boolean) => {
  if (overdue) return "is-status-overdue";
  if (item.done) return "is-status-done";
  if (item.type === "task") {
    return `is-status-${((item.source as Task).status || "todo").toLowerCase()}`;
  }
  return (item.source as Reminder).snoozeUntil ? "is-status-snoozed" : "is-status-once";
};

const CalendarCard = ({
  item,
  density,
  variant = "agenda",
}: {
  item: CalendarItem;
  density: CalendarDensity;
  variant?: "month" | "agenda" | "timeline";
}) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_TYPES.calendarItem,
      item: { id: item.id, itemType: item.type },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [item.id, item.type],
  );
  const Icon = item.type === "task" ? CheckSquare : Bell;
  const color = item.priority ? PRIORITY_COLOR[item.priority] : "#64d2ff";
  const priorityLabel = item.priority ? PRIORITY_LABEL[item.priority] : "Geplant";
  const priorityClass = item.priority ? `is-priority-${item.priority}` : "is-priority-time";
  const overdue = isItemOverdue(item);
  const statusClass = getCalendarStatusClass(item, overdue);
  const title = `${TYPE_LABEL[item.type]}: ${item.title} um ${item.timeLabel}${
    item.priority ? `, Prioritaet ${priorityLabel}` : ""
  }`;

  return (
    <div
      ref={drag as any}
      className={[
        "nx-calendar-card",
        `nx-calendar-card-${variant}`,
        `nx-calendar-card-${item.type}`,
        item.done ? "is-done" : "",
        overdue ? "is-overdue" : "",
        isDragging ? "is-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--nx-calendar-card-color": color } as React.CSSProperties}
      title={title}
    >
      <span className="nx-calendar-card-rail" aria-hidden="true" />
      <div className="nx-calendar-card-main">
        <div className="nx-calendar-card-title-row">
          <span className="nx-calendar-card-type" aria-label={TYPE_LABEL[item.type]}>
            <Icon size={variant === "month" ? 10 : 12} />
            <span>{variant === "month" ? TYPE_LABEL[item.type][0] : TYPE_LABEL[item.type]}</span>
          </span>
          <span className="nx-calendar-card-time">
            <Clock size={variant === "month" ? 9 : 11} />
            {item.timeLabel}
          </span>
        </div>
        <div className="nx-calendar-card-title">{item.title}</div>
        {variant === "agenda" && density === "comfortable" && item.description && (
          <div className="nx-calendar-card-desc">{item.description}</div>
        )}
        <div className="nx-calendar-card-meta">
          <span
            className={[
              "nx-calendar-card-status",
              overdue ? "is-hot" : "",
              statusClass,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {overdue ? "Ueberfaellig" : item.formLabel}
          </span>
          <span className={`nx-calendar-card-priority ${priorityClass}`}>
            {item.type === "task" && <Flag size={10} />}
            {priorityLabel}
          </span>
          <GripVertical size={12} className="nx-calendar-card-grip" />
        </div>
      </div>
    </div>
  );
};

const CalendarDayCell = ({
  day,
  items,
  density,
  selected,
  today,
  inCurrentMonth,
  onSelect,
  onDropItem,
}: {
  day: Date;
  items: CalendarItem[];
  density: CalendarDensity;
  selected: boolean;
  today: boolean;
  inCurrentMonth: boolean;
  onSelect: (dateKey: string) => void;
  onDropItem: CalendarDropHandler;
}) => {
  const dateKey = toDateKey(day);
  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: [DND_TYPES.calendarItem, DND_TYPES.task, DND_TYPES.reminder],
      drop: (dragItem: DragItem, monitor) => {
        if (monitor.didDrop()) return;
        onDropItem(dragItem, dateKey);
      },
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [dateKey, onDropItem],
  );
  const visibleLimit = 1;
  const visibleItems = items.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const itemCounts = countItemsByType(items);
  const highPriorityCount = countOpenHighPriority(items);
  const overdueCount = items.filter(isItemOverdue).length;
  const countLabelParts = [
    `${items.length} Eintraege`,
    highPriorityCount > 0 ? `${highPriorityCount} hoch` : "",
    overdueCount > 0 ? `${overdueCount} ueberfaellig` : "",
  ].filter(Boolean);

  return (
    <div
      ref={drop as any}
      role="button"
      tabIndex={0}
      className={[
        "nx-calendar-day",
        selected ? "is-selected" : "",
        today ? "is-today" : "",
        inCurrentMonth ? "" : "is-muted",
        items.length > 0 ? "has-items" : "",
        highPriorityCount > 0 ? "has-priority" : "",
        overdueCount > 0 ? "has-overdue" : "",
        hiddenCount > 0 ? "has-overflow" : "",
        canDrop ? "can-drop" : "",
        isOver ? "is-over" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(dateKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(dateKey);
        }
      }}
    >
      <div className="nx-calendar-day-head">
        <span className="nx-calendar-day-number">{day.getDate()}</span>
        {items.length > 0 && (
          <div className="nx-calendar-day-counts" aria-label={countLabelParts.join(", ")}>
            {itemCounts.tasks > 0 && (
              <span className="is-task">
                <CheckSquare size={9} />
                {itemCounts.tasks}
              </span>
            )}
            {itemCounts.reminders > 0 && (
              <span className="is-reminder">
                <Bell size={9} />
                {itemCounts.reminders}
              </span>
            )}
            {highPriorityCount > 0 && (
              <span className="is-priority-high" title="Hohe Prioritaet">
                <Flag size={9} />
                {highPriorityCount}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="is-overdue" title="Ueberfaellig">
                <Clock size={9} />
                {overdueCount}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="nx-calendar-day-items">
        {visibleItems.map((item) => (
          <CalendarCard
            key={`${item.type}-${item.id}`}
            item={item}
            density={density}
            variant="month"
          />
        ))}
        {hiddenCount > 0 && (
          <div className="nx-calendar-more">+{hiddenCount}</div>
        )}
        {items.length === 0 && selected && (
          <div className="nx-calendar-day-empty">Frei</div>
        )}
      </div>
    </div>
  );
};

const DropAgenda = ({
  dateKey,
  onDropItem,
  children,
}: {
  dateKey: string;
  onDropItem: CalendarDropHandler;
  children: React.ReactNode;
}) => {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [DND_TYPES.calendarItem, DND_TYPES.task, DND_TYPES.reminder],
      drop: (dragItem: DragItem, monitor) => {
        if (monitor.didDrop()) return;
        onDropItem(dragItem, dateKey);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [dateKey, onDropItem],
  );

  return (
    <div
      ref={drop as any}
      className={`nx-calendar-agenda-drop ${isOver ? "is-over" : ""}`}
    >
      {children}
    </div>
  );
};

const CalendarTimelineSlot = ({
  dateKey,
  hour,
  items,
  density,
  mode,
  selected,
  today,
  onSelect,
  onDropItem,
}: {
  dateKey: string;
  hour: number;
  items: CalendarItem[];
  density: CalendarDensity;
  mode: Extract<CalendarDisplayMode, "day" | "week">;
  selected: boolean;
  today: boolean;
  onSelect: (dateKey: string) => void;
  onDropItem: CalendarDropHandler;
}) => {
  const timeValue = `${pad2(hour)}:00`;
  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: [DND_TYPES.calendarItem, DND_TYPES.task, DND_TYPES.reminder],
      drop: (dragItem: DragItem, monitor) => {
        if (monitor.didDrop()) return;
        onDropItem(dragItem, dateKey, timeValue);
      },
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [dateKey, onDropItem, timeValue],
  );
  const now = new Date();
  const isCurrentHour = today && now.getHours() === hour;
  const visibleLimit =
    mode === "day" ? (density === "comfortable" ? 4 : 3) : density === "comfortable" ? 2 : 1;
  const visibleItems = items.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <button
      ref={drop as any}
      type="button"
      className={[
        "nx-calendar-hour-slot",
        selected ? "is-selected-day" : "",
        today ? "is-today" : "",
        isCurrentHour ? "is-current-hour" : "",
        canDrop ? "can-drop" : "",
        isOver ? "is-over" : "",
        items.length > 0 ? "has-items" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(dateKey)}
      aria-label={`${formatHour(hour)}, ${items.length} Eintraege`}
    >
      <div className="nx-calendar-hour-slot-items">
        {visibleItems.map((item) => (
          <CalendarCard
            key={`${item.type}-${item.id}`}
            item={item}
            density={density}
            variant="timeline"
          />
        ))}
        {hiddenCount > 0 && <span className="nx-calendar-hour-more">+{hiddenCount}</span>}
      </div>
    </button>
  );
};

const CalendarTimeline = ({
  mode,
  days,
  itemsByDate,
  selectedDateKey,
  todayKey,
  density,
  onSelect,
  onDropItem,
}: {
  mode: Extract<CalendarDisplayMode, "day" | "week">;
  days: Date[];
  itemsByDate: Map<string, CalendarItem[]>;
  selectedDateKey: string;
  todayKey: string;
  density: CalendarDensity;
  onSelect: (dateKey: string) => void;
  onDropItem: CalendarDropHandler;
}) => {
  const columnCount = days.length;
  const daysKey = days.map(toDateKey).join("|");
  const timelineBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = timelineBodyRef.current;
    if (!element) return;
    const now = new Date();
    const hasToday = days.some((day) => toDateKey(day) === todayKey);
    const targetHour = hasToday ? Math.max(0, now.getHours() - 2) : 8;
    const hourHeight = mode === "day" ? 70 : 62;
    element.scrollTop = targetHour * hourHeight;
  }, [daysKey, mode, todayKey]);

  return (
    <Glass className={`nx-calendar-timeline-panel nx-calendar-timeline-${mode}`}>
      <div className="nx-calendar-timeline-head">
        <div className="nx-calendar-time-gutter-label">Zeit</div>
        <div
          className="nx-calendar-timeline-days"
          style={{ "--nx-calendar-days": columnCount } as React.CSSProperties}
        >
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const dayItems = itemsByDate.get(dateKey) || [];
            const dayCounts = countItemsByType(dayItems);
            return (
              <button
                type="button"
                key={dateKey}
                className={[
                  "nx-calendar-day-tab",
                  dateKey === selectedDateKey ? "is-selected" : "",
                  dateKey === todayKey ? "is-today" : "",
                  dayItems.length > 0 ? "has-items" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSelect(dateKey)}
              >
                <span>{formatWeekdayShort(day)}</span>
                <strong>{day.getDate()}</strong>
                <small>{formatShortDate(day)}</small>
                {dayItems.length > 0 && (
                  <em>
                    {dayCounts.tasks > 0 && `${dayCounts.tasks} A`}
                    {dayCounts.tasks > 0 && dayCounts.reminders > 0 && " / "}
                    {dayCounts.reminders > 0 && `${dayCounts.reminders} E`}
                  </em>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="nx-calendar-timeline-body" ref={timelineBodyRef}>
        <div className="nx-calendar-time-gutter" aria-hidden="true">
          {HOUR_MARKS.map((hour) => (
            <div key={hour} className="nx-calendar-time-label">
              {formatHour(hour)}
            </div>
          ))}
        </div>
        <div
          className="nx-calendar-time-grid"
          style={{ "--nx-calendar-days": columnCount } as React.CSSProperties}
        >
          {HOUR_MARKS.flatMap((hour) =>
            days.map((day) => {
              const dateKey = toDateKey(day);
              const hourItems = (itemsByDate.get(dateKey) || []).filter(
                (item) => item.date.getHours() === hour,
              );
              return (
                <CalendarTimelineSlot
                  key={`${dateKey}-${hour}`}
                  dateKey={dateKey}
                  hour={hour}
                  items={hourItems}
                  density={density}
                  mode={mode}
                  selected={dateKey === selectedDateKey}
                  today={dateKey === todayKey}
                  onSelect={onSelect}
                  onDropItem={onDropItem}
                />
              );
            }),
          )}
        </div>
      </div>
    </Glass>
  );
};

export function CalendarView({
  onTaskDrop,
  onReminderDrop,
  onImportClick,
}: CalendarViewProps = {}) {
  const theme = useTheme();
  const rgb = hexToRgb(theme.accent);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const dayPlannerInputRef = useRef<HTMLInputElement>(null);
  const {
    tasks,
    reminders,
    updateTask,
    updateReminder,
    addTask,
    addRem,
  } = useApp();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [typeFilter, setTypeFilter] = useState<CalendarTypeFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<CalendarPriorityFilter>("all");
  const [density, setDensity] = useState<CalendarDensity>("comfortable");
  const [calendarMode, setCalendarMode] = useState<CalendarDisplayMode>("week");
  const [composerType, setComposerType] = useState<CalendarItemType>("task");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerPriority, setComposerPriority] =
    useState<Task["priority"]>("mid");
  const [composerRepeat, setComposerRepeat] =
    useState<Reminder["repeat"]>("none");
  const [composerTags, setComposerTags] = useState("");
  const [composerTime, setComposerTime] = useState("09:00");
  const [dayPlannerOpen, setDayPlannerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importMode, setImportMode] = useState<IcsImportMode>("reminders");
  const [importMessage, setImportMessage] = useState("");

  const allItems = useMemo(() => buildItems(tasks, reminders), [tasks, reminders]);
  const filteredItems = useMemo(
    () =>
      allItems.filter((item) => {
        if (typeFilter !== "all" && item.type !== typeFilter) return false;
        if (priorityFilter !== "all") {
          return item.type === "task" && item.priority === priorityFilter;
        }
        return true;
      }),
    [allItems, priorityFilter, typeFilter],
  );
  const itemsByDate = useMemo(() => groupByDateKey(filteredItems), [filteredItems]);
  const monthDays = useMemo(() => getMonthDays(viewMonth), [viewMonth]);
  const selectedDate = fromDateKey(selectedDateKey);
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDateKey]);
  const timelineDays = calendarMode === "day" ? [selectedDate] : weekDays;
  const periodTitle = useMemo(() => {
    if (calendarMode === "day") return formatDayTitle(selectedDate);
    if (calendarMode === "week") return formatWeekTitle(weekDays);
    return formatMonthTitle(viewMonth);
  }, [calendarMode, selectedDateKey, viewMonth, weekDays]);
  const selectedItems = itemsByDate.get(selectedDateKey) || [];
  const selectedUnfilteredItems = allItems.filter(
    (item) => item.dateKey === selectedDateKey,
  );
  const selectedCounts = countItemsByType(selectedItems);
  const selectedHiddenCount = Math.max(
    0,
    selectedUnfilteredItems.length - selectedItems.length,
  );
  const monthItems = filteredItems.filter(
    (item) =>
      item.date.getFullYear() === viewMonth.getFullYear() &&
      item.date.getMonth() === viewMonth.getMonth(),
  );
  const monthCounts = countItemsByType(monthItems);
  const monthHighPriorityCount = countOpenHighPriority(monthItems);
  const selectedHighPriorityCount = countOpenHighPriority(selectedItems);
  const taskCount = filteredItems.filter((item) => item.type === "task").length;
  const reminderCount = filteredItems.filter(
    (item) => item.type === "reminder",
  ).length;
  const overdueCount = allItems.filter(
    (item) => !item.done && item.date.getTime() < Date.now(),
  ).length;
  const hasActiveFilters = typeFilter !== "all" || priorityFilter !== "all";
  const filteredHiddenCount = Math.max(0, allItems.length - filteredItems.length);
  const composerCanSubmit = composerTitle.trim().length > 0;
  const hasImportSource = importSource.trim().length > 0;
  const importLineCount = useMemo(
    () => importSource.split(/\r?\n/).filter((line) => line.trim()).length,
    [importSource],
  );
  const importSourceLabel = importFileName
    ? importFileName
    : hasImportSource
      ? `${importLineCount} Zeilen bereit`
      : "Keine Quelle";

  const focusDate = useCallback((date: Date) => {
    const dateKey = toDateKey(date);
    setSelectedDateKey(dateKey);
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, []);

  const selectDate = useCallback(
    (dateKey: string) => {
      focusDate(fromDateKey(dateKey));
    },
    [focusDate],
  );

  const openDayPlanner = useCallback(() => {
    setDayPlannerOpen(true);
  }, []);

  const closeDayPlanner = useCallback(() => {
    setDayPlannerOpen(false);
  }, []);

  const focusComposer = useCallback((type: CalendarItemType) => {
    setComposerType(type);
    setComposerTitle("");
    setTimeout(() => {
      const input = dayPlannerOpen
        ? dayPlannerInputRef.current
        : composerInputRef.current;
      input?.focus();
    }, 0);
  }, [dayPlannerOpen]);

  const goToday = useCallback(() => {
    const now = new Date();
    focusDate(now);
  }, [focusDate]);

  const navigatePeriod = useCallback(
    (direction: -1 | 1) => {
      const current = fromDateKey(selectedDateKey);
      if (calendarMode === "day") {
        focusDate(addDays(current, direction));
        return;
      }
      if (calendarMode === "week") {
        focusDate(addDays(current, direction * 7));
        return;
      }

      const nextMonth = addMonths(viewMonth, direction);
      const day = Math.min(current.getDate(), getDaysInMonth(nextMonth));
      focusDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day));
    },
    [calendarMode, focusDate, selectedDateKey, viewMonth],
  );

  const clearFilters = useCallback(() => {
    setTypeFilter("all");
    setPriorityFilter("all");
  }, []);

  const clearImportSource = useCallback(() => {
    setImportSource("");
    setImportFileName("");
    setImportMessage("");
  }, []);

  const handleDropItem = useCallback(
    (rawItem: DragItem, targetDateKey: string, targetTimeValue?: string) => {
      const type = resolveDraggedType(rawItem);
      const id = rawItem.id;
      if (!type || !id) return;

      if (type === "task") {
        const task = useApp.getState().tasks.find((entry) => entry.id === id);
        if (!task) return;
        const nextDeadline = targetTimeValue
          ? combineDateAndTime(targetDateKey, targetTimeValue)
          : moveDateKeepingTime(targetDateKey, task.deadline, "17:00");
        updateTask(id, { deadline: nextDeadline });
        onTaskDrop?.({
          type: "task",
          id,
          dateKey: targetDateKey,
          datetime: nextDeadline,
          item: task,
        });
        return;
      }

      const reminder = useApp
        .getState()
        .reminders.find((entry) => entry.id === id);
      if (!reminder) return;
      const activeDate = reminder.snoozeUntil || reminder.datetime;
      const nextDate = targetTimeValue
        ? combineDateAndTime(targetDateKey, targetTimeValue)
        : moveDateKeepingTime(targetDateKey, activeDate, "09:00");
      updateReminder(id, reminder.snoozeUntil ? { snoozeUntil: nextDate } : { datetime: nextDate });
      onReminderDrop?.({
        type: "reminder",
        id,
        dateKey: targetDateKey,
        datetime: nextDate,
        item: reminder,
      });
    },
    [onReminderDrop, onTaskDrop, updateReminder, updateTask],
  );

  const submitComposer = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const title = composerTitle.trim();
      if (!title) return;
      const datetime = combineDateAndTime(selectedDateKey, composerTime);

      if (composerType === "task") {
        const tags = composerTags
          .split(/[,\s]+/)
          .map((tag) => tag.trim().replace(/^#/, ""))
          .filter(Boolean);
        const created = addTask(title, "todo", "", composerPriority);
        updateTask(created.id, { deadline: datetime, tags });
      } else {
        addRem({
          title,
          msg: "",
          datetime,
          repeat: composerRepeat,
        });
      }

      setComposerTitle("");
      setComposerTags("");
    },
    [
      addRem,
      addTask,
      composerPriority,
      composerRepeat,
      composerTags,
      composerTime,
      composerTitle,
      composerType,
      selectedDateKey,
      updateTask,
    ],
  );

  const toggleImport = useCallback(() => {
    setImportOpen((current) => {
      const next = !current;
      if (next) onImportClick?.();
      return next;
    });
  }, [onImportClick]);

  const runImport = useCallback(() => {
    const source = importSource.trim();
    if (!source) {
      setImportMessage("Fuege eine .ics-Datei ein oder waehle zuerst eine Datei.");
      return;
    }

    try {
      if (importMode === "tasks") {
        const result = mapIcsImport(source, "tasks");
        result.items.forEach((item) => {
          const created = addTask(item.title, item.status, item.desc, item.priority);
          updateTask(created.id, {
            deadline: item.deadline,
            tags: item.tags,
            notes: item.notes,
          });
        });

        const warningSuffix = result.warnings.length
          ? ` ${result.warnings.length} Hinweis${result.warnings.length === 1 ? "" : "e"}.`
          : "";
        setImportMessage(`${result.items.length} Aufgaben importiert.${warningSuffix}`);
        if (result.items.length > 0) {
          setImportSource("");
          setImportFileName("");
        }
      } else {
        const result = mapIcsImport(source, "reminders");
        result.items.forEach((item) => {
          addRem(item);
        });

        const warningSuffix = result.warnings.length
          ? ` ${result.warnings.length} Hinweis${result.warnings.length === 1 ? "" : "e"}.`
          : "";
        const skippedSuffix = result.skipped ? ` ${result.skipped} uebersprungen.` : "";
        setImportMessage(
          `${result.items.length} Erinnerungen importiert.${skippedSuffix}${warningSuffix}`,
        );
        if (result.items.length > 0) {
          setImportSource("");
          setImportFileName("");
        }
      }
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "Import fehlgeschlagen.",
      );
    }
  }, [addRem, addTask, importMode, importSource, updateTask]);

  const handleImportFile = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportSource(String(reader.result || ""));
      setImportFileName(file.name);
      setImportMessage(`${file.name} geladen. Modus waehlen und importieren.`);
    };
    reader.onerror = () => {
      setImportMessage(`${file.name} konnte nicht gelesen werden.`);
    };
    reader.readAsText(file);
  }, []);

  useEffect(() => {
    if (!dayPlannerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDayPlannerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dayPlannerOpen]);

  const renderDayPlan = (variant: CalendarDayPlanVariant) => {
    const isWindow = variant === "window";

    return (
      <>
        <div
          className={[
            "nx-calendar-agenda-head",
            isWindow ? "nx-calendar-dayplan-head" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div>
            <span>Tagesplan</span>
            <strong id={isWindow ? "nx-calendar-dayplan-title" : undefined}>
              {formatSelectedDate(selectedDate)}
            </strong>
            <div className="nx-calendar-agenda-kpis">
              <span>
                <CheckSquare size={10} />
                {selectedCounts.tasks}
              </span>
              <span>
                <Bell size={10} />
                {selectedCounts.reminders}
              </span>
              {selectedHighPriorityCount > 0 && (
                <span className="is-priority-high" title="Offene hohe Prioritaet">
                  <Flag size={10} />
                  {selectedHighPriorityCount}
                </span>
              )}
              {selectedHiddenCount > 0 && <span>{selectedHiddenCount} ausgeblendet</span>}
            </div>
          </div>
          <div className="nx-calendar-agenda-actions">
            {isWindow && (
              <div className="nx-calendar-dayplan-date-nav" aria-label="Tagesplan Datum">
                <button
                  type="button"
                  className="nx-calendar-icon-button"
                  onClick={() => focusDate(addDays(selectedDate, -1))}
                  aria-label="Vorheriger Tag"
                  title="Vorheriger Tag"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="nx-calendar-icon-button"
                  onClick={() => focusDate(addDays(selectedDate, 1))}
                  aria-label="Naechster Tag"
                  title="Naechster Tag"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
            <button
              type="button"
              className="nx-calendar-mini-button"
              onClick={() => focusComposer("task")}
            >
              <Plus size={13} />
              Aufgabe
            </button>
            <button
              type="button"
              className="nx-calendar-mini-button"
              onClick={() => focusComposer("reminder")}
            >
              <Bell size={13} />
              Erinnerung
            </button>
            {isWindow ? (
              <button
                type="button"
                className="nx-calendar-icon-button nx-calendar-dayplan-close"
                onClick={closeDayPlanner}
                aria-label="Tagesplan schliessen"
                title="Tagesplan schliessen"
              >
                <X size={15} />
              </button>
            ) : (
              <button
                type="button"
                className="nx-calendar-mini-button nx-calendar-dayplan-inline-open"
                onClick={openDayPlanner}
              >
                <Maximize2 size={13} />
                Tagesplan
              </button>
            )}
          </div>
        </div>

        {isWindow && (
          <form className="nx-calendar-dayplan-composer" onSubmit={submitComposer}>
            <div className="nx-calendar-segment nx-calendar-entry-type-switch nx-calendar-dayplan-entry-type-switch" aria-label="Eintragstyp">
              {(["task", "reminder"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={composerType === type ? "is-active" : ""}
                  onClick={() => focusComposer(type)}
                >
                  {type === "task" ? <CheckSquare size={13} /> : <Bell size={13} />}
                  <span>{TYPE_LABEL[type]}</span>
                </button>
              ))}
            </div>
            <div className="nx-calendar-composer-date nx-calendar-dayplan-date">
              <Calendar size={13} />
              <span>{formatShortDate(selectedDate)}</span>
            </div>
            <input
              ref={dayPlannerInputRef}
              className="nx-calendar-title-input nx-calendar-dayplan-title-input"
              value={composerTitle}
              onChange={(event) => setComposerTitle(event.target.value)}
              placeholder={`Neue ${TYPE_LABEL[composerType].toLowerCase()}`}
              aria-label={`${TYPE_LABEL[composerType]} Titel`}
            />
            {composerTitle && (
              <button
                type="button"
                className="nx-calendar-icon-button nx-calendar-clear-button nx-calendar-dayplan-clear-button"
                onClick={() => setComposerTitle("")}
                aria-label="Titel leeren"
                title="Titel leeren"
              >
                <X size={13} />
              </button>
            )}
            <input
              className="nx-calendar-time-input"
              type="time"
              value={composerTime}
              onChange={(event) => setComposerTime(event.target.value)}
              aria-label="Zeit"
            />
            {composerType === "task" && (
              <select
                value={composerPriority}
                onChange={(event) =>
                  setComposerPriority(event.target.value as Task["priority"])
                }
                aria-label="Aufgabenprioritaet"
              >
                <option value="low">Niedrig</option>
                <option value="mid">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            )}
            {composerType === "task" ? (
              <input
                className="nx-calendar-tags-input"
                value={composerTags}
                onChange={(event) => setComposerTags(event.target.value)}
                placeholder="#tag"
                aria-label="Aufgabentags"
              />
            ) : (
              <select
                value={composerRepeat}
                onChange={(event) =>
                  setComposerRepeat(event.target.value as Reminder["repeat"])
                }
                aria-label="Erinnerung wiederholen"
              >
                <option value="none">Einmalig</option>
                <option value="daily">Taeglich</option>
                <option value="weekly">Woechentlich</option>
                <option value="monthly">Monatlich</option>
              </select>
            )}
            <button
              type="submit"
              className="nx-calendar-add-button"
              disabled={!composerCanSubmit}
            >
              <Plus size={14} />
              Erstellen
            </button>
          </form>
        )}

        <DropAgenda dateKey={selectedDateKey} onDropItem={handleDropItem}>
          {selectedItems.length === 0 ? (
            <div className={`nx-calendar-empty ${isWindow ? "nx-calendar-dayplan-empty" : ""}`}>
              <Calendar size={22} />
              <span>
                {selectedHiddenCount > 0
                  ? "Durch Filter ausgeblendet"
                  : hasActiveFilters
                    ? "Keine Treffer"
                    : "Freier Tag"}
              </span>
              <small>
                {selectedHiddenCount > 0
                  ? "Filter loeschen, um geplante Eintraege zu sehen."
                  : "Erstelle eine Aufgabe oder Erinnerung fuer dieses Datum."}
              </small>
              <div className="nx-calendar-empty-actions">
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters}>
                    <X size={12} />
                    Reset
                  </button>
                )}
                <button type="button" onClick={() => focusComposer("task")}>
                  <Plus size={12} />
                  Aufgabe
                </button>
                <button type="button" onClick={() => focusComposer("reminder")}>
                  <Bell size={12} />
                  Erinnerung
                </button>
              </div>
            </div>
          ) : (
            <div
              className={[
                "nx-calendar-agenda-list",
                isWindow ? "nx-calendar-dayplan-list" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {selectedItems.map((item) => (
                <CalendarCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  density={density}
                  variant="agenda"
                />
              ))}
            </div>
          )}
        </DropAgenda>
      </>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className={`nx-calendar-view nx-release-view nx-calendar-density-${density} nx-calendar-mode-${calendarMode}`}
        style={
          {
            "--nx-calendar-accent": theme.accent,
            "--nx-calendar-accent-rgb": rgb,
          } as React.CSSProperties
        }
      >
        <div className="nx-calendar-topbar nx-release-toolbar">
          <div className="nx-calendar-toolbar-row nx-calendar-toolbar-main">
            <div className="nx-calendar-nav">
              <button
                type="button"
                className="nx-calendar-icon-button"
                onClick={() => navigatePeriod(-1)}
                aria-label={PREVIOUS_PERIOD_LABEL[calendarMode]}
                title={PREVIOUS_PERIOD_LABEL[calendarMode]}
              >
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="nx-calendar-today-button" onClick={goToday}>
                Heute
              </button>
              <button
                type="button"
                className="nx-calendar-icon-button"
                onClick={() => navigatePeriod(1)}
                aria-label={NEXT_PERIOD_LABEL[calendarMode]}
                title={NEXT_PERIOD_LABEL[calendarMode]}
              >
                <ChevronRight size={16} />
              </button>
              <div className="nx-calendar-title">
                <Calendar size={16} />
                <span>{periodTitle}</span>
              </div>
            </div>

            <div className="nx-calendar-segment nx-calendar-mode-switch" aria-label="Kalenderansicht">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={calendarMode === mode ? "is-active" : ""}
                  onClick={() => setCalendarMode(mode)}
                >
                  {VIEW_LABEL[mode]}
                </button>
              ))}
            </div>

            <div className="nx-calendar-selected-pill" title={formatSelectedDate(selectedDate)}>
              <Clock size={13} />
              <span>{formatShortDate(selectedDate)}</span>
              <strong>{selectedItems.length}</strong>
            </div>

            <div className="nx-calendar-controls">
              <button
                type="button"
                className={`nx-calendar-dayplan-button ${dayPlannerOpen ? "is-active" : ""}`}
                onClick={openDayPlanner}
                aria-haspopup="dialog"
                aria-expanded={dayPlannerOpen}
              >
                <Maximize2 size={14} />
                Tagesplan
                <strong>{selectedItems.length}</strong>
              </button>
              <button
                type="button"
                className={`nx-calendar-import-button ${importOpen ? "is-active" : ""}`}
                onClick={toggleImport}
                aria-label={importOpen ? "Import schliessen" : "ICS importieren"}
                title={importOpen ? "Import schliessen" : "ICS importieren"}
              >
                {importOpen ? <X size={13} /> : <Upload size={13} />}
                Import
              </button>
              <label className="nx-calendar-filter-field nx-calendar-filter-field-type">
                <ListFilter size={13} />
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as CalendarTypeFilter)
                  }
                  aria-label="Typfilter"
                >
                  <option value="all">Alle</option>
                  <option value="task">Aufgaben</option>
                  <option value="reminder">Erinnerungen</option>
                </select>
              </label>
              <label className="nx-calendar-filter-field nx-calendar-filter-field-priority">
                <Flag size={13} />
                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value as CalendarPriorityFilter)
                  }
                  aria-label="Prioritaetsfilter"
                >
                  <option value="all">Prioritaet</option>
                  <option value="low">Niedrig</option>
                  <option value="mid">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </label>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="nx-calendar-mini-button nx-calendar-clear-filter"
                  onClick={clearFilters}
                >
                  <X size={12} />
                  Filter aus
                </button>
              )}
              <div className="nx-calendar-segment nx-calendar-density-switch" aria-label="Dichte">
                {(["comfortable", "compact"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={density === mode ? "is-active" : ""}
                    onClick={() => setDensity(mode)}
                  >
                    {mode === "comfortable" ? "Locker" : "Kompakt"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form className="nx-calendar-composer" onSubmit={submitComposer}>
            <div className="nx-calendar-segment nx-calendar-entry-type-switch" aria-label="Eintragstyp">
              {(["task", "reminder"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={composerType === type ? "is-active" : ""}
                  onClick={() => setComposerType(type)}
                >
                  {type === "task" ? <CheckSquare size={13} /> : <Bell size={13} />}
                  <span>{TYPE_LABEL[type]}</span>
                </button>
              ))}
            </div>
            <div className="nx-calendar-composer-date">
              <Calendar size={13} />
              <span>{formatShortDate(selectedDate)}</span>
            </div>
            <input
              ref={composerInputRef}
              className="nx-calendar-title-input"
              value={composerTitle}
              onChange={(event) => setComposerTitle(event.target.value)}
              placeholder={`Neue ${TYPE_LABEL[composerType].toLowerCase()}`}
              aria-label={`${TYPE_LABEL[composerType]} Titel`}
            />
            {composerTitle && (
              <button
                type="button"
                className="nx-calendar-icon-button nx-calendar-clear-button"
                onClick={() => setComposerTitle("")}
                aria-label="Titel leeren"
                title="Titel leeren"
              >
                <X size={13} />
              </button>
            )}
            <input
              className="nx-calendar-time-input"
              type="time"
              value={composerTime}
              onChange={(event) => setComposerTime(event.target.value)}
              aria-label="Zeit"
            />
            {composerType === "task" && (
              <select
                value={composerPriority}
                onChange={(event) =>
                  setComposerPriority(event.target.value as Task["priority"])
                }
                aria-label="Aufgabenprioritaet"
              >
                <option value="low">Niedrig</option>
                <option value="mid">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            )}
            {composerType === "task" ? (
              <input
                className="nx-calendar-tags-input"
                value={composerTags}
                onChange={(event) => setComposerTags(event.target.value)}
                placeholder="#tag"
                aria-label="Aufgabentags"
              />
            ) : (
              <select
                value={composerRepeat}
                onChange={(event) =>
                  setComposerRepeat(event.target.value as Reminder["repeat"])
                }
                aria-label="Erinnerung wiederholen"
              >
                <option value="none">Einmalig</option>
                <option value="daily">Taeglich</option>
                <option value="weekly">Woechentlich</option>
                <option value="monthly">Monatlich</option>
              </select>
            )}
            <button
              type="submit"
              className="nx-calendar-add-button"
              disabled={!composerCanSubmit}
            >
              <Plus size={14} />
              Erstellen
            </button>
          </form>
        </div>

        {importOpen && (
          <div
            className="nx-calendar-import-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setImportOpen(false);
            }}
          >
            <div
              className="nx-calendar-import-dialog"
              role="dialog"
              aria-label="Kalender-Import"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Glass className="nx-calendar-import-panel nx-calendar-import-panel--drawer">
                <div className="nx-calendar-import-copy">
                  <strong>Importquelle</strong>
                  <span>{importSourceLabel}</span>
                </div>
                <div className="nx-calendar-import-fields">
                  <select
                    value={importMode}
                    onChange={(event) => setImportMode(event.target.value as IcsImportMode)}
                    aria-label="Import-Zuordnung"
                  >
                    <option value="reminders">Als Erinnerungen</option>
                    <option value="tasks">Als Aufgaben</option>
                  </select>
                  <label className="nx-calendar-file-button">
                    <Upload size={13} />
                    Datei
                    <input
                      type="file"
                      accept=".ics,text/calendar,text/plain"
                      onChange={(event) => handleImportFile(event.target.files?.[0] || null)}
                    />
                  </label>
                  {hasImportSource && (
                    <button type="button" onClick={clearImportSource}>
                      <X size={13} />
                      Leeren
                    </button>
                  )}
                  <button type="button" onClick={runImport} disabled={!hasImportSource}>
                    <Upload size={13} />
                    Import
                  </button>
                  <button
                    type="button"
                    className="nx-calendar-icon-button nx-calendar-import-close"
                    onClick={() => setImportOpen(false)}
                    aria-label="Import schliessen"
                    title="Import schliessen"
                  >
                    <X size={13} />
                  </button>
                </div>
                <textarea
                  value={importSource}
                  onChange={(event) => {
                    setImportSource(event.target.value);
                    setImportFileName("");
                  }}
                  placeholder="BEGIN:VCALENDAR&#10;BEGIN:VEVENT&#10;SUMMARY:Planung..."
                />
                {importMessage && <p>{importMessage}</p>}
              </Glass>
            </div>
          </div>
        )}

        <div className="nx-calendar-stats nx-release-strip">
          <span>
            <ListFilter size={12} />
            <strong>{filteredItems.length}</strong> sichtbar
          </span>
          <span>
            <CheckSquare size={12} />
            <strong>{taskCount}</strong> Aufgaben
          </span>
          <span>
            <Bell size={12} />
            <strong>{reminderCount}</strong> Erinnerungen
          </span>
          <span className={overdueCount > 0 ? "is-hot" : ""}>
            <Clock size={12} />
            <strong>{overdueCount}</strong> faellig
          </span>
          {hasActiveFilters && (
            <span>
              <X size={12} />
              <strong>{filteredHiddenCount}</strong> ausgeblendet
            </span>
          )}
        </div>

        <div className={`nx-calendar-shell nx-calendar-shell-${calendarMode}`}>
          {calendarMode === "month" ? (
            <Glass className="nx-calendar-month-panel">
              <div className="nx-calendar-panel-head nx-calendar-month-head">
                <div>
                  <span>Monat</span>
                  <strong>{formatMonthTitle(viewMonth)}</strong>
                </div>
                <div className="nx-calendar-panel-metrics">
                  <span>
                    <CheckSquare size={11} />
                    {monthCounts.tasks}
                  </span>
                  <span>
                    <Bell size={11} />
                    {monthCounts.reminders}
                  </span>
                  {monthHighPriorityCount > 0 && (
                    <span className="is-priority-high" title="Offene hohe Prioritaet">
                      <Flag size={11} />
                      {monthHighPriorityCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="nx-calendar-weekdays" aria-hidden="true">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="nx-calendar-grid">
                {monthDays.map((day) => {
                  const dateKey = toDateKey(day);
                  return (
                    <CalendarDayCell
                      key={dateKey}
                      day={day}
                      items={itemsByDate.get(dateKey) || []}
                      density={density}
                      selected={dateKey === selectedDateKey}
                      today={dateKey === todayKey}
                      inCurrentMonth={day.getMonth() === viewMonth.getMonth()}
                      onSelect={selectDate}
                      onDropItem={handleDropItem}
                    />
                  );
                })}
              </div>
            </Glass>
          ) : (
            <CalendarTimeline
              mode={calendarMode}
              days={timelineDays}
              itemsByDate={itemsByDate}
              selectedDateKey={selectedDateKey}
              todayKey={todayKey}
              density={density}
              onSelect={selectDate}
              onDropItem={handleDropItem}
            />
          )}

        </div>

        {dayPlannerOpen && (
          <div
            className="nx-calendar-dayplan-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDayPlanner();
            }}
          >
            <div
              className="nx-calendar-dayplan-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="nx-calendar-dayplan-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Glass className="nx-calendar-dayplan-window" type="modal">
                {renderDayPlan("window")}
              </Glass>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

export default CalendarView;
