/**
 * Burn geometry for Shrinking Board Royale. Pure TypeScript — no Angular
 * imports. Rings are counted from the outside in: ring index of a square is
 * its distance to the nearest board edge; ring `burnedRings` is the next one
 * to burn.
 */

import { Square, fileOf, rankOf, square } from './core/board';

export const ROYALE_BOARD_SIZE = 15;

/**
 * Plies from the previous burn (or the start of the game) until each
 * successive ring burns. Rounds are ply-based in alternating-turn Royale
 * (one entry here is two players' worth of "a move each"). The schedule
 * starts generous — a 15×15 opening needs room to develop — then tightens
 * stage by stage as the arena shrinks, so the endgame accelerates toward
 * the final single-square core instead of dragging at a constant pace.
 */
export const BURN_SCHEDULE: readonly number[] = [24, 20, 16, 14, 12, 10, 8];

/**
 * Schedule for the smaller 8×8 hotseat Royale board. Only 3 rings can ever
 * burn there (an 8-wide board's innermost "core" is a 2×2 area, not a
 * single square — see `maxBurnedRingsFor`), and there's less room to
 * develop, so it tightens faster than the 15×15 schedule.
 */
export const BURN_SCHEDULE_8: readonly number[] = [14, 10, 8];

const BURN_SCHEDULES_BY_SIZE: ReadonlyMap<number, readonly number[]> = new Map([
  [15, BURN_SCHEDULE],
  [8, BURN_SCHEDULE_8],
]);

function scheduleFor(size: number): readonly number[] {
  return BURN_SCHEDULES_BY_SIZE.get(size) ?? BURN_SCHEDULE;
}

/** Burning stops once a single central square remains (15 − 2·7 = 1). */
export const MAX_BURNED_RINGS = BURN_SCHEDULE.length;

/** Number of rings that ever burn on a board of this size — see `scheduleFor`. */
export function maxBurnedRingsFor(size = ROYALE_BOARD_SIZE): number {
  return scheduleFor(size).length;
}

/** Cumulative round number at which each successive ring burns, per board size. */
const CUMULATIVE_ROUNDS_BY_SIZE: ReadonlyMap<number, readonly number[]> = new Map(
  Array.from(BURN_SCHEDULES_BY_SIZE.entries()).map(([size, schedule]) => {
    const cumulative: number[] = [];
    let total = 0;
    for (const delta of schedule) {
      total += delta;
      cumulative.push(total);
    }
    return [size, cumulative] as const;
  }),
);

function cumulativeRoundsFor(size: number): readonly number[] {
  return CUMULATIVE_ROUNDS_BY_SIZE.get(size)
    ?? CUMULATIVE_ROUNDS_BY_SIZE.get(ROYALE_BOARD_SIZE)!;
}

export interface IntactBounds {
  readonly min: number;
  readonly max: number;
}

/** Inclusive file/rank bounds of the intact (unburned) area. */
export function intactBounds(
  burnedRings: number,
  size = ROYALE_BOARD_SIZE,
): IntactBounds {
  return { min: burnedRings, max: size - 1 - burnedRings };
}

/** Distance of a square to the nearest board edge (0 = outermost ring). */
export function ringIndex(sq: Square, size = ROYALE_BOARD_SIZE): number {
  const file = fileOf(sq, size);
  const rank = rankOf(sq, size);
  return Math.min(file, rank, size - 1 - file, size - 1 - rank);
}

export function isVoidSquare(
  sq: Square,
  burnedRings: number,
  size = ROYALE_BOARD_SIZE,
): boolean {
  return ringIndex(sq, size) < burnedRings;
}

/** All burned (void) squares for the given burn progress. */
export function voidSquares(
  burnedRings: number,
  size = ROYALE_BOARD_SIZE,
): Square[] {
  const squares: Square[] = [];
  for (let sq = 0; sq < size * size; sq++) {
    if (isVoidSquare(sq, burnedRings, size)) squares.push(sq);
  }
  return squares;
}

/** The next ring to burn; empty once the core is reached. */
export function doomedRingSquares(
  burnedRings: number,
  size = ROYALE_BOARD_SIZE,
): Square[] {
  if (burnedRings >= maxBurnedRingsFor(size)) return [];
  const squares: Square[] = [];
  for (let sq = 0; sq < size * size; sq++) {
    if (ringIndex(sq, size) === burnedRings) squares.push(sq);
  }
  return squares;
}

/**
 * Rounds left (including the round currently being played) until the next
 * burn resolves, or null when no further burns will happen.
 */
export function roundsUntilBurn(
  round: number,
  burnedRings: number,
  size = ROYALE_BOARD_SIZE,
): number | null {
  if (burnedRings >= maxBurnedRingsFor(size)) return null;
  return cumulativeRoundsFor(size)[burnedRings] - round + 1;
}

/** True when the round that was just played ends with a ring burning. */
export function burnsAfterRound(
  round: number,
  burnedRings: number,
  size = ROYALE_BOARD_SIZE,
): boolean {
  if (burnedRings >= maxBurnedRingsFor(size)) return false;
  return round === cumulativeRoundsFor(size)[burnedRings];
}

/** Convenience for building the 15×15 royale start position's back rank. */
export function centeredBackRankFiles(size = ROYALE_BOARD_SIZE): number[] {
  const start = Math.floor((size - 8) / 2); // files 3..10 on a 15-wide board
  return Array.from({ length: 8 }, (_, i) => start + i);
}

// Re-export so UI code can compute square indices without importing core
// board helpers twice.
export { square as squareAt };
