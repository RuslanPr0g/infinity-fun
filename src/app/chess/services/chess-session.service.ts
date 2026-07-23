import { Injectable, computed, inject, signal } from '@angular/core';
import {
  PieceColor,
  PieceType,
  Square,
  opponentOf,
} from '../engine/core/board';
import { BOT_DIFFICULTIES, ChessBot, botDifficultyById, isEngineBot } from '../engine/bot';
import {
  ChessVariantEngine,
  GamePosition,
  GameStatus,
  MoveIntent,
  ONGOING_STATUS,
  RoundResolution,
} from '../engine/variant';
import {
  ChessModeDescriptor,
  TurnStyle,
  chessModeById,
} from '../models/chess-modes';
import { StockfishService } from './stockfish.service';
import { StockfishBot } from '../engine/bots/stockfish-bot';

export type OpponentKind = 'hotseat' | 'bot';

/**
 * Round lifecycle inside the `playing` screen:
 *  - entry: `entryColor` is picking a move;
 *  - handoff: hotseat privacy overlay between White's confirm and Black's entry;
 *  - reveal: both moves resolve and animate;
 *  - game-over: a terminal status has been reached.
 */
export type SessionPhase = 'idle' | 'entry' | 'handoff' | 'reveal' | 'game-over';

export interface ChessSessionConfig {
  modeId: string;
  opponent: OpponentKind;
  /** Required when opponent is 'bot'. */
  botId?: string;
  /** The human's color in bot games. Defaults to white. */
  humanColor?: PieceColor;
}

export interface RoundLogEntry {
  round: number;
  descriptions: string[];
}

/**
 * Orchestrates one Unusual Chess game around a pure variant engine:
 * holds game state as signals, accepts UI intents, drives the round
 * lifecycle (entry → privacy handoff → reveal → resolution) and invokes
 * the bot when the opponent is a bot. The bot is always asked for its move
 * from the start-of-round position — never after peeking at the human's
 * pending intent.
 *
 * When the Engine (Stockfish) bot is selected:
 *  - StockfishBot is constructed with the injected StockfishService.
 *  - After the human confirms a move in Simultaneous mode, StockfishBot.prefetch()
 *    is called immediately so Stockfish has maximum think time.
 *  - chooseMove is replaced by awaitPrefetch() so we wait for the async result
 *    before resolving the round.
 *  - reset() calls StockfishService.destroy() to terminate the worker.
 */
@Injectable({ providedIn: 'root' })
export class ChessSessionService {
  readonly phase = signal<SessionPhase>('idle');
  readonly entryColor = signal<PieceColor>('white');
  readonly position = signal<GamePosition | null>(null);
  readonly status = signal<GameStatus>(ONGOING_STATUS);
  readonly lastResolution = signal<RoundResolution | null>(null);
  readonly moveLog = signal<RoundLogEntry[]>([]);
  /** Enemy pieces each side has captured, in capture order. */
  readonly capturedByWhite = signal<PieceType[]>([]);
  readonly capturedByBlack = signal<PieceType[]>([]);
  readonly config = signal<ChessSessionConfig | null>(null);

  /**
   * True when the entering color may pass this turn — always true in
   * Simultaneous Chess, but only true in alternate (Royale) modes when the
   * entering color has zero legal moves.
   */
  readonly passAllowed = computed<boolean>(() => {
    const engine = this.engine;
    const position = this.position();
    if (!engine || !position || this.phase() !== 'entry') return false;
    return engine
      .legalIntents(position, this.entryColor())
      .some((intent) => intent.kind === 'pass');
  });

  private readonly stockfishService = inject(StockfishService);

  private engine: ChessVariantEngine | null = null;
  private bot: ChessBot | null = null;
  private botColor: PieceColor = 'black';
  private turnStyle: TurnStyle = 'simultaneous';

  start(config: ChessSessionConfig): void {
    const mode = this.requireMode(config.modeId);
    this.turnStyle = mode.turnStyle;
    this.engine = mode.engineFactory({
      opponent: config.opponent,
      botId: config.botId,
    });

    this.bot = null;
    if (config.opponent === 'bot') {
      if (isEngineBot(config.botId)) {
        // StockfishBot requires the service — the worker is already initialised
        // by StockfishLoaderComponent before the game is started.
        this.bot = new StockfishBot(this.stockfishService);
      } else {
        const difficulty =
          botDifficultyById(config.botId ?? '') ?? BOT_DIFFICULTIES[0];
        this.bot = difficulty.create();
      }
      this.botColor = opponentOf(config.humanColor ?? 'white');
    }

    this.config.set(config);
    this.position.set(this.engine.position);
    this.status.set(this.engine.status);
    this.lastResolution.set(null);
    this.moveLog.set([]);
    this.capturedByWhite.set([]);
    this.capturedByBlack.set([]);
    // Alternate mode always starts with White on move; simultaneous mode's
    // "entry color" is really about whose privacy screen shows first.
    this.entryColor.set(
      this.turnStyle === 'simultaneous' && config.opponent === 'bot'
        ? config.humanColor ?? 'white'
        : 'white',
    );
    this.phase.set('entry');

    if (this.turnStyle === 'alternate') {
      // If the bot plays the color that moves first, it goes immediately —
      // the human sees it land as a reveal before their own first entry.
      this.playBotAlternateTurnIfDue();
    }
  }

  /** Legal intents for the entering player's piece on `from`. */
  legalIntentsFrom(from: Square): MoveIntent[] {
    const engine = this.engine;
    const position = this.position();
    if (!engine || !position || this.phase() !== 'entry') return [];
    return engine.legalIntentsFrom(position, this.entryColor(), from);
  }

