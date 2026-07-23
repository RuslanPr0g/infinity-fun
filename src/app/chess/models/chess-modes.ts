/**
 * Registry of Unusual Chess modes. The mode-selection screen renders from
 * this array only — adding a future mode means adding one descriptor here
 * plus one `ChessVariantEngine` implementation, with zero changes to the
 * selection UI.
 */

import { ChessVariantEngine } from '../engine/variant';
import { SimultaneousChessEngine } from '../engine/variants/simultaneous-engine';

export interface ChessModeDescriptor {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  /** Five short lines summarising the ruleset on the mode card. */
  readonly rulesSummary: ReadonlyArray<string>;
  readonly engineFactory: () => ChessVariantEngine;
  readonly enabled: boolean;
}

export const CHESS_MODES: ReadonlyArray<ChessModeDescriptor> = [
  {
    id: 'simultaneous',
    name: 'Simultaneous',
    tagline: 'Both sides move at once — outguess your opponent.',
    rulesSummary: [
      'Each round both players secretly pick a move; the moves reveal and resolve together.',
      'Two moves to the same square bounce back — a stationary piece there survives.',
      'Capturing a piece that just moved away whiffs: pawns bounce home, others land.',
      'No check or checkmate — capture the enemy king to win. Passing is a legal move.',
      'Both kings falling together is a draw, as are three all-pass rounds in a row.',
    ],
    engineFactory: () => new SimultaneousChessEngine(),
    enabled: true,
  },
];

export function chessModeById(id: string): ChessModeDescriptor | undefined {
  return CHESS_MODES.find((mode) => mode.id === id);
}
