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
import { applySolo } from './evaluation';
import { HardBot } from './hard-bot';

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

function randomSimultaneousPlayout(seed: number, rounds: number): SimultaneousChessEngine {
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

function randomRoyalePlayout(seed: number, plies: number): ShrinkingRoyaleEngine {
  const rng = mulberry32(seed);
  const engine = new ShrinkingRoyaleEngine();
  for (let i = 0; i < plies && engine.status.outcome === 'ongoing'; i++) {
    const color = engine.activeColor;
    const intents = engine.legalIntents(engine.position, color);
    engine.submitIntent(color, intents[Math.floor(rng() * intents.length)]);
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

describe('HardBot', () => {
  it('always returns a legal intent on the Simultaneous engine', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 8 }),
        (seed, rounds) => {
          const engine = randomSimultaneousPlayout(seed, rounds);
          if (engine.status.outcome !== 'ongoing') return;
          const bot = new HardBot(mulberry32(seed ^ 0x2468ace0));
          for (const color of ['white', 'black'] as const) {
            const intent = bot.chooseMove(engine.position, color, engine);
            const legal =
              intent.kind === 'pass' ||
              matchIntent(engine.position, color, intent) !== null;
            expect(legal).toBeTrue();
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  it('always returns a legal intent on the Shrinking Royale engine', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 10 }),
        (seed, plies) => {
          const engine = randomRoyalePlayout(seed, plies);
          if (engine.status.outcome !== 'ongoing') return;
          const bot = new HardBot(mulberry32(seed ^ 0x13579bdf));
          const color = engine.activeColor;
          const intent = bot.chooseMove(engine.position, color, engine);
          const legalIntents = engine.legalIntents(engine.position, color);
          const legal =
            intent.kind === 'pass'
              ? legalIntents.some((candidate) => candidate.kind === 'pass')
              : legalIntents.some(
                  (candidate) =>
                    candidate.kind === 'move' &&
                    candidate.from === intent.from &&
                    candidate.to === intent.to &&
                    candidate.promoteTo === intent.promoteTo,
                );
          expect(legal).toBeTrue();
        },
      ),
      { numRuns: 10 },
    );
  });

  it('never hangs its king to a stationary attacker when a safe choice exists (Simultaneous)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 8 }),
        (seed, rounds) => {
          const engine = randomSimultaneousPlayout(seed, rounds);
          if (engine.status.outcome !== 'ongoing') return;
          const bot = new HardBot(mulberry32(seed ^ 0x51ab7e2d));
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
      { numRuns: 10 },
    );
  });

  it('captures the enemy king whenever it can', () => {
    const board = boardFrom({ e1: 'wK', h8: 'bK', h1: 'wR', a7: 'bP' });
    const position: GamePosition = { board, round: 1, consecutivePassRounds: 0 };
    const engine = new SimultaneousChessEngine(position);
    for (let seed = 0; seed < 10; seed++) {
      const bot = new HardBot(mulberry32(seed));
      const choice = bot.chooseMove(position, 'white', engine);
      expect(choice).toEqual({
        kind: 'move',
        from: parseSquare('h1'),
        to: parseSquare('h8'),
      });
    }
  });

  it('prefers a safe developing move over a heavily-defended capture (Simultaneous)', () => {
    // The black pawn on d4 is guarded by two more pawns (c5, e5); a queen
    // trade there loses a queen for a pawn once black recaptures. A quiet
    // knight move is available instead.
    const board = boardFrom({
      a1: 'wK',
      h8: 'bK',
      d1: 'wQ',
      b1: 'wN',
      d4: 'bP',
      c5: 'bP',
      e5: 'bP',
    });
    const position: GamePosition = { board, round: 1, consecutivePassRounds: 0 };
    const engine = new SimultaneousChessEngine(position);
    for (let seed = 0; seed < 10; seed++) {
      const bot = new HardBot(mulberry32(seed));
      const choice = bot.chooseMove(position, 'white', engine);
      const takesGuardedPawn =
        choice.kind === 'move' &&
        choice.from === parseSquare('d1') &&
        choice.to === parseSquare('d4');
      expect(takesGuardedPawn).toBeFalse();
    }
  });

  describe('Shrinking Board Royale burn awareness', () => {
    it('evacuates a king off the doomed outer ring when a safe inward move exists', () => {
      const board = boardFrom({ a1: 'wK*', g7: 'wR', h8: 'bK' }, 15);
      // Round 23, no rings burned yet: the first burn stage is 24 plies,
      // so roundsUntilBurn(23, 0) === 2 and burn-awareness is active.
      const position: GamePosition = {
        board,
        round: 23,
        consecutivePassRounds: 0,
        burnedRings: 0,
      };
      const engine = new ShrinkingRoyaleEngine(undefined, position);
      for (let seed = 0; seed < 10; seed++) {
        const bot = new HardBot(mulberry32(seed));
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
