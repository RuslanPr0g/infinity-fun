import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { Opening } from '../../chess-openings/models/opening.model';
import { MAX_GUESSES } from '../models/chessle.models';
import { ChessleEngineService } from './chessle-engine.service';

const TARGET: Opening = {
  id: 'b20-sicilian-defense',
  eco: 'B20',
  name: 'Sicilian Defense',
  moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
};

const SAME_FAMILY: Opening = {
  id: 'b90-sicilian-najdorf',
  eco: 'B90',
  name: 'Sicilian Defense: Najdorf Variation',
  moves: TARGET.moves,
};

const OTHER_FAMILY: Opening = {
  id: 'c50-italian-game',
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

  it('a correct guess (family match) wins immediately, regardless of exact variation', () => {
    const outcome = service.submitGuess(SAME_FAMILY);
    expect(outcome).toBe('correct');
    expect(service.status()).toBe('won');
    expect(service.guesses().length).toBe(1);
  });

  it('a wrong guess reveals the next move and stays in progress', () => {
    const before = service.revealedMoveCount();
    const outcome = service.submitGuess(OTHER_FAMILY);
    expect(outcome).toBe('wrong');
    expect(service.status()).toBe('in-progress');
    expect(service.revealedMoveCount()).toBe(before + 1);
  });

  it('reaching MAX_GUESSES wrong guesses ends the round as lost', () => {
    for (let i = 0; i < MAX_GUESSES; i++) {
      service.submitGuess(OTHER_FAMILY);
    }
    expect(service.status()).toBe('lost');
    expect(service.guesses().length).toBe(MAX_GUESSES);
  });

  it('submitGuess is a no-op once the round is over', () => {
    service.submitGuess(SAME_FAMILY);
    expect(service.status()).toBe('won');
    const result = service.submitGuess(OTHER_FAMILY);
    expect(result).toBeNull();
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

  // Feature: chessle, Property: guesses().length never exceeds MAX_GUESSES and
  // the round always reaches a terminal status once MAX_GUESSES wrong guesses
  // have been submitted, regardless of the target's move-list length.
  it('never records more than MAX_GUESSES guesses, for any move-list length and guess sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.boolean(), { minLength: 0, maxLength: 12 }),
        (moveCount, correctFlags) => {
          const target: Opening = {
            ...TARGET,
            moves: Array.from({ length: moveCount }, (_, i) => `m${i}`),
          };
          service.start(target);

          let wonAt: number | null = null;
          correctFlags.forEach((isCorrect, index) => {
            const outcome = service.submitGuess(isCorrect ? SAME_FAMILY : OTHER_FAMILY);
            if (outcome === 'correct' && wonAt === null) wonAt = index;
          });

          expect(service.guesses().length).toBeLessThanOrEqual(MAX_GUESSES);
          expect(service.revealedMoveCount()).toBeLessThanOrEqual(target.moves.length);
          expect(service.revealedMoveCount()).toBeGreaterThanOrEqual(0);

          if (wonAt !== null) {
            expect(service.status()).toBe('won');
          } else if (correctFlags.length >= MAX_GUESSES) {
            expect(service.status()).toBe('lost');
          }
        },
      ),
    );
  });
});
