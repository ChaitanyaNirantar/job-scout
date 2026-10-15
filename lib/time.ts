export type ScheduleSettings = {
  hour: number;
  minute: number;
  timezone: string;
  lastScheduledOn: string | null;
};

export type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function localParts(date: Date, timeZone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
  };
}

export function localDateKey(date: Date, timeZone: string): string {
  const parts = localParts(date, timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function shiftDate(year: number, month: number, day: number, delta: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = localParts(new Date(utc), timeZone);
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const want = Date.UTC(year, month - 1, day, hour, minute);
    const delta = want - got;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

export function isScheduleDue(settings: ScheduleSettings, now: Date): boolean {
  const timeZone = settings.timezone || "UTC";
  const parts = localParts(now, timeZone);
  const minutes = parts.hour * 60 + parts.minute;
  const slot = settings.hour * 60 + settings.minute;
  if (minutes < slot) return false;
  return settings.lastScheduledOn !== localDateKey(now, timeZone);
}

export function nextRunDate(settings: ScheduleSettings, now: Date): Date {
  const timeZone = settings.timezone || "UTC";
  const parts = localParts(now, timeZone);
  const minutes = parts.hour * 60 + parts.minute;
  const slot = settings.hour * 60 + settings.minute;
  const addDay = minutes >= slot ? 1 : 0;
  const date = shiftDate(parts.year, parts.month, parts.day, addDay);
  return zonedTimeToUtc(date.year, date.month, date.day, settings.hour, settings.minute, timeZone);
}

export function formatNextRun(date: Date, timeZone: string, now: Date): string {
  const zone = timeZone || "UTC";
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  if (localDateKey(date, zone) === localDateKey(now, zone)) return `Today at ${time}`;
  const today = localParts(now, zone);
  const tomorrow = shiftDate(today.year, today.month, today.day, 1);
  const tomorrowKey = `${tomorrow.year}-${String(tomorrow.month).padStart(2, "0")}-${String(tomorrow.day).padStart(2, "0")}`;
  if (localDateKey(date, zone) === tomorrowKey) return `Tomorrow at ${time}`;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
  }).format(date);
  return `${weekday} at ${time}`;
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((then - now) / 1000);
  const abs = Math.abs(seconds);
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return format.format(seconds, "second");
  if (abs < 3600) return format.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return format.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 45) return format.format(Math.round(seconds / 86400), "day");
  return format.format(Math.round(seconds / (86400 * 30)), "month");
}

export function formatBoardsRead(iso: string | null, now = Date.now()): string {
  if (!iso) return "The boards haven’t been read yet.";
  return `Boards read ${relativeTime(iso, now)}.`;
}
