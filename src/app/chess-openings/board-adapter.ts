/**
 * Bridges chess.js (owns all standard-rules concerns for this feature) to
 * the existing engine/core/board.ts `Board`/`Piece` shape, so the app's
 * existing `ChessBoardComponent`/`ChessPieceComponent` can render this
 * game's positions without any new board-rendering code. Pure TypeScript —
 * no Angular imports.
 */
import { Chess, PieceSymbol, Color } from 'chess.js';
import { Board, Piece, PieceColor, PieceType } from '../chess/engine/core/board';

const PIECE_TYPE_BY_SYMBOL: Record<PieceSymbol, PieceType> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const COLOR_BY_SYMBOL: Record<Color, PieceColor> = {
  w: 'white',
  b: 'black',
};

/** Convert a chess.js position (any board size 8×8) into the app's `Board`. */
export function chessJsToBoard(chess: Chess): Board {
  const rows = chess.board(); // rows[0] = rank 8 ... rows[7] = rank 1, each file a..h
  const board = new Array<Piece | null>(64).fill(null);

  for (let row = 0; row < 8; row++) {
    const rank = 7 - row; // our rank 0 = rank 1 (white's home rank)
    for (let file = 0; file < 8; file++) {
      const square = rows[row][file];
      if (!square) continue;
      const index = rank * 8 + file;
      board[index] = {
        type: PIECE_TYPE_BY_SYMBOL[square.type],
        color: COLOR_BY_SYMBOL[square.color],
        hasMoved: false, // unused by rendering — chess.js owns legality
      };
    }
  }

  return board;
}
