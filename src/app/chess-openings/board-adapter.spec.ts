import * as fc from 'fast-check';
import { Chess } from 'chess.js';
import { parseSquare, pieceAt } from '../chess/engine/core/board';
import { chessJsToBoard } from './board-adapter';

const PIECE_LETTER: Record<string, string> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

/** Plays up to `count` random legal moves from the start position. */
function randomGame(count: number, seed: number): Chess {
  const chess = new Chess();
  let state = seed;
  const next = () => {
    // Simple deterministic LCG so the property is reproducible.
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state;
  };
  for (let i = 0; i < count; i++) {
    const moves = chess.moves();
    if (moves.length === 0) break;
    chess.move(moves[next() % moves.length]);
  }
  return chess;
}

describe('chessJsToBoard', () => {
  it('places the standard starting position correctly', () => {
    const board = chessJsToBoard(new Chess());
    expect(pieceAt(board, parseSquare('e1'))).toBeTruthy();
  });

  // Feature: chess-openings-trainer, Property: every chess.js square maps to
  // the same piece (type + color) on the adapted Board, for any reachable position.
  it('every occupied chess.js square round-trips to the same piece on the adapted Board', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 0, max: 1000 }), (moveCount, seed) => {
        const chess = randomGame(moveCount, seed);
        const board = chessJsToBoard(chess);

        for (const row of chess.board()) {
          for (const square of row) {
            if (!square) continue;
            const index = squareIndex(square.square);
            const piece = board[index];
            expect(piece).toBeTruthy();
            expect(PIECE_LETTER[piece!.type]).toBe(square.type);
            expect(piece!.color === 'white').toBe(square.color === 'w');
          }
        }
      }),
    );
  });

  it('leaves empty squares empty', () => {
    const board = chessJsToBoard(new Chess());
    // e4 is empty in the starting position.
    expect(board[squareIndex('e4')]).toBeNull();
  });
});

function squareIndex(name: string): number {
  const file = name.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = Number(name[1]) - 1;
  return rank * 8 + file;
}
