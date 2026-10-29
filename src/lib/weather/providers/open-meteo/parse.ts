import type {
  CurrentConditions,
  DailyPoint,
  DataOrigin,
  Forecast,
  GeoLocation,
  HourlyPoint,
  ModelDailyPoint,
  ModelForecast,
  ModelHourlyPoint,
} from "../../types";
import { dayKey } from "../../format";
import type { OpenMeteoBlock, OpenMeteoResponse } from "./schema";

export class OpenMeteoParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenMeteoParseError";
  }
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function times(block: OpenMeteoBlock | undefined, name: string): number[] {
  if (!block || !Array.isArray(block.time)) {
    throw new OpenMeteoParseError(`Bloco "${name}" ausente ou sem eixo de tempo`);
  }
  if (!block.time.every((t) => typeof t === "number" && Number.isFinite(t))) {
    throw new OpenMeteoParseError(`Eixo de tempo inválido em "${name}" (esperado unixtime)`);
  }
  return block.time as number[];
}

/**
 * Reads a variable series, tolerating absence: missing variables (e.g. a model
 * that does not provide precipitation probability) become an all-null series
 * of the right length. With `modelId`, Open-Meteo's multi-model suffix
 * (`temperature_2m_gfs_seamless`) is tried first.
 */
export function readSeries(
  block: OpenMeteoBlock,
  variable: string,
  length: number,
  modelId?: string,
): (number | null)[] {
  const raw = (modelId ? block[`${variable}_${modelId}`] : undefined) ?? block[variable];
  if (!Array.isArray(raw)) return new Array<number | null>(length).fill(null);
  const out = new Array<number | null>(length);
  for (let i = 0; i < length; i++) out[i] = num(raw[i]);
  return out;
}

function isDayFromSun(time: number, daily: DailyPoint[], timeZone: string): boolean {
  const key = dayKey(time, timeZone);
  const day = daily.find((d) => dayKey(d.date, timeZone) === key);
  if (!day || day.sunrise == null || day.sunset == null) return true;
  return time >= day.sunrise && time < day.sunset;
}

