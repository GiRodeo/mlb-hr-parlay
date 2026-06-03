// Pluggable cache: in-memory by default, Upstash Redis when credentials are
// present. Async API everywhere so callers don't need to know which backend
// is live.
//
// We use this for both raw-fetch dedupe (one upstream call per key per TTL)
// and for cross-request memoization of expensive derived data (e.g. today's
// scored players).
//
// Why Upstash (HTTP/REST) instead of ioredis (TCP): on Vercel each request
// runs in a short-lived serverless invocation. Long-lived TCP connections
// churn badly across cold starts and can exhaust the connection pool. The
// Upstash REST client is stateless — every call is a plain HTTPS request —
// which is the right model for serverless. For a long-running server
// (Railway/Render/Docker) ioredis would be marginally faster, but REST works
// everywhere and keeps this file simple.

import { env, hasRedis } from "@/lib/utils/env";
import { log } from "@/lib/utils/logger";

interface CacheBackend {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

class MemoryCache implements CacheBackend {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) { this.store.delete(key); return undefined; }
    return hit.value as T;
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
  async del(key: string): Promise<void> { this.store.delete(key); }
}

// Upstash REST backend. The @upstash/redis client JSON-serializes values for
// us, so we hand it objects directly. Every method degrades gracefully: a
// transient Redis error logs and behaves like a cache miss rather than
// failing the request — a slow page beats a 500.
class UpstashCache implements CacheBackend {
  // Typed loosely: the concrete client type only exists once @upstash/redis
  // is installed. We narrow to the two methods we call.
  constructor(private client: {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, opts: { ex: number }): Promise<unknown>;
    del(key: string): Promise<unknown>;
  }) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const v = await this.client.get<T>(key);
      return v === null ? undefined : v;
    } catch (err) {
      log.warn("cache get failed; treating as miss", { key, err: String(err) });
      return undefined;
    }
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      log.warn("cache set failed; ignoring", { key, err: String(err) });
    }
  }
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      log.warn("cache del failed; ignoring", { key, err: String(err) });
    }
  }
}

// Build the backend exactly once. We memoize the PROMISE (not just the
// resolved value) so concurrent first-callers can't each kick off a separate
// dynamic import / client construction — fixes a race in the previous impl.
let _backendPromise: Promise<CacheBackend> | null = null;

async function makeBackend(): Promise<CacheBackend> {
  if (!hasRedis) {
    log.info("cache backend: in-memory (no Upstash credentials)");
    return new MemoryCache();
  }
  // Dynamic import keeps @upstash/redis out of the bundle when unused.
  try {
    const mod = await import("@upstash/redis").catch(() => null);
    if (!mod?.Redis) {
      log.warn("Upstash credentials set but `@upstash/redis` not installed; using memory cache");
      return new MemoryCache();
    }
    const client = new mod.Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    log.info("cache backend: Upstash Redis");
    return new UpstashCache(client as never);
  } catch (err) {
    log.error("failed to init Redis; falling back to memory cache", { err: String(err) });
    return new MemoryCache();
  }
}

function backend(): Promise<CacheBackend> {
  if (!_backendPromise) _backendPromise = makeBackend();
  return _backendPromise;
}

// Public façade. Most callers should use `withCache` rather than get/set.
export const cache = {
  async get<T>(key: string) { return (await backend()).get<T>(key); },
  async set<T>(key: string, value: T, ttlSeconds: number) { return (await backend()).set(key, value, ttlSeconds); },
  async del(key: string) { return (await backend()).del(key); },
};

// Memoization helper: get-or-compute. Single source of truth for caching
// patterns inside services so we don't reinvent it per file.
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  await cache.set(key, value, ttlSeconds);
  return value;
}
