import "server-only";
import { cacheLife } from "next/cache";
import type { Forecast, GeoLocation, ModelForecast, ModelRunInfo } from "./types";
import { openMeteoProvider } from "./providers/open-meteo/client";
import { parseForecast, parseModelForecast } from "./providers/open-meteo/parse";
import { COMPARISON_MODELS } from "./models";

/**
 * Entry point used by pages. Live data is cached for 10 minutes per
 * location (Open-Meteo itself updates at most every 15 minutes).
 *
 * CEU_FIXTURES=1 swaps in clearly-labelled synthetic data for offline UI
 * development. It is refused on Vercel production deployments.
 */
export function usingFixtures(): boolean {
  return process.env.CEU_FIXTURES === "1" && process.env.VERCEL_ENV !== "production";
}

export const provider = openMeteoProvider;

async function cachedForecast(location: GeoLocation): Promise<Forecast> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  try {
    return await provider.getForecast(location);
  } catch (err) {
    // Errors leaving a cache scope are redacted in production; log the cause here.
    console.error("[open-meteo] forecast failed:", (err as Error).message);
    throw err;
  }
}

async function cachedModels(location: GeoLocation): Promise<ModelForecast[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  const models = await Promise.all(COMPARISON_MODELS.map((m) => provider.getModelForecast(location, m.id)));
  // A total outage must not be cached for the whole lifetime; partial gaps are fine.
  if (models.every((m) => m.status === "error")) {
    console.error("[open-meteo] all models failed:", models.map((m) => m.message).join(" | "));
    throw new Error("Nenhum modelo respondeu");
  }
  return models;
}

async function cachedRunInfo(): Promise<ModelRunInfo[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  return Promise.all(COMPARISON_MODELS.map((m) => provider.getModelRunInfo(m.id, m.metaDataset)));
}

export async function getForecast(location: GeoLocation, nowMs: number): Promise<Forecast> {
  if (usingFixtures()) {
    const { syntheticForecast } = await import("@/dev/fixtures/synthetic-open-meteo");
    const raw = syntheticForecast(Math.floor(nowMs / 1000), location.latitude, location.longitude);
    return parseForecast(raw, location, nowMs, "synthetic-fixture");
  }
  return cachedForecast(location);
}

export async function getModelForecasts(location: GeoLocation, nowMs: number): Promise<ModelForecast[]> {
  if (usingFixtures()) {
    const { syntheticModelForecast } = await import("@/dev/fixtures/synthetic-open-meteo");
    return COMPARISON_MODELS.map((m) =>
      parseModelForecast(syntheticModelForecast(Math.floor(nowMs / 1000), m.id), m.id, nowMs),
    );
  }
  return cachedModels(location);
}

export async function getModelRunInfo(): Promise<ModelRunInfo[]> {
  if (usingFixtures()) {
    return COMPARISON_MODELS.map((m) => ({ modelId: m.id, initialisedAt: null, availableAt: null }));
  }
  return cachedRunInfo();
}
