export type IcsImportMode = "tasks" | "reminders";

export type IcsDateTimeValue = {
  raw: string;
  iso?: string;
  date?: string;
  allDay: boolean;
  timezone?: string;
};

export type IcsRRule = {
  raw: string;
  freq?: string;
  interval?: number;
  count?: number;
  until?: string;
  parts: Record<string, string>;
};

export type IcsVEvent = {
  uid?: string;
  summary: string;
  description: string;
  categories: string[];
  dtStart?: IcsDateTimeValue;
  dtEnd?: IcsDateTimeValue;
  rrule?: IcsRRule;
  warnings: string[];
};

export type IcsParseResult = {
  events: IcsVEvent[];
  warnings: string[];
};

export type IcsMappedTask = {
  title: string;
  status: "todo";
  desc: string;
  priority: "mid";
  deadline?: string;
  tags: string[];
  notes?: string;
};

export type IcsMappedReminder = {
  title: string;
  msg: string;
  datetime: string;
  repeat: "none" | "daily" | "weekly" | "monthly";
  notes?: string;
};

export type IcsImportMappingResult =
  | {
      mode: "tasks";
      items: IcsMappedTask[];
      skipped: number;
      warnings: string[];
    }
  | {
      mode: "reminders";
      items: IcsMappedReminder[];
      skipped: number;
      warnings: string[];
    };

type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
};

const IMPORT_TAG = "ics";
const FALLBACK_TITLE = "Imported ICS event";
const ALL_DAY_REMINDER_HOUR = 9;

const DATE_VALUE_RE = /^(\d{4})(\d{2})(\d{2})$/;
const DATE_TIME_VALUE_RE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/;

export function parseIcsCalendar(source: string): IcsParseResult {
  const warnings: string[] = [];
  const lines = unfoldIcsLines(source);
  const events: IcsVEvent[] = [];
  let currentEvent: IcsProperty[] | null = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/^BEGIN:VEVENT$/i.test(trimmed)) {
      if (currentEvent) {
        warnings.push(`Nested VEVENT ignored at line ${index + 1}.`);
      }
      currentEvent = [];
      return;
    }

    if (/^END:VEVENT$/i.test(trimmed)) {
      if (!currentEvent) {
        warnings.push(`Unexpected END:VEVENT at line ${index + 1}.`);
        return;
      }
      events.push(buildVEvent(currentEvent, events.length + 1));
      currentEvent = null;
      return;
    }

    if (!currentEvent) return;

    const property = parseIcsProperty(line);
    if (property) {
      currentEvent.push(property);
    } else {
      warnings.push(`Invalid VEVENT property at line ${index + 1}.`);
    }
  });

  if (currentEvent) {
    warnings.push("ICS ended before END:VEVENT; last VEVENT imported best-effort.");
    events.push(buildVEvent(currentEvent, events.length + 1));
  }

  if (events.length === 0) {
    warnings.push("No VEVENT entries found.");
  }

  return { events, warnings };
}

export function mapIcsImport(
  source: string | IcsParseResult,
  mode: "tasks",
): Extract<IcsImportMappingResult, { mode: "tasks" }>;
export function mapIcsImport(
  source: string | IcsParseResult,
  mode: "reminders",
): Extract<IcsImportMappingResult, { mode: "reminders" }>;
export function mapIcsImport(source: string | IcsParseResult, mode: IcsImportMode): IcsImportMappingResult {
  const parsed = typeof source === "string" ? parseIcsCalendar(source) : source;
  const warnings = [...parsed.warnings];

  if (mode === "tasks") {
    return {
      mode,
      items: parsed.events.map((event) => mapEventToTask(event, warnings)),
      skipped: 0,
      warnings,
    };
  }

  const items: IcsMappedReminder[] = [];
  let skipped = 0;

  parsed.events.forEach((event) => {
    const reminder = mapEventToReminder(event, warnings);
    if (reminder) {
      items.push(reminder);
    } else {
      skipped += 1;
    }
  });

  return { mode, items, skipped, warnings };
}

export const parseIcsVEvents = (source: string): IcsVEvent[] =>
  parseIcsCalendar(source).events;

