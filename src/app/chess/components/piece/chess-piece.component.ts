import { Component, Input } from '@angular/core';
import { Piece, PieceType } from '../../engine/core/board';

/**
 * Renders one chess piece from the bundled SVG sprite
 * (`public/chess-pieces/standard.svg` — the Wikimedia Commons "Standard"
 * set by Cburnett/Rfc1394, CC BY-SA 3.0, packaged for cm-chessboard; the
 * license header travels inside the sprite file itself).
 *
 * The host element is sized by the parent; the sprite tile is 40×40.
 */
@Component({
  selector: 'app-chess-piece',
  standalone: true,
  template: `
    <svg
      class="piece"
      viewBox="0 0 40 40"
      role="img"
      focusable="false"
      [attr.aria-label]="piece.color + ' ' + piece.type"
    >
      <use [attr.href]="spriteHref" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .piece {
        display: block;
        width: 100%;
        height: 100%;
        pointer-events: none;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
      }
    `,
  ],
})
export class ChessPieceComponent {
  @Input({ required: true }) piece!: Piece;

  private static readonly SPRITE_LETTERS: Record<PieceType, string> = {
    king: 'k',
    queen: 'q',
    rook: 'r',
    bishop: 'b',
    knight: 'n',
    pawn: 'p',
  };

  get spriteHref(): string {
    const colorLetter = this.piece.color === 'white' ? 'w' : 'b';
    const pieceLetter = ChessPieceComponent.SPRITE_LETTERS[this.piece.type];
    return `chess-pieces/standard.svg#${colorLetter}${pieceLetter}`;
  }
}
