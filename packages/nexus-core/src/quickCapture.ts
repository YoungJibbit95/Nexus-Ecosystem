export type CaptureIntentType = "note" | "task" | "reminder" | "code" | "canvas";

export type CaptureIntent = {
  type: CaptureIntentType;
  title?: string;
  targetView?: string;
};

const DEFAULT_TARGET_VIEW: Record<CaptureIntentType, string> = {
  note: "notes",
  task: "tasks",
  reminder: "reminders",
  code: "code",
  canvas: "canvas",
};

export const createCaptureIntent = (
  type: CaptureIntentType,
  payload?: Partial<Pick<CaptureIntent, "title" | "targetView">>,
): CaptureIntent => ({
  type,
  title: typeof payload?.title === "string" ? payload.title : undefined,
  targetView:
    typeof payload?.targetView === "string" && payload.targetView.trim().length > 0
      ? payload.targetView
      : DEFAULT_TARGET_VIEW[type],
});

export const parseCaptureIntentFromQuery = (queryRaw: string): CaptureIntent | null => {
  const query = String(queryRaw || "").trim();
  if (!query) return null;

  const delimiterIndex = query.indexOf(":");
  if (delimiterIndex < 0) return null;
  const rawType = query.slice(0, delimiterIndex).trim().toLowerCase();
  if (!["note", "task", "reminder", "rem", "code", "canvas"].includes(rawType)) return null;

  const rawTitle = query.slice(delimiterIndex + 1);
  if (rawTitle.includes("\r") || rawTitle.includes("\n") || rawTitle.includes("\u2028") || rawTitle.includes("\u2029")) {
    return null;
  }
  const type = (rawType === "rem" ? "reminder" : rawType) as CaptureIntentType;
  const title = rawTitle.trim() || undefined;
  return createCaptureIntent(type, { title });
};
