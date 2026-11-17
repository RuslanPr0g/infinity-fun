import * as fc from 'fast-check';
import { Expr, OPS, Op, bigger, differentFrom, evaluate, format, nextPair, randomExpr } from './math-comparer.engine';

const exprArb: fc.Arbitrary<Expr> = fc
  .tuple(fc.integer({ min: 1, max: 9 }), fc.array(fc.tuple(fc.constantFrom<Op>(...OPS), fc.integer({ min: 1, max: 9 })), { minLength: 0, maxLength: 5 }))
  .map(([first, rest]) => [first, ...rest.flat()]);

/** Oracle: the same expression as JavaScript (test-only). */
const jsValue = (e: Expr): number => new Function(`return ${format(e).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')}`)() as number;

const seeded = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
};

describe('Math Comparer engine', () => {
  // Feature: math-comparer, Property 1: evaluate() matches JavaScript precedence
  it('evaluates like JavaScript', () => {
    fc.assert(fc.property(exprArb, (e) => expect(evaluate(e)).toBeCloseTo(jsValue(e), 9)));
  });

  // Feature: math-comparer, Property 2: random expressions have 3–5 single-digit numbers
  it('builds well-formed random expressions', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const e = randomExpr(seeded(seed));
        const nums = e.filter((x) => typeof x === 'number') as number[];
        expect(nums.length).toBeGreaterThanOrEqual(3);
        expect(nums.length).toBeLessThanOrEqual(5);
        nums.forEach((n) => expect(n >= 1 && n <= 9).toBeTrue());
        expect(e.length).toBe(nums.length * 2 - 1);
      }),
    );
  });

  // Feature: math-comparer, Property 3: the two sides are never equal, and the winner side stays
  it('never shows two equal sides and keeps the winner', () => {
    fc.assert(
      fc.property(exprArb, fc.integer(), fc.integer({ min: 0, max: 4 }), (e, seed, run) => {
        const rng = seeded(seed);
        const other = differentFrom(e, rng);
        expect(Math.abs(evaluate(other) - evaluate(e))).toBeGreaterThan(1e-9);
        const p = { left: e, right: other };
        const w = bigger(p);
        const n = nextPair(p, w, run, rng);
        expect(n[w]).toBe(p[w]);
        expect(Math.abs(evaluate(n.left) - evaluate(n.right))).toBeGreaterThan(1e-9);
      }),
    );
  });

  it('applies × and ÷ before + and −', () => {
    expect(evaluate([2, '+', 3, '×', 4])).toBe(14);
    expect(evaluate([8, '−', 6, '÷', 3, '+', 1])).toBe(7);
    expect(evaluate([5])).toBe(5);
  });
});
