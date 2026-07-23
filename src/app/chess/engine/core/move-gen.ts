/**
 * Pseudo-legal move generation. Pure TypeScript — no Angular imports.
 *
 * Generates standard piece movement against a static board: sliding paths,
 * pawn single/double steps and diagonal captures, promotion flags, and
 * castling (king + rook unmoved, squares between empty). It knows nothing
 * about turn order, check, or win conditions — variant engines own those.
 * There is no en passant anywhere in this game.
 */

import {
  BOARD_SIZE,
  Board,
  Piece,
  PieceColor,
  Square,
  fileOf,
  isInside,
  pieceAt,
  rankOf,
  square,
} from './board';

export type CastleSide = 'king' | 'queen';

export interface Move {
  readonly from: Square;
  readonly to: Square;
  /** Destination held an enemy piece when the move was generated. */
  readonly isCapture: boolean;
  readonly isDoubleStep: boolean;
  /** Pawn reaching the last rank; the promotion piece is chosen at intent time. */
  readonly isPromotion: boolean;
  readonly castle: CastleSide | null;
}

export interface CastleGeometry {
  readonly kingFrom: Square;
  readonly kingTo: Square;
  readonly rookFrom: Square;
  readonly rookTo: Square;
  /** Squares the king occupies during the castle: origin, transit, destination. */
  readonly kingPath: ReadonlyArray<Square>;
  /** Squares the rook occupies during the castle: origin, transit, destination. */
  readonly rookPath: ReadonlyArray<Square>;
  /** Squares strictly between king and rook that must be empty. */
  readonly between: ReadonlyArray<Square>;
}

const KNIGHT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const ROOK_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const BISHOP_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function castleGeometry(
  color: PieceColor,
  side: CastleSide,
): CastleGeometry {
  const rank = color === 'white' ? 0 : 7;
  if (side === 'king') {
    return {
      kingFrom: square(4, rank),
      kingTo: square(6, rank),
      rookFrom: square(7, rank),
      rookTo: square(5, rank),
      kingPath: [square(4, rank), square(5, rank), square(6, rank)],
      rookPath: [square(7, rank), square(6, rank), square(5, rank)],
      between: [square(5, rank), square(6, rank)],
    };
  }
  return {
    kingFrom: square(4, rank),
    kingTo: square(2, rank),
    rookFrom: square(0, rank),
    rookTo: square(3, rank),
    kingPath: [square(4, rank), square(3, rank), square(2, rank)],
    rookPath: [square(0, rank), square(1, rank), square(2, rank), square(3, rank)],
    between: [square(1, rank), square(2, rank), square(3, rank)],
  };
}

function makeMove(
  from: Square,
  to: Square,
  overrides: Partial<Move> = {},
): Move {
  return {
    from,
    to,
    isCapture: false,
    isDoubleStep: false,
    isPromotion: false,
    castle: null,
    ...overrides,
  };
}

function stepMoves(
  board: Board,
  from: Square,
  piece: Piece,
  offsets: ReadonlyArray<readonly [number, number]>,
): Move[] {
  const moves: Move[] = [];
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of offsets) {
    const f = file + df;
    const r = rank + dr;
    if (!isInside(f, r)) continue;
    const to = square(f, r);
    const occupant = pieceAt(board, to);
    if (occupant && occupant.color === piece.color) continue;
    moves.push(makeMove(from, to, { isCapture: occupant !== null }));
  }
  return moves;
}

function slidingMoves(
  board: Board,
  from: Square,
  piece: Piece,
  directions: ReadonlyArray<readonly [number, number]>,
): Move[] {
  const moves: Move[] = [];
  const file = fileOf(from);
  const rank = rankOf(from);
  for (const [df, dr] of directions) {
    for (let step = 1; step < BOARD_SIZE; step++) {
      const f = file + df * step;
      const r = rank + dr * step;
      if (!isInside(f, r)) break;
      const to = square(f, r);
      const occupant = pieceAt(board, to);
      if (occupant) {
        if (occupant.color !== piece.color) {
          moves.push(makeMove(from, to, { isCapture: true }));
        }
        break;
      }
      moves.push(makeMove(from, to));
    }
  }
  return moves;
}