function buildVEvent(properties: IcsProperty[], eventNumber: number): IcsVEvent {
  const warnings: string[] = [];
  const summary = readFirstTextProperty(properties, "SUMMARY");
  const description = readFirstTextProperty(properties, "DESCRIPTION");
  const categories = readCategories(properties);
  const dtStart = readDateTimeProperty(properties, "DTSTART", warnings);
  const dtEnd = readDateTimeProperty(properties, "DTEND", warnings);
  const rrule = readRRule(properties, warnings);
  const title = cleanText(summary || firstDescriptionLine(description) || FALLBACK_TITLE, FALLBACK_TITLE, 180);

  if (!summary) warnings.push(`VEVENT ${eventNumber} has no SUMMARY.`);
  if (!dtStart && !dtEnd) warnings.push(`VEVENT ${eventNumber} has no DTSTART/DTEND.`);

  return {
    uid: cleanText(readFirstTextProperty(properties, "UID"), "", 220) || undefined,
    summary: title,
    description: cleanText(description, "", 20_000),
    categories,
    dtStart,
    dtEnd,
    rrule,
    warnings,
  };
}

function mapEventToTask(event: IcsVEvent, warnings: string[]): IcsMappedTask {
  warnings.push(...event.warnings);
  const notes = buildNotes(event);
  return {
    title: event.summary,
    status: "todo",
    desc: event.description,
    priority: "mid",
    deadline: readTaskDeadline(event),
    tags: normalizeTags([...event.categories, IMPORT_TAG, event.rrule ? "recurring" : ""]),
    notes: notes || undefined,
  };
}

function mapEventToReminder(event: IcsVEvent, warnings: string[]): IcsMappedReminder | null {
  warnings.push(...event.warnings);
  const datetime = readReminderDateTime(event);
  if (!datetime) {
    warnings.push(`Skipped reminder "${event.summary}" because DTSTART/DTEND could not be parsed.`);
    return null;
  }

  return {
    title: event.summary,
    msg: event.description || event.summary,
    datetime,
    repeat: mapRRuleToReminderRepeat(event.rrule, warnings),
    notes: buildNotes(event) || undefined,
  };
}

function unfoldIcsLines(source: string): string[] {
  return source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .reduce<string[]>((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function parseIcsProperty(line: string): IcsProperty | null {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 1) return null;

  const left = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...rawParams] = left.split(";");
  const name = rawName.trim().toUpperCase();
  if (!name) return null;

  const params = rawParams.reduce<Record<string, string>>((result, rawParam) => {
    const equalsIndex = rawParam.indexOf("=");
    if (equalsIndex < 1) return result;
    const key = rawParam.slice(0, equalsIndex).trim().toUpperCase();
    const paramValue = rawParam.slice(equalsIndex + 1).trim();
    if (key) result[key] = unquoteParam(paramValue);
    return result;
  }, {});

  return { name, params, value };
}

function readFirstTextProperty(properties: IcsProperty[], name: string): string {
  const property = properties.find((entry) => entry.name === name);
  return property ? unescapeIcsText(property.value) : "";
}

function readCategories(properties: IcsProperty[]): string[] {
  const categories = properties
    .filter((entry) => entry.name === "CATEGORIES")
    .flatMap((entry) => splitEscapedList(entry.value).map(unescapeIcsText));
  return normalizeTags(categories);
}

function readDateTimeProperty(
  properties: IcsProperty[],
  name: "DTSTART" | "DTEND",
  warnings: string[],
): IcsDateTimeValue | undefined {
  const property = properties.find((entry) => entry.name === name);
  if (!property) return undefined;

  const parsed = parseIcsDateTime(property.value, property.params);
  if (!parsed.iso && !parsed.date) {
    warnings.push(`${name} "${property.value}" could not be parsed.`);
  }
  if (property.params.TZID) {
    warnings.push(`${name} TZID=${property.params.TZID} imported as local time best-effort.`);
  }
  return parsed;
}

function parseIcsDateTime(value: string, params: Record<string, string>): IcsDateTimeValue {
  const trimmed = value.trim();
  const dateMatch = DATE_VALUE_RE.exec(trimmed);
  if (params.VALUE?.toUpperCase() === "DATE" || dateMatch) {
    const match = dateMatch || DATE_VALUE_RE.exec(trimmed);
    if (!match) return { raw: value, allDay: true, timezone: params.TZID };
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDateParts(year, month, day)) {
      return { raw: value, allDay: true, timezone: params.TZID };
    }
    const date = formatDateParts(year, month, day);
    return {
      raw: value,
      date,
      iso: localDateTimeToIso(year, month, day, 0, 0, 0),
      allDay: true,
      timezone: params.TZID,
    };
  }

  const dateTimeMatch = DATE_TIME_VALUE_RE.exec(trimmed);
  if (!dateTimeMatch) {
    return { raw: value, allDay: false, timezone: params.TZID };
  }

  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond, utcMarker] = dateTimeMatch;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const second = Number(rawSecond || "0");
  if (!isValidDateParts(year, month, day) || !isValidTimeParts(hour, minute, second)) {
    return { raw: value, allDay: false, timezone: params.TZID };
  }

  const iso = utcMarker
    ? new Date(Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
      )).toISOString()
    : localDateTimeToIso(
        year,
        month,
        day,
        hour,
        minute,
        second,
      );

  return {
    raw: value,
    iso,
    date: utcMarker ? iso.slice(0, 10) : formatDateParts(year, month, day),
    allDay: false,
    timezone: params.TZID,
  };
}

