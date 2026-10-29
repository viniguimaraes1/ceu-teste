import type { Forecast, HourlyPoint } from "./types";
import { isWetCode } from "./conditions";
import { dayKey, formatHour, localHour } from "./format";
import { MEASURABLE_MM } from "./rain";
import { currentHourIndex } from "./timeline";

/**
 * Rule-based, deterministic weather insights. Every sentence produced here is
 * a direct reading of forecast values — no inferred start times, no implied
 * certainty beyond the probabilities the provider returned.
 */

/** Below this probability we say no rain is expected. */
export const PROB_LOW = 20;
/** At or above this probability we call rain "possible" / say risk rises. */
export const PROB_RISK = 40;
/** Hours ahead considered by the "next hours" headline. */
export const SHORT_WINDOW_HOURS = 2;
/** Hours ahead scanned for a later change in risk. */
export const LOOKAHEAD_HOURS = 12;

export type InsightKind = "rain-now" | "rain-soon" | "low-risk" | "dry" | "unavailable";

export interface RainInsight {
  kind: InsightKind;
  headline: string;
  detail: string | null;
  /** The hour the detail sentence refers to, if any. */
  focusTime: number | null;
}

function maxOf(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? Math.max(...nums) : null;
}

function sumOf(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

/** "à tarde", "amanhã de madrugada", … relative to now in the forecast zone. */
export function periodPhrase(unix: number, nowUnix: number, timeZone: string): string {
  const hour = localHour(unix, timeZone);
  const sameDay = dayKey(unix, timeZone) === dayKey(nowUnix, timeZone);
  let period: string;
  if (hour < 6) period = "de madrugada";
  else if (hour < 12) period = "pela manhã";
  else if (hour < 15) period = "à tarde";
  else if (hour < 18) period = "no fim da tarde";
  else period = "à noite";
  if (sameDay) return period;
  if (period === "de madrugada") return "na madrugada de amanhã";
  return `amanhã ${period}`;
}

function isWetHour(p: HourlyPoint): boolean {
  return (p.precipitation ?? 0) >= MEASURABLE_MM;
}

export function buildRainInsight(forecast: Forecast, nowUnix: number): RainInsight {
  const tz = forecast.timezone;
  const idx = currentHourIndex(forecast.hourly, nowUnix);
  if (idx < 0) {
    return { kind: "unavailable", headline: "Previsão horária indisponível", detail: null, focusTime: null };
  }
  // Hourly values describe the preceding hour, so the steps after the current
  // one cover "from now on".
  const ahead = forecast.hourly.slice(idx + 1, idx + 1 + LOOKAHEAD_HOURS);
  const short = ahead.slice(0, SHORT_WINDOW_HOURS);
  const later = ahead.slice(SHORT_WINDOW_HOURS);

  if (short.length === 0) {
    return { kind: "unavailable", headline: "Previsão horária indisponível", detail: null, focusTime: null };
  }

  const c = forecast.current;
  const rainingNow = (c.precipitation ?? 0) >= MEASURABLE_MM || isWetCode(c.weatherCode);

  if (rainingNow) {
    const easing = ahead.find(
      (p) => p.precipitationProbability != null && p.precipitationProbability < 30 && !isWetHour(p),
    );
    if (easing) {
      return {
        kind: "rain-now",
        headline: "Chuva neste momento",
        detail: `A chance de chuva fica abaixo de 30% a partir das ${formatHour(easing.time, tz)}.`,
        focusTime: easing.time,
      };
    }
    const staysHigh = ahead.every((p) => p.precipitationProbability != null && p.precipitationProbability >= 30);
    return {
      kind: "rain-now",
      headline: "Chuva neste momento",
      detail: staysHigh ? `A probabilidade de chuva segue em 30% ou mais nas próximas ${ahead.length} horas.` : null,
      focusTime: null,
    };
  }

  const shortProb = maxOf(short.map((p) => p.precipitationProbability));
  const shortMm = sumOf(short.map((p) => p.precipitation)) ?? 0;

  if (shortProb == null && short.every((p) => p.precipitation == null)) {
    return { kind: "unavailable", headline: "Probabilidade de chuva indisponível", detail: null, focusTime: null };
  }

  if ((shortProb ?? 0) >= PROB_RISK || shortMm >= 0.5) {
    const peak = short.reduce((best, p) =>
      (p.precipitationProbability ?? -1) > (best.precipitationProbability ?? -1) ? p : best,
    );
    return {
      kind: "rain-soon",
      headline: `Chuva possível nas próximas ${SHORT_WINDOW_HOURS} horas`,
      detail:
        peak.precipitationProbability != null
          ? `Probabilidade de ${Math.round(peak.precipitationProbability)}% por volta das ${formatHour(peak.time, tz)}.`
          : null,
      focusTime: peak.time,
    };
  }

  const headline =
    (shortProb ?? 0) >= PROB_LOW
      ? `Baixo risco de chuva nas próximas ${SHORT_WINDOW_HOURS} horas`
      : `Sem chuva prevista nas próximas ${SHORT_WINDOW_HOURS} horas`;
  const kind: InsightKind = (shortProb ?? 0) >= PROB_LOW ? "low-risk" : "dry";

  const rise = later.find((p) => (p.precipitationProbability ?? 0) >= PROB_RISK);
  if (rise) {
    return {
      kind,
      headline,
      detail: `O risco aumenta ${periodPhrase(rise.time, nowUnix, tz)}: ${Math.round(
        rise.precipitationProbability!,
      )}% por volta das ${formatHour(rise.time, tz)}.`,
      focusTime: rise.time,
    };
  }

  const laterProb = maxOf(later.map((p) => p.precipitationProbability));
  if (laterProb == null) return { kind, headline, detail: null, focusTime: null };
  const span = SHORT_WINDOW_HOURS + later.length;
  return {
    kind,
    headline,
    detail:
      laterProb < PROB_LOW
        ? `Probabilidade de chuva abaixo de ${PROB_LOW}% nas próximas ${span} horas.`
        : `Probabilidade de chuva de até ${Math.round(laterProb)}% nas próximas ${span} horas.`,
    focusTime: null,
  };
}
