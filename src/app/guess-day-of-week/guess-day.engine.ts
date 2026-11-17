/** Pure date logic for Guess Day of Week. Everything is in UTC days, so time zones can't shift a date. */

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type DayName = (typeof DAYS)[number];

export interface YMD {
  y: number;
  m: number; // 1–12
  d: number;
}

const DAY_MS = 86_400_000;

export const toDayNumber = (v: YMD): number => Date.UTC(v.y, v.m - 1, v.d) / DAY_MS;

export function fromDayNumber(n: number): YMD {
  const dt = new Date(n * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** 'YYYY-MM-DD' ↔ YMD. */
export function parseIso(s: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    return null;
  }
  const v = { y: +m[1], m: +m[2], d: +m[3] };
  const back = fromDayNumber(toDayNumber(v));
  return back.y === v.y && back.m === v.m && back.d === v.d ? v : null;
}
export const toIso = (v: YMD): string => `${String(v.y).padStart(4, '0')}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}`;

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(v: YMD): number {
  return (new Date(Date.UTC(v.y, v.m - 1, v.d)).getUTCDay() + 6) % 7;
}

/** A random date from `from` to `to`, both included. */
export function randomDate(from: YMD, to: YMD, rng: () => number = Math.random): YMD {
  const a = toDayNumber(from);
  const b = toDayNumber(to);
  return fromDayNumber(a + Math.floor(rng() * (b - a + 1)));
}

export function formatLong(v: YMD): string {
  return new Date(Date.UTC(v.y, v.m - 1, v.d)).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

export type RangeId = 'next' | 'year' | '1900s' | 'any' | 'custom';

/** The preset ranges, relative to `today`. */
export function presetRange(id: Exclude<RangeId, 'custom'>, today: YMD): { from: YMD; to: YMD } {
  switch (id) {
    case 'next':
      return { from: today, to: fromDayNumber(toDayNumber({ ...today, y: today.y + 1 }) - 1) };
    case 'year':
      return { from: { y: today.y, m: 1, d: 1 }, to: { y: today.y, m: 12, d: 31 } };
    case '1900s':
      return { from: { y: 1900, m: 1, d: 1 }, to: { y: 1999, m: 12, d: 31 } };
    case 'any':
      return { from: { y: 1800, m: 1, d: 1 }, to: { y: 2199, m: 12, d: 31 } };
  }
}
