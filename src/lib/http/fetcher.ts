// Server-side HTTP client. All upstream calls (MLB, Savant, FanGraphs,
// Open-Meteo) go through here so we get consistent timeouts, retries,
// User-Agent, and logging — and so the client never sees these URLs.

import { log } from "@/lib/utils/logger";

export interface FetchOptions {
  // Per-attempt timeout. Default 8s.
  timeoutMs?: number;
  // Total attempts including the first. Default 3.
  retries?: number;
  // Headers to merge over defaults.
  headers?: Record<string, string>;
  // For non-GET; we currently only need GET, but kept generic.
  method?: "GET" | "POST";
  body?: BodyInit;
  // If set, response is parsed as text instead of JSON. Used for Savant CSV.
  parse?: "json" | "text";
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "mlb-hr-parlay/0.1 (+server-only fetcher)",
  Accept: "application/json,text/csv;q=0.9,*/*;q=0.1",
};

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly url: string, body?: string) {
    super(`HTTP ${status} on ${url}${body ? `: ${body.slice(0, 200)}` : ""}`);
    this.name = "HttpError";
  }
}

/**
 * Fetch with timeout + retry. Retries on:
 *   - network errors (TypeError)
 *   - 5xx
 *   - 429
 * Honors `Retry-After` header when present.
 *
 * Important: we do NOT cache here — caching is the caller's decision and is
 * handled by `withCache` in lib/cache. A fetcher that silently caches makes
 * upstream debugging much harder.
 */
export async function httpFetch<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const maxAttempts = Math.max(1, opts.retries ?? 3);
  const parseAs = opts.parse ?? "json";

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: { ...DEFAULT_HEADERS, ...opts.headers },
        body: opts.body,
        signal: controller.signal,
        // Next.js fetch cache: opt out — we cache deliberately at app layer.
        cache: "no-store",
      });

      if (!res.ok) {
        const isRetryable = res.status >= 500 || res.status === 429;
        if (!isRetryable || attempt === maxAttempts) {
          const body = await res.text().catch(() => "");
          throw new HttpError(res.status, url, body);
        }
        const wait = retryAfterMs(res.headers.get("retry-after")) ?? backoff(attempt);
        log.warn("http retry", { url, status: res.status, attempt, wait });
        await sleep(wait);
        continue;
      }

      return parseAs === "json" ? ((await res.json()) as T) : ((await res.text()) as unknown as T);
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const wait = backoff(attempt);
      log.warn("http error retry", { url, attempt, wait, err: String(err) });
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`fetch failed: ${url}`);
}

// Exponential backoff with full jitter — avoids thundering herd on retries.
function backoff(attempt: number): number {
  const cap = 4_000;
  const base = 250 * 2 ** (attempt - 1);
  return Math.floor(Math.random() * Math.min(cap, base));
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
