import { timingSafeEqual } from "node:crypto";
import { SAO_PAULO } from "@/lib/location/locations";
import { COMPARISON_MODELS } from "@/lib/weather/models";
import { provider, usingFixtures } from "@/lib/weather/service";
import { snapshotFromForecast, snapshotFromModel, type Snapshot } from "@/lib/accuracy/snapshot";
import { saveSnapshot, storeConfigured } from "@/lib/accuracy/store";

/** Locations whose forecasts are archived for verification. */
const TRACKED = [SAO_PAULO];

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Archives the current forecast (best match + each comparison model) for the
 * tracked locations. Call hourly from a scheduler with
 * `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically).
 */
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (usingFixtures()) {
    return Response.json({ error: "Modo de dados sintéticos ativo: nada é arquivado." }, { status: 409 });
  }
  if (!storeConfigured()) {
    return Response.json(
      { configured: false, error: "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para arquivar previsões." },
      { status: 503 },
    );
  }

  const results: { location: string; model: string; values?: number; error?: string }[] = [];
  const runInfo = await Promise.all(COMPARISON_MODELS.map((m) => provider.getModelRunInfo(m.id, m.metaDataset)));

  for (const location of TRACKED) {
    const snapshots: Snapshot[] = [];
    try {
      snapshots.push(snapshotFromForecast(await provider.getForecast(location)));
    } catch (err) {
      results.push({ location: location.id, model: "best_match", error: (err as Error).message });
    }
    const models = await Promise.all(COMPARISON_MODELS.map((m) => provider.getModelForecast(location, m.id)));
    for (const m of models) {
      const run = runInfo.find((r) => r.modelId === m.modelId);
      const snap = snapshotFromModel(m, location, provider.id, run?.initialisedAt ?? null);
      if (snap) snapshots.push(snap);
      else results.push({ location: location.id, model: m.modelId, error: m.message ?? m.status });
    }
    for (const snap of snapshots) {
      try {
        const saved = await saveSnapshot(snap);
        results.push({ location: location.id, model: snap.run.model, values: saved.values });
      } catch (err) {
        results.push({ location: location.id, model: snap.run.model, error: (err as Error).message });
      }
    }
  }

  const failed = results.filter((r) => r.error).length;
  return Response.json({ ok: failed === 0, results }, { status: failed === results.length ? 502 : 200 });
}
