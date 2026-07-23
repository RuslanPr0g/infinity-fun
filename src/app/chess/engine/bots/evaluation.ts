/**
 * Shared pure-TypeScript heuristics for the bot family.
 *
 * `applySolo` is the stationary-world board-after helper every bot uses to
 * score its own candidates. `attackersOf` counts attackers of a square (a
 * counting superset of `isSquareAttacked`) for hanging-piece detection.
 * `evaluateBoard` is a static material+positional evaluation used by Hard's
 * lookahead. `burnHazard`/`burnAdjustment` are the Shrinking Board Royale
 * burn-awareness terms Easy/Medium/Hard all share. `heuristicScore` /
 * `rankByHeuristic` are the "Medium-style" single-move scorer: Medium uses it
 * directly (plus randomization), Hard reuses it to rank its own candidates
 * and the opponent's plausible replies before its lookahead.
 *
 * Pure TypeScript — no Angular imports.
 */

import {
  Board,
  PIECE_VALUES,
  PieceColor,
  PieceType,
  Square,
  boardSize,
  fileOf,
  findKing,
  isInside,
  makePiece,
  opponentOf,
  pieceAt,
  rankOf,
  square,
  withChanges,
} from '../core/board';
import { castleGeometry, generateMoves, isSquareAttacked } from '../core/move-gen';
import type { GamePosition, MoveIntent } from '../variant';
import { doomedRingSquares, roundsUntilBurn } from '../burn';

export type MoveIntentOnly = Extract<MoveIntent, { kind: 'move' }>;

/**
 * Apply a single move to the board as if the opponent stood still — the
 * bots' stationary-world approximation for evaluating their own candidates.
 */
export function applySolo(
  board: Board,
  color: PieceColor,
  intent: MoveIntentOnly,
): Board {
  const move = generateMoves(board, intent.from).find(
    (candidate) => candidate.to === intent.to,
  );
  if (!move) return board;
  if (move.castle) {
    const geometry = castleGeometry(color, move.castle);
    return withChanges(board, [
      { sq: geometry.kingFrom, piece: null },
      { sq: geometry.rookFrom, piece: null },
      { sq: geometry.kingTo, piece: makePiece('king', color, true) },
      { sq: geometry.rookTo, piece: makePiece('rook', color, true) },
    ]);
  }
  const mover = pieceAt(board, intent.from)!;
  const landedType = move.isPromotion ? intent.promoteTo ?? 'queen' : mover.type;
  const changes: { sq: Square; piece: ReturnType<typeof makePiece> | null }[] = [
    { sq: intent.from, piece: null },
    { sq: intent.to, piece: makePiece(landedType, color, true) },
  ];
  return withChanges(board, changes);
}

const KNIGHT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const ROOK_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const BISHOP_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Count how many `byColor` pieces attack `target` on a static board — a
 * counting superset of `isSquareAttacked`. Used for hanging-piece detection
 * (attackers vs. defenders of a square).
 */
export function attackersOf(
  board: Board,
  target: Square,
  byColor: PieceColor,
): number {
  const size = boardSize(board);
  const targetFile = fileOf(target, size);
  const targetRank = rankOf(target, size);
  let count = 0;

  const pawnDirection = byColor === 'white' ? 1 : -1;
  for (const df of [-1, 1]) {
    const f = targetFile + df;
    const r = targetRank - pawnDirection;
    if (isInside(f, r, size)) {
      const piece = pieceAt(board, square(f, r, size));
      if (piece && piece.color === byColor && piece.type === 'pawn') count++;
    }
  }

  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = targetFile + df;
    const r = targetRank + dr;
    if (isInside(f, r, size)) {
      const piece = pieceAt(board, square(f, r, size));
      if (piece && piece.color === byColor && piece.type === 'knight') count++;
    }
  }

  for (const [df, dr] of KING_OFFSETS) {
    const f = targetFile + df;
    const r = targetRank + dr;
    if (isInside(f, r, size)) {
      const piece = pieceAt(board, square(f, r, size));
      if (piece && piece.color === byColor && piece.type === 'king') count++;
    }
  }

  const slideChecks: ReadonlyArray<{
    directions: ReadonlyArray<readonly [number, number]>;
    types: ReadonlyArray<PieceType>;
  }> = [
    { directions: ROOK_DIRECTIONS, types: ['rook', 'queen'] },
    { directions: BISHOP_DIRECTIONS, types: ['bishop', 'queen'] },
  ];
  for (const { directions, types } of slideChecks) {
    for (const [df, dr] of directions) {
      for (let step = 1; step < size; step++) {
        const f = targetFile + df * step;
        const r = targetRank + dr * step;
        if (!isInside(f, r, size)) break;
        const piece = pieceAt(board, square(f, r, size));
        if (!piece) continue;
        if (piece.color === byColor && types.includes(piece.type)) count++;
        break;
      }
    }
  }
  return count;
}

