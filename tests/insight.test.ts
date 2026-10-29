import { describe, expect, it } from "vitest";
import { buildRainInsight, periodPhrase } from "@/lib/weather/insight";
import { at, buildForecast } from "./helpers";

const NOW = at(12, 20); // 12:20 local

describe("buildRainInsight", () => {
  it("reports no rain and a later rise with the hour the data supports", () => {
    const f = buildForecast({ probs: { 13: 5, 14: 10, 15: 20, 16: 30, 17: 55, 18: 70 } });
    const r = buildRainInsight(f, NOW);
    expect(r.kind).toBe("dry");
    expect(r.headline).toBe("Sem chuva prevista nas próximas 2 horas");
    expect(r.detail).toBe("O risco aumenta no fim da tarde: 55% por volta das 17h.");
    expect(r.focusTime).toBe(at(17));
  });

  it("flags low risk between 20% and 40%", () => {
    const f = buildForecast({ probs: { 13: 25, 14: 10 } });
    const r = buildRainInsight(f, NOW);
    expect(r.kind).toBe("low-risk");
    expect(r.headline).toBe("Baixo risco de chuva nas próximas 2 horas");
    expect(r.detail).toBe("Probabilidade de chuva abaixo de 20% nas próximas 12 horas.");
  });

  it("calls rain possible soon, quoting the peak probability", () => {
    const f = buildForecast({ probs: { 13: 45, 14: 60 }, mm: { 14: 1.2 } });
    const r = buildRainInsight(f, NOW);
    expect(r.kind).toBe("rain-soon");
    expect(r.detail).toBe("Probabilidade de 60% por volta das 14h.");
  });

  it("treats meaningful expected precipitation as rain-soon even with missing probability", () => {
    const f = buildForecast({ probs: { 13: null, 14: null }, mm: { 14: 0.8 } });
    expect(buildRainInsight(f, NOW).kind).toBe("rain-soon");
  });

  it("describes when the chance drops while it is raining", () => {
    const f = buildForecast({
      probs: { 13: 80, 14: 60, 15: 25 },
      mm: { 13: 2, 14: 0.5, 15: 0 },
      current: { precipitation: 1.4, weatherCode: 63 },
    });
    const r = buildRainInsight(f, NOW);
    expect(r.kind).toBe("rain-now");
    expect(r.detail).toBe("A chance de chuva fica abaixo de 30% a partir das 15h.");
  });

  it("does not claim persistence when probabilities are missing", () => {
    const f = buildForecast({
      probs: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [13 + i, i === 3 ? null : 80])),
      mm: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [13 + i, 1])),
      current: { precipitation: 1, weatherCode: 61 },
    });
    expect(buildRainInsight(f, NOW).detail).toBeNull();
  });

  it("says unavailable instead of guessing when there is no data", () => {
    const probs = Object.fromEntries(Array.from({ length: 48 }, (_, h) => [h, null]));
    const mm = Object.fromEntries(Array.from({ length: 48 }, (_, h) => [h, null]));
    const r = buildRainInsight(buildForecast({ probs, mm }), NOW);
    expect(r.kind).toBe("unavailable");
  });
});

describe("periodPhrase", () => {
  it("names periods of today and tomorrow", () => {
    expect(periodPhrase(at(9), NOW, "America/Sao_Paulo")).toBe("pela manhã");
    expect(periodPhrase(at(13), NOW, "America/Sao_Paulo")).toBe("à tarde");
    expect(periodPhrase(at(20), NOW, "America/Sao_Paulo")).toBe("à noite");
    expect(periodPhrase(at(26), NOW, "America/Sao_Paulo")).toBe("na madrugada de amanhã");
    expect(periodPhrase(at(33), NOW, "America/Sao_Paulo")).toBe("amanhã pela manhã");
  });
});
