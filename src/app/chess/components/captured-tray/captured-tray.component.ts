import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  Piece,
  PieceColor,
  PieceType,
  makePiece,
  opponentOf,
} from '../../engine/core/board';
import { ChessPieceComponent } from '../piece/chess-piece.component';

/** Tray of pieces a side has captured (shown as the opponent's pieces). */
@Component({
  selector: 'app-captured-tray',
  standalone: true,
  imports: [CommonModule, ChessPieceComponent],
  template: `
    <div class="tray">
      <span class="owner">{{ owner === 'white' ? 'White' : 'Black' }} captured</span>
      <span class="pieces">
        @if (captured.length === 0) {
          <span class="none">—</span>
        }
        @for (piece of capturedPieces; track $index) {
          <app-chess-piece [piece]="piece" />
        }
      </span>
    </div>
  `,
  styleUrl: './captured-tray.component.scss',
})
export class CapturedTrayComponent {
  /** The capturing side this tray belongs to. */
  @Input({ required: true }) owner!: PieceColor;
  @Input() captured: PieceType[] = [];

  get capturedPieces(): Piece[] {
    return this.captured.map((type) => makePiece(type, opponentOf(this.owner), true));
  }
}
