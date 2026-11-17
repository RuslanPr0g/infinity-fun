import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameStatus } from '../../engine/variant';

/** End-of-game overlay: result, reason, and rematch/change-mode actions. */
import { UiModalComponent } from '../../../shared/ui';
@Component({
  selector: 'app-game-over-overlay',
  standalone: true,
  imports: [CommonModule, UiModalComponent],
  template: `
    <ui-modal size="sm" [closable]="false">
      <div class="box">
        <p class="ui-kicker">Game over</p>
        <h2 class="result">{{ resultText }}</h2>
        <p class="ui-muted">{{ reasonText }}</p>
        <div class="actions">
          <button type="button" class="ui-btn" (click)="changeMode.emit()">Other mode</button>
          <button type="button" class="ui-btn primary" (click)="rematch.emit()">Play again</button>
        </div>
      </div>
    </ui-modal>
  `,
  styleUrl: './game-over-overlay.component.scss',
})
export class GameOverOverlayComponent {
  @Input({ required: true }) status!: GameStatus;
  @Output() rematch = new EventEmitter<void>();
  @Output() changeMode = new EventEmitter<void>();

  get resultText(): string {
    switch (this.status.outcome) {
      case 'white-won':
        return 'White wins!';
      case 'black-won':
        return 'Black wins!';
      case 'draw':
        return 'Draw';
      default:
        return '';
    }
  }

  get reasonText(): string {
    switch (this.status.reason) {
      case 'king-captured':
        return 'The king was captured.';
      case 'both-kings-captured':
        return 'Both kings fell in the same round.';
      case 'king-trapped':
        return 'The king had nowhere left to go.';
      case 'both-kings-trapped':
        return 'Both kings were trapped at once.';
      case 'triple-pass':
        return 'Both players passed three rounds in a row.';
      case 'resignation':
        return 'By resignation.';
      case 'king-burned':
        return 'The king burned with the board.';
      case 'both-kings-burned':
        return 'Both kings burned together.';
      default:
        return '';
    }
  }
}
