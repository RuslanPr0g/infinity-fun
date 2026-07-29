import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PieceColor } from '../../engine/core/board';

/** Confirm-or-cancel overlay shown before a resignation is committed. */
@Component({
  selector: 'app-resign-confirm-overlay',
  standalone: true,
  template: `
    <div class="resign-confirm">
      <div class="panel">
        <h2 class="headline">
          {{ color === 'white' ? 'White' : 'Black' }} resigns?
        </h2>
        <p class="hint">This ends the game immediately.</p>
        <div class="actions">
          <button type="button" class="confirm" (click)="confirm.emit()">
            Resign
          </button>
          <button type="button" class="cancel" (click)="cancel.emit()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './resign-confirm-overlay.component.scss',
})
export class ResignConfirmOverlayComponent {
  @Input({ required: true }) color!: PieceColor;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
