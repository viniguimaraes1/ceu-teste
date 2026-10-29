/**
 * WMO weather interpretation codes (as used by Open-Meteo) mapped to CÉU
 * condition groups and Brazilian Portuguese labels.
 */

export type ConditionGroup =
  | "clear"
  | "partly-cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "freezing"
  | "snow"
  | "thunderstorm"
  | "unknown";

/** Icon keys, resolved to Lucide icons by the UI layer. */
export type ConditionIcon =
  | "sun"
  | "moon"
  | "cloud-sun"
  | "cloud-moon"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "snow"
  | "storm"
  | "unknown";

interface ConditionDef {
  group: ConditionGroup;
  label: string;
}

const CODES: Record<number, ConditionDef> = {
  0: { group: "clear", label: "Céu limpo" },
  1: { group: "clear", label: "Predomínio de sol" },
  2: { group: "partly-cloudy", label: "Parcialmente nublado" },
  3: { group: "overcast", label: "Nublado" },
  45: { group: "fog", label: "Neblina" },
  48: { group: "fog", label: "Neblina com geada" },
  51: { group: "drizzle", label: "Garoa fraca" },
  53: { group: "drizzle", label: "Garoa" },
  55: { group: "drizzle", label: "Garoa intensa" },
  56: { group: "freezing", label: "Garoa congelante" },
  57: { group: "freezing", label: "Garoa congelante intensa" },
  61: { group: "rain", label: "Chuva fraca" },
  63: { group: "rain", label: "Chuva moderada" },
  65: { group: "rain", label: "Chuva forte" },
  66: { group: "freezing", label: "Chuva congelante" },
  67: { group: "freezing", label: "Chuva congelante forte" },
  71: { group: "snow", label: "Neve fraca" },
  73: { group: "snow", label: "Neve" },
  75: { group: "snow", label: "Neve intensa" },
  77: { group: "snow", label: "Grãos de neve" },
  80: { group: "showers", label: "Pancadas de chuva fracas" },
  81: { group: "showers", label: "Pancadas de chuva" },
  82: { group: "showers", label: "Pancadas de chuva fortes" },
  85: { group: "snow", label: "Pancadas de neve" },
  86: { group: "snow", label: "Pancadas de neve fortes" },
  95: { group: "thunderstorm", label: "Trovoadas" },
  96: { group: "thunderstorm", label: "Trovoadas com granizo" },
  99: { group: "thunderstorm", label: "Trovoadas com granizo forte" },
};

export function conditionGroup(code: number | null | undefined): ConditionGroup {
  if (code == null) return "unknown";
  return CODES[code]?.group ?? "unknown";
}

export function conditionLabel(code: number | null | undefined): string {
  if (code == null) return "Condição indisponível";
  return CODES[code]?.label ?? "Condição indisponível";
}

/** True when the code itself describes falling precipitation. */
export function isWetCode(code: number | null | undefined): boolean {
  const group = conditionGroup(code);
  return (
    group === "drizzle" ||
    group === "rain" ||
    group === "showers" ||
    group === "freezing" ||
    group === "snow" ||
    group === "thunderstorm"
  );
}

export function conditionIcon(code: number | null | undefined, isDay = true): ConditionIcon {
  switch (conditionGroup(code)) {
    case "clear":
      return isDay ? "sun" : "moon";
    case "partly-cloudy":
      return isDay ? "cloud-sun" : "cloud-moon";
    case "overcast":
      return "cloud";
    case "fog":
      return "fog";
    case "drizzle":
    case "freezing":
      return "drizzle";
    case "rain":
      return "rain";
    case "showers":
      return "showers";
    case "snow":
      return "snow";
    case "thunderstorm":
      return "storm";
    default:
      return "unknown";
  }
}
