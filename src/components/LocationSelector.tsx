"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, LocateFixed, MapPin, Search, X } from "lucide-react";
import type { GeoLocation } from "@/lib/weather/types";
import { FEATURED_LOCATIONS } from "@/lib/location/locations";
import { chooseLocation } from "@/app/actions";

export function LocationSelector({ location }: { location: GeoLocation }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoLocation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/locais?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const body = (await res.json()) as { results?: GeoLocation[]; error?: string };
        setResults(body.results ?? []);
        setMessage(body.error ?? null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setMessage("Não foi possível buscar agora.");
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function open() {
    setMessage(null);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
    setQuery("");
  }

  function pick(loc: GeoLocation) {
    startTransition(async () => {
      const { ok } = await chooseLocation(loc);
      if (ok) close();
      else setMessage("Localização inválida.");
    });
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setMessage("Seu navegador não oferece localização.");
      return;
    }
    setMessage("Obtendo sua localização…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMessage(null);
        pick({
          id: `geo:${pos.coords.latitude.toFixed(2)},${pos.coords.longitude.toFixed(2)}`,
          name: "Minha localização",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => setMessage("Permissão de localização negada ou indisponível."),
      { maximumAge: 10 * 60 * 1000, timeout: 10000 },
    );
  }

  const list = results ?? FEATURED_LOCATIONS;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex max-w-[60%] items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[0.875rem] font-medium text-snow transition-colors hover:border-line-strong"
        aria-haspopup="dialog"
      >
        <MapPin size={15} strokeWidth={1.8} className="shrink-0 text-accent" aria-hidden="true" />
        <span className="truncate">{location.name}</span>
        <ChevronDown size={14} className="shrink-0 text-ink-subtle" aria-hidden="true" />
        <span className="sr-only">, alterar localização</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Escolher localização"
        onClick={(e) => e.target === dialogRef.current && close()}
        onClose={() => setQuery("")}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-[1.75rem] border-t border-line-strong bg-surface-solid p-0 text-snow backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:mx-auto sm:max-w-md"
      >
        <div className="flex flex-col gap-4 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <div className="mx-auto h-1 w-10 rounded-full bg-snow/20" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 className="text-[1.125rem] font-medium">Localização</h2>
            <button type="button" onClick={close} className="rounded-full p-1.5 text-ink-muted hover:text-snow">
              <X size={20} aria-hidden="true" />
              <span className="sr-only">Fechar</span>
            </button>
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-line bg-deep-sky/60 px-3.5 py-3 focus-within:border-accent">
            <Search size={17} className="text-ink-subtle" aria-hidden="true" />
            <span className="sr-only">Buscar cidade</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cidade"
              autoComplete="off"
              enterKeyHint="search"
              className="w-full bg-transparent text-[1rem] text-snow placeholder:text-ink-subtle focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={pending}
            className="flex items-center gap-2.5 rounded-2xl px-1 py-1 text-left text-[0.9375rem] text-accent disabled:opacity-50"
          >
            <LocateFixed size={18} aria-hidden="true" />
            Usar minha localização
          </button>

          <p className="min-h-5 text-[0.8125rem] text-ink-muted" role="status">
            {pending ? "Atualizando…" : searching ? "Buscando…" : message}
          </p>

          <ul className="-mx-2 max-h-[45dvh] overflow-y-auto" aria-label={results ? "Resultados" : "Sugestões"}>
            {!results && <li className="eyebrow px-2 pb-2">Sugestões</li>}
            {results && results.length === 0 && !searching && (
              <li className="px-2 py-3 text-ink-muted">Nenhuma cidade encontrada.</li>
            )}
            {list.map((loc) => {
              const current = loc.latitude === location.latitude && loc.longitude === location.longitude;
              return (
                <li key={`${loc.id}-${loc.latitude}-${loc.longitude}`}>
                  <button
                    type="button"
                    onClick={() => pick(loc)}
                    disabled={pending}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-snow/5 disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-[0.9375rem]">{loc.name}</span>
                      <span className="block text-[0.8125rem] text-ink-subtle">
                        {[loc.region, loc.country].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    {current && <span className="text-[0.75rem] text-accent">Atual</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
