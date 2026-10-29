/**
 * Domain types for CÉU. Provider-agnostic: every provider maps its raw
 * payload into these shapes. All timestamps are Unix seconds (UTC); render
 * them with the forecast's IANA `timezone`.
 *
 * Values a provider may not supply are typed `number | null` — the UI must
 * show "—" rather than invent a value.
 */

export interface GeoLocation {
  /** Stable id, e.g. "sao-paulo" or "geo:-23.55,-46.63". */
  id: string;
  name: string;
  /** State / region, e.g. "São Paulo". */
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface CurrentConditions {
  time: number;
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  /** mm over the preceding interval. */
  precipitation: number | null;
  weatherCode: number | null;
  isDay: boolean;
  cloudCover: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  windGusts: number | null;
  pressure: number | null;
}

/**
 * One hourly step. Following Open-Meteo semantics, precipitation and its
 * probability refer to the hour *preceding* `time`.
 */
export interface HourlyPoint {
  time: number;
  temperature: number | null;
  apparentTemperature: number | null;
  /** 0–100, probability of > 0.1 mm in the preceding hour. */
  precipitationProbability: number | null;
  /** mm in the preceding hour. */
  precipitation: number | null;
  weatherCode: number | null;
  isDay: boolean;
  cloudCover: number | null;
  windSpeed: number | null;
  humidity: number | null;
  uvIndex: number | null;
}

export interface DailyPoint {
  /** Local midnight of the day, as Unix seconds. */
  date: number;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
  precipitationProbabilityMax: number | null;
  precipitationHours: number | null;
  sunrise: number | null;
  sunset: number | null;
  windSpeedMax: number | null;
  windGustsMax: number | null;
  uvIndexMax: number | null;
}

export type DataOrigin = "live" | "synthetic-fixture";

export interface Forecast {
  provider: string;
  /** Provider model id; "best_match" for Open-Meteo's automatic selection. */
  model: string;
  location: GeoLocation;
  timezone: string;
  utcOffsetSeconds: number;
  /** When CÉU retrieved this payload (Unix ms). */
  fetchedAt: number;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  origin: DataOrigin;
}

export interface ModelHourlyPoint {
  time: number;
  temperature: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
}

export interface ModelDailyPoint {
  date: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
}

export type ModelStatus = "ok" | "no-data" | "error";

export interface ModelForecast {
  modelId: string;
  status: ModelStatus;
  /** Human-readable reason when status is not "ok". */
  message?: string;
  fetchedAt: number;
  hourly: ModelHourlyPoint[];
  daily: ModelDailyPoint[];
}

/** Metadata about a model's latest run, when the provider exposes it. */
export interface ModelRunInfo {
  modelId: string;
  /** Model initialisation (run) time, Unix seconds. */
  initialisedAt: number | null;
  /** When that run became available at the provider, Unix seconds. */
  availableAt: number | null;
}
