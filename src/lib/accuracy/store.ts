import "server-only";
import type { Snapshot } from "./snapshot";

/**
 * Minimal Supabase writer over PostgREST (no SDK dependency). Uses the
 * service-role key, which must only ever live in server env vars.
 */

export function storeConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function rest<T>(path: string, body: unknown, prefer: string): Promise<T> {
  const url = `${process.env.SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${path}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Supabase ${path} respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (prefer.includes("return=representation") ? res.json() : null) as T;
}

/** Inserts a run and its hourly values. Duplicate runs are ignored. */
export async function saveSnapshot(s: Snapshot): Promise<{ runId: number | null; values: number }> {
  const rows = await rest<{ id: number }[]>(
    "forecast_runs?on_conflict=provider,model,location_id,issued_at",
    s.run,
    "return=representation,resolution=ignore-duplicates",
  );
  const runId = rows?.[0]?.id ?? null;
  if (runId == null || s.values.length === 0) return { runId, values: 0 };
  await rest(
    "forecast_values",
    s.values.map((v) => ({ ...v, run_id: runId })),
    "return=minimal",
  );
  return { runId, values: s.values.length };
}
