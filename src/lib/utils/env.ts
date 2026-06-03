// Centralized env access. Throws on missing required vars at startup so we
// fail fast instead of much later in a request handler.

import { z } from "zod";

const Schema = z.object({
  MLB_STATS_API_BASE: z.string().url().default("https://statsapi.mlb.com/api/v1"),
  SAVANT_BASE: z.string().url().default("https://baseballsavant.mlb.com"),
  FANGRAPHS_BASE: z.string().url().default("https://www.fangraphs.com"),
  OPEN_METEO_BASE: z.string().url().default("https://api.open-meteo.com/v1"),

  CACHE_TTL_SCHEDULE_S: z.coerce.number().int().positive().default(3600),
  CACHE_TTL_LINEUPS_S: z.coerce.number().int().positive().default(300),
  CACHE_TTL_STATCAST_S: z.coerce.number().int().positive().default(21600),
  CACHE_TTL_PARK_FACTORS_S: z.coerce.number().int().positive().default(604800),
  CACHE_TTL_WEATHER_S: z.coerce.number().int().positive().default(1800),

  // Production cache (Upstash Redis, HTTP/REST — serverless-native).
  // Vercel's Upstash integration injects these two automatically. If both
  // are present we use Redis; otherwise we fall back to an in-memory cache.
  // Allow "" (unset) OR a valid URL — `.url()` alone rejects empty strings,
  // which would crash the build when the var isn't configured.
  UPSTASH_REDIS_REST_URL: z.literal("").or(z.string().url()).default(""),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(""),

  // Production persistence for parlay history (Vercel Postgres / Neon).
  // The integration injects POSTGRES_URL. If unset, history uses an
  // in-memory store (non-durable; resets on cold start).
  POSTGRES_URL: z.string().optional().default(""),

  // Shared secret for the cron settle endpoint (Vercel Cron sends it).
  CRON_SECRET: z.string().optional().default(""),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Eagerly parsed at module load. The error message will name any bad var.
export const env = Schema.parse({
  MLB_STATS_API_BASE: process.env.MLB_STATS_API_BASE,
  SAVANT_BASE: process.env.SAVANT_BASE,
  FANGRAPHS_BASE: process.env.FANGRAPHS_BASE,
  OPEN_METEO_BASE: process.env.OPEN_METEO_BASE,
  CACHE_TTL_SCHEDULE_S: process.env.CACHE_TTL_SCHEDULE_S,
  CACHE_TTL_LINEUPS_S: process.env.CACHE_TTL_LINEUPS_S,
  CACHE_TTL_STATCAST_S: process.env.CACHE_TTL_STATCAST_S,
  CACHE_TTL_PARK_FACTORS_S: process.env.CACHE_TTL_PARK_FACTORS_S,
  CACHE_TTL_WEATHER_S: process.env.CACHE_TTL_WEATHER_S,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  POSTGRES_URL: process.env.POSTGRES_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

/** True when Upstash Redis credentials are configured. */
export const hasRedis = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

/** True when a Postgres connection string is configured. */
export const hasPostgres = Boolean(env.POSTGRES_URL);