/** Raw material balance, `forColor` minus the opponent. */
export function materialScore(board: Board, forColor: PieceColor): number {
  let score = 0;
  for (const piece of board) {
    if (!piece) continue;
    score += (piece.color === forColor ? 1 : -1) * PIECE_VALUES[piece.type];
  }
  return score;
}

/**
 * Small positional terms only (no material): center control scaled by board
 * size, advanced-pawn bonuses, and a large king-alive dominance term.
 */
export function positionalScore(board: Board, forColor: PieceColor): number {
  const size = boardSize(board);
  const center = (size - 1) / 2;
  const maxDist = center * 2 || 1;
  let score = 0;
  for (let sq = 0; sq < board.length; sq++) {
    const piece = board[sq];
    if (!piece) continue;
    const sign = piece.color === forColor ? 1 : -1;
    const file = fileOf(sq, size);
    const rank = rankOf(sq, size);
    const distFromCenter = Math.abs(file - center) + Math.abs(rank - center);
    score += sign * (1 - distFromCenter / maxDist) * 0.1;
    if (piece.type === 'pawn') {
      const advance = piece.color === 'white' ? rank : size - 1 - rank;
      score += sign * advance * 0.02;
    }
  }
  const forAlive = findKing(board, forColor) !== null;
  const enemyAlive = findKing(board, opponentOf(forColor)) !== null;
  if (!enemyAlive && forAlive) score += 500;
  if (!forAlive && enemyAlive) score -= 500;
  return score;
}

/**
 * Static board evaluation: material plus small positional terms, `forColor`
 * minus the opponent. Used by Hard's lookahead to score resulting boards.
 */
export function evaluateBoard(board: Board, forColor: PieceColor): number {
  return materialScore(board, forColor) + positionalScore(board, forColor);
}

export interface BurnHazard {
  /** Rounds left (inclusive) until the next ring burns. */
  readonly remainingRounds: number;
  readonly doomedSquares: ReadonlySet<Square>;
}

/**
 * Royale burn-hazard context, or null outside Royale (`burnedRings`
 * undefined) or when no burn is imminent within `withinRounds`.
 */
export function burnHazard(
  position: GamePosition,
  withinRounds = 3,
): BurnHazard | null {
  if (position.burnedRings === undefined) return null;
  const remaining = roundsUntilBurn(position.round, position.burnedRings);
  if (remaining === null || remaining > withinRounds) return null;
  const doomed = doomedRingSquares(position.burnedRings, boardSize(position.board));
  return { remainingRounds: remaining, doomedSquares: new Set(doomed) };
}

/**
 * The burn penalty / evacuation-bonus terms Easy/Medium/Hard all share:
 * penalize landing on the doomed ring, reward leaving it, and give a king
 * evacuation a large extra push.
 */
export function burnAdjustment(
  position: GamePosition,
  mover: PieceType,
  from: Square,
  to: Square,
): number {
  const hazard = burnHazard(position);
  if (!hazard) return 0;
  let adjustment = 0;
  const destDoomed = hazard.doomedSquares.has(to);
  const originDoomed = hazard.doomedSquares.has(from);
  if (destDoomed) {
    adjustment -= PIECE_VALUES[mover];
  }
  if (originDoomed) {
    adjustment += PIECE_VALUES[mover] * 0.8;
    if (mover === 'king' && !destDoomed) {
      adjustment += 50; // a safe king evacuation always outranks quiet moves
    }
  }
  return adjustment;
}

