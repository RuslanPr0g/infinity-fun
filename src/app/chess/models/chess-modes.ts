/**
 * Registry of Unusual Chess modes. The mode-selection screen renders from
 * this array only — adding a future mode means adding one descriptor here
 * plus one `ChessVariantEngine` implementation, with zero changes to the
 * selection UI.
 */

import { ChessVariantEngine } from '../engine/variant';
import { SimultaneousChessEngine } from '../engine/variants/simultaneous-engine';
import {
  RoyaleArmyLayout,
  ShrinkingRoyaleEngine,
} from '../engine/variants/shrinking-royale-engine';

/** Opponent setup handed to a mode's engineFactory when a game is started. */
export interface ModeSetup {
  readonly opponent: 'hotseat' | 'bot';
  readonly botId?: string;
  /**
   * Shrinking Royale starting-army layout chosen on the hotseat setup
   * screen ('centered' 8×8 army or the full 'expanded' battlefield). The
   * board itself is always 15×15 either way. Ignored for bot games — bots
   * always use the 'centered' layout.
   */
  readonly royaleArmyLayout?: RoyaleArmyLayout;
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

/**
 * spawnOffset (rings kept clear of the border) by bot difficulty for the
 * 'expanded' layout — harder bots spawn you closer to the fire. Bots
 * currently always use the 'centered' layout instead (see
 * `royaleSpawnOffset`), so this only applies to a hypothetical bot game
 * using 'expanded'.
 */
const ROYALE_SPAWN_OFFSET_BY_BOT: Record<string, number> = {
  easy: 3,
  medium: 2,
  hard: 1,
};

function royaleSpawnOffset(setup: ModeSetup | undefined, armyLayout: RoyaleArmyLayout): number {
  if (armyLayout === 'centered') return 0; // spawnOffset is unused by the centered layout
  if (!setup || setup.opponent !== 'bot') return 2; // hotseat 'expanded'
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
      'Exception: a king with zero legal moves left, while under attack, loses immediately.',
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
      'vs Bot starts with a compact 8×8 army centered on the board; hotseat can pick that or the full expanded layout.',
      'The outer ring eventually burns away, and each further ring burns faster than the last, shrinking the battlefield down to one final square — anything caught standing on it burns too.',
      'No castling, and no passing — you may only pass when you have zero legal moves.',
    ],
    turnStyle: 'alternate',
    engineFactory: (setup) => {
      const armyLayout: RoyaleArmyLayout = setup?.opponent === 'bot'
        ? 'centered'
        : setup?.royaleArmyLayout ?? 'expanded';
      return new ShrinkingRoyaleEngine({
        spawnOffset: royaleSpawnOffset(setup, armyLayout),
        armyLayout,
      });
    },
    enabled: true,
  },
];

export function chessModeById(id: string): ChessModeDescriptor | undefined {
  return CHESS_MODES.find((mode) => mode.id === id);
}
