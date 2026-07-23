import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  Board,
  Piece,
  PieceColor,
  Square,
  boardSize,
  fileOf,
  rankOf,
  squareName,
} from '../../engine/core/board';
import { ChessPieceComponent } from '../piece/chess-piece.component';

/**
 * The N×N board. Renders a CSS grid of squares in display order for the
 * given perspective and emits taps; all game logic stays in the parent.
 */
@Component({
  selector: 'app-chess-board',
  standalone: true,
  imports: [CommonModule, ChessPieceComponent],
  template: `
    <div
      class="board"
      [attr.aria-label]="'Chess board'"
      [style.grid-template-columns]="'repeat(' + size + ', 1fr)'"
    >
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
          [class.void]="voidSquares.includes(sq)"
          [class.danger]="dangerSquares.includes(sq)"
          [attr.aria-label]="ariaFor(sq)"
          (click)="squareTapped.emit(sq)"
        >
          @if (board[sq] && !hiddenSquares.includes(sq)) {
            <app-chess-piece [piece]="board[sq]!" />
          }
          @if (isTarget(sq) && !board[sq] && !voidSquares.includes(sq)) {
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
  /** Burned-away squares (Shrinking Board Royale) — charred and inert. */
  @Input() voidSquares: Square[] = [];
  /** Squares in the ring about to burn — a warm warning tint. */
  @Input() dangerSquares: Square[] = [];
  @Output() squareTapped = new EventEmitter<Square>();

  get size(): number {
    return boardSize(this.board);
  }

  get displaySquares(): Square[] {
    const size = this.size;
    const squares: Square[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const rank = this.perspective === 'white' ? size - 1 - row : row;
        const file = this.perspective === 'white' ? col : size - 1 - col;
        squares.push(rank * size + file);
      }
    }
    return squares;
  }

  isLight(sq: Square): boolean {
    const size = this.size;
    return (fileOf(sq, size) + rankOf(sq, size)) % 2 === 1;
  }

  isTarget(sq: Square): boolean {
    return this.targetSquares.includes(sq);
  }

  ariaFor(sq: Square): string {
    const piece: Piece | null = this.board[sq];
    const name = squareName(sq, this.size);
    const base = piece ? `${name}, ${piece.color} ${piece.type}` : name;
    return this.voidSquares.includes(sq) ? `${base}, burned` : base;
  }
}
