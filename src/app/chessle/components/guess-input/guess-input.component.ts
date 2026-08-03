import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Opening } from '../../../chess-openings/models/opening.model';

/**
 * Free-text-feel guess entry: type to filter the pool, click a candidate to
 * guess it. Not raw free text (too punishing for exact naming/spelling) and
 * not multiple-choice (trivializes it) — mirrors the opening-picker/
 * opening-quiz-board typeahead pattern.
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
          @for (opening of candidates(); track opening.id) {
            <li>
              <button type="button" class="candidate-button" (click)="select(opening)">
                {{ opening.name }}
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
  @Output() guess = new EventEmitter<Opening>();

  readonly searchTerm = signal('');

  candidates(): Opening[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return [];
    return this.pool.filter((opening) => opening.name.toLowerCase().includes(term)).slice(0, 8);
  }

  select(opening: Opening): void {
    this.guess.emit(opening);
    this.searchTerm.set('');
  }
}
