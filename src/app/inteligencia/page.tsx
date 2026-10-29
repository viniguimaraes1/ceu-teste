import { Suspense } from "react";
import type { Metadata } from "next";
import { AppHeader, PageShell, Section } from "@/components/PageShell";
import { LocationSelector } from "@/components/LocationSelector";
import { ErrorState } from "@/components/States";
import { PageSkeleton } from "@/components/Skeletons";
import { ForecastConfidence } from "@/components/ForecastConfidence";
import { ModelDailyTable, ModelLegend } from "@/components/ModelComparison";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ModelTemperatureChart } from "@/components/ModelTemperatureChart";
import { FixtureBanner } from "@/components/DataAttribution";
import { loadForecast, loadModels, pageContext } from "@/lib/weather/page-data";
import { getModelRunInfo, usingFixtures } from "@/lib/weather/service";
import { COMPARISON_MODELS } from "@/lib/weather/models";
import { compareDays, compareHours, summarizeAgreement } from "@/lib/weather/comparison";
import { formatDayLabel, formatHour, formatTimestamp, formatWeekdayShort, localHour } from "@/lib/weather/format";
import { skySceneFor } from "@/lib/weather/scene";
import { todayOf } from "@/lib/weather/timeline";

export const metadata: Metadata = { title: "Modelos" };

const CHART_HOURS = 48;

export default function IntelligencePage() {
  return (
    <Suspense fallback={<PageSkeleton title="Modelos" variant="list" />}>
      <Intelligence />
    </Suspense>
  );
}

async function Intelligence() {
  const ctx = await pageContext();
  const [forecast, models, runs] = await Promise.all([loadForecast(ctx), loadModels(ctx), getModelRunInfo()]);
  const header = <AppHeader title="Modelos" location={<LocationSelector location={ctx.location} />} />;

  if (!models.ok) {
    return (
      <PageShell>
        {header}
        <ErrorState title="Não foi possível carregar os modelos" detail={models.error} />
      </PageShell>
    );
  }

  const tz = forecast.ok ? forecast.data.timezone : "America/Sao_Paulo";
  const scene = forecast.ok ? skySceneFor(forecast.data.current, todayOf(forecast.data, ctx.nowUnix)) : "neutral";
  const statusById = new Map(models.data.map((m) => [m.modelId, m]));
  const available = COMPARISON_MODELS.filter((m) => statusById.get(m.id)?.status === "ok");

  const start = ctx.nowUnix - (ctx.nowUnix % 3600);
  const hours = compareHours(models.data, start, CHART_HOURS);
  const summary = summarizeAgreement(hours.slice(0, 24), available.length);
  const days = compareDays(models.data, 7).filter((d) => d.date + 86400 > ctx.nowUnix);

  const series = available.map((m) => ({
    id: m.id,
    name: m.name,
    colorVar: m.colorVar,
    values: hours.map((h) => h.temperature[m.id]),
  }));
  const tickLabels = hours.map((h) => {
    const hr = localHour(h.time, tz);
    if (hr === 0) return formatWeekdayShort(h.time, tz);
    return hr % 6 === 0 ? `${hr}h` : "";
  });
  const dayLabels = days.map((d) => formatDayLabel(d.date, ctx.nowUnix, tz));
  const pointLabels = hours.map((h) => `${formatDayLabel(h.time, ctx.nowUnix, tz)}, ${formatHour(h.time, tz)}`);

  return (
    <PageShell scene={scene}>
      {header}
      {usingFixtures() && <FixtureBanner />}

      <p className="mt-4 px-1 text-[0.9375rem] leading-relaxed text-ink-muted">
        Modelos numéricos simulam a atmosfera de formas diferentes. Quando concordam, a previsão tende a ser mais estável;
        quando divergem, vale acompanhar as atualizações.
      </p>

      <Section title="Concordância nas próximas 24 h">
        <ForecastConfidence summary={summary} />
      </Section>

      <Section title="Temperatura por modelo">
        <div className="surface p-5">
          <ModelLegend models={available} />
          <div className="mt-4">
            <ModelTemperatureChart series={series} tickLabels={tickLabels} pointLabels={pointLabels} />
          </div>
        </div>
      </Section>

      <Section title="Dia a dia">
        <SegmentedTabs
          tabs={(
            [
              ["Máxima", "max"],
              ["Mínima", "min"],
              ["Chuva", "precip"],
            ] as const
          ).map(([label, metric]) => ({
            label,
            content: (
              <div className="surface -mt-2 px-4 py-4">
                {metric === "precip" && <p className="mb-2 text-[0.75rem] text-ink-subtle">Acumulado do dia, em mm.</p>}
                <ModelDailyTable days={days} models={available} dayLabels={dayLabels} metric={metric} />
              </div>
            ),
          }))}
        />
      </Section>

      <Section title="Fontes">
        <ul className="surface divide-y divide-line px-5">
          {COMPARISON_MODELS.map((m) => {
            const status = statusById.get(m.id);
            const run = runs.find((r) => r.modelId === m.id);
            return (
              <li key={m.id} className="py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ background: `var(${m.colorVar})` }} aria-hidden="true" />
                    {m.name}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium ${
                      status?.status === "ok" ? "bg-accent/15 text-accent" : "bg-alert/15 text-alert"
                    }`}
                  >
                    {status?.status === "ok" ? "Dados disponíveis" : "Indisponível"}
                  </span>
                </div>
                <p className="mt-1 text-[0.8125rem] text-ink-muted">
                  {m.organization} · resolução {m.resolution}
                </p>
                <p className="mt-0.5 text-[0.75rem] text-ink-subtle">
                  {run?.initialisedAt != null
                    ? `Rodada de ${formatTimestamp(run.initialisedAt, tz)}`
                    : "Horário da rodada indisponível"}
                  {status && ` · consultado ${formatTimestamp(Math.floor(status.fetchedAt / 1000), tz)}`}
                </p>
                {status?.status !== "ok" && status?.message && (
                  <p className="mt-1 text-[0.75rem] text-alert">{status.message}</p>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Como ler a incerteza">
        <div className="surface space-y-3 p-5 text-[0.875rem] leading-relaxed text-ink-muted">
          <p>
            <span className="text-snow">Chance de chuva</span> é a probabilidade de cair pelo menos 0,1 mm em uma hora.
            Não diz quanto vai chover. <span className="text-snow">Volume</span> (mm) diz quanto, se chover.
          </p>
          <p>
            <span className="text-snow">Concordância</span> compara modelos entre si. É útil para perceber quando a
            atmosfera está difícil de prever, mas não é uma medida de acerto.
          </p>
          <p>
            A previsão principal do CÉU usa a seleção automática do Open-Meteo, que combina os modelos mais adequados para
            a região. Ela não é uma média dos modelos acima.
          </p>
          <p>
            <span className="text-snow">Precisão:</span> ainda não publicamos métricas de acerto. Estamos estruturando o
            registro de previsões e observações para medi-la antes de fazer qualquer afirmação.
          </p>
        </div>
      </Section>

      <footer className="mt-10 px-1 text-[0.75rem] leading-relaxed text-ink-subtle">
        Modelos via{" "}
        <a href="https://open-meteo.com/" className="underline decoration-snow/20 underline-offset-2" rel="noreferrer" target="_blank">
          Open-Meteo.com
        </a>{" "}
        (CC BY 4.0): ECMWF, NOAA/NCEP, DWD e CMC. Horários em {tz === "America/Sao_Paulo" ? "horário de Brasília" : tz}.
      </footer>
    </PageShell>
  );
}