export function parseForecast(
  raw: OpenMeteoResponse,
  location: GeoLocation,
  fetchedAt: number,
  origin: DataOrigin = "live",
): Forecast {
  if (typeof raw?.timezone !== "string" || typeof raw.utc_offset_seconds !== "number") {
    throw new OpenMeteoParseError("Resposta sem fuso horário");
  }
  const timezone = raw.timezone;

  const dTimes = times(raw.daily, "daily");
  const d = raw.daily!;
  const dn = dTimes.length;
  const dCols = {
    weatherCode: readSeries(d, "weather_code", dn),
    tMax: readSeries(d, "temperature_2m_max", dn),
    tMin: readSeries(d, "temperature_2m_min", dn),
    pSum: readSeries(d, "precipitation_sum", dn),
    pProb: readSeries(d, "precipitation_probability_max", dn),
    pHours: readSeries(d, "precipitation_hours", dn),
    sunrise: readSeries(d, "sunrise", dn),
    sunset: readSeries(d, "sunset", dn),
    wind: readSeries(d, "wind_speed_10m_max", dn),
    gusts: readSeries(d, "wind_gusts_10m_max", dn),
    uv: readSeries(d, "uv_index_max", dn),
  };
  const daily: DailyPoint[] = dTimes.map((date, i) => ({
    date,
    weatherCode: dCols.weatherCode[i],
    temperatureMax: dCols.tMax[i],
    temperatureMin: dCols.tMin[i],
    precipitationSum: dCols.pSum[i],
    precipitationProbabilityMax: dCols.pProb[i],
    precipitationHours: dCols.pHours[i],
    sunrise: dCols.sunrise[i],
    sunset: dCols.sunset[i],
    windSpeedMax: dCols.wind[i],
    windGustsMax: dCols.gusts[i],
    uvIndexMax: dCols.uv[i],
  }));

  const hTimes = times(raw.hourly, "hourly");
  const h = raw.hourly!;
  const hn = hTimes.length;
  const hCols = {
    temp: readSeries(h, "temperature_2m", hn),
    apparent: readSeries(h, "apparent_temperature", hn),
    pProb: readSeries(h, "precipitation_probability", hn),
    precip: readSeries(h, "precipitation", hn),
    code: readSeries(h, "weather_code", hn),
    isDay: readSeries(h, "is_day", hn),
    cloud: readSeries(h, "cloud_cover", hn),
    wind: readSeries(h, "wind_speed_10m", hn),
    humidity: readSeries(h, "relative_humidity_2m", hn),
    uv: readSeries(h, "uv_index", hn),
  };
  const hourly: HourlyPoint[] = hTimes.map((time, i) => ({
    time,
    temperature: hCols.temp[i],
    apparentTemperature: hCols.apparent[i],
    precipitationProbability: hCols.pProb[i],
    precipitation: hCols.precip[i],
    weatherCode: hCols.code[i],
    isDay: hCols.isDay[i] == null ? isDayFromSun(time, daily, timezone) : hCols.isDay[i] === 1,
    cloudCover: hCols.cloud[i],
    windSpeed: hCols.wind[i],
    humidity: hCols.humidity[i],
    uvIndex: hCols.uv[i],
  }));

  const c = raw.current;
  if (!c || typeof c.time !== "number") {
    throw new OpenMeteoParseError('Bloco "current" ausente');
  }
  const isDayRaw = num(c.is_day);
  const current: CurrentConditions = {
    time: c.time,
    temperature: num(c.temperature_2m),
    apparentTemperature: num(c.apparent_temperature),
    humidity: num(c.relative_humidity_2m),
    precipitation: num(c.precipitation),
    weatherCode: num(c.weather_code),
    isDay: isDayRaw == null ? isDayFromSun(c.time, daily, timezone) : isDayRaw === 1,
    cloudCover: num(c.cloud_cover),
    windSpeed: num(c.wind_speed_10m),
    windDirection: num(c.wind_direction_10m),
    windGusts: num(c.wind_gusts_10m),
    pressure: num(c.pressure_msl),
  };

  return {
    provider: "open-meteo",
    model: "best_match",
    location,
    timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
    fetchedAt,
    current,
    hourly,
    daily,
    origin,
  };
}

/** Parses a single-model (or multi-model, by suffix) response. */
export function parseModelForecast(raw: OpenMeteoResponse, modelId: string, fetchedAt: number): ModelForecast {
  const hTimes = times(raw.hourly, "hourly");
  const h = raw.hourly!;
  const temp = readSeries(h, "temperature_2m", hTimes.length, modelId);
  const precip = readSeries(h, "precipitation", hTimes.length, modelId);
  const prob = readSeries(h, "precipitation_probability", hTimes.length, modelId);
  const code = readSeries(h, "weather_code", hTimes.length, modelId);
  const hourly: ModelHourlyPoint[] = hTimes.map((time, i) => ({
    time,
    temperature: temp[i],
    precipitation: precip[i],
    precipitationProbability: prob[i],
    weatherCode: code[i],
  }));

  let daily: ModelDailyPoint[] = [];
  if (raw.daily) {
    const dTimes = times(raw.daily, "daily");
    const tMax = readSeries(raw.daily, "temperature_2m_max", dTimes.length, modelId);
    const tMin = readSeries(raw.daily, "temperature_2m_min", dTimes.length, modelId);
    const pSum = readSeries(raw.daily, "precipitation_sum", dTimes.length, modelId);
    daily = dTimes.map((date, i) => ({
      date,
      temperatureMax: tMax[i],
      temperatureMin: tMin[i],
      precipitationSum: pSum[i],
    }));
  }

  // A model outside its coverage area returns the time axis with null values.
  const hasData = hourly.some((p) => p.temperature != null || p.precipitation != null);
  return {
    modelId,
    status: hasData ? "ok" : "no-data",
    message: hasData ? undefined : "Sem dados deste modelo para a localização",
    fetchedAt,
    hourly,
    daily,
  };
}
