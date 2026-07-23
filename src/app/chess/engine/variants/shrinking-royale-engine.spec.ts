import * as fc from 'fast-check';
import {
  Board,
  PromotionPiece,
  boardFrom,
  countPieces,
  parseSquare,
  pieceAt,
} from '../core/board';
import { GamePosition, MoveIntent, PASS_INTENT } from '../variant';
import {
  MAX_BURNED_RINGS,
  isVoidSquare,
  roundsUntilBurn,
} from '../burn';
import {
  ShrinkingRoyaleEngine,
  createRoyaleInitialBoard,
  royaleInitialPosition,
} from './shrinking-royale-engine';

const SIZE = 15;

function move(from: string, to: string, promoteTo?: PromotionPiece): MoveIntent {
  return promoteTo
    ? { kind: 'move', from: parseSquare(from, SIZE), to: parseSquare(to, SIZE), promoteTo }
    : { kind: 'move', from: parseSquare(from, SIZE), to: parseSquare(to, SIZE) };
}

function pieceCode(board: Board, name: string): string | null {
  const piece = pieceAt(board, parseSquare(name, SIZE));
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

describe('ShrinkingRoyaleEngine', () => {
  describe('Starting position', () => {
    it('places 46 pieces with kings on file h and queens on file g', () => {
      const board = createRoyaleInitialBoard();
      expect(countPieces(board)).toBe(46);
      expect(pieceCode(board, 'h1')).toBe('wK');
      expect(pieceCode(board, 'g1')).toBe('wQ');
      expect(pieceCode(board, 'h15')).toBe('bK');
      expect(pieceCode(board, 'g15')).toBe('bQ');
    });

    it('spans pawns across every file on both front lines', () => {
      const board = createRoyaleInitialBoard();
      const files = 'abcdefghijklmno';
      for (const file of files) {
        expect(pieceCode(board, `${file}2`)).toBe('wP');
        expect(pieceCode(board, `${file}14`)).toBe('bP');
      }
    });
  });

  describe('Void filtering', () => {
    it('excludes void destinations from legal intents once a ring is burned', () => {
      // A rook sitting right on the boundary of the intact area when ring 0
      // has burned: it can slide toward the edge, but those squares are void.
      const sparse = boardFrom({ h8: 'wK*', g8: 'bK*', b2: 'wR*' }, SIZE);
      const position: GamePosition = {
        board: sparse,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 1,
      };
      const engine = new ShrinkingRoyaleEngine(position);
      const intents = engine.legalIntentsFrom(position, 'white', parseSquare('b2', SIZE));
      const targets = intents
        .filter((intent) => intent.kind === 'move')
        .map((intent) => (intent as Extract<MoveIntent, { kind: 'move' }>).to);

      expect(targets.length).toBeGreaterThan(0);
      for (const to of targets) {
        expect(isVoidSquare(to, 1, SIZE)).toBeFalse();
      }
      expect(targets).not.toContain(parseSquare('a2', SIZE));
      expect(targets).not.toContain(parseSquare('b1', SIZE));

      expect(() =>
        engine.submitIntent('white', move('b2', 'a2')),
      ).toThrow();
      expect(() =>
        engine.submitIntent('white', move('b2', 'b1')),
      ).toThrow();
    });
  });

  describe('Burn timing', () => {
    it('burns ring 0 only after round 6, destroying whatever stands on it', () => {
      const board: Board = boardFrom(
        { h8: 'wK*', g8: 'bK*', a1: 'wP', o15: 'bP', d4: 'wR*' },
        SIZE,
      );
      const position: GamePosition = {
        board,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(position);

      const shuttle = (round: number): MoveIntent =>
        round % 2 === 1 ? move('d4', 'd5') : move('d5', 'd4');

      for (let round = 1; round <= 5; round++) {
        engine.submitIntent('white', shuttle(round));
        engine.submitIntent('black', PASS_INTENT);
        const resolution = engine.resolveRound();
        expect(resolution.events.some((event) => event.type === 'burned')).toBeFalse();
        expect(engine.position.burnedRings).toBe(0);
      }

      expect(pieceCode(engine.position.board, 'a1')).toBe('wP');
      expect(pieceCode(engine.position.board, 'o15')).toBe('bP');

      engine.submitIntent('white', shuttle(6));
      engine.submitIntent('black', PASS_INTENT);
      const resolution = engine.resolveRound();

      expect(engine.position.burnedRings).toBe(1);
      expect(pieceAt(engine.position.board, parseSquare('a1', SIZE))).toBeNull();
      expect(pieceAt(engine.position.board, parseSquare('o15', SIZE))).toBeNull();
      const burned = resolution.events.filter((event) => event.type === 'burned');
      expect(burned.length).toBe(2);
      expect(resolution.status.outcome).toBe('ongoing');
    });
  });

  describe('King burn end conditions', () => {
    it('ends the game for black when only the white king burns', () => {
      const board: Board = boardFrom({ a1: 'wK*', h8: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 6,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(position);
      engine.submitIntent('white', PASS_INTENT);
      engine.submitIntent('black', PASS_INTENT);
      const resolution = engine.resolveRound();

      expect(resolution.status).toEqual({ outcome: 'black-won', reason: 'king-burned' });
      expect(engine.status).toEqual({ outcome: 'black-won', reason: 'king-burned' });
    });

    it('draws the game when both kings burn together', () => {
      const board: Board = boardFrom({ a1: 'wK*', o15: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 6,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(position);
      engine.submitIntent('white', PASS_INTENT);
      engine.submitIntent('black', PASS_INTENT);
      const resolution = engine.resolveRound();

      expect(resolution.status).toEqual({ outcome: 'draw', reason: 'both-kings-burned' });
    });
  });

  describe('Promotion on the outermost intact rank', () => {
    it('promotes a pawn on rank (15 - burnedRings) rather than the literal last rank', () => {
      const board: Board = boardFrom(
        { h8: 'wK*', g8: 'bK*', d13: 'wP*' },
        SIZE,
      );
      const position: GamePosition = {
        board,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 1,
      };
      const engine = new ShrinkingRoyaleEngine(position);

      const intents = engine
        .legalIntentsFrom(position, 'white', parseSquare('d13', SIZE))
        .filter((intent) => intent.kind === 'move');
      const promoTargets = intents.filter(
        (intent) => (intent as Extract<MoveIntent, { kind: 'move' }>).promoteTo,
      );
      expect(promoTargets.length).toBe(4); // queen/rook/bishop/knight

      engine.submitIntent('white', move('d13', 'd14', 'queen'));
      engine.submitIntent('black', PASS_INTENT);
      const resolution = engine.resolveRound();

      expect(pieceCode(resolution.position.board, 'd14')).toBe('wQ');
      expect(
        resolution.events.find((event) => event.type === 'promoted'),
      ).toBeDefined();
    });
  });

  describe('Core floor', () => {
    it('stops burning once burnedRings reaches the 5x5 core', () => {
      expect(roundsUntilBurn(30, MAX_BURNED_RINGS)).toBeNull();

      const board: Board = boardFrom({ h8: 'wK*', g8: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 30,
        consecutivePassRounds: 0,
        burnedRings: MAX_BURNED_RINGS,
      };
      const engine = new ShrinkingRoyaleEngine(position);
      engine.submitIntent('white', PASS_INTENT);
      engine.submitIntent('black', PASS_INTENT);
      const resolution = engine.resolveRound();

      expect(resolution.events.some((event) => event.type === 'burned')).toBeFalse();
      expect(engine.position.burnedRings).toBe(MAX_BURNED_RINGS);
      expect(resolution.status.outcome).toBe('ongoing');
    });
  });
});

describe('Shrinking Royale — property-based invariants', () => {
  it('never grows the piece count, never leaves a piece on a void square, and burns at most one ring per round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 1, max: 14 }),
        (seed, rounds) => {
          const rng = mulberry32(seed);
          const engine = new ShrinkingRoyaleEngine(royaleInitialPosition());
          let previousCount = countPieces(engine.position.board);
          let previousBurned = engine.position.burnedRings ?? 0;

          for (let i = 0; i < rounds && engine.status.outcome === 'ongoing'; i++) {
            const whiteIntents = engine.legalIntents(engine.position, 'white');
            const blackIntents = engine.legalIntents(engine.position, 'black');
            engine.submitIntent(
              'white',
              whiteIntents[Math.floor(rng() * whiteIntents.length)],
            );
            engine.submitIntent(
              'black',
              blackIntents[Math.floor(rng() * blackIntents.length)],
            );
            engine.resolveRound();

            const board = engine.position.board;
            const burnedRings = engine.position.burnedRings ?? 0;
            const count = countPieces(board);
            expect(count).toBeLessThanOrEqual(previousCount);
            for (let sq = 0; sq < board.length; sq++) {
              if (board[sq]) {
                expect(isVoidSquare(sq, burnedRings, SIZE)).toBeFalse();
              }
            }
            expect(burnedRings - previousBurned).toBeGreaterThanOrEqual(0);
            expect(burnedRings - previousBurned).toBeLessThanOrEqual(1);

            previousCount = count;
            previousBurned = burnedRings;
          }
        },
      ),
      { numRuns: 15 },
    );
  });
});
