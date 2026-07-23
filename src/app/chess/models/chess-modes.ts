/**
 * Registry of Unusual Chess modes. The mode-selection screen renders from
 * this array only — adding a future mode means adding one descriptor here
 * plus one `ChessVariantEngine` implementation, with zero changes to the
 * selection UI.
 */

import { ChessVariantEngine } from '../engine/variant';
import { SimultaneousChessEngine } from '../engine/variants/simultaneous-engine';
import { ShrinkingRoyaleEngine } from '../engine/variants/shrinking-royale-engine';

/** Opponent setup handed to a mode's engineFactory when a game is started. */
export interface ModeSetup {
  readonly opponent: 'hotseat' | 'bot';
  readonly botId?: string;
}

/**
 * 'simultaneous': both players submit privately, then reveal together.
 * 'alternate': plays like regular chess — one visible move per turn.
 */
export type TurnStyle = 'simultaneous' | 'alternate';

export interface ChessModeDescriptor {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  /** Five short lines summarising the ruleset on the mode card. */
  readonly rulesSummary: ReadonlyArray<string>;
  readonly turnStyle: TurnStyle;
  readonly engineFactory: (setup?: ModeSetup) => ChessVariantEngine;
  readonly enabled: boolean;
}

/** spawnOffset (rings kept clear of the border) by bot difficulty — harder bots spawn you closer to the fire. */
const ROYALE_SPAWN_OFFSET_BY_BOT: Record<string, number> = {
  easy: 3,
  medium: 2,
  hard: 1,
};

function royaleSpawnOffset(setup?: ModeSetup): number {
  if (!setup || setup.opponent !== 'bot') return 2; // hotseat
  return ROYALE_SPAWN_OFFSET_BY_BOT[setup.botId ?? ''] ?? 2;
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
    turnStyle: 'simultaneous',
    engineFactory: () => new SimultaneousChessEngine(),
    enabled: true,
  },
  {
    id: 'shrinking-royale',
    name: 'Shrinking Royale',
    tagline: 'A 15×15 battlefield that burns away — outlast the fire.',
    rulesSummary: [
      'Plays like regular chess — alternating turns, one visible move at a time.',
      'No check or checkmate — capture the enemy king to win.',
      'Pieces spawn back from the edge; harder bots spawn your army closer to the fire.',
      'The outer ring burns away every 12 moves, shrinking the battlefield down to a 5×5 core — anything caught standing on it burns too.',
      'No castling, and no passing — you may only pass when you have zero legal moves.',
    ],
    turnStyle: 'alternate',
    engineFactory: (setup) =>
      new ShrinkingRoyaleEngine({ spawnOffset: royaleSpawnOffset(setup) }),
    enabled: true,
  },
];

export function chessModeById(id: string): ChessModeDescriptor | undefined {
  return CHESS_MODES.find((mode) => mode.id === id);
}
