/**
 * Locale/time-zone aware formatting. Every function takes the forecast's IANA
 * time zone explicitly so rendering never depends on the server's or the
 * device's local zone.
 */

const LOCALE = "pt-BR";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options });
    formatterCache.set(key, f);
  }
  return f;
}

/** Calendar parts of a Unix-seconds instant in a time zone. */
export function zonedParts(unix: number, timeZone: string) {
  const parts = formatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(unix * 1000));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** "2026-10-29" in the given zone — handy as a day key. */
export function dayKey(unix: number, timeZone: string): string {
  const { year, month, day } = zonedParts(unix, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function localHour(unix: number, timeZone: string): number {
  return zonedParts(unix, timeZone).hour;
}

/** "17h" */
export function formatHour(unix: number, timeZone: string): string {
  return `${localHour(unix, timeZone)}h`;
}

/** "06:14" */
export function formatClock(unix: number, timeZone: string): string {
  const { hour, minute } = zonedParts(unix, timeZone);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Sex" — short weekday, no trailing period. */
export function formatWeekdayShort(unix: number, timeZone: string): string {
  return capitalize(formatter(timeZone, { weekday: "short" }).format(new Date(unix * 1000)).replace(".", ""));
}

/** "Sexta-feira" */
export function formatWeekdayLong(unix: number, timeZone: string): string {
  return capitalize(formatter(timeZone, { weekday: "long" }).format(new Date(unix * 1000)));
}

/** "30 out" */
export function formatDayMonth(unix: number, timeZone: string): string {
  return formatter(timeZone, { day: "numeric", month: "short" })
    .format(new Date(unix * 1000))
    .replace(".", "")
    .replace(" de ", " ");
}

/** "Hoje", "Amanhã" or the short weekday, relative to `nowUnix`. */
export function formatDayLabel(unix: number, nowUnix: number, timeZone: string): string {
  const today = dayKey(nowUnix, timeZone);
  const target = dayKey(unix, timeZone);
  if (target === today) return "Hoje";
  if (target === dayKey(nowUnix + 86400, timeZone)) return "Amanhã";
  return formatWeekdayShort(unix, timeZone);
}

/** "29 out, 15:42" */
export function formatTimestamp(unix: number, timeZone: string): string {
  return `${formatDayMonth(unix, timeZone)}, ${formatClock(unix, timeZone)}`;
}

export function formatTemp(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? "—" : `${Math.round(value)}°`;
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

const mmFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** "0,4 mm"; values that round to zero show as "0 mm". */
export function formatMm(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${mmFormatter.format(Math.round(value * 10) / 10)} mm`;
}

export function formatKmh(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)} km/h`;
}

const COMPASS = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"] as const;

/** Meteorological direction (where wind comes FROM) → "SE". */
export function compassDirection(degrees: number | null | undefined): string {
  if (degrees == null) return "—";
  const idx = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return COMPASS[idx];
}
