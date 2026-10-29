import {
  CircleHelp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { conditionIcon, conditionLabel, type ConditionIcon } from "@/lib/weather/conditions";

const ICONS: Record<ConditionIcon, { Icon: LucideIcon; tone: string }> = {
  sun: { Icon: Sun, tone: "text-warm" },
  moon: { Icon: Moon, tone: "text-snow" },
  "cloud-sun": { Icon: CloudSun, tone: "text-snow" },
  "cloud-moon": { Icon: CloudMoon, tone: "text-snow" },
  cloud: { Icon: Cloud, tone: "text-ink-muted" },
  fog: { Icon: CloudFog, tone: "text-ink-muted" },
  drizzle: { Icon: CloudDrizzle, tone: "text-rain-strong" },
  rain: { Icon: CloudRain, tone: "text-rain-strong" },
  showers: { Icon: CloudRain, tone: "text-rain-strong" },
  snow: { Icon: CloudSnow, tone: "text-snow" },
  storm: { Icon: CloudLightning, tone: "text-warm" },
  unknown: { Icon: CircleHelp, tone: "text-ink-subtle" },
};

export function WeatherIcon({
  code,
  isDay = true,
  size = 22,
  className = "",
  decorative = false,
}: {
  code: number | null;
  isDay?: boolean;
  size?: number;
  className?: string;
  /** When true the icon is hidden from assistive tech (label shown nearby). */
  decorative?: boolean;
}) {
  const { Icon, tone } = ICONS[conditionIcon(code, isDay)];
  return (
    <Icon
      size={size}
      strokeWidth={1.5}
      className={`${tone} ${className}`}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : conditionLabel(code)}
      role={decorative ? undefined : "img"}
    />
  );
}
