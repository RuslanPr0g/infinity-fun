import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GuessRow, MAX_GUESSES } from '../../models/chessle.models';

/**
 * Wordle-style row history: one row per guess, padded with empty rows up to
 * maxGuesses. Color is never the only signal — each filled row also carries
 * a text outcome label for screen readers / color-blind players.
 */
@Component({
  selector: 'app-guess-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ol class="guess-grid" aria-label="Guess history">
      @for (row of displayRows(); track $index) {
        <li
          class="guess-row"
          [class.wrong]="row?.outcome === 'wrong'"
          [class.correct]="row?.outcome === 'correct'"
          [class.empty]="!row"
        >
          @if (row) {
            <span class="family">{{ row.guessedFamily }}</span>
            <span class="outcome-label">{{ row.outcome === 'correct' ? 'Correct' : 'Wrong' }}</span>
          } @else {
            <span class="placeholder" aria-hidden="true">{{ $index + 1 }}</span>
          }
        </li>
      }
    </ol>
  `,
  styleUrl: './guess-grid.component.scss',
})
export class GuessGridComponent {
  @Input({ required: true }) guesses: ReadonlyArray<GuessRow> = [];
  @Input() maxGuesses = MAX_GUESSES;

  displayRows(): (GuessRow | null)[] {
    const rows: (GuessRow | null)[] = [...this.guesses];
    while (rows.length < this.maxGuesses) rows.push(null);
    return rows;
  }
}
