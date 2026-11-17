import * as fc from 'fast-check';
import { COUNTRIES, OPTION_COUNT, buildOptions, isCorrectGuess, normalizeName } from './country-guesser.engine';

const rngFrom = (xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};
const rngArb = fc.array(fc.double({ min: 0, max: 0.9999999, noNaN: true }), { minLength: 1, maxLength: 60 }).map(rngFrom);

describe('Country Guesser engine', () => {
  // Feature: country-guesser, Property 1: options are 5 distinct countries containing the answer exactly once
  it('builds five distinct options with the answer in them', () => {
    fc.assert(
      fc.property(fc.constantFrom(...COUNTRIES), rngArb, (answer, rng) => {
        const opts = buildOptions(answer, rng);
        expect(opts.length).toBe(OPTION_COUNT);
        expect(new Set(opts.map((o) => o.code)).size).toBe(OPTION_COUNT);
        expect(opts.filter((o) => o.code === answer.code).length).toBe(1);
      }),
    );
  });

  // Feature: country-guesser, Property 2: a country's own name always counts, whatever the case or spacing
  it('accepts the name in any case and spacing', () => {
    fc.assert(
      fc.property(fc.constantFrom(...COUNTRIES), fc.boolean(), (c, upper) => {
        const typed = `  ${upper ? c.name.toUpperCase() : c.name.toLowerCase()} `;
        expect(isCorrectGuess(typed, c)).toBeTrue();
      }),
    );
  });

  it('ignores accents and a leading "the", and rejects empty or wrong answers', () => {
    const reunion = COUNTRIES.find((c) => c.code === 're')!;
    expect(isCorrectGuess('reunion', reunion)).toBeTrue();
    expect(normalizeName('The Bahamas')).toBe('bahamas');
    expect(isCorrectGuess('', reunion)).toBeFalse();
    expect(isCorrectGuess('France', reunion)).toBeFalse();
  });
});
