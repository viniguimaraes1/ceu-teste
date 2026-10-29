import type { Forecast, GeoLocation, ModelForecast, ModelRunInfo } from "../types";

/**
 * Contract every weather data source implements. Additional providers
 * (e.g. INMET, a radar nowcast) plug in here without touching the UI.
 */
export interface WeatherProvider {
  id: string;
  name: string;
  attribution: { label: string; url: string; license?: string };
  /** Primary forecast for a location. Throws on failure. */
  getForecast(location: GeoLocation): Promise<Forecast>;
  /** One model's raw forecast. Never throws: failures come back as `status: "error"`. */
  getModelForecast(location: GeoLocation, modelId: string): Promise<ModelForecast>;
  /** Latest run metadata, with nulls when unavailable. Never throws. */
  getModelRunInfo(modelId: string, dataset: string): Promise<ModelRunInfo>;
}
