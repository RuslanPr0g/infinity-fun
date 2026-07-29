/**
 * Burn geometry for Shrinking Board Royale. Pure TypeScript — no Angular
 * imports. Rings are counted from the outside in: ring index of a square is
 * its distance to the nearest board edge; ring `burnedRings` is the next one
 * to burn.
 */

import { Square, fileOf, rankOf, square } from './core/board';

/**
 * 16 (not 15) so centering an 8×8 army — either the compact 'centered'
 * Royale layout or the pre-void bot margin — splits the leftover margin
 * evenly on both sides ((16-8)/2 = 4 exactly), instead of an odd 15-wide
 * board's unavoidable 3-vs-4 lopsided margin.
 */
export const ROYALE_BOARD_SIZE = 16;

/**
 * Plies from the previous burn (or the start of the game) until each
 * successive ring burns. Rounds are ply-based in alternating-turn Royale
 * (one entry here is two players' worth of "a move each"). The schedule
 * starts generous — a 16×16 opening needs room to develop — then tightens
 * stage by stage as the arena shrinks, so the endgame accelerates toward
 * the final core instead of dragging at a constant pace.
 */
export const BURN_SCHEDULE: readonly number[] = [24, 20, 16, 14, 12, 10, 8];

/** Burning stops once a 2×2 central core remains (16 − 2·7 = 2). */
export const MAX_BURNED_RINGS = BURN_SCHEDULE.length;

/** Cumulative round number at which each successive ring burns. */
const BURN_CUMULATIVE_ROUNDS: readonly number[] = (() => {
  const cumulative: number[] = [];
  let total = 0;
  for (const delta of BURN_SCHEDULE) {
    total += delta;
    cumulative.push(total);
  }
  return cumulative;
})();

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
  if (burnedRings >= MAX_BURNED_RINGS) return [];
  const squares: Square[] = [];
  for (let sq = 0; sq < size * size; sq++) {
    if (ringIndex(sq, size) === burnedRings) squares.push(sq);
  }
  return squares;
}

/**
 * Rounds left (including the round currently being played) until the next
 * burn resolves, or null when no further burns will happen.
 *
 * `startBurnedRings` is the `burnedRings` value the game started at (nonzero
 * for a pre-voided margin around a 'centered' army — see `GamePosition`):
 * the schedule's timing always counts fresh from stage 0 relative to that
 * start, not from the absolute ring index.
 */
export function roundsUntilBurn(
  round: number,
  burnedRings: number,
  startBurnedRings = 0,
): number | null {
  if (burnedRings >= MAX_BURNED_RINGS) return null;
  return BURN_CUMULATIVE_ROUNDS[burnedRings - startBurnedRings] - round + 1;
}

/** True when the round that was just played ends with a ring burning. */
export function burnsAfterRound(
  round: number,
  burnedRings: number,
  startBurnedRings = 0,
): boolean {
  if (burnedRings >= MAX_BURNED_RINGS) return false;
  return round === BURN_CUMULATIVE_ROUNDS[burnedRings - startBurnedRings];
}

/** Convenience for building the royale start position's back rank. */
export function centeredBackRankFiles(size = ROYALE_BOARD_SIZE): number[] {
  const start = Math.floor((size - 8) / 2); // files 4..11 on a 16-wide board
  return Array.from({ length: 8 }, (_, i) => start + i);
}

// Re-export so UI code can compute square indices without importing core
// board helpers twice.
export { square as squareAt };
