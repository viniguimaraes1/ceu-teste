import { ChevronDown, Droplet } from "lucide-react";
import type { DailyPoint } from "@/lib/weather/types";
import { conditionLabel } from "@/lib/weather/conditions";
import {
  formatClock,
  formatDayLabel,
  formatDayMonth,
  formatKmh,
  formatMm,
  formatPercent,
  formatTemp,
} from "@/lib/weather/format";
import { WeatherIcon } from "./WeatherIcon";

function RangeBar({ min, max, lo, hi }: { min: number | null; max: number | null; lo: number; hi: number }) {
  if (min == null || max == null || hi <= lo) return <div className="h-1 flex-1 rounded-full bg-snow/10" />;
  const left = ((min - lo) / (hi - lo)) * 100;
  const width = Math.max(((max - min) / (hi - lo)) * 100, 4);
  return (
    <div className="relative h-1 flex-1 rounded-full bg-snow/10" aria-hidden="true">
      <div
        className="absolute inset-y-0 rounded-full bg-gradient-to-r from-accent-strong via-accent to-warm"
        style={{ left: `${left}%`, width: `${width}%` }}
      />
    </div>
  );
}

function DayRow({ d, nowUnix, timeZone, lo, hi }: { d: DailyPoint; nowUnix: number; timeZone: string; lo: number; hi: number }) {
  const prob = d.precipitationProbabilityMax;
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="w-[4rem] shrink-0 text-[0.9375rem] font-medium">{formatDayLabel(d.date, nowUnix, timeZone)}</span>
      <WeatherIcon code={d.weatherCode} size={22} className="shrink-0" decorative />
      <span
        className={`flex w-11 shrink-0 items-center gap-0.5 text-[0.75rem] tabular ${
          prob != null && prob >= 20 ? "text-rain-strong" : "text-ink-subtle"
        }`}
      >
        <Droplet size={10} strokeWidth={2} aria-hidden="true" />
        {formatPercent(prob)}
      </span>
      <span className="w-8 shrink-0 text-right text-[0.9375rem] text-ink-muted tabular">{formatTemp(d.temperatureMin)}</span>
      <RangeBar min={d.temperatureMin} max={d.temperatureMax} lo={lo} hi={hi} />
      <span className="w-8 shrink-0 text-[0.9375rem] tabular">{formatTemp(d.temperatureMax)}</span>
    </div>
  );
}

function bounds(days: DailyPoint[]) {
  const mins = days.map((d) => d.temperatureMin).filter((v): v is number => v != null);
  const maxs = days.map((d) => d.temperatureMax).filter((v): v is number => v != null);
  return { lo: mins.length ? Math.min(...mins) : 0, hi: maxs.length ? Math.max(...maxs) : 0 };
}

function dayAriaLabel(d: DailyPoint, nowUnix: number, timeZone: string) {
  return `${formatDayLabel(d.date, nowUnix, timeZone)}: ${conditionLabel(d.weatherCode)}, mínima ${formatTemp(
    d.temperatureMin,
  )}, máxima ${formatTemp(d.temperatureMax)}, chance de chuva ${formatPercent(d.precipitationProbabilityMax)}`;
}

/** Compact list (home preview). */
export function DailyForecast({ days, nowUnix, timeZone }: { days: DailyPoint[]; nowUnix: number; timeZone: string }) {
  if (days.length === 0) return <p className="surface p-5 text-ink-muted">Previsão diária indisponível.</p>;
  const { lo, hi } = bounds(days);
  return (
    <ol className="surface divide-y divide-line px-4 py-1">
      {days.map((d) => (
        <li key={d.date} aria-label={dayAriaLabel(d, nowUnix, timeZone)}>
          <DayRow d={d} nowUnix={nowUnix} timeZone={timeZone} lo={lo} hi={hi} />
        </li>
      ))}
    </ol>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] text-ink-subtle">{label}</dt>
      <dd className="tabular text-[0.9375rem]">{value}</dd>
    </div>
  );
}

/** Expandable list with per-day details (Forecast screen). */
export function DailyForecastDetailed({
  days,
  nowUnix,
  timeZone,
}: {
  days: DailyPoint[];
  nowUnix: number;
  timeZone: string;
}) {
  if (days.length === 0) return <p className="surface p-5 text-ink-muted">Previsão diária indisponível.</p>;
  const { lo, hi } = bounds(days);
  return (
    <ol className="surface divide-y divide-line px-4 py-1">
      {days.map((d) => (
        <li key={d.date}>
          <details className="group">
            <summary
              className="flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden"
              aria-label={dayAriaLabel(d, nowUnix, timeZone)}
            >
              <div className="min-w-0 flex-1">
                <DayRow d={d} nowUnix={nowUnix} timeZone={timeZone} lo={lo} hi={hi} />
              </div>
              <ChevronDown
                size={16}
                className="shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="pb-4 pl-[4rem]">
              <p className="text-[0.9375rem] text-snow">
                {conditionLabel(d.weatherCode)}
                <span className="text-ink-subtle"> · {formatDayMonth(d.date, timeZone)}</span>
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label="Chuva prevista" value={formatMm(d.precipitationSum)} />
                <Detail label="Chance máxima" value={formatPercent(d.precipitationProbabilityMax)} />
                <Detail
                  label="Horas com chuva"
                  value={d.precipitationHours == null ? "—" : `${Math.round(d.precipitationHours)} h`}
                />
                <Detail label="UV máximo" value={d.uvIndexMax == null ? "—" : String(Math.round(d.uvIndexMax))} />
                <Detail label="Vento máximo" value={formatKmh(d.windSpeedMax)} />
                <Detail label="Rajadas" value={formatKmh(d.windGustsMax)} />
                <Detail label="Nascer do sol" value={d.sunrise == null ? "—" : formatClock(d.sunrise, timeZone)} />
                <Detail label="Pôr do sol" value={d.sunset == null ? "—" : formatClock(d.sunset, timeZone)} />
              </dl>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
