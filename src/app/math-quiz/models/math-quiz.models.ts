export type GameState =
  | 'lobby'
  | 'difficulty-select'
  | 'playing'
  | 'feedback'
  | 'results';

export type GameMode =
  | 'multiplication'
  | 'division'
  | 'mixed'
  | 'power-roots'
  | 'sequence'
  | 'estimation';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AnswerType = 'typed' | 'multiple-choice';

export interface Question {
  id: number;                     // index 0–9 within session
  text: string;                   // human-readable question, e.g. "7 × 8 = ?"
  correctAnswer: string;          // string form of the correct answer
  answerType: AnswerType;
  options?: string[];             // 4 options if answerType = 'multiple-choice'
  mode: GameMode;
  difficulty: Difficulty;
  tolerance?: number;             // optional tolerance for answer comparison (e.g. ±0.05 for division medium)
}

export interface SessionState {
  mode: GameMode;
  difficulty: Difficulty;
  questions: Question[];
  questionIndex: number;          // 0-based current question
  score: number;
  correctCount: number;
  questionTimings: number[];      // elapsed ms per answered question
  timerRemainingMs: number;
  lastAnswerCorrect: boolean | null;
  personalBestAtStart: number;
}

export interface SessionSnapshot {
  questionIndex: number;          // 1-based for display (questionIndex + 1)
  score: number;
  timerRemainingMs: number;
  totalMs: number;
}

export interface SessionResult {
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  correctCount: number;
  accuracy: number;               // 0–100
  averageTimingMs: number;
  personalBest: number;
  isNewPersonalBest: boolean;
}

export interface PersonalBestRecord {
  score: number;
  achievedAt: string;             // ISO date string
}

// ── Constants ──────────────────────────────────────────────────────────────

export const QUESTIONS_PER_ROUND = 10;

export const TIMER_MS: Record<Difficulty, number> = {
  easy: 30_000,
  medium: 20_000,
  hard: 15_000,
};

export const POINTS_CORRECT = 10;
export const POINTS_BONUS_SPEED = 5;

export const GAME_MODE_CONFIG: Record<
  GameMode,
  { label: string; description: string; icon: string }
> = {
  multiplication: {
    label: 'Multiplication',
    description: 'Multiply numbers — get faster with every round.',
    icon: '✖️',
  },
  division: {
    label: 'Division',
    description: 'Divide precisely — integers and decimals await.',
    icon: '➗',
  },
  mixed: {
    label: 'Mixed Operations',
    description: 'All four operators, watch your precedence.',
    icon: '🔢',
  },
  'power-roots': {
    label: 'Power & Roots',
    description: 'Squares, cubes, and radicals at speed.',
    icon: '√',
  },
  sequence: {
    label: 'Number Sequence',
    description: 'Spot the pattern, fill the blank.',
    icon: '🔁',
  },
  estimation: {
    label: 'Mental Estimation',
    description: 'Pick the closest answer — precision not required.',
    icon: '🎯',
  },
};

export const DIFFICULTY_DESCRIPTIONS: Record<
  GameMode,
  Record<Difficulty, string>
> = {
  multiplication: {
    easy: 'Single-digit × single-digit (1–9)',
    medium: 'At least one two-digit operand (1–99)',
    hard: 'Three operands, all up to 99',
  },
  division: {
    easy: 'Integer results, divisor 1–9',
    medium: 'Results with one decimal place, up to 999',
    hard: 'Round to nearest integer, numbers up to 9999',
  },
  mixed: {
    easy: 'Two operands, + and − only, numbers 1–20',
    medium: 'Two operands, all operators, numbers 1–100',
    hard: 'Three operands, all operators, PEMDAS, up to 1000',
  },
  'power-roots': {
    easy: 'Squares of 1–12',
    medium: 'Cubes 1–10 or square roots of perfect squares ≤144',
    hard: 'Cube roots of perfect cubes ≤1000 or n⁴/n⁵',
  },
  sequence: {
    easy: 'Arithmetic sequences, step 1–10',
    medium: 'Geometric sequences (×2, ×3, ×0.5, ÷2)',
    hard: 'Fibonacci-like or alternating-step patterns',
  },
  estimation: {
    easy: 'Estimate a × b, operands 1–50',
    medium: 'Estimate (a×b)+c or (a+b)×c, up to 200',
    hard: 'Estimate (a×b)−(c×d), up to 500',
  },
};
