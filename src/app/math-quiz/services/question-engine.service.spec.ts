import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import {
  Difficulty,
  GameMode,
  QUESTIONS_PER_ROUND,
  Question,
} from '../models/math-quiz.models';
import { QuestionEngine } from './question-engine.service';

const MODES: GameMode[] = [
  'multiplication',
  'division',
  'mixed',
  'power-roots',
  'sequence',
  'estimation',
];
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

function applyOp(x: number, op: string, y: number): number {
  switch (op) {
    case '+':
      return x + y;
    case '−':
      return x - y;
    case '×':
      return x * y;
    case '÷':
      if (y === 0 || x % y !== 0) return NaN;
      return x / y;
    default:
      return NaN;
  }
}

function evalMixedPemdas(text: string): number {
  const expr = text.replace(' = ?', '').replace(' (Round to nearest integer)', '');
  const hard = expr.match(/^(\d+) ([+−×÷]) (\d+) ([+−×÷]) (\d+)$/);
  if (hard) {
    const a = Number(hard[1]);
    const op1 = hard[2];
    const b = Number(hard[3]);
    const op2 = hard[4];
    const c = Number(hard[5]);
    const values = [a, b, c];
    const ops = [op1, op2];
    const reducedValues: number[] = [values[0]];
    const reducedOps: string[] = [];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '×' || ops[i] === '÷') {
        const last = reducedValues.pop()!;
        reducedValues.push(applyOp(last, ops[i], values[i + 1]));
      } else {
        reducedOps.push(ops[i]);
        reducedValues.push(values[i + 1]);
      }
    }
    let result = reducedValues[0];
    for (let i = 0; i < reducedOps.length; i++) {
      result = applyOp(result, reducedOps[i], reducedValues[i + 1]);
    }
    return result;
  }
  const simple = expr.match(/^(\d+) ([+−×÷]) (\d+)$/);
  if (simple) {
    return applyOp(Number(simple[1]), simple[2], Number(simple[3]));
  }
  return NaN;
}

function checkMultiplicationBounds(q: Question): boolean {
  if (q.difficulty === 'hard') {
    const m = q.text.match(/^(\d+) × (\d+) × (\d+) = \?$/);
    if (!m) return false;
    return m.slice(1).every((n) => {
      const v = Number(n);
      return v >= 1 && v <= 99;
    });
  }
  const m = q.text.match(/^(\d+) × (\d+) = \?$/);
  if (!m) return false;
  const n = Number(m[1]);
  const b = Number(m[2]);
  if (q.difficulty === 'easy') {
    return n >= 1 && n <= 9 && b >= 1 && b <= 9;
  }
  return (
    n >= 1 && n <= 99 && b >= 1 && b <= 99 && (n >= 10 || b >= 10)
  );
}

function checkDivision(q: Question): boolean {
  const hard = q.text.match(
    /^(\d+) ÷ (\d+) = \? \(Round to nearest integer\)$/,
  );
  if (hard) {
    const n = Number(hard[1]);
    const m = Number(hard[2]);
    return m !== 0 && q.correctAnswer === String(Math.round(n / m));
  }
  const m = q.text.match(/^(\d+) ÷ (\d+) = \?$/);
  if (!m) return false;
  const n = Number(m[1]);
  const divisor = Number(m[2]);
  if (divisor === 0) return false;
  if (q.difficulty === 'easy') {
    const qVal = Number(q.correctAnswer);
    return Number.isInteger(qVal) && qVal > 0 && n === divisor * qVal;
  }
  if (q.difficulty === 'medium') {
    const ans = parseFloat(q.correctAnswer);
    const decimalPart = Math.abs(Math.round(ans * 10) % 10);
    return decimalPart !== 0 && Math.abs(n / divisor - ans) <= 0.05;
  }
  return false;
}

