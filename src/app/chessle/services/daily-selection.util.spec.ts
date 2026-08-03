import * as fc from 'fast-check';
import { dailyPoolIndex, dayNumber, seededPermutation, utcDateKey } from './daily-selection.util';

const dateKeyArb = fc
  .tuple(fc.integer({ min: 2020, max: 2035 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

describe('daily-selection.util', () => {
  it('utcDateKey formats as YYYY-MM-DD', () => {
    expect(utcDateKey(new Date('2026-08-03T23:59:00Z'))).toBe('2026-08-03');
    expect(utcDateKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
  });

  it('seededPermutation is a permutation of [0, size)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), fc.string({ minLength: 1 }), (size, seed) => {
        const perm = seededPermutation(size, seed);
        expect(perm.length).toBe(size);
        expect(new Set(perm)).toEqual(new Set(Array.from({ length: size }, (_, i) => i)));
      }),
    );
  });

  // Feature: chessle, Property: dailyPoolIndex is deterministic — same inputs, same output
  it('dailyPoolIndex is deterministic for the same date key and pool size', () => {
    fc.assert(
      fc.property(dateKeyArb, fc.integer({ min: 1, max: 100 }), (dateKey, poolSize) => {
        const a = dailyPoolIndex(dateKey, poolSize);
        const b = dailyPoolIndex(dateKey, poolSize);
        expect(a).toBe(b);
      }),
    );
  });

  // Feature: chessle, Property: dailyPoolIndex always stays within pool bounds
  it('dailyPoolIndex always returns an index within [0, poolSize)', () => {
    fc.assert(
      fc.property(dateKeyArb, fc.integer({ min: 1, max: 100 }), (dateKey, poolSize) => {
        const index = dailyPoolIndex(dateKey, poolSize);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(poolSize);
      }),
    );
  });

  // Feature: chessle, Property: no repeats within one full cycle through the pool
  it('does not repeat an index within poolSize consecutive days', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), fc.integer({ min: 1, max: 20 }), (poolSize, startDay) => {
        const seen = new Set<number>();
        for (let offset = 0; offset < poolSize; offset++) {
          const dateKey = dayNumberToDateKey(startDay + offset);
          const index = dailyPoolIndex(dateKey, poolSize);
          expect(seen.has(index)).toBe(false);
          seen.add(index);
        }
      }),
    );
  });

  it('dayNumber increases by exactly one per calendar day', () => {
    expect(dayNumber('2024-01-02') - dayNumber('2024-01-01')).toBe(1);
    expect(dayNumber('2024-01-01')).toBe(0);
  });
});

/** Inverse-ish helper for the no-repeat test: builds a date key `days` after the epoch. */
function dayNumberToDateKey(days: number): string {
  const epoch = Date.parse('2024-01-01T00:00:00Z');
  const date = new Date(epoch + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}
