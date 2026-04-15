export const LAYOUT_STORAGE_KEY = "nx-dashboard-layout-v3";

export type WidgetId =
  | "stats"
  | "tasks"
  | "reminders"
  | "notes"
  | "quick"
  | "activity"
  | "chart"
  | "calendar";
export type GridCell = { x: 1 | 2; y: number };
export const SNAP_ROW_HEIGHT = 170;
const SNAP_EXTRA_ROWS = 4;

export interface Widget {
  id: WidgetId;
  label: string;
  icon: string;
  span: 1 | 2;
  x: 1 | 2;
  y: number;
  visible: boolean;
  order: number;
}

export const DEFAULT_WIDGETS: Widget[] = [
  {
    id: "stats",
    label: "Stats",
    icon: "📊",
    span: 2,
    x: 1,
    y: 1,
    visible: true,
    order: 0,
  },
  {
    id: "notes",
    label: "Notes",
    icon: "📝",
    span: 1,
    x: 1,
    y: 2,
    visible: true,
    order: 1,
  },
  {
    id: "reminders",
    label: "Reminders",
    icon: "🔔",
    span: 1,
    x: 2,
    y: 2,
    visible: true,
    order: 2,
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: "✅",
    span: 1,
    x: 1,
    y: 3,
    visible: true,
    order: 3,
  },
  {
    id: "activity",
    label: "Activity",
    icon: "📡",
    span: 1,
    x: 2,
    y: 3,
    visible: true,
    order: 4,
  },
  {
    id: "quick",
    label: "Quick Access",
    icon: "⚡",
    span: 2,
    x: 1,
    y: 4,
    visible: false,
    order: 5,
  },
  {
    id: "chart",
    label: "Progress Chart",
    icon: "📈",
    span: 1,
    x: 1,
    y: 5,
    visible: false,
    order: 6,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: "🗓️",
    span: 1,
    x: 2,
    y: 5,
    visible: false,
    order: 7,
  },
];

export const cloneDefaultWidgets = () =>
  DEFAULT_WIDGETS.map((widget) => ({ ...widget }));

export const cellKey = (y: number, x: 1 | 2) => `${y}:${x}`;
export const clampX = (x: number, span: 1 | 2): 1 | 2 =>
  span === 2 ? 1 : x >= 2 ? 2 : 1;
export const getSnapRowLimit = (visibleCount: number) =>
  Math.max(6, visibleCount + SNAP_EXTRA_ROWS);

export function assignGridByOrder(list: Widget[]): Widget[] {
  const ordered = [...list].sort((a, b) => a.order - b.order);
  const visible = ordered.filter((w) => w.visible);
  const hidden = ordered.filter((w) => !w.visible);

  let row = 1;
  let nextCol: 1 | 2 = 1;

  const flowedVisible = visible.map((w) => {
    const span = (w.span === 2 ? 2 : 1) as 1 | 2;
    if (span === 2) {
      if (nextCol === 2) {
        row += 1;
      }
      const placed = { ...w, span, x: 1 as 1 | 2, y: row };
      row += 1;
      nextCol = 1;
      return placed;
    }

    const placed = { ...w, span, x: nextCol, y: row };
    if (nextCol === 1) {
      nextCol = 2;
    } else {
      nextCol = 1;
      row += 1;
    }
    return placed;
  });

  return [...flowedVisible, ...hidden];
}

function compactGrid(list: Widget[]): Widget[] {
  const ordered = [...list].sort((a, b) => a.order - b.order);
  const visible = ordered.filter((w) => w.visible);
  const hidden = ordered.filter((w) => !w.visible);
  const occupied = new Set<string>();

  const placedVisible = visible.map((raw) => {
    const span = (raw.span === 2 ? 2 : 1) as 1 | 2;
    const desiredX = clampX(raw.x, span);
    let y = 1;

    while (true) {
      if (span === 2) {
        if (!occupied.has(cellKey(y, 1)) && !occupied.has(cellKey(y, 2))) {
          break;
        }
      } else if (!occupied.has(cellKey(y, desiredX))) {
        break;
      }
      y += 1;
    }

    if (span === 2) {
      occupied.add(cellKey(y, 1));
      occupied.add(cellKey(y, 2));
      return { ...raw, span, x: 1 as 1 | 2, y };
    }

    occupied.add(cellKey(y, desiredX));
    return { ...raw, span, x: desiredX, y };
  });

  const sortedVisible = [...placedVisible].sort((a, b) => a.y - b.y || a.x - b.x);
  const reOrderedVisible = sortedVisible.map((w, i) => ({ ...w, order: i }));
  const reOrderedHidden = hidden.map((w, i) => ({
    ...w,
    order: reOrderedVisible.length + i,
  }));
  return [...reOrderedVisible, ...reOrderedHidden];
}

export function normalizeLayout(list: Widget[]): Widget[] {
  const ordered = [...list].sort((a, b) => a.order - b.order);
  const hasStoredGrid = ordered.every(
    (w) => Number.isFinite((w as any).x) && Number.isFinite((w as any).y),
  );
  const base = ordered.map((w, i) => {
    const span = (w.span === 2 ? 2 : 1) as 1 | 2;
    return {
      ...w,
      span,
      x: clampX(Number((w as any).x ?? 1), span),
      y: Math.max(1, Math.floor(Number((w as any).y ?? 1))),
      order: i,
    };
  });

  const withGrid = hasStoredGrid ? base : assignGridByOrder(base);
  return compactGrid(withGrid);
}

export function reorderLayoutByGrid(list: Widget[]): Widget[] {
  const normalized = normalizeLayout(list);
  const visible = normalized
    .filter((w) => w.visible)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((w, i) => ({ ...w, order: i }));
  const hidden = normalized
    .filter((w) => !w.visible)
    .map((w, i) => ({ ...w, order: visible.length + i }));
  return normalizeLayout([...visible, ...hidden]);
}
