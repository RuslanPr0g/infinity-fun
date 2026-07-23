/**
 * Hard bot: reply-aware — it looks one round ahead instead of just scoring
 * its own move in isolation.
 *
 * - Simultaneous mode: for each of its top candidates (ranked by the shared
 *   "Medium-style" heuristic, see `./evaluation`), it evaluates against the
 *   opponent's top plausible replies — ranked the same way, from the SAME
 *   start-of-round position, never the opponent's actual pending move — by
 *   resolving each pairing with the real round resolver
 *   (`resolveSimultaneousRound`). That prices in whiffs, bounces, and
 *   same-destination collisions exactly as the engine would. A candidate's
 *   score is the mean evaluation over those replies.
 * - Royale mode: a 2-ply lookahead — apply the candidate solo, let the
 *   opponent pick their Medium-style best reply on the resulting board, then
 *   score the final board for me. Burn-hazard terms are added for both
 *   plies.
 *
 * Winning king captures are always taken immediately, and — like Medium — a
 * safe move is always preferred over one that hangs the king whenever a safe
 * choice exists. It chooses only from the variant engine's legal intents for
 * the start-of-round position; it never sees the opponent's pending move.
 *
 * Pure TypeScript — no Angular imports.
 */

import { PieceColor, boardSize, findKing, opponentOf, pieceAt } from '../core/board';
import { MoveGenOptions, generateAllMoves, isSquareAttacked } from '../core/move-gen';
import type { ChessBot } from '../bot';
import type { ChessVariantEngine, GamePosition, MoveIntent } from '../variant';
import { PASS_INTENT } from '../variant';
import { resolveSimultaneousRound } from '../variants/simultaneous-engine';
import { intactBounds, isVoidSquare } from '../burn';
import {
  HeuristicScore,
  MoveIntentOnly,
  applySolo,
  burnAdjustment,
  evaluateBoard,
  rankByHeuristic,
} from './evaluation';

/** My candidate pool size, ranked by Medium-style static score. */
const CANDIDATE_COUNT = 10;
/** Opponent's plausible-reply pool size in Simultaneous mode. */
const REPLY_COUNT = 8;
/** Score gap within which top candidates are considered interchangeable. */
const TIE_MARGIN = 0.5;

interface EvaluatedCandidate {
  readonly intent: MoveIntentOnly;
  readonly score: number;
}

export class HardBot implements ChessBot {
  readonly id = 'hard';
  readonly name = 'Hard';

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

    const ranked = rankByHeuristic(position, color, moves);

    const kingCaptures = ranked.filter((entry) => entry.capturesKing);
    if (kingCaptures.length > 0) {
      return this.pickRandom(kingCaptures.map((entry) => entry.intent));
    }

    const safe = ranked.filter((entry) => entry.kingSafeAfter);
    if (safe.length === 0) {
      const kingSquare = findKing(position.board, color);
      const safeToPass =
        kingSquare === null ||
        !isSquareAttacked(position.board, kingSquare, opponentOf(color));
      if (safeToPass) return PASS_INTENT;
    }

    const pool = safe.length > 0 ? safe : ranked;
    const candidates = pool.slice(0, CANDIDATE_COUNT).map((entry) => entry.intent);

    const evaluated =
      position.burnedRings !== undefined
        ? this.evaluateRoyaleCandidates(position, color, candidates)
        : this.evaluateSimultaneousCandidates(position, color, engine, candidates);

