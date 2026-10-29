import { Suspense } from "react";
import Link from "next/link";
import { AppHeader, PageShell, Section } from "@/components/PageShell";
import { WeatherHero } from "@/components/WeatherHero";
import { WeatherInsight } from "@/components/WeatherInsight";
import { HourlyForecast } from "@/components/HourlyForecast";
import { DailyForecast } from "@/components/DailyForecast";
import { CurrentConditions } from "@/components/CurrentConditions";
import { ForecastConfidence } from "@/components/ForecastConfidence";
import { LocationSelector } from "@/components/LocationSelector";
import { ErrorState } from "@/components/States";
import { PageSkeleton } from "@/components/Skeletons";
import { DataAttribution, FixtureBanner } from "@/components/DataAttribution";
import { loadForecast, loadModels, pageContext, type PageContext } from "@/lib/weather/page-data";
import { buildRainInsight } from "@/lib/weather/insight";
import { skySceneFor } from "@/lib/weather/scene";
import { dailyFromToday, todayOf, upcomingHours } from "@/lib/weather/timeline";
import { formatHour } from "@/lib/weather/format";
import { compareHours, summarizeAgreement } from "@/lib/weather/comparison";

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const ctx = await pageContext();
  const result = await loadForecast(ctx);
  const header = <AppHeader location={<LocationSelector location={ctx.location} />} />;

  if (!result.ok) {
    return (
      <PageShell>
        {header}
        <ErrorState title="Não foi possível carregar a previsão" detail={result.error} />
      </PageShell>
    );
  }

  const f = result.data;
  const tz = f.timezone;
  const today = todayOf(f, ctx.nowUnix);
  const scene = skySceneFor(f.current, today);
  const insight = buildRainInsight(f, ctx.nowUnix);
  const next24 = upcomingHours(f, ctx.nowUnix, 25);
  const strip = next24.slice(1, 13).map((h) => ({
    time: h.time,
    label: formatHour(h.time, tz),
    probability: h.precipitationProbability,
  }));

  return (
    <PageShell scene={scene}>
      {header}
      {f.origin === "synthetic-fixture" && <FixtureBanner />}
      <WeatherHero current={f.current} today={today} />

      <WeatherInsight insight={insight} strip={strip} />
      <div className="mt-3 flex justify-end">
        <Suspense fallback={null}>
          <Agreement ctx={ctx} />
        </Suspense>
      </div>

      <Section title="Próximas horas">
        <HourlyForecast hours={next24} timeZone={tz} />
      </Section>

      <Section
        title="Próximos dias"
        action={
          <Link href="/previsao" className="text-[0.8125rem] text-accent hover:text-snow">
            Ver 10 dias
          </Link>
        }
      >
        <DailyForecast days={dailyFromToday(f, ctx.nowUnix).slice(0, 5)} nowUnix={ctx.nowUnix} timeZone={tz} />
      </Section>

      <Section title="Detalhes de hoje">
        <CurrentConditions current={f.current} today={today} timeZone={tz} />
      </Section>

      <DataAttribution forecast={f} />
    </PageShell>
  );
}

async function Agreement({ ctx }: { ctx: PageContext }) {
  const models = await loadModels(ctx);
  if (!models.ok) return null;
  const ok = models.data.filter((m) => m.status === "ok").length;
  const hours = compareHours(models.data, ctx.nowUnix - (ctx.nowUnix % 3600), 24);
  return <ForecastConfidence summary={summarizeAgreement(hours, ok)} variant="chip" />;
}
