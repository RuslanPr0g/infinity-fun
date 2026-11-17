import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PieceColor } from '../../engine/core/board';

/**
 * Full-screen hotseat privacy overlay shown between one player's confirm
 * and the other player's entry, so a pending move is never visible to the
 * second player.
 */
import { UiModalComponent } from '../../../shared/ui';
@Component({
  selector: 'app-privacy-overlay',
  standalone: true,
  imports: [UiModalComponent],
  template: `
    <ui-modal size="sm" [closable]="false" [opaque]="true">
      <div class="box">
        <span class="icon" aria-hidden="true">🙈</span>
        <h2>Pass the device to {{ nextColor === 'black' ? 'Black' : 'White' }}</h2>
        <p class="ui-muted">{{ nextColor === 'black' ? 'White' : 'Black' }}’s move is locked in and hidden.</p>
        <button type="button" class="ui-btn primary big block" (click)="ready.emit()">I’m {{ nextColor === 'black' ? 'Black' : 'White' }}, show the board</button>
      </div>
    </ui-modal>
  `,
  styleUrl: './privacy-overlay.component.scss',
})
export class PrivacyOverlayComponent {
  @Input({ required: true }) nextColor!: PieceColor;
  @Output() ready = new EventEmitter<void>();
}
