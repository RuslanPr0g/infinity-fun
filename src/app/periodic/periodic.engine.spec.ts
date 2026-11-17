import * as fc from 'fast-check';
import { PeriodicElement } from './models/periodic.model';
import { buildOptions, isElementGuess, maskName, randomElement } from './periodic.engine';

const cats = ['noble gas', 'alkali metal', 'transition metal', 'metalloid'];
const elements: PeriodicElement[] = Array.from({ length: 40 }, (_, i) => ({
  name: `Elementium${String.fromCharCode(97 + (i % 26))}${i}`,
  symbol: `E${i}`,
  number: i + 1,
  category: cats[i % cats.length],
}));
const rngArb = fc.array(fc.double({ min: 0, max: 0.9999999, noNaN: true }), { minLength: 1, maxLength: 50 }).map((xs) => {
  let i = 0;
  return () => xs[i++ % xs.length];
});

describe('Periodic engine', () => {
  // Feature: periodic, Property 1: four distinct options including the answer once
  it('builds four distinct options with the answer', () => {
    fc.assert(
      fc.property(fc.constantFrom(...elements), rngArb, (answer, rng) => {
        const opts = buildOptions(answer, elements, rng);
        expect(opts.length).toBe(4);
        expect(new Set(opts.map((o) => o.number)).size).toBe(4);
        expect(opts.filter((o) => o.number === answer.number).length).toBe(1);
      }),
    );
  });

  // Feature: periodic, Property 2: an element's own name always counts
  it('accepts the name in any case', () => {
    fc.assert(fc.property(fc.constantFrom(...elements), fc.boolean(), (e, up) => expect(isElementGuess(` ${up ? e.name.toUpperCase() : e.name} `, e)).toBeTrue()));
  });

  // Feature: periodic, Property 3: the next element differs from the current one
  it('never repeats the element', () => {
    fc.assert(fc.property(fc.constantFrom(...elements), rngArb, (cur, rng) => expect(randomElement(elements, rng, cur).number).not.toBe(cur.number)));
  });

  it('takes common spellings and hides the name in hints', () => {
    const al = { name: 'Aluminium', symbol: 'Al', number: 13 } as PeriodicElement;
    expect(isElementGuess('aluminum', al)).toBeTrue();
    expect(isElementGuess('', al)).toBeFalse();
    expect(maskName('Aluminium is light. aluminium!', 'Aluminium')).toBe('*** is light. ***!');
  });
});
