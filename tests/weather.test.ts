import { describe, expect, it } from "vitest";
import { skySceneFor } from "@/lib/weather/scene";
import { compareHours, summarizeAgreement } from "@/lib/weather/comparison";
import { rainIntensity } from "@/lib/weather/rain";
import { currentHourIndex } from "@/lib/weather/timeline";
import {
  compassDirection,
  formatDayLabel,
  formatHour,
  formatMm,
  formatTemp,
  formatWeekdayShort,
} from "@/lib/weather/format";
import { conditionIcon, conditionLabel } from "@/lib/weather/conditions";
import { sanitizeLocation, parseLocationCookie, SAO_PAULO } from "@/lib/location/locations";
import type { ModelForecast } from "@/lib/weather/types";
import { at } from "./helpers";

const TZ = "America/Sao_Paulo";

describe("format (São Paulo time zone)", () => {
  it("formats hours and weekdays in local time regardless of host zone", () => {
    expect(formatHour(at(17), TZ)).toBe("17h");
    expect(formatHour(at(0), TZ)).toBe("0h");
    expect(formatWeekdayShort(at(12), TZ)).toBe("Qui"); // 2026-10-29 is a Thursday
    expect(formatDayLabel(at(12), at(9), TZ)).toBe("Hoje");
    expect(formatDayLabel(at(36), at(9), TZ)).toBe("Amanhã");
    expect(formatDayLabel(at(60), at(9), TZ)).toBe("Sáb");
  });

  it("formats values and missing values", () => {
    expect(formatTemp(26.6)).toBe("27°");
    expect(formatTemp(null)).toBe("—");
    expect(formatMm(0.44)).toBe("0,4 mm");
    expect(formatMm(12)).toBe("12 mm");
    expect(compassDirection(135)).toBe("SE");
    expect(compassDirection(359)).toBe("N");
  });
});

describe("conditions", () => {
  it("maps WMO codes to labels and icons", () => {
    expect(conditionLabel(2)).toBe("Parcialmente nublado");
    expect(conditionLabel(42)).toBe("Condição indisponível");
    expect(conditionIcon(0, false)).toBe("moon");
    expect(conditionIcon(95)).toBe("storm");
  });
});

describe("currentHourIndex", () => {
  it("returns the step containing now", () => {
    const hours = [at(10), at(11), at(12), at(13)].map((time) => ({ time }));
    expect(currentHourIndex(hours, at(12, 40))).toBe(2);
    expect(currentHourIndex(hours, at(9))).toBe(0);
    expect(currentHourIndex(hours, at(20))).toBe(3);
    expect(currentHourIndex([], at(9))).toBe(-1);
  });
});

describe("skySceneFor", () => {
  const today = { sunrise: at(5, 30), sunset: at(18, 15) };
  const base = { weatherCode: 1, isDay: true, cloudCover: 10, precipitation: 0, time: at(12) };

  it("prioritizes precipitation and storms", () => {
    expect(skySceneFor({ ...base, weatherCode: 95 }, today)).toBe("storm");
    expect(skySceneFor({ ...base, weatherCode: 61 }, today)).toBe("rain");
    expect(skySceneFor({ ...base, weatherCode: 3, precipitation: 0.3 }, today)).toBe("rain");
  });

  it("uses golden hour near sunset only when not overcast", () => {
    expect(skySceneFor({ ...base, time: at(18, 0) }, today)).toBe("sunset");
    expect(skySceneFor({ ...base, time: at(18, 0), weatherCode: 3 }, today)).toBe("cloudy-day");
  });

  it("distinguishes day/night and clear/cloudy", () => {
    expect(skySceneFor(base, today)).toBe("clear-day");
    expect(skySceneFor({ ...base, weatherCode: 3 }, today)).toBe("cloudy-day");
    expect(skySceneFor({ ...base, isDay: false, time: at(22) }, today)).toBe("clear-night");
    expect(skySceneFor({ ...base, isDay: false, time: at(22), weatherCode: 2 }, today)).toBe("cloudy-night");
  });
});

describe("rainIntensity", () => {
  it("classifies hourly accumulations", () => {
    expect(rainIntensity(null)).toBeNull();
    expect(rainIntensity(0)).toBe("none");
    expect(rainIntensity(0.05)).toBe("trace");
    expect(rainIntensity(1)).toBe("light");
    expect(rainIntensity(5)).toBe("moderate");
    expect(rainIntensity(20)).toBe("heavy");
    expect(rainIntensity(60)).toBe("violent");
  });
});

