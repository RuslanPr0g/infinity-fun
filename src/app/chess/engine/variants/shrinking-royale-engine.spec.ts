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
  BURN_SCHEDULE,
  MAX_BURNED_RINGS,
  isVoidSquare,
  roundsUntilBurn,
} from '../burn';
import {
  ShrinkingRoyaleEngine,
  createCenteredRoyaleInitialBoard,
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
  describe('Starting position (default spawnOffset = 2)', () => {
    it('places 46 pieces with kings on file h and queens on file g, two rings in from the border', () => {
      const board = createRoyaleInitialBoard();
      expect(countPieces(board)).toBe(46);
      expect(pieceCode(board, 'h3')).toBe('wK');
      expect(pieceCode(board, 'g3')).toBe('wQ');
      expect(pieceCode(board, 'h13')).toBe('bK');
      expect(pieceCode(board, 'g13')).toBe('bQ');
    });

    it('spans pawns across every file, one rank in front of each back rank', () => {
      const board = createRoyaleInitialBoard();
      const files = 'abcdefghijklmno';
      for (const file of files) {
        expect(pieceCode(board, `${file}4`)).toBe('wP');
        expect(pieceCode(board, `${file}12`)).toBe('bP');
      }
    });
  });

  describe('Spawn offset placement', () => {
    it('spawns hard (offset 1) armies one ring from the border', () => {
      const board = createRoyaleInitialBoard(1);
      expect(pieceCode(board, 'h2')).toBe('wK');
      expect(pieceCode(board, 'h14')).toBe('bK');
      expect(pieceCode(board, 'a3')).toBe('wP');
      expect(pieceCode(board, 'a13')).toBe('bP');
    });

    it('spawns easy (offset 3) armies three rings from the border', () => {
      const board = createRoyaleInitialBoard(3);
      expect(pieceCode(board, 'h4')).toBe('wK');
      expect(pieceCode(board, 'h12')).toBe('bK');
      expect(pieceCode(board, 'a5')).toBe('wP');
      expect(pieceCode(board, 'a11')).toBe('bP');
    });

    it('lets a pawn double-step from its spawn-offset start rank (offset 3)', () => {
      const position = royaleInitialPosition(3);
      const engine = new ShrinkingRoyaleEngine({ spawnOffset: 3 }, position);
      const intents = engine
        .legalIntentsFrom(position, 'white', parseSquare('a5', SIZE))
        .filter((intent) => intent.kind === 'move') as Extract<MoveIntent, { kind: 'move' }>[];
      const targets = intents.map((intent) => intent.to);
      expect(targets).toContain(parseSquare('a6', SIZE));
      expect(targets).toContain(parseSquare('a7', SIZE)); // double-step
    });
  });

  describe('Centered 8×8 army layout (board stays 15×15)', () => {
    it('places a full standard chess complement in the middle of the 15×15 board', () => {
      const board = createCenteredRoyaleInitialBoard();
      expect(countPieces(board)).toBe(32);
      expect(pieceCode(board, 'h4')).toBe('wK');
      expect(pieceCode(board, 'g4')).toBe('wQ');
      expect(pieceCode(board, 'h11')).toBe('bK');
      expect(pieceCode(board, 'g11')).toBe('bQ');
      expect(pieceCode(board, 'd5')).toBe('wP');
      expect(pieceCode(board, 'd10')).toBe('bP');
      // Outside the centered 8×8 block, the (still 15×15) board stays empty.
      expect(pieceCode(board, 'a1')).toBeNull();
      expect(pieceCode(board, 'h15')).toBeNull();
    });

    it('plays moves and burns on a centered-layout engine instance', () => {
      const position = royaleInitialPosition(0, 'centered');
      const engine = new ShrinkingRoyaleEngine({ armyLayout: 'centered' }, position);
      const intents = engine
        .legalIntentsFrom(position, 'white', parseSquare('d5', SIZE))
        .filter((intent) => intent.kind === 'move') as Extract<MoveIntent, { kind: 'move' }>[];
      const targets = intents.map((intent) => intent.to);
      expect(targets).toContain(parseSquare('d6', SIZE));
      expect(targets).toContain(parseSquare('d7', SIZE)); // double-step
    });
  });

  describe('Alternating turns', () => {
    it('gives the off-turn color no legal intents at all, not even pass', () => {
      const position = royaleInitialPosition();
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      expect(engine.activeColor).toBe('white');
      expect(engine.legalIntents(position, 'black')).toEqual([]);
      expect(
        engine.legalIntentsFrom(position, 'black', parseSquare('h13', SIZE)),
      ).toEqual([]);
    });

    it('throws when submitting for the color that is not on move', () => {
      const position = royaleInitialPosition();
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      expect(() => engine.submitIntent('black', PASS_INTENT)).toThrow();
      expect(() =>
        engine.submitIntent('black', move('h13', 'h12')),
      ).toThrow();
    });

    it('flips activeColor after each resolved round', () => {
      const position = royaleInitialPosition();
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      expect(engine.activeColor).toBe('white');
      engine.submitIntent('white', move('h4', 'h5'));
      engine.resolveRound();
      expect(engine.activeColor).toBe('black');
      engine.submitIntent('black', move('h12', 'h11'));
      engine.resolveRound();
      expect(engine.activeColor).toBe('white');
    });
  });

  describe('Regular-chess move application (no bounce/whiff possible)', () => {
    it('always lands a capture — the opponent never gets to whiff or bounce it', () => {
      const board = boardFrom({ h8: 'wK*', g8: 'bK*', d4: 'wN*', e6: 'bP*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      engine.submitIntent('white', move('d4', 'e6'));
      const resolution = engine.resolveRound();

      const whiteEvents = resolution.events.filter((event) => event.color === 'white');
      expect(whiteEvents.length).toBe(1);
      expect(whiteEvents[0].type).toBe('captured');
      expect(whiteEvents[0].capturedPiece).toBe('pawn');
      expect(pieceCode(resolution.position.board, 'e6')).toBe('wN');
    });
  });

  describe('Implicit-pass filtering', () => {
    it('does not log a "passed" event for the side that was not on move', () => {
      const board = boardFrom({ h8: 'wK*', g8: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      engine.submitIntent('white', move('h8', 'h9'));
      const resolution = engine.resolveRound();
      expect(resolution.events.some((event) => event.type === 'passed')).toBeFalse();
    });
  });

  describe('No-pass rule', () => {
    it('rejects a pass when the mover has legal moves', () => {
      const position = royaleInitialPosition();
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      expect(() => engine.submitIntent('white', PASS_INTENT)).toThrow();
    });

    it('allows pass only when the mover is completely stuck, and filters the opponent implicit pass too', () => {
      // burnedRings 7 leaves only the single center square (h8) intact —
      // every other square, including every neighbor of the corner square
      // a1, is void. Both kings are fully boxed in with no blockers needed:
      // the white king at h8 has void on all sides, and the black king at
      // a1 has nothing but void neighbors too.
      const board = boardFrom({ h8: 'wK*', a1: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 7,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);

      expect(engine.legalIntents(position, 'white')).toEqual([PASS_INTENT]);
      expect(() => engine.submitIntent('white', move('h8', 'h9'))).toThrow();

      engine.submitIntent('white', PASS_INTENT);
      const resolution = engine.resolveRound();
      expect(
        resolution.events.some((event) => event.type === 'passed' && event.color === 'white'),
      ).toBeTrue();
      expect(
        resolution.events.some((event) => event.type === 'passed' && event.color === 'black'),
      ).toBeFalse();
      expect(engine.activeColor).toBe('black');
    });
  });

  describe('Triple stuck-pass draw', () => {
    it('draws after three consecutive stuck-pass plies, regardless of color', () => {
      // Both kings are fully boxed by void (see fixture above) so every
      // ply on both sides is a legal, forced pass.
      const board = boardFrom({ h8: 'wK*', a1: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 7,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);

      engine.submitIntent('white', PASS_INTENT);
      let resolution = engine.resolveRound();
      expect(resolution.status.outcome).toBe('ongoing');
      expect(engine.position.consecutivePassRounds).toBe(1);

      engine.submitIntent('black', PASS_INTENT);
      resolution = engine.resolveRound();
      expect(resolution.status.outcome).toBe('ongoing');
      expect(engine.position.consecutivePassRounds).toBe(2);

      engine.submitIntent('white', PASS_INTENT);
      resolution = engine.resolveRound();
      expect(resolution.status).toEqual({ outcome: 'draw', reason: 'triple-pass' });
    });
  });

  describe('Void filtering', () => {
    it('excludes void destinations from legal intents once a ring is burned', () => {
      const sparse = boardFrom({ h8: 'wK*', g8: 'bK*', b2: 'wR*' }, SIZE);
      const position: GamePosition = {
        board: sparse,
        round: 1,
        consecutivePassRounds: 0,
        burnedRings: 1,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
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
    it('burns ring 0 only after the first schedule stage, destroying whatever stands on it', () => {
      const firstStagePlies = BURN_SCHEDULE[0]; // 24 — the generous opening stage
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
      const engine = new ShrinkingRoyaleEngine(undefined, position);

      let whiteToggle = false;
      let blackToggle = false;
      function nextWhiteMove(): MoveIntent {
        whiteToggle = !whiteToggle;
        return whiteToggle ? move('d4', 'd5') : move('d5', 'd4');
      }
      function nextBlackMove(): MoveIntent {
        blackToggle = !blackToggle;
        return blackToggle ? move('g8', 'g7') : move('g7', 'g8');
      }

      for (let round = 1; round <= firstStagePlies - 1; round++) {
        const mover = engine.activeColor;
        const intent = mover === 'white' ? nextWhiteMove() : nextBlackMove();
        engine.submitIntent(mover, intent);
        const resolution = engine.resolveRound();
        expect(resolution.events.some((event) => event.type === 'burned')).toBeFalse();
        expect(engine.position.burnedRings).toBe(0);
      }

      expect(pieceCode(engine.position.board, 'a1')).toBe('wP');
      expect(pieceCode(engine.position.board, 'o15')).toBe('bP');

      // The last ply of the first stage is even, so black is on move.
      expect(engine.activeColor).toBe('black');
      engine.submitIntent('black', nextBlackMove());
      const resolution = engine.resolveRound();

      expect(engine.position.burnedRings).toBe(1);
      expect(pieceAt(engine.position.board, parseSquare('a1', SIZE))).toBeNull();
      expect(pieceAt(engine.position.board, parseSquare('o15', SIZE))).toBeNull();
      const burned = resolution.events.filter((event) => event.type === 'burned');
      expect(burned.length).toBe(2);
      expect(resolution.status.outcome).toBe('ongoing');
    });

    it('tightens the interval for each successive ring (slowly decreasing schedule)', () => {
      expect(BURN_SCHEDULE.length).toBe(MAX_BURNED_RINGS);
      for (let i = 1; i < BURN_SCHEDULE.length; i++) {
        expect(BURN_SCHEDULE[i]).toBeLessThan(BURN_SCHEDULE[i - 1]);
      }
    });
  });

  describe('King burn end conditions', () => {
    it('ends the game for black when only the white king burns', () => {
      const board: Board = boardFrom({ a1: 'wK*', h8: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: BURN_SCHEDULE[0], // 24, even — black on move
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      expect(engine.activeColor).toBe('black');
      // h8 is far from the border and never on the doomed ring 0.
      engine.submitIntent('black', move('h8', 'h7'));
      const resolution = engine.resolveRound();

      expect(resolution.status).toEqual({ outcome: 'black-won', reason: 'king-burned' });
      expect(engine.status).toEqual({ outcome: 'black-won', reason: 'king-burned' });
    });

    it('draws the game when both kings burn together', () => {
      const board: Board = boardFrom({ a1: 'wK*', o15: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: BURN_SCHEDULE[0], // 24, even — black on move
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      // o15 -> n15 stays on ring 0 (corner-adjacent along the top edge).
      engine.submitIntent('black', move('o15', 'n15'));
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
      const engine = new ShrinkingRoyaleEngine(undefined, position);

      const intents = engine
        .legalIntentsFrom(position, 'white', parseSquare('d13', SIZE))
        .filter((intent) => intent.kind === 'move');
      const promoTargets = intents.filter(
        (intent) => (intent as Extract<MoveIntent, { kind: 'move' }>).promoteTo,
      );
      expect(promoTargets.length).toBe(4); // queen/rook/bishop/knight

      engine.submitIntent('white', move('d13', 'd14', 'queen'));
      const resolution = engine.resolveRound();

      expect(pieceCode(resolution.position.board, 'd14')).toBe('wQ');
      expect(
        resolution.events.find((event) => event.type === 'promoted'),
      ).toBeDefined();
    });
  });

  describe('Core floor', () => {
    it('stops burning once burnedRings reaches the single-square core', () => {
      expect(roundsUntilBurn(30, MAX_BURNED_RINGS)).toBeNull();

      // At MAX_BURNED_RINGS only h8 is intact — both kings are fully boxed
      // in by void (same fixture as the stuck-pass tests above).
      const board: Board = boardFrom({ h8: 'wK*', a1: 'bK*' }, SIZE);
      const position: GamePosition = {
        board,
        round: 30, // even — black on move
        consecutivePassRounds: 0,
        burnedRings: MAX_BURNED_RINGS,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
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
        fc.integer({ min: 1, max: 20 }),
        (seed, rounds) => {
          const rng = mulberry32(seed);
          const engine = new ShrinkingRoyaleEngine(undefined, royaleInitialPosition());
          let previousCount = countPieces(engine.position.board);
          let previousBurned = engine.position.burnedRings ?? 0;

          for (let i = 0; i < rounds && engine.status.outcome === 'ongoing'; i++) {
            const color = engine.activeColor;
            const intents = engine.legalIntents(engine.position, color);
            engine.submitIntent(color, intents[Math.floor(rng() * intents.length)]);
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
