# CÉU — Weather, made clear.

A premium weather app, starting in São Paulo. Next.js (App Router) + TypeScript +
Tailwind CSS v4, with real forecasts from [Open-Meteo](https://open-meteo.com/). Installable
as a PWA on iPhone.

## Screens

| Route | Purpose |
|---|---|
| `/` Início | Current conditions on an atmospheric sky, a factual short-term rain insight, 24 h hourly forecast, 5-day preview, today's details |
| `/chuva` Chuva | Next 24 h of rain chance (bars) vs expected volume (droplets), kept visually separate; model-by-model rain matrix; 7-day rain outlook |
| `/previsao` Previsão | 10-day forecast with expandable details (rain, wind, UV, sun times), a factual week trend, 48 h hourly |
| `/inteligencia` Modelos | Model agreement, temperature by model (ECMWF, GFS, ICON, GEM), day-by-day comparison, sources, run times and an explainer on uncertainty |

## Run it

```bash
npm install
npm run dev            # real data from Open-Meteo (no API key needed)
npm run dev:fixtures   # offline: SYNTHETIC data, with a visible banner
npm test               # unit tests (vitest)
npm run typecheck
npm run build && npm start
```

### Test on your iPhone

- **Same Wi-Fi:** run `npm run dev -- -H 0.0.0.0`, then open `http://<your-computer-ip>:3000`
  in Safari on the iPhone.
- **Deployed (recommended):** import the repo in [Vercel](https://vercel.com/new) (no env vars
  needed), open the URL in Safari → Share → **Add to Home Screen**. CÉU then opens full
  screen like a native app, with its own icon. The service worker only runs in production builds.

## Architecture

```
src/
  app/                    routes (each page streams its data inside <Suspense> with a skeleton)
    api/locais            city search (Open-Meteo geocoding proxy)
    api/cron/snapshot     forecast archiving for the accuracy engine (auth: CRON_SECRET)
  components/             WeatherHero, WeatherInsight, HourlyForecast, DailyForecast, RainTimeline,
                          ModelComparison, ModelTemperatureChart, ForecastConfidence,
                          LocationSelector, WeatherBackground, BottomNavigation, …
  lib/weather/
    types.ts              provider-agnostic domain types (missing values are null, never invented)
    providers/            WeatherProvider interface + Open-Meteo implementation (client, parse, schema)
    service.ts            cached entry point ("use cache", 10 min) and the fixture switch
    insight.ts            deterministic rain insight rules (thresholds exported and tested)
    scene.ts              picks one of 7 sky scenes from current conditions
    comparison.ts         model alignment, spread and agreement levels
    conditions.ts, format.ts, rain.ts, timeline.ts, trend.ts
  lib/accuracy/           verification metrics, snapshot rows, Supabase writer
  dev/fixtures/           SYNTHETIC data generator (dev and tests only)
supabase/migrations/      accuracy schema
docs/ACCURACY.md          accuracy foundation and validation protocol
```

Key decisions:

- **Unix timestamps + explicit IANA time zone everywhere.** Open-Meteo is called with
  `timeformat=unixtime&timezone=auto`; every formatter takes the forecast's zone, so
  rendering never depends on the server's or the phone's zone.
- **One request per comparison model.** An unsupported model or a model outside its coverage
  area becomes an "Indisponível" row instead of breaking the page.
- **Agreement, not confidence.** `ForecastConfidence` shows how much the models agree and
  says explicitly that it is not a calibrated probability.
- **No fabricated data.** Missing variables render as "—". If Open-Meteo is unreachable, the
  page shows an error state with a retry button. It never falls back to stale or synthetic data.
  `CEU_FIXTURES=1` is the only way to see synthetic data; it shows a banner and is refused
  on Vercel production.
- **Design tokens.** Brand colors map to semantic tokens in `src/app/globals.css` (`@theme`).
  Components only use semantic names (`text-ink-muted`, `bg-surface`, `text-rain-strong`, …).
  Model colors were checked for color-vision-deficiency separation on the dark surface.
- **Motion.** The sky is pure CSS. Only `transform` and `opacity` are animated, and all
  motion stops under `prefers-reduced-motion`.

## Attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed CC BY 4.0, based on
models from ECMWF, NOAA/NCEP, DWD, CMC and others. Attribution is shown in the app footer.
