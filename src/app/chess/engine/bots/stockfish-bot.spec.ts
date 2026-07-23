/**
 * Unit tests for StockfishBot.
 * StockfishService is mocked — no WASM loaded.
 */

import * as fc from 'fast-check';
import { boardFrom, parseSquare } from '../core/board';
import { GamePosition, MoveIntent } from '../variant';
import { SimultaneousChessEngine } from '../variants/simultaneous-engine';
import { ShrinkingRoyaleEngine } from '../variants/shrinking-royale-engine';
import { StockfishService } from '../../services/stockfish.service';
import { StockfishBot } from './stockfish-bot';

// ─── Mock StockfishService ────────────────────────────────────────────────────

function mockService(bestMove: string | null): StockfishService {
  const svc = jasmine.createSpyObj<StockfishService>('StockfishService', [
    'getBestMove',
    'isAlreadyCached',
    'init',
    'destroy',
  ]);
  (svc.getBestMove as jasmine.Spy).and.returnValue(Promise.resolve(bestMove));
  return svc;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function isLegalIntent(
  engine: SimultaneousChessEngine | ShrinkingRoyaleEngine,
  color: 'white' | 'black',
  intent: MoveIntent,
): boolean {
  const legal = engine.legalIntents(engine.position, color);
  if (intent.kind === 'pass') return legal.some(i => i.kind === 'pass');
  return legal.some(
    i =>
      i.kind === 'move' &&
      i.from === intent.from &&
      i.to === intent.to &&
      i.promoteTo === intent.promoteTo,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StockfishBot', () => {
  it('uses the Stockfish move when it is legal in the variant', async () => {
    // e2e4 is always legal in the opening for white.
    const svc = mockService('e2e4');
    const bot = new StockfishBot(svc);
    const engine = new SimultaneousChessEngine();
    const position = engine.position;

    bot.prefetch(position, 'white');
    const intent = await bot.awaitPrefetch(position, 'white', engine);

    expect(intent.kind).toBe('move');
    if (intent.kind === 'move') {
      expect(intent.from).toBe(parseSquare('e2'));
      expect(intent.to).toBe(parseSquare('e4'));
    }
  });

  it('falls back to HardBot when Stockfish returns null', async () => {
    const svc = mockService(null);
    const bot = new StockfishBot(svc);
    const engine = new SimultaneousChessEngine();
    const position = engine.position;

    bot.prefetch(position, 'white');
    const intent = await bot.awaitPrefetch(position, 'white', engine);

    expect(isLegalIntent(engine, 'white', intent)).toBeTrue();
  });

  it('falls back to HardBot when Stockfish returns an illegal move for the variant', async () => {
    // "a1a1" is not a real move — always illegal.
    const svc = mockService('a1a1');
    const bot = new StockfishBot(svc);
    const engine = new SimultaneousChessEngine();
    const position = engine.position;

    bot.prefetch(position, 'white');
    const intent = await bot.awaitPrefetch(position, 'white', engine);

    expect(isLegalIntent(engine, 'white', intent)).toBeTrue();
  });

  it('falls back to HardBot when Stockfish returns a malformed string', async () => {
    const svc = mockService('INVALID');
    const bot = new StockfishBot(svc);
    const engine = new SimultaneousChessEngine();
    const position = engine.position;

    bot.prefetch(position, 'white');
    const intent = await bot.awaitPrefetch(position, 'white', engine);

    expect(isLegalIntent(engine, 'white', intent)).toBeTrue();
  });

  it('falls back when chooseMove is called without a completed prefetch', () => {
    // No prefetch at all — prefetchedMove is undefined → immediate fallback.
    const svc = mockService('e2e4');
    const bot = new StockfishBot(svc);
    const engine = new SimultaneousChessEngine();
    const position = engine.position;

    const intent = bot.chooseMove(position, 'white', engine);
    expect(isLegalIntent(engine, 'white', intent)).toBeTrue();
  });

  it('always returns a legal intent on the Simultaneous engine (property test)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 6 }),
        async (seed, rounds) => {
          const rng = mulberry32(seed);
          const engine = new SimultaneousChessEngine();
          for (let i = 0; i < rounds && engine.status.outcome === 'ongoing'; i++) {
            for (const color of ['white', 'black'] as const) {
              const intents = engine.legalIntents(engine.position, color);
              engine.submitIntent(color, intents[Math.floor(rng() * intents.length)]);
            }
            engine.resolveRound();
          }
          if (engine.status.outcome !== 'ongoing') return;

          const svc = mockService(null); // force HardBot fallback
          const bot = new StockfishBot(svc);
          bot.prefetch(engine.position, 'white');
          const intent = await bot.awaitPrefetch(engine.position, 'white', engine);
          expect(isLegalIntent(engine, 'white', intent)).toBeTrue();
        },
      ),
      { numRuns: 8 },
    );
  });

  it('always returns a legal intent on the Shrinking Royale engine (property test)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.integer({ min: 0, max: 8 }),
        async (seed, plies) => {
          const rng = mulberry32(seed);
          const engine = new ShrinkingRoyaleEngine();
          for (let i = 0; i < plies && engine.status.outcome === 'ongoing'; i++) {
            const color = engine.activeColor;
            const intents = engine.legalIntents(engine.position, color);
            engine.submitIntent(color, intents[Math.floor(rng() * intents.length)]);
            engine.resolveRound();
          }
          if (engine.status.outcome !== 'ongoing') return;

          const color = engine.activeColor;
          const svc = mockService(null); // force HardBot fallback
          const bot = new StockfishBot(svc);
          bot.prefetch(engine.position, color);
          const intent = await bot.awaitPrefetch(engine.position, color, engine);
          expect(isLegalIntent(engine, color, intent)).toBeTrue();
        },
      ),
      { numRuns: 8 },
    );
  });

  it('uses a fresh prefetch after each call clears state', async () => {
    const svc = mockService('e2e4');
    const bot = new StockfishBot(svc);
    const engine = new SimultaneousChessEngine();
    const position = engine.position;

    // First round.
    bot.prefetch(position, 'white');
    await bot.awaitPrefetch(position, 'white', engine);

    // Second round — should work cleanly with a new prefetch.
    bot.prefetch(position, 'white');
    const intent2 = await bot.awaitPrefetch(position, 'white', engine);
    expect(isLegalIntent(engine, 'white', intent2)).toBeTrue();
  });
});
