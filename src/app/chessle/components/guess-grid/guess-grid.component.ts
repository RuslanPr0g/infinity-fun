import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GuessOutcome, GuessRow, MAX_GUESSES } from '../../models/chessle.models';

/**
 * Guess progress as a compact strip of pips — one per guess slot, filled in
 * as guesses are spent. The board and move list already carry the round's
 * real content, so this only needs to answer "how many tries are left" and
 * "was I close".
 *
 * Colour is never the only signal: the strip's screen-reader label spells
 * out the used/total count and how many guesses landed in the right family.
 */
@Component({
  selector: 'app-guess-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pips" role="img" [attr.aria-label]="pipsLabel()">
      @for (pip of pips(); track $index) {
        <span
          class="pip"
          [class.wrong]="pip === 'wrong'"
          [class.family]="pip === 'family'"
          [class.correct]="pip === 'correct'"
        ></span>
      }
    </div>
  `,
  styleUrl: './guess-grid.component.scss',
})
export class GuessGridComponent {
  @Input({ required: true }) guesses: ReadonlyArray<GuessRow> = [];
  @Input() maxGuesses = MAX_GUESSES;

  /** One entry per slot: the outcome for used guesses, null for remaining ones. */
  pips(): (GuessOutcome | null)[] {
    const pips: (GuessOutcome | null)[] = this.guesses.map((guess) => guess.outcome);
    while (pips.length < this.maxGuesses) pips.push(null);
    return pips.slice(0, this.maxGuesses);
  }

  pipsLabel(): string {
    const used = `${this.guesses.length} of ${this.maxGuesses} guesses used`;
    const nearMisses = this.guesses.filter((guess) => guess.outcome === 'family').length;
    return nearMisses > 0 ? `${used}, ${nearMisses} in the right family` : used;
  }
}
