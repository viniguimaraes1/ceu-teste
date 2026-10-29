import type { ReactNode } from "react";
import type { SkyScene } from "@/lib/weather/scene";
import { WeatherBackground } from "./WeatherBackground";

export function PageShell({ scene = "neutral", children }: { scene?: SkyScene | "neutral"; children: ReactNode }) {
  return (
    <>
      <WeatherBackground scene={scene} />
      <main
        id="conteudo"
        className="relative z-10 mx-auto w-full max-w-md px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]"
      >
        {children}
      </main>
    </>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display font-medium tracking-[0.08em] text-snow ${className}`}
    >
      CÉU
    </span>
  );
}

/** Header row: wordmark (home) or screen title, plus the location control. */
export function AppHeader({ title, location }: { title?: string; location: ReactNode }) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-4 pt-2">
      {title ? (
        <h1 className="text-[1.75rem] font-light tracking-tight">{title}</h1>
      ) : (
        <h1>
          <Wordmark className="text-[2rem] leading-none" />
        </h1>
      )}
      {location}
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-8 ${className}`} aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="eyebrow">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