  /** Confirm the entering player's intent for this round. */
  confirmIntent(intent: MoveIntent): void {
    const engine = this.engine;
    const config = this.config();
    if (!engine || !config || this.phase() !== 'entry') return;

    engine.submitIntent(this.entryColor(), intent);

    if (this.turnStyle === 'alternate') {
      // No handoff, no simultaneous reveal — just resolve this one move.
      this.resolveRound();
      return;
    }

    if (config.opponent === 'hotseat') {
      if (this.entryColor() === 'white') {
        this.phase.set('handoff');
      } else {
        this.resolveRound();
      }
      return;
    }

    // Bot round (simultaneous): the bot picks from the same start-of-round
    // position the human did; the engine keeps pending intents private.
    if (this.bot instanceof StockfishBot) {
      // Pre-fetch was fired when the human started entering (see prefetchForStockfish).
      // Now await it asynchronously; fall back to HardBot if not ready.
      this.bot.awaitPrefetch(engine.position, this.botColor, engine).then((botIntent) => {
        engine.submitIntent(this.botColor, botIntent);
        this.resolveRound();
      });
      return;
    }

    const botIntent = this.bot!.chooseMove(engine.position, this.botColor, engine);
    engine.submitIntent(this.botColor, botIntent);
    this.resolveRound();
  }

  /**
   * Kick off a Stockfish pre-fetch for the current position. Called by the
   * UI (chess-game.component) immediately when the human taps their first
   * piece so Stockfish has maximum think time while the human deliberates.
   */
  prefetchStockfishMove(): void {
    if (!(this.bot instanceof StockfishBot)) return;
    const position = this.position();
    if (!position) return;
    this.bot.prefetch(position, this.botColor);
  }

  /** Hotseat: the device has been passed — start Black's entry. */
  continueHandoff(): void {
    if (this.phase() !== 'handoff') return;
    this.entryColor.set('black');
    this.phase.set('entry');
  }

  /** The reveal animation finished — advance to the next round or end. */
  completeReveal(): void {
    if (this.phase() !== 'reveal') return;
    if (this.status().outcome !== 'ongoing') {
      this.phase.set('game-over');
      return;
    }

    if (this.turnStyle === 'alternate') {
      // The color that just moved was the entering color; alternate to
      // the other side, then let the bot move immediately if it's its turn
      // (the human sees that as its own separate reveal step).
      this.entryColor.set(opponentOf(this.entryColor()));
      if (!this.playBotAlternateTurnIfDue()) {
        this.phase.set('entry');
      }
      return;
    }

    const config = this.config();
    this.entryColor.set(
      config?.opponent === 'bot' ? config.humanColor ?? 'white' : 'white',
    );
    // Pre-fetch Stockfish move for the new round as soon as entry starts.
    if (this.bot instanceof StockfishBot) {
      const position = this.position();
      if (position) this.bot.prefetch(position, this.botColor);
    }
    this.phase.set('entry');
  }

  resign(color: PieceColor): void {
    const engine = this.engine;
    if (!engine || this.status().outcome !== 'ongoing') return;
    engine.resign(color);
    this.status.set(engine.status);
    this.phase.set('game-over');
  }

  reset(): void {
    // Terminate Stockfish worker if the engine bot was in use.
    if (this.bot instanceof StockfishBot) {
      this.stockfishService.destroy();
    }
    this.engine = null;
    this.bot = null;
    this.turnStyle = 'simultaneous';
    this.config.set(null);
    this.position.set(null);
    this.status.set(ONGOING_STATUS);
    this.lastResolution.set(null);
    this.moveLog.set([]);
    this.capturedByWhite.set([]);
    this.capturedByBlack.set([]);
    this.entryColor.set('white');
    this.phase.set('idle');
  }

  /**
   * Alternate mode only: if it's the bot's turn (per `entryColor`), submit
   * its move and resolve immediately, so the human sees it as its own
   * reveal step rather than an entry prompt. Returns true if the bot moved.
   *
   * For StockfishBot in alternate mode: pre-fetch, await, then resolve.
   */
  private playBotAlternateTurnIfDue(): boolean {
    const engine = this.engine;
    const config = this.config();
    if (!engine || !config || config.opponent !== 'bot' || !this.bot) return false;
    if (this.entryColor() !== this.botColor) return false;
    if (this.status().outcome !== 'ongoing') return false;

    if (this.bot instanceof StockfishBot) {
      this.bot.prefetch(engine.position, this.botColor);
      this.bot.awaitPrefetch(engine.position, this.botColor, engine).then((botIntent) => {
        engine.submitIntent(this.botColor, botIntent);
        this.resolveRound();
      });
      return true;
    }

    const botIntent = this.bot.chooseMove(engine.position, this.botColor, engine);
    engine.submitIntent(this.botColor, botIntent);
    this.resolveRound();
    return true;
  }

  private resolveRound(): void {
    const engine = this.engine!;
    const resolution = engine.resolveRound();

    this.lastResolution.set(resolution);
    this.position.set(resolution.position);
    this.status.set(resolution.status);
    this.moveLog.update((log) => [
      ...log,
      {
        round: resolution.round,
        descriptions: resolution.events.map((event) => event.description),
      },
    ]);
    for (const event of resolution.events) {
      if (event.type === 'captured' && event.capturedPiece) {
        const tray =
          event.color === 'white' ? this.capturedByWhite : this.capturedByBlack;
        tray.update((pieces) => [...pieces, event.capturedPiece!]);
      }
    }
    this.phase.set('reveal');
  }

  private requireMode(modeId: string): ChessModeDescriptor {
    const mode = chessModeById(modeId);
    if (!mode) {
      throw new Error(`Unknown chess mode: ${modeId}`);
    }
    return mode;
  }
}
