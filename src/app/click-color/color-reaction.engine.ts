/** Pure helpers for Color Reaction. */

export interface Swatch {
  name: string;
  hex: string;
}

/** 16 colors that are easy to tell apart on a dark screen. */
export const SWATCHES: Swatch[] = [
  { name: 'red', hex: '#ef4444' },
  { name: 'orange', hex: '#f97316' },
  { name: 'yellow', hex: '#facc15' },
  { name: 'lime', hex: '#a3e635' },
  { name: 'green', hex: '#16a34a' },
  { name: 'teal', hex: '#0d9488' },
  { name: 'cyan', hex: '#22d3ee' },
  { name: 'blue', hex: '#2563eb' },
  { name: 'navy', hex: '#1e3a8a' },
  { name: 'purple', hex: '#9333ea' },
  { name: 'pink', hex: '#f472b6' },
  { name: 'magenta', hex: '#d946ef' },
  { name: 'brown', hex: '#92400e' },
  { name: 'white', hex: '#f8fafc' },
  { name: 'gray', hex: '#71717a' },
  { name: 'black', hex: '#0a0a0a' },
];

export const ROUND_SECONDS = 60;

export type Rng = () => number;

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A random swatch that is not `current` (so the target always visibly changes). */
export function nextTarget(current: Swatch | null, rng: Rng = Math.random): Swatch {
  const pool = SWATCHES.filter((s) => s !== current);
  return pool[Math.floor(rng() * pool.length)];
}
