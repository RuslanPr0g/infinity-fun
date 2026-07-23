import * as fc from 'fast-check';
import {
  boardFrom,
  findKing,
  opponentOf,
  parseSquare,
  pieceAt,
} from '../core/board';
import { isSquareAttacked } from '../core/move-gen';
import { GamePosition, MoveIntent } from '../variant';
import {
  SimultaneousChessEngine,
  matchIntent,
} from '../variants/simultaneous-engine';
import { ShrinkingRoyaleEngine } from '../variants/shrinking-royale-engine';
import { EasyBot, applySolo } from './easy-bot';

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

function randomPlayout(seed: number, rounds: number): SimultaneousChessEngine {
  const rng = mulberry32(seed);
  const engine = new SimultaneousChessEngine();
  for (let i = 0; i < rounds && engine.status.outcome === 'ongoing'; i++) {
    for (const color of ['white', 'black'] as const) {
      const intents = engine.legalIntents(engine.position, color);
      engine.submitIntent(color, intents[Math.floor(rng() * intents.length)]);
    }
    engine.resolveRound();
  }
  return engine;
}

/** True when the intent leaves the mover's king safe from stationary attackers. */
function isKingSafe(
  position: GamePosition,
  color: 'white' | 'black',
  intent: MoveIntent,
): boolean {
  const board =
    intent.kind === 'pass' ? position.board : applySolo(position.board, color, intent);
  const kingSquare = findKing(board, color);
  return kingSquare !== null && !isSquareAttacked(board, kingSquare, opponentOf(color));
}

describe('EasyBot', () => {
  it('always returns a legal intent for any reachable position', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 10 }),
        (seed, rounds) => {
          const engine = randomPlayout(seed, rounds);
          if (engine.status.outcome !== 'ongoing') return;
          const bot = new EasyBot(mulberry32(seed ^ 0x9e3779b9));
          for (const color of ['white', 'black'] as const) {
            const intent = bot.chooseMove(engine.position, color, engine);
            const legal =
              intent.kind === 'pass' ||
              matchIntent(engine.position, color, intent) !== null;
            expect(legal).toBeTrue();
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  it('never hangs its king to a stationary attacker when a safe choice exists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 10 }),
        (seed, rounds) => {
          const engine = randomPlayout(seed, rounds);
          if (engine.status.outcome !== 'ongoing') return;
          const bot = new EasyBot(mulberry32(seed ^ 0x51ab7e2d));
          const position = engine.position;

          for (const color of ['white', 'black'] as const) {
            const intents = engine.legalIntents(position, color);
            const safeChoiceExists = intents.some((intent) =>
              isKingSafe(position, color, intent),
            );
            if (!safeChoiceExists) continue;

            const choice = bot.chooseMove(position, color, engine);
            const capturesKing =
              choice.kind === 'move' &&
              pieceAt(position.board, choice.to)?.type === 'king';
            expect(capturesKing || isKingSafe(position, color, choice)).toBeTrue();
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  it('captures the enemy king whenever it can', () => {
    const board = boardFrom({ e1: 'wK', h8: 'bK', h1: 'wR', a7: 'bP' });
    const position: GamePosition = { board, round: 1, consecutivePassRounds: 0 };
    const engine = new SimultaneousChessEngine(position);
    for (let seed = 0; seed < 10; seed++) {
      const bot = new EasyBot(mulberry32(seed));
      const choice = bot.chooseMove(position, 'white', engine);
      expect(choice).toEqual({
        kind: 'move',
        from: parseSquare('h1'),
        to: parseSquare('h8'),
      });
    }
  });

  it('prefers a safe capture of a hanging piece', () => {
    // The black queen on d4 is undefended and the white knight can take it.
    const board = boardFrom({ a1: 'wK', h8: 'bK', c2: 'wN', d4: 'bQ' });
    const position: GamePosition = { board, round: 1, consecutivePassRounds: 0 };
    const engine = new SimultaneousChessEngine(position);
    for (let seed = 0; seed < 10; seed++) {
      const bot = new EasyBot(mulberry32(seed));
      const choice = bot.chooseMove(position, 'white', engine);
      expect(choice.kind).toBe('move');
      if (choice.kind === 'move') {
        expect(choice.to).toBe(parseSquare('d4'));
      }
    }
  });

  it('gets its king out of the line of fire of a stationary attacker', () => {
    // The white king on e4 is attacked by the e8 rook; safe responses exist.
    const board = boardFrom({ e4: 'wK*', e8: 'bR', h8: 'bK' });
    const position: GamePosition = { board, round: 1, consecutivePassRounds: 0 };
    const engine = new SimultaneousChessEngine(position);
    for (let seed = 0; seed < 10; seed++) {
      const bot = new EasyBot(mulberry32(seed));
      const choice = bot.chooseMove(position, 'white', engine);
      expect(isKingSafe(position, 'white', choice)).toBeTrue();
    }
  });

  describe('Shrinking Board Royale burn awareness', () => {
    it('evacuates a king off the doomed outer ring when a safe inward move exists', () => {
      const board = boardFrom(
        { a1: 'wK*', g7: 'wR', h8: 'bK' },
        15,
      );
      // Round 5 with no rings burned yet: roundsUntilBurn(5, 0) === 2, so the
      // burn-awareness heuristic is active. a1 sits on the doomed ring 0; its
      // only neighbor off that ring is b2.
      const position: GamePosition = {
        board,
        round: 5,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(position);
      for (let seed = 0; seed < 10; seed++) {
        const bot = new EasyBot(mulberry32(seed));
        const choice = bot.chooseMove(position, 'white', engine);
        expect(choice).toEqual({
          kind: 'move',
          from: parseSquare('a1', 15),
          to: parseSquare('b2', 15),
        });
      }
    });
  });
});
