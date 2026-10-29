import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AGREEMENT_LABEL, agreementExplanation, type AgreementSummary } from "@/lib/weather/comparison";

const BARS: Record<AgreementSummary["level"], number> = { high: 3, moderate: 2, low: 1, unavailable: 0 };

function Bars({ level }: { level: AgreementSummary["level"] }) {
  const filled = BARS[level];
  const tone = level === "low" ? "bg-alert" : level === "moderate" ? "bg-warm" : "bg-accent";
  return (
    <span className="flex items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[4px] rounded-full ${i < filled ? tone : "bg-snow/15"}`}
          style={{ height: `${8 + i * 4}px` }}
        />
      ))}
    </span>
  );
}

/**
 * Communicates agreement between independent models — explicitly NOT a
 * statistically calibrated confidence score.
 */
export function ForecastConfidence({
  summary,
  variant = "card",
}: {
  summary: AgreementSummary;
  variant?: "card" | "chip";
}) {
  if (variant === "chip") {
    return (
      <Link
        href="/inteligencia"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:border-line-strong"
      >
        <Bars level={summary.level} />
        {AGREEMENT_LABEL[summary.level]}
        <ChevronRight size={14} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-3">
        <Bars level={summary.level} />
        <p className="text-[1.0625rem] font-medium">{AGREEMENT_LABEL[summary.level]}</p>
      </div>
      <p className="mt-2 text-[0.9375rem] leading-snug text-ink-muted">{agreementExplanation(summary)}</p>
      <p className="mt-3 border-t border-line pt-3 text-[0.75rem] leading-relaxed text-ink-subtle">
        Indica o quanto modelos independentes concordam entre si. Não é uma probabilidade calibrada: modelos podem
        concordar e, ainda assim, errar juntos.
      </p>
    </div>
  );
}
