import type { ModelForecast } from "./types";
import { MEASURABLE_MM } from "./rain";

/**
 * Model comparison. These numbers describe how much independent models
 * AGREE with each other. Agreement is not accuracy and not a calibrated
 * probability: models can agree and all be wrong. A calibrated ensemble is a
 * separate, future piece of work (see docs/ACCURACY.md).
 */

export type AgreementLevel = "high" | "moderate" | "low" | "unavailable";

/** Heuristic thresholds — uncalibrated, chosen for readability, documented. */
export const AGREEMENT_THRESHOLDS = {
  /** Mean hourly temperature spread (°C). */
  tempHigh: 1.5,
  tempLow: 3,
  /** Share of hours where models split between wet and dry. */
  rainHigh: 0.15,
  rainLow: 0.35,
} as const;

export interface HourComparison {
  time: number;
  /** Values keyed by model id; null where the model has no value. */
  temperature: Record<string, number | null>;
  precipitation: Record<string, number | null>;
  precipitationProbability: Record<string, number | null>;
  temperatureSpread: number | null;
  precipitationRange: { min: number; max: number } | null;
  /** Some models wet (≥ 0.1 mm) while others dry. */
  wetDrySplit: boolean;
}

export interface AgreementSummary {
  level: AgreementLevel;
  modelsCompared: number;
  hoursCompared: number;
  meanTemperatureSpread: number | null;
  maxTemperatureSpread: number | null;
  /** 0–1 */
  rainSplitShare: number | null;
}

function usable(models: ModelForecast[]): ModelForecast[] {
  return models.filter((m) => m.status === "ok");
}

/** Aligns models on timestamps in [fromUnix, fromUnix + hours*3600). */
export function compareHours(models: ModelForecast[], fromUnix: number, hours: number): HourComparison[] {
  const ok = usable(models);
  if (ok.length === 0) return [];
  const end = fromUnix + hours * 3600;
  const timeSet = new Set<number>();
  for (const m of ok) for (const p of m.hourly) if (p.time >= fromUnix && p.time < end) timeSet.add(p.time);
  const sorted = [...timeSet].sort((a, b) => a - b);
  const lookups = ok.map((m) => ({ id: m.modelId, byTime: new Map(m.hourly.map((p) => [p.time, p])) }));

  return sorted.map((time) => {
    const temperature: Record<string, number | null> = {};
    const precipitation: Record<string, number | null> = {};
    const precipitationProbability: Record<string, number | null> = {};
    for (const { id, byTime } of lookups) {
      const p = byTime.get(time);
      temperature[id] = p?.temperature ?? null;
      precipitation[id] = p?.precipitation ?? null;
      precipitationProbability[id] = p?.precipitationProbability ?? null;
    }
    const temps = Object.values(temperature).filter((v): v is number => v != null);
    const precs = Object.values(precipitation).filter((v): v is number => v != null);
    const wet = precs.filter((v) => v >= MEASURABLE_MM).length;
    return {
      time,
      temperature,
      precipitation,
      precipitationProbability,
      temperatureSpread: temps.length >= 2 ? Math.max(...temps) - Math.min(...temps) : null,
      precipitationRange: precs.length ? { min: Math.min(...precs), max: Math.max(...precs) } : null,
      wetDrySplit: precs.length >= 2 && wet > 0 && wet < precs.length,
    };
  });
}

export function summarizeAgreement(hours: HourComparison[], modelsCompared: number): AgreementSummary {
  const spreads = hours.map((h) => h.temperatureSpread).filter((v): v is number => v != null);
  const rainHours = hours.filter((h) => h.precipitationRange != null);
  const empty: AgreementSummary = {
    level: "unavailable",
    modelsCompared,
    hoursCompared: hours.length,
    meanTemperatureSpread: null,
    maxTemperatureSpread: null,
    rainSplitShare: null,
  };
  if (modelsCompared < 2 || spreads.length === 0) return empty;

  const meanSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const maxSpread = Math.max(...spreads);
  const splitShare = rainHours.length ? rainHours.filter((h) => h.wetDrySplit).length / rainHours.length : null;

  const t = AGREEMENT_THRESHOLDS;
  let level: AgreementLevel;
  if (meanSpread > t.tempLow || (splitShare ?? 0) > t.rainLow) level = "low";
  else if (meanSpread <= t.tempHigh && (splitShare ?? 0) <= t.rainHigh) level = "high";
  else level = "moderate";

  return {
    level,
    modelsCompared,
    hoursCompared: hours.length,
    meanTemperatureSpread: meanSpread,
    maxTemperatureSpread: maxSpread,
    rainSplitShare: splitShare,
  };
}

export const AGREEMENT_LABEL: Record<AgreementLevel, string> = {
  high: "Modelos em alta concordância",
  moderate: "Concordância moderada entre modelos",
  low: "Modelos divergem",
  unavailable: "Comparação indisponível",
};

export function agreementExplanation(s: AgreementSummary): string {
  if (s.level === "unavailable") {
    return "Não há modelos suficientes com dados para comparar nesta localização.";
  }
  const parts: string[] = [];
  if (s.meanTemperatureSpread != null) {
    parts.push(
      `diferença média de ${s.meanTemperatureSpread.toFixed(1).replace(".", ",")}° na temperatura`,
    );
  }
  if (s.rainSplitShare != null) {
    parts.push(
      s.rainSplitShare === 0
        ? "concordam sobre chuva ou tempo seco em todas as horas"
        : `discordam sobre chuva em ${Math.round(s.rainSplitShare * 100)}% das horas`,
    );
  }
  return `${s.modelsCompared} modelos nas próximas ${s.hoursCompared} horas: ${parts.join("; ")}.`;
}

/** Per-day comparison of max/min temperature and precipitation totals. */
export interface DayComparison {
  date: number;
  byModel: Record<string, { max: number | null; min: number | null; precip: number | null }>;
}

export function compareDays(models: ModelForecast[], days: number): DayComparison[] {
  const ok = usable(models);
  const dates = [...new Set(ok.flatMap((m) => m.daily.map((d) => d.date)))].sort((a, b) => a - b).slice(0, days);
  return dates.map((date) => {
    const byModel: DayComparison["byModel"] = {};
    for (const m of ok) {
      const d = m.daily.find((x) => x.date === date);
      byModel[m.modelId] = { max: d?.temperatureMax ?? null, min: d?.temperatureMin ?? null, precip: d?.precipitationSum ?? null };
    }
    return { date, byModel };
  });
}
