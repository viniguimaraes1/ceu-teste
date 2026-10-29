import Link from "next/link";
import { ChevronRight, CloudRain, Sun, Umbrella, CircleHelp } from "lucide-react";
import type { RainInsight } from "@/lib/weather/insight";

export interface StripPoint {
  time: number;
  label: string;
  probability: number | null;
}

const KIND_ICON = {
  "rain-now": { Icon: CloudRain, tone: "text-rain-strong" },
  "rain-soon": { Icon: Umbrella, tone: "text-rain-strong" },
  "low-risk": { Icon: Umbrella, tone: "text-warm" },
  dry: { Icon: Sun, tone: "text-warm" },
  unavailable: { Icon: CircleHelp, tone: "text-ink-subtle" },
} as const;

/**
 * The home screen's "what should I know before going outside" card:
 * a factual sentence pair plus a compact 12-hour rain-chance strip.
 */
export function WeatherInsight({ insight, strip }: { insight: RainInsight; strip: StripPoint[] }) {
  const { Icon, tone } = KIND_ICON[insight.kind];
  const hasStrip = strip.some((p) => p.probability != null);
  return (
    <Link
      href="/chuva"
      className="surface rise-in group block p-5 transition-colors hover:border-line-strong"
      style={{ animationDelay: "80ms" }}
    >
      <div className="flex items-start gap-3.5">
        <span className={`mt-0.5 shrink-0 ${tone}`}>
          <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[1.0625rem] leading-snug font-medium text-snow">{insight.headline}</p>
          {insight.detail && <p className="mt-1 text-[0.9375rem] leading-snug text-ink-muted">{insight.detail}</p>}
        </div>
        <ChevronRight
          size={18}
          className="mt-0.5 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>

      {hasStrip && (
        <div className="mt-5" aria-hidden="true">
          <div className="flex h-10 items-end gap-[3px]">
            {strip.map((p) => (
              <div key={p.time} className="flex h-full flex-1 items-end rounded-t-[3px] bg-snow/[0.05]">
                <div
                  className={`w-full rounded-t-[3px] ${p.time === insight.focusTime ? "bg-rain-strong" : "bg-rain/70"}`}
                  style={{ height: `${Math.max(p.probability ?? 0, 3)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[0.6875rem] text-ink-subtle tabular">
            <span>{strip[0]?.label}</span>
            <span>{strip[Math.floor(strip.length / 2)]?.label}</span>
            <span>{strip[strip.length - 1]?.label}</span>
          </div>
        </div>
      )}
      {hasStrip && (
        <p className="sr-only">
          Chance de chuva por hora:{" "}
          {strip.map((p) => `${p.label} ${p.probability == null ? "indisponível" : `${Math.round(p.probability)}%`}`).join(", ")}
        </p>
      )}
    </Link>
  );
}
