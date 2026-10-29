import { PageShell, Wordmark } from "./PageShell";

function Block({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageSkeleton({ title, variant = "home" }: { title?: string; variant?: "home" | "list" }) {
  return (
    <PageShell>
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando previsão…</span>
        <header className="flex min-h-14 items-center justify-between gap-4 pt-2">
          {title ? (
            <h1 className="text-[1.75rem] font-light tracking-tight">{title}</h1>
          ) : (
            <h1>
              <Wordmark className="text-[2rem] leading-none" />
            </h1>
          )}
          <Block className="h-9 w-32 rounded-full" />
        </header>
        {variant === "home" ? (
          <>
            <div className="pt-10 pb-9">
              <Block className="h-28 w-44" />
              <Block className="mt-5 h-6 w-48" />
              <Block className="mt-2 h-4 w-60" />
            </div>
            <Block className="h-36 w-full rounded-[1.5rem]" />
            <Block className="mt-8 h-40 w-full rounded-[1.5rem]" />
            <Block className="mt-8 h-64 w-full rounded-[1.5rem]" />
          </>
        ) : (
          <>
            <Block className="mt-6 h-11 w-full rounded-full" />
            <Block className="mt-6 h-7 w-3/4" />
            <Block className="mt-6 h-56 w-full rounded-[1.5rem]" />
            <Block className="mt-6 h-48 w-full rounded-[1.5rem]" />
          </>
        )}
      </div>
    </PageShell>
  );
}
