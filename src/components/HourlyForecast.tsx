import { Droplet } from "lucide-react";
import type { HourlyPoint } from "@/lib/weather/types";
import { formatHour, formatPercent, formatTemp } from "@/lib/weather/format";
import { WeatherIcon } from "./WeatherIcon";
import { conditionLabel } from "@/lib/weather/conditions";

export function HourlyForecast({ hours, timeZone }: { hours: HourlyPoint[]; timeZone: string }) {
  if (hours.length === 0) {
    return <p className="surface p-5 text-ink-muted">Previsão por hora indisponível.</p>;
  }
  return (
    <div className="surface overflow-hidden">
      <ol className="no-scrollbar flex snap-x overflow-x-auto px-2 py-4" aria-label="Próximas horas">
        {hours.map((h, i) => {
          const prob = h.precipitationProbability;
          return (
            <li
              key={h.time}
              className="flex min-w-[3.6rem] snap-start flex-col items-center gap-3 px-1"
              aria-label={`${i === 0 ? "Agora" : formatHour(h.time, timeZone)}: ${formatTemp(h.temperature)}, ${conditionLabel(
                h.weatherCode,
              )}, chance de chuva ${formatPercent(prob)}`}
            >
              <span className={`text-[0.8125rem] tabular ${i === 0 ? "font-semibold text-snow" : "text-ink-muted"}`}>
                {i === 0 ? "Agora" : formatHour(h.time, timeZone)}
              </span>
              <WeatherIcon code={h.weatherCode} isDay={h.isDay} size={22} decorative />
              <span className="tabular text-[1.0625rem] font-normal">{formatTemp(h.temperature)}</span>
              <span
                className={`flex items-center gap-0.5 text-[0.75rem] tabular ${
                  prob != null && prob >= 20 ? "text-rain-strong" : "text-ink-subtle"
                }`}
              >
                <Droplet size={10} strokeWidth={2} aria-hidden="true" />
                {formatPercent(prob)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
