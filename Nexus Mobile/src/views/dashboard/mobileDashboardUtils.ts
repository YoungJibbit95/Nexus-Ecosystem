import type { DashboardWidget, DashboardWidgetId } from "../../store/appStore";

export const DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  "stats",
  "quick",
  "tasks",
  "reminders",
  "notes",
  "activity",
  "chart",
  "calendar",
];

const DASHBOARD_WIDGET_DEFAULTS: Record<
  DashboardWidgetId,
  Pick<DashboardWidget, "label" | "icon">
> = {
  stats: { label: "Stats", icon: "📊" },
  quick: { label: "Quick Actions", icon: "⚡" },
  tasks: { label: "Tasks", icon: "✅" },
  reminders: { label: "Reminders", icon: "🔔" },
  notes: { label: "Recent Notes", icon: "📝" },
  activity: { label: "Activity", icon: "📡" },
  chart: { label: "Progress", icon: "📈" },
  calendar: { label: "Calendar", icon: "📅" },
};

const DASHBOARD_WIDGET_ORDER_INDEX: Record<DashboardWidgetId, number> =
  DASHBOARD_WIDGET_ORDER.reduce(
    (acc, id, index) => {
      acc[id] = index;
      return acc;
    },
    {} as Record<DashboardWidgetId, number>,
  );

export type MobileLayoutPreset = "balanced" | "focus" | "planning";

export type MobileDragState = {
  widgetId: DashboardWidgetId;
  pointerId: number;
  targetWidgetId: DashboardWidgetId | null;
  clientX: number;
  clientY: number;
};

export function normalizeDashboardWidgets(
  input: DashboardWidget[],
): DashboardWidget[] {
  const byId = new Map(input.map((widget) => [widget.id, widget]));
  const merged = DASHBOARD_WIDGET_ORDER.map((id, fallbackOrder) => {
    const stored = byId.get(id);
    const hasOrder =
      typeof stored?.order === "number" && Number.isFinite(stored.order);
    return {
      id,
      label: stored?.label ?? DASHBOARD_WIDGET_DEFAULTS[id].label,
      icon: stored?.icon ?? DASHBOARD_WIDGET_DEFAULTS[id].icon,
      span: stored?.span === 2 ? 2 : 1,
      visible: stored?.visible !== false,
      order: hasOrder ? stored.order : fallbackOrder,
    } satisfies DashboardWidget;
  });

  return merged
    .sort(
      (a, b) =>
        a.order - b.order ||
        DASHBOARD_WIDGET_ORDER_INDEX[a.id] - DASHBOARD_WIDGET_ORDER_INDEX[b.id],
    )
    .map((widget, index) => ({ ...widget, order: index }));
}

const widgetSignature = (widget: DashboardWidget): string =>
  `${widget.id}:${widget.order}:${widget.span}:${widget.visible ? 1 : 0}`;

export const isSameWidgetLayout = (
  a: DashboardWidget[],
  b: DashboardWidget[],
): boolean => {
  if (a.length !== b.length) return false;
  const right = new Map(b.map((widget) => [widget.id, widget]));
  for (const left of a) {
    const rightWidget = right.get(left.id);
    if (!rightWidget) return false;
    if (widgetSignature(left) !== widgetSignature(rightWidget)) return false;
  }
  return true;
};

export const buildMobilePresetLayout = (
  preset: MobileLayoutPreset,
  widgets: DashboardWidget[],
): DashboardWidget[] => {
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  const patch = (
    id: DashboardWidgetId,
    next: Partial<DashboardWidget>,
  ): DashboardWidget => ({
    ...(byId.get(id) || {
      id,
      label: DASHBOARD_WIDGET_DEFAULTS[id].label,
      icon: DASHBOARD_WIDGET_DEFAULTS[id].icon,
      span: 1,
      visible: true,
      order: DASHBOARD_WIDGET_ORDER_INDEX[id],
    }),
    ...next,
  });

  if (preset === "focus") {
    return normalizeDashboardWidgets([
      patch("stats", { span: 2, visible: true, order: 0 }),
      patch("tasks", { span: 2, visible: true, order: 1 }),
      patch("notes", { span: 2, visible: true, order: 2 }),
      patch("reminders", { span: 1, visible: true, order: 3 }),
      patch("quick", { span: 1, visible: true, order: 4 }),
      patch("activity", { span: 1, visible: false, order: 5 }),
      patch("chart", { span: 1, visible: false, order: 6 }),
      patch("calendar", { span: 1, visible: false, order: 7 }),
    ]);
  }

  if (preset === "planning") {
    return normalizeDashboardWidgets([
      patch("stats", { span: 2, visible: true, order: 0 }),
      patch("calendar", { span: 1, visible: true, order: 1 }),
      patch("reminders", { span: 1, visible: true, order: 2 }),
      patch("tasks", { span: 2, visible: true, order: 3 }),
      patch("notes", { span: 1, visible: true, order: 4 }),
      patch("activity", { span: 1, visible: true, order: 5 }),
      patch("quick", { span: 2, visible: true, order: 6 }),
      patch("chart", { span: 1, visible: false, order: 7 }),
    ]);
  }

  return normalizeDashboardWidgets([
    patch("stats", { span: 2, visible: true, order: 0 }),
    patch("quick", { span: 2, visible: true, order: 1 }),
    patch("tasks", { span: 1, visible: true, order: 2 }),
    patch("reminders", { span: 1, visible: true, order: 3 }),
    patch("notes", { span: 1, visible: true, order: 4 }),
    patch("activity", { span: 1, visible: true, order: 5 }),
    patch("chart", { span: 1, visible: false, order: 6 }),
    patch("calendar", { span: 1, visible: true, order: 7 }),
  ]);
};

export const asObjectArray = <T extends Record<string, unknown>>(
  value: unknown,
): T[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is T => Boolean(entry) && typeof entry === "object",
      )
    : [];
