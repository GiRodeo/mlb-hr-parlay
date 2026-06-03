// Small numeric helpers. Kept dependency-free.

export const clamp = (n: number, lo: number, hi: number) =>
  n < lo ? lo : n > hi ? hi : n;

// Linear map from [inMin,inMax] to [outMin,outMax], clamped to outMax range.
export function linMap(n: number, inMin: number, inMax: number, outMin = 0, outMax = 100): number {
  if (inMax === inMin) return (outMin + outMax) / 2;
  const t = (n - inMin) / (inMax - inMin);
  return clamp(outMin + t * (outMax - outMin), Math.min(outMin, outMax), Math.max(outMin, outMax));
}

// Logistic on standardized z. Useful for turning a z-score into a 0–100 dial.
export function logisticZTo100(z: number, k = 1): number {
  const p = 1 / (1 + Math.exp(-k * z));
  return p * 100;
}

// Mean / stddev for arrays. Returns 0 stddev for length<2 to avoid NaN.
export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0; for (const x of xs) s += x;
  return s / xs.length;
}
export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0; for (const x of xs) s += (x - m) * (x - m);
  return Math.sqrt(s / (xs.length - 1));
}

// Convert MLB rate string (".512") to number, tolerating undefined/empty.
export function parseRate(s: string | number | undefined): number {
  if (s === undefined || s === null || s === "") return 0;
  const n = typeof s === "number" ? s : Number(s);
  return Number.isFinite(n) ? n : 0;
}
