import { cacheLife } from "next/cache";
import { FEATURED_LOCATIONS, sanitizeLocation } from "@/lib/location/locations";
import { usingFixtures } from "@/lib/weather/service";
import type { GeoLocation } from "@/lib/weather/types";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface GeocodingResult {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
}

async function search(q: string): Promise<GeoLocation[]> {
  "use cache";
  cacheLife("days");
  const params = new URLSearchParams({ name: q, count: "8", language: "pt", format: "json" });
  const res = await fetch(`${GEOCODING_URL}?${params}`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Geocoding respondeu ${res.status}`);
  const body = (await res.json()) as { results?: GeocodingResult[] };
  return (body.results ?? [])
    .map((r) =>
      sanitizeLocation({
        id: r.id != null ? `om:${r.id}` : undefined,
        name: r.name,
        region: r.admin1,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
      }),
    )
    .filter((l): l is GeoLocation => l != null);
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  if (usingFixtures()) {
    const needle = q.toLocaleLowerCase("pt-BR");
    return Response.json({
      results: FEATURED_LOCATIONS.filter((l) => l.name.toLocaleLowerCase("pt-BR").includes(needle)),
    });
  }

  try {
    return Response.json({ results: await search(q) });
  } catch (err) {
    console.error("[locais]", err);
    return Response.json({ results: [], error: "Busca indisponível no momento." }, { status: 502 });
  }
}
