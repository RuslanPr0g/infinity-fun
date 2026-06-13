import { Injectable } from '@angular/core';
import {
  Difficulty,
  GameMode,
  QUESTIONS_PER_ROUND,
  Question,
} from '../models/math-quiz.models';

const MAX_GENERATION_ATTEMPTS = 1000;

@Injectable({ providedIn: 'root' })
export class QuestionEngine {
  generateSession(mode: GameMode, difficulty: Difficulty): Question[] {
    const texts = new Set<string>();
    const questions: Question[] = [];
    let totalAttempts = 0;

    while (questions.length < QUESTIONS_PER_ROUND) {
      if (totalAttempts++ > MAX_GENERATION_ATTEMPTS * QUESTIONS_PER_ROUND) {
        throw new Error(
          `Failed to generate ${QUESTIONS_PER_ROUND} unique questions for ${mode}/${difficulty}`,
        );
      }

      const question = this.generateQuestion(mode, difficulty, questions.length);
      if (!texts.has(question.text)) {
        texts.add(question.text);
        questions.push(question);
      }
    }

    return questions;
  }

  private generateQuestion(
    mode: GameMode,
    difficulty: Difficulty,
    id: number,
  ): Question {
    switch (mode) {
      case 'multiplication':
        return this.generateMultiplication(difficulty, id);
      case 'division':
        return this.generateDivision(difficulty, id);
      case 'mixed':
        return this.generateMixed(difficulty, id);
      case 'power-roots':
        return this.generatePowerRoots(difficulty, id);
      case 'sequence':
        return this.generateSequence(difficulty, id);
      case 'estimation':
        return this.generateEstimation(difficulty, id);
    }
  }

  private generateMultiplication(diff: Difficulty, id: number): Question {
    if (diff === 'easy') {
      const n = this.randInt(1, 9);
      const m = this.randInt(1, 9);
      return this.buildQuestion(id, 'multiplication', diff, {
        text: `${n} × ${m} = ?`,
        correctAnswer: String(n * m),
        answerType: 'typed',
      });
    }

    if (diff === 'medium') {
      let n: number;
      let m: number;
      do {
        n = this.randInt(1, 99);
        m = this.randInt(1, 99);
      } while (n < 10 && m < 10);

      return this.buildQuestion(id, 'multiplication', diff, {
        text: `${n} × ${m} = ?`,
        correctAnswer: String(n * m),
        answerType: 'typed',
      });
    }

    const n = this.randInt(1, 99);
    const m = this.randInt(1, 99);
    const k = this.randInt(1, 99);
    return this.buildQuestion(id, 'multiplication', diff, {
      text: `${n} × ${m} × ${k} = ?`,
      correctAnswer: String(n * m * k),
      answerType: 'typed',
    });
  }

  private generateDivision(diff: Difficulty, id: number): Question {
    if (diff === 'easy') {
      const m = this.randInt(1, 9);
      const q = this.randInt(1, 9);
      const n = m * q;
      return this.buildQuestion(id, 'division', diff, {
        text: `${n} ÷ ${m} = ?`,
        correctAnswer: String(q),
        answerType: 'typed',
      });
    }

    if (diff === 'medium') {
      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const m = this.randInt(1, 999);
        const n = this.randInt(1, 999);
        if (m === 0) continue;

        const result = n / m;
        const rounded = Math.round(result * 10) / 10;
        const hasOneDecimal =
          rounded !== Math.floor(rounded) &&
          Math.abs(result - rounded) < 0.0001;

        if (hasOneDecimal) {
          return this.buildQuestion(id, 'division', diff, {
            text: `${n} ÷ ${m} = ?`,
            correctAnswer: String(rounded),
            answerType: 'typed',
            tolerance: 0.05,
          });
        }
      }
      throw new Error('Failed to generate division medium question');
    }

