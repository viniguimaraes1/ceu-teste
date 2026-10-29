import { describe, expect, it } from "vitest";
import {
  brierScore,
  brierSkillScore,
  calibrationBins,
  contingency,
  detectionScores,
  meanAbsoluteError,
  meanError,
  onsetTimingErrorHours,
} from "@/lib/accuracy/metrics";

describe("continuous metrics", () => {
  it("computes MAE and bias", () => {
    const pairs = [
      { forecast: 25, observed: 23 },
      { forecast: 20, observed: 21 },
    ];
    expect(meanAbsoluteError(pairs)).toBe(1.5);
    expect(meanError(pairs)).toBe(0.5);
    expect(meanAbsoluteError([])).toBeNull();
  });
});

describe("probabilistic metrics", () => {
  it("scores perfect and worst forecasts", () => {
    expect(brierScore([{ probability: 1, occurred: true }, { probability: 0, occurred: false }])).toBe(0);
    expect(brierScore([{ probability: 0, occurred: true }])).toBe(1);
    expect(brierScore([{ probability: 0.7, occurred: true }])).toBeCloseTo(0.09);
    expect(brierScore([])).toBeNull();
  });

  it("compares against climatology", () => {
    const pairs = [
      { probability: 0.9, occurred: true },
      { probability: 0.1, occurred: false },
      { probability: 0.2, occurred: false },
      { probability: 0.8, occurred: true },
    ];
    expect(brierSkillScore(pairs)!).toBeGreaterThan(0);
    // A forecast equal to the base rate has zero skill.
    expect(brierSkillScore(pairs.map((p) => ({ ...p, probability: 0.5 })))).toBeCloseTo(0);
  });

  it("builds reliability bins", () => {
    const bins = calibrationBins(
      [
        { probability: 0.05, occurred: false },
        { probability: 0.08, occurred: true },
        { probability: 1, occurred: true },
      ],
      10,
    );
    expect(bins[0]).toMatchObject({ count: 2, observedFrequency: 0.5 });
    expect(bins[0].meanForecast).toBeCloseTo(0.065);
    expect(bins[9]).toMatchObject({ count: 1, observedFrequency: 1 });
    expect(bins[5].observedFrequency).toBeNull();
  });
});

describe("rain detection", () => {
  it("derives precision, recall and CSI from a contingency table", () => {
    const c = contingency([
      { predicted: true, occurred: true },
      { predicted: true, occurred: false },
      { predicted: false, occurred: true },
      { predicted: false, occurred: false },
      { predicted: true, occurred: true },
    ]);
    expect(c).toEqual({ hits: 2, misses: 1, falseAlarms: 1, correctNegatives: 1 });
    const s = detectionScores(c);
    expect(s.precision).toBeCloseTo(2 / 3);
    expect(s.recall).toBeCloseTo(2 / 3);
    expect(s.csi).toBe(0.5);
    expect(s.bias).toBe(1);
    expect(detectionScores(contingency([])).precision).toBeNull();
  });

  it("measures onset timing error only when both sides have rain", () => {
    const f = [
      { time: 0, value: 0 },
      { time: 7200, value: 1 },
    ];
    const o = [
      { time: 0, value: 0 },
      { time: 3600, value: 0.4 },
    ];
    expect(onsetTimingErrorHours(f, o)).toBe(1);
    expect(onsetTimingErrorHours(f, [{ time: 0, value: 0 }])).toBeNull();
  });
});