function readRRule(properties: IcsProperty[], warnings: string[]): IcsRRule | undefined {
  const property = properties.find((entry) => entry.name === "RRULE");
  if (!property?.value.trim()) return undefined;

  const parts = property.value.split(";").reduce<Record<string, string>>((result, part) => {
    const equalsIndex = part.indexOf("=");
    if (equalsIndex < 1) return result;
    const key = part.slice(0, equalsIndex).trim().toUpperCase();
    const value = part.slice(equalsIndex + 1).trim();
    if (key && value) result[key] = value;
    return result;
  }, {});

  const freq = parts.FREQ?.toUpperCase();
  if (!freq) warnings.push(`RRULE "${property.value}" has no FREQ.`);

  return {
    raw: property.value,
    freq,
    interval: parsePositiveInteger(parts.INTERVAL),
    count: parsePositiveInteger(parts.COUNT),
    until: parts.UNTIL,
    parts,
  };
}

function mapRRuleToReminderRepeat(
  rrule: IcsRRule | undefined,
  warnings: string[],
): IcsMappedReminder["repeat"] {
  if (!rrule?.freq) return "none";
  if (rrule.interval && rrule.interval !== 1) {
    warnings.push(`RRULE interval ${rrule.interval} imported as single-step ${rrule.freq.toLowerCase()} repeat.`);
  }

  switch (rrule.freq) {
    case "DAILY":
      return "daily";
    case "WEEKLY":
      return "weekly";
    case "MONTHLY":
      return "monthly";
    default:
      warnings.push(`RRULE FREQ=${rrule.freq} is not supported by v1 reminders.`);
      return "none";
  }
}

function readTaskDeadline(event: IcsVEvent): string | undefined {
  const endDate = event.dtEnd?.date;
  const startDate = event.dtStart?.date;
  if (event.dtEnd?.allDay && endDate) {
    return subtractOneDay(endDate, startDate);
  }
  return event.dtEnd?.date || event.dtStart?.date;
}

function readReminderDateTime(event: IcsVEvent): string | undefined {
  const preferred = event.dtStart || event.dtEnd;
  if (!preferred) return undefined;
  if (preferred.allDay && preferred.date) {
    return localDateAtHourToIso(preferred.date, ALL_DAY_REMINDER_HOUR);
  }
  return preferred.iso;
}

function buildNotes(event: IcsVEvent): string {
  const lines = [
    event.uid ? `UID: ${event.uid}` : "",
    event.dtStart ? `DTSTART: ${event.dtStart.raw}` : "",
    event.dtEnd ? `DTEND: ${event.dtEnd.raw}` : "",
    event.rrule ? `RRULE: ${event.rrule.raw}` : "",
    event.categories.length ? `Categories: ${event.categories.join(", ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function firstDescriptionLine(description: string): string {
  return description.split(/\r?\n/).find((line) => line.trim())?.trim() || "";
}

function cleanText(value: string, fallback = "", maxLength = 500): string {
  const cleaned = value.replace(/\u0000/g, "").trim();
  if (!cleaned) return fallback;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}...` : cleaned;
}

function normalizeTags(values: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  values.forEach((value) => {
    const tag = cleanText(value.replace(/^#/, ""), "", 48);
    if (!tag) return;
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(tag);
  });

  return tags;
}

function splitEscapedList(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  parts.push(current);
  return parts;
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\[nN]/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function unquoteParam(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function localDateTimeToIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): string {
  return new Date(year, month - 1, day, hour, minute, second).toISOString();
}

function formatDateParts(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function isValidTimeParts(hour: number, minute: number, second: number): boolean {
  return (
    Number.isInteger(hour) &&
    Number.isInteger(minute) &&
    Number.isInteger(second) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 60
  );
}

function localDateAtHourToIso(date: string, hour: number): string {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  return localDateTimeToIso(year, month, day, hour, 0, 0);
}

function subtractOneDay(date: string, minimumDate?: string): string {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  const candidate = new Date(Date.UTC(year, month - 1, day));
  candidate.setUTCDate(candidate.getUTCDate() - 1);
  const shifted = candidate.toISOString().slice(0, 10);
  if (minimumDate && shifted < minimumDate) return minimumDate;
  return shifted;
}
