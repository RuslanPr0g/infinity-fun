import { Injectable, computed, signal } from '@angular/core';
import { Opening } from '../models/opening.model';

export type QuizResult = 'correct' | 'incorrect' | 'skipped' | null;

/** Fisher–Yates shuffle, non-mutating. */
function shuffled<T>(items: ReadonlyArray<T>): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const INITIAL_MOVES_SHOWN = 3;

/**
 * Drives one "Name it" quiz session: moves are revealed for an opening drawn
 * from the user's chosen practice set, and the user searches/picks the
 * opening's name. Candidates are always scoped to the practice set — never
 * the full ~3800-entry dataset — so obscure/unselected openings never show
 * up as guessable answers.
 */
@Injectable({ providedIn: 'root' })
export class OpeningQuizService {
  readonly practiceSet = signal<Opening[]>([]);
  readonly currentIndex = signal(0);
  readonly revealedMoveCount = signal(0);
  readonly score = signal(0);
  readonly answered = signal(0);
  readonly lastResult = signal<QuizResult>(null);

  readonly current = computed<Opening | null>(
    () => this.practiceSet()[this.currentIndex()] ?? null,
  );
  readonly finished = computed(
    () => this.practiceSet().length > 0 && this.currentIndex() >= this.practiceSet().length,
  );
  readonly revealedMoves = computed<string[]>(() => {
    const opening = this.current();
    if (!opening) return [];
    return opening.moves.slice(0, this.revealedMoveCount());
  });
  readonly canRevealMore = computed<boolean>(() => {
    const opening = this.current();
    return opening !== null && this.revealedMoveCount() < opening.moves.length;
  });

  start(practiceSet: ReadonlyArray<Opening>): void {
    this.practiceSet.set(shuffled(practiceSet));
    this.currentIndex.set(0);
    this.score.set(0);
    this.answered.set(0);
    this.lastResult.set(null);
    this.resetReveal();
  }

  revealNextMove(): void {
    const opening = this.current();
    if (!opening) return;
    this.revealedMoveCount.update((count) => Math.min(count + 1, opening.moves.length));
  }

  /** Candidates for the answer typeahead — scoped to the practice set only. */
  searchCandidates(term: string): Opening[] {
    const query = term.trim().toLowerCase();
    if (!query) return [];
    return this.practiceSet().filter((opening) => opening.name.toLowerCase().includes(query));
  }

  submitGuess(openingId: string): boolean {
    const opening = this.current();
    if (!opening || this.lastResult() !== null) return false;
    const correct = opening.id === openingId;
    this.lastResult.set(correct ? 'correct' : 'incorrect');
    if (correct) this.score.update((score) => score + 1);
    this.answered.update((answered) => answered + 1);
    return correct;
  }

  skip(): void {
    if (this.lastResult() !== null) return;
    this.lastResult.set('skipped');
    this.answered.update((answered) => answered + 1);
  }

  next(): void {
    this.currentIndex.update((index) => index + 1);
    this.lastResult.set(null);
    this.resetReveal();
  }

  private resetReveal(): void {
    const opening = this.current();
    const initial = opening ? Math.min(INITIAL_MOVES_SHOWN, opening.moves.length) : 0;
    this.revealedMoveCount.set(initial);
  }
}
