import {
  NOTES_MAGIC_DEFINITIONS,
  buildNotesMagicSnippet,
  type NotesMagicDefinition,
} from "@nexus/core/notes/magicRegistry";

export type NotesTaskMagicPayload = {
  title: string;
  status: "todo" | "doing" | "done";
  priority: "low" | "mid" | "high";
  deadline?: string;
  desc: string;
  linkedTaskId?: string;
};

export type NotesReminderMagicPayload = {
  title: string;
  datetime: string;
  repeat: "none" | "daily" | "weekly" | "monthly";
  msg: string;
  linkedReminderId?: string;
  linkedTaskId?: string;
};

export type NotesMagicFenceRange = {
  start: number;
  end: number;
  bodyStart: number;
  bodyEnd: number;
  hasBodyTrailingNewline: boolean;
};

const TASK_STATUSES = new Set(["todo", "doing", "done"]);
const TASK_PRIORITIES = new Set(["low", "mid", "high"]);
const REMINDER_REPEATS = new Set(["none", "daily", "weekly", "monthly"]);

export const NOTES_PLANNING_MAGIC_DEFINITIONS: NotesMagicDefinition[] = [
  {
    id: "nexus-task",
    label: "Task Link",
    icon: "T",
    desc: "Task skizzieren und mit Notes verknuepfen",
    color: "#30D158",
    fields: [
      {
        key: "title",
        label: "Titel",
        multiline: false,
        placeholder: "Release Smoke-Test ausfuehren",
      },
      {
        key: "status",
        label: "Status (todo / doing / done)",
        multiline: false,
        placeholder: "todo",
      },
      {
        key: "priority",
        label: "Prioritaet (low / mid / high)",
        multiline: false,
        placeholder: "mid",
      },
      {
        key: "deadline",
        label: "Faelligkeit (optional, YYYY-MM-DD)",
        multiline: false,
        placeholder: "",
      },
      {
        key: "desc",
        label: "Beschreibung",
        multiline: true,
        placeholder: "Was muss erledigt werden, und woran ist Done erkennbar?",
      },
    ],
    template:
      "\n```nexus-task\n{{title}} | {{status}} | {{priority}} | {{deadline}}\n{{desc}}\n```\n",
  },
  {
    id: "nexus-reminder",
    label: "Reminder Link",
    icon: "R",
    desc: "Reminder planen und mit Notes verknuepfen",
    color: "#FF9F0A",
    fields: [
      {
        key: "title",
        label: "Titel",
        multiline: false,
        placeholder: "Follow-up pruefen",
      },
      {
        key: "datetime",
        label: "Zeitpunkt (ISO oder lokal parsebar)",
        multiline: false,
        placeholder: "+1h",
      },
      {
        key: "repeat",
        label: "Wiederholung (none / daily / weekly / monthly)",
        multiline: false,
        placeholder: "none",
      },
      {
        key: "msg",
        label: "Nachricht",
        multiline: true,
        placeholder: "Woran soll Nexus dich erinnern?",
      },
    ],
    template:
      "\n```nexus-reminder\n{{title}} | {{datetime}} | {{repeat}}\n{{msg}}\n```\n",
  },
];

export const NOTES_MAGIC_DEFINITIONS_WITH_PLANNING: NotesMagicDefinition[] = [
  ...NOTES_MAGIC_DEFINITIONS,
  ...NOTES_PLANNING_MAGIC_DEFINITIONS,
];

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const next = values[key];
    return typeof next === "string" && next.length > 0 ? next : "";
  });
}

export function buildNotesMagicSnippetWithPlanning(
  templateId: string,
  values: Record<string, string>,
) {
  const localDefinition = NOTES_PLANNING_MAGIC_DEFINITIONS.find(
    (entry) => entry.id === templateId,
  );
  if (localDefinition) return fillTemplate(localDefinition.template, values);
  return buildNotesMagicSnippet(templateId, values);
}

function normalizeMagicBody(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\n$/, "");
}

function cleanLinkedId(value: string | undefined, prefixes: string[]) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) return trimmed.slice(prefix.length).trim();
  }
  return trimmed;
}

