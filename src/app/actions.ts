"use server";

import { cookies } from "next/headers";
import { LOCATION_COOKIE, sanitizeLocation } from "@/lib/location/locations";

export async function chooseLocation(input: unknown): Promise<{ ok: boolean }> {
  const location = sanitizeLocation(input);
  if (!location) return { ok: false };
  (await cookies()).set(LOCATION_COOKIE, JSON.stringify(location), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true };
}
