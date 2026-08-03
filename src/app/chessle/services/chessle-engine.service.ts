import { Injectable, computed, signal } from '@angular/core';
import { Opening, getBaseOpeningName } from '../../chess-openings/models/opening.model';
import { ChessleStatus, GuessOutcome, GuessRow, MAX_GUESSES } from '../models/chessle.models';

/**
 * Drives one Chessle round: reveals the target opening's moves one at a
 * time, up to MAX_GUESSES rows. A wrong guess reveals the next move; a
 * correct guess (matched at the opening-family level — see
 * getBaseOpeningName) ends the round as a win. Mode-agnostic — daily and
 * free play both drive this same service, differing only in how the target
 * opening is chosen and whether the round is persisted.
 */
@Injectable({ providedIn: 'root' })
export class ChessleEngineService {
  readonly target = signal<Opening | null>(null);
  readonly revealedMoveCount = signal(0);
  readonly guesses = signal<ReadonlyArray<GuessRow>>([]);
  readonly status = signal<ChessleStatus>('in-progress');

  readonly revealedMoves = computed<string[]>(() => {
    const opening = this.target();
    if (!opening) return [];
    return opening.moves.slice(0, this.revealedMoveCount());
  });

  readonly guessesRemaining = computed<number>(() => MAX_GUESSES - this.guesses().length);

  start(target: Opening): void {
    this.target.set(target);
    this.revealedMoveCount.set(Math.min(1, target.moves.length));
    this.guesses.set([]);
    this.status.set('in-progress');
  }

  /** Restores a round already in progress (e.g. resuming a persisted daily puzzle). */
  restore(target: Opening, guesses: ReadonlyArray<GuessRow>, status: ChessleStatus): void {
    this.target.set(target);
    this.guesses.set(guesses);
    this.status.set(status);
    this.revealedMoveCount.set(Math.min(Math.max(1, guesses.length), target.moves.length));
  }

  /** Submits a guessed opening. Returns the outcome, or null if the round isn't in progress. */
  submitGuess(guessed: Opening): GuessOutcome | null {
    if (this.status() !== 'in-progress') return null;
    const target = this.target();
    if (!target) return null;

    const correct = getBaseOpeningName(guessed) === getBaseOpeningName(target);
    const outcome: GuessOutcome = correct ? 'correct' : 'wrong';
    const nextGuesses = [...this.guesses(), { guessedFamily: getBaseOpeningName(guessed), outcome }];
    this.guesses.set(nextGuesses);

    if (correct) {
      this.status.set('won');
    } else if (nextGuesses.length >= MAX_GUESSES) {
      this.status.set('lost');
    } else {
      this.revealedMoveCount.update((count) => Math.min(count + 1, target.moves.length));
    }

    return outcome;
  }
}