export function parseNotesTaskMagic(content: string): NotesTaskMagicPayload {
  const [head = "", ...bodyLines] = normalizeMagicBody(content).split("\n");
  const parts = head.split("|").map((part) => part.trim());
  const status = TASK_STATUSES.has(parts[1])
    ? (parts[1] as NotesTaskMagicPayload["status"])
    : "todo";
  const priority = TASK_PRIORITIES.has(parts[2])
    ? (parts[2] as NotesTaskMagicPayload["priority"])
    : "mid";
  const deadlineOrId = parts[3];
  const linkedTaskId =
    cleanLinkedId(parts[4], ["task:", "task=", "id:", "id="]) ||
    (deadlineOrId?.toLowerCase().startsWith("task:")
      ? cleanLinkedId(deadlineOrId, ["task:", "task=", "id:", "id="])
      : undefined);
  const deadline =
    deadlineOrId && !deadlineOrId.toLowerCase().startsWith("task:")
      ? deadlineOrId
      : undefined;

  return {
    title: parts[0] || "Linked Task",
    status,
    priority,
    deadline,
    desc: bodyLines.join("\n").trim(),
    linkedTaskId,
  };
}

export function serializeNotesTaskMagic(payload: NotesTaskMagicPayload) {
  const head = [
    payload.title,
    payload.status,
    payload.priority,
    payload.deadline ?? "",
    payload.linkedTaskId ? `task:${payload.linkedTaskId}` : "",
  ]
    .join(" | ")
    .replace(/( \| )+$/u, "");
  return `${head}\n${payload.desc}`.trimEnd();
}

export function parseNotesReminderMagic(
  content: string,
): NotesReminderMagicPayload {
  const [head = "", ...bodyLines] = normalizeMagicBody(content).split("\n");
  const parts = head.split("|").map((part) => part.trim());
  const repeat = REMINDER_REPEATS.has(parts[2])
    ? (parts[2] as NotesReminderMagicPayload["repeat"])
    : "none";

  return {
    title: parts[0] || "Linked Reminder",
    datetime: parts[1] || "",
    repeat,
    msg: bodyLines.join("\n").trim(),
    linkedReminderId: cleanLinkedId(parts[3], ["reminder:", "rem:", "id:"]),
    linkedTaskId: cleanLinkedId(parts[4], ["task:", "task=", "id:", "id="]),
  };
}

export function serializeNotesReminderMagic(
  payload: NotesReminderMagicPayload,
) {
  const head = [
    payload.title,
    payload.datetime,
    payload.repeat,
    payload.linkedReminderId ? `reminder:${payload.linkedReminderId}` : "",
    payload.linkedTaskId ? `task:${payload.linkedTaskId}` : "",
  ]
    .join(" | ")
    .replace(/( \| )+$/u, "");
  return `${head}\n${payload.msg}`.trimEnd();
}

export function findNotesMagicFence(
  markdown: string,
  lang: string,
  content: string,
): NotesMagicFenceRange | null {
  const target = normalizeMagicBody(content);
  let cursor = 0;

  while (cursor < markdown.length) {
    const start = markdown.indexOf("```", cursor);
    if (start === -1) return null;

    const lineEnd = markdown.indexOf("\n", start);
    if (lineEnd === -1) return null;

    const opening = markdown.slice(start + 3, lineEnd).trim();
    if (opening !== lang) {
      cursor = start + 3;
      continue;
    }

    const bodyStart = lineEnd + 1;
    const closeStart = markdown.indexOf("```", bodyStart);
    if (closeStart === -1) return null;

    const rawBody = markdown.slice(bodyStart, closeStart);
    const hasBodyTrailingNewline =
      rawBody.endsWith("\r\n") || rawBody.endsWith("\n");
    const bodyEnd = rawBody.endsWith("\r\n")
      ? closeStart - 2
      : rawBody.endsWith("\n")
        ? closeStart - 1
        : closeStart;
    const body = normalizeMagicBody(markdown.slice(bodyStart, bodyEnd));

    if (body === target) {
      return {
        start,
        end: closeStart + 3,
        bodyStart,
        bodyEnd,
        hasBodyTrailingNewline,
      };
    }

    cursor = closeStart + 3;
  }

  return null;
}

export function replaceNotesMagicFenceContent(
  markdown: string,
  lang: string,
  currentContent: string,
  nextContent: string,
) {
  const range = findNotesMagicFence(markdown, lang, currentContent);
  if (!range) return markdown;
  const nextBody = normalizeMagicBody(nextContent);
  const closingSeparator = range.hasBodyTrailingNewline ? "" : "\n";
  return `${markdown.slice(0, range.bodyStart)}${nextBody}${closingSeparator}${markdown.slice(range.bodyEnd)}`;
}
