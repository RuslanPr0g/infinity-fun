/**
 * FEN bridge between the internal Board representation and Stockfish's UCI
 * interface. Pure TypeScript — no Angular imports.
 *
 * Standard 8×8 boards are converted verbatim.
 * Royale 15×15 boards need to fit through Stockfish's 8×8 window somehow —
 * two strategies, tried in order:
 *  1. Window crop: if both kings sit within any 8×8 square, crop that region
 *     1:1 (exact squares, no distortion) so Stockfish sees the actual local
 *     tactics at full resolution. Pieces outside the window are simply
 *     absent from the FEN.
 *  2. Whole-board scale: if the kings are farther apart than 8×8 can span
 *     (typical early game, before any rings have burned), fall back to
 *     linearly scaling every piece's coordinates down to 8×8. Lossy —
 *     collisions keep the higher-value piece so a king is never dropped in
 *     favor of a pawn — but it's the only way to give Stockfish *a* legal
 *     position when the real board is simply too spread out to window.
 * Either way the caller always validates the resulting MoveIntent against
 * the real variant engine and falls back to HardBot on any mismatch.
 */

import {
  Board,
  Piece,
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
  const fenBoard = size === 8 ? board : projectRoyaleBoard(board, size);

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

interface Window {
  readonly fileOrigin: number;
  readonly rankOrigin: number;
}

/** Pick either the window-crop or whole-board-scale projection for this board. */
function projectRoyaleBoard(board: Board, size: number): Board {
  const window = royaleWindow(board, size);
  return window ? royaleBoardToWindow(board, size, window) : royaleBoardTo8x8(board);
}

/**
 * Find an 8×8 window (in the board's own coordinates) that contains both
 * kings, if one exists. Returns null when the kings are farther apart than
 * 8 squares on either axis — no window can hold them both, so the caller
 * must fall back to whole-board scaling instead.
 */
function royaleWindow(board: Board, size: number): Window | null {
  let whiteKing = -1;
  let blackKing = -1;
  for (let sq = 0; sq < board.length; sq++) {
    const piece = board[sq];
    if (piece?.type !== 'king') continue;
    if (piece.color === 'white') whiteKing = sq;
    else blackKing = sq;
  }
  if (whiteKing < 0 || blackKing < 0) return null;

  const minFile = Math.min(fileOf(whiteKing, size), fileOf(blackKing, size));
  const maxFile = Math.max(fileOf(whiteKing, size), fileOf(blackKing, size));
  const minRank = Math.min(rankOf(whiteKing, size), rankOf(blackKing, size));
  const maxRank = Math.max(rankOf(whiteKing, size), rankOf(blackKing, size));
  if (maxFile - minFile > 7 || maxRank - minRank > 7) return null;

  const maxOrigin = size - 8;
  return {
    fileOrigin: pickOrigin(minFile, maxFile, maxOrigin),
    rankOrigin: pickOrigin(minRank, maxRank, maxOrigin),
  };
}

/** Any origin in [max(0, maxC-7), min(maxOrigin, minC)] keeps both coords in-window; center it. */
function pickOrigin(minC: number, maxC: number, maxOrigin: number): number {
  const lower = Math.max(0, maxC - 7);
  const upper = Math.min(maxOrigin, minC);
  return Math.round((lower + upper) / 2);
}

/** Crop an 8×8 window out of a larger board 1:1 — no scaling, exact squares. */
function royaleBoardToWindow(board: Board, size: number, window: Window): Board {
  const dst = new Array<Piece | null>(64).fill(null);
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      dst[r * 8 + f] = board[square(window.fileOrigin + f, window.rankOrigin + r, size)];
    }
  }
  return dst;
}

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

  const fromSq = uciSquareToBoard(fileFrom, rankFrom, size, board);
  const toSq   = uciSquareToBoard(fileTo,   rankTo,   size, board);

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
 * For 15×15 boards: mirrors whichever projection `boardToFen` used for this
 * same board — a window-crop offset if both kings fit an 8×8 window, or the
 * whole-board scale reversed (nearest integer) otherwise.
 */
function uciSquareToBoard(
  fileChar: string,
  rankChar: string,
  boardSz: number,
  board: Board,
): Square | null {
  const file8 = FILES_8.indexOf(fileChar);
  const rank8 = Number(rankChar) - 1;
  if (file8 < 0 || rank8 < 0 || rank8 > 7) return null;

  if (boardSz === 8) {
    return rank8 * 8 + file8;
  }

  const window = royaleWindow(board, boardSz);
  if (window) {
    const file = window.fileOrigin + file8;
    const rank = window.rankOrigin + rank8;
    return file < boardSz && rank < boardSz ? square(file, rank, boardSz) : null;
  }

  // Reverse the whole-board scale projection (nearest integer).
  const file = Math.round((file8 / 7) * (boardSz - 1));
  const rank = Math.round((rank8 / 7) * (boardSz - 1));
  return square(file, rank, boardSz);
}
