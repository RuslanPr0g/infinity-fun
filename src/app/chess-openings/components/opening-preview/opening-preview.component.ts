import { Component, Input, OnChanges, signal } from '@angular/core';
import { Chess } from 'chess.js';
import { Opening } from '../../models/opening.model';
import { chessJsToBoard } from '../../board-adapter';
import { ChessBoardComponent } from '../../../chess/components/board/chess-board.component';
import { Board } from '../../../chess/engine/core/board';

/**
 * Small, non-interactive board showing the position an opening reaches.
 * Used as the desktop hover preview in the picker.
 */
@Component({
  selector: 'app-opening-preview',
  standalone: true,
  imports: [ChessBoardComponent],
  template: `
    <div class="preview-popup">
      <div class="board-wrap">
        <app-chess-board [board]="board()" perspective="white" />
      </div>
      <p class="preview-name">{{ name }}</p>
      <p class="preview-moves">{{ movesLine() }}</p>
    </div>
  `,
  styleUrl: './opening-preview.component.scss',
})
export class OpeningPreviewComponent implements OnChanges {
  @Input({ required: true }) opening!: Opening;
  /** Display name from the picker, already disambiguated by ECO where needed. */
  @Input() name = '';

  readonly board = signal<Board>(chessJsToBoard(new Chess()));
  readonly movesLine = signal('');

  ngOnChanges(): void {
    const chess = new Chess();
    const played: string[] = [];

    for (const san of this.opening.moves) {
      try {
        chess.move(san);
        played.push(san);
      } catch {
        // Dataset SAN that chess.js rejects: show the position reached so far
        // rather than letting one bad entry break the whole picker.
        break;
      }
    }

    this.board.set(chessJsToBoard(chess));
    this.movesLine.set(
      played.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' '),
    );
  }
}
