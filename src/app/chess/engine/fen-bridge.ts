/**
 * FEN bridge between the internal Board representation and Stockfish's UCI
 * interface. Pure TypeScript — no Angular imports.
 *
 * Standard 8×8 boards are converted verbatim.
 * Royale 15×15 boards are projected to a virtual 8×8 grid so Stockfish can
 * reason about piece positions and relationships, even though it doesn't
 * know the variant rules. The projection is lossy (collisions drop one
 * piece), which is intentional — the caller always validates the resulting
 * MoveIntent against the real variant engine and falls back to HardBot on
 * any mismatch.
 */

import {
  Board,
  PieceColor,
  PieceType,
  PromotionPiece,
  Square,
  boardSize,
  fileOf,
  rankOf,
  square,
  pieceAt,
} from './core/board';
import { MoveIntent } from './variant';

// ─── FEN piece symbols ────────────────────────────────────────────────────────

const PIECE_FEN: Record<PieceType, string> = {
  king:   'k',
  queen:  'q',
  rook:   'r',
  bishop: 'b',
  knight: 'n',
  pawn:   'p',
};

const UCI_PROMO: Record<string, PromotionPiece> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

const FILES_8 = 'abcdefgh';

/** Relative value used to resolve 15×15 → 8×8 projection collisions. */
const PIECE_VALUE: Record<PieceType, number> = {
  king: 100,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

// ─── 8×8 FEN ─────────────────────────────────────────────────────────────────

/**
 * Convert an 8×8 Board + side to move to a standard FEN string.
 * Castling rights, en-passant, and clocks are always absent (these variant
 * modes strip castling and en-passant).
 */
export function boardToFen(board: Board, sideToMove: PieceColor): string {
  const size = boardSize(board);
  const fenBoard = size === 8
    ? board
    : royaleBoardTo8x8(board);

  const rows: string[] = [];
  // FEN ranks go from 8 (top) down to 1 (bottom), i.e. rank index 7 → 0.
  for (let rank = 7; rank >= 0; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = fenBoard[rank * 8 + file];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) { row += empty; empty = 0; }
        const letter = PIECE_FEN[piece.type];
        row += piece.color === 'white' ? letter.toUpperCase() : letter;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }

  const color = sideToMove === 'white' ? 'w' : 'b';
  return `${rows.join('/')} ${color} - - 0 1`;
}

// ─── 15×15 → 8×8 projection ──────────────────────────────────────────────────

/**
 * Project a Royale 15×15 board onto a virtual 8×8 grid by linearly scaling
 * each piece's file and rank from [0,14] → [0,7].
 *
 * When two pieces map to the same 8×8 square, we keep the higher-value piece
 * (or whichever is encountered first among equals). Collisions are fine —
 * StockfishBot validates its suggestion through the real variant engine before
 * using it, and falls back to HardBot if it doesn't match any legal intent.
 */
export function royaleBoardTo8x8(board: Board): Board {
  const srcSize = boardSize(board);
  const dst = new Array<ReturnType<typeof pieceAt>>(64).fill(null);

  for (let sq = 0; sq < board.length; sq++) {
    const piece = board[sq];
    if (!piece) continue;
    const file8 = projectCoord(fileOf(sq, srcSize), srcSize);
    const rank8 = projectCoord(rankOf(sq, srcSize), srcSize);
    const dstSq = rank8 * 8 + file8;
    const existing = dst[dstSq];
    // Keep higher-value piece on collision — critical so a king is never
    // dropped in favor of a colliding pawn, which would send Stockfish a
    // FEN with a missing king (an invalid position it can't search at all).
    if (!existing || PIECE_VALUE[piece.type] > PIECE_VALUE[existing.type]) {
      dst[dstSq] = piece;
    }
  }

  return dst;
}

/** Map a coordinate in [0, srcSize-1] linearly to [0, 7]. */
function projectCoord(coord: number, srcSize: number): number {
  return Math.round((coord / (srcSize - 1)) * 7);
}

// ─── UCI move → MoveIntent ────────────────────────────────────────────────────

/**
 * Parse a UCI move string (e.g. "e2e4", "e7e8q") into a MoveIntent using
 * the board's own coordinate system.
 *
 * For standard 8×8 boards `boardSize` is 8 and the mapping is 1:1.
 * For Royale 15×15 boards the UCI square names come from the projected 8×8
 * grid, so we reverse-project them back to the nearest 15×15 square.
 *
 * Returns null on parse failure or if the from-square is empty.
 */
export function uciBestMoveToIntent(
  uciMove: string,
  board: Board,
  boardSz?: number,
): MoveIntent | null {
  const size = boardSz ?? boardSize(board);
  const match = /^([a-h])([1-8])([a-h])([1-8])([qrbn])?$/.exec(uciMove);
  if (!match) return null;

  const [, fileFrom, rankFrom, fileTo, rankTo, promoChar] = match;

  const fromSq = uciSquareToBoard(fileFrom, rankFrom, size);
  const toSq   = uciSquareToBoard(fileTo,   rankTo,   size);

  if (fromSq === null || toSq === null) return null;
  if (!pieceAt(board, fromSq)) return null;

  const promoteTo: PromotionPiece | undefined = promoChar
    ? UCI_PROMO[promoChar]
    : undefined;

  return promoteTo
    ? { kind: 'move', from: fromSq, to: toSq, promoteTo }
    : { kind: 'move', from: fromSq, to: toSq };
}

/**
 * Convert a UCI file/rank character pair to a Square index in the board's
 * own coordinate system.
 *
 * For 8×8 boards: direct algebraic mapping (a1 = 0, h8 = 63).
 * For 15×15 boards: reverse-project from the virtual 8×8 back to 15×15.
 */
function uciSquareToBoard(
  fileChar: string,
  rankChar: string,
  boardSz: number,
): Square | null {
  const file8 = FILES_8.indexOf(fileChar);
  const rank8 = Number(rankChar) - 1;
  if (file8 < 0 || rank8 < 0 || rank8 > 7) return null;

  if (boardSz === 8) {
    return rank8 * 8 + file8;
  }

  // Reverse-project 8×8 → boardSz coords (nearest integer).
  const file = Math.round((file8 / 7) * (boardSz - 1));
  const rank = Math.round((rank8 / 7) * (boardSz - 1));
  return square(file, rank, boardSz);
}
