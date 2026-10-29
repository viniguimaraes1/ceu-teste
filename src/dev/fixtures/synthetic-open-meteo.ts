/**
 * ⚠️ SYNTHETIC DEVELOPMENT FIXTURE — NOT WEATHER DATA.
 *
 * Builds payloads shaped like Open-Meteo responses from simple deterministic
 * curves so the UI and parsers can be exercised offline. Values are invented
 * and must never reach production users. Only used when CEU_FIXTURES=1
 * (refused on Vercel production) and in unit tests; the UI shows a
 * "dados sintéticos" banner whenever it is active.
 */
import type { OpenMeteoResponse } from "@/lib/weather/providers/open-meteo/schema";

const TZ = "America/Sao_Paulo";
const OFFSET = -3 * 3600;

function localMidnight(nowUnix: number): number {
  const local = nowUnix + OFFSET;
  return local - (((local % 86400) + 86400) % 86400) - OFFSET;
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

interface Options {
  days?: number;
  /** Shifts the synthetic curves, used to fake model disagreement. */
  tempBias?: number;
  rainScale?: number;
  rainShiftHours?: number;
}

function curves(nowUnix: number, { days = 10, tempBias = 0, rainScale = 1, rainShiftHours = 0 }: Options) {
  const start = localMidnight(nowUnix);
  const time: number[] = [];
  const temp: number[] = [];
  const prob: number[] = [];
  const precip: number[] = [];
  const code: number[] = [];
  const isDay: number[] = [];
  for (let i = 0; i < days * 24; i++) {
    const t = start + i * 3600;
    const hour = i % 24;
    const day = Math.floor(i / 24);
    const diurnal = Math.sin(((hour - 9) / 24) * 2 * Math.PI);
    temp.push(round1(22 + 5 * diurnal + (day % 3) - 1 + tempBias));
    // Afternoon convection pattern, stronger on alternate days.
    const h = hour - rainShiftHours;
    const afternoon = h >= 15 && h <= 20 ? Math.sin(((h - 14) / 7) * Math.PI) : 0;
    const p = Math.min(95, Math.round((day % 2 === 0 ? 70 : 35) * afternoon * rainScale + 5));
    prob.push(p);
    const mm = p >= 50 ? round1((p - 40) / 12 * rainScale) : 0;
    precip.push(mm);
    code.push(mm >= 2.5 ? 81 : mm > 0 ? 80 : hour >= 11 && hour <= 17 ? 2 : 1);
    isDay.push(hour >= 6 && hour < 18 ? 1 : 0);
    time.push(t);
  }
  return { start, time, temp, prob, precip, code, isDay };
}

export function syntheticForecast(nowUnix: number, latitude: number, longitude: number): OpenMeteoResponse {
  const c = curves(nowUnix, {});
  const days = c.time.length / 24;
  const daily = {
    time: [] as number[],
    weather_code: [] as number[],
    temperature_2m_max: [] as number[],
    temperature_2m_min: [] as number[],
    precipitation_sum: [] as number[],
    precipitation_probability_max: [] as number[],
    precipitation_hours: [] as number[],
    sunrise: [] as number[],
    sunset: [] as number[],
    wind_speed_10m_max: [] as number[],
    wind_gusts_10m_max: [] as number[],
    uv_index_max: [] as number[],
  };
  for (let d = 0; d < days; d++) {
    const s = d * 24;
    const slice = <T,>(a: T[]) => a.slice(s, s + 24);
    const precip = slice(c.precip);
    daily.time.push(c.start + d * 86400);
    daily.weather_code.push(Math.max(...slice(c.code)));
    daily.temperature_2m_max.push(Math.max(...slice(c.temp)));
    daily.temperature_2m_min.push(Math.min(...slice(c.temp)));
    daily.precipitation_sum.push(round1(precip.reduce((a, b) => a + b, 0)));
    daily.precipitation_probability_max.push(Math.max(...slice(c.prob)));
    daily.precipitation_hours.push(precip.filter((v) => v > 0).length);
    daily.sunrise.push(c.start + d * 86400 + 5 * 3600 + 30 * 60);
    daily.sunset.push(c.start + d * 86400 + 18 * 3600 + 15 * 60);
    daily.wind_speed_10m_max.push(14 + (d % 4) * 2);
    daily.wind_gusts_10m_max.push(30 + (d % 4) * 5);
    daily.uv_index_max.push(d % 2 === 0 ? 8.5 : 10.2);
  }
  const idx = Math.max(0, Math.floor((nowUnix - c.start) / 3600));
  return {
    latitude,
    longitude,
    utc_offset_seconds: OFFSET,
    timezone: TZ,
    timezone_abbreviation: "GMT-3",
    elevation: 760,
    current: {
      time: nowUnix - (nowUnix % 900),
      interval: 900,
      temperature_2m: c.temp[idx],
      apparent_temperature: round1(c.temp[idx] + 1.5),
      relative_humidity_2m: 68,
      is_day: c.isDay[idx],
      precipitation: c.precip[idx],
      weather_code: c.code[idx],
      cloud_cover: 45,
      wind_speed_10m: 11,
      wind_direction_10m: 135,
      wind_gusts_10m: 26,
      pressure_msl: 1016.2,
    },
    hourly: {
      time: c.time,
      temperature_2m: c.temp,
      apparent_temperature: c.temp.map((t) => round1(t + 1.5)),
      precipitation_probability: c.prob,
      precipitation: c.precip,
      weather_code: c.code,
      is_day: c.isDay,
      cloud_cover: c.prob.map((p) => Math.min(100, p + 30)),
      wind_speed_10m: c.time.map((_, i) => 8 + (i % 7)),
      relative_humidity_2m: c.prob.map((p) => Math.min(98, 55 + Math.round(p / 3))),
      uv_index: c.isDay.map((d, i) => (d ? round1(Math.max(0, 9 * Math.sin((((i % 24) - 6) / 12) * Math.PI))) : 0)),
    },
    daily,
  };
}

const MODEL_VARIANTS: Record<string, Options & { hasProbability: boolean }> = {
  ecmwf_ifs025: { tempBias: 0.3, rainScale: 1, rainShiftHours: 0, hasProbability: false },
  gfs_seamless: { tempBias: 1.4, rainScale: 1.4, rainShiftHours: -1, hasProbability: true },
  icon_seamless: { tempBias: -0.6, rainScale: 0.6, rainShiftHours: 1, hasProbability: true },
  gem_seamless: { tempBias: 0.9, rainScale: 0.9, rainShiftHours: 2, hasProbability: false },
};

export function syntheticModelForecast(nowUnix: number, modelId: string): OpenMeteoResponse {
  const v = MODEL_VARIANTS[modelId] ?? { hasProbability: false };
  const c = curves(nowUnix, { ...v, days: 7 });
  const days = c.time.length / 24;
  const dailyTime = Array.from({ length: days }, (_, d) => c.start + d * 86400);
  const per = <T,>(a: T[], d: number) => a.slice(d * 24, d * 24 + 24) as unknown as number[];
  return {
    latitude: -23.55,
    longitude: -46.63,
    utc_offset_seconds: OFFSET,
    timezone: TZ,
    hourly: {
      time: c.time,
      temperature_2m: c.temp,
      precipitation: c.precip,
      precipitation_probability: v.hasProbability ? c.prob : c.prob.map(() => null),
      weather_code: c.code,
    },
    daily: {
      time: dailyTime,
      temperature_2m_max: dailyTime.map((_, d) => Math.max(...per(c.temp, d))),
      temperature_2m_min: dailyTime.map((_, d) => Math.min(...per(c.temp, d))),
      precipitation_sum: dailyTime.map((_, d) => round1(per(c.precip, d).reduce((a, b) => a + b, 0))),
    },
  };
}
