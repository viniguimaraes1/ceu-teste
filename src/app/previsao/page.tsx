import { Suspense } from "react";
import type { Metadata } from "next";
import { AppHeader, PageShell, Section } from "@/components/PageShell";
import { LocationSelector } from "@/components/LocationSelector";
import { ErrorState } from "@/components/States";
import { PageSkeleton } from "@/components/Skeletons";
import { DailyForecastDetailed } from "@/components/DailyForecast";
import { HourlyForecast } from "@/components/HourlyForecast";
import { DataAttribution, FixtureBanner } from "@/components/DataAttribution";
import { loadForecast, pageContext } from "@/lib/weather/page-data";
import { skySceneFor } from "@/lib/weather/scene";
import { dailyFromToday, todayOf, upcomingHours } from "@/lib/weather/timeline";
import { buildWeekTrend } from "@/lib/weather/trend";

export const metadata: Metadata = { title: "Previsão" };

export default function ForecastPage() {
  return (
    <Suspense fallback={<PageSkeleton title="Previsão" variant="list" />}>
      <Forecast />
    </Suspense>
  );
}

async function Forecast() {
  const ctx = await pageContext();
  const result = await loadForecast(ctx);
  const header = <AppHeader title="Previsão" location={<LocationSelector location={ctx.location} />} />;
  if (!result.ok) {
    return (
      <PageShell>
        {header}
        <ErrorState title="Não foi possível carregar a previsão" detail={result.error} />
      </PageShell>
    );
  }
  const f = result.data;
  const days = dailyFromToday(f, ctx.nowUnix);
  const trend = buildWeekTrend(days.slice(0, 7), ctx.nowUnix, f.timezone);

  return (
    <PageShell scene={skySceneFor(f.current, todayOf(f, ctx.nowUnix))}>
      {header}
      {f.origin === "synthetic-fixture" && <FixtureBanner />}

      {trend.length > 0 && (
        <section aria-label="Tendência" className="surface rise-in mt-6 p-5">
          <h2 className="eyebrow">Tendência da semana</h2>
          <ul className="mt-3 space-y-1.5 text-[0.9375rem] leading-snug">
            {trend.map((line, i) => (
              <li key={i} className={i === 0 ? "text-snow" : "text-ink-muted"}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Section title={`${days.length} dias`}>
        <DailyForecastDetailed days={days} nowUnix={ctx.nowUnix} timeZone={f.timezone} />
        <p className="mt-3 px-1 text-[0.75rem] text-ink-subtle">Toque em um dia para ver chuva, vento, UV e horários do sol.</p>
      </Section>

      <Section title="Próximas 48 horas">
        <HourlyForecast hours={upcomingHours(f, ctx.nowUnix, 48)} timeZone={f.timezone} />
      </Section>

      <DataAttribution forecast={f} />
    </PageShell>
  );
}
