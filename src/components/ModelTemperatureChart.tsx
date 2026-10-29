"use client";

import { useState, type PointerEvent } from "react";

export interface TempSeries {
  id: string;
  name: string;
  colorVar: string;
  values: (number | null)[];
}

const H = 160;
const LABEL_GAP = 11;

function endLabels(series: TempSeries[], y: (v: number) => number) {
  const labels = series
    .map((s) => {
      const i = s.values.findLastIndex((v) => v != null);
      return i < 0 ? null : { id: s.id, colorVar: s.colorVar, text: `${Math.round(s.values[i]!)}°`, top: y(s.values[i]!) };
    })
    .filter((l): l is NonNullable<typeof l> => l != null)
    .sort((a, b) => a.top - b.top);
  for (let i = 1; i < labels.length; i++) {
    labels[i].top = Math.max(labels[i].top, labels[i - 1].top + LABEL_GAP);
  }
  return labels;
}

function niceTicks(lo: number, hi: number): number[] {
  const step = hi - lo > 12 ? 5 : 2;
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi; v += step) ticks.push(v);
  return ticks;
}

/**
 * Temperature per model over the next hours. One y-axis (°C), 2px lines,
 * legend + direct end labels, crosshair with per-model readout on hover/touch.
 */
export function ModelTemperatureChart({
  series,
  tickLabels,
  pointLabels,
}: {
  series: TempSeries[];
  /** Label per index, empty string where no tick should show. */
  tickLabels: string[];
  /** Full label per index for the readout, e.g. "Sex 15h". */
  pointLabels: string[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = pointLabels.length;
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  if (n < 2 || all.length === 0) {
    return <p className="text-[0.9375rem] text-ink-muted">Sem dados de temperatura dos modelos.</p>;
  }
  const lo = Math.floor(Math.min(...all) - 1);
  const hi = Math.ceil(Math.max(...all) + 1);
  const x = (i: number) => (i / (n - 1)) * 100;
  const y = (v: number) => ((hi - v) / (hi - lo)) * H;

  function path(values: (number | null)[]) {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`;
      pen = true;
    });
    return d;
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHover(Math.round(frac * (n - 1)));
  }

  const ticks = niceTicks(lo, hi);
  const readoutIdx = hover ?? 0;

  return (
    <div>
      <div className="mb-3 min-h-10 text-[0.8125rem]" aria-live="polite">
        <p className="font-semibold tabular">{hover == null ? "Toque no gráfico para comparar" : pointLabels[readoutIdx]}</p>
        {hover != null && (
          <p className="flex flex-wrap gap-x-3 text-ink-muted">
            {series.map((s) => (
              <span key={s.id} className="tabular">
                {s.name}{" "}
                <span className="text-snow">{s.values[readoutIdx] == null ? "—" : `${Math.round(s.values[readoutIdx]!)}°`}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="relative pr-9 pl-7">
        {/* y-axis labels */}
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute left-0 -translate-y-1/2 text-[0.625rem] text-ink-subtle tabular"
            style={{ top: y(t) }}
            aria-hidden="true"
          >
            {t}°
          </span>
        ))}
        <div
          className="relative touch-pan-y"
          style={{ height: H }}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
          role="img"
          aria-label={`Temperatura prevista por modelo: ${series
            .map((s) => {
              const v = s.values.filter((x): x is number => x != null);
              return v.length ? `${s.name} de ${Math.round(Math.min(...v))}° a ${Math.round(Math.max(...v))}°` : `${s.name} sem dados`;
            })
            .join("; ")}`}
        >
          <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={y(t)}
                y2={y(t)}
                stroke="rgb(248 250 252 / 0.07)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {series.map((s) => (
              <path
                key={s.id}
                d={path(s.values)}
                fill="none"
                stroke={`var(${s.colorVar})`}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {hover != null && (
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1="0"
                y2={H}
                stroke="rgb(248 250 252 / 0.35)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {/* Markers as HTML so they stay round under the stretched viewBox */}
          {hover != null &&
            series.map((s) => {
              const v = s.values[hover];
              if (v == null) return null;
              return (
                <span
                  key={s.id}
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-deep-sky"
                  style={{ left: `${x(hover)}%`, top: y(v), background: `var(${s.colorVar})` }}
                  aria-hidden="true"
                />
              );
            })}
          {/* Direct end labels, nudged apart so close values never overlap */}
          {endLabels(series, y).map((l) => (
            <span
              key={l.id}
              className="absolute left-full ml-1 -translate-y-1/2 text-[0.625rem] whitespace-nowrap text-ink-muted tabular"
              style={{ top: l.top }}
              aria-hidden="true"
            >
              <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: `var(${l.colorVar})` }} />
              {l.text}
            </span>
          ))}
        </div>
        <div className="relative mt-2 h-4" aria-hidden="true">
          {tickLabels.map((label, i) =>
            label ? (
              <span
                key={i}
                className="absolute -translate-x-1/2 text-[0.625rem] text-ink-subtle tabular"
                style={{ left: `${x(i)}%` }}
              >
                {label}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
