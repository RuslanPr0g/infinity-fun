import { Component, Input } from '@angular/core';
import { Piece, PieceType } from '../../engine/core/board';

/**
 * Renders one chess piece as a Unicode glyph. Both colors use the filled
 * glyph set (consistent silhouettes) and are tinted via CSS.
 */
@Component({
  selector: 'app-chess-piece',
  standalone: true,
  template: `
    <span
      class="piece"
      [class.white]="piece.color === 'white'"
      [class.black]="piece.color === 'black'"
      >{{ glyph }}</span
    >
  `,
  styles: [
    `
      .piece {
        display: inline-block;
        line-height: 1;
        font-size: inherit;
        user-select: none;
      }
      .piece.white {
        color: #f4f7f6;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      }
      .piece.black {
        color: #1a2222;
        text-shadow: 0 1px 1px rgba(255, 255, 255, 0.25);
      }
    `,
  ],
})
export class ChessPieceComponent {
  @Input({ required: true }) piece!: Piece;

  private static readonly FILLED_GLYPHS: Record<PieceType, string> = {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  };

  get glyph(): string {
    return ChessPieceComponent.FILLED_GLYPHS[this.piece.type];
  }
}
