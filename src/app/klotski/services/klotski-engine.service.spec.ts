import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { BOARD_COLS, BOARD_ROWS, Piece } from '../models/klotski.models';
import { CLASSIC_KEY, KIND_SIZE, KlotskiEngine } from './klotski-engine.service';

describe('KlotskiEngine', () => {
  let engine: KlotskiEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(KlotskiEngine);
  });

  /** Random walk through the state space, picking successor `choices[i] % count` each step. */
  function walk(choices: number[]): Piece[][] {
    let board = engine.boardFromKey(CLASSIC_KEY);
    const visited = [board];
    for (const c of choices) {
      const moves = engine.successors(board);
      const m = moves[c % moves.length];
      board = engine.move(board, m.pieceId, m.row, m.col);
      visited.push(board);
    }
    return visited;
  }

  it('decodes the classic layout into 10 pieces', () => {
    const board = engine.boardFromKey(CLASSIC_KEY);
    expect(board.length).toBe(10);
    expect(board.filter((p) => p.kind === 'tall').length).toBe(4);
    expect(board.filter((p) => p.kind === 'small').length).toBe(4);
    expect(board.filter((p) => p.kind === 'big').length).toBe(1);
    expect(board.filter((p) => p.kind === 'wide').length).toBe(1);
  });

  it('classic layout is not solved, but a big block at the exit is', () => {
    expect(engine.isSolved(engine.boardFromKey(CLASSIC_KEY))).toBeFalse();
    expect(engine.isSolvedKey(CLASSIC_KEY)).toBeFalse();
    const solvedKey = 'TWWT' + 'TssT' + 'T..T' + 'TBBT' + 'sBBs';
    expect(engine.isSolvedKey(solvedKey)).toBeTrue();
    expect(engine.isSolved(engine.boardFromKey(solvedKey))).toBeTrue();
  });

  // Feature: klotski, Property 1: key round-trips through decode/encode on every reachable position
  it('keyOf(boardFromKey(key)) === key along random walks', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { maxLength: 40 }), (choices) => {
        for (const board of walk(choices)) {
          const key = engine.keyOf(board);
          expect(engine.keyOf(engine.boardFromKey(key))).toBe(key);
        }
      }),
      { numRuns: 50 },
    );
  });

  // Feature: klotski, Property 2: pieces never overlap or leave the board; exactly 2 cells stay empty
  it('keeps the board valid after any sequence of legal moves', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { maxLength: 40 }), (choices) => {
        for (const board of walk(choices)) {
          const occ = new Array<number>(BOARD_COLS * BOARD_ROWS).fill(0);
          for (const p of board) {
            const { w, h } = KIND_SIZE[p.kind];
            expect(p.row).toBeGreaterThanOrEqual(0);
            expect(p.col).toBeGreaterThanOrEqual(0);
            expect(p.row + h).toBeLessThanOrEqual(BOARD_ROWS);
            expect(p.col + w).toBeLessThanOrEqual(BOARD_COLS);
            for (let r = 0; r < h; r++) {
              for (let c = 0; c < w; c++) occ[(p.row + r) * BOARD_COLS + p.col + c]++;
            }
          }
          expect(occ.every((n) => n <= 1)).toBeTrue();
          expect(occ.filter((n) => n === 0).length).toBe(2);
        }
      }),
      { numRuns: 50 },
    );
  });

  // Feature: klotski, Property 3: every move can be undone, so the state graph is undirected
  it('every successor has the original position among its own successors', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { maxLength: 30 }), (choices) => {
        const board = walk(choices).at(-1)!;
        const key = engine.keyOf(board);
        for (const m of engine.successors(board)) {
          const next = engine.boardFromKey(m.key);
          expect(engine.successors(next).some((s) => s.key === key)).toBeTrue();
        }
      }),
      { numRuns: 30 },
    );
  });

  it('allows a piece to turn a corner within one move', () => {
    // Small piece at bottom-left can reach the empty cells, including the one diagonal to it.
    const board = engine.boardFromKey(CLASSIC_KEY);
    const smallBottomLeft = board.find((p) => p.kind === 'small' && p.row === 4 && p.col === 0)!;
    const dests = engine.destinations(board, smallBottomLeft.id);
    expect(dests).toContain(jasmine.objectContaining({ row: 4, col: 1 }));
    expect(dests).toContain(jasmine.objectContaining({ row: 4, col: 2 }));
  });
});
