/**
 * Simultaneous Chess — both players move at once.
 *
 * Implements the exact v1 ruleset:
 *  - legality is judged against the start-of-round position only;
 *  - pass is legal; no check/checkmate/stalemate; no en passant;
 *  - same-destination moves bounce (rules 9–10);
 *  - captures on vacated squares whiff, pawns bounce instead (rule 11);
 *  - swaps/pass-throughs succeed — only destination conflicts matter (rule 12);
 *  - a castle bounces entirely if the opponent's move ends on any square of
 *    the king's or rook's path (rule 14);
 *  - capturing the king wins; both kings falling is a draw; three consecutive
 *    all-pass rounds is a draw; resignation loses (rules 15–18).
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
  createInitialBoard,
  findKing,
  makePiece,
  opponentOf,
  pieceAt,
  squareName,
  withChanges,
} from '../core/board';
import {
  CastleGeometry,
  Move,
  castleGeometry,
  generateMoves,
} from '../core/move-gen';
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

export function initialPosition(): GamePosition {
  return {
    board: createInitialBoard(),
    round: 1,
    consecutivePassRounds: 0,
  };
}

/** Rounds in which both players pass, in a row, that end the game in a draw. */
export const PASS_ROUNDS_FOR_DRAW = 3;

interface MovePlan {
  readonly color: PieceColor;
  readonly intent: MoveIntent;
  /** Matched pseudo-legal move; null for pass. */
  readonly move: Move | null;
  readonly piece: Piece | null;
  readonly geometry: CastleGeometry | null;
}

interface MoveOutcome {
  readonly plan: MovePlan;
  bounced: boolean;
  whiffed: boolean;
  /** For whiffs: whether the piece still lands on its destination. */
  landed: boolean;
  /** Rule 12: part of a mutual-origin swap — both moves simply succeed. */
  swapped: boolean;
  capturedPiece: PieceType | null;
  promotedTo: PromotionPiece | null;
}

/**
 * Find the generated move matching a move intent, or null if the intent is
 * not legal in this position.
 */
export function matchIntent(
  position: GamePosition,
  color: PieceColor,
  intent: MoveIntent,
): Move | null {
  if (intent.kind === 'pass') return null;
  const piece = pieceAt(position.board, intent.from);
  if (!piece || piece.color !== color) return null;
  const move = generateMoves(position.board, intent.from).find(
    (candidate) => candidate.to === intent.to,
  );
  if (!move) return null;
  if (move.isPromotion && !intent.promoteTo) return null;
  return move;
}

function planFor(
  position: GamePosition,
  color: PieceColor,
  intent: MoveIntent,
  validate: boolean,
): MovePlan {
  if (intent.kind === 'pass') {
    return { color, intent, move: null, piece: null, geometry: null };
  }
  let move = matchIntent(position, color, intent);
  if (!move) {
    if (validate) {
      throw new Error(
        `Illegal intent for ${color}: ${squareName(intent.from)}→${squareName(intent.to)}`,
      );
    }
    // Relaxed mode (used by specs and future multi-move modes): synthesize a
    // plain move so the resolution layer's defensive rules stay testable.
    move = {
      from: intent.from,
      to: intent.to,
      isCapture: pieceAt(position.board, intent.to) !== null,
      isDoubleStep: false,
      isPromotion: false,
      castle: null,
    };
  }
  return {
    color,
    intent,
    move,
    piece: pieceAt(position.board, move.from),
    geometry: move.castle ? castleGeometry(color, move.castle) : null,
  };
}

function isPass(plan: MovePlan): boolean {
  return plan.move === null;
}

function glyph(color: PieceColor, type: PieceType): string {
  return PIECE_GLYPHS[color][type];
}

function label(color: PieceColor): string {
  return color === 'white' ? 'White' : 'Black';
}

