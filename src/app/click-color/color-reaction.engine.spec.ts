import * as fc from 'fast-check';
import { SWATCHES, nextTarget, shuffle } from './color-reaction.engine';

const rngFrom = (xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};
const rngArb = fc.array(fc.double({ min: 0, max: 0.9999999, noNaN: true }), { minLength: 1, maxLength: 40 }).map(rngFrom);

describe('Color Reaction engine', () => {
  // Feature: color-reaction, Property 1: shuffle is a permutation
  it('shuffles without losing or adding colors', () => {
    fc.assert(
      fc.property(rngArb, (rng) => {
        const s = shuffle(SWATCHES, rng);
        expect(s.length).toBe(SWATCHES.length);
        expect(new Set(s)).toEqual(new Set(SWATCHES));
      }),
    );
  });

  // Feature: color-reaction, Property 2: the next target is a real swatch and never repeats
  it('never repeats the target', () => {
    fc.assert(
      fc.property(rngArb, fc.constantFrom(null, ...SWATCHES), (rng, current) => {
        const next = nextTarget(current, rng);
        expect(SWATCHES).toContain(next);
        expect(next).not.toBe(current as never);
      }),
    );
  });

  it('has 16 distinct colors', () => {
    expect(new Set(SWATCHES.map((s) => s.hex)).size).toBe(16);
  });
});
