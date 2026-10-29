-- CÉU accuracy foundation
-- Stores what each model predicted, when, for where — and what was later
-- observed — so accuracy can be measured before it is ever claimed.
-- Writes happen server-side with the service role; RLS blocks anon access.

create table if not exists public.forecast_locations (
  id          text primary key,              -- e.g. 'sao-paulo'
  name        text not null,
  latitude    double precision not null,
  longitude   double precision not null,
  timezone    text not null default 'America/Sao_Paulo',
  created_at  timestamptz not null default now()
);

-- One row per (provider, model) payload retrieved for a location.
create table if not exists public.forecast_runs (
  id            bigint generated always as identity primary key,
  provider      text not null,                -- 'open-meteo'
  model         text not null,                -- 'best_match', 'ecmwf_ifs025', 'gfs_seamless', …
  location_id   text not null references public.forecast_locations(id),
  latitude      double precision not null,    -- coordinates actually requested
  longitude     double precision not null,
  issued_at     timestamptz not null,         -- when CÉU retrieved the forecast
  model_run_at  timestamptz,                  -- model initialisation time, when known
  created_at    timestamptz not null default now(),
  unique (provider, model, location_id, issued_at)
);
create index if not exists forecast_runs_location_issued on public.forecast_runs (location_id, issued_at desc);

-- Hourly predicted values. Precipitation fields refer to the hour ENDING at target_time.
create table if not exists public.forecast_values (
  run_id                     bigint not null references public.forecast_runs(id) on delete cascade,
  target_time                timestamptz not null,
  lead_hours                 real not null,   -- target_time - issued_at, in hours
  temperature_c              real,
  precipitation_probability  real,            -- 0–100
  precipitation_mm           real,
  weather_code               smallint,
  primary key (run_id, target_time)
);
create index if not exists forecast_values_target on public.forecast_values (target_time);

-- Ground truth from weather stations (e.g. INMET automatic stations, METAR).
create table if not exists public.observations (
  id               bigint generated always as identity primary key,
  source           text not null,             -- 'inmet', 'metar', 'cemaden', …
  station_id       text not null,             -- e.g. INMET 'A701' (São Paulo – Mirante)
  station_name     text,
  latitude         double precision not null,
  longitude        double precision not null,
  observed_at      timestamptz not null,      -- end of the observation period
  period_minutes   integer not null default 60,
  temperature_c    real,
  precipitation_mm real,                      -- accumulated over the period
  quality          text,                      -- provider QC flag, if any
  created_at       timestamptz not null default now(),
  unique (source, station_id, observed_at, period_minutes)
);
create index if not exists observations_time on public.observations (observed_at);

-- Which stations verify which forecast location.
create table if not exists public.location_stations (
  location_id  text not null references public.forecast_locations(id),
  source       text not null,
  station_id   text not null,
  primary key (location_id, source, station_id)
);

-- Hourly forecast/observation pairs, the input for every metric in
-- src/lib/accuracy/metrics.ts (MAE, Brier score, POD/FAR/CSI, calibration).
create or replace view public.verification_pairs as
select
  r.provider,
  r.model,
  r.location_id,
  r.issued_at,
  v.target_time,
  v.lead_hours,
  v.temperature_c              as forecast_temperature_c,
  v.precipitation_probability  as forecast_precipitation_probability,
  v.precipitation_mm           as forecast_precipitation_mm,
  o.source                     as observation_source,
  o.station_id,
  o.temperature_c              as observed_temperature_c,
  o.precipitation_mm           as observed_precipitation_mm
from public.forecast_values v
join public.forecast_runs r on r.id = v.run_id
join public.location_stations ls on ls.location_id = r.location_id
join public.observations o
  on o.source = ls.source
 and o.station_id = ls.station_id
 and o.observed_at = v.target_time
 and o.period_minutes = 60;

alter table public.forecast_locations enable row level security;
alter table public.forecast_runs      enable row level security;
alter table public.forecast_values    enable row level security;
alter table public.observations       enable row level security;
alter table public.location_stations  enable row level security;

insert into public.forecast_locations (id, name, latitude, longitude)
values ('sao-paulo', 'São Paulo', -23.5505, -46.6333)
on conflict (id) do nothing;
