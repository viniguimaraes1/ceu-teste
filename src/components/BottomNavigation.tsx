"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Layers, Umbrella } from "lucide-react";

const TABS = [
  { href: "/", label: "Início", Icon: House },
  { href: "/chuva", label: "Chuva", Icon: Umbrella },
  { href: "/previsao", label: "Previsão", Icon: CalendarDays },
  { href: "/inteligencia", label: "Modelos", Icon: Layers },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-deep-sky/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-md justify-around px-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pt-2.5 pb-2 text-[0.6875rem] font-medium transition-colors ${
                  active ? "text-snow" : "text-ink-subtle hover:text-ink-muted"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 1.9 : 1.5} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
