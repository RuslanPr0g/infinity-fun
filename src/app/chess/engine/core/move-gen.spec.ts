import {
  boardFrom,
  createInitialBoard,
  parseSquare,
  pieceAt,
  squareName,
} from './board';
import {
  Move,
  castleGeometry,
  generateAllMoves,
  generateMoves,
  isSquareAttacked,
} from './move-gen';

function targets(moves: Move[]): string[] {
  return moves.map((move) => squareName(move.to)).sort();
}

describe('Core move generation', () => {
  it('generates 20 pseudo-legal moves per side from the initial position', () => {
    const board = createInitialBoard();
    expect(generateAllMoves(board, 'white').length).toBe(20);
    expect(generateAllMoves(board, 'black').length).toBe(20);
  });

  it('blocks sliding pieces on pieces present on the board', () => {
    const board = createInitialBoard();
    expect(generateMoves(board, parseSquare('a1'))).toEqual([]);
    expect(generateMoves(board, parseSquare('c1'))).toEqual([]);
    expect(generateMoves(board, parseSquare('d1'))).toEqual([]);
  });

  it('lets sliding pieces run the full ray on an open board and stop at captures', () => {
    const board = boardFrom({ e1: 'wK', e8: 'bK', d4: 'wR', d7: 'bP' });
    const moves = generateMoves(board, parseSquare('d4'));
    expect(targets(moves)).toContain('d7');
    expect(targets(moves)).not.toContain('d8');
    const capture = moves.find((move) => squareName(move.to) === 'd7')!;
    expect(capture.isCapture).toBeTrue();
  });

  it('generates pawn single and double steps only from the start rank', () => {
    const board = boardFrom({ e1: 'wK', e8: 'bK', e2: 'wP', h4: 'wP*' });
    const fresh = generateMoves(board, parseSquare('e2'));
    expect(targets(fresh)).toEqual(['e3', 'e4']);
    expect(fresh.find((move) => squareName(move.to) === 'e4')!.isDoubleStep).toBeTrue();

    const advanced = generateMoves(board, parseSquare('h4'));
    expect(targets(advanced)).toEqual(['h5']);
  });

  it('blocks pawn pushes on occupied squares but allows diagonal captures', () => {
    const board = boardFrom({
      e1: 'wK',
      e8: 'bK',
      e4: 'wP*',
      e5: 'bN',
      d5: 'bR',
    });
    const moves = generateMoves(board, parseSquare('e4'));
    expect(targets(moves)).toEqual(['d5']);
    expect(moves[0].isCapture).toBeTrue();
  });

  it('never generates en passant', () => {
    // Black pawn just double-stepped conceptually — there is still no en
    // passant in this game, so the white pawn only sees its forward push.
    const board = boardFrom({ e1: 'wK', e8: 'bK', e5: 'wP*', d5: 'bP*' });
    const moves = generateMoves(board, parseSquare('e5'));
    expect(targets(moves)).toEqual(['e6']);
  });

  it('flags promotion on pawn moves reaching the last rank', () => {
    const board = boardFrom({ e1: 'wK', a8: 'bK', g7: 'wP*', h8: 'bR' });
    const moves = generateMoves(board, parseSquare('g7'));
    expect(moves.length).toBe(2);
    expect(moves.every((move) => move.isPromotion)).toBeTrue();
    expect(targets(moves)).toEqual(['g8', 'h8']);
  });

  it('generates both castles when king and rooks are unmoved with empty paths', () => {
    const board = boardFrom({ e1: 'wK', a1: 'wR', h1: 'wR', e8: 'bK' });
    const castles = generateMoves(board, parseSquare('e1')).filter(
      (move) => move.castle !== null,
    );
    expect(castles.length).toBe(2);
    expect(targets(castles)).toEqual(['c1', 'g1']);
  });

  it('does not generate castling when the king or rook has moved or the path is blocked', () => {
    const kingMoved = boardFrom({ e1: 'wK*', h1: 'wR', e8: 'bK' });
    expect(
      generateMoves(kingMoved, parseSquare('e1')).some((move) => move.castle),
    ).toBeFalse();

    const rookMoved = boardFrom({ e1: 'wK', h1: 'wR*', e8: 'bK' });
    expect(
      generateMoves(rookMoved, parseSquare('e1')).some((move) => move.castle),
    ).toBeFalse();

    const blocked = boardFrom({ e1: 'wK', h1: 'wR', g1: 'wN', e8: 'bK' });
    expect(
      generateMoves(blocked, parseSquare('e1')).some((move) => move.castle),
    ).toBeFalse();
  });

  it('allows castling through attacked squares — there is no check in this game', () => {
    const board = boardFrom({ e1: 'wK', h1: 'wR', f8: 'bR', e8: 'bK' });
    // f1 is attacked by the f8 rook; standard chess would forbid this castle.
    expect(isSquareAttacked(board, parseSquare('f1'), 'black')).toBeTrue();
    const castles = generateMoves(board, parseSquare('e1')).filter(
      (move) => move.castle === 'king',
    );
    expect(castles.length).toBe(1);
  });

  it('computes castle geometry paths including origin, transit, and destination', () => {
    const kingside = castleGeometry('white', 'king');
    expect(kingside.kingPath.map(squareName)).toEqual(['e1', 'f1', 'g1']);
    expect(kingside.rookPath.map(squareName)).toEqual(['h1', 'g1', 'f1']);

    const queenside = castleGeometry('black', 'queen');
    expect(queenside.kingPath.map(squareName)).toEqual(['e8', 'd8', 'c8']);
    expect(queenside.rookPath.map(squareName)).toEqual(['a8', 'b8', 'c8', 'd8']);
  });

  it('detects attacks by pawns, knights, and sliders with correct blocking', () => {
    const board = boardFrom({
      e1: 'wK',
      e8: 'bK',
      d4: 'wP',
      g4: 'bN',
      a8: 'bR',
      a4: 'wR',
    });
    expect(isSquareAttacked(board, parseSquare('e5'), 'white')).toBeTrue();
    expect(isSquareAttacked(board, parseSquare('d5'), 'white')).toBeFalse();
    expect(isSquareAttacked(board, parseSquare('e3'), 'black')).toBeTrue();
    expect(isSquareAttacked(board, parseSquare('a5'), 'black')).toBeTrue();
    expect(isSquareAttacked(board, parseSquare('a3'), 'black')).toBeFalse();
    expect(isSquareAttacked(board, parseSquare('a5'), 'white')).toBeTrue();
  });

  it('keeps boards immutable across move generation', () => {
    const board = createInitialBoard();
    const snapshot = [...board];
    generateAllMoves(board, 'white');
    generateAllMoves(board, 'black');
    expect(board).toEqual(snapshot);
    expect(pieceAt(board, parseSquare('e2'))!.type).toBe('pawn');
  });
});
