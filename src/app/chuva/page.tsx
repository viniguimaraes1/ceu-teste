import { Suspense } from "react";
import type { Metadata } from "next";
import { Droplet } from "lucide-react";
import { AppHeader, PageShell, Section } from "@/components/PageShell";
import { LocationSelector } from "@/components/LocationSelector";
import { ErrorState } from "@/components/States";
import { PageSkeleton } from "@/components/Skeletons";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { RainTimeline, type RainTimelinePoint } from "@/components/RainTimeline";
import { ModelLegend, ModelRainMatrix } from "@/components/ModelComparison";
import { ForecastConfidence } from "@/components/ForecastConfidence";
import { DataAttribution, FixtureBanner } from "@/components/DataAttribution";
import { WeatherIcon } from "@/components/WeatherIcon";
import { loadForecast, loadModels, pageContext, type PageContext } from "@/lib/weather/page-data";
import { buildRainInsight } from "@/lib/weather/insight";
import { skySceneFor } from "@/lib/weather/scene";
import { dailyFromToday, todayOf, upcomingHours } from "@/lib/weather/timeline";
import { formatDayLabel, formatHour, formatMm, formatPercent } from "@/lib/weather/format";
import { INTENSITY_LABEL, rainIntensity, type RainIntensity } from "@/lib/weather/rain";
import { compareHours, summarizeAgreement } from "@/lib/weather/comparison";
import { COMPARISON_MODELS } from "@/lib/weather/models";
import type { DailyPoint } from "@/lib/weather/types";

export const metadata: Metadata = { title: "Chuva" };

const INTENSITY_LEVEL: Record<RainIntensity, number> = { none: 0, trace: 1, light: 2, moderate: 3, heavy: 4, violent: 4 };
const TIMELINE_HOURS = 24;
const MATRIX_HOURS = 12;

export default function RainPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Chuva" variant="list" />}>
      <Rain />
    </Suspense>
  );
}

async function Rain() {
  const ctx = await pageContext();
  const result = await loadForecast(ctx);
  const header = <AppHeader title="Chuva" location={<LocationSelector location={ctx.location} />} />;
  if (!result.ok) {
    return (
      <PageShell>
        {header}
        <ErrorState title="Não foi possível carregar a previsão de chuva" detail={result.error} />
      </PageShell>
    );
  }

  const f = result.data;
  const tz = f.timezone;
  const insight = buildRainInsight(f, ctx.nowUnix);
  const hours = upcomingHours(f, ctx.nowUnix, TIMELINE_HOURS + 1).slice(1);
  const points: RainTimelinePoint[] = hours.map((h) => {
    const cls = rainIntensity(h.precipitation);
    return {
      time: h.time,
      label: formatHour(h.time, tz),
      probability: h.precipitationProbability,
      mm: h.precipitation,
      mmLabel: formatMm(h.precipitation),
      intensityLabel: cls ? INTENSITY_LABEL[cls] : null,
      intensityLevel: cls ? INTENSITY_LEVEL[cls] : 0,
    };
  });
  const days = dailyFromToday(f, ctx.nowUnix).slice(0, 7);

  const nextHours = (
    <>
      <div className="px-1">
        <p className="text-[1.375rem] leading-tight font-normal tracking-tight">{insight.headline}</p>
        {insight.detail && <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-muted">{insight.detail}</p>}
      </div>
      <div className="surface mt-6 p-5">
        <RainTimeline points={points} initialTime={insight.focusTime} />
      </div>
      <p className="mt-3 px-1 text-[0.75rem] leading-relaxed text-ink-subtle">
        Cada hora mostra a chance de pelo menos 0,1 mm e o volume previsto na hora que termina no horário indicado.
      </p>
      <Suspense fallback={<div className="skeleton mt-8 h-56 rounded-[1.5rem]" />}>
        <ModelDisagreement ctx={ctx} timeZone={tz} />
      </Suspense>
    </>
  );

  const nextDays = <RainDays days={days} nowUnix={ctx.nowUnix} timeZone={tz} />;

  return (
    <PageShell scene={skySceneFor(f.current, todayOf(f, ctx.nowUnix))}>
      {header}
      {f.origin === "synthetic-fixture" && <FixtureBanner />}
      <div className="mt-6">
        <SegmentedTabs
          tabs={[
            { label: "Próximas horas", content: nextHours },
            { label: "Próximos dias", content: nextDays },
          ]}
        />
      </div>
      <DataAttribution forecast={f} />
    </PageShell>
  );
}

function RainDays({ days, nowUnix, timeZone }: { days: DailyPoint[]; nowUnix: number; timeZone: string }) {
  if (days.length === 0) return <p className="surface p-5 text-ink-muted">Previsão diária indisponível.</p>;
  return (
    <ol className="surface divide-y divide-line px-5 py-1">
      {days.map((d) => {
        const prob = d.precipitationProbabilityMax;
        return (
          <li key={d.date} className="flex items-center gap-3 py-3.5">
            <span className="w-14 shrink-0 text-[0.9375rem] font-medium">{formatDayLabel(d.date, nowUnix, timeZone)}</span>
            <WeatherIcon code={d.weatherCode} size={20} decorative />
            <div className="min-w-0 flex-1">
              <div className="h-1.5 rounded-full bg-snow/10" aria-hidden="true">
                <div className="h-full rounded-full bg-rain" style={{ width: `${prob ?? 0}%` }} />
              </div>
              <p className="mt-1.5 flex justify-between text-[0.75rem] text-ink-subtle tabular">
                <span>Chance máx. {formatPercent(prob)}</span>
                <span>{d.precipitationHours == null ? "" : `${Math.round(d.precipitationHours)} h com chuva`}</span>
              </p>
            </div>
            <span className="flex w-16 shrink-0 items-center justify-end gap-1 text-[0.9375rem] tabular">
              <Droplet size={11} className="text-rain-strong" aria-hidden="true" />
              {formatMm(d.precipitationSum)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

async function ModelDisagreement({ ctx, timeZone }: { ctx: PageContext; timeZone: string }) {
  const models = await loadModels(ctx);
  if (!models.ok) return null;
  const available = COMPARISON_MODELS.filter((m) => models.data.find((x) => x.modelId === m.id)?.status === "ok");
  const start = ctx.nowUnix - (ctx.nowUnix % 3600) + 3600;
  const hours = compareHours(models.data, start, MATRIX_HOURS);
  // Agreement is summarised over the same window the matrix shows.
  const summary = summarizeAgreement(hours, available.length);
  const splitHours = hours.filter((h) => h.wetDrySplit).length;
  const labels = hours.map((h) => formatHour(h.time, timeZone));

  return (
    <Section title="O que dizem os modelos">
      <div className="surface p-5">
        <p className="text-[0.9375rem] leading-snug">
          {available.length < 2
            ? "Não há modelos suficientes com dados para comparar."
            : splitHours === 0
              ? `Os ${available.length} modelos concordam sobre chuva ou tempo seco em todas as próximas ${hours.length} horas.`
              : `Os modelos divergem entre chuva e tempo seco em ${splitHours} das próximas ${hours.length} horas.`}
        </p>
        <div className="mt-4">
          <ModelLegend models={available} />
        </div>
        <div className="mt-4">
          <ModelRainMatrix hours={hours} models={available} hourLabels={labels} />
        </div>
      </div>
      <div className="mt-3">
        <ForecastConfidence summary={summary} />
      </div>
    </Section>
  );
}
