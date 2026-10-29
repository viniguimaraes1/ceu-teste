import type { CurrentConditions, DailyPoint } from "@/lib/weather/types";
import { conditionLabel } from "@/lib/weather/conditions";
import { formatTemp } from "@/lib/weather/format";

export function WeatherHero({ current, today }: { current: CurrentConditions; today?: DailyPoint }) {
  const label = conditionLabel(current.weatherCode);
  return (
    <section aria-label="Agora" className="rise-in pt-10 pb-9">
      <p className="tabular text-[7.25rem] leading-[0.9] font-extralight tracking-[-0.06em] text-snow">
        <span className="sr-only">Temperatura atual: </span>
        {formatTemp(current.temperature)}
      </p>
      <p className="mt-4 text-[1.375rem] font-normal tracking-tight text-snow">{label}</p>
      <p className="mt-1 text-[0.9375rem] text-snow/75">
        Sensação térmica {formatTemp(current.apparentTemperature)}
        {today && (
          <>
            <span aria-hidden="true" className="mx-2 text-snow/40">·</span>
            <span className="sr-only">Máxima </span>
            <span aria-hidden="true">Máx </span>
            {formatTemp(today.temperatureMax)}
            <span aria-hidden="true" className="ml-2">Mín </span>
            <span className="sr-only">, mínima </span>
            {formatTemp(today.temperatureMin)}
          </>
        )}
      </p>
    </section>
  );
}
