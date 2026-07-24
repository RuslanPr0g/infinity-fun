/**
 * Registry of Unusual Chess modes. The mode-selection screen renders from
 * this array only — adding a future mode means adding one descriptor here
 * plus one `ChessVariantEngine` implementation, with zero changes to the
 * selection UI.
 */

import { ROYALE_BOARD_SIZE } from '../engine/burn';
import { ChessVariantEngine } from '../engine/variant';
import { SimultaneousChessEngine } from '../engine/variants/simultaneous-engine';
import { ShrinkingRoyaleEngine } from '../engine/variants/shrinking-royale-engine';

/** Opponent setup handed to a mode's engineFactory when a game is started. */
export interface ModeSetup {
  readonly opponent: 'hotseat' | 'bot';
  readonly botId?: string;
  /**
   * Shrinking Royale board size chosen on the hotseat setup screen (8 or
   * 15). Ignored for bot games — bots always play on the 8×8 board.
   */
  readonly royaleBoardSize?: number;
}

/** Board size bot Royale games always use. */
const ROYALE_BOT_BOARD_SIZE = 8;

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
 * spawnOffset (rings kept clear of the border) by bot difficulty on the
 * 15×15 board — harder bots spawn you closer to the fire. Only reachable
 * for a hypothetical bot game on the full board; bots currently always
 * play the 8×8 board (see `royaleSpawnOffset`), where this kind of
 * per-difficulty spacing doesn't fit: the board is so small that any
 * offset beyond 0 starts eating into the gap between the two pawn fronts
 * (a spawnOffset of 2, which is a fine 15×15 "easy" buffer, leaves them
 * flush against each other with zero empty ranks on an 8-wide board).
 */
const ROYALE_SPAWN_OFFSET_BY_BOT_15: Record<string, number> = {
  easy: 3,
  medium: 2,
  hard: 1,
};

function royaleSpawnOffset(setup: ModeSetup | undefined, boardSize: number): number {
  // 8×8 (every bot game, plus hotseat's smaller option) always gets a
  // plain standard-chess start — see the doc comment above for why.
  if (boardSize === 8) return 0;
  if (!setup || setup.opponent !== 'bot') return 2; // 15×15 hotseat
  return ROYALE_SPAWN_OFFSET_BY_BOT_15[setup.botId ?? ''] ?? 2;
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
    tagline: 'A battlefield that burns away — outlast the fire.',
    rulesSummary: [
      'Plays like regular chess — alternating turns, one visible move at a time.',
      'No check or checkmate — capture the enemy king to win.',
      'vs Bot plays 8×8; hotseat can pick 8×8 or the full 15×15 battlefield.',
      'The outer ring eventually burns away, and each further ring burns faster than the last, shrinking the battlefield down to its core — anything caught standing on it burns too.',
      'No castling, and no passing — you may only pass when you have zero legal moves.',
    ],
    turnStyle: 'alternate',
    engineFactory: (setup) => {
      const boardSize = setup?.opponent === 'bot'
        ? ROYALE_BOT_BOARD_SIZE
        : setup?.royaleBoardSize ?? ROYALE_BOARD_SIZE;
      return new ShrinkingRoyaleEngine({
        spawnOffset: royaleSpawnOffset(setup, boardSize),
        boardSize,
      });
    },
    enabled: true,
  },
];

export function chessModeById(id: string): ChessModeDescriptor | undefined {
  return CHESS_MODES.find((mode) => mode.id === id);
}
