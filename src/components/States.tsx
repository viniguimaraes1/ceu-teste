"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="surface mt-10 flex flex-col items-start gap-3 p-6" role="alert">
      <CloudOff size={26} strokeWidth={1.5} className="text-ink-muted" aria-hidden="true" />
      <p className="text-[1.125rem] font-medium">{title}</p>
      <p className="text-[0.9375rem] leading-snug text-ink-muted">
        Não exibimos dados aproximados ou antigos no lugar da previsão. Tente novamente em instantes.
      </p>
      {detail && process.env.NODE_ENV !== "production" && <p className="font-mono text-[0.75rem] break-all text-ink-subtle">{detail}</p>}
      <button
        type="button"
        onClick={() => start(() => router.refresh())}
        disabled={pending}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-snow px-4 py-2 text-[0.875rem] font-medium text-deep-sky disabled:opacity-60"
      >
        <RefreshCw size={15} className={pending ? "animate-spin" : ""} aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  );
}
