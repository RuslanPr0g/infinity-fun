import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PieceColor } from '../../engine/core/board';

/**
 * Full-screen hotseat privacy overlay shown between one player's confirm
 * and the other player's entry, so a pending move is never visible to the
 * second player.
 */
@Component({
  selector: 'app-privacy-overlay',
  standalone: true,
  template: `
    <div class="privacy">
      <div class="panel">
        <span class="icon">🙈</span>
        <h2 class="headline">
          Pass the device to {{ nextColor === 'black' ? 'Black' : 'White' }}
        </h2>
        <p class="hint">
          {{ nextColor === 'black' ? 'White' : 'Black' }}'s move is locked in and hidden.
        </p>
        <button type="button" class="ready-button" (click)="ready.emit()">
          I'm {{ nextColor === 'black' ? 'Black' : 'White' }} — continue
        </button>
      </div>
    </div>
  `,
  styleUrl: './privacy-overlay.component.scss',
})
export class PrivacyOverlayComponent {
  @Input({ required: true }) nextColor!: PieceColor;
  @Output() ready = new EventEmitter<void>();
}
