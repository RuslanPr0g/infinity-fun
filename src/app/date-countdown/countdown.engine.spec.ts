import * as fc from 'fast-check';
import { CountdownSetup, WEEKDAYS, fromQuery, nextWeekday, parseLocalDate, timeLeft, toQuery } from './countdown.engine';

const dateArb = fc.date({ min: new Date(1990, 0, 1), max: new Date(2090, 0, 1), noInvalidDate: true });

describe('Countdown engine', () => {
  // Feature: date-countdown, Property 1: the parts rebuild the exact gap and stay in range
  it('splits the gap into days/hours/minutes/seconds', () => {
    fc.assert(
      fc.property(dateArb, dateArb, (a, b) => {
        const t = timeLeft(a, b);
        const secs = Math.floor(Math.abs(a.getTime() - b.getTime()) / 1000);
        expect(t.days * 86400 + t.hours * 3600 + t.minutes * 60 + t.seconds).toBe(secs);
        expect(t.hours).toBeLessThan(24);
        expect(t.minutes).toBeLessThan(60);
        expect(t.seconds).toBeLessThan(60);
        expect(t.isPast).toBe(a.getTime() < b.getTime());
      }),
    );
  });

  // Feature: date-countdown, Property 2: next weekday is the right day, in the future, within a week
  it('finds the next weekday', () => {
    fc.assert(
      fc.property(dateArb, fc.constantFrom(...WEEKDAYS), fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }), (now, day, h, m) => {
        const t = nextWeekday(day, `${h}:${String(m).padStart(2, '0')}`, now)!;
        expect(WEEKDAYS[t.getDay()]).toBe(day);
        expect(t.getTime()).toBeGreaterThan(now.getTime());
        expect(t.getTime() - now.getTime()).toBeLessThanOrEqual(7 * 86_400_000 + 3_600_000); // + DST hour
      }),
    );
  });

  // Feature: date-countdown, Property 3: share links round-trip
  it('round-trips the URL query', () => {
    const setup: fc.Arbitrary<CountdownSetup> = fc.record({
      title: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim() === s && s !== 'Countdown'),
      kind: fc.constant<'date'>('date'),
      date: fc.constant('2030-05-06'),
      day: fc.constant(''),
      time: fc.constantFrom('', '09:30'),
    });
    fc.assert(fc.property(setup, (s) => expect(fromQuery(toQuery(s))).toEqual(s)));
  });

  it('reads dates as local midnight and rejects impossible ones', () => {
    const d = parseLocalDate('2030-02-03')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2030, 1, 3, 0]);
    expect(parseLocalDate('2030-02-30')).toBeNull();
    expect(fromQuery('day=Friday&time=18:00').kind).toBe('weekday');
  });
});
