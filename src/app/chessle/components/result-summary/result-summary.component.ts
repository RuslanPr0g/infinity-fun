import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Opening } from '../../../chess-openings/models/opening.model';
import { OPENING_BLURBS } from '../../data/opening-blurbs.const';
import { ChessleStats, ChessleStatus, GuessRow, INITIAL_CHESSLE_STATS } from '../../models/chessle.models';
import { ShareService } from '../../services/share.service';

type Mode = 'daily' | 'free';

/**
 * The finished-round panel: win/lose reveal, blurb (when the target has
 * one — see OPENING_BLURBS), and mode-specific footer (daily gets
 * streak/countdown/share; free play gets an immediate replay).
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
        <button type="button" class="share-button" (click)="share()">
          {{ copied() ? 'Copied!' : 'Share result' }}
        </button>
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
  @Input() guesses: ReadonlyArray<GuessRow> = [];
  @Input() stats: ChessleStats = INITIAL_CHESSLE_STATS;
  @Input() countdownText = '';
  @Input() puzzleNumber = 0;

  @Output() playAgain = new EventEmitter<void>();
  @Output() playFreeMode = new EventEmitter<void>();

  private readonly shareService = inject(ShareService);
  readonly copied = signal(false);

  blurb(): string | null {
    return OPENING_BLURBS[this.targetOpening.name] ?? null;
  }

  async share(): Promise<void> {
    const text = this.shareService.buildShareText(this.puzzleNumber, this.guesses, this.status);
    const ok = await this.shareService.copyToClipboard(text);
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }
}
