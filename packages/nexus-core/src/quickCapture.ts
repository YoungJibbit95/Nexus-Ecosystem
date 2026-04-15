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
  const match = /^(note|task|reminder|rem|code|canvas)\s*:\s*(.*)$/i.exec(query);
  if (!match) return null;
  const rawType = match[1].toLowerCase();
  const type = (rawType === "rem" ? "reminder" : rawType) as CaptureIntentType;
  const title = match[2]?.trim() || undefined;
  return createCaptureIntent(type, { title });
};
