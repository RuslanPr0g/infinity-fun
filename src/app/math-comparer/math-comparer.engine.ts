/** Pure logic for Math Comparer: random expressions and a small, safe evaluator (no eval). */

export type Op = '+' | '−' | '×' | '÷';
export const OPS: Op[] = ['+', '−', '×', '÷'];

/** An expression as numbers and operators, e.g. [3, '×', 4, '+', 2]. */
export type Expr = (number | Op)[];

export type Rng = () => number;

const digit = (rng: Rng): number => Math.floor(rng() * 9) + 1;

/** 3 to 5 single-digit numbers joined by random operators. */
export function randomExpr(rng: Rng = Math.random): Expr {
  const terms = Math.floor(rng() * 3) + 3;
  const out: Expr = [digit(rng)];
  for (let i = 1; i < terms; i++) {
    out.push(OPS[Math.floor(rng() * OPS.length)], digit(rng));
  }
  return out;
}

/** Value with normal precedence: × and ÷ before + and −, left to right. */
export function evaluate(expr: Expr): number {
  const sums: number[] = [];
  const signs: number[] = [];
  let term = expr[0] as number;
  for (let i = 1; i < expr.length; i += 2) {
    const op = expr[i] as Op;
    const n = expr[i + 1] as number;
    if (op === '×') {
      term *= n;
    } else if (op === '÷') {
      term /= n;
    } else {
      sums.push(term);
      signs.push(op === '+' ? 1 : -1);
      term = n;
    }
  }
  let total = sums.length ? sums[0] : term;
  for (let i = 0; i < signs.length; i++) {
    total += signs[i] * (i + 1 < sums.length ? sums[i + 1] : term);
  }
  return total;
}

export function format(expr: Expr): string {
  return expr.join(' ');
}

/** Values closer than this count as equal (÷ gives fractions). */
const EPS = 1e-9;

/** A new expression whose value is clearly different from `other`'s. */
export function differentFrom(other: Expr, rng: Rng = Math.random): Expr {
  const v = evaluate(other);
  let e = randomExpr(rng);
  for (let i = 0; i < 200 && Math.abs(evaluate(e) - v) < EPS; i++) {
    e = randomExpr(rng);
  }
  if (Math.abs(evaluate(e) - v) < EPS) {
    // Practically never happens; nudging the first number always changes the value.
    e = [...e];
    e[0] = ((e[0] as number) % 9) + 1;
  }
  return e;
}

export interface Pair {
  left: Expr;
  right: Expr;
}

export type Side = 'left' | 'right';

export function bigger(p: Pair): Side {
  return evaluate(p.left) > evaluate(p.right) ? 'left' : 'right';
}

export function freshPair(rng: Rng = Math.random): Pair {
  const left = randomExpr(rng);
  return { left, right: differentFrom(left, rng) };
}

/**
 * After a right answer the winner stays and the other side gets a new challenger,
 * except when the same side has won too often in a row (so you can't just keep tapping one side).
 */
export function nextPair(p: Pair, winner: Side, sameSideRun: number, rng: Rng = Math.random): Pair {
  if (sameSideRun >= 5) {
    return freshPair(rng);
  }
  return winner === 'left'
    ? { left: p.left, right: differentFrom(p.left, rng) }
    : { left: differentFrom(p.right, rng), right: p.right };
}
