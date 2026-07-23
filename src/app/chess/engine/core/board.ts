/**
 * Core chess board representation. Pure TypeScript — no Angular imports.
 *
 * Squares are indices 0–63: file = sq % 8 (0 = 'a'), rank = floor(sq / 8)
 * (0 = rank 1, White's home rank). Boards are immutable arrays of 64 cells.
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

export const FILES = 'abcdefgh';

export function square(file: number, rank: number): Square {
  return rank * BOARD_SIZE + file;
}

export function fileOf(sq: Square): number {
  return sq % BOARD_SIZE;
}

export function rankOf(sq: Square): number {
  return Math.floor(sq / BOARD_SIZE);
}

export function isInside(file: number, rank: number): boolean {
  return file >= 0 && file < BOARD_SIZE && rank >= 0 && rank < BOARD_SIZE;
}

/** 'e4' → square index. Throws on malformed input (test fixtures rely on it). */
export function parseSquare(name: string): Square {
  const file = FILES.indexOf(name[0]);
  const rank = Number(name[1]) - 1;
  if (name.length !== 2 || file < 0 || rank < 0 || rank >= BOARD_SIZE) {
    throw new Error(`Invalid square name: ${name}`);
  }
  return square(file, rank);
}

/** Square index → 'e4'. */
export function squareName(sq: Square): string {
  return `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
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
  for (let sq = 0; sq < SQUARE_COUNT; sq++) {
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
export function boardFrom(placements: Record<string, string>): Board {
  const letterToType: Record<string, PieceType> = {
    K: 'king',
    Q: 'queen',
    R: 'rook',
    B: 'bishop',
    N: 'knight',
    P: 'pawn',
  };
  const cells = new Array<Piece | null>(SQUARE_COUNT).fill(null);
  for (const [name, code] of Object.entries(placements)) {
    const color: PieceColor = code[0] === 'w' ? 'white' : 'black';
    const type = letterToType[code[1]];
    if (!type || (code[0] !== 'w' && code[0] !== 'b')) {
      throw new Error(`Invalid piece code: ${code}`);
    }
    cells[parseSquare(name)] = makePiece(type, color, code.endsWith('*'));
  }
  return cells;
}
