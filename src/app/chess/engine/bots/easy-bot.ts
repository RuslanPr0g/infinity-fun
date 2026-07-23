/**
 * Easy bot: a heuristic player for Unusual Chess variants.
 *
 * It chooses only from the variant engine's legal intents for the
 * start-of-round position — it never sees the human's pending move.
 * Preferences: winning king captures first, then safe captures and moves
 * that keep its own king out of the line of fire of stationary attackers,
 * randomized among the best candidates so it stays unpredictable.
 *
 * Pure TypeScript — no Angular imports.
 */

import {
  PIECE_VALUES,
  PieceColor,
  boardSize,
  findKing,
  opponentOf,
  pieceAt,
} from '../core/board';
import { isSquareAttacked } from '../core/move-gen';
import type { ChessBot } from '../bot';
import type { ChessVariantEngine, GamePosition, MoveIntent } from '../variant';
import { PASS_INTENT } from '../variant';
import { doomedRingSquares, roundsUntilBurn } from '../burn';
import { applySolo } from './evaluation';

type MoveIntentOnly = Extract<MoveIntent, { kind: 'move' }>;

interface ScoredIntent {
  intent: MoveIntentOnly;
  score: number;
  capturesKing: boolean;
  kingSafeAfter: boolean;
}

/** Score gap within which candidates are considered interchangeable. */
const RANDOM_POOL_MARGIN = 1.5;

export class EasyBot implements ChessBot {
  readonly id = 'easy';
  readonly name = 'Easy';

  constructor(private readonly random: () => number = Math.random) {}

  chooseMove(
    position: GamePosition,
    color: PieceColor,
    engine: ChessVariantEngine,
  ): MoveIntent {
    const moves = engine
      .legalIntents(position, color)
      .filter((intent): intent is MoveIntentOnly => intent.kind === 'move');
    if (moves.length === 0) return PASS_INTENT;

    const scored = moves.map((intent) => this.scoreIntent(position, color, intent));

    const kingCaptures = scored.filter((entry) => entry.capturesKing);
    if (kingCaptures.length > 0) return this.pickRandom(kingCaptures).intent;

    const safe = scored.filter((entry) => entry.kingSafeAfter);
    if (safe.length === 0) {
      // Every move hangs the king; stand pat if that is at least safe now.
      const kingSquare = findKing(position.board, color);
      const safeToPass =
        kingSquare === null ||
        !isSquareAttacked(position.board, kingSquare, opponentOf(color));
      if (safeToPass) return PASS_INTENT;
    }

    const pool = safe.length > 0 ? safe : scored;
    const best = Math.max(...pool.map((entry) => entry.score));
    const contenders = pool.filter((entry) => entry.score >= best - RANDOM_POOL_MARGIN);
    return this.pickRandom(contenders).intent;
  }

  private scoreIntent(
    position: GamePosition,
    color: PieceColor,
    intent: MoveIntentOnly,
  ): ScoredIntent {
    const board = position.board;
    const enemy = opponentOf(color);
    const mover = pieceAt(board, intent.from)!;
    const target = pieceAt(board, intent.to);

    const boardAfter = applySolo(board, color, intent);
    const kingSquare = findKing(boardAfter, color);
    const kingSafeAfter =
      kingSquare !== null && !isSquareAttacked(boardAfter, kingSquare, enemy);

    let score = 0;
    const capturesKing = target?.type === 'king';
    if (target) {
      score += PIECE_VALUES[target.type];
    }

    const landsOnAttackedSquare = isSquareAttacked(boardAfter, intent.to, enemy);
    if (landsOnAttackedSquare) {
      score -= PIECE_VALUES[mover.type] * 0.6;
    } else if (target) {
      score += 0.5; // safe capture bonus
    }

    if (intent.promoteTo) {
      score += PIECE_VALUES[intent.promoteTo] - PIECE_VALUES.pawn;
    }

    if (!kingSafeAfter) {
      score -= PIECE_VALUES.king;
    }

    if (position.burnedRings !== undefined) {
      const remaining = roundsUntilBurn(position.round, position.burnedRings);
      if (remaining !== null && remaining <= 3) {
        const doomed = doomedRingSquares(position.burnedRings, boardSize(board));
        const destDoomed = doomed.includes(intent.to);
        const originDoomed = doomed.includes(intent.from);
        if (destDoomed) {
          score -= PIECE_VALUES[mover.type];
        }
        if (originDoomed) {
          score += PIECE_VALUES[mover.type] * 0.8; // evacuation bonus
          if (mover.type === 'king' && !destDoomed) {
            score += 50; // a safe king evacuation always outranks quiet moves
          }
        }
      }
    }

    score += this.random() * 0.75; // stay unpredictable

    return { intent, score, capturesKing, kingSafeAfter };
  }

  private pickRandom<T>(items: T[]): T {
    return items[Math.floor(this.random() * items.length)];
  }
}

// Re-exported so existing callers (and this bot's own spec) can keep
// importing `applySolo` from here — the implementation now lives in the
// shared evaluation module so Medium/Hard can use it too.
export { applySolo };
