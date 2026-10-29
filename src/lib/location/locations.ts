import type { GeoLocation } from "../weather/types";

export const SAO_PAULO: GeoLocation = {
  id: "sao-paulo",
  name: "São Paulo",
  region: "São Paulo",
  country: "Brasil",
  latitude: -23.5505,
  longitude: -46.6333,
};

export const DEFAULT_LOCATION = SAO_PAULO;

/** Quick picks shown before the user searches. */
export const FEATURED_LOCATIONS: GeoLocation[] = [
  SAO_PAULO,
  { id: "campinas", name: "Campinas", region: "São Paulo", country: "Brasil", latitude: -22.9056, longitude: -47.0608 },
  { id: "santos", name: "Santos", region: "São Paulo", country: "Brasil", latitude: -23.9608, longitude: -46.3336 },
  { id: "rio-de-janeiro", name: "Rio de Janeiro", region: "Rio de Janeiro", country: "Brasil", latitude: -22.9068, longitude: -43.1729 },
  { id: "belo-horizonte", name: "Belo Horizonte", region: "Minas Gerais", country: "Brasil", latitude: -19.9167, longitude: -43.9345 },
  { id: "curitiba", name: "Curitiba", region: "Paraná", country: "Brasil", latitude: -25.4284, longitude: -49.2733 },
];

export const LOCATION_COOKIE = "ceu_local";

const MAX_NAME = 80;

function cleanText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, MAX_NAME);
  return s || undefined;
}

/** Validates untrusted input (cookie, form) into a GeoLocation, or null. */
export function sanitizeLocation(input: unknown): GeoLocation | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const lat = Number(o.latitude);
  const lon = Number(o.longitude);
  const name = cleanText(o.name);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  // ~1 km precision: plenty for model grids, and avoids storing exact positions.
  const latitude = Math.round(lat * 100) / 100;
  const longitude = Math.round(lon * 100) / 100;
  const featured = FEATURED_LOCATIONS.find((f) => f.id === o.id);
  if (featured) return featured;
  return {
    id: cleanText(o.id)?.slice(0, 64) ?? `geo:${latitude},${longitude}`,
    name,
    region: cleanText(o.region),
    country: cleanText(o.country),
    latitude,
    longitude,
  };
}

export function parseLocationCookie(value: string | undefined): GeoLocation {
  if (!value) return DEFAULT_LOCATION;
  try {
    return sanitizeLocation(JSON.parse(value)) ?? DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}