function baseEvent(color: PieceColor): Omit<ResolutionEvent, 'type' | 'description'> {
  return {
    color,
    piece: null,
    from: null,
    to: null,
    capturedPiece: null,
    landed: false,
    rookFrom: null,
    rookTo: null,
  };
}

function eventsForOutcome(outcome: MoveOutcome): ResolutionEvent[] {
  const { plan } = outcome;
  const color = plan.color;
  const events: ResolutionEvent[] = [];

  if (isPass(plan)) {
    return [
      { ...baseEvent(color), type: 'passed', description: `${label(color)} passed.` },
    ];
  }

  const move = plan.move!;
  const piece = plan.piece!;
  const pieceGlyph = glyph(color, piece.type);
  const path = `${squareName(move.from)}→${squareName(move.to)}`;

  if (plan.geometry) {
    const side = move.castle === 'king' ? 'kingside' : 'queenside';
    const castleFields = {
      piece: 'king' as PieceType,
      from: plan.geometry.kingFrom,
      to: plan.geometry.kingTo,
      rookFrom: plan.geometry.rookFrom,
      rookTo: plan.geometry.rookTo,
    };
    if (outcome.bounced) {
      events.push({
        ...baseEvent(color),
        ...castleFields,
        type: 'bounced',
        description: `${label(color)} ${side} castling bounced back — the path was contested.`,
      });
    } else {
      events.push({
        ...baseEvent(color),
        ...castleFields,
        type: 'castled',
        description: `${label(color)} castled ${side} (${pieceGlyph} ${path}).`,
      });
    }
    return events;
  }

  if (outcome.bounced) {
    events.push({
      ...baseEvent(color),
      type: 'bounced',
      piece: piece.type,
      from: move.from,
      to: move.to,
      description: `${label(color)} ${pieceGlyph} ${path} bounced back.`,
    });
    return events;
  }

  if (outcome.whiffed) {
    events.push({
      ...baseEvent(color),
      type: 'whiffed',
      piece: piece.type,
      from: move.from,
      to: move.to,
      landed: outcome.landed,
      description: outcome.landed
        ? `${label(color)} ${pieceGlyph} ${path} — capture whiffed, the target escaped.`
        : `${label(color)} ${pieceGlyph} capture on ${squareName(move.to)} whiffed — pawn bounced back.`,
    });
  } else if (outcome.capturedPiece) {
    events.push({
      ...baseEvent(color),
      type: 'captured',
      piece: piece.type,
      from: move.from,
      to: move.to,
      capturedPiece: outcome.capturedPiece,
      description: `${label(color)} ${pieceGlyph} ${path} captured ${glyph(opponentOf(color), outcome.capturedPiece)}.`,
    });
  } else {
    events.push({
      ...baseEvent(color),
      type: 'moved',
      piece: piece.type,
      from: move.from,
      to: move.to,
      description: outcome.swapped
        ? `${label(color)} ${pieceGlyph} ${path} — passed through.`
        : `${label(color)} ${pieceGlyph} ${path}.`,
    });
  }

  if (outcome.promotedTo) {
    events.push({
      ...baseEvent(color),
      type: 'promoted',
      piece: outcome.promotedTo,
      from: move.from,
      to: move.to,
      description: `${label(color)} pawn promoted to ${glyph(color, outcome.promotedTo)} on ${squareName(move.to)}.`,
    });
  }

  return events;
}

/**
 * Pure round resolver: applies both intents to the start-of-round position
 * and returns the new position plus resolution events. Exported so specs and
 * property tests can drive it directly.
 */
