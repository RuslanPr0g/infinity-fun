export type GuessOutcome = 'wrong' | 'correct';

export interface GuessRow {
  readonly guessedFamily: string;
  readonly outcome: GuessOutcome;
}

export type ChessleStatus = 'in-progress' | 'won' | 'lost';

export const MAX_GUESSES = 6;

/** Persisted daily-puzzle progress — LocalStorageConst.ChessleDailyState. */
export interface PersistedDailyState {
  readonly dateKey: string;
  readonly targetOpeningId: string;
  readonly guesses: ReadonlyArray<GuessRow>;
  readonly status: ChessleStatus;
}

/** Persisted lifetime stats — LocalStorageConst.ChessleStats. */
export interface ChessleStats {
  readonly played: number;
  readonly wins: number;
  readonly currentStreak: number;
  readonly maxStreak: number;
  readonly guessDistribution: readonly [number, number, number, number, number, number];
  readonly lastCompletedDateKey: string | null;
}

export const INITIAL_CHESSLE_STATS: ChessleStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  lastCompletedDateKey: null,
};
