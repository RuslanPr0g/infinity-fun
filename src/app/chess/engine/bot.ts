/**
 * Bot contract + typed difficulty registry. Adding a future difficulty means
 * implementing `ChessBot` and appending one entry to `BOT_DIFFICULTIES` —
 * the opponent-select UI renders from this list only.
 *
 * Pure TypeScript — no Angular imports.
 * Note: The 'stockfish' entry has no `create` factory here because
 * StockfishBot requires an injected StockfishService. ChessSessionService
 * handles its construction directly when botId === 'stockfish'.
 */

import { PieceColor } from './core/board';
import { ChessVariantEngine, GamePosition, MoveIntent } from './variant';
import { EasyBot } from './bots/easy-bot';
import { MediumBot } from './bots/medium-bot';
import { HardBot } from './bots/hard-bot';

export interface ChessBot {
  readonly id: string;
  readonly name: string;
  /**
   * Choose an intent for `color` from the start-of-round `position`.
   * The bot never sees the opponent's pending move for the round — it is
   * given the same position the human chooses from.
   */
  chooseMove(
    position: GamePosition,
    color: PieceColor,
    engine: ChessVariantEngine,
  ): MoveIntent;
}

export interface BotDifficulty {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly create: () => ChessBot;
}

export const BOT_DIFFICULTIES: ReadonlyArray<BotDifficulty> = [
  {
    id: 'easy',
    name: 'Easy',
    description: 'Likes safe captures, keeps its king out of danger, and mixes things up.',
    create: () => new EasyBot(),
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Weighs hanging pieces and board position before committing to a move.',
    create: () => new MediumBot(),
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Looks a move ahead, pricing in your most likely replies.',
    create: () => new HardBot(),
  },
  {
    id: 'stockfish',
    name: 'Engine',
    description: 'Powered by Stockfish 18 — plays the strongest move every turn.',
    // StockfishBot requires an injected StockfishService; ChessSessionService
    // constructs it directly. This factory is a safe fallback only.
    create: () => new HardBot(),
  },
];

export function botDifficultyById(id: string): BotDifficulty | undefined {
  return BOT_DIFFICULTIES.find((difficulty) => difficulty.id === id);
}

/** True for the Stockfish-powered engine difficulty. */
export function isEngineBot(botId: string | undefined): boolean {
  return botId === 'stockfish';
}
