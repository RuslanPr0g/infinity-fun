/**
 * Shrinking Board Royale — regular alternating-turn chess on a 15×15
 * battlefield that burns away from the outside in. Every BURN_INTERVAL-th
 * ply (round = one move now, not a simultaneous pair) the outermost intact
 * ring is destroyed, and any piece standing on it burns with it, down to a
 * 5×5 core.
 *
 * Turn order is strict alternation: white moves, then black, then white...
 * There is no hidden entry and no simultaneous reveal — one player submits
 * one intent, it resolves immediately. No check/checkmate/stalemate rules —
 * capturing the king wins. No castling, no en passant, and no pass button:
 * a player may only pass when they have zero legal moves.
 *
 * Internally each ply is resolved via `resolveSimultaneousRound` with the
 * mover's real intent plus an implicit PASS for the side not on move — that
 * degenerates to a plain chess move application (no bounce/whiff is
 * possible when only one side actually moves), so all the existing
 * resolution machinery is reused unchanged. The implicit opponent 'passed'
 * event is filtered out of the returned events so the move log never claims
 * the opponent passed on every turn.
 *
 * Pure TypeScript — no Angular imports.
 */

import {
  Board,
  Piece,
  PieceColor,
  PieceType,
  PIECE_GLYPHS,
  PromotionPiece,
  Square,
  boardSize,
  makePiece,
  opponentOf,
  pieceAt,
  square,
  squareName,
  withChanges,
} from '../core/board';
import { MoveGenOptions, generateMoves } from '../core/move-gen';
import {
  ChessVariantEngine,
  GamePosition,
  GameStatus,
  MoveIntent,
  ONGOING_STATUS,
  PASS_INTENT,
  ResolutionEvent,
  RoundResolution,
} from '../variant';
import {
  ROYALE_BOARD_SIZE,
  burnsAfterRound,
  centeredBackRankFiles,
  intactBounds,
  isVoidSquare,
  ringIndex,
} from '../burn';
import { resolveSimultaneousRound } from './simultaneous-engine';

const BACK_RANK_ORDER: PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

const PROMOTION_PIECES: PromotionPiece[] = ['queen', 'rook', 'bishop', 'knight'];

/** Rings kept clear of the border when no explicit spawnOffset is given. */
const DEFAULT_SPAWN_OFFSET = 2;

export interface RoyaleSetup {
  /** Rings kept clear of the border when placing the starting armies. */
  readonly spawnOffset?: number;
}

/**
 * Builds the 15×15 Shrinking Board Royale starting board. Armies spawn
 * `spawnOffset` rings in from the border so the first few burns don't eat
 * them: white's back rank sits on rank index `spawnOffset`, its pawns on
 * `spawnOffset + 1`; black is mirrored from the far edge.
 */
export function createRoyaleInitialBoard(
  spawnOffset = DEFAULT_SPAWN_OFFSET,
): Board {
  const size = ROYALE_BOARD_SIZE;
  const cells = new Array<Piece | null>(size * size).fill(null);
  const backRankFiles = centeredBackRankFiles(size);
  const whiteBackRank = spawnOffset;
  const whitePawnRank = spawnOffset + 1;
  const blackBackRank = size - 1 - spawnOffset;
  const blackPawnRank = size - 2 - spawnOffset;
  for (let i = 0; i < backRankFiles.length; i++) {
    const file = backRankFiles[i];
    cells[square(file, whiteBackRank, size)] = makePiece(BACK_RANK_ORDER[i], 'white');
    cells[square(file, blackBackRank, size)] = makePiece(BACK_RANK_ORDER[i], 'black');
  }
  for (let file = 0; file < size; file++) {
    cells[square(file, whitePawnRank, size)] = makePiece('pawn', 'white');
    cells[square(file, blackPawnRank, size)] = makePiece('pawn', 'black');
  }
  return cells;
}

export function royaleInitialPosition(
  spawnOffset = DEFAULT_SPAWN_OFFSET,
): GamePosition {
  return {
    board: createRoyaleInitialBoard(spawnOffset),
    round: 1,
    consecutivePassRounds: 0,
    burnedRings: 0,
  };
}

