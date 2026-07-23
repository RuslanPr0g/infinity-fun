import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  Board,
  Piece,
  PieceColor,
  Square,
  fileOf,
  rankOf,
  squareName,
} from '../../engine/core/board';
import { ChessPieceComponent } from '../piece/chess-piece.component';

/**
 * The 8×8 board. Renders a CSS grid of squares in display order for the
 * given perspective and emits taps; all game logic stays in the parent.
 */
@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule, ChessPieceComponent],
  template: `
    <div class="board" [attr.aria-label]="'Chess board'">
      @for (sq of displaySquares; track sq) {
        <button
          type="button"
          class="square"
          [class.light]="isLight(sq)"
          [class.dark]="!isLight(sq)"
          [class.selected]="sq === selectedSquare"
          [class.target]="isTarget(sq)"
          [class.capture-target]="isTarget(sq) && board[sq] !== null"
          [class.pending]="sq === pendingFrom || sq === pendingTo"
          [class.last-round]="highlightSquares.includes(sq)"
          [attr.aria-label]="ariaFor(sq)"
          (click)="squareTapped.emit(sq)"
        >
          @if (board[sq] && !hiddenSquares.includes(sq)) {
            <app-chess-piece [piece]="board[sq]!" />
          }
          @if (isTarget(sq) && !board[sq]) {
            <span class="dot"></span>
          }
        </button>
      }
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './chess-board.component.scss',
})
export class ChessBoardComponent {
  @Input({ required: true }) board!: Board;
  @Input() perspective: PieceColor = 'white';
  @Input() selectedSquare: Square | null = null;
  @Input() targetSquares: Square[] = [];
  @Input() pendingFrom: Square | null = null;
  @Input() pendingTo: Square | null = null;
  @Input() highlightSquares: Square[] = [];
  /** Squares whose pieces are temporarily drawn by the reveal layer instead. */
  @Input() hiddenSquares: Square[] = [];
  @Output() squareTapped = new EventEmitter<Square>();

  get displaySquares(): Square[] {
    const squares: Square[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const rank = this.perspective === 'white' ? 7 - row : row;
        const file = this.perspective === 'white' ? col : 7 - col;
        squares.push(rank * 8 + file);
      }
    }
    return squares;
  }

  isLight(sq: Square): boolean {
    return (fileOf(sq) + rankOf(sq)) % 2 === 1;
  }

  isTarget(sq: Square): boolean {
    return this.targetSquares.includes(sq);
  }

  ariaFor(sq: Square): string {
    const piece: Piece | null = this.board[sq];
    const name = squareName(sq);
    return piece ? `${name}, ${piece.color} ${piece.type}` : name;
  }
}
