import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Opening, getBaseOpeningName } from '../../../chess-openings/models/opening.model';
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
    <div class="result ui-panel" [class.won]="status === 'won'">
      <p class="ui-kicker">{{ status === 'won' ? 'You got it' : 'Out of guesses' }}</p>
      <p class="name">{{ targetName }}</p>

      @if (blurb(); as text) {
        <p class="blurb">{{ text }}</p>
      }

      @if (mode === 'daily') {
        <div class="ui-stats">
          <div class="ui-stat"><b>{{ stats.currentStreak }}</b><span>Day streak</span></div>
          <div class="ui-stat"><b>{{ stats.wins }}/{{ stats.played }}</b><span>Won</span></div>
        </div>
        <p class="ui-muted next">Next puzzle in {{ countdownText }}</p>
        <button type="button" class="ui-btn primary block" (click)="playFreeMode.emit()">Keep playing (free play)</button>
      } @else {
        <button type="button" class="ui-btn primary block" (click)="playAgain.emit()">Play again</button>
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

  /**
   * Blurbs are written per family, so a variation falls back to its parent's
   * blurb. Still null when neither is present — the result panel drops the
   * line rather than showing filler.
   */
  blurb(): string | null {
    return (
      OPENING_BLURBS[this.targetOpening.name] ??
      OPENING_BLURBS[getBaseOpeningName(this.targetOpening)] ??
      null
    );
  }
}
