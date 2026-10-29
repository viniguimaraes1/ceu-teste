"use client";

import { useId, useState, type ReactNode } from "react";

/** Two-or-more option segmented control with accessible tab semantics. */
export function SegmentedTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  return (
    <div>
      <div
        role="tablist"
        className="flex rounded-full border border-line bg-surface p-1"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const next = (active + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
          setActive(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}
      >
        {tabs.map((t, i) => (
          <button
            key={t.label}
            id={`${id}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`flex-1 rounded-full px-4 py-2 text-[0.875rem] font-medium transition-colors duration-300 ${
              active === i ? "bg-snow text-deep-sky" : "text-ink-muted hover:text-snow"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.label}
          id={`${id}-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${i}`}
          hidden={active !== i}
          className="mt-6"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
