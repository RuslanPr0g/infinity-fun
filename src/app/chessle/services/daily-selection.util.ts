/**
 * Pure date -> pool-index selection for the daily puzzle. No Angular
 * dependency, so it can be property-tested in isolation and reused by
 * daily-puzzle.service.ts.
 */

/** UTC day key, e.g. '2026-08-03'. One key per calendar day, worldwide. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const EPOCH_MS = Date.parse('2024-01-01T00:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole UTC days elapsed since a fixed epoch. May be negative for dates before it. */
export function dayNumber(dateKey: string): number {
  const ms = Date.parse(`${dateKey}T00:00:00Z`);
  return Math.floor((ms - EPOCH_MS) / MS_PER_DAY);
}

/** DJB2 string hash — small, dependency-free, good-enough distribution for a pool of a few dozen items. */
export function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Deterministic PRNG (mulberry32), seeded from a hash so the same seed always yields the same stream. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates permutation of [0, size) seeded by a fixed string. */
export function seededPermutation(size: number, seed: string): number[] {
  const indices = Array.from({ length: size }, (_, i) => i);
  const random = mulberry32(hashString(seed));
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

const PERMUTATION_SEED = 'chessle-daily-v1';

/**
 * Deterministic pool index for a given UTC day key. Cycles through a seeded
 * permutation of the whole pool before repeating, so no opening repeats
 * until every entry has appeared once.
 */
export function dailyPoolIndex(dateKey: string, poolSize: number): number {
  if (poolSize <= 0) throw new Error('poolSize must be positive');
  const permutation = seededPermutation(poolSize, PERMUTATION_SEED);
  const cycleIndex = ((dayNumber(dateKey) % poolSize) + poolSize) % poolSize;
  return permutation[cycleIndex];
}