export function resolveSimultaneousRound(
  position: GamePosition,
  whiteIntent: MoveIntent,
  blackIntent: MoveIntent,
  options: { validate?: boolean } = {},
): RoundResolution {
  const validate = options.validate ?? true;
  const plans: Record<PieceColor, MovePlan> = {
    white: planFor(position, 'white', whiteIntent, validate),
    black: planFor(position, 'black', blackIntent, validate),
  };
  const outcomes: Record<PieceColor, MoveOutcome> = {
    white: {
      plan: plans.white,
      bounced: false,
      whiffed: false,
      landed: false,
      swapped: false,
      capturedPiece: null,
      promotedTo: null,
    },
    black: {
      plan: plans.black,
      bounced: false,
      whiffed: false,
      landed: false,
      swapped: false,
      capturedPiece: null,
      promotedTo: null,
    },
  };

  // Rule 14 — a castle bounces if the opponent's move ends on any square of
  // the king's or rook's path. (Two simultaneous castles are on opposite
  // ranks and can never contest each other.)
  for (const color of ['white', 'black'] as PieceColor[]) {
    const plan = plans[color];
    if (!plan.geometry) continue;
    const opponent = plans[opponentOf(color)];
    if (opponent.move && !opponent.geometry) {
      const contested =
        plan.geometry.kingPath.includes(opponent.move.to) ||
        plan.geometry.rookPath.includes(opponent.move.to);
      if (contested) outcomes[color].bounced = true;
    }
  }

  // Rules 9–10 — same destination: both movers bounce, any stationary
  // occupant of the contested square survives.
  const whiteMove = plans.white.move;
  const blackMove = plans.black.move;
  if (
    whiteMove &&
    blackMove &&
    !plans.white.geometry &&
    !plans.black.geometry &&
    whiteMove.to === blackMove.to
  ) {
    outcomes.white.bounced = true;
    outcomes.black.bounced = true;
  }

  const proceeds = (color: PieceColor): boolean =>
    plans[color].move !== null && !outcomes[color].bounced;

  // Rule 12 — mutual-origin swap: two pieces moving to each other's origin
  // squares pass through each other and both moves simply succeed. This
  // takes precedence over whiff handling (including the pawn exception).
  if (
    whiteMove &&
    blackMove &&
    !plans.white.geometry &&
    !plans.black.geometry &&
    !outcomes.white.bounced &&
    !outcomes.black.bounced &&
    whiteMove.to === blackMove.from &&
    blackMove.to === whiteMove.from
  ) {
    outcomes.white.swapped = true;
    outcomes.black.swapped = true;
  }

  // Rule 11 — whiffs: a capture aimed at a square its occupant is
  // successfully leaving. Pawns bounce back; everything else lands.
  for (const color of ['white', 'black'] as PieceColor[]) {
    if (!proceeds(color) || outcomes[color].swapped) continue;
    const plan = plans[color];
    if (plan.geometry || !plan.move!.isCapture) continue;
    const opponentColor = opponentOf(color);
    const opponentPlan = plans[opponentColor];
    const occupantLeaves =
      proceeds(opponentColor) &&
      !opponentPlan.geometry &&
      opponentPlan.move!.from === plan.move!.to;
    if (occupantLeaves) {
      outcomes[color].whiffed = true;
      outcomes[color].landed = plan.piece!.type !== 'pawn';
    }
  }

  // Rule 13 — normal captures: destination occupant did not (successfully)
  // move this round.
  for (const color of ['white', 'black'] as PieceColor[]) {
    if (!proceeds(color)) continue;
    const outcome = outcomes[color];
    if (outcome.whiffed || outcome.swapped || plans[color].geometry) continue;
    const move = plans[color].move!;
    if (move.isCapture) {
      outcome.capturedPiece = pieceAt(position.board, move.to)!.type;
    }
  }

  // Promotions: a pawn that actually reaches the last rank promotes.
  for (const color of ['white', 'black'] as PieceColor[]) {
    if (!proceeds(color)) continue;
    const outcome = outcomes[color];
    const move = plans[color].move!;
    const lands = !outcome.whiffed || outcome.landed;
    if (move.isPromotion && lands) {
      outcome.promotedTo =
        (plans[color].intent as { promoteTo?: PromotionPiece }).promoteTo ??
        'queen';
    }
  }

  // Build the new board: clear the origins of every piece that actually
  // leaves, then place landing pieces (destinations are conflict-free by
  // construction — same-destination pairs bounced above).
  const changes: { sq: Square; piece: Piece | null }[] = [];
  for (const color of ['white', 'black'] as PieceColor[]) {
    if (!proceeds(color)) continue;
    const outcome = outcomes[color];
    const plan = plans[color];
    if (outcome.whiffed && !outcome.landed) continue; // pawn whiff: never left
    if (plan.geometry) {
      changes.push({ sq: plan.geometry.kingFrom, piece: null });
      changes.push({ sq: plan.geometry.rookFrom, piece: null });
    } else {
      changes.push({ sq: plan.move!.from, piece: null });
    }
  }
  for (const color of ['white', 'black'] as PieceColor[]) {
    if (!proceeds(color)) continue;
    const outcome = outcomes[color];
    const plan = plans[color];
    if (outcome.whiffed && !outcome.landed) continue;
    if (plan.geometry) {
      changes.push({
        sq: plan.geometry.kingTo,
        piece: makePiece('king', color, true),
      });
      changes.push({
        sq: plan.geometry.rookTo,
        piece: makePiece('rook', color, true),
      });
    } else {
      const landedType = outcome.promotedTo ?? plan.piece!.type;
      changes.push({
        sq: plan.move!.to,
        piece: makePiece(landedType, color, true),
      });
    }
  }
  const newBoard = withChanges(position.board, changes);

  // Rules 15–17 — game end.
  const bothPassed = isPass(plans.white) && isPass(plans.black);
  const passStreak = bothPassed ? position.consecutivePassRounds + 1 : 0;
  const whiteKingAlive = findKing(newBoard, 'white') !== null;
  const blackKingAlive = findKing(newBoard, 'black') !== null;

  let status: GameStatus = ONGOING_STATUS;
  if (!whiteKingAlive && !blackKingAlive) {
    status = { outcome: 'draw', reason: 'both-kings-captured' };
  } else if (!blackKingAlive) {
    status = { outcome: 'white-won', reason: 'king-captured' };
  } else if (!whiteKingAlive) {
    status = { outcome: 'black-won', reason: 'king-captured' };
  } else if (passStreak >= PASS_ROUNDS_FOR_DRAW) {
    status = { outcome: 'draw', reason: 'triple-pass' };
  }

  const events = [
    ...eventsForOutcome(outcomes.white),
    ...eventsForOutcome(outcomes.black),
  ];

  return {
    round: position.round,
    positionBefore: position,
    position: {
      board: newBoard,
      round: position.round + 1,
      consecutivePassRounds: passStreak,
    },
    events,
    status,
  };
}

