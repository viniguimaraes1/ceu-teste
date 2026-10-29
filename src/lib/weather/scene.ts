import type { CurrentConditions, DailyPoint } from "./types";
import { conditionGroup } from "./conditions";
import { MEASURABLE_MM } from "./rain";

export type SkyScene =
  | "clear-day"
  | "cloudy-day"
  | "rain"
  | "storm"
  | "sunset"
  | "clear-night"
  | "cloudy-night";

/** Minutes either side of sunrise/sunset rendered as the golden-hour scene. */
export const GOLDEN_WINDOW_MIN = 45;

/**
 * Picks the atmospheric background for the current moment. Precipitation wins
 * over time of day; golden hour only applies to dry, not-overcast skies.
 */
export function skySceneFor(
  current: Pick<CurrentConditions, "weatherCode" | "isDay" | "cloudCover" | "precipitation" | "time">,
  today?: Pick<DailyPoint, "sunrise" | "sunset">,
): SkyScene {
  const group = conditionGroup(current.weatherCode);
  if (group === "thunderstorm") return "storm";
  if (
    group === "rain" ||
    group === "showers" ||
    group === "drizzle" ||
    group === "freezing" ||
    group === "snow" ||
    (current.precipitation ?? 0) >= MEASURABLE_MM
  ) {
    return "rain";
  }

  const cloudy = group === "overcast" || group === "fog" || (current.cloudCover ?? 0) >= 80;

  if (!cloudy && today) {
    const window = GOLDEN_WINDOW_MIN * 60;
    const nearSunset = today.sunset != null && Math.abs(current.time - today.sunset) <= window;
    const nearSunrise = today.sunrise != null && Math.abs(current.time - today.sunrise) <= window;
    if (nearSunset || nearSunrise) return "sunset";
  }

  if (!current.isDay) return cloudy || group === "partly-cloudy" ? "cloudy-night" : "clear-night";
  return cloudy ? "cloudy-day" : "clear-day";
}

/** Browser theme-color per scene (status bar tint on iOS). */
export const SCENE_THEME_COLOR: Record<SkyScene, string> = {
  "clear-day": "#2D5F8F",
  "cloudy-day": "#3B4E63",
  rain: "#1C2B3B",
  storm: "#141B27",
  sunset: "#2A2F52",
  "clear-night": "#07111F",
  "cloudy-night": "#111A27",
};