    const best = Math.max(...evaluated.map((entry) => entry.score));
    const contenders = evaluated.filter((entry) => entry.score >= best - TIE_MARGIN);
    return this.pickRandom(contenders.map((entry) => entry.intent));
  }

  /**
   * Simultaneous mode: mean outcome over the opponent's top plausible
   * replies, each resolved for real via `resolveSimultaneousRound` so
   * whiffs/bounces/same-destination collisions are priced in exactly.
   */
  private evaluateSimultaneousCandidates(
    position: GamePosition,
    color: PieceColor,
    engine: ChessVariantEngine,
    candidates: MoveIntentOnly[],
  ): EvaluatedCandidate[] {
    const enemy = opponentOf(color);
    const enemyMoves = engine
      .legalIntents(position, enemy)
      .filter((intent): intent is MoveIntentOnly => intent.kind === 'move');
    const enemyRanked: HeuristicScore[] = rankByHeuristic(position, enemy, enemyMoves);
    const replies: MoveIntent[] =
      enemyRanked.length > 0
        ? enemyRanked.slice(0, REPLY_COUNT).map((entry) => entry.intent)
        : [PASS_INTENT];

    return candidates.map((intent) => {
      let total = 0;
      for (const reply of replies) {
        const whiteIntent = color === 'white' ? intent : reply;
        const blackIntent = color === 'black' ? intent : reply;
        const resolution = resolveSimultaneousRound(position, whiteIntent, blackIntent, {
          validate: false,
        });
        total += evaluateBoard(resolution.position.board, color);
      }
      return { intent, score: total / replies.length };
    });
  }

  /**
   * Royale mode: 2-ply lookahead — apply my candidate solo, let the
   * opponent pick their Medium-style best reply on the resulting board, then
   * score the final board for me. Burn-hazard terms are added for both
   * plies (the static `evaluateBoard` itself has no burn awareness).
   */
  private evaluateRoyaleCandidates(
    position: GamePosition,
    color: PieceColor,
    candidates: MoveIntentOnly[],
  ): EvaluatedCandidate[] {
    const enemy = opponentOf(color);
    const burnedRings = position.burnedRings ?? 0;

    return candidates.map((intent) => {
      const boardAfterMine = applySolo(position.board, color, intent);
      const midPosition: GamePosition = {
        ...position,
        board: boardAfterMine,
        round: position.round + 1,
      };

      const size = boardSize(boardAfterMine);
      const options = royaleMoveGenOptions(burnedRings, size);
      const enemyMoves: MoveIntentOnly[] = generateAllMoves(boardAfterMine, enemy, options)
        .filter((move) => !isVoidSquare(move.to, burnedRings, size))
        .map((move): MoveIntentOnly =>
          move.isPromotion
            ? { kind: 'move', from: move.from, to: move.to, promoteTo: 'queen' }
            : { kind: 'move', from: move.from, to: move.to },
        );

      let finalBoard = boardAfterMine;
      let replyAdjustment = 0;
      if (enemyMoves.length > 0) {
        const enemyRanked = rankByHeuristic(midPosition, enemy, enemyMoves);
        const bestReply = enemyRanked[0].intent;
        finalBoard = applySolo(boardAfterMine, enemy, bestReply);
        const replyMover = pieceAt(boardAfterMine, bestReply.from);
        if (replyMover) {
          replyAdjustment = burnAdjustment(
            midPosition,
            replyMover.type,
            bestReply.from,
            bestReply.to,
          );
        }
      }

      const mover = pieceAt(position.board, intent.from);
      const myAdjustment = mover
        ? burnAdjustment(position, mover.type, intent.from, intent.to)
        : 0;

      const score = evaluateBoard(finalBoard, color) + myAdjustment + replyAdjustment;
      return { intent, score };
    });
  }

  private pickRandom(items: MoveIntentOnly[]): MoveIntentOnly {
    return items[Math.floor(this.random() * items.length)];
  }
}

/**
 * Approximates the royale engine's move-gen options for the opponent's
 * hypothetical reply: correct promotion ranks for the current burn progress.
 * Pawn double-step start ranks are left at their defaults — a minor
 * simplification since this is only used to rank a plausible reply, never to
 * validate the bot's own (already engine-legal) move.
 */
function royaleMoveGenOptions(burnedRings: number, size: number): MoveGenOptions {
  const bounds = intactBounds(burnedRings, size);
  return {
    promotionRanks: { white: bounds.max, black: bounds.min },
  };
}
