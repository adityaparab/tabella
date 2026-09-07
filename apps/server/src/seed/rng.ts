/**
 * Deterministic PRNG + sampling helpers, so a reseed reproduces the same dataset
 * (numbers in the README stay true, and tests get stable fixtures).
 */
export type Rng = () => number;

/** mulberry32 — small, fast, good enough distribution for demo data. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const index = Math.floor(rng() * items.length);
  // Length is always > 0 at call sites; guard for Math.random edge case rng() === 1.
  return items[index] ?? items[items.length - 1]!;
}

/** Weighted pick; weights need not be normalized. */
export function pickWeighted<T>(rng: Rng, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

/** Box–Muller normal. */
export function normal(rng: Rng): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Log-normal value around `median` with multiplicative noise `sigma`. */
export function logNormal(rng: Rng, median: number, sigma = 0.6): number {
  return Math.round(median * Math.exp(normal(rng) * sigma));
}

/** Uniform integer in [min, max]. */
export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Epoch ms between `daysBack` days ago and now, biased toward recent (rho < 1). */
export function recentTimestamp(rng: Rng, daysBack: number, rho = 0.5): number {
  const age = Math.pow(rng(), rho) * daysBack;
  return Date.now() - Math.round(age * 24 * 60 * 60 * 1000);
}
