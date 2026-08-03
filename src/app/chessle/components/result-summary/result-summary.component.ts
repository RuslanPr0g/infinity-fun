import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Opening } from '../../../chess-openings/models/opening.model';
import { OPENING_BLURBS } from '../../data/opening-blurbs.const';
import { ChessleStats, ChessleStatus, INITIAL_CHESSLE_STATS } from '../../models/chessle.models';

type Mode = 'daily' | 'free';

/**
 * The finished-round panel: win/lose reveal, blurb (when the target has
 * one — see OPENING_BLURBS), and mode-specific footer (daily gets
 * streak/countdown; free play gets an immediate replay).
 */
@Component({
  selector: 'app-result-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="result" [class.won]="status === 'won'">
      <p class="result-line">
        @if (status === 'won') {
          ✅ Correct — {{ targetName }}
        } @else {
          ❌ Out of guesses — it was {{ targetName }}
        }
      </p>

      @if (blurb(); as text) {
        <p class="blurb">{{ text }}</p>
      }

      @if (mode === 'daily') {
        <p class="streak-line">
          🔥 {{ stats.currentStreak }} day streak · {{ stats.wins }}/{{ stats.played }} won
        </p>
        <p class="countdown-line">Next puzzle in {{ countdownText }}</p>
        <button type="button" class="again-button" (click)="playFreeMode.emit()">
          Play Free Mode
        </button>
      } @else {
        <button type="button" class="again-button" (click)="playAgain.emit()">Play again</button>
      }
    </div>
  `,
  styleUrl: './result-summary.component.scss',
})
export class ResultSummaryComponent {
  @Input({ required: true }) status!: ChessleStatus;
  @Input({ required: true }) targetOpening!: Opening;
  @Input({ required: true }) targetName = '';
  @Input({ required: true }) mode!: Mode;
  @Input() stats: ChessleStats = INITIAL_CHESSLE_STATS;
  @Input() countdownText = '';

  @Output() playAgain = new EventEmitter<void>();
  @Output() playFreeMode = new EventEmitter<void>();

  blurb(): string | null {
    return OPENING_BLURBS[this.targetOpening.name] ?? null;
  }
}
