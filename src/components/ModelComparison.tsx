import type { HourComparison, DayComparison } from "@/lib/weather/comparison";
import type { ModelInfo } from "@/lib/weather/models";
import { rainIntensity } from "@/lib/weather/rain";
import { formatMm, formatTemp } from "@/lib/weather/format";

export interface ModelLegendItem {
  id: string;
  name: string;
  colorVar: string;
}

export function ModelLegend({ models }: { models: ModelLegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-ink-muted" aria-label="Legenda dos modelos">
      {models.map((m) => (
        <li key={m.id} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: `var(${m.colorVar})` }} aria-hidden="true" />
          {m.name}
        </li>
      ))}
    </ul>
  );
}

const INTENSITY_OPACITY: Record<string, number> = {
  none: 0,
  trace: 0.22,
  light: 0.45,
  moderate: 0.72,
  heavy: 1,
  violent: 1,
};

/**
 * Hour × model grid of expected rainfall. One sequential hue (rain blue);
 * darker = more volume. Columns where models split between wet and dry are
 * marked, which is where disagreement matters most for planning.
 */
export function ModelRainMatrix({
  hours,
  models,
  hourLabels,
}: {
  hours: HourComparison[];
  models: ModelInfo[];
  hourLabels: string[];
}) {
  if (hours.length === 0 || models.length === 0) {
    return <p className="text-[0.9375rem] text-ink-muted">Nenhum modelo com dados de chuva para comparar.</p>;
  }
  const totals = models.map((m) => {
    const vals = hours.map((h) => h.precipitation[m.id]).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  });

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-[2px] text-[0.6875rem]">
        <caption className="sr-only">Volume de chuva previsto por modelo e por hora</caption>
        <thead>
          <tr>
            <th scope="col" className="w-14 text-left font-normal text-ink-subtle">
              <span className="sr-only">Modelo</span>
            </th>
            {hours.map((h, i) => (
              <th
                key={h.time}
                scope="col"
                className={`font-normal tabular ${h.wetDrySplit ? "text-alert" : "text-ink-subtle"}`}
              >
                {i % 2 === 0 ? hourLabels[i] : <span className="sr-only">{hourLabels[i]}</span>}
              </th>
            ))}
            <th scope="col" className="w-12 text-right font-normal text-ink-subtle">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {models.map((m, mi) => (
            <tr key={m.id}>
              <th scope="row" className="truncate pr-1 text-left text-[0.75rem] font-normal text-ink-muted">
                <span
                  className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ background: `var(${m.colorVar})` }}
                  aria-hidden="true"
                />
                {m.shortName}
              </th>
              {hours.map((h, i) => {
                const v = h.precipitation[m.id];
                const cls = rainIntensity(v);
                return (
                  <td key={h.time} className="p-0">
                    <div
                      className="h-6 rounded-[3px]"
                      style={{
                        background:
                          v == null
                            ? "transparent"
                            : cls === "none"
                              ? "rgb(248 250 252 / 0.06)"
                              : `rgb(127 176 224 / ${INTENSITY_OPACITY[cls ?? "none"]})`,
                        outline: v == null ? "1px dashed rgb(248 250 252 / 0.15)" : undefined,
                        outlineOffset: "-1px",
                      }}
                      title={`${m.shortName}, ${hourLabels[i]}: ${v == null ? "sem dado" : formatMm(v)}`}
                    >
                      <span className="sr-only">{v == null ? "sem dado" : formatMm(v)}</span>
                    </div>
                  </td>
                );
              })}
              <td className="text-right text-[0.75rem] text-snow tabular">{formatMm(totals[mi])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-ink-subtle">
        <span className="flex items-center gap-1">
          {[0.22, 0.45, 0.72, 1].map((o) => (
            <span key={o} className="h-2.5 w-3 rounded-[2px]" style={{ background: `rgb(127 176 224 / ${o})` }} aria-hidden="true" />
          ))}
          <span className="ml-1">traços → forte</span>
        </span>
        <span>
          <span className="text-alert">Horas em destaque</span>: modelos divergem entre chuva e tempo seco
        </span>
      </div>
    </div>
  );
}

export type DailyMetric = "max" | "min" | "precip";

const METRIC_CAPTION: Record<DailyMetric, string> = {
  max: "Temperatura máxima prevista por modelo",
  min: "Temperatura mínima prevista por modelo",
  precip: "Chuva acumulada prevista por modelo (mm)",
};

/** One metric per table keeps every value legible on a 375 px screen. */
export function ModelDailyTable({
  days,
  models,
  dayLabels,
  metric,
}: {
  days: DayComparison[];
  models: ModelInfo[];
  dayLabels: string[];
  metric: DailyMetric;
}) {
  if (days.length === 0 || models.length === 0) return <p className="text-ink-muted">Sem dados diários dos modelos.</p>;
  const fmt = (v: number | null | undefined) =>
    metric === "precip" ? (v == null ? "—" : formatMm(v).replace(" mm", "")) : formatTemp(v);
  return (
    <table className="w-full table-fixed text-[0.8125rem]">
      <caption className="sr-only">{METRIC_CAPTION[metric]}</caption>
      <thead>
        <tr className="text-[0.75rem] text-ink-subtle">
          <th scope="col" className="w-[3.75rem] pb-2 text-left font-normal">
            Dia
          </th>
          {models.map((m) => (
            <th key={m.id} scope="col" className="pb-2 pl-2 text-right text-[0.6875rem] font-normal whitespace-nowrap">
              {m.shortName}
            </th>
          ))}
          <th scope="col" className="w-10 pb-2 text-right font-normal" title="Diferença entre o maior e o menor valor">
            Dif.
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {days.map((d, i) => {
          const vals = models.map((m) => d.byModel[m.id]?.[metric] ?? null);
          const nums = vals.filter((v): v is number => v != null);
          const spread = nums.length >= 2 ? Math.max(...nums) - Math.min(...nums) : null;
          return (
            <tr key={d.date}>
              <th scope="row" className="py-2.5 text-left font-medium">
                {dayLabels[i]}
              </th>
              {vals.map((v, j) => (
                <td key={models[j].id} className="py-2.5 pl-2 text-right tabular">
                  {fmt(v)}
                </td>
              ))}
              <td className="py-2.5 pl-2 text-right text-ink-subtle tabular">
                {spread == null ? "—" : metric === "precip" ? fmt(spread) : `${Math.round(spread)}°`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
