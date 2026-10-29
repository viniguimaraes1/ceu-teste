import type { DailyPoint, Forecast, HourlyPoint } from "./types";
import { dayKey } from "./format";

/**
 * Index of the hourly step that contains `nowUnix` — the last step whose
 * timestamp is at or before now. Returns 0 if now precedes the series and the
 * last index if it is past it.
 */
export function currentHourIndex(hourly: { time: number }[], nowUnix: number): number {
  if (hourly.length === 0) return -1;
  let idx = 0;
  for (let i = 0; i < hourly.length; i++) {
    if (hourly[i].time <= nowUnix) idx = i;
    else break;
  }
  return idx;
}

/** The current step followed by the next `count - 1` steps. */
export function upcomingHours(forecast: Forecast, nowUnix: number, count: number): HourlyPoint[] {
  const start = currentHourIndex(forecast.hourly, nowUnix);
  if (start < 0) return [];
  return forecast.hourly.slice(start, start + count);
}

/** Daily entry for the local day containing `nowUnix`, if present. */
export function todayOf(forecast: Forecast, nowUnix: number): DailyPoint | undefined {
  const key = dayKey(nowUnix, forecast.timezone);
  return forecast.daily.find((d) => dayKey(d.date, forecast.timezone) === key);
}

/** Daily entries from today onwards. */
export function dailyFromToday(forecast: Forecast, nowUnix: number): DailyPoint[] {
  const key = dayKey(nowUnix, forecast.timezone);
  const idx = forecast.daily.findIndex((d) => dayKey(d.date, forecast.timezone) === key);
  return idx < 0 ? forecast.daily : forecast.daily.slice(idx);
}
