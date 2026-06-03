// Bounded-concurrency map: run `fn` over `items` with at most `limit` in
// flight at once. This lets us parallelize the many MLB API calls for speed
// WITHOUT firing hundreds simultaneously (which would get us rate-limited or
// IP-blocked — the opposite of helpful).
//
// Results preserve input order. Rejections propagate (callers wrap per-item
// work in try/catch where partial failure is acceptable).

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  // Spin up `limit` workers that pull from the shared index.
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