export interface HeuristicScore {
  readonly intent: MoveIntentOnly;
  readonly score: number;
  readonly capturesKing: boolean;
  readonly kingSafeAfter: boolean;
}

/** Discount applied to a capture's value when the target could flee (Simultaneous only). */
const FLEE_RISK_DISCOUNT = 0.8;
/** Penalty for landing where attackers outnumber defenders, scaled by the mover's value. */
const HANGING_PENALTY_SCALE = 0.9;
/** Softer penalty for newly hanging one of the mover's OTHER pieces. */
const OTHER_HANGING_PENALTY_SCALE = 0.5;

/**
 * "Medium-style" single-move heuristic: material (discounted for flee risk
 * in Simultaneous mode, full value in Royale), hanging-piece avoidance for
 * the mover (and cheaply for other own pieces), king safety, Royale burn
 * awareness, promotion bonus, and small positional terms. Deterministic — no
 * randomness. Shared by Medium (which randomizes among its top scorers) and
 * Hard (which uses it to rank candidates/replies before its lookahead).
 */
export function heuristicScore(
  position: GamePosition,
  color: PieceColor,
  intent: MoveIntentOnly,
): HeuristicScore {
  const board = position.board;
  const enemy = opponentOf(color);
  const mover = pieceAt(board, intent.from)!;
  const target = pieceAt(board, intent.to);
  const isRoyale = position.burnedRings !== undefined;

  const boardAfter = applySolo(board, color, intent);
  const kingSquare = findKing(boardAfter, color);
  const kingSafeAfter =
    kingSquare !== null && !isSquareAttacked(boardAfter, kingSquare, enemy);

  let score = 0;
  const capturesKing = target?.type === 'king';

  if (target) {
    let captureValue = PIECE_VALUES[target.type];
    if (!isRoyale && generateMoves(board, intent.to).length > 0) {
      captureValue *= FLEE_RISK_DISCOUNT; // the target may dodge this round
    }
    score += captureValue;
  }

  const attackers = attackersOf(boardAfter, intent.to, enemy);
  const defenders = attackersOf(boardAfter, intent.to, color);
  if (attackers > defenders) {
    score -= PIECE_VALUES[mover.type] * HANGING_PENALTY_SCALE;
  } else if (target) {
    score += 0.5; // safe capture bonus
  }

  // Cheaply check whether the move newly hangs one of the mover's OTHER
  // pieces (lost a defender, or opened a discovered line). Skips pieces that
  // were already hanging before the move — this only flags moves that cause
  // new damage.
  for (let sq = 0; sq < boardAfter.length; sq++) {
    if (sq === intent.to) continue;
    const piece = boardAfter[sq];
    if (!piece || piece.color !== color || piece.type === 'king') continue;
    const wasHanging = attackersOf(board, sq, enemy) > attackersOf(board, sq, color);
    if (wasHanging) continue;
    const isHangingNow =
      attackersOf(boardAfter, sq, enemy) > attackersOf(boardAfter, sq, color);
    if (isHangingNow) {
      score -= PIECE_VALUES[piece.type] * OTHER_HANGING_PENALTY_SCALE;
    }
  }

  if (intent.promoteTo) {
    score += PIECE_VALUES[intent.promoteTo] - PIECE_VALUES.pawn;
  }

  if (!kingSafeAfter) {
    score -= PIECE_VALUES.king;
  }

  score += burnAdjustment(position, mover.type, intent.from, intent.to);
  score += positionalScore(boardAfter, color) - positionalScore(board, color);

  return { intent, score, capturesKing, kingSafeAfter };
}

/** Score and rank a set of move intents, best first. */
export function rankByHeuristic(
  position: GamePosition,
  color: PieceColor,
  intents: ReadonlyArray<MoveIntentOnly>,
): HeuristicScore[] {
  return intents
    .map((intent) => heuristicScore(position, color, intent))
    .sort((a, b) => b.score - a.score);
}
