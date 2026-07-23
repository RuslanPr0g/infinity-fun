/**
 * Bot-vs-bot strength ordering: Medium should beat Easy more often than not,
 * and Hard should at least hold its own against Medium. Games are simulated
 * on the (cheaper, 8×8) Simultaneous engine, capped at MAX_ROUNDS and decided
 * by material if neither king has fallen by then.
 */
import { ChessBot } from '../bot';
import { PieceColor } from '../core/board';
import { SimultaneousChessEngine } from '../variants/simultaneous-engine';
import { evaluateBoard } from './evaluation';
import { EasyBot } from './easy-bot';
import { MediumBot } from './medium-bot';
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

const MAX_ROUNDS = 40;
const GAMES_PER_PAIRING = 10;
/** Material swing (in pawns) below which an uncompleted game counts as a draw. */
const MATERIAL_DRAW_DEADZONE = 1;

type GameOutcome = 'white' | 'black' | 'draw';

function playGame(whiteBot: ChessBot, blackBot: ChessBot): GameOutcome {
  const engine = new SimultaneousChessEngine();
  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (engine.status.outcome !== 'ongoing') break;
    const whiteIntent = whiteBot.chooseMove(engine.position, 'white', engine);
    const blackIntent = blackBot.chooseMove(engine.position, 'black', engine);
    engine.submitIntent('white', whiteIntent);
    engine.submitIntent('black', blackIntent);
    engine.resolveRound();
  }

  const status = engine.status;
  if (status.outcome === 'white-won') return 'white';
  if (status.outcome === 'black-won') return 'black';
  if (status.outcome === 'draw') return 'draw';

  const materialForWhite = evaluateBoard(engine.position.board, 'white');
  if (materialForWhite > MATERIAL_DRAW_DEADZONE) return 'white';
  if (materialForWhite < -MATERIAL_DRAW_DEADZONE) return 'black';
  return 'draw';
}

/**
 * Plays `GAMES_PER_PAIRING` games between two bot factories, alternating
 * colors each game, and returns contender A's average score (win=1,
 * draw=0.5, loss=0).
 */
function simulateMatch(
  makeContenderA: (random: () => number) => ChessBot,
  makeContenderB: (random: () => number) => ChessBot,
  seedBase: number,
): number {
  let scoreA = 0;
  for (let i = 0; i < GAMES_PER_PAIRING; i++) {
    const seed = seedBase + i;
    const aPlaysWhite = i % 2 === 0;
    const contenderA = makeContenderA(mulberry32(seed));
    const contenderB = makeContenderB(mulberry32(seed ^ 0x2a5b3c7d));

    const whiteBot = aPlaysWhite ? contenderA : contenderB;
    const blackBot = aPlaysWhite ? contenderB : contenderA;
    const outcome = playGame(whiteBot, blackBot);

    if (outcome === 'draw') {
      scoreA += 0.5;
    } else if ((outcome === 'white') === aPlaysWhite) {
      scoreA += 1;
    }
  }
  return scoreA / GAMES_PER_PAIRING;
}

describe('Bot strength ordering', () => {
  let originalTimeout: number;

  beforeAll(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });

  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it('Medium scores above 55% against Easy over 10 games', () => {
    const score = simulateMatch(
      (random) => new MediumBot(random),
      (random) => new EasyBot(random),
      1000,
    );
    expect(score).toBeGreaterThan(0.55);
  });

  it('Hard scores at least 50% against Medium over 10 games', () => {
    const score = simulateMatch(
      (random) => new HardBot(random),
      (random) => new MediumBot(random),
      2000,
    );
    expect(score).toBeGreaterThanOrEqual(0.5);
  });
});
