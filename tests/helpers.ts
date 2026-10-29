import type { Forecast, HourlyPoint } from "@/lib/weather/types";
import { SAO_PAULO } from "@/lib/location/locations";

/** 2026-10-29 00:00 in São Paulo (UTC−3). */
export const DAY_START = Date.UTC(2026, 9, 29, 3, 0, 0) / 1000;
export const at = (localHour: number, minute = 0) => DAY_START + localHour * 3600 + minute * 60;

export function hour(time: number, overrides: Partial<HourlyPoint> = {}): HourlyPoint {
  return {
    time,
    temperature: 22,
    apparentTemperature: 23,
    precipitationProbability: 0,
    precipitation: 0,
    weatherCode: 1,
    isDay: true,
    cloudCover: 20,
    windSpeed: 10,
    humidity: 60,
    uvIndex: 5,
    ...overrides,
  };
}

/**
 * Forecast covering 48 hours from local midnight; `probs`/`mm` map local hour
 * offsets (0–47) to values.
 */
export function buildForecast(opts: {
  probs?: Record<number, number | null>;
  mm?: Record<number, number | null>;
  current?: Partial<Forecast["current"]>;
}): Forecast {
  const hourly = Array.from({ length: 48 }, (_, h) =>
    hour(at(h), {
      precipitationProbability: opts.probs?.[h] !== undefined ? opts.probs[h] : 0,
      precipitation: opts.mm?.[h] !== undefined ? opts.mm[h] : 0,
    }),
  );
  return {
    provider: "test",
    model: "best_match",
    location: SAO_PAULO,
    timezone: "America/Sao_Paulo",
    utcOffsetSeconds: -10800,
    fetchedAt: at(12) * 1000,
    current: {
      time: at(12),
      temperature: 26,
      apparentTemperature: 28,
      humidity: 60,
      precipitation: 0,
      weatherCode: 2,
      isDay: true,
      cloudCover: 40,
      windSpeed: 10,
      windDirection: 90,
      windGusts: 20,
      pressure: 1015,
      ...opts.current,
    },
    hourly,
    daily: [],
    origin: "synthetic-fixture",
  };
}
