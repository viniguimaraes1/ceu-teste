import type { Forecast } from "@/lib/weather/types";
import { formatTimestamp } from "@/lib/weather/format";

export function DataAttribution({ forecast }: { forecast: Forecast }) {
  return (
    <footer className="mt-10 px-1 text-[0.75rem] leading-relaxed text-ink-subtle">
      <p>
        Dados meteorológicos por{" "}
        <a href="https://open-meteo.com/" className="underline decoration-snow/20 underline-offset-2 hover:text-ink-muted" rel="noreferrer" target="_blank">
          Open-Meteo.com
        </a>{" "}
        (CC BY 4.0), a partir de modelos de serviços meteorológicos nacionais.
      </p>
      <p>
        Atualizado em {formatTimestamp(Math.floor(forecast.fetchedAt / 1000), forecast.timezone)} · horário de{" "}
        {forecast.timezone === "America/Sao_Paulo" ? "Brasília" : forecast.timezone.replaceAll("_", " ")}
      </p>
    </footer>
  );
}

export function FixtureBanner() {
  return (
    <div
      role="note"
      className="mt-3 rounded-2xl border border-alert/40 bg-alert/10 px-4 py-2.5 text-[0.8125rem] leading-snug text-snow"
    >
      <strong className="font-semibold">Dados sintéticos de desenvolvimento.</strong> Isto não é uma previsão real —
      modo <code className="text-[0.75rem]">CEU_FIXTURES</code> ativo.
    </div>
  );
}