export class SimultaneousChessEngine implements ChessVariantEngine {
  private currentPosition: GamePosition;
  private currentStatus: GameStatus = ONGOING_STATUS;
  private pending: Partial<Record<PieceColor, MoveIntent>> = {};

  constructor(startPosition: GamePosition = initialPosition()) {
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
    const intents: MoveIntent[] = [];
    for (const move of generateMoves(position.board, from)) {
      if (move.isPromotion) {
        for (const promoteTo of ['queen', 'rook', 'bishop', 'knight'] as PromotionPiece[]) {
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
    if (intent.kind === 'move' && !matchIntent(this.currentPosition, color, intent)) {
      throw new Error(
        `Illegal intent for ${color}: ${squareName(intent.from)}→${squareName(intent.to)}`,
      );
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
    const resolution = resolveSimultaneousRound(
      this.currentPosition,
      this.pending.white!,
      this.pending.black!,
    );
    this.pending = {};
    this.currentPosition = resolution.position;
    this.currentStatus = resolution.status;
    return resolution;
  }

  resign(color: PieceColor): void {
    if (this.currentStatus.outcome !== 'ongoing') return;
    this.currentStatus = {
      outcome: color === 'white' ? 'black-won' : 'white-won',
      reason: 'resignation',
    };
  }
}
