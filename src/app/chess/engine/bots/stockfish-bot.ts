/**
 * Engine bot — wraps Stockfish 18 WASM behind the ChessBot interface.
 *
 * Strategy:
 *  1. Pre-fetch: as soon as a new position is available (the human just
 *     confirmed their move), call getBestMove() and store the Promise.
 *  2. chooseMove: await the stored promise (usually already resolved by the
 *     time the bot is asked), validate against the variant engine's legal
 *     intents, and use the result.
 *  3. Fallback: if Stockfish times out, returns null, or suggests an illegal
 *     move in the variant, delegate to HardBot.
 *
 * The ChessBot interface is synchronous, but chooseMove is only called from
 * ChessSessionService after the stored promise is resolved (see
 * StockfishBot.prefetch() called from ChessSessionService). In the unlikely
 * case the promise is still pending at call time, chooseMove falls back to
 * HardBot immediately rather than blocking the UI thread.
 *
 * Pure TypeScript — no Angular imports. StockfishService is injected by the
 * caller (ChessSessionService) and passed into the constructor.
 */

import { PieceColor, boardSize } from '../core/board';
import type { ChessBot } from '../bot';
import type { ChessVariantEngine, GamePosition, MoveIntent } from '../variant';
import { PASS_INTENT } from '../variant';
import { HardBot } from './hard-bot';
import { boardToFen, uciBestMoveToIntent } from '../fen-bridge';
import type { StockfishService } from '../../services/stockfish.service';

export class StockfishBot implements ChessBot {
  readonly id = 'stockfish';
  readonly name = 'Engine';

  private readonly fallback: HardBot;
  /** Resolved value of the last prefetch, or undefined if not yet resolved. */
  private prefetchedMove: string | null | undefined = undefined;
  /** In-flight prefetch promise. */
  private prefetchPromise: Promise<string | null> | null = null;

  constructor(private readonly stockfish: StockfishService) {
    this.fallback = new HardBot();
  }

  /**
   * Pre-fetch the best move from Stockfish for the given position. Call this
   * immediately after the human confirms their move so Stockfish has maximum
   * thinking time before chooseMove is called.
   */
  prefetch(position: GamePosition, color: PieceColor): void {
    this.prefetchedMove = undefined;
    const fen = boardToFen(position.board, color);
    this.prefetchPromise = this.stockfish.getBestMove(fen).then((move) => {
      this.prefetchedMove = move;
      return move;
    });
  }

  chooseMove(
    position: GamePosition,
    color: PieceColor,
    engine: ChessVariantEngine,
  ): MoveIntent {
    // Use cached result if prefetch already resolved.
    if (this.prefetchedMove !== undefined) {
      const intent = this.resolveIntent(this.prefetchedMove, position, color, engine);
      this.prefetchedMove = undefined;
      this.prefetchPromise = null;
      if (intent) return intent;
    }

    // Prefetch not done or returned unusable move — fall back immediately.
    return this.fallback.chooseMove(position, color, engine);
  }

  /**
   * Await the prefetch promise (used by ChessSessionService when it wants to
   * wait for Stockfish rather than falling back). Returns the resolved intent
   * or null if the move is illegal / unavailable.
   */
  async awaitPrefetch(
    position: GamePosition,
    color: PieceColor,
    engine: ChessVariantEngine,
  ): Promise<MoveIntent> {
    if (!this.prefetchPromise) {
      return this.fallback.chooseMove(position, color, engine);
    }
    const move = await this.prefetchPromise;
    this.prefetchedMove = undefined;
    this.prefetchPromise = null;
    return this.resolveIntent(move, position, color, engine)
      ?? this.fallback.chooseMove(position, color, engine);
  }

  private resolveIntent(
    uciMove: string | null,
    position: GamePosition,
    color: PieceColor,
    engine: ChessVariantEngine,
  ): MoveIntent | null {
    if (!uciMove) return null;
    const size = boardSize(position.board);
    const intent = uciBestMoveToIntent(uciMove, position.board, size);
    if (!intent) return null;

    // Validate against variant's actual legal intents.
    const legal = engine.legalIntents(position, color);
    const isLegal = legal.some((li) => {
      if (li.kind !== 'move' || intent.kind !== 'move') return false;
      return li.from === intent.from
        && li.to === intent.to
        && (intent.promoteTo === undefined || li.promoteTo === intent.promoteTo);
    });

    return isLegal ? intent : null;
  }
}
