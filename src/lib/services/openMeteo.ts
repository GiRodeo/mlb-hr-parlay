// Open-Meteo forecast service. Free, no key. We project the wind vector onto
// the bearing from home plate to dead-center field so scoring sees a single
// "outward wind" component rather than raw direction degrees.

import { httpFetch } from "@/lib/http/fetcher";
import { withCache } from "@/lib/cache";
import { env } from "@/lib/utils/env";
import type { BallparkWeather, OpenMeteoForecastResponse, ParkFactors } from "@/types";

/** Pull hourly forecast and snap to the hour closest to game time. */
export async function getBallparkWeather(
  park: ParkFactors,
  gameTimeIso: string,
): Promise<BallparkWeather> {
  const key = `weather:${park.venueId}:${gameTimeIso}`;
  return withCache(key, env.CACHE_TTL_WEATHER_S, async () => {
    const url =
      `${env.OPEN_METEO_BASE}/forecast?` +
      new URLSearchParams({
        latitude: String(park.latitude),
        longitude: String(park.longitude),
        hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,relative_humidity_2m",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        timezone: "auto",
      });
    const raw = await httpFetch<OpenMeteoForecastResponse>(url);
    const idx = nearestHourIndex(raw.hourly.time, gameTimeIso);
    const tempF = raw.hourly.temperature_2m[idx] ?? 70;
    const windMph = raw.hourly.wind_speed_10m[idx] ?? 0;
    const windDir = raw.hourly.wind_direction_10m[idx] ?? 0;
    const precip = raw.hourly.precipitation_probability[idx] ?? 0;
    const humidity = raw.hourly.relative_humidity_2m[idx] ?? 50;

    // Wind direction in meteorology is "from"; we want "to". Add 180.
    const windToDeg = (windDir + 180) % 360;
    const outward = projectOnBearing(windMph, windToDeg, park.cfBearingDeg);

    return {
      venueId: park.venueId,
      gameTimeIso,
      temperatureF: tempF,
      windSpeedMph: windMph,
      windDirectionDeg: windDir,
      windOutwardComponentMph: outward,
      precipitationProbability: precip,
      humidityPct: humidity,
    };
  });
}

/**
 * Project a wind vector (speed at heading `windToDeg`) onto the bearing
 * `cfBearingDeg`. Result is signed: positive = blowing toward CF (helping
 * HRs), negative = blowing in.
 */
export function projectOnBearing(speedMph: number, windToDeg: number, cfBearingDeg: number): number {
  const theta = ((windToDeg - cfBearingDeg) * Math.PI) / 180;
  return speedMph * Math.cos(theta);
}

function nearestHourIndex(hours: string[], target: string): number {
  const t = Date.parse(target);
  let bestI = 0, bestD = Infinity;
  for (let i = 0; i < hours.length; i++) {
    const d = Math.abs(Date.parse(hours[i]!) - t);
    if (d < bestD) { bestD = d; bestI = i; }
  }
  return bestI;
}
