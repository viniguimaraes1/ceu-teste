/**
 * Precipitation intensity classes for hourly accumulations (mm/h), following
 * the common meteorological convention (e.g. INMET/WMO rain-rate bands).
 * Intensity is deliberately kept separate from probability: a 90% chance of
 * 0.3 mm is a very different day from a 40% chance of 15 mm.
 */

export type RainIntensity = "none" | "trace" | "light" | "moderate" | "heavy" | "violent";

/** Below this an hour is treated as dry (Open-Meteo's own probability threshold). */
export const MEASURABLE_MM = 0.1;

export function rainIntensity(mmPerHour: number | null | undefined): RainIntensity | null {
  if (mmPerHour == null) return null;
  if (mmPerHour < MEASURABLE_MM) return mmPerHour > 0 ? "trace" : "none";
  if (mmPerHour < 2.5) return "light";
  if (mmPerHour < 10) return "moderate";
  if (mmPerHour < 50) return "heavy";
  return "violent";
}

export const INTENSITY_LABEL: Record<RainIntensity, string> = {
  none: "Sem chuva",
  trace: "Traços",
  light: "Fraca",
  moderate: "Moderada",
  heavy: "Forte",
  violent: "Muito forte",
};