function label(color: PieceColor): string {
  return color === 'white' ? 'White' : 'Black';
}

function glyph(color: PieceColor, type: PieceType): string {
  return PIECE_GLYPHS[color][type];
}

function burnEvent(color: PieceColor, type: PieceType, from: Square): ResolutionEvent {
  return {
    type: 'burned',
    color,
    piece: type,
    from,
    to: null,
    capturedPiece: null,
    landed: false,
    rookFrom: null,
    rookTo: null,
    description: `${label(color)} ${glyph(color, type)} on ${squareName(from, ROYALE_BOARD_SIZE)} burned with the board.`,
  };
}

/**
 * Applies the burn step to a post-round position: destroys every piece
 * standing on the ring about to burn, increments `burnedRings`, and returns
 * the resulting board plus the 'burned' events. Only called when the round's
 * resolution left the game ongoing and it is actually time to burn.
 */
function applyBurn(
  position: GamePosition,
): { board: Board; events: ResolutionEvent[]; whiteKingBurned: boolean; blackKingBurned: boolean } {
  const burnedRings = position.burnedRings ?? 0;
  const size = boardSize(position.board);
  const changes: { sq: Square; piece: Piece | null }[] = [];
  const events: ResolutionEvent[] = [];
  let whiteKingBurned = false;
  let blackKingBurned = false;

  for (let sq = 0; sq < position.board.length; sq++) {
    const piece = position.board[sq];
    if (!piece) continue;
    if (ringIndex(sq, size) !== burnedRings) continue;
    changes.push({ sq, piece: null });
    events.push(burnEvent(piece.color, piece.type, sq));
    if (piece.type === 'king') {
      if (piece.color === 'white') whiteKingBurned = true;
      else blackKingBurned = true;
    }
  }

  return {
    board: withChanges(position.board, changes),
    events,
    whiteKingBurned,
    blackKingBurned,
  };
}

/** Whose turn it is at the start of `round`: white plays odd plies, black even. */
function moverFor(round: number): PieceColor {
  return round % 2 === 1 ? 'white' : 'black';
}

export class ShrinkingRoyaleEngine implements ChessVariantEngine {
  private currentPosition: GamePosition;
  private currentStatus: GameStatus = ONGOING_STATUS;
  private pendingIntent: MoveIntent | null = null;
  private toMove: PieceColor;
  private readonly spawnOffset: number;

  constructor(setup?: RoyaleSetup, startPosition?: GamePosition) {
    this.spawnOffset = setup?.spawnOffset ?? DEFAULT_SPAWN_OFFSET;
    this.currentPosition = startPosition ?? royaleInitialPosition(this.spawnOffset);
    this.toMove = moverFor(this.currentPosition.round);
  }

  get position(): GamePosition {
    return this.currentPosition;
  }

  get status(): GameStatus {
    return this.currentStatus;
  }

  /** The color whose turn it currently is. */
  get activeColor(): PieceColor {
    return this.toMove;
  }

  private moveGenOptions(burnedRings: number): MoveGenOptions {
    const bounds = intactBounds(burnedRings, ROYALE_BOARD_SIZE);
    return {
      promotionRanks: { white: bounds.max, black: bounds.min },
      pawnStartRanks: {
        white: this.spawnOffset + 1,
        black: ROYALE_BOARD_SIZE - 2 - this.spawnOffset,
      },
    };
  }

  legalIntents(position: GamePosition, color: PieceColor): MoveIntent[] {
    if (color !== this.toMove) return [];
    const intents: MoveIntent[] = [];
    for (let sq = 0; sq < position.board.length; sq++) {
      const piece = position.board[sq];
      if (piece && piece.color === color) {
        intents.push(...this.legalIntentsFrom(position, color, sq));
      }
    }
    if (intents.length === 0) intents.push(PASS_INTENT);
    return intents;
  }