function pawnMoves(board: Board, from: Square, piece: Piece): Move[] {
  const moves: Move[] = [];
  const direction = piece.color === 'white' ? 1 : -1;
  const startRank = piece.color === 'white' ? 1 : 6;
  const lastRank = piece.color === 'white' ? 7 : 0;
  const file = fileOf(from);
  const rank = rankOf(from);

  const oneAheadRank = rank + direction;
  if (isInside(file, oneAheadRank)) {
    const oneAhead = square(file, oneAheadRank);
    if (!pieceAt(board, oneAhead)) {
      moves.push(
        makeMove(from, oneAhead, { isPromotion: oneAheadRank === lastRank }),
      );
      const twoAheadRank = rank + direction * 2;
      if (rank === startRank && !pieceAt(board, square(file, twoAheadRank))) {
        moves.push(makeMove(from, square(file, twoAheadRank), { isDoubleStep: true }));
      }
    }
    for (const df of [-1, 1]) {
      const f = file + df;
      if (!isInside(f, oneAheadRank)) continue;
      const to = square(f, oneAheadRank);
      const occupant = pieceAt(board, to);
      if (occupant && occupant.color !== piece.color) {
        moves.push(
          makeMove(from, to, {
            isCapture: true,
            isPromotion: oneAheadRank === lastRank,
          }),
        );
      }
    }
  }
  return moves;
}

function castleMoves(board: Board, from: Square, piece: Piece): Move[] {
  const moves: Move[] = [];
  if (piece.hasMoved) return moves;
  for (const side of ['king', 'queen'] as CastleSide[]) {
    const geometry = castleGeometry(piece.color, side);
    if (from !== geometry.kingFrom) continue;
    const rook = pieceAt(board, geometry.rookFrom);
    if (!rook || rook.type !== 'rook' || rook.color !== piece.color || rook.hasMoved) {
      continue;
    }
    if (geometry.between.some((sq) => pieceAt(board, sq) !== null)) continue;
    moves.push(makeMove(from, geometry.kingTo, { castle: side }));
  }
  return moves;
}

/** Pseudo-legal moves for the piece standing on `from`. Empty if no piece. */
export function generateMoves(board: Board, from: Square): Move[] {
  const piece = pieceAt(board, from);
  if (!piece) return [];
  switch (piece.type) {
    case 'pawn':
      return pawnMoves(board, from, piece);
    case 'knight':
      return stepMoves(board, from, piece, KNIGHT_OFFSETS);
    case 'bishop':
      return slidingMoves(board, from, piece, BISHOP_DIRECTIONS);
    case 'rook':
      return slidingMoves(board, from, piece, ROOK_DIRECTIONS);
    case 'queen':
      return [
        ...slidingMoves(board, from, piece, ROOK_DIRECTIONS),
        ...slidingMoves(board, from, piece, BISHOP_DIRECTIONS),
      ];
    case 'king':
      return [
        ...stepMoves(board, from, piece, KING_OFFSETS),
        ...castleMoves(board, from, piece),
      ];
  }
}

export function generateAllMoves(board: Board, color: PieceColor): Move[] {
  const moves: Move[] = [];
  for (let sq = 0; sq < board.length; sq++) {
    const piece = board[sq];
    if (piece && piece.color === color) {
      moves.push(...generateMoves(board, sq));
    }
  }
  return moves;
}

/** True if any piece of `byColor` attacks `target` on the given static board. */
export function isSquareAttacked(
  board: Board,
  target: Square,
  byColor: PieceColor,
): boolean {
  const targetFile = fileOf(target);
  const targetRank = rankOf(target);

  const pawnDirection = byColor === 'white' ? 1 : -1;
  for (const df of [-1, 1]) {
    const f = targetFile + df;
    const r = targetRank - pawnDirection;
    if (isInside(f, r)) {
      const piece = pieceAt(board, square(f, r));
      if (piece && piece.color === byColor && piece.type === 'pawn') return true;
    }
  }

  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = targetFile + df;
    const r = targetRank + dr;
    if (isInside(f, r)) {
      const piece = pieceAt(board, square(f, r));
      if (piece && piece.color === byColor && piece.type === 'knight') return true;
    }
  }

  for (const [df, dr] of KING_OFFSETS) {
    const f = targetFile + df;
    const r = targetRank + dr;
    if (isInside(f, r)) {
      const piece = pieceAt(board, square(f, r));
      if (piece && piece.color === byColor && piece.type === 'king') return true;
    }
  }

  const slideChecks: ReadonlyArray<{
    directions: ReadonlyArray<readonly [number, number]>;
    types: ReadonlyArray<Piece['type']>;
  }> = [
    { directions: ROOK_DIRECTIONS, types: ['rook', 'queen'] },
    { directions: BISHOP_DIRECTIONS, types: ['bishop', 'queen'] },
  ];
  for (const { directions, types } of slideChecks) {
    for (const [df, dr] of directions) {
      for (let step = 1; step < BOARD_SIZE; step++) {
        const f = targetFile + df * step;
        const r = targetRank + dr * step;
        if (!isInside(f, r)) break;
        const piece = pieceAt(board, square(f, r));
        if (!piece) continue;
        if (piece.color === byColor && types.includes(piece.type)) return true;
        break;
      }
    }
  }
  return false;
}
