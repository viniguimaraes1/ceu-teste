/**
 * Forecast verification metrics. Pure functions over paired
 * (forecast, observation) samples — no data, no results, just the maths.
 * Every function returns null when there is nothing to score, so callers
 * can never mistake "no data" for "perfect score".
 */

export interface Pair {
  forecast: number;
  observed: number;
}

/** Mean absolute error, e.g. for 2 m temperature (°C). */
export function meanAbsoluteError(pairs: Pair[]): number | null {
  if (pairs.length === 0) return null;
  return pairs.reduce((s, p) => s + Math.abs(p.forecast - p.observed), 0) / pairs.length;
}

/** Mean error (bias): positive = forecast too high. */
export function meanError(pairs: Pair[]): number | null {
  if (pairs.length === 0) return null;
  return pairs.reduce((s, p) => s + (p.forecast - p.observed), 0) / pairs.length;
}

export interface ProbabilityPair {
  /** Forecast probability, 0–1. */
  probability: number;
  /** Whether the event happened (e.g. ≥ 0.1 mm in the hour). */
  occurred: boolean;
}

/** Brier score for probabilistic forecasts: 0 is perfect, 1 is worst. */
export function brierScore(pairs: ProbabilityPair[]): number | null {
  if (pairs.length === 0) return null;
  return pairs.reduce((s, p) => s + (clamp01(p.probability) - (p.occurred ? 1 : 0)) ** 2, 0) / pairs.length;
}

/**
 * Brier skill score against a reference (usually climatology: the observed
 * base rate). > 0 means better than the reference.
 */
export function brierSkillScore(pairs: ProbabilityPair[], referenceProbability?: number): number | null {
  const bs = brierScore(pairs);
  if (bs == null) return null;
  const base = referenceProbability ?? pairs.filter((p) => p.occurred).length / pairs.length;
  const ref = brierScore(pairs.map((p) => ({ probability: base, occurred: p.occurred })));
  if (ref == null || ref === 0) return null;
  return 1 - bs / ref;
}

export interface Contingency {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctNegatives: number;
}

/** 2×2 contingency table for a yes/no event (e.g. "rain ≥ 0.1 mm"). */
export function contingency(samples: { predicted: boolean; occurred: boolean }[]): Contingency {
  const c: Contingency = { hits: 0, misses: 0, falseAlarms: 0, correctNegatives: 0 };
  for (const s of samples) {
    if (s.predicted && s.occurred) c.hits++;
    else if (!s.predicted && s.occurred) c.misses++;
    else if (s.predicted && !s.occurred) c.falseAlarms++;
    else c.correctNegatives++;
  }
  return c;
}

function ratio(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

export function detectionScores(c: Contingency) {
  return {
    /** Of the times we said rain, how often did it rain. */
    precision: ratio(c.hits, c.hits + c.falseAlarms),
    /** Of the times it rained, how often did we say so (POD). */
    recall: ratio(c.hits, c.hits + c.misses),
    falseAlarmRatio: ratio(c.falseAlarms, c.hits + c.falseAlarms),
    /** Critical success index (threat score). */
    csi: ratio(c.hits, c.hits + c.misses + c.falseAlarms),
    /** Frequency bias: > 1 over-forecasts the event. */
    bias: ratio(c.hits + c.falseAlarms, c.hits + c.misses),
  };
}

export interface CalibrationBin {
  /** Inclusive lower / exclusive upper bound (last bin includes 1). */
  lower: number;
  upper: number;
  count: number;
  meanForecast: number | null;
  observedFrequency: number | null;
}

/** Reliability diagram data: forecast probability vs observed frequency. */
export function calibrationBins(pairs: ProbabilityPair[], binCount = 10): CalibrationBin[] {
  const bins: CalibrationBin[] = Array.from({ length: binCount }, (_, i) => ({
    lower: i / binCount,
    upper: (i + 1) / binCount,
    count: 0,
    meanForecast: null,
    observedFrequency: null,
  }));
  const sums = bins.map(() => ({ p: 0, o: 0 }));
  for (const pair of pairs) {
    const p = clamp01(pair.probability);
    const idx = Math.min(Math.floor(p * binCount), binCount - 1);
    bins[idx].count++;
    sums[idx].p += p;
    sums[idx].o += pair.occurred ? 1 : 0;
  }
  return bins.map((b, i) =>
    b.count === 0 ? b : { ...b, meanForecast: sums[i].p / b.count, observedFrequency: sums[i].o / b.count },
  );
}

/**
 * Onset timing error in hours: forecast first-rain time minus observed
 * first-rain time within a window. Positive = forecast too late.
 * Null when either side never reaches the threshold (that case belongs to
 * the contingency table, not to timing).
 */
export function onsetTimingErrorHours(
  forecast: { time: number; value: number }[],
  observed: { time: number; value: number }[],
  threshold = 0.1,
): number | null {
  const f = forecast.find((p) => p.value >= threshold);
  const o = observed.find((p) => p.value >= threshold);
  if (!f || !o) return null;
  return (f.time - o.time) / 3600;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
