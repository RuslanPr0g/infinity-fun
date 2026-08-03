import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Chess } from 'chess.js';
import { chessJsToBoard } from '../../../chess-openings/board-adapter';
import { ChessBoardComponent } from '../../../chess/components/board/chess-board.component';
import { ChessPieceComponent } from '../../../chess/components/piece/chess-piece.component';
import { Board, Square, parseSquare } from '../../../chess/engine/core/board';

/**
 * Read-only board for the revealed moves so far, reusing the app's existing
 * board rendering (ChessBoardComponent/chessJsToBoard) exactly as the
 * Opening Trainer quiz does — no new board-rendering code. The last-revealed
 * move's squares are highlighted so each reveal reads as a visible event.
 */
@Component({
  selector: 'app-chessle-board',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, ChessPieceComponent],
  template: `
    <div class="board-wrap">
      <app-chess-board
        [board]="board()"
        perspective="white"
        [selectedSquare]="null"
        [targetSquares]="[]"
        [highlightSquares]="lastMoveSquares()"
        (squareTapped)="noop()"
      />
    </div>
    <div class="move-log" aria-label="Revealed moves so far">
      @for (san of revealedMoves; track $index) {
        <span class="move-token">
          @if ($index % 2 === 0) {
            <span class="move-number">{{ $index / 2 + 1 }}.</span>
          }
          {{ san }}
        </span>
      }
    </div>
  `,
  styleUrl: './chessle-board.component.scss',
})
export class ChessleBoardComponent {
  @Input({ required: true }) revealedMoves: string[] = [];

  board(): Board {
    const chess = new Chess();
    for (const san of this.revealedMoves) {
      chess.move(san);
    }
    return chessJsToBoard(chess);
  }

  lastMoveSquares(): Square[] {
    if (this.revealedMoves.length === 0) return [];
    const chess = new Chess();
    let last: { from: string; to: string } | null = null;
    for (const san of this.revealedMoves) {
      last = chess.move(san);
    }
    if (!last) return [];
    return [parseSquare(last.from), parseSquare(last.to)];
  }

  noop(): void {
    // Board is read-only — no interaction allowed.
  }
}