  legalIntentsFrom(
    position: GamePosition,
    color: PieceColor,
    from: Square,
  ): MoveIntent[] {
    if (color !== this.toMove) return [];
    const piece = pieceAt(position.board, from);
    if (!piece || piece.color !== color) return [];
    const burnedRings = position.burnedRings ?? 0;
    const size = boardSize(position.board);
    const options = this.moveGenOptions(burnedRings);
    const intents: MoveIntent[] = [];
    for (const move of generateMoves(position.board, from, options)) {
      if (isVoidSquare(move.to, burnedRings, size)) continue;
      if (move.isPromotion) {
        for (const promoteTo of PROMOTION_PIECES) {
          intents.push({ kind: 'move', from: move.from, to: move.to, promoteTo });
        }
      } else {
        intents.push({ kind: 'move', from: move.from, to: move.to });
      }
    }
    return intents;
  }

  submitIntent(color: PieceColor, intent: MoveIntent): void {
    if (this.currentStatus.outcome !== 'ongoing') {
      throw new Error('Game is over — no further intents accepted.');
    }
    if (color !== this.toMove) {
      throw new Error(`It is ${this.toMove}'s turn — ${color} cannot move.`);
    }
    if (intent.kind === 'pass') {
      const stuck = this.legalIntents(this.currentPosition, color).every(
        (candidate) => candidate.kind === 'pass',
      );
      if (!stuck) {
        throw new Error(`${color} has legal moves available — passing is not allowed.`);
      }
    } else {
      const legal = this.legalIntentsFrom(this.currentPosition, color, intent.from);
      const matches = legal.some(
        (candidate) =>
          candidate.kind === 'move' &&
          candidate.from === intent.from &&
          candidate.to === intent.to &&
          candidate.promoteTo === intent.promoteTo,
      );
      if (!matches) {
        const size = boardSize(this.currentPosition.board);
        throw new Error(
          `Illegal intent for ${color}: ${squareName(intent.from, size)}→${squareName(intent.to, size)}`,
        );
      }
    }
    this.pendingIntent = intent;
  }

  isRoundReady(): boolean {
    return this.pendingIntent !== null;
  }

  resolveRound(): RoundResolution {
    if (this.currentStatus.outcome !== 'ongoing') {
      throw new Error('Game is over — nothing to resolve.');
    }
    if (!this.isRoundReady()) {
      throw new Error('An intent must be submitted before resolving.');
    }
    const burnedRings = this.currentPosition.burnedRings ?? 0;
    const roundJustPlayed = this.currentPosition.round;
    const mover = this.toMove;
    const moverIntent = this.pendingIntent!;
    this.pendingIntent = null;

    const whiteIntent = mover === 'white' ? moverIntent : PASS_INTENT;
    const blackIntent = mover === 'black' ? moverIntent : PASS_INTENT;

    const resolution = resolveSimultaneousRound(
      this.currentPosition,
      whiteIntent,
      blackIntent,
      { validate: true, moveGen: this.moveGenOptions(burnedRings) },
    );

    let position = resolution.position;
    let status = resolution.status;
    // Drop the non-mover's implicit 'passed' event — it never really chose
    // to pass, the engine just fed it PASS to reuse the pairwise resolver.
    // A genuine stuck-pass by the mover itself keeps its event.
    let events: ResolutionEvent[] = resolution.events.filter(
      (event) => !(event.type === 'passed' && event.color === opponentOf(mover)),
    );

    if (status.outcome === 'ongoing' && burnsAfterRound(roundJustPlayed, burnedRings)) {
      const burn = applyBurn(position);
      position = { ...position, board: burn.board, burnedRings: burnedRings + 1 };
      events = [...events, ...burn.events];

      if (burn.whiteKingBurned && burn.blackKingBurned) {
        status = { outcome: 'draw', reason: 'both-kings-burned' };
      } else if (burn.whiteKingBurned) {
        status = { outcome: 'black-won', reason: 'king-burned' };
      } else if (burn.blackKingBurned) {
        status = { outcome: 'white-won', reason: 'king-burned' };
      }
    }

    this.currentPosition = position;
    this.currentStatus = status;
    this.toMove = opponentOf(mover);

    return {
      round: resolution.round,
      positionBefore: resolution.positionBefore,
      position,
      events,
      status,
    };
  }

  resign(color: PieceColor): void {
    if (this.currentStatus.outcome !== 'ongoing') return;
    this.currentStatus = {
      outcome: color === 'white' ? 'black-won' : 'white-won',
      reason: 'resignation',
    };
  }
}
