/**
 * Medium bot: a sharper single-move heuristic than Easy.
 *
 * Reuses the shared "Medium-style" scorer (`heuristicScore` /
 * `rankByHeuristic` in `./evaluation`): material discounted for flee risk in
 * Simultaneous mode (full value in Royale), hanging-piece avoidance for the
 * mover and — cheaply — other own pieces, full Royale burn awareness, king
 * safety (winning king captures always taken; a safe move preferred over an
 * unsafe one whenever one exists), and small positional terms. Randomizes
 * among near-best candidates within a tight margin so it stays unpredictable
 * without being reckless.
 *
 * It chooses only from the variant engine's legal intents for the
 * start-of-round position — it never sees the opponent's pending move.
 *
 * Pure TypeScript — no Angular imports.
 */

import { PieceColor, findKing, opponentOf } from '../core/board';
import { isSquareAttacked } from '../core/move-gen';
import type { ChessBot } from '../bot';
import type { ChessVariantEngine, GamePosition, MoveIntent } from '../variant';
import { PASS_INTENT } from '../variant';
import { HeuristicScore, MoveIntentOnly, rankByHeuristic } from './evaluation';

/** Score gap within which near-best candidates are considered interchangeable. */
const RANDOM_POOL_MARGIN = 0.9;

export class MediumBot implements ChessBot {
  readonly id = 'medium';
  readonly name = 'Medium';

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

    const scored = rankByHeuristic(position, color, moves);

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
    const best = pool[0].score; // `scored` is sorted best-first; filters preserve order.
    const contenders = pool.filter((entry) => entry.score >= best - RANDOM_POOL_MARGIN);
    return this.pickRandom(contenders).intent;
  }

  private pickRandom(items: HeuristicScore[]): HeuristicScore {
    return items[Math.floor(this.random() * items.length)];
  }
}
