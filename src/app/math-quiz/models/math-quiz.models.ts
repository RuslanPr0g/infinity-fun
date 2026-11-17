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
    description: 'Times tables and bigger numbers.',
    icon: '×',
  },
  division: {
    label: 'Division',
    description: 'Split numbers, sometimes with decimals.',
    icon: '÷',
  },
  mixed: {
    label: 'Mixed',
    description: 'Plus, minus, times and divide together.',
    icon: '±',
  },
  'power-roots': {
    label: 'Powers & roots',
    description: 'Squares, cubes and square roots.',
    icon: 'x²',
  },
  sequence: {
    label: 'Number patterns',
    description: 'Find the missing number in a row.',
    icon: '1 2 _',
  },
  estimation: {
    label: 'Estimate',
    description: 'Pick the answer closest to the real one.',
    icon: '≈',
  },
};

export const DIFFICULTY_DESCRIPTIONS: Record<
  GameMode,
  Record<Difficulty, string>
> = {
  multiplication: {
    easy: 'One digit × one digit (1 to 9)',
    medium: 'Numbers up to 99',
    hard: 'Three numbers, each up to 99',
  },
  division: {
    easy: 'Whole-number answers, divide by 1 to 9',
    medium: 'Answers with one decimal, up to 999',
    hard: 'Round to a whole number, up to 9999',
  },
  mixed: {
    easy: 'Two numbers, + and − only, up to 20',
    medium: 'Two numbers, any sign, up to 100',
    hard: 'Three numbers, any sign, × and ÷ first, up to 1000',
  },
  'power-roots': {
    easy: 'Squares of 1 to 12',
    medium: 'Cubes of 1 to 10, or square roots up to 144',
    hard: 'Cube roots up to 1000, or powers of 4 and 5',
  },
  sequence: {
    easy: 'Add the same number each time (1 to 10)',
    medium: 'Multiply or divide each time (×2, ×3, ÷2)',
    hard: 'Add the last two, or steps that switch',
  },
  estimation: {
    easy: 'a × b, numbers up to 50',
    medium: '(a × b) + c or (a + b) × c, up to 200',
    hard: '(a × b) − (c × d), up to 500',
  },
};
