/**
 * Raw Open-Meteo forecast API payload (requested with `timeformat=unixtime`).
 * Kept deliberately loose: we validate at parse time instead of trusting it.
 * Reference: https://open-meteo.com/en/docs
 */

export type RawValue = number | null;

export interface OpenMeteoBlock {
  time: number | number[];
  [variable: string]: unknown;
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation?: string;
  elevation?: number;
  generationtime_ms?: number;
  current?: OpenMeteoBlock;
  hourly?: OpenMeteoBlock;
  daily?: OpenMeteoBlock;
}

export interface OpenMeteoError {
  error: true;
  reason: string;
}

export const CURRENT_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
] as const;

export const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "is_day",
  "cloud_cover",
  "wind_speed_10m",
  "relative_humidity_2m",
  "uv_index",
] as const;

export const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "precipitation_hours",
  "sunrise",
  "sunset",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "uv_index_max",
] as const;

export const MODEL_HOURLY_VARS = [
  "temperature_2m",
  "precipitation",
  "precipitation_probability",
  "weather_code",
] as const;

export const MODEL_DAILY_VARS = ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"] as const;
