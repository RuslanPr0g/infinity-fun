import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

/**
 * First-visit how-to-play overlay — readable in under 10 seconds by design:
 * two sentences plus a 3-cell example of the guess-grid feedback. Dismissal
 * is persisted by the parent (LocalStorageConst.ChessleRulesSeen) so it only
 * shows once.
 */
@Component({
  selector: 'app-rules-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <div class="card">
        <h2 id="rules-title">How to play Chessle</h2>
        <p>
          Guess the chess opening from its opening moves. Each wrong guess reveals the next
          move — you get 6 tries.
        </p>
        <div class="example" aria-hidden="true">
          <span class="cell wrong">⬛</span>
          <span class="cell wrong">⬛</span>
          <span class="cell correct">🟩</span>
        </div>
        <button type="button" class="got-it-button" (click)="dismiss.emit()">Got it</button>
      </div>
    </div>
  `,
  styleUrl: './rules-overlay.component.scss',
})
export class RulesOverlayComponent {
  @Output() dismiss = new EventEmitter<void>();
}
