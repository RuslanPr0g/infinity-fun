/**
 * Unit tests for the FEN bridge utilities.
 */

import {
  boardFrom,
  createInitialBoard,
  emptyBoardOf,
  makePiece,
  parseSquare,
  square,
} from './core/board';
import { boardToFen, royaleBoardTo8x8, uciBestMoveToIntent } from './fen-bridge';

// ─── boardToFen ───────────────────────────────────────────────────────────────

describe('boardToFen', () => {
  it('produces the correct FEN for the standard starting position', () => {
    const fen = boardToFen(createInitialBoard(), 'white');
    expect(fen).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1',
    );
  });

  it('produces correct FEN for black to move', () => {
    const fen = boardToFen(createInitialBoard(), 'black');
    expect(fen).toContain(' b - - 0 1');
  });

  it('handles an empty board', () => {
    const fen = boardToFen(new Array(64).fill(null), 'white');
    expect(fen).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
  });

  it('encodes a single white king correctly', () => {
    const board = boardFrom({ e1: 'wK' });
    const fen = boardToFen(board, 'white');
    // Rank 1 = index 0 row in the board, FEN rank 1 is last row of FEN string.
    // e1 is file 4 (e), rank 0 → FEN row 8 (last).
    expect(fen).toContain('4K3');
  });

  it('encodes a position after 1.e4 correctly', () => {
    const board = boardFrom({
      a1: 'wR', b1: 'wN', c1: 'wB', d1: 'wQ', e1: 'wK', f1: 'wB', g1: 'wN', h1: 'wR',
      a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
      e4: 'wP*',
      a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP',
      a8: 'bR', b8: 'bN', c8: 'bB', d8: 'bQ', e8: 'bK', f8: 'bB', g8: 'bN', h8: 'bR',
    });
    const fen = boardToFen(board, 'black');
    expect(fen).toBe(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b - - 0 1',
    );
  });

  it('projects a 15×15 board to 8×8 without crashing', () => {
    // King on a1 (sq 0) of a 15×15 board → should project to a1 of 8×8.
    const board = emptyBoardOf(15);
    const mutable = board.slice();
    mutable[0] = makePiece('king', 'white');
    mutable[15 * 14 + 14] = makePiece('king', 'black'); // h15 equivalent corner
    const fen = boardToFen(mutable, 'white');
    expect(fen).toMatch(/^[rnbqkpRNBQKP1-8\/]+ [wb] - - 0 1$/);
    expect(fen).not.toBe('8/8/8/8/8/8/8/8 w - - 0 1'); // not empty
  });
});

// ─── royaleBoardTo8x8 ─────────────────────────────────────────────────────────

describe('royaleBoardTo8x8', () => {
  it('returns a board of length 64', () => {
    const board = emptyBoardOf(15);
    expect(royaleBoardTo8x8(board).length).toBe(64);
  });

  it('maps a piece at (0,0) on 15×15 to (0,0) on 8×8', () => {
    const board = emptyBoardOf(15);
    const mutable = board.slice();
    mutable[0] = makePiece('king', 'white');
    const projected = royaleBoardTo8x8(mutable);
    expect(projected[0]?.type).toBe('king');
  });

  it('maps a piece at the center of 15×15 to the center of 8×8', () => {
    // Center of 15×15 is (7,7) = sq 7*15+7 = 112.
    // projectCoord(7, 15) = round(7/14*7) = round(3.5) = 4 → projected (4,4) = 4*8+4 = 36.
    const board = emptyBoardOf(15);
    const mutable = board.slice();
    mutable[7 * 15 + 7] = makePiece('queen', 'black');
    const projected = royaleBoardTo8x8(mutable);
    expect(projected[4 * 8 + 4]?.type).toBe('queen');
  });

  it('maps corner (14,14) on 15×15 to corner (7,7) on 8×8', () => {
    const board = emptyBoardOf(15);
    const mutable = board.slice();
    mutable[14 * 15 + 14] = makePiece('rook', 'black');
    const projected = royaleBoardTo8x8(mutable);
    expect(projected[7 * 8 + 7]?.type).toBe('rook');
  });

  it('keeps the king when it collides with a pawn on the same projected square', () => {
    // Royale's default spawn: rank 11 (pawn) and rank 12 (king) both project
    // to row 6 — round(11/14*7)=6 and round(12/14*7)=6 — on the same file.
    // Losing the king here means Stockfish gets a FEN with no black king,
    // an invalid position it can't search (always "depth 0 score cp 0").
    const board = emptyBoardOf(15);
    const mutable = board.slice();
    mutable[11 * 15 + 4] = makePiece('pawn', 'black');
    mutable[12 * 15 + 4] = makePiece('king', 'black');
    const projected = royaleBoardTo8x8(mutable);
    const projectedFile = Math.round((4 / 14) * 7);
    expect(projected[6 * 8 + projectedFile]?.type).toBe('king');
  });
});

// ─── uciBestMoveToIntent ──────────────────────────────────────────────────────

describe('uciBestMoveToIntent', () => {
  it('parses a simple pawn push e2e4', () => {
    const board = boardFrom({ e2: 'wP', e1: 'wK', e8: 'bK' });
    const intent = uciBestMoveToIntent('e2e4', board);
    expect(intent).toEqual({
      kind: 'move',
      from: parseSquare('e2'),
      to: parseSquare('e4'),
    });
  });

  it('parses a queen promotion e7e8q', () => {
    const board = boardFrom({ e7: 'wP*', e1: 'wK', e8: 'bK' });
    const intent = uciBestMoveToIntent('e7e8q', board);
    expect(intent).toEqual({
      kind: 'move',
      from: parseSquare('e7'),
      to: parseSquare('e8'),
      promoteTo: 'queen',
    });
  });

  it('parses a rook promotion with promoteTo rook', () => {
    const board = boardFrom({ a7: 'wP*', e1: 'wK', e8: 'bK' });
    const intent = uciBestMoveToIntent('a7a8r', board);
    expect(intent?.kind).toBe('move');
    if (intent?.kind === 'move') expect(intent.promoteTo).toBe('rook');
  });

  it('parses a knight promotion', () => {
    const board = boardFrom({ b7: 'wP*', e1: 'wK', e8: 'bK' });
    const intent = uciBestMoveToIntent('b7b8n', board);
    expect(intent?.kind).toBe('move');
    if (intent?.kind === 'move') expect(intent.promoteTo).toBe('knight');
  });

  it('returns null for a malformed move string', () => {
    const board = boardFrom({ e1: 'wK', e8: 'bK' });
    expect(uciBestMoveToIntent('', board)).toBeNull();
    expect(uciBestMoveToIntent('e2', board)).toBeNull();
    expect(uciBestMoveToIntent('e9e4', board)).toBeNull();
  });

  it('returns null when the from-square is empty', () => {
    const board = boardFrom({ e1: 'wK', e8: 'bK' });
    // d4 is empty
    expect(uciBestMoveToIntent('d4d5', board)).toBeNull();
  });

  it('reverse-projects correctly for a 15×15 board (corner piece)', () => {
    // Place a king at square 0 (a1) on a 15×15 board.
    // UCI "a1a2" should map back to (0,0)→(0,1) in 15×15 coords.
    const board = emptyBoardOf(15);
    const mutable = board.slice();
    mutable[square(0, 0, 15)] = makePiece('king', 'white');
    const intent = uciBestMoveToIntent('a1a2', mutable, 15);
    expect(intent).not.toBeNull();
    expect(intent?.kind).toBe('move');
    if (intent?.kind === 'move') {
      expect(intent.from).toBe(square(0, 0, 15));
    }
  });
});
