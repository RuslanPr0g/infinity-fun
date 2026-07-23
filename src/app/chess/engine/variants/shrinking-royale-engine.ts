/**
 * Shrinking Board Royale — Simultaneous Chess on a 15×15 battlefield that
 * burns away from the outside in. Every BURN_INTERVAL-th round the outermost
 * intact ring is destroyed (and any pieces standing on it with it), down to
 * a 5×5 core. Otherwise every Simultaneous Chess rule applies unchanged.
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

/** Builds the 15×15 Shrinking Board Royale starting board. */
export function createRoyaleInitialBoard(): Board {
  const size = ROYALE_BOARD_SIZE;
  const cells = new Array<Piece | null>(size * size).fill(null);
  const backRankFiles = centeredBackRankFiles(size);
  for (let i = 0; i < backRankFiles.length; i++) {
    const file = backRankFiles[i];
    cells[square(file, 0, size)] = makePiece(BACK_RANK_ORDER[i], 'white');
    cells[square(file, size - 1, size)] = makePiece(BACK_RANK_ORDER[i], 'black');
  }
  for (let file = 0; file < size; file++) {
    cells[square(file, 1, size)] = makePiece('pawn', 'white');
    cells[square(file, size - 2, size)] = makePiece('pawn', 'black');
  }
  return cells;
}

export function royaleInitialPosition(): GamePosition {
  return {
    board: createRoyaleInitialBoard(),
    round: 1,
    consecutivePassRounds: 0,
    burnedRings: 0,
  };
}

function moveGenOptionsFor(burnedRings: number): MoveGenOptions {
  const bounds = intactBounds(burnedRings, ROYALE_BOARD_SIZE);
  return { promotionRanks: { white: bounds.max, black: bounds.min } };
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

export class ShrinkingRoyaleEngine implements ChessVariantEngine {
  private currentPosition: GamePosition;
  private currentStatus: GameStatus = ONGOING_STATUS;
  private pending: Partial<Record<PieceColor, MoveIntent>> = {};

  constructor(startPosition: GamePosition = royaleInitialPosition()) {
    this.currentPosition = startPosition;
  }

  get position(): GamePosition {
    return this.currentPosition;
  }

  get status(): GameStatus {
    return this.currentStatus;
  }

  legalIntents(position: GamePosition, color: PieceColor): MoveIntent[] {
    const intents: MoveIntent[] = [PASS_INTENT];
    for (let sq = 0; sq < position.board.length; sq++) {
      const piece = position.board[sq];
      if (piece && piece.color === color) {
        intents.push(...this.legalIntentsFrom(position, color, sq));
      }
    }
    return intents;
  }

  legalIntentsFrom(
    position: GamePosition,
    color: PieceColor,
    from: Square,
  ): MoveIntent[] {
    const piece = pieceAt(position.board, from);
    if (!piece || piece.color !== color) return [];
    const burnedRings = position.burnedRings ?? 0;
    const size = boardSize(position.board);
    const options = moveGenOptionsFor(burnedRings);
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
    if (intent.kind === 'move') {
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
    this.pending[color] = intent;
  }

  isRoundReady(): boolean {
    return this.pending.white !== undefined && this.pending.black !== undefined;
  }

  resolveRound(): RoundResolution {
    if (this.currentStatus.outcome !== 'ongoing') {
      throw new Error('Game is over — nothing to resolve.');
    }
    if (!this.isRoundReady()) {
      throw new Error('Both intents must be submitted before resolving.');
    }
    const burnedRings = this.currentPosition.burnedRings ?? 0;
    const roundJustPlayed = this.currentPosition.round;
    const resolution = resolveSimultaneousRound(
      this.currentPosition,
      this.pending.white!,
      this.pending.black!,
      { validate: true, moveGen: moveGenOptionsFor(burnedRings) },
    );
    this.pending = {};

    let position = resolution.position;
    let status = resolution.status;
    let events: ResolutionEvent[] = [...resolution.events];

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
