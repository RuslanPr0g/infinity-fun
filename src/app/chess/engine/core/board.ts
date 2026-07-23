/**
 * Core chess board representation. Pure TypeScript — no Angular imports.
 *
 * Squares are indices 0–(size*size-1): file = sq % size (0 = 'a'), rank =
 * floor(sq / size) (0 = rank 1, White's home rank). Boards are immutable
 * arrays of size*size cells. The classic 8×8 board remains the default
 * everywhere; larger boards (e.g. 15×15 Shrinking Board Royale) carry their
 * size implicitly as board.length — see `boardSize`.
 */

export type PieceColor = 'white' | 'black';

export type PieceType =
  | 'pawn'
  | 'knight'
  | 'bishop'
  | 'rook'
  | 'queen'
  | 'king';

export type PromotionPiece = 'queen' | 'rook' | 'bishop' | 'knight';

export interface Piece {
  readonly type: PieceType;
  readonly color: PieceColor;
  readonly hasMoved: boolean;
}

export type Square = number;

export type Board = ReadonlyArray<Piece | null>;

export const BOARD_SIZE = 8;
export const SQUARE_COUNT = 64;
/** Board dimension used when no explicit size is threaded through. */
export const DEFAULT_BOARD_SIZE = 8;

export const FILES = 'abcdefghijklmno';

/** Board dimension (N of an N×N board), derived from its cell count. */
export function boardSize(board: Board): number {
  return Math.round(Math.sqrt(board.length));
}

export function square(
  file: number,
  rank: number,
  size = DEFAULT_BOARD_SIZE,
): Square {
  return rank * size + file;
}

export function fileOf(sq: Square, size = DEFAULT_BOARD_SIZE): number {
  return sq % size;
}

export function rankOf(sq: Square, size = DEFAULT_BOARD_SIZE): number {
  return Math.floor(sq / size);
}

export function isInside(
  file: number,
  rank: number,
  size = DEFAULT_BOARD_SIZE,
): boolean {
  return file >= 0 && file < size && rank >= 0 && rank < size;
}

/** 'e4' → square index. Throws on malformed input (test fixtures rely on it). */
export function parseSquare(name: string, size = DEFAULT_BOARD_SIZE): Square {
  const match = /^([a-o])(\d{1,2})$/.exec(name);
  if (!match) {
    throw new Error(`Invalid square name: ${name}`);
  }
  const file = FILES.indexOf(match[1]);
  const rank = Number(match[2]) - 1;
  if (file < 0 || file >= size || rank < 0 || rank >= size) {
    throw new Error(`Invalid square name: ${name}`);
  }
  return square(file, rank, size);
}

/** Square index → 'e4'. */
export function squareName(sq: Square, size = DEFAULT_BOARD_SIZE): string {
  return `${FILES[fileOf(sq, size)]}${rankOf(sq, size) + 1}`;
}

export function opponentOf(color: PieceColor): PieceColor {
  return color === 'white' ? 'black' : 'white';
}

export function makePiece(
  type: PieceType,
  color: PieceColor,
  hasMoved = false,
): Piece {
  return { type, color, hasMoved };
}

export function emptyBoard(): Board {
  return new Array<Piece | null>(SQUARE_COUNT).fill(null);
}

/** Empty size×size board, for variants that do not use the default 8×8. */
export function emptyBoardOf(size: number): Board {
  return new Array<Piece | null>(size * size).fill(null);
}

const BACK_RANK_ORDER: PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

export function createInitialBoard(): Board {
  const cells = new Array<Piece | null>(SQUARE_COUNT).fill(null);
  for (let file = 0; file < BOARD_SIZE; file++) {
    cells[square(file, 0)] = makePiece(BACK_RANK_ORDER[file], 'white');
    cells[square(file, 1)] = makePiece('pawn', 'white');
    cells[square(file, 6)] = makePiece('pawn', 'black');
    cells[square(file, 7)] = makePiece(BACK_RANK_ORDER[file], 'black');
  }
  return cells;
}

export function pieceAt(board: Board, sq: Square): Piece | null {
  return board[sq];
}

/** Immutable single-cell write. */
export function withPiece(
  board: Board,
  sq: Square,
  piece: Piece | null,
): Board {
  const next = board.slice();
  next[sq] = piece;
  return next;
}

/**
 * Immutable batch write — used by round resolution to apply several
 * clears/placements as one transition.
 */
export function withChanges(
  board: Board,
  changes: ReadonlyArray<{ sq: Square; piece: Piece | null }>,
): Board {
  const next = board.slice();
  for (const change of changes) {
    next[change.sq] = change.piece;
  }
  return next;
}

export function countPieces(board: Board): number {
  return board.reduce((total, cell) => (cell ? total + 1 : total), 0);
}

export function findKing(board: Board, color: PieceColor): Square | null {
  for (let sq = 0; sq < board.length; sq++) {
    const piece = board[sq];
    if (piece && piece.type === 'king' && piece.color === color) {
      return sq;
    }
  }
  return null;
}

export const PIECE_GLYPHS: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 1000,
};

export const PIECE_NAMES: Record<PieceType, string> = {
  pawn: 'Pawn',
  knight: 'Knight',
  bishop: 'Bishop',
  rook: 'Rook',
  queen: 'Queen',
  king: 'King',
};

/**
 * Test helper: build a board from a sparse placement map, e.g.
 * `boardFrom({ e1: 'wK', e8: 'bK', d5: 'wP*' })`. Piece codes are
 * color letter + piece letter (K Q R B N P); a trailing '*' marks the
 * piece as already moved.
 */
export function boardFrom(
  placements: Record<string, string>,
  size = DEFAULT_BOARD_SIZE,
): Board {
  const letterToType: Record<string, PieceType> = {
    K: 'king',
    Q: 'queen',
    R: 'rook',
    B: 'bishop',
    N: 'knight',
    P: 'pawn',
  };
  const cells = new Array<Piece | null>(size * size).fill(null);
  for (const [name, code] of Object.entries(placements)) {
    const color: PieceColor = code[0] === 'w' ? 'white' : 'black';
    const type = letterToType[code[1]];
    if (!type || (code[0] !== 'w' && code[0] !== 'b')) {
      throw new Error(`Invalid piece code: ${code}`);
    }
    cells[parseSquare(name, size)] = makePiece(type, color, code.endsWith('*'));
  }
  return cells;
}
