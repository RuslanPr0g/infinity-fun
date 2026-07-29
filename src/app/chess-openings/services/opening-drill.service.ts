import { Injectable, inject, signal } from '@angular/core';
import { Chess, Square as ChessJsSquare } from 'chess.js';
import {
  Board,
  PieceColor,
  PromotionPiece,
  Square,
  createInitialBoard,
  parseSquare,
  squareName,
} from '../../chess/engine/core/board';
import { StockfishService } from '../../chess/services/stockfish.service';
import { Opening } from '../models/opening.model';
import { chessJsToBoard } from '../board-adapter';

/** Whether the opponent replies with the dataset's exact line, or plays freely via Stockfish. */
export type BotReplyMode = 'predefined' | 'free';

/**
 * 'book': both sides are still following the opening's known move list.
 * 'deviated': the last move played (by either side) no longer matches the
 *   known line — the system should prompt rather than silently continue.
 * 'line-complete': the opening's full move list has been played out exactly.
 * 'freeplay': the user chose to continue past book/deviation — every move
 *   from here plays out as a normal game against Stockfish.
 * 'game-over': checkmate, stalemate, or another chess.js-detected end state.
 */
export type DrillPhase = 'book' | 'deviated' | 'line-complete' | 'freeplay' | 'game-over';

const PROMOTION_TO_CHESS_JS: Record<PromotionPiece, string> = {
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
};

/**
 * Some openings (typically 1-move ones, e.g. "Amar Opening": just `Nh3`) only
 * have book moves for one color — the other side never gets a turn within
 * the known line. Picking that side would leave the human stuck with
 * nothing to play, so we override the preference for just that opening and
 * hand the human whichever color actually has a move.
 */
export function playableColorFor(opening: Opening, preferred: PieceColor): PieceColor {
  const preferredHasBookMove = opening.moves.some(
    (_, index) => (index % 2 === 0 ? 'white' : 'black') === preferred,
  );
  return preferredHasBookMove ? preferred : preferred === 'white' ? 'black' : 'white';
}

/**
 * Drives one "Play it" drill session: wraps a chess.js instance, tracks
 * progress through the opening's known line, detects deviation, plays the
 * bot's replies (predefined from the dataset, or free via StockfishService),
 * and supports handing off to plain freeplay once the drill ends.
 */
@Injectable({ providedIn: 'root' })
export class OpeningDrillService {
  private readonly stockfish = inject(StockfishService);

  readonly board = signal<Board>(createInitialBoard());
  readonly phase = signal<DrillPhase>('book');
  readonly turnColor = signal<PieceColor>('white');
  readonly moveHistory = signal<string[]>([]);
  readonly thinking = signal(false);
  /** The color actually assigned to the human this session — see playableColorFor(). */
  readonly humanColorInUse = signal<PieceColor>('white');

  private chess = new Chess();
  private opening: Opening | null = null;
  private humanColor: PieceColor = 'white';
  private botReplyMode: BotReplyMode = 'predefined';
  /** Index into opening.moves of the next expected book move (either side). */
  private bookIndex = 0;

  get currentOpening(): Opening | null {
    return this.opening;
  }

  get isHumanTurn(): boolean {
    return this.turnColor() === this.humanColor && this.phase() !== 'game-over';
  }

  start(opening: Opening, preferredHumanColor: PieceColor, botReplyMode: BotReplyMode): void {
    const humanColor = playableColorFor(opening, preferredHumanColor);
    this.opening = opening;
    this.humanColor = humanColor;
    this.humanColorInUse.set(humanColor);
    this.botReplyMode = botReplyMode;
    this.bookIndex = 0;
    this.chess = new Chess();
    this.moveHistory.set([]);
    this.phase.set('book');
    this.turnColor.set('white');
    this.syncBoard();

    if (humanColor === 'black') {
      void this.playBotTurn();
    }
  }

  /** Legal destination squares for the piece on `from`, empty if it isn't the human's turn. */
  legalTargets(from: Square): Square[] {
    if (!this.isHumanTurn) return [];
    const moves = this.chess.moves({ square: squareName(from) as ChessJsSquare, verbose: true });
    return moves.map((move) => this.toSquare(move.to));
  }

  /** Attempt the human's move. Returns false if illegal (caller should ignore/reset selection). */
  async playHumanMove(from: Square, to: Square, promotion?: PromotionPiece): Promise<boolean> {
    if (!this.isHumanTurn) return false;

    const result = this.tryMove({
      from: squareName(from) as ChessJsSquare,
      to: squareName(to) as ChessJsSquare,
      // Auto-queen when unspecified — chess.js ignores this field for
      // non-promoting moves, so it's always safe to pass.
      promotion: PROMOTION_TO_CHESS_JS[promotion ?? 'queen'],
    });
    if (!result) return false;

    this.recordMove(result.san);
    if (this.phase() !== 'game-over') {
      await this.playBotTurn();
    }
    return true;
  }

  /** Wraps chess.js's move() — it throws on illegal input instead of returning null. */
  private tryMove(move: string | { from: string; to: string; promotion?: string }) {
    try {
      return this.chess.move(move);
    } catch {
      return null;
    }
  }

  /** Continue past a completed/deviated line as a normal game against Stockfish. */
  continueFreeplay(): void {
    if (this.phase() === 'game-over') return;
    this.phase.set('freeplay');
    if (this.turnColor() !== this.humanColor) {
      void this.playBotTurn();
    }
  }

  reset(): void {
    this.opening = null;
    this.chess = new Chess();
    this.bookIndex = 0;
    this.moveHistory.set([]);
    this.phase.set('book');
    this.turnColor.set('white');
    this.humanColorInUse.set('white');
    this.syncBoard();
  }

  private async playBotTurn(): Promise<void> {
    if (this.chess.isGameOver()) {
      this.phase.set('game-over');
      return;
    }
    if (this.turnColor() === this.humanColor) return;

    // Only 'book' and 'freeplay' let the bot move on its own — 'deviated'
    // and 'line-complete' wait for the user's continue/next decision via
    // the prompt overlay, and 'game-over' is handled above.
    const phase = this.phase();
    if (phase !== 'book' && phase !== 'freeplay') return;

    const useBook =
      this.botReplyMode === 'predefined' &&
      phase === 'book' &&
      this.opening !== null &&
      this.bookIndex < this.opening.moves.length;

    this.thinking.set(true);
    try {
      if (useBook) {
        const san = this.opening!.moves[this.bookIndex];
        const result = this.tryMove(san);
        if (result) this.recordMove(result.san);
        return;
      }

      const uci = await this.stockfish.getBestMove(this.chess.fen());
      if (!uci) return;
      const result = this.tryMove({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4, 5) : 'q',
      });
      if (result) this.recordMove(result.san);
    } finally {
      this.thinking.set(false);
    }
  }

  private recordMove(san: string): void {
    this.moveHistory.update((history) => [...history, san]);
    this.syncBoard();
    this.turnColor.set(this.chess.turn() === 'w' ? 'white' : 'black');

    if (this.chess.isGameOver()) {
      this.phase.set('game-over');
      return;
    }

    if (this.phase() !== 'book') return;

    const expected = this.opening?.moves[this.bookIndex];
    if (expected !== undefined && expected === san) {
      this.bookIndex++;
      if (this.opening && this.bookIndex >= this.opening.moves.length) {
        this.phase.set('line-complete');
      }
    } else {
      this.phase.set('deviated');
    }
  }

  private syncBoard(): void {
    this.board.set(chessJsToBoard(this.chess));
  }

  private toSquare(name: string): Square {
    return parseSquare(name);
  }
}
