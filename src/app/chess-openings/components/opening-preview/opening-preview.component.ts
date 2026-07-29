import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { Opening } from '../../models/opening.model';
import { chessJsToBoard } from '../../board-adapter';
import { ChessBoardComponent } from '../../../chess/components/board/chess-board.component';
import { Board } from '../../../chess/engine/core/board';

/**
 * Small board preview showing the position after an opening's moves.
 * Only displayed on hover on desktop via tooltip.
 */
@Component({
  selector: 'app-opening-preview',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent],
  template: `
    <div class="preview-popup">
      <app-chess-board [board]="board()" [perspective]="'white'" />
      <p class="moves-label">{{ opening.moves.length }} moves</p>
    </div>
  `,
  styleUrl: './opening-preview.component.scss',
})
export class OpeningPreviewComponent implements OnInit {
  @Input({ required: true }) opening!: Opening;

  private readonly chess = signal<Chess>(new Chess());
  readonly board = computed<Board>(() => chessJsToBoard(this.chess()));

  ngOnInit(): void {
    if (!this.opening.moves || this.opening.moves.length === 0) return;
    const chess = new Chess();
    for (const move of this.opening.moves) {
      chess.move(move);
    }
    this.chess.set(chess);
  }
}
