"use client";

import { useState } from "react";
import { Droplet } from "lucide-react";

export interface RainTimelinePoint {
  time: number;
  label: string;
  /** 0–100 or null when the provider has no probability. */
  probability: number | null;
  mm: number | null;
  /** Pre-formatted, e.g. "1,2 mm". */
  mmLabel: string;
  /** Intensity class label, e.g. "Fraca". */
  intensityLabel: string | null;
  /** 0 = none … 4 = heavy+, drives the droplet size. */
  intensityLevel: number;
}

/**
 * Probability (bars) and expected amount (droplets) on one time axis, kept
 * visually separate: bar height is chance, droplet size/label is volume.
 * Tap or focus a bar to read that hour in full.
 */
export function RainTimeline({ points, initialTime }: { points: RainTimelinePoint[]; initialTime?: number | null }) {
  const [selected, setSelected] = useState<number | null>(initialTime ?? null);
  const active = points.find((p) => p.time === selected) ?? null;

  if (points.length === 0) {
    return <p className="text-ink-muted">Previsão de chuva por hora indisponível.</p>;
  }

  return (
    <div>
      <div className="min-h-12" aria-live="polite">
        {active ? (
          <p className="text-[0.9375rem] leading-snug">
            <span className="font-semibold tabular">{active.label}</span>
            <span className="text-ink-muted"> · </span>
            {active.probability == null ? (
              <span className="text-ink-muted">probabilidade indisponível</span>
            ) : (
              <span className="tabular">{Math.round(active.probability)}% de chance</span>
            )}
            <br />
            <span className="text-ink-muted">
              Volume esperado: <span className="text-snow tabular">{active.mmLabel}</span>
              {active.intensityLabel && active.mm != null && active.mm >= 0.1 && ` (${active.intensityLabel.toLowerCase()})`}
            </span>
          </p>
        ) : (
          <p className="text-[0.8125rem] leading-snug text-ink-muted">
            Toque em uma hora para ver os detalhes. Barras indicam a <span className="text-snow">chance</span> de
            chuva; gotas, o <span className="text-snow">volume</span> esperado.
          </p>
        )}
      </div>

      <div className="no-scrollbar -mx-1 mt-3 overflow-x-auto">
        <div className="relative min-w-full px-1" style={{ width: points.length > 12 ? `${points.length * 2.25}rem` : undefined }}>
          {/* Recessive gridlines at 50% and 100% */}
          <div className="pointer-events-none absolute inset-x-1 top-0 h-36" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-snow/10" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-snow/10" />
            <span className="absolute -top-2 right-0 text-[0.625rem] text-ink-subtle">100%</span>
            <span className="absolute top-[calc(50%-0.5rem)] right-0 text-[0.625rem] text-ink-subtle">50%</span>
          </div>

          <div className="flex gap-1 pr-8" role="group" aria-label="Chance e volume de chuva por hora">
            {points.map((p) => {
              const isActive = p.time === selected;
              const prob = p.probability;
              return (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => setSelected(isActive ? null : p.time)}
                  aria-pressed={isActive}
                  aria-label={`${p.label}: ${prob == null ? "probabilidade indisponível" : `${Math.round(prob)}% de chance`}, ${p.mmLabel}`}
                  className="group flex min-w-0 flex-1 flex-col items-center rounded-lg pb-1 outline-offset-0"
                >
                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-5 rounded-t-[4px] transition-colors ${
                        prob == null
                          ? "border border-dashed border-snow/20 bg-transparent"
                          : isActive
                            ? "bg-rain-strong"
                            : "bg-rain/75 group-hover:bg-rain"
                      }`}
                      style={{ height: prob == null ? "12%" : `${Math.max(prob, 2)}%` }}
                    />
                  </div>
                  <span className={`mt-2 text-[0.6875rem] tabular ${isActive ? "font-semibold text-snow" : "text-ink-muted"}`}>
                    {p.label}
                  </span>
                  <span className="mt-0.5 text-[0.6875rem] text-ink-subtle tabular">
                    {prob == null ? "—" : `${Math.round(prob)}%`}
                  </span>
                  <span className="mt-2 flex h-4 items-center justify-center" aria-hidden="true">
                    {p.intensityLevel > 0 ? (
                      <Droplet
                        size={6 + p.intensityLevel * 2.5}
                        strokeWidth={0}
                        className="fill-rain-strong"
                      />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-snow/20" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.75rem] text-ink-subtle">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-2 rounded-t-[2px] bg-rain/75" aria-hidden="true" /> Chance de chuva
        </span>
        <span className="flex items-center gap-1.5">
          <Droplet size={10} strokeWidth={0} className="fill-rain-strong" aria-hidden="true" /> Volume (maior = mais
          intenso)
        </span>
      </div>
    </div>
  );
}
