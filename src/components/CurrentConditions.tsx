import { Droplets, Sunrise, Sunset, Umbrella, Wind, Sun, type LucideIcon } from "lucide-react";
import type { CurrentConditions as Current, DailyPoint } from "@/lib/weather/types";
import { compassDirection, formatClock, formatKmh, formatMm, formatPercent } from "@/lib/weather/format";

function Tile({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <div className="surface flex min-h-28 flex-col justify-between p-4">
      <p className="eyebrow flex items-center gap-1.5">
        <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
        {label}
      </p>
      <div>
        <p className="tabular text-[1.625rem] font-light tracking-tight">{value}</p>
        {note && <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{note}</p>}
      </div>
    </div>
  );
}

function uvLabel(uv: number | null): string | undefined {
  if (uv == null) return undefined;
  if (uv < 3) return "Baixo";
  if (uv < 6) return "Moderado";
  if (uv < 8) return "Alto";
  if (uv < 11) return "Muito alto";
  return "Extremo";
}

export function CurrentConditions({
  current,
  today,
  timeZone,
}: {
  current: Current;
  today?: DailyPoint;
  timeZone: string;
}) {
  const uvMax = today?.uvIndexMax ?? null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile icon={Droplets} label="Umidade" value={formatPercent(current.humidity)} />
      <Tile
        icon={Wind}
        label="Vento"
        value={formatKmh(current.windSpeed)}
        note={
          current.windDirection != null || current.windGusts != null
            ? [
                current.windDirection != null ? `De ${compassDirection(current.windDirection)}` : null,
                current.windGusts != null ? `rajadas de ${formatKmh(current.windGusts)}` : null,
              ]
                .filter(Boolean)
                .join(", ")
            : undefined
        }
      />
      <Tile
        icon={Umbrella}
        label="Chuva hoje"
        value={formatMm(today?.precipitationSum)}
        note={today?.precipitationProbabilityMax != null ? `Chance máx. ${formatPercent(today.precipitationProbabilityMax)}` : undefined}
      />
      <Tile
        icon={Sun}
        label="UV máximo"
        value={uvMax == null ? "—" : String(Math.round(uvMax))}
        note={uvLabel(uvMax)}
      />
      <Tile
        icon={Sunrise}
        label="Nascer do sol"
        value={today?.sunrise != null ? formatClock(today.sunrise, timeZone) : "—"}
      />
      <Tile
        icon={Sunset}
        label="Pôr do sol"
        value={today?.sunset != null ? formatClock(today.sunset, timeZone) : "—"}
      />
    </div>
  );
}
