import * as fc from 'fast-check';
import { breakdown, columnsFor, monthList } from './months-left.engine';

describe('Months Left engine', () => {
  // Feature: months-left, Property 1: the parts always add up to the total and are never negative
  it('splits the total exactly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 120 }), fc.integer({ min: 0, max: 120 }), (age, until) => {
        const b = breakdown(age, until);
        expect(b.total).toBe(Math.max(0, (until - age) * 12));
        const sum = Object.values(b.months).reduce((s, n) => s + n, 0);
        expect(sum).toBe(b.total);
        Object.values(b.months).forEach((n) => expect(n).toBeGreaterThanOrEqual(0));
        expect(monthList(b).length).toBe(b.total);
      }),
    );
  });

  // Feature: months-left, Property 2: rows are whole years and fit the width
  it('uses whole years per row', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3000 }), (w) => {
        const c = columnsFor(w);
        expect(c % 12).toBe(0);
        expect(c).toBeGreaterThanOrEqual(12);
        if (c > 12) {
          expect(w / c).toBeGreaterThanOrEqual(11);
        }
      }),
    );
  });
});
