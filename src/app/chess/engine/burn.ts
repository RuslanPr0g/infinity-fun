/**
 * Burn geometry for Shrinking Board Royale. Pure TypeScript — no Angular
 * imports. Rings are counted from the outside in: ring index of a square is
 * its distance to the nearest board edge; ring `burnedRings` is the next one
 * to burn.
 */

import { Square, fileOf, rankOf, square } from './core/board';

export const ROYALE_BOARD_SIZE = 15;
/** A ring burns at the end of every BURN_INTERVAL-th round. */
export const BURN_INTERVAL = 6;
/** Burning stops once the intact core is 5×5 (15 − 2·5). */
export const MAX_BURNED_RINGS = 5;

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
 */
export function roundsUntilBurn(
  round: number,
  burnedRings: number,
): number | null {
  if (burnedRings >= MAX_BURNED_RINGS) return null;
  return BURN_INTERVAL - ((round - 1) % BURN_INTERVAL);
}

/** True when the round that was just played ends with a ring burning. */
export function burnsAfterRound(round: number, burnedRings: number): boolean {
  return burnedRings < MAX_BURNED_RINGS && round % BURN_INTERVAL === 0;
}

/** Convenience for building the 15×15 royale start position's back rank. */
export function centeredBackRankFiles(size = ROYALE_BOARD_SIZE): number[] {
  const start = Math.floor((size - 8) / 2); // files 3..10 on a 15-wide board
  return Array.from({ length: 8 }, (_, i) => start + i);
}

// Re-export so UI code can compute square indices without importing core
// board helpers twice.
export { square as squareAt };
