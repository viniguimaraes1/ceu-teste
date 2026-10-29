import type { Forecast, GeoLocation, ModelForecast } from "@/lib/weather/types";

/**
 * Turns forecasts into rows for supabase/migrations/0001_accuracy_foundation.sql.
 * Pure, so the shape is unit-tested even where no database is configured.
 */

export interface RunRow {
  provider: string;
  model: string;
  location_id: string;
  latitude: number;
  longitude: number;
  issued_at: string;
  model_run_at: string | null;
}

export interface ValueRow {
  target_time: string;
  lead_hours: number;
  temperature_c: number | null;
  precipitation_probability: number | null;
  precipitation_mm: number | null;
  weather_code: number | null;
}

export interface Snapshot {
  run: RunRow;
  values: ValueRow[];
}

const iso = (unix: number) => new Date(unix * 1000).toISOString();

/** Keep only future target times (lead ≥ 0) up to `maxLeadHours`. */
function inWindow(target: number, issued: number, maxLeadHours: number) {
  const lead = (target - issued) / 3600;
  return lead >= 0 && lead <= maxLeadHours;
}

export function snapshotFromForecast(f: Forecast, maxLeadHours = 72): Snapshot {
  const issued = Math.floor(f.fetchedAt / 1000);
  return {
    run: {
      provider: f.provider,
      model: f.model,
      location_id: f.location.id,
      latitude: f.location.latitude,
      longitude: f.location.longitude,
      issued_at: iso(issued),
      model_run_at: null,
    },
    values: f.hourly
      .filter((h) => inWindow(h.time, issued, maxLeadHours))
      .map((h) => ({
        target_time: iso(h.time),
        lead_hours: Math.round(((h.time - issued) / 3600) * 100) / 100,
        temperature_c: h.temperature,
        precipitation_probability: h.precipitationProbability,
        precipitation_mm: h.precipitation,
        weather_code: h.weatherCode,
      })),
  };
}

export function snapshotFromModel(
  m: ModelForecast,
  location: GeoLocation,
  provider: string,
  modelRunAt: number | null,
  maxLeadHours = 72,
): Snapshot | null {
  if (m.status !== "ok") return null;
  const issued = Math.floor(m.fetchedAt / 1000);
  return {
    run: {
      provider,
      model: m.modelId,
      location_id: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
      issued_at: iso(issued),
      model_run_at: modelRunAt == null ? null : iso(modelRunAt),
    },
    values: m.hourly
      .filter((h) => inWindow(h.time, issued, maxLeadHours))
      .map((h) => ({
        target_time: iso(h.time),
        lead_hours: Math.round(((h.time - issued) / 3600) * 100) / 100,
        temperature_c: h.temperature,
        precipitation_probability: h.precipitationProbability,
        precipitation_mm: h.precipitation,
        weather_code: h.weatherCode,
      })),
  };
}
