import { Injectable } from '@angular/core';
import {
  BOARD_COLS,
  BOARD_ROWS,
  Cell,
  Piece,
  PieceKind,
  Successor,
} from '../models/klotski.models';

export const KIND_SIZE: Record<PieceKind, { w: number; h: number }> = {
  big: { w: 2, h: 2 },
  wide: { w: 2, h: 1 },
  tall: { w: 1, h: 2 },
  small: { w: 1, h: 1 },
};

const KIND_CHAR: Record<PieceKind, string> = {
  big: 'B',
  wide: 'W',
  tall: 'T',
  small: 's',
};

/** Row-major, 4 wide: T=tall W=wide B=big s=small .=empty. Classic "Heng Dao Li Ma". */
export const CLASSIC_KEY = 'TBBT' + 'TBBT' + 'TWWT' + 'TssT' + 's..s';

const SOLVED_KEY_INDICES = [4 * BOARD_COLS + 1, 4 * BOARD_COLS + 2];

@Injectable({ providedIn: 'root' })
export class KlotskiEngine {
  /**
   * Canonical position key. Identical pieces are interchangeable, and because
   * pieces are rectangles the key decodes back to a unique layout.
   */
  keyOf(board: readonly Piece[]): string {
    const cells = new Array<string>(BOARD_COLS * BOARD_ROWS).fill('.');
    for (const p of board) {
      const { w, h } = KIND_SIZE[p.kind];
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          cells[(p.row + r) * BOARD_COLS + p.col + c] = KIND_CHAR[p.kind];
        }
      }
    }
    return cells.join('');
  }

  boardFromKey(key: string): Piece[] {
    const covered = new Array<boolean>(key.length).fill(false);
    const pieces: Piece[] = [];
    for (let i = 0; i < key.length; i++) {
      const kind = this.kindOf(key[i]);
      if (!kind || covered[i]) continue;
      const row = Math.floor(i / BOARD_COLS);
      const col = i % BOARD_COLS;
      const { w, h } = KIND_SIZE[kind];
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          covered[(row + r) * BOARD_COLS + col + c] = true;
        }
      }
      pieces.push({ id: pieces.length, kind, row, col });
    }
    return pieces;
  }

  isSolved(board: readonly Piece[]): boolean {
    return board.some((p) => p.kind === 'big' && p.row === 3 && p.col === 1);
  }

  isSolvedKey(key: string): boolean {
    return SOLVED_KEY_INDICES.every((i) => key[i] === KIND_CHAR.big);
  }

  /** Piece id per cell, -1 when empty. */
  occupancy(board: readonly Piece[]): number[] {
    const occ = new Array<number>(BOARD_COLS * BOARD_ROWS).fill(-1);
    for (const p of board) {
      const { w, h } = KIND_SIZE[p.kind];
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          occ[(p.row + r) * BOARD_COLS + p.col + c] = p.id;
        }
      }
    }
    return occ;
  }

  /** Every cell the piece can be relocated to, sliding one cell at a time (corners allowed). */
  destinations(board: readonly Piece[], pieceId: number): Cell[] {
    return this.reach(board, this.occupancy(board), pieceId);
  }

  move(board: readonly Piece[], pieceId: number, row: number, col: number): Piece[] {
    return board.map((p) => (p.id === pieceId ? { ...p, row, col } : p));
  }

  /** All legal moves from a position, with the resulting canonical key. */
  successors(board: readonly Piece[]): Successor[] {
    const occ = this.occupancy(board);
    const out: Successor[] = [];
    for (const p of board) {
      for (const d of this.reach(board, occ, p.id)) {
        out.push({
          pieceId: p.id,
          row: d.row,
          col: d.col,
          key: this.keyOf(this.move(board, p.id, d.row, d.col)),
        });
      }
    }
    return out;
  }

  private reach(board: readonly Piece[], occ: number[], pieceId: number): Cell[] {
    const piece = board.find((p) => p.id === pieceId);
    if (!piece) return [];
    const { w, h } = KIND_SIZE[piece.kind];

    const fits = (row: number, col: number): boolean => {
      if (row < 0 || col < 0 || row + h > BOARD_ROWS || col + w > BOARD_COLS) return false;
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const o = occ[(row + r) * BOARD_COLS + col + c];
          if (o !== -1 && o !== pieceId) return false;
        }
      }
      return true;
    };

    const start = piece.row * BOARD_COLS + piece.col;
    const seen = new Set<number>([start]);
    const queue: number[] = [start];
    const out: Cell[] = [];
    for (let head = 0; head < queue.length; head++) {
      const row = Math.floor(queue[head] / BOARD_COLS);
      const col = queue[head] % BOARD_COLS;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = row + dr;
        const nc = col + dc;
        const idx = nr * BOARD_COLS + nc;
        if (seen.has(idx) || !fits(nr, nc)) continue;
        seen.add(idx);
        queue.push(idx);
        out.push({ row: nr, col: nc });
      }
    }
    return out;
  }

  private kindOf(ch: string): PieceKind | null {
    switch (ch) {
      case 'B':
        return 'big';
      case 'W':
        return 'wide';
      case 'T':
        return 'tall';
      case 's':
        return 'small';
      default:
        return null;
    }
  }
}
