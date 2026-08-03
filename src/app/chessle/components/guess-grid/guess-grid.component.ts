import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GuessOutcome, GuessRow, MAX_GUESSES } from '../../models/chessle.models';

/**
 * Guess history, in two parts:
 *
 * A compact pip strip carries the "how many tries left" signal for every
 * slot, and full rows are rendered only for guesses actually made. Padding
 * the list out to maxGuesses with empty placeholder rows cost a lot of
 * vertical space to say very little — the pips say the same thing in one
 * short line.
 *
 * Colour is never the only signal: each guess row also carries a text
 * outcome label, and the pip strip is labelled for screen readers.
 */
@Component({
  selector: 'app-guess-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guess-grid">
      <div class="pips" role="img" [attr.aria-label]="pipsLabel()">
        @for (pip of pips(); track $index) {
          <span
            class="pip"
            [class.wrong]="pip === 'wrong'"
            [class.correct]="pip === 'correct'"
          ></span>
        }
      </div>

      @if (guesses.length > 0) {
        <ol class="guess-list" aria-label="Guesses so far">
          @for (row of guesses; track $index) {
            <li
              class="guess-item"
              [class.wrong]="row.outcome === 'wrong'"
              [class.correct]="row.outcome === 'correct'"
            >
              <span class="family">{{ row.guessedFamily }}</span>
              <span class="outcome-label">{{
                row.outcome === 'correct' ? 'Correct' : 'Wrong'
              }}</span>
            </li>
          }
        </ol>
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
    return `${this.guesses.length} of ${this.maxGuesses} guesses used`;
  }
}
