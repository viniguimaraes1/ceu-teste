import type { SkyScene } from "@/lib/weather/scene";

/**
 * Full-bleed atmospheric sky. Pure CSS layers (see `.sky` in globals.css):
 * gradient + glow, stars, two drifting cloud banks, rain streaks, an
 * occasional storm flash, and a veil that settles into Deep Sky so content
 * below the hero always sits on a dark, readable surface.
 */
export function WeatherBackground({ scene }: { scene: SkyScene | "neutral" }) {
  return (
    <div className="sky" data-scene={scene} aria-hidden="true">
      <div className="sky__gradient" />
      <div className="sky__stars" />
      <div className="sky__clouds sky__clouds--far" />
      <div className="sky__clouds" />
      <div className="sky__rain" />
      <div className="sky__flash" />
      <div className="sky__veil" />
    </div>
  );
}
