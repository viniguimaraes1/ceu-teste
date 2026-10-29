import type { DailyPoint } from "./types";
import { formatDayLabel, formatTemp } from "./format";

/** Factual week summary built only from daily values. */
export function buildWeekTrend(days: DailyPoint[], nowUnix: number, timeZone: string): string[] {
  const lines: string[] = [];
  const maxs = days.map((d) => d.temperatureMax).filter((v): v is number => v != null);
  if (maxs.length) {
    const lo = Math.round(Math.min(...maxs));
    const hi = Math.round(Math.max(...maxs));
    lines.push(
      lo === hi
        ? `Máximas em torno de ${hi}° nos próximos ${days.length} dias.`
        : `Máximas entre ${lo}° e ${hi}° nos próximos ${days.length} dias.`,
    );
  }

  const wet = days
    .filter((d) => (d.precipitationProbabilityMax ?? 0) >= 50)
    .sort((a, b) => (b.precipitationProbabilityMax ?? 0) - (a.precipitationProbabilityMax ?? 0))
    .slice(0, 3)
    .sort((a, b) => a.date - b.date);
  if (days.some((d) => d.precipitationProbabilityMax != null)) {
    lines.push(
      wet.length
        ? `Maior chance de chuva: ${wet
            .map((d) => `${formatDayLabel(d.date, nowUnix, timeZone).toLowerCase()} (${Math.round(d.precipitationProbabilityMax!)}%)`)
            .join(", ")
            .replace(/, ([^,]*)$/, " e $1")}.`
        : "Nenhum dia com chance de chuva de 50% ou mais.",
    );
  }

  const warmest = days.reduce<DailyPoint | null>(
    (best, d) => (d.temperatureMax != null && (best?.temperatureMax == null || d.temperatureMax > best.temperatureMax) ? d : best),
    null,
  );
  if (warmest && maxs.length > 1 && Math.max(...maxs) - Math.min(...maxs) >= 2) {
    lines.push(`Dia mais quente: ${formatDayLabel(warmest.date, nowUnix, timeZone).toLowerCase()}, ${formatTemp(warmest.temperatureMax)}.`);
  }
  return lines;
}
