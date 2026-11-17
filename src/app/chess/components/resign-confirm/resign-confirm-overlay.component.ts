import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PieceColor } from '../../engine/core/board';

/** Confirm-or-cancel overlay shown before a resignation is committed. */
import { UiModalComponent } from '../../../shared/ui';
@Component({
  selector: 'app-resign-confirm-overlay',
  standalone: true,
  imports: [UiModalComponent],
  template: `
    <ui-modal size="sm" (closed)="cancel.emit()">
      <div class="box">
        <h2>{{ color === 'white' ? 'White' : 'Black' }} gives up?</h2>
        <p class="ui-muted">This ends the game right away.</p>
        <div class="actions">
          <button type="button" class="ui-btn" (click)="cancel.emit()">Keep playing</button>
          <button type="button" class="ui-btn danger" (click)="confirm.emit()">Resign</button>
        </div>
      </div>
    </ui-modal>
  `,
  styleUrl: './resign-confirm-overlay.component.scss',
})
export class ResignConfirmOverlayComponent {
  @Input({ required: true }) color!: PieceColor;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
