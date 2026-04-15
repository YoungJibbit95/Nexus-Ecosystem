import {
  assignGridByOrder,
  normalizeLayout,
  type Widget,
  type WidgetId,
} from "./dashboardLayout";

export type LayoutPreset = "balanced" | "focus" | "planning";

export const asObjectArray = <T extends Record<string, unknown>>(
  value: unknown,
): T[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is T => Boolean(entry) && typeof entry === "object",
      )
    : [];

const widgetSignature = (widget: Widget): string =>
  `${widget.id}:${widget.x}:${widget.y}:${widget.span}:${widget.visible ? 1 : 0}:${widget.order}`;

export const isSameLayout = (a: Widget[], b: Widget[]): boolean => {
  if (a.length !== b.length) return false;
  const right = new Map(b.map((widget) => [widget.id, widget]));
  for (const left of a) {
    const rightWidget = right.get(left.id);
    if (!rightWidget) return false;
    if (widgetSignature(left) !== widgetSignature(rightWidget)) return false;
  }
  return true;
};

export const buildPresetLayout = (
  preset: LayoutPreset,
  widgets: Widget[],
): Widget[] => {
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  const patch = (id: WidgetId, next: Partial<Widget>): Widget => ({
    ...byId.get(id)!,
    ...next,
  });
  if (preset === "focus") {
    return normalizeLayout(
      assignGridByOrder([
        patch("stats", { span: 2, visible: true, order: 0 }),
        patch("tasks", { span: 2, visible: true, order: 1 }),
        patch("notes", { span: 2, visible: true, order: 2 }),
        patch("reminders", { span: 1, visible: true, order: 3 }),
        patch("quick", { span: 1, visible: true, order: 4 }),
        patch("activity", { span: 1, visible: false, order: 5 }),
        patch("chart", { span: 1, visible: false, order: 6 }),
        patch("calendar", { span: 1, visible: false, order: 7 }),
      ]),
    );
  }
  if (preset === "planning") {
    return normalizeLayout(
      assignGridByOrder([
        patch("stats", { span: 2, visible: true, order: 0 }),
        patch("calendar", { span: 1, visible: true, order: 1 }),
        patch("reminders", { span: 1, visible: true, order: 2 }),
        patch("tasks", { span: 2, visible: true, order: 3 }),
        patch("notes", { span: 1, visible: true, order: 4 }),
        patch("activity", { span: 1, visible: true, order: 5 }),
        patch("quick", { span: 2, visible: true, order: 6 }),
        patch("chart", { span: 1, visible: false, order: 7 }),
      ]),
    );
  }
  return normalizeLayout(
    assignGridByOrder([
      patch("stats", { span: 2, visible: true, order: 0 }),
      patch("quick", { span: 2, visible: true, order: 1 }),
      patch("tasks", { span: 1, visible: true, order: 2 }),
      patch("reminders", { span: 1, visible: true, order: 3 }),
      patch("notes", { span: 1, visible: true, order: 4 }),
      patch("activity", { span: 1, visible: true, order: 5 }),
      patch("chart", { span: 1, visible: false, order: 6 }),
      patch("calendar", { span: 1, visible: true, order: 7 }),
    ]),
  );
};
