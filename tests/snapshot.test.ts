import { describe, expect, it } from "vitest";
import { snapshotFromForecast, snapshotFromModel } from "@/lib/accuracy/snapshot";
import { SAO_PAULO } from "@/lib/location/locations";
import { at, buildForecast } from "./helpers";

describe("forecast snapshots", () => {
  it("keeps only future hours within the lead window, with ISO timestamps", () => {
    const f = { ...buildForecast({ probs: { 13: 40 } }), fetchedAt: at(12, 30) * 1000 };
    const s = snapshotFromForecast(f, 6);
    expect(s.run).toMatchObject({ model: "best_match", location_id: "sao-paulo", issued_at: "2026-10-29T15:30:00.000Z" });
    expect(s.values[0]).toMatchObject({ target_time: "2026-10-29T16:00:00.000Z", lead_hours: 0.5, precipitation_probability: 40 });
    expect(s.values.at(-1)!.lead_hours).toBeLessThanOrEqual(6);
    expect(s.values).toHaveLength(6);
  });

  it("skips models without data and records model run time", () => {
    const base = { modelId: "gfs_seamless", fetchedAt: at(12) * 1000, daily: [] };
    expect(snapshotFromModel({ ...base, status: "error", hourly: [] }, SAO_PAULO, "open-meteo", null)).toBeNull();
    const s = snapshotFromModel(
      {
        ...base,
        status: "ok",
        hourly: [{ time: at(13), temperature: 24, precipitation: 0.2, precipitationProbability: null, weatherCode: 61 }],
      },
      SAO_PAULO,
      "open-meteo",
      at(3),
    )!;
    expect(s.run.model_run_at).toBe("2026-10-29T06:00:00.000Z");
    expect(s.values).toEqual([
      { target_time: "2026-10-29T16:00:00.000Z", lead_hours: 1, temperature_c: 24, precipitation_probability: null, precipitation_mm: 0.2, weather_code: 61 },
    ]);
  });
});
