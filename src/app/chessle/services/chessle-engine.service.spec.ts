import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { Opening } from '../../chess-openings/models/opening.model';
import { MAX_GUESSES } from '../models/chessle.models';
import { ChessleEngineService } from './chessle-engine.service';

const TARGET: Opening = {
  id: 'b90-najdorf',
  eco: 'B90',
  name: 'Sicilian Defense: Najdorf Variation',
  moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
};

/** Same family as the target, different variation — the partial-credit case. */
const SAME_FAMILY: Opening = {
  id: 'b70-dragon',
  eco: 'B70',
  name: 'Sicilian Defense: Dragon Variation',
  moves: TARGET.moves,
};

const OTHER_FAMILY: Opening = {
  id: 'c50-italian',
  eco: 'C50',
  name: 'Italian Game',
  moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
};

describe('ChessleEngineService', () => {
  let service: ChessleEngineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChessleEngineService);
    service.start(TARGET);
  });

  it('starts in progress with the first move revealed and no guesses', () => {
    expect(service.status()).toBe('in-progress');
    expect(service.revealedMoves()).toEqual([TARGET.moves[0]]);
    expect(service.guesses()).toEqual([]);
    expect(service.guessesRemaining()).toBe(MAX_GUESSES);
  });

  it('an exact opening match wins', () => {
    expect(service.submitGuess({ ...TARGET, id: 'other-row' })).toBe('correct');
    expect(service.status()).toBe('won');
  });

  it('the right family with the wrong variation scores partial credit, not a win', () => {
    const outcome = service.submitGuess(SAME_FAMILY);
    expect(outcome).toBe('family');
    expect(service.status()).toBe('in-progress');
    expect(service.guesses()[0].guessedName).toBe(SAME_FAMILY.name);
  });

  it('a partial-credit guess still spends a try and reveals the next move', () => {
    const before = service.revealedMoveCount();
    service.submitGuess(SAME_FAMILY);
    expect(service.guessesRemaining()).toBe(MAX_GUESSES - 1);
    expect(service.revealedMoveCount()).toBe(before + 1);
  });

  it('a different family is plainly wrong', () => {
    expect(service.submitGuess(OTHER_FAMILY)).toBe('wrong');
    expect(service.status()).toBe('in-progress');
  });

  it('guessing the bare family when the answer is a variation is only partial credit', () => {
    const bareFamily: Opening = { id: 'b20', eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] };
    expect(service.submitGuess(bareFamily)).toBe('family');
    expect(service.status()).toBe('in-progress');
  });

  it('exhausting MAX_GUESSES without an exact match loses, even on near misses', () => {
    for (let i = 0; i < MAX_GUESSES; i++) {
      service.submitGuess(SAME_FAMILY);
    }
    expect(service.status()).toBe('lost');
    expect(service.guesses().length).toBe(MAX_GUESSES);
  });

  it('submitGuess is a no-op once the round is over', () => {
    service.submitGuess(TARGET);
    expect(service.status()).toBe('won');
    expect(service.submitGuess(OTHER_FAMILY)).toBeNull();
    expect(service.guesses().length).toBe(1);
  });

  it('reveal never overshoots the target opening move list', () => {
    const shortTarget: Opening = { ...OTHER_FAMILY, moves: ['e4', 'e5'] };
    service.start(shortTarget);
    for (let i = 0; i < MAX_GUESSES; i++) {
      service.submitGuess(TARGET);
    }
    expect(service.revealedMoveCount()).toBeLessThanOrEqual(shortTarget.moves.length);
  });

  // Feature: chessle, Property: only an exact name match can ever win, and the
  // round stays within MAX_GUESSES for any sequence of outcomes.
  it('only an exact match wins, and guesses never exceed MAX_GUESSES', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.constantFrom<'exact' | 'family' | 'other'>('exact', 'family', 'other'), {
          maxLength: 12,
        }),
        (moveCount, kinds) => {
          const target: Opening = {
            ...TARGET,
            moves: Array.from({ length: moveCount }, (_, i) => `m${i}`),
          };
          service.start(target);

          let sawExactWhileLive = false;
          for (const kind of kinds) {
            const live = service.status() === 'in-progress';
            const guess =
              kind === 'exact' ? target : kind === 'family' ? SAME_FAMILY : OTHER_FAMILY;
            const outcome = service.submitGuess(guess);
            if (live && kind === 'exact') sawExactWhileLive = true;
            if (outcome === 'correct') expect(kind).toBe('exact');
          }

          expect(service.guesses().length).toBeLessThanOrEqual(MAX_GUESSES);
          expect(service.revealedMoveCount()).toBeLessThanOrEqual(target.moves.length);

          if (sawExactWhileLive) {
            expect(service.status()).toBe('won');
          } else if (kinds.length >= MAX_GUESSES) {
            expect(service.status()).toBe('lost');
          }
        },
      ),
    );
  });
});