    const n = this.randInt(1, 9999);
    const m = this.randInt(1, 9999);
    return this.buildQuestion(id, 'division', diff, {
      text: `${n} ÷ ${m} = ? (Round to nearest integer)`,
      correctAnswer: String(Math.round(n / m)),
      answerType: 'typed',
    });
  }

  private generateMixed(diff: Difficulty, id: number): Question {
    if (diff === 'easy') {
      const op = this.pick(['+', '−'] as const);
      const a = this.randInt(1, 20);
      const b = this.randInt(1, 20);
      const result = op === '+' ? a + b : a - b;
      return this.buildQuestion(id, 'mixed', diff, {
        text: `${a} ${op} ${b} = ?`,
        correctAnswer: String(result),
        answerType: 'typed',
      });
    }

    if (diff === 'medium') {
      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const op = this.pick(['+', '−', '×', '÷'] as const);
        const a = this.randInt(1, 100);
        const b = this.randInt(1, 100);

        if (op === '÷') {
          if (b === 0) continue;
          const q = this.randInt(1, Math.floor(100 / b));
          const dividend = b * q;
          if (dividend > 100) continue;
          return this.buildQuestion(id, 'mixed', diff, {
            text: `${dividend} ÷ ${b} = ?`,
            correctAnswer: String(q),
            answerType: 'typed',
          });
        }

        const result =
          op === '+'
            ? a + b
            : op === '−'
              ? a - b
              : a * b;

        return this.buildQuestion(id, 'mixed', diff, {
          text: `${a} ${op} ${b} = ?`,
          correctAnswer: String(result),
          answerType: 'typed',
        });
      }
      throw new Error('Failed to generate mixed medium question');
    }

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const a = this.randInt(1, 1000);
      const b = this.randInt(1, 1000);
      const c = this.randInt(1, 1000);
      const op1 = this.pick(['+', '−', '×', '÷'] as const);
      const op2 = this.pick(['+', '−', '×', '÷'] as const);

      try {
        const result = this.evaluateMixedHard(a, op1, b, op2, c);
        if (!Number.isInteger(result)) continue;

        return this.buildQuestion(id, 'mixed', diff, {
          text: `${a} ${op1} ${b} ${op2} ${c} = ?`,
          correctAnswer: String(result),
          answerType: 'typed',
        });
      } catch {
        continue;
      }
    }
    throw new Error('Failed to generate mixed hard question');
  }

  private evaluateMixedHard(
    a: number,
    op1: string,
    b: number,
    op2: string,
    c: number,
  ): number {
    const values = [a, b, c];
    const ops = [op1, op2];

    const reducedValues: number[] = [values[0]];
    const reducedOps: string[] = [];

    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '×' || ops[i] === '÷') {
        const last = reducedValues.pop()!;
        reducedValues.push(this.applyOp(last, ops[i], values[i + 1]));
      } else {
        reducedOps.push(ops[i]);
        reducedValues.push(values[i + 1]);
      }
    }

    let result = reducedValues[0];
    for (let i = 0; i < reducedOps.length; i++) {
      result = this.applyOp(result, reducedOps[i], reducedValues[i + 1]);
    }
    return result;
  }

  private applyOp(x: number, op: string, y: number): number {
    switch (op) {
      case '+':
        return x + y;
      case '−':
        return x - y;
      case '×':
        return x * y;
      case '÷':
        if (y === 0 || x % y !== 0) {
          throw new Error('Non-integer division');
        }
        return x / y;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  private generatePowerRoots(diff: Difficulty, id: number): Question {
    if (diff === 'easy') {
      const n = this.randInt(1, 12);
      return this.buildQuestion(id, 'power-roots', diff, {
        text: `${n}² = ?`,
        correctAnswer: String(n * n),
        answerType: 'typed',
      });
    }

    if (diff === 'medium') {
      if (Math.random() < 0.5) {
        const n = this.randInt(1, 10);
        return this.buildQuestion(id, 'power-roots', diff, {
          text: `${n}³ = ?`,
          correctAnswer: String(n * n * n),
          answerType: 'typed',
        });
      }

      const n = this.randInt(1, 12);
      const p = n * n;
      return this.buildQuestion(id, 'power-roots', diff, {
        text: `√${p} = ?`,
        correctAnswer: String(n),
        answerType: 'typed',
      });
    }

    if (Math.random() < 0.5) {
      const n = this.randInt(2, 10);
      const p = n * n * n;
      return this.buildQuestion(id, 'power-roots', diff, {
        text: `∛${p} = ?`,
        correctAnswer: String(n),
        answerType: 'typed',
      });
    }

    const n = this.randInt(2, 9);
    const k = this.pick([4, 5] as const);
    const superscript = k === 4 ? '⁴' : '⁵';
    const result = k === 4 ? n ** 4 : n ** 5;
    return this.buildQuestion(id, 'power-roots', diff, {
      text: `${n}${superscript} = ?`,
      correctAnswer: String(result),
      answerType: 'typed',
    });
  }

  private generateSequence(diff: Difficulty, id: number): Question {
    if (diff === 'easy') {
      const a = this.randInt(1, 20);
      const d = this.randInt(1, 10);
      const seq = [a, a + d, a + 2 * d, a + 3 * d, a + 4 * d];
      return this.buildSequenceQuestion(id, diff, seq, (s) => {
        const step = s[1] - s[0];
        for (let i = 1; i < s.length; i++) {
          if (s[i] - s[i - 1] !== step) return false;
        }
        return true;
      });
    }

    if (diff === 'medium') {
      const ratioChoice = this.pick(['×2', '×3', '×0.5', '÷2'] as const);
      const a = this.randInt(1, 20);
      let ratio: number;
      switch (ratioChoice) {
        case '×2':
          ratio = 2;
          break;
        case '×3':
          ratio = 3;
          break;
        case '×0.5':
          ratio = 0.5;
          break;
        case '÷2':
          ratio = 0.5;
          break;
      }

      const seq: number[] = [a];
      for (let i = 1; i < 5; i++) {
        const next = seq[i - 1] * ratio;
        seq.push(Number.isInteger(next) ? next : Math.round(next * 100) / 100);
      }

      return this.buildSequenceQuestion(id, diff, seq, (s) => {
        if (s.length < 2) return false;
        const r = s[1] / s[0];
        for (let i = 1; i < s.length; i++) {
          const expected = s[i - 1] * r;
          if (Math.abs(s[i] - expected) > 0.01) return false;
        }
        return true;
      });
    }

    if (Math.random() < 0.5) {
      const a = this.randInt(1, 10);
      const b = this.randInt(1, 10);
      const seq = [a, b];
      for (let i = 2; i < 6; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
      }
      return this.buildSequenceQuestion(
        id,
        diff,
        seq,
        (s) => {
          for (let i = 2; i < s.length; i++) {
            if (s[i] !== s[i - 1] + s[i - 2]) return false;
          }
          return true;
        },
        true,
      );
    }

    const a = this.randInt(1, 20);
    const d1 = this.randInt(1, 10);
    const d2 = this.randInt(1, 10);
    const seq = [a];
    for (let i = 1; i < 6; i++) {
      const step = i % 2 === 1 ? d1 : d2;
      seq.push(seq[i - 1] + step);
    }

    return this.buildSequenceQuestion(
      id,
      diff,
      seq,
      (s) => {
        const step1 = s[1] - s[0];
        const step2 = s[2] - s[1];
        for (let i = 1; i < s.length; i++) {
          const expectedStep = i % 2 === 1 ? step1 : step2;
          if (s[i] - s[i - 1] !== expectedStep) return false;
        }
        return true;
      },
      true,
    );
  }

  private buildSequenceQuestion(
    id: number,
    diff: Difficulty,
    seq: number[],
    _validate: (s: number[]) => boolean,
    requirePlusMinusOneDistractor = false,
  ): Question {
    const blankIndex = this.randInt(0, seq.length - 1);
    const correct = seq[blankIndex];
    const d = diff === 'easy' ? this.randInt(1, 10) : 1;

    const distractorOffsets = [-3 * d, -2 * d, -d, d, 2 * d, 3 * d];
    const distractors: number[] = [];

    for (const offset of this.shuffle([...distractorOffsets])) {
      const candidate = correct + offset;
      if (
        candidate !== correct &&
        candidate > 0 &&
        !distractors.includes(candidate) &&
        !seq.includes(candidate)
      ) {
        distractors.push(candidate);
      }
      if (distractors.length === 3) break;
    }

    while (distractors.length < 3) {
      const candidate = correct + this.randInt(-20, 20);
      if (
        candidate !== correct &&
        candidate > 0 &&
        !distractors.includes(candidate)
      ) {
        distractors.push(candidate);
      }
    }

    if (requirePlusMinusOneDistractor) {
      const hasClose = distractors.some(
        (d) => Math.abs(d - correct) === 1,
      );
      if (!hasClose) {
        const close = correct + (Math.random() < 0.5 ? 1 : -1);
        if (close > 0) {
          distractors[0] = close;
        }
      }
    }

    const options = this.shuffle([
      String(correct),
      ...distractors.map(String),
    ]);

    const displayParts = seq.map((val, i) =>
      i === blankIndex ? '?' : String(val),
    );

    return this.buildQuestion(id, 'sequence', diff, {
      text: `${displayParts.join(', ')} — What is ?`,
      correctAnswer: String(correct),
      answerType: 'multiple-choice',
      options,
    });
  }

  private generateEstimation(diff: Difficulty, id: number): Question {
    let text: string;
    let trueValue: number;

    if (diff === 'easy') {
      const a = this.randInt(1, 50);
      const b = this.randInt(1, 50);
      trueValue = a * b;
      text = `Estimate: ${a} × ${b} ≈ ?`;
    } else if (diff === 'medium') {
      if (Math.random() < 0.5) {
        const a = this.randInt(1, 200);
        const b = this.randInt(1, 200);
        const c = this.randInt(1, 200);
        trueValue = a * b + c;
        text = `Estimate: (${a} × ${b}) + ${c} ≈ ?`;
      } else {
        const a = this.randInt(1, 200);
        const b = this.randInt(1, 200);
        const c = this.randInt(1, 200);
        trueValue = (a + b) * c;
        text = `Estimate: (${a} + ${b}) × ${c} ≈ ?`;
      }
    } else {
      const a = this.randInt(1, 500);
      const b = this.randInt(1, 500);
      const c = this.randInt(1, 500);
      const d = this.randInt(1, 500);
      trueValue = a * b - c * d;
      text = `Estimate: (${a} × ${b}) − (${c} × ${d}) ≈ ?`;
    }

    const correct = this.findCorrectEstimationOption(trueValue);
    const distractors: number[] = [];

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      if (distractors.length >= 3) break;

      const spread = Math.max(Math.abs(trueValue) * 0.3, 10);
      const candidate = Math.max(
        1,
        Math.round(trueValue + this.randInt(-spread, spread)),
      );

      const relDiff = Math.abs(candidate - trueValue) / Math.abs(trueValue);
      if (
        relDiff >= 0.15 &&
        candidate !== correct &&
        !distractors.includes(candidate)
      ) {
        distractors.push(candidate);
      }
    }

    while (distractors.length < 3) {
      const offset = Math.ceil(Math.abs(trueValue) * 0.2) + distractors.length + 1;
      const sign = distractors.length % 2 === 0 ? 1 : -1;
      const candidate = Math.max(1, correct + sign * offset);
      if (candidate !== correct && !distractors.includes(candidate)) {
        distractors.push(candidate);
      }
    }

    const options = this.shuffle([
      String(correct),
      ...distractors.map(String),
    ]);

    return this.buildQuestion(id, 'estimation', diff, {
      text,
      correctAnswer: String(correct),
      answerType: 'multiple-choice',
      options,
    });
  }

  private findCorrectEstimationOption(trueValue: number): number {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const offset = this.randInt(
        -Math.floor(Math.abs(trueValue) * 0.1),
        Math.floor(Math.abs(trueValue) * 0.1),
      );
      const candidate = Math.max(1, Math.round(trueValue + offset));
      const relDiff = Math.abs(candidate - trueValue) / Math.abs(trueValue);
      if (relDiff <= 0.1) {
        return candidate;
      }
    }
    return Math.max(1, Math.round(trueValue));
  }

  private buildQuestion(
    id: number,
    mode: GameMode,
    difficulty: Difficulty,
    partial: Pick<
      Question,
      'text' | 'correctAnswer' | 'answerType' | 'options' | 'tolerance'
    >,
  ): Question {
    return {
      id,
      mode,
      difficulty,
      ...partial,
    };
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private pick<T>(arr: readonly T[]): T {
    return arr[this.randInt(0, arr.length - 1)];
  }
}
