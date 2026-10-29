import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { LOCATION_COOKIE, parseLocationCookie } from "@/lib/location/locations";
import type { Forecast, GeoLocation, ModelForecast } from "./types";
import { getForecast, getModelForecasts } from "./service";

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PageContext {
  location: GeoLocation;
  nowMs: number;
  nowUnix: number;
}

/** Reads request-time context: the chosen location (cookie) and the clock. */
export async function pageContext(): Promise<PageContext> {
  await connection();
  const store = await cookies();
  const location = parseLocationCookie(store.get(LOCATION_COOKIE)?.value);
  const nowMs = Date.now();
  return { location, nowMs, nowUnix: Math.floor(nowMs / 1000) };
}

export async function loadForecast(ctx: PageContext): Promise<Loaded<Forecast>> {
  try {
    return { ok: true, data: await getForecast(ctx.location, ctx.nowMs) };
  } catch (err) {
    console.error("[forecast]", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function loadModels(ctx: PageContext): Promise<Loaded<ModelForecast[]>> {
  try {
    return { ok: true, data: await getModelForecasts(ctx.location, ctx.nowMs) };
  } catch (err) {
    console.error("[models]", err);
    return { ok: false, error: (err as Error).message };
  }
}
