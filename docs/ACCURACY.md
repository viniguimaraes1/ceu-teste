# Accuracy engine — foundation and validation plan

CÉU's long-term advantage is meant to be accuracy, especially for rain in São Paulo.
**That is a hypothesis, not a result.** No accuracy claim (vs Apple Weather or anyone
else) should be made publicly until the steps below produce evidence.

## What exists today (V1)

| Piece | Where | Status |
|---|---|---|
| Multi-model retrieval (ECMWF IFS, GFS, ICON, GEM) | `src/lib/weather/providers/open-meteo/client.ts` | Built; each model is fetched separately so one failure doesn't take the others down |
| Model agreement (not accuracy) | `src/lib/weather/comparison.ts` | Built; heuristic thresholds, labelled as uncalibrated in the UI |
| Verification metrics | `src/lib/accuracy/metrics.ts` | Built and unit-tested: MAE, bias, Brier score, Brier skill score, POD/FAR/CSI/precision/recall, reliability bins, rain-onset timing error |
| Persistence schema | `supabase/migrations/0001_accuracy_foundation.sql` | Written; not yet applied to a live database |
| Snapshot job | `GET /api/cron/snapshot` + `src/lib/accuracy/{snapshot,store}.ts` | Built; row building is unit-tested; the Supabase write path has **not** been run against a real database yet |

## Data model

- `forecast_runs` — one row per (provider, model, location, retrieval time). Stores the
  coordinates actually requested, `issued_at` (when CÉU fetched it) and `model_run_at`
  (model initialisation time, when Open-Meteo's metadata exposes it).
- `forecast_values` — hourly predictions per run: temperature, precipitation probability,
  precipitation amount, weather code, and `lead_hours`. Precipitation refers to the hour
  **ending** at `target_time` (Open-Meteo convention).
- `observations` — ground truth from stations, with source, station id, coordinates,
  period length and QC flag.
- `location_stations` — which stations verify which forecast location.
- `verification_pairs` (view) — forecast/observation pairs joined on the hour; this is the
  input to every metric.

Snapshots are refused while synthetic fixtures are active, so development data can never
enter the archive.

## Turning it on

1. Create a Supabase project (free tier is enough to start) and run the migration in the
   SQL editor.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in Vercel
   (server-side env vars only).
3. Call `GET /api/cron/snapshot` hourly with `Authorization: Bearer $CRON_SECRET`.
   Vercel Cron on the Hobby plan only allows daily jobs; for hourly snapshots use Vercel
   Pro, or the GitHub Actions workflow in `.github/workflows/snapshot.yml` (schedule is
   commented out until secrets exist).

Storage estimate: 5 runs/hour × 72 hourly values ≈ 8,600 rows/day for São Paulo.

## Observations — next step

Open-Meteo is a forecast source, not ground truth. Candidate observation sources for
São Paulo, to evaluate in the next phase:

- **INMET automatic stations** (e.g. A701 São Paulo – Mirante de Santana): hourly
  temperature and precipitation; official.
- **METAR** for SBSP (Congonhas), SBMT (Campo de Marte), SBGR (Guarulhos): reliable
  temperature; precipitation is reported only qualitatively.
- **CEMADEN / CGE-SP rain gauges**: dense urban rain network, the best fit for
  neighbourhood-scale rain verification.

A single station cannot represent the whole city's rain. Verification should be
reported per station and lead time, and rain detection should account for spatial
variability (e.g. "rain at any gauge within N km").

## Validation protocol (before any public claim)

1. Archive at least 3 months (ideally a full wet season, Oct–Mar) of hourly snapshots.
2. Score each source by **lead time bucket** (0–3 h, 3–12 h, 12–24 h, 24–72 h):
   - temperature: MAE and bias;
   - rain probability: Brier score, Brier skill score vs climatology, reliability diagram;
   - rain yes/no at ≥ 0.1 mm/h: POD (recall), FAR, precision, CSI, frequency bias;
   - rain onset: timing error in hours, only when both forecast and observation have rain.
3. Report sample sizes and confidence intervals (bootstrap by day, since hours within a
   day are correlated).
4. Comparing against Apple Weather requires archiving its forecasts the same way at the
   same times; until then, no comparison claim.

## Not in V1 (on purpose)

- No calibrated ensemble or ML post-processing. Combining models does not automatically
  improve accuracy; a blend must beat the best single model on held-out data first.
- Model comparison in the UI stays separate from any future calibrated forecast.
- No LLM is involved in producing forecasts or insight text; insights are deterministic
  rules over provider values (`src/lib/weather/insight.ts`).
