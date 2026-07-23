/**
 * Variant engine contract. Every Unusual Chess mode implements
 * `ChessVariantEngine`; the UI and session service talk only to this
 * interface. Pure TypeScript — no Angular imports.
 */

import {
  Board,
  PieceColor,
  PieceType,
  PromotionPiece,
  Square,
} from './core/board';

/** A position at the start of a round. */
export interface GamePosition {
  readonly board: Board;
  /** 1-based number of the round about to be played. */
  readonly round: number;
  /** Consecutive rounds (immediately preceding) in which both players passed. */
  readonly consecutivePassRounds: number;
}

export type MoveIntent =
  | { readonly kind: 'pass' }
  | {
      readonly kind: 'move';
      readonly from: Square;
      readonly to: Square;
      /** Required when the move promotes a pawn. */
      readonly promoteTo?: PromotionPiece;
    };

export const PASS_INTENT: MoveIntent = { kind: 'pass' };

export type ResolutionEventType =
  | 'moved'
  | 'bounced'
  | 'captured'
  | 'whiffed'
  | 'promoted'
  | 'castled'
  | 'passed';

/**
 * One atomic outcome within a round resolution. Each player's intent
 * produces one primary event (passed / moved / captured / whiffed /
 * bounced / castled) plus an optional trailing 'promoted' event.
 */
export interface ResolutionEvent {
  readonly type: ResolutionEventType;
  /** The acting player. For 'captured', the capturer. */
  readonly color: PieceColor;
  /** The acting piece ('promoted': the piece promoted to). */
  readonly piece: PieceType | null;
  readonly from: Square | null;
  readonly to: Square | null;
  /** For 'captured': the type of the piece removed from the board. */
  readonly capturedPiece: PieceType | null;
  /** For 'whiffed': true if the piece still landed on `to`, false if it bounced back (pawns). */
  readonly landed: boolean;
  /** For 'castled' and castle 'bounced': the rook's leg of the castle. */
  readonly rookFrom: Square | null;
  readonly rookTo: Square | null;
  /** Human-readable line for the move log. */
  readonly description: string;
}

export type GameOutcome = 'ongoing' | 'white-won' | 'black-won' | 'draw';

export type GameEndReason =
  | 'king-captured'
  | 'both-kings-captured'
  | 'triple-pass'
  | 'resignation';

export interface GameStatus {
  readonly outcome: GameOutcome;
  readonly reason: GameEndReason | null;
}

export const ONGOING_STATUS: GameStatus = { outcome: 'ongoing', reason: null };

export interface RoundResolution {
  /** The round that was just resolved (1-based). */
  readonly round: number;
  /** Position before the round, kept for animation replay. */
  readonly positionBefore: GamePosition;
  /** Position after the round. */
  readonly position: GamePosition;
  readonly events: ReadonlyArray<ResolutionEvent>;
  readonly status: GameStatus;
}

export interface ChessVariantEngine {
  /** Current start-of-round position. */
  readonly position: GamePosition;
  readonly status: GameStatus;

  /** All legal intents for `color` from `position`, always including pass. */
  legalIntents(position: GamePosition, color: PieceColor): MoveIntent[];

  /** Legal intents for the piece standing on `from` (UI convenience). */
  legalIntentsFrom(
    position: GamePosition,
    color: PieceColor,
    from: Square,
  ): MoveIntent[];

  /** Queue a player's intent for the current round. Throws on illegal intents. */
  submitIntent(color: PieceColor, intent: MoveIntent): void;

  /** True when both players' intents are queued. */
  isRoundReady(): boolean;

  /**
   * Resolve the queued intents into a new position plus resolution events.
   * Advances the engine's position and clears the queued intents.
   */
  resolveRound(): RoundResolution;

  /** Concede the game; the opponent wins. */
  resign(color: PieceColor): void;
}
