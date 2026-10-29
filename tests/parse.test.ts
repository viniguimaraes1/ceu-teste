import { describe, expect, it } from "vitest";
import { parseForecast, parseModelForecast, OpenMeteoParseError } from "@/lib/weather/providers/open-meteo/parse";
import type { OpenMeteoResponse } from "@/lib/weather/providers/open-meteo/schema";
import { SAO_PAULO } from "@/lib/location/locations";
import { syntheticForecast } from "@/dev/fixtures/synthetic-open-meteo";
import { at, DAY_START } from "./helpers";

// Hand-written payload in Open-Meteo's documented unixtime format (test input, not weather data).
const raw: OpenMeteoResponse = {
  latitude: -23.5,
  longitude: -46.625,
  utc_offset_seconds: -10800,
  timezone: "America/Sao_Paulo",
  current: { time: at(12, 15), interval: 900, temperature_2m: 26.1, is_day: 1, weather_code: 2, precipitation: 0 },
  hourly: {
    time: [at(12), at(13), at(14)],
    temperature_2m: [25.9, 26.4, null],
    precipitation_probability: [5, 10, 55],
    precipitation: [0, 0, 1.3],
    weather_code: [2, 3, 80],
  },
  daily: {
    time: [DAY_START],
    temperature_2m_max: [28.2],
    temperature_2m_min: [18.4],
    sunrise: [at(5, 31)],
    sunset: [at(18, 14)],
  },
};

describe("parseForecast", () => {
  it("maps variables, keeping missing ones as null", () => {
    const f = parseForecast(raw, SAO_PAULO, 1000);
    expect(f.timezone).toBe("America/Sao_Paulo");
    expect(f.current.temperature).toBe(26.1);
    expect(f.current.apparentTemperature).toBeNull(); // not in payload → null, never invented
    expect(f.current.isDay).toBe(true);
    expect(f.hourly).toHaveLength(3);
    expect(f.hourly[2].temperature).toBeNull();
    expect(f.hourly[2].precipitationProbability).toBe(55);
    expect(f.hourly[0].uvIndex).toBeNull();
    expect(f.daily[0].temperatureMax).toBe(28.2);
    expect(f.daily[0].precipitationSum).toBeNull();
    expect(f.origin).toBe("live");
  });

  it("derives is_day from sunrise/sunset when the flag is absent", () => {
    const f = parseForecast(raw, SAO_PAULO, 1000);
    // hourly is_day not requested in this payload
    expect(f.hourly[0].isDay).toBe(true);
    const night = parseForecast(
      { ...raw, hourly: { time: [at(20)], temperature_2m: [20] } },
      SAO_PAULO,
      1000,
    );
    expect(night.hourly[0].isDay).toBe(false);
  });

  it("rejects payloads without a time axis or time zone", () => {
    expect(() => parseForecast({ ...raw, hourly: undefined }, SAO_PAULO, 0)).toThrow(OpenMeteoParseError);
    expect(() =>
      parseForecast({ ...raw, timezone: undefined } as unknown as OpenMeteoResponse, SAO_PAULO, 0),
    ).toThrow(OpenMeteoParseError);
    expect(() =>
      parseForecast({ ...raw, hourly: { time: ["2026-10-29T12:00"] as unknown as number[] } }, SAO_PAULO, 0),
    ).toThrow(/unixtime/);
  });

  it("ignores non-numeric garbage values", () => {
    const f = parseForecast(
      { ...raw, hourly: { time: [at(12)], temperature_2m: ["hot" as unknown as number] } },
      SAO_PAULO,
      0,
    );
    expect(f.hourly[0].temperature).toBeNull();
  });

  it("parses the synthetic fixture end to end and marks its origin", () => {
    const f = parseForecast(syntheticForecast(at(12), -23.55, -46.63), SAO_PAULO, 0, "synthetic-fixture");
    expect(f.hourly).toHaveLength(240);
    expect(f.daily).toHaveLength(10);
    expect(f.origin).toBe("synthetic-fixture");
  });
});

describe("parseModelForecast", () => {
  it("reads multi-model suffixed keys", () => {
    const m = parseModelForecast(
      {
        ...raw,
        hourly: { time: [at(12), at(13)], temperature_2m_gfs_seamless: [24, 25], precipitation_gfs_seamless: [0, 0.4] },
        daily: { time: [DAY_START], temperature_2m_max_gfs_seamless: [29] },
      },
      "gfs_seamless",
      0,
    );
    expect(m.status).toBe("ok");
    expect(m.hourly[1].precipitation).toBe(0.4);
    expect(m.hourly[1].precipitationProbability).toBeNull();
    expect(m.daily[0].temperatureMax).toBe(29);
  });

  it("marks a model with an all-null response as no-data", () => {
    const m = parseModelForecast(
      { ...raw, hourly: { time: [at(12)], temperature_2m: [null], precipitation: [null] } },
      "icon_seamless",
      0,
    );
    expect(m.status).toBe("no-data");
  });
});
