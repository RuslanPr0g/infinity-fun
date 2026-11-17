import * as fc from 'fast-check';
import { YMD, fromDayNumber, parseIso, presetRange, randomDate, toDayNumber, toIso, weekdayIndex } from './guess-day.engine';

const ymdArb: fc.Arbitrary<YMD> = fc.integer({ min: toDayNumber({ y: 1600, m: 1, d: 1 }), max: toDayNumber({ y: 2400, m: 12, d: 31 }) }).map(fromDayNumber);

describe('Guess Day engine', () => {
  // Feature: guess-day, Property 1: weekday matches the JavaScript calendar (Mon = 0)
  it('finds the right weekday', () => {
    fc.assert(
      fc.property(ymdArb, (v) => {
        const js = new Date(v.y, v.m - 1, v.d).getDay(); // local calendar, Sun = 0
        expect(weekdayIndex(v)).toBe((js + 6) % 7);
      }),
    );
  });

  // Feature: guess-day, Property 2: random dates stay inside the range, ends included
  it('keeps random dates inside the range', () => {
    fc.assert(
      fc.property(ymdArb, ymdArb, fc.double({ min: 0, max: 0.9999999, noNaN: true }), (a, b, r) => {
        const [from, to] = toDayNumber(a) <= toDayNumber(b) ? [a, b] : [b, a];
        const n = toDayNumber(randomDate(from, to, () => r));
        expect(n).toBeGreaterThanOrEqual(toDayNumber(from));
        expect(n).toBeLessThanOrEqual(toDayNumber(to));
      }),
    );
  });

  // Feature: guess-day, Property 3: ISO text round-trips
  it('round-trips ISO dates and rejects impossible ones', () => {
    fc.assert(fc.property(ymdArb, (v) => expect(parseIso(toIso(v))).toEqual(v)));
    expect(parseIso('2023-02-29')).toBeNull();
    expect(parseIso('nope')).toBeNull();
  });

  it('builds a 12-month "next" range ending the day before next year’s date', () => {
    const r = presetRange('next', { y: 2026, m: 11, d: 17 });
    expect(r.to).toEqual({ y: 2027, m: 11, d: 16 });
  });
});