function expectedPowerRoots(text: string): number | null {
  const square = text.match(/^(\d+)² = \?$/);
  if (square) return Number(square[1]) ** 2;
  const cube = text.match(/^(\d+)³ = \?$/);
  if (cube) return Number(cube[1]) ** 3;
  const sqrt = text.match(/^√(\d+) = \?$/);
  if (sqrt) return Math.sqrt(Number(sqrt[1]));
  const cbrt = text.match(/^∛(\d+) = \?$/);
  if (cbrt) return Math.cbrt(Number(cbrt[1]));
  const pow4 = text.match(/^(\d+)⁴ = \?$/);
  if (pow4) return Number(pow4[1]) ** 4;
  const pow5 = text.match(/^(\d+)⁵ = \?$/);
  if (pow5) return Number(pow5[1]) ** 5;
  return null;
}

function parseEstimationTrueValue(text: string): number | null {
  const easy = text.match(/^Estimate: (\d+) × (\d+) ≈ \?$/);
  if (easy) return Number(easy[1]) * Number(easy[2]);
  const sumProd = text.match(/^Estimate: \((\d+) × (\d+)\) \+ (\d+) ≈ \?$/);
  if (sumProd) {
    return Number(sumProd[1]) * Number(sumProd[2]) + Number(sumProd[3]);
  }
  const addMul = text.match(/^Estimate: \((\d+) \+ (\d+)\) × (\d+) ≈ \?$/);
  if (addMul) {
    return (Number(addMul[1]) + Number(addMul[2])) * Number(addMul[3]);
  }
  const sub = text.match(
    /^Estimate: \((\d+) × (\d+)\) − \((\d+) × (\d+)\) ≈ \?$/,
  );
  if (sub) {
    return (
      Number(sub[1]) * Number(sub[2]) - Number(sub[3]) * Number(sub[4])
    );
  }
  return null;
}

function isArithmetic(seq: number[]): boolean {
  const d = seq[1] - seq[0];
  return seq.every((v, i) => i === 0 || v - seq[i - 1] === d);
}

function isGeometric(seq: number[]): boolean {
  if (seq[0] === 0) return false;
  const r = seq[1] / seq[0];
  return seq.every((v, i) =>
    i === 0 ? true : Math.abs(v - seq[i - 1] * r) <= 0.01,
  );
}

function isFibonacci(seq: number[]): boolean {
  return seq.every(
    (v, i) => i < 2 || v === seq[i - 1] + seq[i - 2],
  );
}

function isAlternatingStep(seq: number[]): boolean {
  if (seq.length < 3) return false;
  const d1 = seq[1] - seq[0];
  const d2 = seq[2] - seq[1];
  return seq.every((v, i) => {
    if (i === 0) return true;
    const expected = i % 2 === 1 ? d1 : d2;
    return v - seq[i - 1] === expected;
  });
}

function checkSequence(q: Question): boolean {
  const body = q.text.split(' — What is ?')[0];
  const parts = body.split(', ');
  const blankIdx = parts.findIndex((p) => p === '?');
  if (blankIdx < 0) return false;
  const seq = parts.map((p, i) =>
    i === blankIdx ? Number(q.correctAnswer) : Number(p),
  );
  return (
    isArithmetic(seq) ||
    isGeometric(seq) ||
    isFibonacci(seq) ||
    isAlternatingStep(seq)
  );
}

function assertMcOptions(q: Question): void {
  expect(q.options?.length).toBe(4);
  expect(new Set(q.options).size).toBe(4);
  expect(q.options?.filter((o) => o === q.correctAnswer).length).toBe(1);
}

