import { afterEach, describe, expect, it, vi } from "vitest";
import { buildForecastUrl, buildModelUrl, openMeteoProvider } from "@/lib/weather/providers/open-meteo/client";
import { SAO_PAULO } from "@/lib/location/locations";

afterEach(() => vi.unstubAllGlobals());

describe("Open-Meteo client", () => {
  it("requests unixtime in the location's own time zone", () => {
    const url = new URL(buildForecastUrl(SAO_PAULO));
    expect(url.searchParams.get("timeformat")).toBe("unixtime");
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("latitude")).toBe("-23.5505");
    expect(url.searchParams.get("hourly")).toContain("precipitation_probability");
    expect(new URL(buildModelUrl(SAO_PAULO, "icon_seamless")).searchParams.get("models")).toBe("icon_seamless");
  });

  it("surfaces API errors instead of returning data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: true, reason: "Bad lat" }), { status: 400 })));
    await expect(openMeteoProvider.getForecast(SAO_PAULO)).rejects.toThrow("Bad lat");
  });

  it("turns a failing model into an error entry without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const m = await openMeteoProvider.getModelForecast(SAO_PAULO, "gfs_seamless");
    expect(m.status).toBe("error");
    expect(m.message).toContain("offline");
    const run = await openMeteoProvider.getModelRunInfo("gfs_seamless", "ncep_gfs025");
    expect(run).toEqual({ modelId: "gfs_seamless", initialisedAt: null, availableAt: null });
  });
});
