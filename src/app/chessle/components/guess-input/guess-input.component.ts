import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Opening,
  getBaseOpeningName,
  getVariationName,
} from '../../../chess-openings/models/opening.model';

/** A candidate split into its family and variation halves for display. */
interface CandidateRow {
  readonly opening: Opening;
  readonly family: string;
  readonly variation: string | null;
}

/**
 * Free-text-feel guess entry: type to filter the pool, click a candidate to
 * guess it. Not raw free text (too punishing for exact naming/spelling) and
 * not multiple-choice (trivializes it) — mirrors the opening-picker/
 * opening-quiz-board typeahead pattern.
 *
 * Only the exact openings already guessed are filtered out. Other variations
 * of a family stay on offer even once that family has been tried, because
 * narrowing down within a family is the whole point of the partial-credit
 * tier.
 */
@Component({
  selector: 'app-guess-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="guess-input">
      <input
        class="search-input"
        type="text"
        placeholder="Type an opening name…"
        aria-label="Guess the opening"
        [ngModel]="searchTerm()"
        (ngModelChange)="searchTerm.set($event)"
      />
      @if (candidates().length > 0) {
        <ul class="candidate-list">
          @for (row of candidates(); track row.opening.id) {
            <li>
              <button type="button" class="candidate-button" (click)="select(row.opening)">
                <span class="family">{{ row.family }}</span>
                @if (row.variation) {
                  <span class="variation">{{ row.variation }}</span>
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styleUrl: './guess-input.component.scss',
})
export class GuessInputComponent {
  @Input({ required: true }) pool: Opening[] = [];
  /** Full opening names already guessed this round — never offered again. */
  @Input() guessedNames: ReadonlyArray<string> = [];
  @Output() guess = new EventEmitter<Opening>();

  readonly searchTerm = signal('');

  candidates(): CandidateRow[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];
    const alreadyGuessed = new Set(this.guessedNames);

    return this.pool
      .filter(
        (opening) =>
          opening.name.toLowerCase().includes(term) && !alreadyGuessed.has(opening.name),
      )
      .slice(0, 8)
      .map((opening) => ({
        opening,
        family: getBaseOpeningName(opening),
        variation: getVariationName(opening),
      }));
  }

  select(opening: Opening): void {
    this.guess.emit(opening);
    this.searchTerm.set('');
  }
}
