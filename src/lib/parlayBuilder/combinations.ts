// Generate K-combinations of an array. Pure helper, no domain knowledge.
// We use this on a candidate pool of ~25, so worst case C(25,4) = 12,650
// combos — fine for a server-side request.

export function* combinations<T>(items: T[], k: number): Generator<T[]> {
  const n = items.length;
  if (k > n || k <= 0) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map((i) => items[i]!);
    let i = k - 1;
    while (i >= 0 && idx[i] === i + n - k) i--;
    if (i < 0) return;
    idx[i] = (idx[i] ?? 0) + 1;
    for (let j = i + 1; j < k; j++) idx[j] = (idx[j - 1] ?? 0) + 1;
  }
}