function model(id: string, temps: (number | null)[], precs: (number | null)[], status: ModelForecast["status"] = "ok"): ModelForecast {
  return {
    modelId: id,
    status,
    fetchedAt: 0,
    hourly: temps.map((t, i) => ({
      time: at(12 + i),
      temperature: t,
      precipitation: precs[i],
      precipitationProbability: null,
      weatherCode: null,
    })),
    daily: [],
  };
}

describe("model comparison", () => {
  it("computes spread and wet/dry splits, skipping failed models", () => {
    const hours = compareHours(
      [
        model("a", [20, 22, 24], [0, 0, 2]),
        model("b", [21, 25, null], [0, 1, 3]),
        model("c", [], [], "error"),
      ],
      at(12),
      3,
    );
    expect(hours).toHaveLength(3);
    expect(hours[0].temperatureSpread).toBe(1);
    expect(hours[1].temperatureSpread).toBe(3);
    expect(hours[2].temperatureSpread).toBeNull();
    expect(hours.map((h) => h.wetDrySplit)).toEqual([false, true, false]);
    expect(Object.keys(hours[0].temperature)).toEqual(["a", "b"]);
  });

  it("summarizes agreement levels", () => {
    const close = compareHours([model("a", [20, 21], [0, 0]), model("b", [20.5, 21.5], [0, 0])], at(12), 2);
    expect(summarizeAgreement(close, 2).level).toBe("high");

    const far = compareHours([model("a", [20, 21], [0, 0]), model("b", [25, 26], [0, 0])], at(12), 2);
    expect(summarizeAgreement(far, 2).level).toBe("low");

    const rainSplit = compareHours([model("a", [20, 21], [0, 0]), model("b", [21, 22], [2, 0])], at(12), 2);
    const s = summarizeAgreement(rainSplit, 2);
    expect(s.rainSplitShare).toBe(0.5);
    expect(s.level).toBe("low");

    expect(summarizeAgreement(close, 1).level).toBe("unavailable");
  });
});

describe("location sanitizing", () => {
  it("accepts valid input and rounds coordinates", () => {
    const l = sanitizeLocation({ name: "Jundiaí", region: "SP", latitude: -23.18654, longitude: -46.88421 });
    expect(l).toMatchObject({ name: "Jundiaí", latitude: -23.19, longitude: -46.88 });
  });

  it("rejects invalid input and falls back to São Paulo for bad cookies", () => {
    expect(sanitizeLocation({ name: "X", latitude: 200, longitude: 0 })).toBeNull();
    expect(sanitizeLocation({ name: "", latitude: 0, longitude: 0 })).toBeNull();
    expect(parseLocationCookie("{not json")).toBe(SAO_PAULO);
    expect(sanitizeLocation({ name: "<script>a", latitude: 1, longitude: 1 })?.name).toBe("scripta");
  });
});

import { buildWeekTrend } from "@/lib/weather/trend";
import type { DailyPoint } from "@/lib/weather/types";

function day(offset: number, max: number | null, prob: number | null): DailyPoint {
  return {
    date: at(24 * offset),
    weatherCode: 2,
    temperatureMax: max,
    temperatureMin: max == null ? null : max - 8,
    precipitationSum: null,
    precipitationProbabilityMax: prob,
    precipitationHours: null,
    sunrise: null,
    sunset: null,
    windSpeedMax: null,
    windGustsMax: null,
    uvIndexMax: null,
  };
}

describe("buildWeekTrend", () => {
  it("summarizes range, wettest days and warmest day from data only", () => {
    const lines = buildWeekTrend(
      [day(0, 27, 20), day(1, 29, 70), day(2, 31, 10), day(3, 24, 60)],
      at(9),
      "America/Sao_Paulo",
    );
    expect(lines).toEqual([
      "Máximas entre 24° e 31° nos próximos 4 dias.",
      "Maior chance de chuva: amanhã (70%) e dom (60%).",
      "Dia mais quente: sáb, 31°.",
    ]);
  });

  it("omits statements it has no data for", () => {
    expect(buildWeekTrend([day(0, null, null)], at(9), "America/Sao_Paulo")).toEqual([]);
    expect(buildWeekTrend([day(0, 25, 10), day(1, 25, 5)], at(9), "America/Sao_Paulo")).toEqual([
      "Máximas em torno de 25° nos próximos 2 dias.",
      "Nenhum dia com chance de chuva de 50% ou mais.",
    ]);
  });
});
