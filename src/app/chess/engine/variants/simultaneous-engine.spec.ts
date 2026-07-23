import * as fc from 'fast-check';
import { GamePosition, MoveIntent, PASS_INTENT } from '../variant';
import {
  Board,
  boardFrom,
  countPieces,
  fileOf,
  opponentOf,
  parseSquare,
  pieceAt,
  rankOf,
  square,
} from '../core/board';
import {
  SimultaneousChessEngine,
  matchIntent,
  resolveSimultaneousRound,
} from './simultaneous-engine';

function positionOf(board: Board): GamePosition {
  return { board, round: 1, consecutivePassRounds: 0 };
}

function move(from: string, to: string, promoteTo?: 'queen' | 'rook' | 'bishop' | 'knight'): MoveIntent {
  return promoteTo
    ? { kind: 'move', from: parseSquare(from), to: parseSquare(to), promoteTo }
    : { kind: 'move', from: parseSquare(from), to: parseSquare(to) };
}

function pieceCode(board: Board, name: string): string | null {
  const piece = pieceAt(board, parseSquare(name));
  if (!piece) return null;
  const letters: Record<string, string> = {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    pawn: 'P',
  };
  return `${piece.color === 'white' ? 'w' : 'b'}${letters[piece.type]}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomIntent(
  engine: SimultaneousChessEngine,
  color: 'white' | 'black',
  rng: () => number,
): MoveIntent {
  const intents = engine.legalIntents(engine.position, color);
  return intents[Math.floor(rng() * intents.length)];
}

/** Play `rounds` random rounds from the initial position. */
function randomPlayout(seed: number, rounds: number): SimultaneousChessEngine {
  const rng = mulberry32(seed);
  const engine = new SimultaneousChessEngine();
  for (let i = 0; i < rounds && engine.status.outcome === 'ongoing'; i++) {
    engine.submitIntent('white', randomIntent(engine, 'white', rng));
    engine.submitIntent('black', randomIntent(engine, 'black', rng));
    engine.resolveRound();
  }
  return engine;
}

describe('SimultaneousChessEngine', () => {
  describe('Rule 9 — same empty destination bounces both movers', () => {
    // Fixture "knightsConvergeOnC3": both knights can reach the empty c3.
    const fixture = boardFrom({ e1: 'wK', e8: 'bK', b1: 'wN', b5: 'bN' });

    it('bounces both pieces and leaves the position identical', () => {
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('b1', 'c3'),
        move('b5', 'c3'),
      );
      expect(resolution.position.board).toEqual(fixture);
      expect(resolution.events.map((event) => event.type)).toEqual([
        'bounced',
        'bounced',
      ]);
      expect(resolution.status.outcome).toBe('ongoing');
    });
  });

  describe('Rule 10 — same occupied destination: movers bounce, occupant survives', () => {
    // Fixture "convergeOnGuardedPawn": a stationary black pawn on d5; white
    // legally captures it while a second mover also targets d5. With exactly
    // one strictly-legal move per side this cannot arise in v1 play (the
    // occupant is always friendly to one mover), so the defensive resolution
    // rule is exercised through the relaxed validation entry point.
    const fixture = boardFrom({
      e1: 'wK',
      e8: 'bK',
      c3: 'wN',
      d8: 'bR',
      d5: 'bP',
    });

    it('bounces both movers and the stationary piece survives', () => {
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('c3', 'd5'),
        move('d8', 'd5'),
        { validate: false },
      );
      expect(resolution.position.board).toEqual(fixture);
      expect(pieceCode(resolution.position.board, 'd5')).toBe('bP');
      expect(resolution.events.map((event) => event.type)).toEqual([
        'bounced',
        'bounced',
      ]);
    });
  });

  describe('Rule 11 — capture on a vacated square whiffs', () => {
    it('lets a non-pawn land on the vacated square (fixture "rookChasesKnight")', () => {
      const fixture = boardFrom({ e1: 'wK', e8: 'bK', d1: 'wR', d5: 'bN' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('d1', 'd5'),
        move('d5', 'f6'),
      );
      expect(pieceCode(resolution.position.board, 'd5')).toBe('wR');
      expect(pieceCode(resolution.position.board, 'f6')).toBe('bN');
      expect(countPieces(resolution.position.board)).toBe(4);
      const whiff = resolution.events.find((event) => event.type === 'whiffed')!;
      expect(whiff.color).toBe('white');
      expect(whiff.landed).toBeTrue();
    });

    it('bounces a pawn whose diagonal capture whiffs (fixture "pawnStabsAir")', () => {
      const fixture = boardFrom({ e1: 'wK', e8: 'bK', e4: 'wP*', d5: 'bN' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('e4', 'd5'),
        move('d5', 'f6'),
      );
      expect(pieceCode(resolution.position.board, 'e4')).toBe('wP');
      expect(pieceAt(resolution.position.board, parseSquare('d5'))).toBeNull();
      expect(pieceCode(resolution.position.board, 'f6')).toBe('bN');
      const whiff = resolution.events.find((event) => event.type === 'whiffed')!;
      expect(whiff.landed).toBeFalse();
    });
  });

  describe('Rule 12 — swaps and pass-throughs succeed', () => {
    it('swaps two pieces moving to each other\'s origins (fixture "rookSwap")', () => {
      const fixture = boardFrom({ e1: 'wK', e8: 'bK', d1: 'wR', d8: 'bR' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('d1', 'd8'),
        move('d8', 'd1'),
      );
      expect(pieceCode(resolution.position.board, 'd8')).toBe('wR');
      expect(pieceCode(resolution.position.board, 'd1')).toBe('bR');
      expect(countPieces(resolution.position.board)).toBe(4);
      expect(resolution.events.map((event) => event.type)).toEqual([
        'moved',
        'moved',
      ]);
    });

    it('lets sliding pieces pass through each other on the same line (fixture "rooksCross")', () => {
      const fixture = boardFrom({ e1: 'wK', e8: 'bK', a4: 'wR', h4: 'bR' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('a4', 'e4'),
        move('h4', 'b4'),
      );
      expect(pieceCode(resolution.position.board, 'e4')).toBe('wR');
      expect(pieceCode(resolution.position.board, 'b4')).toBe('bR');
      expect(countPieces(resolution.position.board)).toBe(4);
    });

    it('applies swap precedence over the pawn whiff exception (fixture "pawnBishopSwap")', () => {
      const fixture = boardFrom({ e1: 'wK', e8: 'bK', e4: 'wP*', d5: 'bB' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('e4', 'd5'),
        move('d5', 'e4'),
      );
      expect(pieceCode(resolution.position.board, 'd5')).toBe('wP');
      expect(pieceCode(resolution.position.board, 'e4')).toBe('bB');
      expect(countPieces(resolution.position.board)).toBe(4);
    });
  });

  describe('Rule 13 — normal capture of a piece that did not move', () => {
    it('captures a stationary piece (fixture "bishopTakesF7")', () => {
      const fixture = boardFrom({
        e1: 'wK',
        e8: 'bK',
        c4: 'wB',
        f7: 'bP',
        g8: 'bN',
      });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('c4', 'f7'),
        move('g8', 'h6'),
      );
      expect(pieceCode(resolution.position.board, 'f7')).toBe('wB');
      expect(countPieces(resolution.position.board)).toBe(4);
      const capture = resolution.events.find((event) => event.type === 'captured')!;
      expect(capture.color).toBe('white');
      expect(capture.capturedPiece).toBe('pawn');
    });
  });

  describe('Rule 14 — castling and path interference', () => {
    it('castles when king and rook are unmoved and the path is uncontested', () => {
      const fixture = boardFrom({ e1: 'wK', h1: 'wR', e8: 'bK', a7: 'bP' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('e1', 'g1'),
        move('a7', 'a6'),
      );
      expect(pieceCode(resolution.position.board, 'g1')).toBe('wK');
      expect(pieceCode(resolution.position.board, 'f1')).toBe('wR');
      expect(
        resolution.events.find((event) => event.type === 'castled'),
      ).toBeDefined();
    });

    it('bounces the whole castle when the opponent ends on the king path', () => {
      const fixture = boardFrom({ e1: 'wK', h1: 'wR', e8: 'bK', f8: 'bR' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('e1', 'g1'),
        move('f8', 'f1'),
      );
      expect(pieceCode(resolution.position.board, 'e1')).toBe('wK');
      expect(pieceCode(resolution.position.board, 'h1')).toBe('wR');
      expect(pieceCode(resolution.position.board, 'f1')).toBe('bR');
      // The bounced king and rook are unmoved and may castle later.
      expect(pieceAt(resolution.position.board, parseSquare('e1'))!.hasMoved).toBeFalse();
      expect(pieceAt(resolution.position.board, parseSquare('h1'))!.hasMoved).toBeFalse();
      const bounce = resolution.events.find((event) => event.type === 'bounced')!;
      expect(bounce.color).toBe('white');
      expect(bounce.rookFrom).not.toBeNull();
    });

    it('lets the opponent capture the bounced rook on its origin (rook path)', () => {
      const fixture = boardFrom({ e1: 'wK', h1: 'wR', e8: 'bK', h8: 'bR' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('e1', 'g1'),
        move('h8', 'h1'),
      );
      expect(pieceCode(resolution.position.board, 'e1')).toBe('wK');
      expect(pieceCode(resolution.position.board, 'h1')).toBe('bR');
      const capture = resolution.events.find((event) => event.type === 'captured')!;
      expect(capture.color).toBe('black');
      expect(capture.capturedPiece).toBe('rook');
    });

    it('lets the opponent capture the king on its origin, winning the game', () => {
      const fixture = boardFrom({ e1: 'wK', h1: 'wR', e8: 'bK', e5: 'bR' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('e1', 'g1'),
        move('e5', 'e1'),
      );
      expect(pieceCode(resolution.position.board, 'e1')).toBe('bR');
      expect(resolution.status).toEqual({
        outcome: 'black-won',
        reason: 'king-captured',
      });
    });
  });

  describe('Rule 15 — capturing the king wins immediately', () => {
    it('ends the game when a stationary king is captured (fixture "queenSnipesKing")', () => {
      const fixture = boardFrom({ e1: 'wK', e8: 'bK', h5: 'wQ', a7: 'bP' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('h5', 'e8'),
        move('a7', 'a6'),
      );
      expect(resolution.status).toEqual({
        outcome: 'white-won',
        reason: 'king-captured',
      });
      expect(pieceCode(resolution.position.board, 'e8')).toBe('wQ');
    });
  });

  describe('Rule 16 — both kings captured in the same round is a draw', () => {
    it('draws on mutual king capture (fixture "doubleRegicide")', () => {
      const fixture = boardFrom({ a8: 'bK', h1: 'wK', a2: 'wR', h8: 'bR' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        move('a2', 'a8'),
        move('h8', 'h1'),
      );
      expect(resolution.status).toEqual({
        outcome: 'draw',
        reason: 'both-kings-captured',
      });
    });
  });

  describe('A fully boxed-in, attacked king loses immediately', () => {
    // a1's only three neighbors (a2, b1, b2) are occupied by white's own
    // pawns, so the king has zero legal moves — but a knight's attack isn't
    // blocked by those pieces, so it can still be "attacked" despite being
    // boxed in by its own side.
    const boxedKingSquares = { a1: 'wK', a2: 'wP', b1: 'wP', b2: 'wP' };

    it('ends the game when the boxed-in king is attacked (fixture "cornerMate")', () => {
      const fixture = boardFrom({ ...boxedKingSquares, c2: 'bN', h8: 'bK' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        PASS_INTENT,
        PASS_INTENT,
      );
      expect(resolution.status).toEqual({
        outcome: 'black-won',
        reason: 'king-trapped',
      });
    });

    it('stays ongoing when the boxed-in king is not attacked by anything', () => {
      const fixture = boardFrom({ ...boxedKingSquares, h8: 'bK' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        PASS_INTENT,
        PASS_INTENT,
      );
      expect(resolution.status.outcome).toBe('ongoing');
    });

    it('stays ongoing when the attacked king still has a free square to escape to', () => {
      // b2 left empty: the king has one legal move, so it is not "trapped" —
      // it may still freely walk into the attacked square, unchanged.
      const fixture = boardFrom({ a1: 'wK', a2: 'wP', b1: 'wP', c2: 'bN', h8: 'bK' });
      const resolution = resolveSimultaneousRound(
        positionOf(fixture),
        PASS_INTENT,
        PASS_INTENT,
      );
      expect(resolution.status.outcome).toBe('ongoing');
    });
  });

  describe('Rule 17 — three consecutive all-pass rounds draw the game', () => {
    it('draws after three straight all-pass rounds', () => {
      const engine = new SimultaneousChessEngine();
      for (let i = 0; i < 3; i++) {
        expect(engine.status.outcome).toBe('ongoing');
        engine.submitIntent('white', PASS_INTENT);
        engine.submitIntent('black', PASS_INTENT);
        engine.resolveRound();
      }
      expect(engine.status).toEqual({ outcome: 'draw', reason: 'triple-pass' });
    });

    it('resets the pass streak when any move is made', () => {
      const engine = new SimultaneousChessEngine();
      for (let i = 0; i < 2; i++) {
        engine.submitIntent('white', PASS_INTENT);
        engine.submitIntent('black', PASS_INTENT);
        engine.resolveRound();
      }
      engine.submitIntent('white', move('e2', 'e4'));
      engine.submitIntent('black', PASS_INTENT);
      engine.resolveRound();
      expect(engine.position.consecutivePassRounds).toBe(0);

      for (let i = 0; i < 2; i++) {
        engine.submitIntent('white', PASS_INTENT);
        engine.submitIntent('black', PASS_INTENT);
        engine.resolveRound();
      }
      expect(engine.status.outcome).toBe('ongoing');
      engine.submitIntent('white', PASS_INTENT);
      engine.submitIntent('black', PASS_INTENT);
      engine.resolveRound();
      expect(engine.status).toEqual({ outcome: 'draw', reason: 'triple-pass' });
    });
  });

  describe('Rule 18 — resignation', () => {
    it('awards the game to the opponent', () => {
      const engine = new SimultaneousChessEngine();
      engine.resign('white');
      expect(engine.status).toEqual({
        outcome: 'black-won',
        reason: 'resignation',
      });
      expect(() => engine.submitIntent('white', PASS_INTENT)).toThrow();
    });
  });

  describe('Intent validation', () => {
    it('rejects illegal intents and promotion moves without a chosen piece', () => {
      const engine = new SimultaneousChessEngine();
      expect(() => engine.submitIntent('white', move('e2', 'e5'))).toThrow();
      expect(() => engine.submitIntent('white', move('e7', 'e5'))).toThrow();

      const promo = positionOf(boardFrom({ e1: 'wK', a8: 'bK', g7: 'wP*' }));
      const promoEngine = new SimultaneousChessEngine(promo);
      expect(() => promoEngine.submitIntent('white', move('g7', 'g8'))).toThrow();
      promoEngine.submitIntent('white', move('g7', 'g8', 'knight'));
      promoEngine.submitIntent('black', PASS_INTENT);
      const resolution = promoEngine.resolveRound();
      expect(pieceCode(resolution.position.board, 'g8')).toBe('wN');
      expect(
        resolution.events.find((event) => event.type === 'promoted'),
      ).toBeDefined();
    });
  });
});

describe('Simultaneous resolution — property-based invariants', () => {
  it('never increases the piece count across any round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 1, max: 12 }),
        (seed, rounds) => {
          const rng = mulberry32(seed);
          const engine = new SimultaneousChessEngine();
          for (let i = 0; i < rounds && engine.status.outcome === 'ongoing'; i++) {
            const before = countPieces(engine.position.board);
            engine.submitIntent('white', randomIntent(engine, 'white', rng));
            engine.submitIntent('black', randomIntent(engine, 'black', rng));
            const resolution = engine.resolveRound();
            expect(countPieces(resolution.position.board)).toBeLessThanOrEqual(before);
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  it('leaves the position identical after a fully bounced round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 8 }),
        (seed, rounds) => {
          const engine = randomPlayout(seed, rounds);
          if (engine.status.outcome !== 'ongoing') return;
          const position = engine.position;

          const movesFor = (color: 'white' | 'black') =>
            engine
              .legalIntents(position, color)
              .filter((intent) => intent.kind === 'move')
              .filter((intent) => matchIntent(position, color, intent)!.castle === null);

          const whiteMoves = movesFor('white');
          const blackMoves = movesFor('black');
          for (const white of whiteMoves) {
            if (white.kind !== 'move') continue;
            if (pieceAt(position.board, white.to) !== null) continue;
            const black = blackMoves.find(
              (candidate) => candidate.kind === 'move' && candidate.to === white.to,
            );
            if (!black) continue;
            const resolution = resolveSimultaneousRound(position, white, black);
            expect(resolution.position.board).toEqual(position.board);
            expect(resolution.position.round).toBe(position.round + 1);
            expect(resolution.position.consecutivePassRounds).toBe(0);
            return;
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  it('is symmetric: mirroring the board and swapping colors mirrors the result', () => {
    const mirrorSquare = (sq: number) => square(fileOf(sq), 7 - rankOf(sq));
    const mirrorBoard = (board: Board): Board => {
      const cells: (Board[number])[] = new Array(64).fill(null);
      for (let sq = 0; sq < 64; sq++) {
        const piece = board[sq];
        if (piece) {
          cells[mirrorSquare(sq)] = { ...piece, color: opponentOf(piece.color) };
        }
      }
      return cells;
    };
    const mirrorIntent = (intent: MoveIntent): MoveIntent =>
      intent.kind === 'pass'
        ? intent
        : {
            kind: 'move',
            from: mirrorSquare(intent.from),
            to: mirrorSquare(intent.to),
            ...(intent.promoteTo ? { promoteTo: intent.promoteTo } : {}),
          };

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 8 }),
        (seed, rounds) => {
          const engine = randomPlayout(seed, rounds);
          if (engine.status.outcome !== 'ongoing') return;
          const position = engine.position;
          const rng = mulberry32(seed ^ 0x5bf03635);
          const white = randomIntent(engine, 'white', rng);
          const black = randomIntent(engine, 'black', rng);

          const direct = resolveSimultaneousRound(position, white, black);
          const mirrored = resolveSimultaneousRound(
            {
              board: mirrorBoard(position.board),
              round: position.round,
              consecutivePassRounds: position.consecutivePassRounds,
            },
            mirrorIntent(black),
            mirrorIntent(white),
          );

          expect(mirrored.position.board).toEqual(mirrorBoard(direct.position.board));
          const flippedOutcome =
            direct.status.outcome === 'white-won'
              ? 'black-won'
              : direct.status.outcome === 'black-won'
                ? 'white-won'
                : direct.status.outcome;
          expect(mirrored.status.outcome).toBe(flippedOutcome);
          expect(mirrored.position.consecutivePassRounds).toBe(
            direct.position.consecutivePassRounds,
          );
        },
      ),
      { numRuns: 25 },
    );
  });
});
