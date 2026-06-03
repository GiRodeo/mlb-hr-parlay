// Shared auth guard for cron endpoints. Vercel Cron sends the configured
// CRON_SECRET as a Bearer token in the Authorization header. We reject any
// request that doesn't match — these routes mutate stored data and hit
// upstream APIs, so they must not be publicly triggerable.
//
// If CRON_SECRET is unset (local dev), we allow the call but log a warning.

import { env } from "./env";
import { log } from "./logger";

export function authorizeCron(req: Request): { ok: boolean; status?: number } {
  if (!env.CRON_SECRET) {
    log.warn("CRON_SECRET unset — allowing cron call (set it in production!)");
    return { ok: true };
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${env.CRON_SECRET}`) return { ok: true };
  return { ok: false, status: 401 };
}
