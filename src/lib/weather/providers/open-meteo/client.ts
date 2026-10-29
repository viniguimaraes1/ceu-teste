import type { GeoLocation, ModelForecast, ModelRunInfo } from "../../types";
import type { WeatherProvider } from "../provider";
import { parseForecast, parseModelForecast } from "./parse";
import {
  CURRENT_VARS,
  DAILY_VARS,
  HOURLY_VARS,
  MODEL_DAILY_VARS,
  MODEL_HOURLY_VARS,
  type OpenMeteoResponse,
} from "./schema";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const META_URL = "https://api.open-meteo.com/data";
const TIMEOUT_MS = 8000;

export class OpenMeteoRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "OpenMeteoRequestError";
  }
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new OpenMeteoRequestError(`Falha de rede ao consultar o Open-Meteo: ${(err as Error).message}`);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: boolean; reason?: string }) | null;
  if (!res.ok || body == null || body.error) {
    throw new OpenMeteoRequestError(body?.reason ?? `Open-Meteo respondeu ${res.status}`, res.status);
  }
  return body;
}

export function buildForecastUrl(loc: GeoLocation, forecastDays = 10): string {
  const params = new URLSearchParams({
    latitude: loc.latitude.toFixed(4),
    longitude: loc.longitude.toFixed(4),
    current: CURRENT_VARS.join(","),
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: String(forecastDays),
    wind_speed_unit: "kmh",
  });
  return `${FORECAST_URL}?${params}`;
}

export function buildModelUrl(loc: GeoLocation, modelId: string, forecastDays = 7): string {
  const params = new URLSearchParams({
    latitude: loc.latitude.toFixed(4),
    longitude: loc.longitude.toFixed(4),
    hourly: MODEL_HOURLY_VARS.join(","),
    daily: MODEL_DAILY_VARS.join(","),
    models: modelId,
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: String(forecastDays),
  });
  return `${FORECAST_URL}?${params}`;
}

export const openMeteoProvider: WeatherProvider = {
  id: "open-meteo",
  name: "Open-Meteo",
  attribution: { label: "Dados meteorológicos por Open-Meteo.com", url: "https://open-meteo.com/", license: "CC BY 4.0" },

  async getForecast(loc) {
    const raw = await getJson<OpenMeteoResponse>(buildForecastUrl(loc));
    return parseForecast(raw, loc, Date.now());
  },

  async getModelForecast(loc, modelId): Promise<ModelForecast> {
    // Each model is requested separately so one unsupported model or variable
    // never takes the others down with it.
    try {
      const raw = await getJson<OpenMeteoResponse>(buildModelUrl(loc, modelId));
      return parseModelForecast(raw, modelId, Date.now());
    } catch (err) {
      return {
        modelId,
        status: "error",
        message: (err as Error).message,
        fetchedAt: Date.now(),
        hourly: [],
        daily: [],
      };
    }
  },

  async getModelRunInfo(modelId, dataset): Promise<ModelRunInfo> {
    try {
      const meta = await getJson<Record<string, unknown>>(`${META_URL}/${dataset}/static/meta.json`);
      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
      return {
        modelId,
        initialisedAt: n(meta.last_run_initialisation_time),
        availableAt: n(meta.last_run_availability_time),
      };
    } catch {
      return { modelId, initialisedAt: null, availableAt: null };
    }
  },
};