describe('QuestionEngine', () => {
  let engine: QuestionEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(QuestionEngine);
  });

  // Feature: math-quiz-game, Property 1
  describe('Property 1: session generates exactly QUESTIONS_PER_ROUND questions', () => {
    for (const mode of MODES) {
      for (const difficulty of DIFFS) {
        it(`${mode}/${difficulty}`, () => {
          fc.assert(
            fc.property(fc.constant(null), () => {
              const questions = engine.generateSession(mode, difficulty);
              expect(questions.length).toBe(QUESTIONS_PER_ROUND);
            }),
          );
        });
      }
    }
  });

  // Feature: math-quiz-game, Property 9
  describe('Property 9: session question texts are unique', () => {
    for (const mode of MODES) {
      for (const difficulty of DIFFS) {
        it(`${mode}/${difficulty}`, () => {
          fc.assert(
            fc.property(fc.constant(null), () => {
              const questions = engine.generateSession(mode, difficulty);
              const texts = questions.map((q) => q.text);
              expect(new Set(texts).size).toBe(QUESTIONS_PER_ROUND);
            }),
          );
        });
      }
    }
  });

  // Feature: math-quiz-game, Property 2
  describe('Property 2: multiplication operands are within specified bounds', () => {
    for (const difficulty of DIFFS) {
      it(difficulty, () => {
        fc.assert(
          fc.property(fc.constant(null), () => {
            const questions = engine.generateSession('multiplication', difficulty);
            questions.forEach((q) =>
              expect(checkMultiplicationBounds(q)).toBeTrue(),
            );
          }),
        );
      });
    }
  });

  // Feature: math-quiz-game, Property 3
  describe('Property 3: division never has zero divisor and correctAnswer matches', () => {
    for (const difficulty of DIFFS) {
      it(difficulty, () => {
        fc.assert(
          fc.property(fc.constant(null), () => {
            const questions = engine.generateSession('division', difficulty);
            questions.forEach((q) => expect(checkDivision(q)).toBeTrue());
          }),
        );
      });
    }
  });

  // Feature: math-quiz-game, Property 4
  describe('Property 4: mixed operations correctAnswer equals PEMDAS evaluation', () => {
    for (const difficulty of DIFFS) {
      it(difficulty, () => {
        fc.assert(
          fc.property(fc.constant(null), () => {
            const questions = engine.generateSession('mixed', difficulty);
            questions.forEach((q) => {
              const expected = evalMixedPemdas(q.text);
              expect(Number(q.correctAnswer)).toBe(expected);
            });
          }),
        );
      });
    }
  });

  // Feature: math-quiz-game, Property 5
  describe('Property 5: power-roots correctAnswer matches displayed operation', () => {
    for (const difficulty of DIFFS) {
      it(difficulty, () => {
        fc.assert(
          fc.property(fc.constant(null), () => {
            const questions = engine.generateSession('power-roots', difficulty);
            questions.forEach((q) => {
              const expected = expectedPowerRoots(q.text);
              expect(expected).not.toBeNull();
              expect(Number(q.correctAnswer)).toBe(expected!);
            });
          }),
        );
      });
    }
  });

  // Feature: math-quiz-game, Property 7
  describe('Property 7: sequence correct answer fills blank to satisfy sequence rule', () => {
    for (const difficulty of DIFFS) {
      it(difficulty, () => {
        fc.assert(
          fc.property(fc.constant(null), () => {
            const questions = engine.generateSession('sequence', difficulty);
            questions.forEach((q) => expect(checkSequence(q)).toBeTrue());
          }),
        );
      });
    }
  });

  // Feature: math-quiz-game, Property 6
  describe('Property 6: multiple-choice options are valid', () => {
    for (const mode of ['sequence', 'estimation'] as GameMode[]) {
      for (const difficulty of DIFFS) {
        it(`${mode}/${difficulty}`, () => {
          fc.assert(
            fc.property(fc.constant(null), () => {
              const questions = engine.generateSession(mode, difficulty);
              questions.forEach((q) => assertMcOptions(q));
            }),
          );
        });
      }
    }
  });

  // Feature: math-quiz-game, Property 8
  describe('Property 8: estimation options satisfy proximity constraints', () => {
    for (const difficulty of DIFFS) {
      it(difficulty, () => {
        fc.assert(
          fc.property(fc.constant(null), () => {
            const questions = engine.generateSession('estimation', difficulty);
            questions.forEach((q) => {
              const T = parseEstimationTrueValue(q.text);
              expect(T).not.toBeNull();
              const correct = Number(q.correctAnswer);
              expect(Math.abs(correct - T!) / Math.abs(T!)).toBeLessThanOrEqual(
                0.1,
              );
              q.options
                ?.filter((o) => o !== q.correctAnswer)
                .forEach((d) => {
                  expect(
                    Math.abs(Number(d) - T!) / Math.abs(T!),
                  ).toBeGreaterThanOrEqual(0.15);
                });
            });
          }),
        );
      });
    }
  });
});
