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
   * board itself is always 16×16 either way. Ignored for bot games — bots
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
    tagline: 'Both sides move at the same time. Guess what the other will do.',
    rulesSummary: [
      'Each round, both players pick a move in secret. Then both moves happen at once.',
      'If both pieces head for the same square, both bounce back. A piece already standing there stays.',
      'If you attack a piece that just moved away, you miss. Pawns go back; other pieces still land.',
      'There is no check or checkmate. Take the enemy king to win. You may also pass.',
      'A king that is attacked and has no moves left loses right away.',
      'It is a draw if both kings fall together, or if everyone passes three rounds in a row.',
    ],
    turnStyle: 'simultaneous',
    engineFactory: () => new SimultaneousChessEngine(),
    enabled: true,
  },
  {
    id: 'shrinking-royale',
    name: 'Shrinking Royale',
    tagline: 'A 16×16 board that burns from the edges in. Survive the fire.',
    rulesSummary: [
      'Turns work like normal chess: one move each.',
      'There is no check or checkmate. Take the enemy king to win.',
      'Against a bot, the armies start in the middle. Two players can also spread them out.',
      'The outer ring of squares burns away, then the next, faster each time. Any piece on a burning square is lost.',
      'No castling. You can only pass when you have no legal move.',
    ],
    turnStyle: 'alternate',
    engineFactory: (setup) => {
      const isBot = setup?.opponent === 'bot';
      const armyLayout: RoyaleArmyLayout = isBot ? 'centered' : setup?.royaleArmyLayout ?? 'expanded';
      return new ShrinkingRoyaleEngine({
        spawnOffset: royaleSpawnOffset(setup, armyLayout),
        armyLayout,
        // Bot-only: wall off the true 16×16 border so the bot's smaller
        // effective search area can't be exploited by walking around the
        // back through the wide-open margin. Hotseat's 'centered' option
        // stays a fully walkable 16×16 board, unchanged.
        preVoidMargin: isBot,
      });
    },
    enabled: true,
  },
];

export function chessModeById(id: string): ChessModeDescriptor | undefined {
  return CHESS_MODES.find((mode) => mode.id === id);
}
